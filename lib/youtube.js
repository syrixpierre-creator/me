// lib/youtube.js
//
// YouTube search + audio/video download for .play / .playvideo.
//
// The old .play relied only on third-party "ytmp3" APIs, which die all the
// time (that's why it showed the thumbnail and then "All download sources
// failed"). This module scrapes YouTube directly first and only uses the
// public APIs as a last resort:
//
//   1. @distube/ytdl-core v5  — in-process scraper (signatures + PO tokens solved locally)
//   2. yt-dlp                 — the reference YouTube scraper. Uses YTDLP_PATH, a
//                               `yt-dlp` on PATH, or downloads the official standalone
//                               binary once into ./bin on first use.
//   3. public download APIs   — old fallbacks, kept as a safety net.
//
// Optional env vars:
//   YT_COOKIE        Cookie header / Netscape export of a logged-in YouTube session
//                    (helps when YouTube asks the server IP to "sign in to confirm you're not a bot")
//   YT_COOKIES_FILE  Path to a Netscape cookies.txt for yt-dlp
//   YTDLP_PATH       Path to an existing yt-dlp binary
//   YT_SOURCES       Order of sources, comma-separated (default "ytdlcore,ytdlp,api")
//   YT_MAX_MB        Max file size to send (default 100)

const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MAX_BYTES = (Number(process.env.YT_MAX_MB) || 100) * 1024 * 1024;
const BIN_DIR = path.join(__dirname, '..', 'bin');

function log(...a) {
  if (process.env.YT_DEBUG !== 'false') console.log('[youtube]', ...a);
}

function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const p = require('ffmpeg-static');
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return 'ffmpeg';
}

function tmpFile(ext) {
  return path.join(os.tmpdir(), `inconnu-yt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext ? `.${ext}` : ''}`);
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`${label} timed out after ${ms / 1000}s`)), ms); }),
  ]);
}

// ---------------------------------------------------------------------------
// URL helpers + search
// ---------------------------------------------------------------------------
function extractVideoId(input) {
  const s = String(input || '').trim();
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/|music\.youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}

function isYouTubeUrl(input) {
  return !!extractVideoId(input) && /youtu/.test(String(input));
}

