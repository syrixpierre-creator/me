/**
 * SYRIX FLIX — Moteur d'application, navigation, SVGs et lecteur Netflix
 */

// --- Bibliothèque d'icônes SVG haute définition (sans aucun emoji) ---
const SF_SVGS = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
  movie: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>`,
  series: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>`,
  anime: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>`,
  drama: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 17.93c3.95-.49 7-3.85 7-7.93 0-.62-.08-1.21-.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm-9-7.93c0-1.3.31-2.52.85-3.61l4.15 4.15V13c0 1.1.9 2 2 2h1.5l1.5 1.5v1.5H11c-3.87 0-7-3.13-7-7z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  heartOutline: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`,
  history: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
  help: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
  burger: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
  fullscreenExit: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z"/></svg>`,
  rotate: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-12.96 19C.25 19.97-2.09 16.8-2.45 13.04H-3.95C-3.44 19.16 1.71 24 8 24l.66-.03-3.81-3.81-1.33 1.32zM19 7h-8c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 12h-8V9h8v10z"/></svg>`,
  volumeUp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
  forward10: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 12c-.04-3.07-2.19-5.64-5.13-6.26l.48-1.92-3.89 1.48 2.45 3.39.5-2C15.4 7.15 17 9.38 17 12c0 3.31-2.69 6-6 6s-6-2.69-6-6H3c0 4.42 3.58 8 8 8s8-3.58 8-8zm-8.5 2.5h-1V10h1.5v3.5h-.5zm3 0h-2V10h2c.55 0 1 .45 1 1v2.5c0 .55-.45 1-1 1zm0-3.5h-1v2.5h1V11z"/></svg>`,
  replay10: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm-1.5 9.5h-1V11h1.5v3.5h-.5zm3 0h-2V11h2c.55 0 1 .45 1 1v2.5c0 .55-.45 1-1 1zm0-3.5h-1v2.5h1v-2.5z"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>`,
};

function sfIcon(name, size = 18) {
  const svg = SF_SVGS[name] || SF_SVGS.movie;
  return `<span class="sf-svg-icon" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;line-height:1;">${svg}</span>`;
}

