// Automatic translation of every message the bot sends.
//
// The ~250 legacy commands are written in English. Rather than hand-maintain
// ~800 strings × 6 languages, outgoing text/captions are machine-translated
// into the reader's language right before sending (see bot.js /
// sessionManager.js). Never translated:
//   • command names (".play", "!menu" …), @mentions, JIDs
//   • links / domains, `code` and ```code blocks```
// Results are cached in memory and on disk (data/translate-cache.json), so a
// given help/usage text is only translated once per language.
//
// Engines: Google Translate (free "gtx" endpoint, no key), then xKiro LLM as
// a fallback when XKIRO_API_KEY is set. If both fail, the original text is
// sent unchanged — translation can never block a reply.

const fs = require('fs');
const path = require('path');

const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single';
const TIMEOUT_MS = Number(process.env.TRANSLATE_TIMEOUT_MS) || 8000;
const CACHE_MAX = 5000;
const CHUNK_MAX = 3800;
const CACHE_FILE = path.join(__dirname, '..', 'data', 'translate-cache.json');

// Language codes as Google expects them (all 7 bot languages are supported).
const GOOGLE_CODES = { en: 'en', fr: 'fr', ht: 'ht', es: 'es', pt: 'pt', ar: 'ar', de: 'de' };

// ------------------------------------------------------------------ cache
const cache = new Map();
let saveTimer = null;
try {
  const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  for (const [k, v] of Object.entries(raw)) cache.set(k, v);
} catch {}
function cacheGet(k) {
  if (!cache.has(k)) return undefined;
  const v = cache.get(k);
  cache.delete(k); cache.set(k, v); // LRU bump
  return v;
}
function cacheSet(k, v) {
  cache.set(k, v);
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      fs.writeFile(CACHE_FILE, JSON.stringify(Object.fromEntries(cache)), () => {});
    } catch {}
  }, 5000);
  saveTimer.unref?.();
}

// ------------------------------------------------------------------ masking
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function buildProtectRe(prefix) {
  const prefixes = [...new Set([prefix || '.', '.'])].map(escapeRe).join('|');
  return new RegExp([
    '```[\\s\\S]*?```',                                   // code blocks
    '`[^`\\n]+`',                                          // inline code
    '\\bhttps?:\\/\\/[^\\s<>()]+',                           // links
    '\\bwww\\.[^\\s<>()]+',
    '\\b[\\w-]+(?:\\.[\\w-]+)*\\.(?:com|net|org|app|io|me|dev|xyz|tech|ng|id|co|ke|vip|site|link)\\b(?:\\/[^\\s]*)?',
    '[\\w.:-]+@(?:s\\.whatsapp\\.net|g\\.us|lid|newsletter|broadcast)', // JIDs
    '@\\d{4,}',                                            // @mentions
    `(?<![\\w.])(?:${prefixes})[A-Za-z0-9][\\w-]*`,         // command names (.play, .ttt …)
    '\\{\\s*\\d+\\s*\\}',                                  // things that look like our placeholders
  ].join('|'), 'g');
}

function mask(text, prefix) {
  const tokens = [];
  const masked = text.replace(buildProtectRe(prefix), (m) => {
    tokens.push(m);
    return `{${tokens.length - 1}}`;
  });
  return { masked, tokens };
}

function unmask(translated, tokens) {
  const seen = new Set();
  const out = translated.replace(/\{\s*(\d+)\s*\}/g, (m, i) => {
    const n = Number(i);
    if (n >= tokens.length) return m;
    seen.add(n);
    return tokens[n];
  });
  // A protected token went missing → don't risk a broken command/link.
  if (seen.size !== tokens.length) return null;
  return out;
}

// Google sometimes turns "*Usage:*" into "* Usage: *" which WhatsApp no longer bolds.
function fixFormatting(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/\*[ \t]+([^*\n]+?)[ \t]*\*/g, '*$1*').replace(/\*([^*\s][^*\n]*?)[ \t]+\*/g, '*$1*'))
    .join('\n');
}

function hasWords(s) {
  return /\p{L}{2,}/u.test(s.replace(/\{\d+\}/g, ''));
}

// ------------------------------------------------------------------ engines
let googleDownUntil = 0;

