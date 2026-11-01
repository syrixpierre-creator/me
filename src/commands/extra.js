// New commands for INCONNU XD V2:
//   • chatbot on/off (xKiro AI auto-reply)       • lang (multi-language)
//   • play / playvideo / ytmp3 (reply 1 = audio, 2 = video, direct YouTube scraping)
//   • games: tictactoe, hangman, guess, mathquiz, rps, slot
//   • fun/tools: 8ball, ship, poll, remind, afk, genpass
//
// Installed from commands/index.js via install(). Also exports
// handlePlainText(), which bot.js calls for every message that is NOT a
// command — that's how "reply 1 / 2", game moves and AFK notices work.

const crypto = require('crypto');
const yt = require('../../lib/youtube');
const i18n = require('../i18n');
const chatbot = require('../chatbot');
const { bareNumber, resolveSenderPhoneNumber, isBotIdentity } = require('../jidUtils');

const { t, LANGUAGES, normalizeLang } = i18n;

// ------------------------------------------------------------------ helpers
// Phone number used for language lookup. fromMe → it's the owner (the linked
// account), whose language is the session language.
function senderNumber(msg, sessionId) {
  if (msg?.key?.fromMe) return bareNumber(sessionId);
  return resolveSenderPhoneNumber(msg);
}
function langOf(msg, sessionId) {
  return i18n.getLang(sessionId, senderNumber(msg, sessionId));
}
function same(a, b) {
  return !!a && !!b && bareNumber(a) === bareNumber(b);
}
function tag(jid) {
  return `@${bareNumber(jid)}`;
}
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function getContextInfo(message) {
  if (!message) return null;
  for (const v of Object.values(message)) {
    if (v && typeof v === 'object' && v.contextInfo) return v.contextInfo;
  }
  return null;
}
function fmtDuration(ms) {
  const s = Math.max(1, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h && `${h}h`, m && `${m}m`, (!h && sec) && `${sec}s`].filter(Boolean).join(' ') || '0s';
}

// =================================================================== PLAY
const PENDING_TTL = 5 * 60 * 1000;
const pendingPlays = new Map(); // `${sessionId}|${msgId}` -> entry
const lastPlayByUser = new Map(); // `${sessionId}|${chat}|${user}` -> msgId

function cleanupPending(now = Date.now()) {
  for (const [k, v] of pendingPlays) if (now > v.expires) pendingPlays.delete(k);
}

async function sendMedia(sock, from, quotedMsg, result, video, type) {
  const safe = (result.title || video.title || 'youtube').replace(/[^\w\s.-]/g, '').trim().slice(0, 80) || 'youtube';
  const sizeMb = result.buffer.length / 1048576;
  const quoted = quotedMsg ? { quoted: quotedMsg } : undefined;
  if (type === 'audio') {
    try {
      await sock.sendMessage(from, { audio: result.buffer, mimetype: result.mimetype, fileName: `${safe}.${result.ext}`, ptt: false }, quoted);
    } catch {
      await sock.sendMessage(from, { document: result.buffer, mimetype: result.mimetype, fileName: `${safe}.${result.ext}`, caption: `🎵 ${safe}` }, quoted);
    }
    return;
  }
  // WhatsApp refuses inline videos above ~64 MB — send those as a document.
  if (sizeMb > 60) {
    await sock.sendMessage(from, { document: result.buffer, mimetype: 'video/mp4', fileName: `${safe}.mp4`, caption: `🎬 ${safe}` }, quoted);
  } else {
    await sock.sendMessage(from, { video: result.buffer, mimetype: 'video/mp4', caption: `🎬 ${safe}` }, quoted);
  }
}

async function downloadAndSend({ sock, from, msg, sessionId, video, type, prefix, lang }) {
  const L = lang || langOf(msg, sessionId);
  await sock.sendMessage(from, { text: t(L, type === 'audio' ? 'play.dlAudio' : 'play.dlVideo') }, { quoted: msg });
  try {
    if (msg?.key) await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});
    const result = await yt.download(video.url, type);
    await sendMedia(sock, from, msg, result, video, type);
    if (msg?.key) await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});
    return true;
  } catch (e) {
    console.error('[play] download error:', e.message);
    if (msg?.key) await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
    const text = e.tooLarge
      ? t(L, 'play.tooLarge', { size: (e.size / 1048576).toFixed(1) })
      : t(L, 'play.failed', { p: prefix });
    await sock.sendMessage(from, { text }, { quoted: msg });
    return false;
  }
}