function formatViews(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

// Returns { id, url, title, author, duration, views, thumbnail, seconds } or null.
async function search(query) {
  const yts = require('yt-search');
  const id = extractVideoId(query);
  if (id) {
    try {
      const v = await yts({ videoId: id });
      if (v) return normalizeVideo(v, id);
    } catch (e) {
      log('yt-search videoId lookup failed:', e.message);
    }
    return {
      id, url: `https://www.youtube.com/watch?v=${id}`, title: 'YouTube',
      author: '-', duration: '-', views: '-', seconds: 0,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }
  const res = await yts(query);
  const video = (res?.videos || []).find((v) => v && v.videoId) || null;
  return video ? normalizeVideo(video, video.videoId) : null;
}

function normalizeVideo(v, id) {
  return {
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: v.title || 'YouTube',
    author: v.author?.name || v.author || '-',
    duration: v.timestamp || v.duration?.timestamp || '-',
    seconds: v.seconds || v.duration?.seconds || 0,
    views: formatViews(v.views),
    thumbnail: v.thumbnail || v.image || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

// ---------------------------------------------------------------------------
// ffmpeg helpers
// ---------------------------------------------------------------------------
function runFfmpeg(args, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
    let stderr = '';
    const timer = setTimeout(() => { ff.kill('SIGKILL'); reject(new Error('ffmpeg timed out')); }, timeoutMs);
    ff.stderr.on('data', (c) => { stderr += c.toString(); });
    ff.on('error', (e) => { clearTimeout(timer); reject(e); });
    ff.on('close', (code) => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-300)}`));
    });
  });
}

async function toMp3(buffer, inputExt = 'm4a') {
  const inp = tmpFile(inputExt);
  const out = tmpFile('mp3');
  try {
    await fsp.writeFile(inp, buffer);
    await runFfmpeg(['-i', inp, '-vn', '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', out]);
    return await fsp.readFile(out);
  } finally {
    fsp.unlink(inp).catch(() => {});
    fsp.unlink(out).catch(() => {});
  }
}

async function mergeAV(videoBuf, audioBuf) {
  const v = tmpFile('mp4');
  const a = tmpFile('m4a');
  const out = tmpFile('mp4');
  try {
    await fsp.writeFile(v, videoBuf);
    await fsp.writeFile(a, audioBuf);
    await runFfmpeg(['-i', v, '-i', a, '-c:v', 'copy', '-c:a', 'aac', '-movflags', '+faststart', '-shortest', out]);
    return await fsp.readFile(out);
  } finally {
    [v, a, out].forEach((p) => fsp.unlink(p).catch(() => {}));
  }
}

// Ensures the audio we hand back is an MP3 WhatsApp can play everywhere.
async function finalizeAudio(buffer, ext) {
  if (ext === 'mp3') return { buffer, mimetype: 'audio/mpeg', ext: 'mp3' };
  try {
    return { buffer: await toMp3(buffer, ext || 'm4a'), mimetype: 'audio/mpeg', ext: 'mp3' };
  } catch (e) {
    log('mp3 conversion failed, sending original:', e.message);
    if (ext === 'm4a' || ext === 'mp4') return { buffer, mimetype: 'audio/mp4', ext: 'm4a' };
    return { buffer, mimetype: 'audio/ogg; codecs=opus', ext: ext || 'webm' };
  }
}

function streamToBuffer(stream, limit = MAX_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    stream.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        stream.destroy();
        reject(new Error(`file larger than ${Math.round(limit / 1048576)} MB`));
        return;
      }
      chunks.push(c);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Source 1: @distube/ytdl-core
// ---------------------------------------------------------------------------
let ytdlInstance = null;
function getYtdl() {
  if (!ytdlInstance) {
    const { Ytdl } = require('@distube/ytdl-core');
    const opts = {};
    if (process.env.YT_COOKIE) opts.cookie = process.env.YT_COOKIE;
    ytdlInstance = new Ytdl(opts);
  }
  return ytdlInstance;
}

async function viaYtdlCore(url, type) {
  const yt = getYtdl();
  const info = await yt.getInfo(url);
  const title = info.videoDetails?.title;

  if (type === 'audio') {
    const filter = [
      { hasAudio: true, hasVideo: false, container: 'mp4' },
      { hasAudio: true, hasVideo: false },
    ];
    const fmt = (() => { try { return require('@distube/ytdl-core').chooseFormat(info.formats, { quality: 'highestaudio', filter }); } catch { return null; } })();
    const ext = fmt?.container === 'webm' ? 'webm' : 'm4a';
    const buf = await streamToBuffer(yt.download(info, { quality: 'highestaudio', filter }));
    return { ...(await finalizeAudio(buf, ext)), title };
  }

  // Video: progressive (audio+video) mp4 first — no merge needed.
  try {
    const buf = await streamToBuffer(yt.download(info, {
      quality: 'highest',
      filter: [{ hasAudio: true, hasVideo: true, container: 'mp4' }, { hasAudio: true, hasVideo: true }],
    }));
    return { buffer: buf, mimetype: 'video/mp4', ext: 'mp4', title };
  } catch (e) {
    log('ytdl-core progressive video failed, trying adaptive merge:', e.message);
  }
  const vFilter = (f) => f.hasVideo && !f.hasAudio && (f.container === 'mp4') && (!f.height || f.height <= 480);
  const [vBuf, aBuf] = await Promise.all([
    streamToBuffer(yt.download(info, { quality: 'highestvideo', filter: vFilter })),
    streamToBuffer(yt.download(info, { quality: 'highestaudio', filter: { hasAudio: true, hasVideo: false, container: 'mp4' } })),
  ]);
  return { buffer: await mergeAV(vBuf, aBuf), mimetype: 'video/mp4', ext: 'mp4', title };
}

// ---------------------------------------------------------------------------
// Source 2: yt-dlp
// ---------------------------------------------------------------------------
function ytdlpAssetName() {
  if (process.platform === 'win32') return 'yt-dlp.exe';
  if (process.platform === 'darwin') return 'yt-dlp_macos';
  return process.arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
}

function which(cmd) {
  return new Promise((resolve) => {
    execFile(cmd, ['--version'], { timeout: 15000 }, (err) => resolve(err ? null : cmd));
  });
}

let ytdlpPromise = null;
function ensureYtDlp() {
  if (!ytdlpPromise) {
    ytdlpPromise = (async () => {
      if (process.env.YTDLP_PATH && fs.existsSync(process.env.YTDLP_PATH)) return process.env.YTDLP_PATH;
      const local = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
      if (fs.existsSync(local)) return local;
      const onPath = await which('yt-dlp');
      if (onPath) return onPath;

      const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${ytdlpAssetName()}`;
      log('downloading yt-dlp from', url);
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`yt-dlp download HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1_000_000) throw new Error('yt-dlp download looks truncated');
      await fsp.mkdir(BIN_DIR, { recursive: true });
      await fsp.writeFile(local, buf, { mode: 0o755 });
      return local;
    })().catch((e) => { ytdlpPromise = null; throw e; });
  }
  return ytdlpPromise;
}

function runYtDlp(bin, args, timeoutMs = 240000) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args);
    let stderr = '';
    let stdout = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('yt-dlp timed out')); }, timeoutMs);
    p.stdout.on('data', (c) => { stdout += c.toString(); });
    p.stderr.on('data', (c) => { stderr += c.toString(); });
    p.on('error', (e) => { clearTimeout(timer); reject(e); });
    p.on('close', (code) => {
      clearTimeout(timer);
      code === 0 ? resolve(stdout) : reject(new Error(`yt-dlp exited ${code}: ${stderr.trim().split('\n').slice(-2).join(' | ')}`));
    });
  });
}

async function viaYtDlp(url, type) {
  const bin = await ensureYtDlp();
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'inconnu-ytdlp-'));
  const ff = ffmpegPath();
  const args = [
    '--no-playlist', '--no-warnings', '--no-progress', '--restrict-filenames',
    '--max-filesize', `${Math.round(MAX_BYTES / 1048576)}M`,
    '-o', path.join(dir, 'media.%(ext)s'),
    '--print', 'after_move:title',
  ];
  if (ff !== 'ffmpeg' || await which('ffmpeg')) args.push('--ffmpeg-location', ff);
  if (process.env.YT_COOKIES_FILE) args.push('--cookies', process.env.YT_COOKIES_FILE);
  if (process.env.YTDLP_EXTRA_ARGS) args.push(...process.env.YTDLP_EXTRA_ARGS.split(/\s+/).filter(Boolean));

  if (type === 'audio') {
    args.push('-f', 'bestaudio[ext=m4a]/bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '128K');
  } else {
    args.push('-f', 'bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480][ext=mp4]/b[ext=mp4]/b', '--merge-output-format', 'mp4');
  }
  args.push(url);

  try {
    const stdout = await runYtDlp(bin, args);
    const files = (await fsp.readdir(dir)).filter((f) => f.startsWith('media.') && !f.endsWith('.part'));
    if (!files.length) throw new Error('yt-dlp produced no file');
    const file = path.join(dir, files[0]);
    const ext = path.extname(file).slice(1).toLowerCase();
    const buffer = await fsp.readFile(file);
    const title = stdout.trim().split('\n').pop() || undefined;
    if (type === 'audio') return { ...(await finalizeAudio(buffer, ext)), title };
    return { buffer, mimetype: 'video/mp4', ext: ext || 'mp4', title };
  } finally {
    fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Source 3: public download APIs (last resort)
// ---------------------------------------------------------------------------
function findDownloadLink(data) {
  // Walks the JSON looking for the first http(s) link under a download-ish key.
  const KEYS = ['download_url', 'downloadUrl', 'download', 'dl', 'dlink', 'link', 'url', 'mp3', 'mp4', 'audio', 'video'];
  const seen = new Set();
  const walk = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 5 || seen.has(node)) return null;
    seen.add(node);
    for (const k of KEYS) {
      const v = node[k];
      if (typeof v === 'string' && /^https?:\/\//.test(v) && !/ytimg|youtube\.com\/watch|youtu\.be/.test(v)) return v;
    }
    for (const v of Object.values(node)) {
      const r = walk(v, depth + 1);
      if (r) return r;
    }
    return null;
  };
  return walk(data, 0);
}

function apiList(url, type) {
  const u = encodeURIComponent(url);
  if (type === 'audio') {
    return [
      `https://apis.davidcyril.name.ng/download/ytmp3v2?url=${u}`,
      `https://api.giftedtech.co.ke/api/download/ytmp3?apikey=gifted&url=${u}`,
      `https://api.princetechn.com/api/download/ytmp3?apikey=prince&url=${u}`,
      `https://eliteprotech-apis.zone.id/ytmp3?url=${u}`,
      `https://api.siputzx.my.id/api/d/ytmp3?url=${u}`,
    ];
  }
  return [
    `https://apis.davidcyril.name.ng/download/ytmp4?url=${u}`,
    `https://api.giftedtech.co.ke/api/download/ytmp4?apikey=gifted&url=${u}&quality=360`,
    `https://api.princetechn.com/api/download/ytmp4?apikey=prince&url=${u}`,
    `https://eliteprotech-apis.zone.id/ytmp4?url=${u}`,
    `https://api.siputzx.my.id/api/d/ytmp4?url=${u}`,
  ];
}

async function fetchBuffer(link) {
  const res = await fetch(link, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_BYTES) throw new Error('file too large');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10_000) throw new Error('file too small');
  return { buf, contentType: res.headers.get('content-type') || '' };
}

