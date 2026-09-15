const express = require("express");
const bcrypt = require("bcryptjs");
const requireAuth = require("../middleware/auth");
const generateApiKey = require("../utils/generateApiKey");
const { normalizeDomain } = require("../utils/extractDomain");

const router = express.Router();
router.use(requireAuth);

// GET /api/v1/profile
router.get("/", (req, res) => {
  res.json({ success: true, data: req.user.toSafeJSON() });
});

// PATCH /api/v1/profile — modifier les informations et préférences
router.patch("/", async (req, res) => {
  const {
    username,
    bio,
    profileImage,
    theme,
    streamingQuality,
    autoplayNext,
    preferredLanguage,
    parentalPin,
    matureFilter,
  } = req.body;

  if (username && typeof username === "string") {
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 32) {
      return res.status(400).json({
        success: false,
        error: { code: "invalid_username", message: "Le pseudo doit contenir entre 3 et 32 caractères." },
      });
    }
    req.user.username = trimmed;
  }

  if (bio !== undefined && typeof bio === "string") {
    req.user.bio = bio.trim().slice(0, 200);
  }

  if (profileImage !== undefined) {
    req.user.profileImage = String(profileImage).trim();
  }

  if (theme && ["dark", "light"].includes(theme)) {
    req.user.theme = theme;
  }

  if (streamingQuality && ["auto", "4k", "1080p", "720p"].includes(streamingQuality)) {
    req.user.streamingQuality = streamingQuality;
  }

  if (autoplayNext !== undefined) {
    req.user.autoplayNext = !!autoplayNext;
  }

  if (preferredLanguage && ["fr", "vf", "vostfr", "vo", "en", "ja", "ko"].includes(preferredLanguage)) {
    req.user.preferredLanguage = preferredLanguage;
  }

  if (parentalPin !== undefined) {
    const pin = String(parentalPin).trim();
    if (pin === "" || /^\d{4}$/.test(pin)) {
      req.user.parentalPin = pin;
    } else {
      return res.status(400).json({
        success: false,
        error: { code: "invalid_pin", message: "Le code PIN doit comporter exactement 4 chiffres (ou être vide)." },
      });
    }
  }

  if (matureFilter !== undefined) {
    req.user.matureFilter = !!matureFilter;
  }

  await req.user.save();
  res.json({ success: true, data: req.user.toSafeJSON() });
});

// POST /api/v1/profile/avatar — Upload ou mise à jour directe d'avatar (Data URI ou URL)
router.post("/avatar", async (req, res) => {
  const image = req.body?.image || req.body?.avatarData || req.body?.profileImage;
  if (!image || typeof image !== "string") {
    return res.status(400).json({
      success: false,
      error: { code: "missing_image", message: "Aucune image fournie." },
    });
  }

  // Accepte les images Data-URI (base64) jusqu'à ~5Mo ou les URLs https sécurisées
  if (image.startsWith("data:image/") || image.startsWith("https://") || image.startsWith("/")) {
    req.user.profileImage = image;
    await req.user.save();
    return res.json({
      success: true,
      data: {
        profileImage: req.user.profileImage,
        user: req.user.toSafeJSON(),
        message: "Photo de profil mise à jour avec succès.",
      },
    });
  }

  return res.status(400).json({
    success: false,
    error: { code: "invalid_image_format", message: "Format d'image invalide (PNG, JPG, WebP ou URL HTTPS requis)." },
  });
});

// POST /api/v1/profile/change-password — Changer le mot de passe du compte
router.post("/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: { code: "missing_fields", message: "L'ancien mot de passe et le nouveau mot de passe sont requis." },
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: { code: "weak_password", message: "Le nouveau mot de passe doit comporter au moins 6 caractères." },
    });
  }

  const valid = await req.user.comparePassword(currentPassword);
  if (!valid) {
    return res.status(400).json({
      success: false,
      error: { code: "invalid_current_password", message: "L'ancien mot de passe est incorrect." },
    });
  }

  if (typeof req.user.schema !== "undefined" || !req.user.save) {
    req.user.password = newPassword; // Mongoose middleware va le hasher
  } else {
    req.user.password = await bcrypt.hash(newPassword, 10);
  }

  await req.user.save();
  res.json({ success: true, data: { message: "Mot de passe modifié avec succès." } });
});

// DELETE /api/v1/profile/history — Réinitialiser l'historique de visionnage
router.delete("/history", async (req, res) => {
  req.user.watchHistory = [];
  await req.user.save();
  res.json({ success: true, data: { message: "Historique de visionnage réinitialisé." } });
});

// POST /api/v1/profile/api-key
// Génère une clé API, ou la RÉGÉNÈRE si l'utilisateur en a déjà une
// (l'ancienne clé est immédiatement invalidée). `name` et `domain` sont
// optionnels :
// - `name` : libellé libre pour reconnaître la clé (ex: "Site movie-syrix").
// - `domain` : si fourni, il est enregistré/écrasé tout de suite (ex:
//   "movie.syrix.app", repris du .env du site du dev) ; sinon, sur une
//   régénération, le verrouillage de domaine existant est conservé, et sur
//   une première génération la clé s'auto-verrouillera sur le domaine du
//   premier appel réel (voir middleware/apiKeyAuth.js).
router.post("/api-key", async (req, res) => {
  const { name, domain } = req.body || {};
  const wasRegenerated = !!req.user.apiKey;

  req.user.apiKey = generateApiKey();
  if (name !== undefined) req.user.apiKeyName = name ? String(name).trim().slice(0, 60) : null;
  if (domain) req.user.apiKeyDomain = normalizeDomain(domain);
  else if (!wasRegenerated) req.user.apiKeyDomain = null;
  req.user.apiKeyCreatedAt = new Date();
  await req.user.save();

  res.status(201).json({
    success: true,
    data: {
      apiKey: req.user.apiKey,
      apiKeyName: req.user.apiKeyName,
      apiKeyDomain: req.user.apiKeyDomain,
      regenerated: wasRegenerated,
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
  req.user.apiKeyName = null;
  req.user.apiKeyCreatedAt = null;
  await req.user.save();
  res.json({ success: true, data: { message: "Clé API révoquée." } });
});

module.exports = router;