async function playCommand(ctx, directType) {
  const { sock, from, msg, args, prefix, sessionId, sender } = ctx;
  const L = langOf(msg, sessionId);
  const query = args.join(' ').trim();
  if (!query) return sock.sendMessage(from, { text: t(L, 'play.usage', { p: prefix }) });

  await sock.sendMessage(from, { text: t(L, 'play.searching', { query }) });
  let video;
  try {
    video = await yt.search(query);
  } catch (e) {
    console.error('[play] search error:', e.message);
  }
  if (!video) return sock.sendMessage(from, { text: t(L, 'play.noResults') });

  if (directType) return downloadAndSend({ sock, from, msg, sessionId, video, type: directType, prefix, lang: L });

  const caption = t(L, 'play.choose', { ...video });
  let sent;
  try {
    sent = await sock.sendMessage(from, { image: { url: video.thumbnail }, caption }, { quoted: msg });
  } catch {
    sent = await sock.sendMessage(from, { text: caption }, { quoted: msg });
  }
  const id = sent?.key?.id;
  if (!id) return;
  cleanupPending();
  pendingPlays.set(`${sessionId}|${id}`, { video, chat: from, requester: sender, expires: Date.now() + PENDING_TTL });
  lastPlayByUser.set(`${sessionId}|${from}|${bareNumber(sender)}`, id);
}

// Returns true when the message was a 1/2 answer to a .play prompt.
async function handlePlayReply({ sock, msg, sessionId, from, sender, text, prefix }) {
  const choice = text.trim().replace(/[️⃣]/g, '');
  const ctxInfo = getContextInfo(msg.message);
  const quotedId = ctxInfo?.quotedMessage ? ctxInfo.stanzaId : null;

  let entryKey = null;
  let quotedPrompt = false;
  if (quotedId && pendingPlays.has(`${sessionId}|${quotedId}`)) {
    entryKey = `${sessionId}|${quotedId}`;
    quotedPrompt = true;
  } else if (/^[12]$/.test(choice)) {
    const lastId = lastPlayByUser.get(`${sessionId}|${from}|${bareNumber(sender)}`);
    if (lastId && pendingPlays.has(`${sessionId}|${lastId}`)) entryKey = `${sessionId}|${lastId}`;
  }
  if (!entryKey) return false;

  const entry = pendingPlays.get(entryKey);
  const L = langOf(msg, sessionId);
  if (Date.now() > entry.expires) {
    pendingPlays.delete(entryKey);
    if (quotedPrompt) await sock.sendMessage(from, { text: t(L, 'play.expired', { p: prefix }) }, { quoted: msg });
    return quotedPrompt;
  }
  // Only the person who ran .play can pick (prevents hijacking in groups).
  if (!same(entry.requester, sender)) return false;

  if (!/^[12]$/.test(choice)) {
    if (quotedPrompt) {
      await sock.sendMessage(from, { text: t(L, 'play.invalidChoice') }, { quoted: msg });
      return true;
    }
    return false;
  }
  pendingPlays.delete(entryKey);
  const type = choice === '1' ? 'audio' : 'video';
  await downloadAndSend({ sock, from, msg, sessionId, video: entry.video, type, prefix, lang: L });
  return true;
}

// =================================================================== GAMES
// One running game per chat (any type). key: `${sessionId}|${chat}`
const games = new Map();
const GAME_TTL = 15 * 60 * 1000;
function gameKey(sessionId, chat) { return `${sessionId}|${chat}`; }
function getGame(sessionId, chat) {
  const g = games.get(gameKey(sessionId, chat));
  if (g && Date.now() - g.at > GAME_TTL) {
    endGame(sessionId, chat);
    return null;
  }
  return g || null;
}
function setGame(sessionId, chat, g) {
  g.at = Date.now();
  games.set(gameKey(sessionId, chat), g);
}
function endGame(sessionId, chat) {
  const g = games.get(gameKey(sessionId, chat));
  if (g?.timer) clearTimeout(g.timer);
  games.delete(gameKey(sessionId, chat));
}

// ----- Tic-tac-toe
const NUM_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function renderBoard(b) {
  const cell = (i) => (b[i] === 'X' ? '❌' : b[i] === 'O' ? '⭕' : NUM_EMOJI[i]);
  return [0, 3, 6].map((r) => `${cell(r)}${cell(r + 1)}${cell(r + 2)}`).join('\n');
}
function winnerOf(b) {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? 'draw' : null;
}
// Perfect play (minimax) — but with a 25% chance of a random move so it's beatable.
function bestMove(b, me = 'O') {
  const free = b.map((v, i) => (v ? null : i)).filter((i) => i !== null);
  if (Math.random() < 0.25) return rand(free);
  const opp = me === 'O' ? 'X' : 'O';
  const score = (board, turn, depth) => {
    const w = winnerOf(board);
    if (w === me) return 10 - depth;
    if (w === opp) return depth - 10;
    if (w === 'draw') return 0;
    const scores = [];
    board.forEach((v, i) => {
      if (v) return;
      board[i] = turn;
      scores.push(score(board, turn === 'X' ? 'O' : 'X', depth + 1));
      board[i] = null;
    });
    return turn === me ? Math.max(...scores) : Math.min(...scores);
  };
  let best = free[0];
  let bestScore = -Infinity;
  for (const i of free) {
    const copy = [...b];
    copy[i] = me;
    const s = score(copy, opp, 1);
    if (s > bestScore) { bestScore = s; best = i; }
  }
  return best;
}
function playerName(g, mark, L) {
  const p = g.players[mark];
  return p === 'bot' ? t(L, 'ttt.bot') : tag(p);
}
function tttMentions(g) {
  return Object.values(g.players).filter((p) => p !== 'bot');
}

