/**
 * Extrait un nom de domaine "propre" (sans protocole, port, www.) à partir
 * d'une requête entrante. On se base sur les en-têtes Origin / Referer —
 * jamais sur l'IP du serveur qui appelle, puisque le VPS peut héberger
 * plusieurs sites/domaines derrière la même IP.
 *
 * Ordre de priorité : Origin > Referer > en-tête custom X-App-Domain.
 */
function extractDomain(req) {
  const raw =
    req.get("origin") || req.get("referer") || req.get("x-app-domain") || "";

  if (!raw) return null;

  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    return normalizeDomain(url.hostname);
  } catch {
    // Valeur déjà "propre" (juste un nom de domaine sans schéma valide)
    return normalizeDomain(raw);
  }
}

function normalizeDomain(hostname) {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0]
    .trim();
}

module.exports = { extractDomain, normalizeDomain };
