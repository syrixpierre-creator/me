const axios = require("axios");

// Cache en mémoire pour éviter les requêtes répétitives vers les APIs publiques
const metaCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 heure

function getCache(key) {
  const cached = metaCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  metaCache.set(key, { data, timestamp: Date.now() });
}

// Nettoie un titre pour la recherche (enlève VF, VOSTFR, Saison, etc.)
function cleanTitleForSearch(rawTitle) {
  if (!rawTitle) return "";
  return rawTitle
    .replace(/\s*(VOSTFR|VF|MULTI|FRENCH|HD|4K|1080p|720p)/gi, "")
    .replace(/\s*-\s*Saison\s*\d+/gi, "")
    .replace(/\s*Saison\s*\d+/gi, "")
    .replace(/\s*Season\s*\d+/gi, "")
    .replace(/\s*-\s*\d+$/g, "")
    .trim();
}

/**
 * Recherche de métadonnées pour Anime via AniList GraphQL (Public, gratuit, très riche)
 * avec fallback sur Kitsu API.
 */
async function fetchAnimeMeta(title) {
  const clean = cleanTitleForSearch(title);
  if (!clean) return null;

  const cacheKey = `anime:${clean.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  // 1. Essai AniList (avec personnages, acteurs vocaux, bannière HD)
  const anilistQuery = `
    query ($search: String) {
      Media (search: $search, type: ANIME) {
        id
        title { romaji english native }
        coverImage { extraLarge large }
        bannerImage
        description
        averageScore
        episodes
        status
        genres
        startDate { year }
        characters(sort: ROLE, perPage: 8) {
          edges {
            role
            node {
              name { full native }
              image { large medium }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await axios.post(
      "https://graphql.anilist.co",
      { query: anilistQuery, variables: { search: clean } },
      { timeout: 4000, headers: { "Content-Type": "application/json", Accept: "application/json" } }
    );
    const m = res.data?.data?.Media;
    if (m) {
      const characters = (m.characters?.edges || []).map((e) => ({
        name: e.node?.name?.full || "Personnage",
        role: e.role === "MAIN" ? "Principal" : "Secondaire",
        image: e.node?.image?.large || e.node?.image?.medium || "",
      }));

      const result = {
        title: m.title?.english || m.title?.romaji || clean,
        originalTitle: m.title?.native || "",
        poster: m.coverImage?.extraLarge || m.coverImage?.large,
        banner: m.bannerImage || m.coverImage?.extraLarge,
        description: m.description ? m.description.replace(/<[^>]*>?/gm, "").trim() : "",
        score: m.averageScore ? (m.averageScore / 10).toFixed(1) : null,
        genres: m.genres || [],
        year: m.startDate?.year ? String(m.startDate.year) : "",
        episodes: m.episodes || null,
        characters,
        source: "AniList",
      };
      setCache(cacheKey, result);
      return result;
    }
  } catch (e) {
    // AniList indisponible ou timeout, on tente Kitsu
  }

  // 2. Fallback Kitsu API (public, instantané)
  try {
    const kitsuRes = await axios.get(
      `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(clean)}&page[limit]=1`,
      {
        timeout: 3500,
        headers: { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json" },
      }
    );
    const item = kitsuRes.data?.data?.[0]?.attributes;
    if (item) {
      const result = {
        title: item.canonicalTitle || clean,
        originalTitle: item.titles?.ja_jp || "",
        poster: item.posterImage?.large || item.posterImage?.original,
        banner: item.coverImage?.large || item.posterImage?.large,
        description: item.synopsis ? item.synopsis.trim() : "",
        score: item.averageRating ? (parseFloat(item.averageRating) / 10).toFixed(1) : null,
        genres: [],
        year: item.startDate ? item.startDate.split("-")[0] : "",
        episodes: item.episodeCount || null,
        characters: [],
        source: "Kitsu",
      };
      setCache(cacheKey, result);
      return result;
    }
  } catch (e) {
    // Échec silencieux
  }

  return null;
}

/**
 * Recherche de métadonnées pour Séries et K-Dramas via TVMaze (Public, gratuit, photos de casting)
 */
async function fetchSeriesOrDramaMeta(title, isDrama = false) {
  const clean = cleanTitleForSearch(title);
  if (!clean) return null;

  const cacheKey = `tv:${clean.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const res = await axios.get(
      `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(clean)}&embed=cast`,
      { timeout: 4000 }
    );
    const s = res.data;
    if (s) {
      const characters = (s._embedded?.cast || []).slice(0, 10).map((c) => ({
        name: c.character?.name || c.person?.name,
        actor: c.person?.name || "",
        role: "Acteur",
        image: c.character?.image?.medium || c.person?.image?.medium || "",
      }));

      const result = {
        title: s.name || clean,
        poster: s.image?.original || s.image?.medium,
        banner: s.image?.original || s.image?.medium,
        description: s.summary ? s.summary.replace(/<[^>]*>?/gm, "").trim() : "",
        score: s.rating?.average ? String(s.rating.average) : null,
        genres: s.genres || (isDrama ? ["K-Drama", "Romance"] : ["Série"]),
        year: s.premiered ? s.premiered.split("-")[0] : "",
        characters,
        source: "TVMaze",
      };
      setCache(cacheKey, result);
      return result;
    }
  } catch (e) {
    // Échec silencieux
  }

  return null;
}

/**
 * Recherche générale tous types confondus
 */
async function getEnrichedMeta(title, type = "movie") {
  if (!title) return null;

  if (type === "anime") {
    const meta = await fetchAnimeMeta(title);
    if (meta) return meta;
  } else if (type === "drama" || type === "dramas") {
    const meta = await fetchSeriesOrDramaMeta(title, true);
    if (meta) return meta;
  } else if (type === "series") {
    const meta = await fetchSeriesOrDramaMeta(title, false);
    if (meta) return meta;
  } else {
    // Films : essai TVMaze ou structure par défaut
    const meta = await fetchSeriesOrDramaMeta(title, false);
    if (meta) return meta;
  }

  return null;
}

/**
 * Assainit une URL d'image pour s'assurer qu'elle est en HTTPS
 * et élimine les adresses IP HTTP ou proxies cassés.
 */
function sanitizeImageUrl(rawUrl, title = "", type = "movie") {
  if (!rawUrl || typeof rawUrl !== "string") {
    return getDefaultPoster(type, title);
  }

  // Si l'URL contient un paramètre url= encodé (ex: 82.165.215.121:3005/api/image-proxy?url=...)
  if (rawUrl.includes("image-proxy?url=")) {
    try {
      const match = rawUrl.match(/url=([^&]+)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]);
        // Si c'est voir-anime ou voirdrama, router vers notre propre proxy sécurisé HTTPS
        return `/api/v1/image-proxy?url=${encodeURIComponent(decoded)}`;
      }
    } catch {}
  }

  // Pour voir-anime et voirdrama directs
  if (rawUrl.includes("voir-anime.to") || rawUrl.includes("voirdrama.to")) {
    return `/api/v1/image-proxy?url=${encodeURIComponent(rawUrl)}`;
  }

  // Si c'est une URL HTTP vers une IP, elle est bloquée en Mixed Content par Chrome
  if (rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
    // Si c'est un domaine externe légitime (ex: tmdb), passer en https
    if (rawUrl.includes("tmdb.org")) {
      return rawUrl.replace("http://", "https://");
    }
    // Si c'est l'IP distante scraper, ne pas utiliser directement
    if (rawUrl.includes("82.165.215.121")) {
      return getDefaultPoster(type, title);
    }
    return rawUrl.replace("http://", "https://");
  }

  return rawUrl;
}

// Affiches thématiques HD de secours garanties 100% HTTPS en cas d'image introuvable
function getDefaultPoster(type = "movie", title = "") {
  const posters = {
    anime: [
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    ],
    drama: [
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80",
    ],
    series: [
      "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80",
    ],
    movie: [
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
    ],
  };

  const list = posters[type] || posters.movie;
  const hash = title ? title.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) : 0;
  return list[hash % list.length];
}

module.exports = {
  fetchAnimeMeta,
  fetchSeriesOrDramaMeta,
  getEnrichedMeta,
  sanitizeImageUrl,
  getDefaultPoster,
  cleanTitleForSearch,
};
