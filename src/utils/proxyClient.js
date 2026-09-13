const axios = require("axios");

// Client vers l'API publique SYRIX FLIX déjà déployée sur le VPS.
// Elle sert de source de catalogue (films/séries/anime/K-dramas) — voir docs fournies.
const catalogClient = axios.create({
  baseURL: process.env.CATALOG_API_BASE_URL,
  timeout: 15000,
});

/**
 * Relaie une requête GET vers l'API catalogue et normalise les erreurs
 * dans le même format que le reste de notre propre API.
 */
async function forwardGet(path, params = {}) {
  try {
    const { data } = await catalogClient.get(path, { params });
    return { status: 200, body: data };
  } catch (err) {
    if (err.response) {
      // L'API source a répondu avec une erreur — on relaie telle quelle,
      // elle respecte déjà l'enveloppe { success, error: { code, message } }.
      return { status: err.response.status, body: err.response.data };
    }
    return {
      status: 502,
      body: {
        success: false,
        error: {
          code: "source_unavailable",
          message: "Le service de catalogue est momentanément indisponible.",
        },
      },
    };
  }
}

module.exports = { forwardGet };
