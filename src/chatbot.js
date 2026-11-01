// AI auto-chatbot (".chatbot on/off") powered by the xKiro API
// (OpenAI-compatible: https://api.xkiro.com/v1/chat/completions).
//
// When ON for a linked account:
//   • DMs    — answers every person who writes to the owner in private.
//   • Groups — answers ONLY when someone tags/mentions the owner or replies
//              to one of the owner's messages (anti-spam).
// Plus per-user and per-chat rate limits so it can never flood a chat or get
// into an infinite ping-pong with another bot.

const { getGlobalSetting, setGlobalSetting, isBanned } = require('./store');
const { bareNumber, resolveSenderPhoneNumber, isBotIdentity } = require('./jidUtils');
const { getLang, LANGUAGES } = require('./i18n');

const XKIRO_BASE = (process.env.XKIRO_BASE_URL || 'https://api.xkiro.com/v1').replace(/\/+$/, '');
const DEFAULT_MODEL = process.env.XKIRO_MODEL || 'qwen/qwen3.8-omni-flash:free';
// Tried in order after the chosen model if it errors / is overloaded (all free on xKiro).
const FALLBACK_MODELS = ['mistralai/mistral-small-2603', 'qwen/qwen3.7-flash:free', 'cohere/command-a'];

const HISTORY_LIMIT = 12;          // messages kept per conversation
const HISTORY_TTL = 60 * 60 * 1000; // forget a conversation after 1h idle
const USER_COOLDOWN = 4000;        // min ms between two replies to the same person
const CHAT_WINDOW = 60 * 1000;
const CHAT_MAX_PER_WINDOW = 8;     // max bot replies per chat per minute

const histories = new Map(); // key -> { messages: [], at }
const lastReplyAt = new Map(); // `${session}|${chat}|${user}` -> ts
const chatReplies = new Map(); // `${session}|${chat}` -> [ts...]

// ---------------------------------------------------------------- settings
function isChatbotEnabled(sessionId) {
  return getGlobalSetting(sessionId, 'chatbot') === true;
}
function setChatbotEnabled(sessionId, on) {
  setGlobalSetting(sessionId, 'chatbot', !!on);
}
function getApiKey(sessionId) {
  return getGlobalSetting(sessionId, 'xkiroKey') || process.env.XKIRO_API_KEY || '';
}
function setApiKey(sessionId, key) {
  setGlobalSetting(sessionId, 'xkiroKey', key || undefined);
}
function getModel(sessionId) {
  return getGlobalSetting(sessionId, 'chatbotModel') || DEFAULT_MODEL;
}
function setModel(sessionId, model) {
  setGlobalSetting(sessionId, 'chatbotModel', model || undefined);
}

// ---------------------------------------------------------------- helpers
function getContextInfo(message) {
  if (!message) return null;
  for (const v of Object.values(message)) {
    if (v && typeof v === 'object' && v.contextInfo) return v.contextInfo;
  }
  return null;
}

// Did this group message tag / mention / reply to the owner (= the linked account)?
function targetsOwner(sock, msg, sessionId, text) {
  const ctx = getContextInfo(msg.message) || {};
  const opts = { sock, sessionId };
  const mentioned = ctx.mentionedJid || [];
  if (mentioned.some((j) => isBotIdentity(j, opts))) return true;
  if (ctx.quotedMessage && ctx.participant && isBotIdentity(ctx.participant, opts)) return true;
  // Plain-text "@50912345678" that WhatsApp didn't turn into a real mention.
  const nums = [bareNumber(sessionId), bareNumber(sock?.user?.id), bareNumber(sock?.user?.lid)].filter(Boolean);
  if (text && nums.some((n) => text.includes(`@${n}`))) return true;
  return false;
}

function stripOwnerMention(sock, sessionId, text) {
  const nums = [bareNumber(sessionId), bareNumber(sock?.user?.id), bareNumber(sock?.user?.lid)].filter(Boolean);
  let out = text;
  for (const n of nums) out = out.split(`@${n}`).join('');
  return out.replace(/\s{2,}/g, ' ').trim();
}

function rateLimited(sessionId, chat, user, now = Date.now()) {
  const uk = `${sessionId}|${chat}|${user}`;
  if (now - (lastReplyAt.get(uk) || 0) < USER_COOLDOWN) return true;
  const ck = `${sessionId}|${chat}`;
  const recent = (chatReplies.get(ck) || []).filter((ts) => now - ts < CHAT_WINDOW);
  if (recent.length >= CHAT_MAX_PER_WINDOW) {
    chatReplies.set(ck, recent);
    return true;
  }
  recent.push(now);
  chatReplies.set(ck, recent);
  lastReplyAt.set(uk, now);
  return false;
}

