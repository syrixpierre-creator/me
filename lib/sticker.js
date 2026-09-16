// lib/sticker.js
//
// Replacement for `wa-sticker-formatter`, which pulls in the native
// `sharp` module. On some hosts (Pterodactyl eggs, certain Docker
// images) sharp's prebuilt binary can't be resolved and it throws at
// `require()` time — which crashes the whole bot on boot, since
// wa-sticker-formatter was required at the top of commands/index.js.
//
// This module does the same job with tools we already ship:
//   - ffmpeg (via ffmpeg-static) to turn an image/video into a WebP
//   - a small pure-JS routine to inject the WhatsApp sticker EXIF
//     (pack/author) into the WebP container — no native code at all.

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const FFMPEG_BIN = process.env.FFMPEG_PATH || require('ffmpeg-static');

function tmpFile(ext) {
  return path.join(os.tmpdir(), `stk-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ff = spawn(FFMPEG_BIN, args);
    let stderr = '';
    ff.stderr.on('data', (d) => { stderr += d.toString(); });
    ff.on('error', (err) => reject(new Error(`ffmpeg failed to start: ${err.message}`)));
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim().slice(-400)}`));
    });
  });
}

/**
 * Converts a raw image or short video buffer into a square WebP sticker
 * (animated when isVideo is true).
 */
async function toWebp(buffer, { isVideo = false } = {}) {
  const inputPath = tmpFile(isVideo ? 'mp4' : 'png');
  const outputPath = tmpFile('webp');
  fs.writeFileSync(inputPath, buffer);

  const scale = 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white@0.0';
  const args = isVideo
    ? ['-y', '-i', inputPath, '-vcodec', 'libwebp', '-vf', `${scale},fps=15`,
       '-loop', '0', '-an', '-vsync', '0', '-t', '00:00:06', '-qscale', '60', outputPath]
    : ['-y', '-i', inputPath, '-vcodec', 'libwebp', '-vf', scale,
       '-lossless', '0', '-qscale', '70', outputPath];

  try {
    await runFfmpeg(args);
    return fs.readFileSync(outputPath);
  } finally {
    fs.unlink(inputPath, () => {});
    fs.unlink(outputPath, () => {});
  }
}

/**
 * Injects WhatsApp's sticker EXIF metadata (pack name / author) into an
 * existing WebP buffer. Pure JS, no native deps — safe to call on any
 * valid WebP (including ones already received as WhatsApp/Telegram
 * stickers, without needing to re-encode them).
 */
function addExif(webpBuffer, { pack = '', author = '' } = {}) {
  const json = {
    'sticker-pack-id': `com.inconnu.${Date.now()}`,
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
    emojis: ['🤖'],
  };
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8');

  const exifHeader = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  const exif = Buffer.concat([exifHeader, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);

  const webpLen = webpBuffer.readUInt32LE(4);
  const exifChunk = Buffer.concat([Buffer.from('EXIF'), Buffer.alloc(4), exif]);
  exifChunk.writeUInt32LE(exif.length, 4);

  const out = Buffer.concat([webpBuffer.slice(0, webpLen + 8), exifChunk]);
  out.writeUInt32LE(out.length - 8, 4);
  return out;
}

/** Full pipeline: raw image/video buffer -> tagged WebP sticker. */
async function makeSticker(buffer, { pack, author, isVideo = false } = {}) {
  const webp = await toWebp(buffer, { isVideo });
  return addExif(webp, { pack, author });
}

module.exports = { toWebp, addExif, makeSticker };
