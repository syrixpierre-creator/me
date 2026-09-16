// Small JID helpers shared across bot.js / moderation.js / commands/index.js.
// Kept in their own file (instead of living inside commands/index.js) so
// bot.js can use them too without creating a circular require.

function bareNumber(jid = '') {
  return (jid || '').split('@')[0].split(':')[0];
}

// Resolves the best-guess *real phone number* for whoever sent `msg`.
//
// WhatsApp's LID privacy feature means the "primary" id on a message key
// (msg.key.remoteJid in a DM, msg.key.participant in a group) can be an
// opaque @lid identifier instead of a real number, depending on the chat's
// addressingMode. When that happens, Baileys exposes the matching
// phone-number JID on the sibling *Alt field (remoteJidAlt / participantAlt).
// Blindly stripping the domain off whichever field happens to be primary
// (the old behavior) can silently return a LID's digits instead of a phone
// number — e.g. breaking ".pair" self-service checks for users whose chat
// is addressed by LID.
function resolveSenderPhoneNumber(msg) {
  const key = (msg && msg.key) || {};
  const candidates = key.participant
    ? [key.participant, key.participantAlt]
    : [key.remoteJid, key.remoteJidAlt];
  const pn = candidates.find((jid) => jid && jid.endsWith('@s.whatsapp.net'));
  return bareNumber(pn || candidates[0] || '');
}

// Decides whether a given participant JID (from meta.participants, a mention,
// etc.) IS the bot/linked account itself.
//
// Just comparing bareNumber(p.id) === bareNumber(sock.user.id) (the old way)
// breaks under WhatsApp's LID addressing mode: in a LID-addressed group, the
// bot's own entry in meta.participants can come back as an @lid id whose bare
// digits are completely different from the bot's real phone number, so the
// bot no longer recognizes itself and mass-admin commands (.promoteall,
// .demoteall, .kickadmin) end up targeting the bot/owner as if it were any
// other admin. sessionId is the sanitized phone number the account was
// *paired* with (see sessionManager.js), so it's ground truth regardless of
// which addressing mode a given group uses — checked first, then sock.user.id
// and sock.user.lid (when Baileys exposes it) as extra safety nets.
function isBotIdentity(jid, { sock, sessionId } = {}) {
  const num = bareNumber(jid || '');
  if (!num) return false;
  if (sessionId && num === bareNumber(sessionId)) return true;
  const botId = sock?.user?.id;
  if (botId && num === bareNumber(botId)) return true;
  const botLid = sock?.user?.lid;
  if (botLid && num === bareNumber(botLid)) return true;
  return false;
}

module.exports = { bareNumber, resolveSenderPhoneNumber, isBotIdentity };
