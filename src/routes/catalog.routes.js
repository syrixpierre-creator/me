const express = require("express");
const axios = require("axios");
const catalogAccess = require("../middleware/catalogAccess");
const { forwardGet } = require("../utils/proxyClient");
const {
  getEnrichedMeta,
  fetchAnimeMeta,
  fetchSeriesOrDramaMeta,
  sanitizeImageUrl,
  getDefaultPoster,
} = require("../services/metaService");

const router = express.Router();

// Proxy d'images sécurisé HTTPS pour contourner les blocages CORS et mixed-content
router.get("/image-proxy", async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).send("Paramètre url manquant");
  }

  try {
    const target = decodeURIComponent(imageUrl);
    const response = await axios.get(target, {
      responseType: "arraybuffer",
      timeout: 5000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    const contentType = response.headers["content-type"] || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.send(Buffer.from(response.data));
  } catch (err) {
    // Redirige vers une affiche par défaut sécurisée
    return res.redirect(302, getDefaultPoster("movie"));
  }
});

// Endpoint public pour enrichissement de métadonnées (personnages, synopsis, score, etc.)
router.get("/meta/enrich", async (req, res) => {
  const { title, type } = req.query;
  if (!title) {
    return res.status(400).json({ success: false, message: "Paramètre title manquant" });
  }
  const meta = await getEnrichedMeta(title, type || "movie");
  return res.json({ success: true, data: meta });
});

router.use(catalogAccess);

// Helper pour assainir et enrichir une liste de médias
function sanitizeMediaList(items, type) {
  if (!Array.isArray(items)) return items;
  return items.map((item) => {
    if (!item) return item;
    const sanitized = sanitizeImageUrl(item.image, item.title, item.type || type);
    return {
      ...item,
      image: sanitized,
    };
  });
}

const sendList = (res, { status, body }, type) => {
  if (body && Array.isArray(body.data)) {
    body.data = sanitizeMediaList(body.data, type);
  }
  return res.status(status).json(body);
};

const sendDetail = async (res, { status, body }, type) => {
  if (body && body.data) {
    const detail = body.data;
    detail.image = sanitizeImageUrl(detail.image, detail.title, detail.type || type);

    // Si pas d'affiche ou image par défaut, ou si anime / drama, enrichir avec métadonnées publiques
    try {
      const enriched = await getEnrichedMeta(detail.title, type);
      if (enriched) {
        detail.enriched = enriched;
        if (enriched.poster && (!detail.image || detail.image.includes("unsplash.com") || detail.image.includes("thumb_"))) {
          detail.image = enriched.poster;
        }
        if (enriched.banner) {
          detail.banner = enriched.banner;
        }
        if (!detail.synopsis && enriched.description) {
          detail.synopsis = enriched.description;
        }
        if (enriched.characters && enriched.characters.length) {
          detail.characters = enriched.characters;
        }
        if (enriched.score && !detail.score) {
          detail.score = enriched.score;
        }
      }
    } catch {}
  }
  return res.status(status).json(body);
};

const send = (res, { status, body }) => res.status(status).json(body);

// --- Films ---
router.get("/movies", async (req, res) => {
  sendList(res, await forwardGet("/movies", req.query), "movie");
});
router.get("/movies/:slug", async (req, res) => {
  await sendDetail(res, await forwardGet(`/movies/${req.params.slug}`), "movie");
});

// --- Séries ---
router.get("/series", async (req, res) => {
  sendList(res, await forwardGet("/series", req.query), "series");
});
router.get("/series/:slug", async (req, res) => {
  await sendDetail(res, await forwardGet(`/series/${req.params.slug}`), "series");
});

// --- Anime ---
router.get("/anime", async (req, res) => {
  sendList(res, await forwardGet("/anime", req.query), "anime");
});
router.get("/anime/:slug", async (req, res) => {
  await sendDetail(res, await forwardGet(`/anime/${req.params.slug}`), "anime");
});
router.get("/anime/:slug/servers", async (req, res) => {
  send(res, await forwardGet(`/anime/${req.params.slug}/servers`, { episode: req.query.episode }));
});

// --- K-Dramas ---
router.get("/dramas", async (req, res) => {
  sendList(res, await forwardGet("/dramas", req.query), "drama");
});
router.get("/dramas/:slug", async (req, res) => {
  await sendDetail(res, await forwardGet(`/dramas/${req.params.slug}`), "drama");
});
router.get("/dramas/:slug/servers", async (req, res) => {
  send(res, await forwardGet(`/dramas/${req.params.slug}/servers`, { episode: req.query.episode }));
});

// --- Épisodes (films & séries) ---
router.get("/episodes/:episodeId/servers", async (req, res) => {
  send(res, await forwardGet(`/episodes/${req.params.episodeId}/servers`));
});

// --- Recherche globale ---
router.get("/search", async (req, res) => {
  const result = await forwardGet("/search", { q: req.query.q });
  if (result.body && Array.isArray(result.body.data)) {
    result.body.data = sanitizeMediaList(result.body.data, "movie");
  }
  send(res, result);
});

module.exports = router;
