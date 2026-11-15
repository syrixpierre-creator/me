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

// WhatsApp's query ids for "channel metadata". The library the bot uses sends one that
// WhatsApp answers with nothing for an invite code ("channel not found"), so known ids are
// tried in turn and the one that works is remembered.
const METADATA_QUERY_IDS = ['6563316087068696', '24250201037901610', '26099060629688646', '6895563180530100', '25976052865358570'];
let workingQueryId = null;

async function mexMetadata(sock, code, queryId) {
  const res = await sock.query({
    tag: 'iq',
    attrs: { id: sock.generateMessageTag(), type: 'get', to: 's.whatsapp.net', xmlns: 'w:mex' },
    content: [{
      tag: 'query',
      attrs: { query_id: queryId },
      content: Buffer.from(JSON.stringify({ variables: { fetch_creation_time: true, fetch_full_image: false, fetch_viewer_metadata: true, input: { key: code, type: 'INVITE' } } }), 'utf-8'),
    }],
  });
  const child = (Array.isArray(res?.content) ? res.content : []).find((n) => n.tag === 'result');
  if (!child?.content) return null;
  const data = JSON.parse(Buffer.from(child.content).toString('utf-8').replace(/^\x00+/, '').trim());
  const meta = data?.data?.xwa2_newsletter;
  return meta?.id ? meta : null;
}

/** The channel as this account sees it: its JID, and whether the account already follows it. */
async function channelFor(sock, code) {
  let meta = null;
  if (!workingQueryId) meta = await sock.newsletterMetadata('invite', code).catch(() => null);
  if (!meta?.id) {
    for (const id of workingQueryId ? [workingQueryId] : METADATA_QUERY_IDS) {
      meta = await mexMetadata(sock, code, id).catch(() => null);
      if (meta?.id) {
        if (workingQueryId !== id) console.log(`[channelreact] channel metadata works with query ${id}`);
        workingQueryId = id;
        break;
      }
    }
  }
  if (!meta?.id) throw new Error('channel not found');
  const role = String(meta.viewer_metadata?.role || '').toUpperCase();
  return { jid: meta.id, following: !!role && role !== 'GUEST' };
}

// The library reads follow/unfollow answers at an outdated path: WhatsApp did the action but the
// call throws "unexpected response structure". That case counts as done.
async function done(promise) {
  try {
    await promise;
  } catch (e) {
    if (!/unexpected response structure/i.test(e.message || '')) throw e;
  }
}

async function reactAs(sock, code, postId, emoji) {
  const { jid, following } = await channelFor(sock, code);
  if (!following) await done(sock.newsletterFollow(jid));
  try {
    await sock.newsletterReactMessage(jid, postId, emoji);
  } finally {
    if (!following) {
      await new Promise((r) => setTimeout(r, UNFOLLOW_AFTER_MS));
      await done(sock.newsletterUnfollow(jid)).catch((e) => console.log(`[channelreact] unfollow: ${e.message}`));
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