// --- Authentification & Session ---
const SyrixAuth = (() => {
  const TOKEN_KEY = "sf_token";
  const USER_KEY = "sf_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
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

// --- Logo de Marque Cinématographique Haute Couture SYRIX FLIX ---
function sfBrandLogo(size = 34) {
  const emblemSvg = `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" style="filter:drop-shadow(0 4px 10px rgba(229,9,20,0.45));flex-shrink:0;">
      <defs>
        <radialGradient id="sfLogoBg_${size}" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stop-color="#24070a"/>
          <stop offset="70%" stop-color="#120507"/>
          <stop offset="100%" stop-color="#07070a"/>
        </radialGradient>
        <linearGradient id="sfLogoRibbon_${size}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff3b47"/>
          <stop offset="45%" stop-color="#e50914"/>
          <stop offset="100%" stop-color="#800207"/>
        </linearGradient>
        <linearGradient id="sfLogoSheen_${size}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
          <stop offset="60%" stop-color="#ffffff" stop-opacity="0.05"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.5"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#sfLogoBg_${size})"/>
      <rect width="98" height="98" x="1" y="1" rx="21" fill="none" stroke="rgba(229,9,20,0.35)" stroke-width="1.5"/>
      <circle cx="50" cy="50" r="32" fill="#e50914" opacity="0.18"/>
      <!-- S sculpté en ruban 3D -->
      <path d="M 72 30 C 72 20 62 16 50 16 C 36 16 28 24 28 36 C 28 46 36 52 50 56 L 56 58 C 66 61 70 65 70 72 C 70 80 62 84 50 84 C 36 84 28 78 28 68 L 38 67 C 38 73 43 76 50 76 C 57 76 61 73 61 69 C 61 64 57 61 48 58 L 42 56 C 30 52 20 46 20 34 C 20 20 32 10 50 10 C 68 10 80 18 80 30 Z" 
            fill="url(#sfLogoRibbon_${size})"/>
      <path d="M 50 18 C 66 18 70 24 70 30 L 66 31 C 66 26 62 20 50 20 C 38 20 30 26 30 34 L 28 34 C 28 22 36 18 50 18 Z" 
            fill="url(#sfLogoSheen_${size})"/>
      <circle cx="72" cy="30" r="1.5" fill="#ffffff" opacity="0.9"/>
    </svg>
  `;

  return `
    <span class="sf-brand-logo">
      <span class="sf-brand-logo__emblem">${emblemSvg}</span>
      <span class="sf-brand-logo__text">
        <span class="sf-brand-logo__primary">SYRIX<span class="sf-brand-logo__accent">FLIX</span></span>
        <span class="sf-brand-logo__tag">ULTRA CINEMA HD</span>
      </span>
    </span>
  `;
}

// --- Menu Latéral (Drawer) sans aucun emoji et avec tous les boutons fonctionnels ---
const SyrixDrawer = (() => {
  function markup() {
    return `
      <div class="sf-drawer-overlay" id="sfDrawerOverlay"></div>
      <nav class="sf-drawer" id="sfDrawer">
        <div class="sf-drawer__head">
          <a href="accueil.html" style="text-decoration:none;">
            ${sfBrandLogo(36)}
          </a>
          <button class="sf-drawer__close-btn" id="sfDrawerClose" title="Fermer le menu">${sfIcon("close", 20)}</button>
        </div>

        <div class="sf-drawer__user" id="sfDrawerUserCard">
          <div class="sf-avatar" id="sfDrawerAvatarBox" style="width:44px;height:44px;border-radius:12px;border:1.5px solid #e50914;overflow:hidden;background:#181920;display:flex;align-items:center;justify-content:center;">
            ${sfIcon("user", 24)}
          </div>
          <div style="min-width:0;flex:1;">
            <div class="sf-drawer__user-name" id="sfDrawerUsername" style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">SyrixUser</div>
            <a class="sf-drawer__user-edit" href="profil.html" style="color:#e50914;font-size:12px;">Éditer profil &bull; Clé API</a>
          </div>
        </div>

        <div class="sf-drawer__nav">
          <a class="sf-drawer__tile" href="accueil.html">${sfIcon("home", 18)}<span>Accueil</span></a>
          <a class="sf-drawer__tile" href="movie.html">${sfIcon("movie", 18)}<span>Films</span></a>
          <a class="sf-drawer__tile" href="serie.html">${sfIcon("series", 18)}<span>Séries</span></a>
          <a class="sf-drawer__tile" href="anime.html">${sfIcon("anime", 18)}<span>Anime</span></a>
          <a class="sf-drawer__tile" href="accueil.html?category=dramas">${sfIcon("drama", 18)}<span>K-Dramas</span></a>
          
          <div class="sf-drawer__divider"></div>
          
          <button class="sf-drawer__tile" id="sfDrawerFavBtn">${sfIcon("heart", 18)}<span>Ma Liste / Favoris</span></button>
          <button class="sf-drawer__tile" id="sfDrawerDownloadsBtn">${sfIcon("download", 18)}<span>Télécharger App PWA / APK</span></button>
          <button class="sf-drawer__tile" id="sfDrawerHistoryBtn">${sfIcon("history", 18)}<span>Historique</span></button>
          <a class="sf-drawer__tile" href="faq.html">${sfIcon("help", 18)}<span>Aide &amp; FAQ</span></a>
          <a class="sf-drawer__tile" href="/docs/docs.html">${sfIcon("code", 18)}<span>Documentation API</span></a>
          <a class="sf-drawer__tile" href="profil.html">${sfIcon("settings", 18)}<span>Paramètres du Profil</span></a>
          <button class="sf-drawer__tile" id="sfDrawerCookieBtn" style="color:#9c9ca4;">${sfIcon("settings", 16)}<span>Gestion des Cookies</span></button>
        </div>

        <div class="sf-drawer__footer">
          <button class="sf-drawer__logout" id="sfDrawerLogout">
            ${sfIcon("logout", 18)}<span>Déconnexion</span>
          </button>
        </div>
      </nav>
    `;
  }

  function updateUserDisplay(user) {
    if (!user) return;
    const uEl = document.getElementById("sfDrawerUsername");
    if (uEl && user.username) uEl.textContent = user.username;

    const avBox = document.getElementById("sfDrawerAvatarBox");
    if (avBox) {
      if (user.profileImage && user.profileImage.trim()) {
        avBox.innerHTML = `<img src="${user.profileImage}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;" />`;
      } else {
        avBox.innerHTML = sfIcon("user", 24);
      }
    }
  }

  function mount(burgerSelector) {
    if (document.getElementById("sfDrawer")) return;
    document.body.insertAdjacentHTML("beforeend", markup());

    const overlay = document.getElementById("sfDrawerOverlay");
    const drawer = document.getElementById("sfDrawer");
    const burger = burgerSelector ? document.querySelector(burgerSelector) : null;
    const closeBtn = document.getElementById("sfDrawerClose");

    function open() {
      overlay.classList.add("sf-open");
      drawer.classList.add("sf-open");
    }
    function close() {
      overlay.classList.remove("sf-open");
      drawer.classList.remove("sf-open");
    }

    if (burger) burger.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", close);

    document.getElementById("sfDrawerLogout").addEventListener("click", SyrixAuth.logout);

    document.getElementById("sfDrawerFavBtn").addEventListener("click", () => {
      close();
      window.location.href = "accueil.html?view=favorites";
    });
    document.getElementById("sfDrawerDownloadsBtn").addEventListener("click", () => {
      close();
      if (window.SyrixApkBanner && window.SyrixApkBanner.promptAgain) {
        window.SyrixApkBanner.promptAgain();
      } else {
        window.location.href = "accueil.html?tab=telechargements";
      }
    });
    document.getElementById("sfDrawerHistoryBtn").addEventListener("click", () => {
      close();
      window.location.href = "accueil.html?view=history";
    });
    document.getElementById("sfDrawerCookieBtn")?.addEventListener("click", () => {
      close();
      if (window.SyrixCookieConsent && window.SyrixCookieConsent.openSettings) {
        window.SyrixCookieConsent.openSettings();
      }
    });

    const cached = SyrixAuth.getCachedUser();
    if (cached) updateUserDisplay(cached);

    document.addEventListener("sf:profile-updated", (e) => {
      if (e.detail) updateUserDisplay(e.detail);
    });

    SyrixAuth.api("/profile").then((res) => {
      if (res.success && res.data) {
        updateUserDisplay(res.data);
        SyrixAuth.setSession(SyrixAuth.getToken(), res.data);
      }
    });
  }

  return { mount, updateUserDisplay };
})();

// --- Générateur de carte média sans emoji avec fallback image robuste ---
function sfMediaCard(title, progress, image, type, slug) {
  const progressHtml =
    progress === undefined || progress === null
      ? ""
      : `<div class="sf-progress"><i style="width:${Math.round(progress * 100)}%"></i></div>`;
  
  // Affiche fallback propre 100% https
  const safeFallback = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80";
  const safeImage = image || safeFallback;

  const thumbHtml = `
    <img src="${safeImage}" alt="${title || 'Affiche'}" loading="lazy" 
         onerror="this.onerror=null;this.src='${safeFallback}';" />
    <div class="sf-card-badge">${(type || 'HD').toUpperCase()}</div>
  `;

  const clickAttrs = (type && slug)
    ? ` data-type="${String(type).replace(/"/g, "&quot;")}" data-slug="${String(slug).replace(/"/g, "&quot;")}" role="button" tabindex="0"`
    : "";

  return `
    <div class="sf-media-card"${clickAttrs}>
      <div class="sf-media-card__thumb">${thumbHtml}</div>
      ${progressHtml}
      <div class="sf-media-card__title">${title || "Sans titre"}</div>
    </div>
  `;
}

// Navigation globale par clic sur une carte
function sfGoToDetail(type, slug) {
  window.location.href = "detail.html?type=" + encodeURIComponent(type) + "&slug=" + encodeURIComponent(slug);
}
document.addEventListener("click", (e) => {
  const card = e.target.closest(".sf-media-card[data-slug]");
  if (!card) return;
  sfGoToDetail(card.dataset.type, card.dataset.slug);
});

// --- Sandbox Iframe selon les règles de sécurité ---
// IMPORTANT : ni allow-popups, ni allow-top-navigation(-by-user-activation)
// ne sont JAMAIS accordés, quel que soit l'hébergeur. Ce sont précisément
// ces deux permissions qui laissent la publicité du serveur vidéo ouvrir un
// onglet ou rediriger toute la page dès le clic sur "Regarder" — le clic
// sert de "user activation" que la pub détourne à son profit.
function playerSandbox(serverName, serverLink) {
  const BASE = ["allow-scripts", "allow-same-origin", "allow-presentation"];
  const DEFAULT = [...BASE, "allow-forms"].join(" ");

  const RULES = [
    { keywords: ["vidmoly"], tokens: [...BASE, "allow-pointer-lock"] },
    { keywords: ["voe.", "voe.sx", "voe-"], tokens: [...BASE, "allow-forms"] },
    { keywords: ["streamtape", "stape"], tokens: [...BASE] },
    { keywords: ["kokoflix", "voembed", "vidsrc", "vidcloud", "upcloud", "filemoon", "vidzy"], tokens: [...BASE, "allow-forms", "allow-pointer-lock"] },
  ];

  let host = "";
  try { host = new URL(serverLink).host.toLowerCase(); } catch {}
  const haystack = `${(serverName || "").toLowerCase()} ${host}`;

  for (const rule of RULES) {
    if (rule.keywords.some((k) => haystack.includes(k))) return rule.tokens.join(" ");
  }
  return DEFAULT;
}

// --- Moteur de Lecture Netflix Automatique (1-Click Play & Horizontal Fullscreen) ---
const SyrixStreamPlayer = (() => {
  let activeServers = [];
  let currentServerIndex = 0;
  let isLandscapeForced = false;

  function initPlayerHtml(title, epName) {
    return `
      <div class="sf-netflix-theater" id="netflixTheater">
        <!-- Barre de contrôles supérieure -->
        <div class="sf-theater-topbar">
          <button class="sf-theater-btn" id="sfClosePlayer" title="Retour">${sfIcon("arrowLeft", 22)}</button>
          <div class="sf-theater-info">
            <span class="sf-theater-title">${title || "Lecture"}</span>
            ${epName ? `<span class="sf-theater-sub">${epName}</span>` : ""}
          </div>
          <div style="flex:1"></div>
          <button class="sf-theater-btn" id="sfRotateBtn" title="Rotation Horizontale / Paysage">${sfIcon("rotate", 20)}</button>
          <button class="sf-theater-btn" id="sfFullscreenBtn" title="Plein Écran">${sfIcon("fullscreen", 20)}</button>
        </div>

        <!-- Zone Vidéo / Embed Iframe -->
        <div class="sf-theater-screen" id="theaterScreen">
          <div class="sf-theater-loader" id="theaterLoader">
            <div class="sf-spinner"></div>
            <span>Connexion au flux ultra-rapide...</span>
          </div>
          <div id="theaterEmbedContainer" style="width:100%;height:100%;"></div>
        </div>

        <!-- Barre d'état inférieure discrète pour secours silencieux -->
        <div class="sf-theater-bottombar">
          <span class="sf-stream-badge">SYRIX ULTRA HD</span>
          <span class="sf-server-hint" id="sfServerHint">Flux actif 1</span>
          <button class="sf-theater-action-btn" id="sfNextServerBtn">${sfIcon("replay10", 14)}<span>Changer de flux</span></button>
        </div>
      </div>
    `;
  }

  function launchStream(containerEl, title, epName, servers) {
    activeServers = (servers || []).filter(s => s && s.server_link);
    currentServerIndex = 0;

    if (!activeServers.length) {
      alert("Aucun flux disponible pour le moment.");
      return;
    }

    containerEl.innerHTML = initPlayerHtml(title, epName);
    const theater = document.getElementById("netflixTheater");

    // Bouton Fermer
    document.getElementById("sfClosePlayer").addEventListener("click", () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      containerEl.innerHTML = "";
    });

    // Bouton Plein écran natif
    const fsBtn = document.getElementById("sfFullscreenBtn");
    fsBtn.addEventListener("click", toggleNativeFullscreen);

    // Bouton Rotation Horizontale Forcée (Netflix Landscape)
    const rotateBtn = document.getElementById("sfRotateBtn");
    rotateBtn.addEventListener("click", toggleLandscapeMode);

    // Bouton Changer de flux (secours manuel si besoin)
    document.getElementById("sfNextServerBtn").addEventListener("click", () => {
      nextServer();
    });

    // Démarre la lecture sur le premier serveur immédiatement
    connectCurrentServer();
  }

  function connectCurrentServer() {
    if (!activeServers.length) return;
    const s = activeServers[currentServerIndex];
    const embedBox = document.getElementById("theaterEmbedContainer");
    const loader = document.getElementById("theaterLoader");
    const hint = document.getElementById("sfServerHint");

    if (loader) loader.style.display = "flex";
    if (hint) hint.textContent = `Flux direct ${currentServerIndex + 1}/${activeServers.length}`;

    const sandbox = playerSandbox(s.server_name || "Serveur", s.server_link);
    embedBox.innerHTML = `
      <iframe src="${s.server_link}" 
              sandbox="${sandbox}" 
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture" 
              allowfullscreen
              style="width:100%;height:100%;border:none;background:#000;">
      </iframe>
    `;

    setTimeout(() => {
      if (loader) loader.style.display = "none";
    }, 1200);
  }

  function nextServer() {
    if (activeServers.length <= 1) return;
    currentServerIndex = (currentServerIndex + 1) % activeServers.length;
    connectCurrentServer();
  }

  // Plein écran natif + tentative d'orientation paysage
  async function toggleNativeFullscreen() {
    const theater = document.getElementById("netflixTheater");
    if (!theater) return;

    try {
      if (!document.fullscreenElement) {
        if (theater.requestFullscreen) {
          await theater.requestFullscreen();
        } else if (theater.webkitRequestFullscreen) {
          await theater.webkitRequestFullscreen();
        }
        // Verrouillage paysage natif si supporté
        try {
          if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock("landscape");
          }
        } catch {}
      } else {
        await document.exitFullscreen?.();
        try { screen.orientation?.unlock?.(); } catch {}
      }
    } catch {
      // Si le plein écran natif est bloqué (ex: iframe sandbox), basculer en mode paysage forcé
      toggleLandscapeMode();
    }
  }

  // Mode Paysage Netflix Forcé (Plein écran horizontal même sur mobile restreint ou iframe)
  function toggleLandscapeMode() {
    const theater = document.getElementById("netflixTheater");
    if (!theater) return;

    isLandscapeForced = !isLandscapeForced;
    theater.classList.toggle("sf-netflix-theater--landscape", isLandscapeForced);
    document.body.classList.toggle("sf-lock-scroll", isLandscapeForced);
  }

  return { launchStream };
})();

