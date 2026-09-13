const User = require("../models/User");
const { extractDomain } = require("../utils/extractDomain");

/**
 * Protège les routes de catalogue exposées aux intégrateurs externes
 * (ex: le site "movie syrix" du développeur).
 *
 * Principe clé : la clé API n'est PAS liée à l'IP du VPS qui héberge cette
 * API — elle est liée à un NOM DE DOMAINE, celui que le développeur déclare
 * dans le .env de son propre site (ex: ALLOWED_DOMAIN=movie.syrix.app).
 *
 * Auto-détection : si l'utilisateur n'a jamais renseigné de domaine au
 * moment de générer sa clé, le premier appel réussi verrouille
 * automatiquement la clé sur le domaine détecté (Origin/Referer de cette
 * première requête). Tous les appels suivants doivent provenir du même domaine.
 */
async function apiKeyAuth(req, res, next) {
  const key = req.get("x-api-key");

  if (!key) {
    return res.status(401).json({
      success: false,
      error: { code: "missing_api_key", message: "En-tête X-API-Key manquant." },
    });
  }

  const user = await User.findOne({ apiKey: key }).select("+apiKey");
  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: "invalid_api_key", message: "Clé API invalide." },
    });
  }

  const enforceDomain = process.env.API_KEY_DOMAIN_ENFORCEMENT !== "false";
  const incomingDomain = extractDomain(req);

  if (enforceDomain) {
    if (!user.apiKeyDomain) {
      // Auto-détection : premier usage de la clé -> on verrouille le domaine.
      if (!incomingDomain) {
        return res.status(400).json({
          success: false,
          error: {
            code: "domain_required",
            message:
              "Impossible de détecter le domaine appelant (en-tête Origin/Referer absent). Ajoutez-le manuellement depuis le profil ou envoyez l'en-tête Origin.",
          },
        });
      }
      user.apiKeyDomain = incomingDomain;
      await user.save();
    } else if (incomingDomain && incomingDomain !== user.apiKeyDomain) {
      return res.status(403).json({
        success: false,
        error: {
          code: "domain_mismatch",
          message: `Cette clé API est verrouillée sur le domaine "${user.apiKeyDomain}". Requête reçue depuis "${incomingDomain}".`,
        },
      });
    }
  }

  req.apiUser = user;
  next();
}

module.exports = apiKeyAuth;