async function googleTranslate(text, lang, fetchImpl) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `${GOOGLE_URL}?client=gtx&sl=auto&tl=${GOOGLE_CODES[lang]}&dt=t`;
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'Mozilla/5.0' },
      body: `q=${encodeURIComponent(text)}`,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`google HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data?.[0])) throw new Error('google: bad response');
    return data[0].map((seg) => (seg && seg[0]) || '').join('');
  } finally {
    clearTimeout(timer);
  }
}

async function xkiroTranslate(text, lang, fetchImpl) {
  const key = process.env.XKIRO_API_KEY;
  if (!key) throw new Error('no xkiro key');
  const { LANGUAGES } = require('./i18n');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const base = (process.env.XKIRO_BASE_URL || 'https://api.xkiro.com/v1').replace(/\/+$/, '');
    const res = await fetchImpl(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.XKIRO_TRANSLATE_MODEL || 'mistralai/mistral-small-2603',
        temperature: 0,
        messages: [
          { role: 'system', content: `Translate the user's WhatsApp message into ${LANGUAGES[lang]?.name || lang}. Output ONLY the translation. Keep every {0}, {1}… placeholder, emoji, line break and *bold*/_italic_ marker exactly as they are. If it is already in that language, return it unchanged.` },
          { role: 'user', content: text },
        ],
      }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `xkiro HTTP ${res.status}`);
    const out = String(data?.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (!out) throw new Error('xkiro: empty');
    return out;
  } finally {
    clearTimeout(timer);
  }
}

async function translateChunk(chunk, lang, fetchImpl) {
  if (Date.now() > googleDownUntil) {
    try {
      return await googleTranslate(chunk, lang, fetchImpl);
    } catch (e) {
      // 429 / network trouble: stop hammering Google for a minute.
      googleDownUntil = Date.now() + 60 * 1000;
      console.error('[translate] google failed:', e.message);
    }
  }
  return xkiroTranslate(chunk, lang, fetchImpl);
}

function splitChunks(text) {
  if (text.length <= CHUNK_MAX) return [text];
  const chunks = [];
  let cur = '';
  for (const line of text.split('\n')) {
    if ((cur + '\n' + line).length > CHUNK_MAX && cur) { chunks.push(cur); cur = line; } else cur = cur ? `${cur}\n${line}` : line;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

const inflight = new Map();

/**
 * Translates `text` into `lang`. Resolves to the translated text, or the
 * original text if translation is unnecessary or failed.
 */
async function translateText(text, lang, { prefix = '.', fetchImpl = (...a) => fetch(...a) } = {}) {
  if (!text || typeof text !== 'string' || !lang || lang === 'en' || !GOOGLE_CODES[lang]) return text;
  if (process.env.AUTO_TRANSLATE === 'false') return text;

  const { masked, tokens } = mask(text, prefix);
  if (!hasWords(masked)) return text;

  const key = `${lang}\u0000${masked}`;
  let translatedMasked = cacheGet(key);
  if (translatedMasked === undefined) {
    if (!inflight.has(key)) {
      inflight.set(key, (async () => {
        const parts = [];
        for (const chunk of splitChunks(masked)) {
          // Keep leading/trailing whitespace & blank lines as they were.
          const lead = chunk.match(/^\s*/)[0];
          const trail = chunk.match(/\s*$/)[0];
          const core = chunk.trim();
          parts.push(core && hasWords(core) ? lead + (await translateChunk(core, lang, fetchImpl)) + trail : chunk);
        }
        const out = fixFormatting(parts.join('\n'));
        cacheSet(key, out);
        return out;
      })().finally(() => inflight.delete(key)));
    }
    try {
      translatedMasked = await inflight.get(key);
    } catch (e) {
      console.error('[translate] failed:', e.message);
      return text;
    }
  }
  const restored = unmask(translatedMasked, tokens);
  if (restored === null) {
    cache.delete(key); // broken translation — don't keep serving it
    return text;
  }
  return restored;
}

/**
 * Translates the text-bearing fields of a sendMessage() content object.
 */
async function translateContent(content, lang, opts) {
  if (!content || typeof content !== 'object' || !lang || lang === 'en') return content;
  const out = { ...content };
  for (const field of ['text', 'caption']) {
    if (typeof out[field] === 'string' && out[field]) out[field] = await translateText(out[field], lang, opts);
  }
  return out;
}

/**
 * Proxy around a Baileys socket whose sendMessage() translates text/captions
 * into getLang()'s language. Everything else passes straight through.
 */
function translatingSock(sock, getLang, getPrefix) {
  return new Proxy(sock, {
    get(target, prop) {
      if (prop === 'sendMessage') {
        return async (jid, content, options) => {
          try {
            const lang = getLang();
            if (lang && lang !== 'en') content = await translateContent(content, lang, { prefix: getPrefix ? getPrefix() : '.' });
          } catch (e) {
            console.error('[translate] sock wrapper:', e.message);
          }
          return target.sendMessage(jid, content, options);
        };
      }
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

module.exports = {
  translateText,
  translateContent,
  translatingSock,
  _internal: { mask, unmask, fixFormatting, cache, splitChunks, resetGoogle: () => { googleDownUntil = 0; } },
};