// --- Chargement générique d'une grille de catalogue ---
const SyrixCatalog = (() => {
  async function loadGrid(gridEl, type, genre) {
    gridEl.innerHTML = `<div class="sf-placeholder"><div class="sf-spinner"></div><p>Chargement des titres...</p></div>`;
    const qs = genre ? "?genre=" + encodeURIComponent(genre) : "";
    const res = await SyrixAuth.api("/" + type + qs);
    const items = res.success ? (res.data || []) : [];

    if (!items.length) {
      gridEl.innerHTML = `<div class="sf-placeholder"><p>${
        res.success ? "Aucun titre disponible pour le moment." : (res.error?.message || "Erreur de chargement.")
      }</p></div>`;
      return;
    }
    gridEl.innerHTML = "";
    items.forEach((item) => {
      gridEl.insertAdjacentHTML("beforeend", sfMediaCard(item.title || "—", null, item.image, item.type || type, item.slug));
    });
  }

  return { loadGrid };
})();

// --- Enregistrement automatique PWA & Modules Bannières ---
(function () {
  if (typeof window === "undefined") return;

  // Enregistrement PWA Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[SYRIX] PWA Service Worker actif:", reg.scope))
        .catch((err) => console.warn("[SYRIX] SW registration warning:", err));
    });
  }

  // Initialisation automatique des Bannières (APK & Cookies)
  function bootBanners() {
    if (window.SyrixCookieConsent && typeof window.SyrixCookieConsent.init === "function") {
      window.SyrixCookieConsent.init();
    }
    if (window.SyrixApkBanner && typeof window.SyrixApkBanner.init === "function") {
      window.SyrixApkBanner.init({ delayMs: 1400 });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootBanners);
  } else {
    bootBanners();
  }
})();

