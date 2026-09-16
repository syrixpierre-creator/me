const {
  getGroupSettings,
  cacheMessage,
  getCachedMessage,
  getGlobalSetting,
  getMutedUser,
  bumpMutedCount,
  unmuteUser,
  addWarn,
  resetWarn,
  WARN_LIMIT,
} = require('./store');
const { CHANNEL_JID, CHANNEL_NAME } = require('./config');
const { isBotIdentity } = require('./jidUtils');

const REACT_EMOJIS = ['😀', '🔥', '👍', '💯', '😎', '✅', '⚡', '🎯', '😄', '👏', '🙌', '🚀'];

// Same "Forwarded many times from CHANNEL_NAME" branding used on owner/
// GROUP-ADMIN commands (see commands/index.js's channelContext()) — kept as
// its own tiny copy here instead of importing from ./commands, which would
// create a circular require (commands/index.js already requires this file).
function brandedContext() {
  if (!CHANNEL_JID) return {};
  return {
    contextInfo: {
      isForwarded: true,
      forwardingScore: 999,
      forwardedNewsletterMessageInfo: {
        newsletterJid: CHANNEL_JID,
        newsletterName: CHANNEL_NAME,
        serverMessageId: 143,
      },
    },
  };
}

// Tries the given JID's own profile picture first; if they don't have one
// (or it's private), falls back to the bot's own profile picture so the
// welcome/goodbye card always has an image instead of sometimes being
// text-only.
async function resolveWelcomeImage(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    if (url) return { url };
  } catch {
    // no photo / private — fall through to the bot's own picture
  }
  try {
    const botJid = sock.user?.id;
    if (botJid) {
      const url = await sock.profilePictureUrl(botJid, 'image');
      if (url) return { url };
    }
  } catch {
    // bot has no photo either — caller falls back to a text-only message
  }
  return null;
}

function extractText(message) {
  if (!message) return '';
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    ''
  );
}

function bareNumber(jid = '') {
  return jid.split('@')[0].split(':')[0];
}

// --- Antispam: in-memory per-group+sender recent-message timestamps ---
// Doesn't need to survive a restart, so it's not persisted like the settings
// stores above.
const SPAM_WINDOW_MS = 5000; // "minimum 5 second" window
const SPAM_LIMIT = 3; // more than 3 messages inside the window triggers the action

function bumpSpamCount(groupJid, sender) {
  const key = `${groupJid}:${sender}`;
  const now = Date.now();
  const hits = (spamTracker.get(key) || []).filter((t) => now - t < SPAM_WINDOW_MS);
  hits.push(now);
  spamTracker.set(key, hits);
  return hits.length;
}
function clearSpamCount(groupJid, sender) {
  spamTracker.delete(`${groupJid}:${sender}`);
}
const spamTracker = new Map();