async function tttMove({ sock, from, sessionId, sender, cell, msg }) {
  const g = getGame(sessionId, from);
  const L = g.lang;
  const mark = g.turn;
  if (!same(g.players[mark], sender)) {
    // Ignore digits from people who aren't playing; tell actual players it's not their turn.
    if (Object.values(g.players).some((p) => same(p, sender))) {
      await sock.sendMessage(from, { text: t(L, 'ttt.notTurn') }, { quoted: msg });
    }
    return Object.values(g.players).some((p) => same(p, sender));
  }
  if (g.board[cell]) {
    await sock.sendMessage(from, { text: t(L, 'ttt.taken') }, { quoted: msg });
    return true;
  }
  g.board[cell] = mark;
  g.turn = mark === 'X' ? 'O' : 'X';

  let w = winnerOf(g.board);
  if (!w && g.players[g.turn] === 'bot') {
    g.board[bestMove(g.board, g.turn)] = g.turn;
    g.turn = g.turn === 'X' ? 'O' : 'X';
    w = winnerOf(g.board);
  }
  const board = renderBoard(g.board);
  const mentions = tttMentions(g);
  if (w) {
    endGame(sessionId, from);
    const text = w === 'draw' ? t(L, 'ttt.draw', { board }) : t(L, 'ttt.win', { board, winner: playerName(g, w, L) });
    await sock.sendMessage(from, { text, mentions });
    return true;
  }
  setGame(sessionId, from, g);
  await sock.sendMessage(from, { text: t(L, 'ttt.turn', { board, turn: playerName(g, g.turn, L) }), mentions });
  return true;
}

