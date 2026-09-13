const jwt = require("jsonwebtoken");
const User = require("../models/User");
const apiKeyAuth = require("./apiKeyAuth");

/**
 * Le catalogue est consommé par deux publics :
 *  1) L'app mobile SYRIX FLIX elle-même -> l'utilisateur est connecté (JWT).
 *  2) Des sites tiers du développeur (ex: "movie syrix") -> clé API + domaine.
 *
 * On accepte l'un OU l'autre.
 */
async function catalogAccess(req, res, next) {
  const authHeader = req.get("authorization") || "";
  const hasBearer = authHeader.startsWith("Bearer ");
  const hasApiKey = !!req.get("x-api-key");

  if (hasBearer) {
    try {
      const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user) throw new Error("no-user");
      req.user = user;
      return next();
    } catch {
      return res.status(401).json({
        success: false,
        error: { code: "invalid_token", message: "Token invalide ou expiré." },
      });
    }
  }

  if (hasApiKey) {
    return apiKeyAuth(req, res, next);
  }

  return res.status(401).json({
    success: false,
    error: {
      code: "unauthorized",
      message: "Authentifiez-vous avec un token (app) ou une clé API (X-API-Key).",
    },
  });
}

module.exports = catalogAccess;
