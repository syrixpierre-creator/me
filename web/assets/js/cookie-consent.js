/**
 * SYRIX FLIX — Gestion Professionnelle des Cookies & Confidentialité (RGPD)
 */
(function () {
  const STORAGE_KEY = "sf_cookie_consent_v2";

  function getSavedConsent() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function saveConsent(consent) {
    const data = Object.assign(
      {
        necessary: true,
        preferences: true,
        performance: true,
        timestamp: new Date().toISOString(),
      },
      consent
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    emit(data);
  }

  function emit(consent) {
    document.dispatchEvent(new CustomEvent("sf:cookie-consent", { detail: consent }));
  }

  function closeModal() {
    const banner = document.getElementById("sfCookieContainer");
    if (!banner) return;
    banner.classList.remove("sf-cookie--visible");
    setTimeout(() => banner.remove(), 320);
  }

  function showUI(forceOpen = false) {
    if (document.getElementById("sfCookieContainer")) return;
    const existing = getSavedConsent();
    if (existing && !forceOpen) {
      emit(existing);
      return;
    }

    const html = `
      <div class="sf-cookie-modal" id="sfCookieContainer" role="dialog" aria-modal="true">
        <div class="sf-cookie-backdrop" id="sfCookieBackdrop"></div>
        <div class="sf-cookie-panel">
          <div class="sf-cookie-head">
            <div class="sf-cookie-head__title-wrap">
              <span class="sf-cookie-shield">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
              </span>
              <div>
                <h3 class="sf-cookie-title">Gestion de la Confidentialité &amp; Cookies</h3>
                <p class="sf-cookie-sub">Transparence, sécurité et contrôle de vos préférences</p>
              </div>
            </div>
          </div>

          <p class="sf-cookie-desc">
            Chez <strong>SYRIX FLIX</strong>, nous protégeons vos données. Nous utilisons des traceurs sécurisés
            afin de mémoriser votre session, garantir la reprise automatique de vos flux vidéo en 4K Ultra HD
            et mesurer la stabilité de nos serveurs. Vous avez la liberté totale de personnaliser vos choix.
          </p>

          <!-- Accordéon de personnalisation -->
          <div class="sf-cookie-custom-box" id="sfCookieCustomBox" style="display:none;">
            <!-- Catégorie 1: Nécessaires -->
            <div class="sf-cookie-row">
              <div class="sf-cookie-row__info">
                <div class="sf-cookie-row__name">
                  <span>Cookies Essentiels &amp; Sécurité</span>
                  <span class="sf-cookie-tag sf-cookie-tag--required">Obligatoire</span>
                </div>
                <p class="sf-cookie-row__text">
                  Indispensables pour maintenir votre connexion chiffrée, la sécurité des clés API et la validation CSRF.
                </p>
              </div>
              <input type="checkbox" checked disabled class="sf-toggle" />
            </div>

            <!-- Catégorie 2: Préférences de streaming -->
            <div class="sf-cookie-row">
              <div class="sf-cookie-row__info">
                <div class="sf-cookie-row__name">
                  <span>Préférences de Streaming Vidéo &amp; 4K</span>
                  <span class="sf-cookie-tag">Recommandé</span>
                </div>
                <p class="sf-cookie-row__text">
                  Mémorise vos réglages de résolution (4K/1080p), le volume sonore, la langue des sous-titres et la progression d'épisode.
                </p>
              </div>
              <label class="sf-switch">
                <input type="checkbox" id="cookiePrefVideo" checked />
                <span class="sf-slider"></span>
              </label>
            </div>

            <!-- Catégorie 3: Performance & Réseau -->
            <div class="sf-cookie-row">
              <div class="sf-cookie-row__info">
                <div class="sf-cookie-row__name">
                  <span>Performance du Catalogue &amp; Diagnostics</span>
                  <span class="sf-cookie-tag">Optionnel</span>
                </div>
                <p class="sf-cookie-row__text">
                  Mesure anonyme de la latence de nos serveurs miroirs pour réduire les temps de chargement et le buffering.
                </p>
              </div>
              <label class="sf-switch">
                <input type="checkbox" id="cookiePrefPerf" checked />
                <span class="sf-slider"></span>
              </label>
            </div>
          </div>

          <div class="sf-cookie-links">
            <a href="confidentialite.html" target="_blank">Politique de Confidentialité</a> &bull;
            <a href="conditions-utilisation.html" target="_blank">Conditions Générales</a>
          </div>

          <!-- Actions principales -->
          <div class="sf-cookie-actions">
            <button class="sf-btn sf-btn--primary" id="sfAcceptAllCookies">
              Tout Accepter
            </button>
            <button class="sf-btn sf-btn--outline" id="sfToggleCustomize">
              Personnaliser
            </button>
            <button class="sf-btn sf-btn--ghost" id="sfRejectNonEssential">
              Continuer sans accepter
            </button>
            <button class="sf-btn sf-btn--primary" id="sfSaveCustomCookies" style="display:none;">
              Enregistrer mes choix
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
    const container = document.getElementById("sfCookieContainer");
    requestAnimationFrame(() => container.classList.add("sf-cookie--visible"));

    // Tout accepter
    document.getElementById("sfAcceptAllCookies").addEventListener("click", () => {
      saveConsent({ necessary: true, preferences: true, performance: true, choice: "all" });
      closeModal();
    });

    // Continuer sans accepter (uniquement nécessaires)
    document.getElementById("sfRejectNonEssential").addEventListener("click", () => {
      saveConsent({ necessary: true, preferences: false, performance: false, choice: "minimal" });
      closeModal();
    });

    // Basculer mode personnalisation
    const customBox = document.getElementById("sfCookieCustomBox");
    const customBtn = document.getElementById("sfToggleCustomize");
    const saveCustomBtn = document.getElementById("sfSaveCustomCookies");
    const acceptAllBtn = document.getElementById("sfAcceptAllCookies");
    const rejectBtn = document.getElementById("sfRejectNonEssential");

    customBtn.addEventListener("click", () => {
      const isHidden = customBox.style.display === "none";
      customBox.style.display = isHidden ? "block" : "none";
      customBtn.textContent = isHidden ? "Masquer les détails" : "Personnaliser";
      saveCustomBtn.style.display = isHidden ? "block" : "none";
      acceptAllBtn.style.display = isHidden ? "none" : "block";
      rejectBtn.style.display = isHidden ? "none" : "block";
    });

    // Enregistrer les choix personnalisés
    saveCustomBtn.addEventListener("click", () => {
      const videoOn = document.getElementById("cookiePrefVideo").checked;
      const perfOn = document.getElementById("cookiePrefPerf").checked;
      saveConsent({
        necessary: true,
        preferences: videoOn,
        performance: perfOn,
        choice: "custom",
      });
      closeModal();
    });
  }

  function init() {
    showUI(false);
  }

  function openSettings() {
    showUI(true);
  }

  window.SyrixCookieConsent = { init, openSettings, getSavedConsent };
})();
