const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protège les routes qui nécessitent une session utilisateur connectée
 * (via le token JWT délivré au login), distinct de la clé API développeur.
 */
async function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: "unauthorized", message: "Token d'authentification manquant." },
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: "unauthorized", message: "Utilisateur introuvable." },
      });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: "invalid_token", message: "Token invalide ou expiré." },
    });
  }
}

module.exports = requireAuth;
