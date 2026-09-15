const axios = require("axios");
const { getFallbackCatalog } = require("./fallbackCatalog");

// Client vers l'API publique SYRIX FLIX
const catalogClient = axios.create({
  baseURL: process.env.CATALOG_API_BASE_URL,
  timeout: 6000,
});

/**
 * Relaie une requête GET vers l'API catalogue et normalise les erreurs.
 * Bascule automatiquement sur le catalogue de secours local si le service distant
 * n'est pas configuré, échoue avec une erreur 5xx, ou est injoignable.
 */
async function forwardGet(path, params = {}) {
  if (!process.env.CATALOG_API_BASE_URL) {
    return getFallbackCatalog(path, params);
  }

  try {
    const { data } = await catalogClient.get(path, { params });
    // Si la réponse est valide et contient des données
    if (data && (data.success || Array.isArray(data.data) || data.data)) {
      return { status: 200, body: data };
    }
    return getFallbackCatalog(path, params);
  } catch (err) {
    // Si l'erreur est un 404 légitime d'un film introuvable
    if (err.response && err.response.status === 404 && !path.endsWith("s")) {
      // Tente quand même le catalogue local au cas où il s'y trouve
      const local = getFallbackCatalog(path, params);
      if (local.status === 200) return local;
      return { status: 404, body: err.response.data };
    }

    console.warn(`[ProxyClient] Source distante instable pour ${path} — bascule automatique sur le catalogue local.`);
    return getFallbackCatalog(path, params);
  }
}

module.exports = { forwardGet };
