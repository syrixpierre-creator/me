/* =========================================================
   SYRIX FLIX — logique commune des écrans app
   ========================================================= */
const SyrixAuth = (() => {
  const TOKEN_KEY = "sf_token";
  const USER_KEY = "sf_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function getCachedUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function requireAuth() {
    if (!getToken()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }
  async function api(path, options = {}) {
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );
    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;

    let res, json;
    try {
      res = await fetch("/api/v1" + path, Object.assign({}, options, { headers }));
    } catch {
      return { success: false, error: { code: "network_error", message: "Impossible de joindre le serveur." } };
    }
    try {
      json = await res.json();
    } catch {
      json = { success: false, error: { code: "bad_response", message: "Réponse invalide du serveur." } };
    }
    if (res.status === 401) {
      clearSession();
      window.location.href = "login.html";
    }
    return json;
  }
  function logout() {
    clearSession();
    window.location.href = "login.html";
  }

  return { getToken, setSession, getCachedUser, clearSession, requireAuth, api, logout };
})();

/* --- Menu latéral (drawer) : injecté sur accueil.html / profil.html --- */
const SyrixDrawer = (() => {
  function markup() {
    return `
      <div class="sf-drawer-overlay" id="sfDrawerOverlay"></div>
      <nav class="sf-drawer" id="sfDrawer">
        <div class="sf-drawer__logo">
          <span class="sf-logo">
            <span class="sf-logo__mark">S</span>
            <span class="sf-logo__text"><span>SYRIX</span><span class="sf-flix">FLIX</span></span>
          </span>
        </div>
        <div class="sf-drawer__user">
          <div class="sf-avatar">👤</div>
          <div>
            <div class="sf-drawer__user-name" id="sfDrawerUsername">Utilisateur</div>
            <a class="sf-drawer__user-edit" href="profil.html">Modifier le profil</a>
          </div>
        </div>
        <div class="sf-drawer__nav">
          <button class="sf-drawer__tile" data-close>🏠 Accueil</button>
          <button class="sf-drawer__tile" data-close>❤ Favoris</button>
          <button class="sf-drawer__tile" data-close>⬇ Téléchargements</button>
          <button class="sf-drawer__tile" data-close>🕒 Historique</button>
          <button class="sf-drawer__tile" data-close>⚙ Paramètres</button>
          <button class="sf-drawer__tile" data-close>❓ Aide et Support</button>
          <button class="sf-drawer__tile" id="sfDrawerApiDocs" data-close>🔌 Doc API (clé &amp; endpoints)</button>
        </div>
        <div class="sf-drawer__social">
          <span>📘</span><span>✉</span><span>📷</span>
        </div>
        <div class="sf-drawer__version">v1.2.0</div>
        <button class="sf-drawer__logout" id="sfDrawerLogout">⎋ Déconnexion</button>
      </nav>
    `;
  }

  function mount(burgerSelector) {
    document.body.insertAdjacentHTML("beforeend", markup());
    const overlay = document.getElementById("sfDrawerOverlay");
    const drawer = document.getElementById("sfDrawer");
    const burger = burgerSelector ? document.querySelector(burgerSelector) : null;

    function open() {
      overlay.classList.add("sf-open");
      drawer.classList.add("sf-open");
    }
    function close() {
      overlay.classList.remove("sf-open");
      drawer.classList.remove("sf-open");
    }
    if (burger) burger.addEventListener("click", open);
    overlay.addEventListener("click", close);
    drawer.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", close));
    document.getElementById("sfDrawerLogout").addEventListener("click", SyrixAuth.logout);
    document.getElementById("sfDrawerApiDocs").addEventListener("click", () => {
      window.location.href = "/docs/docs.html";
    });

    const cached = SyrixAuth.getCachedUser();
    if (cached && cached.username) {
      document.getElementById("sfDrawerUsername").textContent = cached.username;
    }
    SyrixAuth.api("/profile").then((res) => {
      if (res.success) {
        document.getElementById("sfDrawerUsername").textContent = res.data.username;
        SyrixAuth.setSession(SyrixAuth.getToken(), res.data);
      }
    });
  }

  return { mount };
})();

/* --- Génère le HTML d'une carte média --- */
/* `type`/`slug` sont optionnels : sans eux, la carte reste purement
   visuelle (compat rétro). Avec eux, la carte devient cliquable — la
   navigation elle-même est gérée une seule fois, plus bas, par
   délégation d'événement (pas besoin de re-câbler chaque page). */
