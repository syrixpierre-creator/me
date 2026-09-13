const express = require("express");
const requireAuth = require("../middleware/auth");
const generateApiKey = require("../utils/generateApiKey");
const { normalizeDomain } = require("../utils/extractDomain");

const router = express.Router();
router.use(requireAuth);

// GET /api/v1/profile
router.get("/", (req, res) => {
  res.json({ success: true, data: req.user.toSafeJSON() });
});

// PATCH /api/v1/profile — modifier username/profileImage/theme
router.patch("/", async (req, res) => {
  const { username, profileImage, theme } = req.body;
  if (username) req.user.username = username;
  if (profileImage !== undefined) req.user.profileImage = profileImage;
  if (theme && ["dark", "light"].includes(theme)) req.user.theme = theme;

  await req.user.save();
  res.json({ success: true, data: req.user.toSafeJSON() });
});

// POST /api/v1/profile/api-key
// Génère manuellement une clé API. `domain` est optionnel : si fourni, il
// est enregistré tout de suite (ex: "movie.syrix.app", repris du .env du
// site du dev) ; sinon la clé sera auto-verrouillée sur le domaine du
// premier appel réel (voir middleware/apiKeyAuth.js).
router.post("/api-key", async (req, res) => {
  if (req.user.apiKey) {
    return res.status(409).json({
      success: false,
      error: {
        code: "api_key_exists",
        message: "Une clé API existe déjà. Révoquez-la avant d'en générer une nouvelle.",
      },
    });
  }

  const { domain } = req.body || {};

  req.user.apiKey = generateApiKey();
  req.user.apiKeyDomain = domain ? normalizeDomain(domain) : null;
  req.user.apiKeyCreatedAt = new Date();
  await req.user.save();

  res.status(201).json({
    success: true,
    data: {
      apiKey: req.user.apiKey,
      apiKeyDomain: req.user.apiKeyDomain,
      note: req.user.apiKeyDomain
        ? `Clé verrouillée sur le domaine "${req.user.apiKeyDomain}".`
        : "Aucun domaine renseigné — la clé se verrouillera automatiquement sur le domaine du premier appel.",
    },
  });
});

// PATCH /api/v1/profile/api-key/domain — (re)définir manuellement le domaine autorisé
router.patch("/api-key/domain", async (req, res) => {
  if (!req.user.apiKey) {
    return res.status(400).json({
      success: false,
      error: { code: "no_api_key", message: "Générez d'abord une clé API." },
    });
  }
  const { domain } = req.body || {};
  if (!domain) {
    return res.status(400).json({
      success: false,
      error: { code: "missing_domain", message: "Le champ 'domain' est requis." },
    });
  }

  req.user.apiKeyDomain = normalizeDomain(domain);
  await req.user.save();
  res.json({ success: true, data: { apiKeyDomain: req.user.apiKeyDomain } });
});

// DELETE /api/v1/profile/api-key — révoquer la clé
router.delete("/api-key", async (req, res) => {
  req.user.apiKey = null;
  req.user.apiKeyDomain = null;
  req.user.apiKeyCreatedAt = null;
  await req.user.save();
  res.json({ success: true, data: { message: "Clé API révoquée." } });
});

module.exports = router;