async function viaApis(url, type) {
  const errors = [];
  for (const api of apiList(url, type)) {
    try {
      const res = await withTimeout(fetch(api, { headers: { 'User-Agent': UA, Accept: 'application/json' } }), 30000, 'api');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const link = findDownloadLink(data);
      if (!link) throw new Error('no link in response');
      const { buf, contentType } = await withTimeout(fetchBuffer(link), 180000, 'api file');
      if (/text\/html|application\/json/.test(contentType)) throw new Error('link returned a web page, not media');
      if (type === 'audio') {
        const ext = /mpeg|mp3/.test(contentType) || /\.mp3(\?|$)/.test(link) ? 'mp3' : (/webm/.test(contentType) ? 'webm' : 'm4a');
        return { ...(await finalizeAudio(buf, ext)), title: data?.result?.title || data?.title };
      }
      return { buffer: buf, mimetype: 'video/mp4', ext: 'mp4', title: data?.result?.title || data?.title };
    } catch (e) {
      errors.push(`${new URL(api).host}: ${e.message}`);
    }
  }
  throw new Error(errors.join(' ; '));
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
const SOURCES = {
  ytdlcore: { fn: viaYtdlCore, timeout: 180000 },
  ytdlp: { fn: viaYtDlp, timeout: 300000 },
  api: { fn: viaApis, timeout: 400000 },
};

function sourceOrder() {
  const raw = (process.env.YT_SOURCES || 'ytdlcore,ytdlp,api').split(',').map((s) => s.trim().toLowerCase());
  return raw.filter((s) => SOURCES[s]);
}

/**
 * Downloads a YouTube video as audio (mp3) or video (mp4).
 * @returns {Promise<{buffer:Buffer, mimetype:string, ext:string, title?:string, source:string}>}
 */
async function download(url, type = 'audio', { sources } = {}) {
  if (!['audio', 'video'].includes(type)) throw new Error(`bad type ${type}`);
  const order = sources || sourceOrder();
  const errors = [];
  for (const name of order) {
    const src = SOURCES[name];
    if (!src) continue;
    try {
      const out = await withTimeout(src.fn(url, type), src.timeout, name);
      if (!out?.buffer || out.buffer.length < 10_000) throw new Error('empty result');
      if (out.buffer.length > MAX_BYTES) throw Object.assign(new Error('too large'), { tooLarge: true, size: out.buffer.length });
      log(`${type} OK via ${name} (${(out.buffer.length / 1048576).toFixed(2)} MB)`);
      return { ...out, source: name };
    } catch (e) {
      if (e.tooLarge) throw e;
      log(`${name} failed:`, e.message);
      errors.push(`${name}: ${e.message}`);
    }
  }
  const err = new Error(`All sources failed — ${errors.join(' || ')}`);
  err.details = errors;
  throw err;
}

module.exports = {
  search,
  download,
  extractVideoId,
  isYouTubeUrl,
  findDownloadLink,
  ensureYtDlp,
  _internal: { SOURCES, sourceOrder, finalizeAudio, toMp3, mergeAV },
};