// --- Antibot: heuristics for recognizing a *rival* WhatsApp bot's messages ---
// WhatsApp doesn't expose a real "this account is a bot" flag, so this leans
// on the same tells described for this feature: a bot's own command menu
// (several ".command"-style lines in a row) or a templated welcome/goodbye
// card. Anything carrying INCONNU XD's own branding is treated as another
// INCONNU XD instance and left alone — only foreign bot signatures get acted on.
const MENU_LIST_RE = /(^|\n)\s*[.!/#$%^&*-][a-z0-9_]{1,20}\b.*(\n\s*[.!/#$%^&*-][a-z0-9_]{1,20}\b.*){2,}/i;
const WELCOME_CARD_RE = /(welcome|goodbye|bienvenue|au revoir)[\s\S]{0,80}(group|groupe)[\s\S]{0,80}(member|membre)/i;

function looksLikeRivalBotMessage(msg, text) {
  if (!text) return false;
  if (/inconnu\s*xd/i.test(text)) return false; // same family — always allowed
  if (MENU_LIST_RE.test(text)) return true;
  if (WELCOME_CARD_RE.test(text)) return true;
  // Many self-bots (including this one — see brandedContext() above) stamp
  // their messages with a fake "forwarded 999 times" badge, a technical
  // fingerprint real human messages essentially never carry.
  const ctxInfo =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo;
  if (ctxInfo?.isForwarded && (ctxInfo.forwardingScore || 0) >= 999) return true;
  return false;
}

async function isSenderAdmin(sock, jid, sender) {
  try {
    const meta = await sock.groupMetadata(jid);
    const p = meta.participants.find((x) => bareNumber(x.id) === bareNumber(sender));
    return !!p && (p.admin === 'admin' || p.admin === 'superadmin');
  } catch {
    return false;
  }
}

/**
 * Runs on every incoming message alongside the command handler. Unlike bot.js,
 * this does not require a command prefix — it watches all group traffic for
 * deletions, edits, stickers, mass-mentions, and (optionally) reacts to it.
 */
const LINK_RE = /(https?:\/\/|www\.)\S+|\b[A-Za-z0-9-]+\.(com|net|org|io|me|link|gg|xyz|co|app|dev|tv|to|gl|be|ly)\b\S*/i;

async function handleModeration(sock, m, sessionId) {
  try {
    const msg = m.messages?.[0];
    if (!msg || !msg.message) return;
    // Skip history-sync replay (m.type === 'append') — only act on live messages,
    // otherwise a fresh connect floods reactions/deletes across old chat history.
    if (m.type && m.type !== 'notify') return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = msg.key.fromMe ? sock.user?.id || from : msg.key.participant || from;
    const proto = msg.message.protocolMessage;

    if (isGroup) {
      const settings = getGroupSettings(from);

      // --- Deleted-for-everyone message (REVOKE) ---
      if (proto && proto.type === 0) {
        if (settings.antidelete) {
          const cached = getCachedMessage(proto.key.id);
          if (cached && cached.jid === from) {
            await sock.sendMessage(from, {
              text:
                `🗑️ *Antidelete*\n` +
                `👤 @${bareNumber(cached.sender)} deleted:\n\n` +
                `${cached.text || '[media message]'}`,
              mentions: [cached.sender],
            });
          }
        }
        return;
      }

      // --- Edited message ---
      if (proto && proto.type === 14 && proto.editedMessage) {
        if (settings.antiedit) {
          const cached = getCachedMessage(proto.key.id);
          const newText = extractText(proto.editedMessage) || '[media]';
          if (cached && cached.jid === from) {
            await sock.sendMessage(from, {
              text:
                `✏️ *Antiedit*\n` +
                `👤 @${bareNumber(cached.sender)} edited a message:\n\n` +
                `*Before:* ${cached.text || '[media]'}\n` +
                `*After:* ${newText}`,
              mentions: [cached.sender],
            });
            cacheMessage(proto.key.id, { ...cached, text: newText });
          }
        }
        return;
      }

      // Cache real (non-protocol) messages so a later delete/edit has something to show.
      const text = extractText(msg.message);
      if (text || msg.message.imageMessage || msg.message.videoMessage || msg.message.stickerMessage) {
        cacheMessage(msg.key.id, { jid: from, sender, text, timestamp: Date.now() });
      }

      if (msg.key.fromMe) return; // never moderate the linked account's own messages

      // --- Per-user mute (.mute <number> <limit>) ---
      // Every message from a muted user is deleted on sight; once their count
      // reaches the configured limit they're auto-kicked and the mute clears.
      const mutedEntry = getMutedUser(from, sender);
      if (mutedEntry) {
        await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
        const updated = bumpMutedCount(from, sender);
        if (updated && updated.count >= updated.limit) {
          unmuteUser(from, sender);
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove');
            await sock.sendMessage(from, {
              text: `👢 @${bareNumber(sender)} was kicked — exceeded the muted message limit (${updated.limit}).`,
              mentions: [sender],
            });
          } catch (e) {
            console.error(`[moderation:${sessionId}] auto-kick failed:`, e.message);
          }
        }
        return;
      }

      // --- Antispam: more than 3 messages within 5s from the same sender ---
      if (settings.antispam) {
        const admin = await isSenderAdmin(sock, from, sender);
        if (!admin && !isBotIdentity(sender, { sock, sessionId })) {
          const count = bumpSpamCount(from, sender);
          if (count > SPAM_LIMIT) {
            clearSpamCount(from, sender);
            await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
            const action = settings.antispamAction || 'delete';
            if (action === 'kick') {
              try {
                await sock.groupParticipantsUpdate(from, [sender], 'remove');
                await sock.sendMessage(from, {
                  text: `🚫 *Antispam* — @${bareNumber(sender)} was kicked (${SPAM_LIMIT + 1}+ messages in ${SPAM_WINDOW_MS / 1000}s).`,
                  mentions: [sender],
                });
              } catch (e) {
                console.error(`[moderation:${sessionId}] antispam kick failed:`, e.message);
              }
            } else if (action === 'warn') {
              const { count: warnCount, limitReached } = addWarn(from, sender);
              if (limitReached) {
                resetWarn(from, sender);
                try {
                  await sock.groupParticipantsUpdate(from, [sender], 'remove');
                  await sock.sendMessage(from, {
                    text: `🚫 *Antispam* — @${bareNumber(sender)} was kicked (reached ${WARN_LIMIT} warnings).`,
                    mentions: [sender],
                  });
                } catch (e) {
                  console.error(`[moderation:${sessionId}] antispam warn-kick failed:`, e.message);
                }
              } else {
                await sock.sendMessage(from, {
                  text: `⚠️ *Antispam* — @${bareNumber(sender)} warned (${warnCount}/${WARN_LIMIT}) for sending messages too fast.`,
                  mentions: [sender],
                });
              }
            } else {
              await sock.sendMessage(from, {
                text: `🧹 *Antispam* — @${bareNumber(sender)}'s message was removed (sending too fast).`,
                mentions: [sender],
              });
            }
            return;
          }
        }
      }

      // --- Antibot: rival WhatsApp bots (other INCONNU XD instances are exempt) ---
      if (settings.antibot && !isBotIdentity(sender, { sock, sessionId }) && looksLikeRivalBotMessage(msg, text)) {
        await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
        const action = settings.antibotAction || 'kick';
        if (action === 'delete') {
          await sock.sendMessage(from, {
            text: `🤖 *Antibot* — removed a message from a rival bot (@${bareNumber(sender)}).`,
            mentions: [sender],
          });
        } else if (action === 'warn') {
          const { count: warnCount, limitReached } = addWarn(from, sender);
          if (limitReached) {
            resetWarn(from, sender);
            try {
              await sock.groupParticipantsUpdate(from, [sender], 'remove');
              await sock.sendMessage(from, {
                text: `🤖 *Antibot* — @${bareNumber(sender)} was kicked (rival bot, ${WARN_LIMIT} warnings reached).`,
                mentions: [sender],
              });
            } catch (e) {
              console.error(`[moderation:${sessionId}] antibot warn-kick failed:`, e.message);
            }
          } else {
            await sock.sendMessage(from, {
              text: `⚠️ *Antibot* — @${bareNumber(sender)} warned (${warnCount}/${WARN_LIMIT}) — looks like a rival bot.`,
              mentions: [sender],
            });
          }
        } else {
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove');
            await sock.sendMessage(from, {
              text: `🤖 *Antibot* — kicked @${bareNumber(sender)} (rival bot detected).`,
              mentions: [sender],
            });
          } catch (e) {
            console.error(`[moderation:${sessionId}] antibot kick failed:`, e.message);
          }
        }
        return;
      }

      // --- Antisticker ---
      if (settings.antisticker && msg.message.stickerMessage) {
        const admin = await isSenderAdmin(sock, from, sender);
        if (!admin) {
          await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
        }
        return;
      }

      // --- Antigif (GIF-playback videos, i.e. WhatsApp's "GIF" messages) ---
      if (settings.antigif && msg.message.videoMessage?.gifPlayback) {
        const admin = await isSenderAdmin(sock, from, sender);
        if (!admin) {
          await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
          await sock.sendMessage(from, {
            text: `🎬 @${bareNumber(sender)}'s GIF was removed.`,
            mentions: [sender],
            ...brandedContext(),
          });
          return;
        }
      }

      // --- Antigroupmention (mass @mention spam) ---
      if (settings.antigroupmention) {
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length >= 5) {
          const admin = await isSenderAdmin(sock, from, sender);
          if (!admin) {
            await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
            await sock.sendMessage(from, {
              text: `⚠️ @${bareNumber(sender)}'s mass-mention message was removed.`,
              mentions: [sender],
              ...brandedContext(),
            });
            return;
          }
        }
      }

      // --- Antilink (any URL, not just WhatsApp invite links) ---
      if (settings.antilink && LINK_RE.test(text)) {
        const admin = await isSenderAdmin(sock, from, sender);
        if (!admin) {
          await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
          await sock.sendMessage(from, {
            text: `🔗 @${bareNumber(sender)}'s message contained a link and was removed.`,
            mentions: [sender],
            ...brandedContext(),
          });
          return;
        }
      }
    }

    if (msg.key.fromMe) return; // never react to the linked account's own messages

    // --- Auto-react (owner-level toggle — applies in DMs and groups alike) ---
    if (getGlobalSetting(sessionId, 'autoreact')) {
      const emoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
      sock.sendMessage(from, { react: { text: emoji, key: msg.key } }).catch(() => {});
    }
  } catch (err) {
    console.error(`[moderation:${sessionId}] error:`, err.message);
  }
}

