const express = require("express");
const catalogAccess = require("../middleware/catalogAccess");
const { forwardGet } = require("../utils/proxyClient");

const router = express.Router();
router.use(catalogAccess);

const send = (res, { status, body }) => res.status(status).json(body);

// --- Films ---
router.get("/movies", async (req, res) => {
  send(res, await forwardGet("/movies", req.query));
});
router.get("/movies/:slug", async (req, res) => {
  send(res, await forwardGet(`/movies/${req.params.slug}`));
});

// --- Séries ---
router.get("/series", async (req, res) => {
  send(res, await forwardGet("/series", req.query));
});
router.get("/series/:slug", async (req, res) => {
  send(res, await forwardGet(`/series/${req.params.slug}`));
});

// --- Anime ---
router.get("/anime", async (req, res) => {
  send(res, await forwardGet("/anime", req.query));
});
router.get("/anime/:slug", async (req, res) => {
  send(res, await forwardGet(`/anime/${req.params.slug}`));
});
router.get("/anime/:slug/servers", async (req, res) => {
  send(res, await forwardGet(`/anime/${req.params.slug}/servers`, { episode: req.query.episode }));
});

// --- K-Dramas ---
router.get("/dramas", async (req, res) => {
  send(res, await forwardGet("/dramas", req.query));
});
router.get("/dramas/:slug", async (req, res) => {
  send(res, await forwardGet(`/dramas/${req.params.slug}`));
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
  send(res, await forwardGet("/search", { q: req.query.q }));
});

module.exports = router;