// ----- Hangman
const HANGMAN_WORDS = {
  en: ['javascript', 'whatsapp', 'elephant', 'football', 'guitar', 'mountain', 'diamond', 'keyboard', 'pyramid', 'umbrella', 'volcano', 'treasure', 'chocolate', 'airplane', 'universe'],
  fr: ['ordinateur', 'telephone', 'montagne', 'chocolat', 'papillon', 'football', 'guitare', 'fromage', 'bibliotheque', 'voiture', 'parapluie', 'dinosaure', 'pyramide', 'musique', 'soleil'],
  ht: ['lakay', 'zanmi', 'machin', 'mizik', 'lekol', 'manje', 'diri', 'mango', 'lanmou', 'kreyol', 'soley', 'telefon', 'ayiti', 'kanaval', 'lapli'],
  es: ['ordenador', 'telefono', 'montana', 'chocolate', 'mariposa', 'guitarra', 'biblioteca', 'coche', 'paraguas', 'dinosaurio', 'piramide', 'musica', 'tesoro', 'universo', 'futbol'],
  pt: ['computador', 'telefone', 'montanha', 'chocolate', 'borboleta', 'guitarra', 'biblioteca', 'carro', 'guarda', 'dinossauro', 'piramide', 'musica', 'tesouro', 'universo', 'futebol'],
  de: ['computer', 'telefon', 'berg', 'schokolade', 'schmetterling', 'gitarre', 'bibliothek', 'auto', 'regenschirm', 'dinosaurier', 'pyramide', 'musik', 'schatz', 'universum', 'fussball'],
};
const HANGMAN_ART = ['', '😐', '😟', '😨', '😰', '😱', '💀'];
function stripAccents(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function maskWord(word, guessed) {
  return word.split('').map((c) => (guessed.has(c) ? c.toUpperCase() : '_')).join(' ');
}

// ----- Math quiz
function makeMathQuestion(level) {
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  if (level === 'hard') {
    const a = r(12, 49); const b = r(3, 19); const c = r(10, 99);
    return { q: `${a} × ${b} + ${c}`, a: a * b + c };
  }
  if (level === 'medium') {
    const op = rand(['+', '-', '×']);
    const a = r(10, 99); const b = op === '×' ? r(2, 12) : r(10, 99);
    return { q: `${a} ${op} ${b}`, a: op === '+' ? a + b : op === '-' ? a - b : a * b };
  }
  const op = rand(['+', '-']);
  const a = r(1, 20); const b = r(1, 20);
  return { q: `${a} ${op} ${b}`, a: op === '+' ? a + b : a - b };
}

async function handleGameInput({ sock, msg, sessionId, from, sender, text }) {
  const g = getGame(sessionId, from);
  if (!g) return false;
  const raw = text.trim();

  if (g.type === 'ttt') {
    const m = raw.match(/^([1-9])(?:️⃣)?$/);
    if (!m) return false;
    return tttMove({ sock, from, sessionId, sender, cell: Number(m[1]) - 1, msg });
  }

  if (g.type === 'hangman') {
    const letter = stripAccents(raw.toLowerCase());
    if (!/^[a-z]$/.test(letter)) return false;
    const L = g.lang;
    if (g.guessed.has(letter)) {
      await sock.sendMessage(from, { text: t(L, 'hangman.already', { letter }) }, { quoted: msg });
      return true;
    }
    g.guessed.add(letter);
    if (!g.word.includes(letter)) g.lives -= 1;
    const word = maskWord(g.word, g.guessed);
    if (!word.includes('_')) {
      endGame(sessionId, from);
      await sock.sendMessage(from, { text: t(L, 'hangman.win', { word: g.word.toUpperCase() }) }, { quoted: msg });
    } else if (g.lives <= 0) {
      endGame(sessionId, from);
      await sock.sendMessage(from, { text: t(L, 'hangman.lose', { art: HANGMAN_ART[6], word: g.word.toUpperCase() }) }, { quoted: msg });
    } else {
      setGame(sessionId, from, g);
      await sock.sendMessage(from, {
        text: t(L, 'hangman.state', { art: HANGMAN_ART[6 - g.lives], word, lives: '❤️'.repeat(g.lives), tried: [...g.guessed].join(' ').toUpperCase() }),
      });
    }
    return true;
  }

  if (g.type === 'guess') {
    if (!/^\d{1,3}$/.test(raw)) return false;
    const n = Number(raw);
    const L = g.lang;
    g.used += 1;
    const left = g.tries - g.used;
    if (n === g.n) {
      endGame(sessionId, from);
      await sock.sendMessage(from, { text: t(L, 'guess.win', { n: g.n, used: g.used }) }, { quoted: msg });
    } else if (left <= 0) {
      endGame(sessionId, from);
      await sock.sendMessage(from, { text: t(L, 'guess.lose', { n: g.n }) }, { quoted: msg });
    } else {
      setGame(sessionId, from, g);
      await sock.sendMessage(from, { text: t(L, n < g.n ? 'guess.higher' : 'guess.lower', { left }) }, { quoted: msg });
    }
    return true;
  }

  if (g.type === 'math') {
    if (!/^-?\d+$/.test(raw)) return false;
    const L = g.lang;
    if (Number(raw) === g.a) {
      endGame(sessionId, from);
      await sock.sendMessage(from, { text: t(L, 'math.correct', { name: tag(sender), q: g.q, a: g.a }), mentions: [sender] }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { text: t(L, 'math.wrong') }, { quoted: msg });
    }
    return true;
  }
  return false;
}

// =================================================================== AFK
const afkNotified = new Map(); // `${sessionId}|${user}` -> ts
async function handleAfk({ sock, msg, sessionId, from, isGroup, text }) {
  const afk = require('../store').getGlobalSetting(sessionId, 'afk');
  if (!afk || msg.key.fromMe) return false;
  if (from === 'status@broadcast' || from.endsWith('@newsletter')) return false;
  if (isGroup && !chatbot.targetsOwner(sock, msg, sessionId, text)) return false;
  const user = msg.key.participant || from;
  const k = `${sessionId}|${user}`;
  if (Date.now() - (afkNotified.get(k) || 0) < 10 * 60 * 1000) return false;
  afkNotified.set(k, Date.now());
  const L = langOf(msg, sessionId);
  await sock.sendMessage(from, {
    text: t(L, 'afk.notice', { reason: afk.reason ? ` (${afk.reason})` : '', time: fmtDuration(Date.now() - afk.since) }),
  }, { quoted: msg });
  return false; // never "consumes" the message — chatbot may still answer
}

/**
 * Called by bot.js for every message that is not a command.
 * Returns true if the message was consumed (play choice / game move).
 */
async function handlePlainText(sock, msg, sessionId, ctx) {
  const { from, text } = ctx;
  if (!text) return false;
  const sender = msg.key.fromMe ? (sock.user?.id || from) : (msg.key.participant || from);
  const full = { ...ctx, sock, msg, sessionId, sender };
  try {
    if (await handlePlayReply(full)) return true;
    if (await handleGameInput(full)) return true;
    await handleAfk(full);
  } catch (e) {
    console.error(`[extra:${sessionId}] plain-text handler error:`, e.message);
  }
  return false;
}

// =================================================================== REGISTER
function install({ register: rawRegister, PREFIX, commands }) {
  // Everything registered here is already fully localized with t(), so
  // bot.js must not machine-translate it again.
  const register = (cmd) => rawRegister({ ...cmd, i18n: true });
  // The menu lists bare command names (never translated) and localizes its
  // own header/categories, so it's flagged the same way.
  for (const name of ['menu', 'richmenu']) {
    const c = commands && commands.get(name);
    if (c) c.i18n = true;
  }
  const P = (prefix) => prefix || PREFIX || '.';

  // ------------------------------------------------------------- CHATBOT
  register({
    name: 'chatbot',
    aliases: ['autoai', 'aibot'],
    category: 'AI',
    description: 'AI auto-reply (xKiro) — .chatbot on/off. DMs: everyone. Groups: only when the owner is tagged/replied',
    async execute({ sock, from, msg, args, prefix, sessionId, isOwner, isGroup }) {
      const L = langOf(msg, sessionId);
      const p = P(prefix);
      if (!isOwner) return sock.sendMessage(from, { text: t(L, 'common.ownerOnly') });
      const sub = (args[0] || '').toLowerCase();
      const status = t(L, chatbot.isChatbotEnabled(sessionId) ? 'chatbot.enabled' : 'chatbot.disabled');

      if (['on', 'enable', 'true', '1', 'activer', 'limen'].includes(sub)) {
        chatbot.setChatbotEnabled(sessionId, true);
        let text = t(L, 'chatbot.on');
        if (!chatbot.getApiKey(sessionId)) text += `\n\n${t(L, 'chatbot.noKeyOn', { p })}`;
        return sock.sendMessage(from, { text });
      }
      if (['off', 'disable', 'false', '0', 'desactiver', 'désactiver', 'etenn'].includes(sub)) {
        chatbot.setChatbotEnabled(sessionId, false);
        return sock.sendMessage(from, { text: t(L, 'chatbot.off') });
      }
      if (sub === 'status') {
        const key = chatbot.getApiKey(sessionId) ? t(L, 'chatbot.keyOk') : t(L, 'chatbot.keyMissing', { p });
        return sock.sendMessage(from, { text: t(L, 'chatbot.status', { status, model: chatbot.getModel(sessionId), key }) });
      }
      if (sub === 'key') {
        if (isGroup) return sock.sendMessage(from, { text: t(L, 'chatbot.keyGroup') });
        const key = args[1];
        if (!key) return sock.sendMessage(from, { text: t(L, 'chatbot.help', { status, p }) });
        chatbot.setApiKey(sessionId, key === 'clear' ? '' : key);
        return sock.sendMessage(from, { text: t(L, 'chatbot.keySet') });
      }
      if (sub === 'model') {
        const model = args[1];
        if (!model) return sock.sendMessage(from, { text: t(L, 'chatbot.status', { status, model: chatbot.getModel(sessionId), key: chatbot.getApiKey(sessionId) ? t(L, 'chatbot.keyOk') : t(L, 'chatbot.keyMissing', { p }) }) });
        chatbot.setModel(sessionId, model === 'default' ? '' : model);
        return sock.sendMessage(from, { text: t(L, 'chatbot.modelSet', { model: chatbot.getModel(sessionId) }) });
      }
      if (sub === 'reset' || sub === 'clear') {
        chatbot.resetHistory(sessionId);
        return sock.sendMessage(from, { text: t(L, 'chatbot.reset') });
      }
      return sock.sendMessage(from, { text: t(L, 'chatbot.help', { status, p }) });
    },
  });

  // ------------------------------------------------------------- LANG
  register({
    name: 'lang',
    aliases: ['language', 'langue', 'lang2', 'idioma', 'sprache'],
    category: 'MAIN',
    description: 'Change the bot language — .lang fr | en | ht | es | pt | ar | de',
    async execute({ sock, from, msg, args, prefix, sessionId, isOwner }) {
      const p = P(prefix);
      const number = senderNumber(msg, sessionId);
      const L = i18n.getLang(sessionId, number);
      const input = args.join(' ').trim();
      const codes = Object.keys(LANGUAGES).join(', ');

      if (!input) {
        const list = Object.entries(LANGUAGES).map(([c, info]) => `${info.flag} ${c} — ${info.name}`).join('\n');
        const cur = LANGUAGES[L];
        return sock.sendMessage(from, {
          text: t(L, 'lang.current', { flag: cur.flag, name: cur.name, list, p, scopeNote: t(L, isOwner ? 'lang.scopeOwner' : 'lang.scopeUser') }),
        });
      }
      if (!isOwner && ['reset', 'default', 'auto'].includes(input.toLowerCase())) {
        i18n.setUserLang(sessionId, number, null);
        return sock.sendMessage(from, { text: t(i18n.getLang(sessionId, number), 'lang.reset') });
      }
      const code = normalizeLang(input);
      if (!code) return sock.sendMessage(from, { text: t(L, 'lang.invalid', { input, codes }) });
      const info = LANGUAGES[code];
      if (isOwner) {
        i18n.setSessionLang(sessionId, code);
        return sock.sendMessage(from, { text: t(code, 'lang.setSession', { flag: info.flag, name: info.name }) });
      }
      i18n.setUserLang(sessionId, number, code);
      return sock.sendMessage(from, { text: t(code, 'lang.setUser', { flag: info.flag, name: info.name }) });
    },
  });

  // ------------------------------------------------------------- PLAY
  register({
    name: 'play',
    aliases: ['song', 'music', 'ytplay', 'yts'],
    category: 'DOWNLOADER',
    description: 'Search YouTube, then reply 1 for audio or 2 for video',
    execute: (ctx) => playCommand(ctx, null),
  });
  register({
    name: 'playvideo',
    aliases: ['playv', 'ytmp4', 'ytvideo', 'watch', 'vplay', 'video'],
    category: 'DOWNLOADER',
    description: 'Search/link → download the YouTube video (MP4) directly',
    execute: (ctx) => playCommand(ctx, 'video'),
  });
  register({
    name: 'ytmp3',
    aliases: ['yt3', 'ytmusic', 'ytaudio', 'playaudio', 'mp3'],
    category: 'DOWNLOADER',
    description: 'Search/link → download the YouTube audio (MP3) directly',
    execute: (ctx) => playCommand(ctx, 'audio'),
  });

  // ------------------------------------------------------------- GAMES
  const endWords = ['end', 'stop', 'quit', 'fin', 'fini', 'kanpe', 'fim', 'ende'];

  register({
    name: 'tictactoe',
    aliases: ['ttt', 'morpion', 'xo'],
    category: 'GAMES',
    description: 'Tic-tac-toe vs the bot or a tagged friend — play by sending 1-9',
    async execute({ sock, from, msg, args, prefix, sessionId, sender }) {
      const L = langOf(msg, sessionId);
      const p = P(prefix);
      const sub = (args[0] || '').toLowerCase();
      const current = getGame(sessionId, from);
      if (endWords.includes(sub)) {
        if (!current) return sock.sendMessage(from, { text: t(L, 'ttt.none') });
        endGame(sessionId, from);
        return sock.sendMessage(from, { text: t(L, 'ttt.ended') });
      }
      if (['help', 'aide'].includes(sub)) return sock.sendMessage(from, { text: t(L, 'ttt.usage', { p }) });
      if (current) return sock.sendMessage(from, { text: t(L, 'ttt.already', { p }) });

      const ctxInfo = getContextInfo(msg.message) || {};
      const opponent = (ctxInfo.mentionedJid || [])[0] || (ctxInfo.quotedMessage ? ctxInfo.participant : null);
      if (opponent && same(opponent, sender)) return sock.sendMessage(from, { text: t(L, 'ttt.self') });
      const vsBot = !opponent;

      const g = { type: 'ttt', lang: L, board: Array(9).fill(null), turn: 'X', players: { X: sender, O: vsBot ? 'bot' : opponent } };
      setGame(sessionId, from, g);
      const mentions = tttMentions(g);
      return sock.sendMessage(from, {
        text: t(L, 'ttt.started', { x: playerName(g, 'X', L), o: playerName(g, 'O', L), board: renderBoard(g.board), turn: playerName(g, 'X', L) }),
        mentions,
      });
    },
  });

  register({
    name: 'hangman',
    aliases: ['pendu', 'pann', 'ahorcado', 'forca', 'galgen'],
    category: 'GAMES',
    description: 'Hangman word game — guess letters by sending them one by one',
    async execute({ sock, from, msg, args, prefix, sessionId }) {
      const L = langOf(msg, sessionId);
      const p = P(prefix);
      const current = getGame(sessionId, from);
      if (endWords.includes((args[0] || '').toLowerCase())) {
        if (!current) return sock.sendMessage(from, { text: t(L, 'ttt.none') });
        endGame(sessionId, from);
        return sock.sendMessage(from, { text: t(L, current.type === 'hangman' ? 'hangman.lose' : 'ttt.ended', { art: '🛑', word: (current.word || '').toUpperCase() }) });
      }
      if (current) return sock.sendMessage(from, { text: t(L, 'ttt.already', { p }).replace(`${p}ttt end`, `${p}${current.type === 'ttt' ? 'ttt' : current.type} end`) });
      const word = rand(HANGMAN_WORDS[L] || HANGMAN_WORDS.en);
      const g = { type: 'hangman', lang: L, word, guessed: new Set(), lives: 6 };
      setGame(sessionId, from, g);
      return sock.sendMessage(from, { text: t(L, 'hangman.start', { word: maskWord(word, g.guessed), lives: '❤️'.repeat(6), p }) });
    },
  });

  register({
    name: 'guess',
    aliases: ['guessnumber', 'devine', 'adivina'],
    category: 'GAMES',
    description: 'Guess the number between 1 and 100',
    async execute({ sock, from, msg, args, prefix, sessionId }) {
      const L = langOf(msg, sessionId);
      const p = P(prefix);
      const current = getGame(sessionId, from);
      if (endWords.includes((args[0] || '').toLowerCase())) {
        if (!current) return sock.sendMessage(from, { text: t(L, 'ttt.none') });
        endGame(sessionId, from);
        return sock.sendMessage(from, { text: current.type === 'guess' ? t(L, 'guess.lose', { n: current.n }) : t(L, 'ttt.ended') });
      }
      if (current) return sock.sendMessage(from, { text: t(L, 'ttt.already', { p }).replace(`${p}ttt end`, `${p}${current.type === 'ttt' ? 'ttt' : current.type} end`) });
      const g = { type: 'guess', lang: L, n: 1 + Math.floor(Math.random() * 100), tries: 7, used: 0 };
      setGame(sessionId, from, g);
      return sock.sendMessage(from, { text: t(L, 'guess.start', { tries: g.tries }) });
    },
  });

  register({
    name: 'mathquiz',
    aliases: ['maths', 'quizmath', 'calcul'],
    category: 'GAMES',
    description: 'Fast math challenge — .mathquiz [easy|medium|hard], first correct answer wins',
    async execute({ sock, from, msg, args, prefix, sessionId }) {
      const L = langOf(msg, sessionId);
      const p = P(prefix);
      const current = getGame(sessionId, from);
      if (endWords.includes((args[0] || '').toLowerCase())) {
        if (!current) return sock.sendMessage(from, { text: t(L, 'ttt.none') });
        endGame(sessionId, from);
        return sock.sendMessage(from, { text: t(L, 'ttt.ended') });
      }
      if (current) return sock.sendMessage(from, { text: t(L, 'ttt.already', { p }).replace(`${p}ttt end`, `${p}${current.type === 'ttt' ? 'ttt' : current.type} end`) });
      const level = ['easy', 'medium', 'hard'].includes((args[0] || '').toLowerCase()) ? args[0].toLowerCase() : 'medium';
      const sec = level === 'hard' ? 45 : level === 'medium' ? 30 : 20;
      const { q, a } = makeMathQuestion(level);
      const g = { type: 'math', lang: L, q, a };
      g.timer = setTimeout(() => {
        const still = games.get(gameKey(sessionId, from));
        if (still === g) {
          games.delete(gameKey(sessionId, from));
          sock.sendMessage(from, { text: t(L, 'math.timeout', { q, a }) }).catch(() => {});
        }
      }, sec * 1000);
      setGame(sessionId, from, g);
      return sock.sendMessage(from, { text: t(L, 'math.question', { level, q, sec }) });
    },
  });

  register({
    name: 'endgame',
    aliases: ['stopgame'],
    category: 'GAMES',
    description: 'Stop the game running in this chat',
    async execute({ sock, from, msg, sessionId }) {
      const L = langOf(msg, sessionId);
      if (!getGame(sessionId, from)) return sock.sendMessage(from, { text: t(L, 'ttt.none') });
      endGame(sessionId, from);
      return sock.sendMessage(from, { text: t(L, 'ttt.ended') });
    },
  });

  register({
    name: 'rps',
    aliases: ['rockpaperscissors', 'pfc', 'chifoumi'],
    category: 'GAMES',
    description: 'Rock / paper / scissors against the bot',
    async execute({ sock, from, msg, args, prefix, sessionId }) {
      const L = langOf(msg, sessionId);
      const map = {
        rock: 'rock', r: 'rock', pierre: 'rock', piedra: 'rock', pedra: 'rock', stein: 'rock', 'wòch': 'rock', woch: 'rock', 'حجر': 'rock', '✊': 'rock',
        paper: 'paper', p: 'paper', papier: 'paper', papel: 'paper', papye: 'paper', 'ورقة': 'paper', '✋': 'paper',
        scissors: 'scissors', s: 'scissors', ciseaux: 'scissors', tijera: 'scissors', tijeras: 'scissors', tesoura: 'scissors', schere: 'scissors', sizo: 'scissors', 'مقص': 'scissors', '✌️': 'scissors',
      };
      const you = map[(args[0] || '').toLowerCase()];
      if (!you) return sock.sendMessage(from, { text: t(L, 'rps.usage', { p: P(prefix) }) });
      const bot = rand(['rock', 'paper', 'scissors']);
      const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
      const verdict = you === bot ? 'rps.draw' : beats[you] === bot ? 'rps.win' : 'rps.lose';
      return sock.sendMessage(from, { text: t(L, 'rps.result', { you: t(L, `rps.${you}`), bot: t(L, `rps.${bot}`), verdict: t(L, verdict) }) }, { quoted: msg });
    },
  });

  register({
    name: 'slot',
    aliases: ['slots', 'casino'],
    category: 'GAMES',
    description: 'Spin the slot machine 🎰',
    async execute({ sock, from, msg, sessionId }) {
      const L = langOf(msg, sessionId);
      const symbols = ['🍒', '🍋', '🍇', '🍉', '⭐', '💎', '7️⃣'];
      const r = [rand(symbols), rand(symbols), rand(symbols)];
      const uniq = new Set(r).size;
      const verdict = uniq === 1 ? 'slot.jackpot' : uniq === 2 ? 'slot.pair' : 'slot.lose';
      return sock.sendMessage(from, { text: t(L, 'slot.result', { r: r.join(' ┃ '), verdict: t(L, verdict) }) }, { quoted: msg });
    },
  });

  // ------------------------------------------------------------- FUN / TOOLS
  register({
    name: '8ball',
    aliases: ['magic8', 'boule'],
    category: 'FUN',
    description: 'Ask the magic 8-ball a yes/no question',
    async execute({ sock, from, msg, args, prefix, sessionId }) {
      const L = langOf(msg, sessionId);
      if (!args.length) return sock.sendMessage(from, { text: t(L, '8ball.usage', { p: P(prefix) }) });
      const answer = rand(t(L, '8ball.answers').split('|'));
      return sock.sendMessage(from, { text: `🎱 *${args.join(' ')}*\n\n${answer}` }, { quoted: msg });
    },
  });

  register({
    name: 'ship',
    aliases: ['love', 'lovetest', 'match'],
    category: 'FUN',
    description: 'Love compatibility between two people',
    async execute({ sock, from, msg, prefix, sessionId, sender }) {
      const L = langOf(msg, sessionId);
      const ctxInfo = getContextInfo(msg.message) || {};
      const mentioned = [...(ctxInfo.mentionedJid || [])];
      if (ctxInfo.quotedMessage && ctxInfo.participant) mentioned.push(ctxInfo.participant);
      let a; let b;
      if (mentioned.length >= 2) [a, b] = mentioned;
      else if (mentioned.length === 1) { a = sender; b = mentioned[0]; } else return sock.sendMessage(from, { text: t(L, 'ship.usage', { p: P(prefix) }) });
      // Deterministic for the same pair (so it can't be re-rolled).
      const pair = [bareNumber(a), bareNumber(b)].sort().join('|');
      const pct = parseInt(crypto.createHash('md5').update(pair).digest('hex').slice(0, 8), 16) % 101;
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      const verdict = t(L, pct < 30 ? 'ship.v0' : pct < 60 ? 'ship.v1' : pct < 85 ? 'ship.v2' : 'ship.v3');
      return sock.sendMessage(from, { text: t(L, 'ship.result', { a: tag(a), b: tag(b), bar, pct, verdict }), mentions: [a, b] });
    },
  });

  register({
    name: 'poll',
    aliases: ['vote', 'sondage'],
    category: 'TOOLS',
    description: 'Create a WhatsApp poll — .poll Question | opt1 | opt2',
    async execute({ sock, from, msg, args, prefix, sessionId }) {
      const L = langOf(msg, sessionId);
      const parts = args.join(' ').split('|').map((s) => s.trim()).filter(Boolean);
      const [name, ...values] = parts;
      if (!name || values.length < 2 || values.length > 12) return sock.sendMessage(from, { text: t(L, 'poll.usage', { p: P(prefix) }) });
      return sock.sendMessage(from, { poll: { name, values: [...new Set(values)], selectableCount: 1 } });
    },
  });

  register({
    name: 'remind',
    aliases: ['reminder', 'rappel', 'rapel'],
    category: 'TOOLS',
    description: 'Reminder — .remind 10m drink water (s/m/h, max 24h)',
    async execute({ sock, from, msg, args, prefix, sessionId, sender }) {
      const L = langOf(msg, sessionId);
      const m = (args[0] || '').toLowerCase().match(/^(\d+)(s|m|h|min)$/);
      const text = args.slice(1).join(' ').trim();
      if (!m || !text) return sock.sendMessage(from, { text: t(L, 'remind.usage', { p: P(prefix) }) });
      const mult = { s: 1000, m: 60000, min: 60000, h: 3600000 }[m[2]];
      const ms = Number(m[1]) * mult;
      if (ms < 5000 || ms > 24 * 3600000) return sock.sendMessage(from, { text: t(L, 'remind.usage', { p: P(prefix) }) });
      setTimeout(() => {
        sock.sendMessage(from, { text: t(L, 'remind.fire', { user: bareNumber(sender), text }), mentions: [sender] }).catch(() => {});
      }, ms).unref?.();
      return sock.sendMessage(from, { text: t(L, 'remind.set', { time: fmtDuration(ms) }) }, { quoted: msg });
    },
  });

  register({
    name: 'afk',
    aliases: ['away'],
    category: 'OWNER',
    description: 'AFK mode: auto-tell people who DM/tag you that you are away — .afk [reason] / .afk off',
    async execute({ sock, from, msg, args, sessionId, isOwner }) {
      const { getGlobalSetting, setGlobalSetting } = require('../store');
      const L = langOf(msg, sessionId);
      if (!isOwner) return sock.sendMessage(from, { text: t(L, 'common.ownerOnly') });
      const sub = (args[0] || '').toLowerCase();
      const current = getGlobalSetting(sessionId, 'afk');
      if (['off', 'back', 'stop'].includes(sub)) {
        setGlobalSetting(sessionId, 'afk', null);
        return sock.sendMessage(from, { text: t(L, 'afk.back', { time: current ? fmtDuration(Date.now() - current.since) : '0s' }) });
      }
      const reason = args.join(' ').trim();
      setGlobalSetting(sessionId, 'afk', { since: Date.now(), reason });
      afkNotified.clear();
      return sock.sendMessage(from, { text: t(L, 'afk.set', { reason: reason ? ` (${reason})` : '' }) });
    },
  });

  register({
    name: 'genpass',
    aliases: ['password', 'passgen', 'mdp'],
    category: 'TOOLS',
    description: 'Generate a strong random password — .genpass [length]',
    async execute({ sock, from, msg, args, prefix, sessionId }) {
      const L = langOf(msg, sessionId);
      const len = args[0] ? Number(args[0]) : 16;
      if (!Number.isInteger(len) || len < 8 || len > 64) return sock.sendMessage(from, { text: t(L, 'genpass.usage', { p: P(prefix) }) });
      const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?-_=+'];
      const all = sets.join('');
      const chars = sets.map((s) => s[crypto.randomInt(s.length)]);
      while (chars.length < len) chars.push(all[crypto.randomInt(all.length)]);
      for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      return sock.sendMessage(from, { text: t(L, 'genpass.result', { len, pass: '```' + chars.join('') + '```' }) }, { quoted: msg });
    },
  });
}

module.exports = {
  install,
  handlePlainText,
  _internal: { pendingPlays, lastPlayByUser, games, renderBoard, winnerOf, bestMove, makeMathQuestion, getGame, endGame, senderNumber },
};