function historyKey(sessionId, chat, user) {
  return `${sessionId}|${chat}|${user}`;
}
function getHistory(key) {
  const h = histories.get(key);
  if (!h || Date.now() - h.at > HISTORY_TTL) return [];
  return h.messages;
}
function pushHistory(key, ...msgs) {
  const messages = [...getHistory(key), ...msgs].slice(-HISTORY_LIMIT);
  histories.set(key, { messages, at: Date.now() });
  if (histories.size > 2000) histories.delete(histories.keys().next().value);
}
function resetHistory(sessionId) {
  for (const k of histories.keys()) if (k.startsWith(`${sessionId}|`)) histories.delete(k);
}

function systemPrompt({ ownerName, userName, isGroup, lang }) {
  const langName = LANGUAGES[lang]?.name || 'English';
  return [
    `You are the WhatsApp assistant of ${ownerName || 'the owner'}, replying on their behalf while they are away.`,
    `You are talking with ${userName || 'a user'}${isGroup ? ' inside a group chat' : ' in a private chat'}.`,
    `Always answer in the same language the user writes in. If unclear, answer in ${langName}.`,
    'Be friendly, natural and concise (WhatsApp style, usually 1-4 short sentences, a few emojis are fine).',
    'Never pretend to be a human if sincerely asked; you are an AI assistant. Never share private information about the owner.',
    'Use WhatsApp formatting only (*bold*, _italic_), no markdown headers or tables.',
  ].join('\n');
}

// ---------------------------------------------------------------- API
async function callXkiro({ apiKey, model, messages, fetchImpl = fetch, timeoutMs = 45000 }) {
  const models = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
  const errors = [];
  for (const m of models) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${XKIRO_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: m, messages, max_tokens: 800, temperature: 0.7 }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const reason = data?.error?.message || data?.message || `HTTP ${res.status}`;
        // Bad key — no point trying other models.
        if (res.status === 401 || res.status === 403) throw Object.assign(new Error(reason), { fatal: true });
        throw new Error(reason);
      }
      let reply = data?.choices?.[0]?.message?.content;
      if (Array.isArray(reply)) reply = reply.map((p) => p?.text || '').join('');
      reply = String(reply || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (!reply) throw new Error('empty reply');
      return { reply, model: m };
    } catch (e) {
      if (e.fatal) throw e;
      errors.push(`${m}: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(errors.join(' ; '));
}

// ---------------------------------------------------------------- main hook
/**
 * Called by bot.js for every non-command message. Returns true when it replied.
 */
async function maybeChatbotReply(sock, msg, sessionId, { from, text, isGroup }, deps = {}) {
  try {
    if (!isChatbotEnabled(sessionId)) return false;
    if (!msg?.message || msg.key.fromMe) return false;
    if (!text || !text.trim()) return false;
    if (from === 'status@broadcast' || from.endsWith('@newsletter') || from.endsWith('@broadcast')) return false;

    const number = resolveSenderPhoneNumber(msg);
    if (isBanned(sessionId, number)) return false;
    if (isGroup && !targetsOwner(sock, msg, sessionId, text)) return false;

    const apiKey = getApiKey(sessionId);
    if (!apiKey) return false;

    const sender = msg.key.participant || from;
    if (rateLimited(sessionId, from, sender)) return false;

    const clean = isGroup ? stripOwnerMention(sock, sessionId, text) : text.trim();
    if (!clean) return false;

    const key = historyKey(sessionId, from, sender);
    const lang = getLang(sessionId, number);
    const messages = [
      { role: 'system', content: systemPrompt({ ownerName: sock?.user?.name, userName: msg.pushName, isGroup, lang }) },
      ...getHistory(key),
      { role: 'user', content: clean.slice(0, 4000) },
    ];

    await sock.sendPresenceUpdate?.('composing', from).catch?.(() => {});
    const { reply } = await callXkiro({ apiKey, model: getModel(sessionId), messages, fetchImpl: deps.fetchImpl || fetch });
    pushHistory(key, { role: 'user', content: clean.slice(0, 4000) }, { role: 'assistant', content: reply.slice(0, 4000) });

    await sock.sendMessage(from, { text: reply.slice(0, 60000) }, { quoted: msg });
    return true;
  } catch (err) {
    console.error(`[chatbot:${sessionId}]`, err.message);
    return false;
  }
}

module.exports = {
  DEFAULT_MODEL,
  isChatbotEnabled,
  setChatbotEnabled,
  getApiKey,
  setApiKey,
  getModel,
  setModel,
  resetHistory,
  targetsOwner,
  callXkiro,
  maybeChatbotReply,
  _internal: { histories, lastReplyAt, chatReplies, rateLimited, stripOwnerMention, getContextInfo },
};