function sfMediaCard(title, progress, image, type, slug) {
  const progressHtml =
    progress === undefined || progress === null
      ? ""
      : `<div class="sf-progress"><i style="width:${Math.round(progress * 100)}%"></i></div>`;
  const thumbHtml = image
    ? `<img src="${image}" alt="" loading="lazy" />`
    : "🎬";
  const clickAttrs = (type && slug)
    ? ` data-type="${String(type).replace(/"/g, "&quot;")}" data-slug="${String(slug).replace(/"/g, "&quot;")}" role="button" tabindex="0"`
    : "";
  return `
    <div class="sf-media-card"${clickAttrs}>
      <div class="sf-media-card__thumb">${thumbHtml}</div>
      ${progressHtml}
      <div class="sf-media-card__title">${title}</div>
    </div>
  `;
}

/* Une seule délégation de clic pour TOUTES les cartes de TOUTES les pages :
   pas besoin de re-câbler la navigation à chaque nouvel endroit où
   sfMediaCard() est utilisée. */
function sfGoToDetail(type, slug) {
  window.location.href = "detail.html?type=" + encodeURIComponent(type) + "&slug=" + encodeURIComponent(slug);
}
document.addEventListener("click", (e) => {
  const card = e.target.closest(".sf-media-card[data-slug]");
  if (!card) return;
  sfGoToDetail(card.dataset.type, card.dataset.slug);
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".sf-media-card[data-slug]");
  if (!card) return;
  e.preventDefault();
  sfGoToDetail(card.dataset.type, card.dataset.slug);
});

/* =========================================================
   Politique de sandbox iframe par lecteur — port fidèle de
   services/player_policy.py (version Python du projet). Bloque les
   popups publicitaires par défaut ; ne les autorise que pour les
   hébergeurs vidéo connus qui en ont réellement besoin pour fonctionner.
   ========================================================= */
function playerSandbox(serverName, serverLink) {
  const DEFAULT_SANDBOX = "allow-scripts allow-same-origin allow-forms allow-presentation";
  const BASE = ["allow-scripts", "allow-same-origin", "allow-presentation"];
  const POPUPS = ["allow-popups", "allow-popups-to-escape-sandbox"];

  const RULES = [
    { keywords: ["vidmoly"], tokens: [...BASE, "allow-pointer-lock"] },
    { keywords: ["voe.", "voe.sx", "voe-"], tokens: [...BASE, "allow-forms", ...POPUPS, "allow-top-navigation-by-user-activation"] },
    { keywords: ["streamtape", "stape"], tokens: [...BASE, ...POPUPS] },
    { keywords: ["mail.ru", "my.mail.ru"], tokens: [...BASE, "allow-forms"] },
    { keywords: ["kokoflix", "voembed", "vidsrc", "vidcloud", "upcloud", "filemoon"], tokens: [...BASE, "allow-forms", "allow-pointer-lock", ...POPUPS] },
  ];

  let host = "";
  try { host = new URL(serverLink).host.toLowerCase(); } catch {}
  const haystack = `${(serverName || "").toLowerCase()} ${host}`;

  for (const rule of RULES) {
    if (rule.keywords.some((k) => haystack.includes(k))) return rule.tokens.join(" ");
  }
  return DEFAULT_SANDBOX;
}

/* =========================================================
   Chargement générique d'une grille de catalogue (Films / Séries /
   Animés / K-Dramas), avec filtre de genre optionnel. Partagé entre
   movie.html, serie.html, anime.html — évite de dupliquer la même
   logique de fetch dans les trois pages.
   ========================================================= */
const SyrixCatalog = (() => {
  async function loadGrid(gridEl, type, genre) {
    gridEl.innerHTML = `<p class="sf-placeholder">Chargement...</p>`;
    const qs = genre ? "?genre=" + encodeURIComponent(genre) : "";
    const res = await SyrixAuth.api("/" + type + qs);
    const items = res.success ? (res.data || []) : [];

    if (!items.length) {
      gridEl.innerHTML = `<p class="sf-placeholder">${
        res.success ? "Aucun résultat pour le moment." : (res.error?.message || "Erreur de chargement.")
      }</p>`;
      return;
    }
    gridEl.innerHTML = "";
    items.forEach((item) => {
      gridEl.insertAdjacentHTML("beforeend", sfMediaCard(item.title || "—", null, item.image, item.type, item.slug));
    });
  }

  return { loadGrid };
})();
