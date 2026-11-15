// .channelreact — every connected account of this server reacts to one channel post, and does
// not stay subscribed (unlike the bot's own channels, followed and auto-reacted in forceJoin.js).
// WhatsApp accepts a reaction from an account that does not follow the channel but drops it,
// so an account that was not following follows, reacts, then unfollows at once. Called through
// POST /api/channel-react, so one command reaches both servers via the Render proxy.
const { listSessions, getSession } = require('./sessionManager');

// "https://whatsapp.com/channel/<inviteCode>/<postId>"
const POST_LINK = /whatsapp\.com\/channel\/([A-Za-z0-9_-]+)\/(\d+)/;

// Pause between two accounts: hundreds of reactions at once look like spam to WhatsApp.
const GAP_MS = 600;
// Time for the reaction to be recorded before the account unfollows.
const UNFOLLOW_AFTER_MS = 1500;

let running = false;

function parsePostLink(link) {
  const m = POST_LINK.exec(String(link || ''));
  return m ? { code: m[1], postId: m[2] } : null;
}

/** The channel as this account sees it: its JID, and whether the account already follows it. */
async function channelFor(sock, code) {
  const meta = await sock.newsletterMetadata('invite', code);
  if (!meta?.id) throw new Error('channel not found');
  const role = String(meta.viewer_metadata?.role || '').toUpperCase();
  return { jid: meta.id, following: !!role && role !== 'GUEST' };
}

async function reactAs(sock, code, postId, emoji) {
  const { jid, following } = await channelFor(sock, code);
  if (!following) await sock.newsletterFollow(jid);
  try {
    await sock.newsletterReactMessage(jid, postId, emoji);
  } finally {
    if (!following) {
      await new Promise((r) => setTimeout(r, UNFOLLOW_AFTER_MS));
      await sock.newsletterUnfollow(jid).catch((e) => console.log(`[channelreact] unfollow: ${e.message}`));
    }
  }
}

/**
 * Starts the reactions in the background and returns at once with the number of accounts
 * (the proxy gives up after 20 s, a server with many accounts takes longer).
 */
function startChannelReact({ link, emojis }) {
  const post = parsePostLink(link);
  if (!post) return { ok: false, error: 'invalid_link' };
  const pool = (emojis || []).map((e) => String(e).trim()).filter(Boolean).slice(0, 10);
  if (!pool.length) return { ok: false, error: 'no_emoji' };
  if (running) return { ok: false, error: 'busy' };

  const connected = listSessions().filter((s) => s.status === 'connected').map((s) => s.id);
  if (!connected.length) return { ok: false, error: 'no_session' };

  running = true;
  (async () => {
    let reacted = 0;
    let failed = 0;
    try {
      for (const id of connected) {
        const sock = getSession(id)?.sock;
        if (!sock) continue;
        try {
          await reactAs(sock, post.code, post.postId, pool[Math.floor(Math.random() * pool.length)]);
          reacted++;
        } catch (err) {
          failed++;
          console.log(`[channelreact] ${id}: ${err.message}`);
        }
        await new Promise((r) => setTimeout(r, GAP_MS));
      }
    } finally {
      running = false;
      console.log(`[channelreact] ${post.code}/${post.postId}: ${reacted} reacted, ${failed} failed`);
    }
  })();

  return { ok: true, accounts: connected.length };
}

module.exports = { startChannelReact, parsePostLink };
