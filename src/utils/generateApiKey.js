const crypto = require("crypto");

/**
 * Génère une clé API unique au format SYRIX_API_KEY_<64 hex chars>
 */
function generateApiKey() {
  const random = crypto.randomBytes(32).toString("hex");
  return `SYRIX_API_KEY_${random}`;
}

module.exports = generateApiKey;
