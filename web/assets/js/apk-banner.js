/**
 * SYRIX FLIX — Invite d'installation PWA & Téléchargement APK
 * Dès que l'utilisateur apparaît sur le site, on lui suggère d'installer la PWA ou
 * de télécharger l'APK Android.
 * Tant qu'il n'a pas téléchargé/installé l'application, la suggestion lui est
 * TOUJOURS proposée à chaque fois qu'il rejoint le site.
 */
(function () {
  const DOWNLOADED_KEY = "sf_app_downloaded";
  const SESSION_DISMISSED_KEY = "sf_app_session_dismissed";

  let deferredInstallPrompt = null;

  // Capture le prompt natif PWA sur Chromium / Android
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  window.addEventListener("appinstalled", () => {
    localStorage.setItem(DOWNLOADED_KEY, "true");
    closeModal();
  });

  function hasDownloadedApp() {
    return localStorage.getItem(DOWNLOADED_KEY) === "true";
  }

  function wasDismissedThisSession() {
    return sessionStorage.getItem(SESSION_DISMISSED_KEY) === "true";
  }

  function closeModal() {
    const modal = document.getElementById("sfPwaApkModal");
    if (!modal) return;
    modal.classList.remove("sf-modal--visible");
    setTimeout(() => modal.remove(), 300);
  }

  function init(options) {
    const opts = Object.assign(
      {
        apkUrl: "/downloads/syrix-flix.apk",
        delayMs: 1200,
      },
      options || {}
    );

    // Détection si l'app tourne déjà en mode standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      localStorage.setItem(DOWNLOADED_KEY, "true");
      return;
    }

    // Si l'utilisateur a déjà téléchargé ou installé l'application, on ne l'affiche plus
    if (hasDownloadedApp()) {
      return;
    }

    // S'il l'a ignoré durant l'onglet/session en cours, on ne le spamme pas à chaque changement de page interne,
    // mais dès qu'il quitte et rejoint à nouveau le site (nouvelle session), elle réapparaîtra toujours !
    if (wasDismissedThisSession()) {
      return;
    }

    // Affichage après un court délai fluide
    setTimeout(() => {
      if (document.getElementById("sfPwaApkModal")) return;
      if (hasDownloadedApp()) return;

      const isAndroid = /android/i.test(navigator.userAgent);
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

      const modalHtml = `
        <div class="sf-apk-modal" id="sfPwaApkModal" role="dialog" aria-modal="true">
          <div class="sf-apk-modal__backdrop" id="sfModalBackdrop"></div>
          <div class="sf-apk-modal__card">
            <!-- Badge cinématographique supérieur -->
            <div class="sf-apk-modal__badge">
              <span class="sf-live-dot"></span>
              APPLICATION OFFICIELLE SYRIX FLIX
            </div>

            <!-- Header avec icône moderne -->
            <div class="sf-apk-modal__header">
              <div class="sf-apk-modal__app-icon">
                <svg viewBox="0 0 100 100" width="48" height="48">
                  <defs>
                    <linearGradient id="mRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#ff2a38"/>
                      <stop offset="50%" stop-color="#e50914"/>
                      <stop offset="100%" stop-color="#800207"/>
                    </linearGradient>
                  </defs>
                  <rect width="100" height="100" rx="22" fill="#0e0507"/>
                  <path d="M 72 30 C 72 20 62 16 50 16 C 36 16 28 24 28 36 C 28 46 36 52 50 56 L 56 58 C 66 61 70 65 70 72 C 70 80 62 84 50 84 C 36 84 28 78 28 68 L 38 67 C 38 73 43 76 50 76 C 57 76 61 73 61 69 C 61 64 57 61 48 58 L 42 56 C 30 52 20 46 20 34 C 20 20 32 10 50 10 C 68 10 80 18 80 30 Z" fill="url(#mRibbon)"/>
                </svg>
              </div>
              <div class="sf-apk-modal__app-meta">
                <h3 class="sf-apk-modal__title">Installez SYRIX FLIX</h3>
                <p class="sf-apk-modal__sub">PWA &amp; APK Android &bull; Version 2.4.0</p>
              </div>
            </div>

            <!-- Avantages exclusifs -->
            <div class="sf-apk-modal__features">
              <div class="sf-apk-feature">
                <span class="sf-apk-feature__icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                </span>
                <span>Streaming 4K 60fps sans latence et sans pubs intrusives</span>
              </div>
              <div class="sf-apk-feature">
                <span class="sf-apk-feature__icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                </span>
                <span>Plein écran cinéma horizontal automatique sans barre d'URL</span>
              </div>
              <div class="sf-apk-feature">
                <span class="sf-apk-feature__icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                </span>
                <span>Accès direct depuis l'écran d'accueil &amp; mode hors-ligne</span>
              </div>
            </div>

            <!-- Guide iOS si applicable -->
            ${
              isIOS
                ? `<div class="sf-ios-hint">
                     <strong>Sur iPhone/iPad :</strong> appuyez sur <strong>Partager</strong> <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="vertical-align:middle"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/></svg> puis <strong>« Sur l'écran d'accueil »</strong>.
                   </div>`
                : ""
            }

            <!-- Boutons d'action -->
            <div class="sf-apk-modal__actions">
              <button class="sf-btn sf-btn--primary sf-btn--lg" id="sfInstallAppBtn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                <span>${isAndroid ? "Télécharger l'APK & Installer" : "Installer l'Application"}</span>
              </button>
              <button class="sf-btn sf-btn--ghost" id="sfDismissAppBtn">
                Continuer sur le site web
              </button>
            </div>
            <div class="sf-apk-modal__foot-note">
              Gratuit, sans publicité intrusive, compatible tous smartphones &amp; ordinateurs.
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);
      const modalEl = document.getElementById("sfPwaApkModal");
      requestAnimationFrame(() => modalEl.classList.add("sf-modal--visible"));

      // Gestionnaire Télécharger / Installer
      document.getElementById("sfInstallAppBtn").addEventListener("click", async () => {
        // Marque comme téléchargé pour ne plus redemander continuellement
        localStorage.setItem(DOWNLOADED_KEY, "true");

        // Si le prompt PWA est prêt, on l'invoque
        if (deferredInstallPrompt) {
          try {
            await deferredInstallPrompt.prompt();
            const choice = await deferredInstallPrompt.userChoice;
            if (choice.outcome === "accepted") {
              deferredInstallPrompt = null;
              closeModal();
              return;
            }
          } catch (err) {
            console.warn("PWA prompt error:", err);
          }
        }

        // Déclenche le téléchargement du package APK
        const a = document.createElement("a");
        a.href = opts.apkUrl;
        a.download = "syrix-flix.apk";
        document.body.appendChild(a);
        a.click();
        a.remove();

        closeModal();
      });

      // Gestionnaire "Continuer sur le site web" (Ignore pour cette session)
      document.getElementById("sfDismissAppBtn").addEventListener("click", () => {
        sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
        closeModal();
      });

      // Clic extérieur = ignorer pour cette session
      document.getElementById("sfModalBackdrop").addEventListener("click", () => {
        sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
        closeModal();
      });
    }, opts.delayMs);
  }

  // Permet de forcer la réouverture si l'utilisateur clique sur "Télécharger APK" dans le menu
  function promptAgain() {
    sessionStorage.removeItem(SESSION_DISMISSED_KEY);
    localStorage.removeItem(DOWNLOADED_KEY);
    init({ delayMs: 100 });
  }

  window.SyrixApkBanner = { init, promptAgain };
})();
