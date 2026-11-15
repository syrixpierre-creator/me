// .channelreact — every connected account of this server reacts to one channel post,
// without following the channel (unlike the bot's own channels, which are followed and
// auto-reacted in forceJoin.js). Called through POST /api/channel-react, so one command
// reaches both servers via the Render proxy.
const { listSessions, getSession } = require('./sessionManager');

// "https://whatsapp.com/channel/<inviteCode>/<postId>"
const POST_LINK = /whatsapp\.com\/channel\/([A-Za-z0-9_-]+)\/(\d+)/;

// Channel invite code -> newsletter JID, resolved once per server.
const channelJids = new Map();

// Pause between two accounts: hundreds of reactions at once look like spam to WhatsApp.
const GAP_MS = 400;

let running = false;

function parsePostLink(link) {
  const m = POST_LINK.exec(String(link || ''));
  return m ? { code: m[1], postId: m[2] } : null;
}

async function resolveChannel(sock, code) {
  if (channelJids.has(code)) return channelJids.get(code);
  const meta = await sock.newsletterMetadata('invite', code);
  const jid = meta?.id;
  if (!jid) throw new Error('channel not found');
  channelJids.set(code, jid);
  return jid;
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
    let jid = null;
    try {
      for (const id of connected) {
        const sock = getSession(id)?.sock;
        if (!sock) continue;
        try {
          jid = jid || (await resolveChannel(sock, post.code));
          const emoji = pool[Math.floor(Math.random() * pool.length)];
          await sock.newsletterReactMessage(jid, post.postId, emoji);
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
