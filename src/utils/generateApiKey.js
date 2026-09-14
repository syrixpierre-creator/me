const crypto = require("crypto");

/**
 * Génère une clé API unique au format syrix~<32 hex chars>
 */
function generateApiKey() {
  const random = crypto.randomBytes(16).toString("hex");
  return `syrix~${random}`;
}

module.exports = generateApiKey;