/**
 * Auto-rejects incoming voice/video calls to the linked account.
 */
function registerAnticall(sock, sessionId) {
  sock.ev.on('call', async (calls) => {
    if (!getGlobalSetting(sessionId, 'anticall')) return;
    for (const call of calls) {
      if (call.status !== 'offer') continue;
      try {
        await sock.rejectCall(call.id, call.from);
        console.log(`[session:${sessionId}] rejected call from ${call.from}`);
      } catch (err) {
        console.error(`[session:${sessionId}] anticall error:`, err.message);
      }
    }
  });
}

/**
 * Fires on every join/leave/promote/demote in every group the linked account
 * is in. Sends the group's configured welcome/goodbye message (if that toggle
 * is on) for each member who joined or left. Supports @user and @group
 * placeholders in the custom message set via .setwelcome / .setgoodbye.
 */
async function handleGroupParticipantsUpdate(sock, update, sessionId) {
  try {
    const { id: groupJid, participants, action } = update;
    if (action !== 'add' && action !== 'remove') return; // ignore promote/demote here

    const settings = getGroupSettings(groupJid);

    // --- Antinum: auto-kick anyone joining with a blocked calling code ---
    // (.antinum +55) — checked before the welcome message so a blocked
    // joiner never gets welcomed, just removed.
    let joiners = participants;
    if (action === 'add' && settings.antinumCodes && settings.antinumCodes.length) {
      const toKick = [];
      const kept = [];
      for (const participant of participants) {
        const jid = typeof participant === 'string' ? participant : participant?.id || participant?.jid;
        const num = bareNumber(jid || '');
        const blocked = settings.antinumCodes.some((code) => num.startsWith(code));
        if (blocked) toKick.push(jid);
        else kept.push(participant);
      }
      if (toKick.length) {
        try {
          await sock.groupParticipantsUpdate(groupJid, toKick, 'remove');
          await sock.sendMessage(groupJid, {
            text: `🚫 Antinum: auto-kicked ${toKick.length} joiner(s) with a blocked number code (@${toKick.map(bareNumber).join(', @')}).`,
            mentions: toKick,
          });
        } catch (e) {
          console.error(`[moderation:${sessionId}] antinum auto-kick failed:`, e.message);
        }
      }
      joiners = kept;
      if (!joiners.length) return; // nobody left to welcome
    }

    const enabled = action === 'add' ? settings.welcome : settings.goodbye;
    if (!enabled) return;

    let groupName = 'the group';
    let memberCount = null;
    let adminCount = null;
    try {
      const meta = await sock.groupMetadata(groupJid);
      groupName = meta.subject || groupName;
      memberCount = meta.participants.length;
      adminCount = meta.participants.filter((p) => p.admin === 'admin' || p.admin === 'superadmin').length;
    } catch {
      // fall back to the generic name above if metadata can't be fetched
    }

    const customTemplate = action === 'add' ? settings.welcomeMessage : settings.goodbyeMessage;
    const defaultTemplate =
      action === 'add'
        ? '╭───────────────⭓\n│ INCONNU XD V2\n╰───────────────⭓\n\n╭─ WELCOME\n│ • GROUP: @group\n│ • USER: @user\n│ • MEMBERS: @members\n│ • ADMIN: @admin\n│ • inconnuxdv2.vercel.app\n╰───────────────⭓'
        : '╭───────────────⭓\n│ INCONNU XD V2\n╰───────────────⭓\n\n╭─ GOODBYE\n│ • GROUP: @group\n│ • USER: @user\n│ • MEMBERS: @members\n│ • ADMIN: @admin\n│ • inconnuxdv2.vercel.app\n╰───────────────⭓';
    const template = customTemplate || defaultTemplate;

    for (const participant of joiners) {
      // participants can occasionally be objects (e.g. { id, lid }) rather than
      // a plain JID string depending on the Baileys version — normalize first,
      // otherwise @user/mentions silently resolve to nothing and the send below
      // throws, which used to be swallowed by an empty .catch(() => {}).
      const jid = typeof participant === 'string' ? participant : participant?.id || participant?.jid;
      if (!jid) continue;

      const text = template
        .replace(/@group/gi, groupName)
        .replace(/@members/gi, memberCount != null ? String(memberCount) : '—')
        .replace(/@admin/gi, adminCount != null ? String(adminCount) : '—')
        .replace(/@user/gi, `@${bareNumber(jid)}`);
      try {
        const image = await resolveWelcomeImage(sock, jid);
        if (image) {
          await sock.sendMessage(groupJid, {
            image,
            caption: text,
            mentions: [jid],
            ...brandedContext(),
          });
        } else {
          // Neither the member nor the bot has a usable profile picture —
          // fall back to a text-only card rather than failing the send.
          await sock.sendMessage(groupJid, { text, mentions: [jid], ...brandedContext() });
        }
      } catch (sendErr) {
        // Log instead of swallowing — a failed send here was previously silent,
        // making "welcome doesn't work" impossible to diagnose.
        console.error(`[moderation:${sessionId}] failed to send welcome/goodbye in ${groupJid}:`, sendErr.message);
      }
    }
  } catch (err) {
    console.error(`[moderation:${sessionId}] group-participants error:`, err.stack || err.message);
  }
}

module.exports = { handleModeration, registerAnticall, handleGroupParticipantsUpdate, isSenderAdmin };
