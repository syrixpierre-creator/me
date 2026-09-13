/**
 * Bandeau de consentement cookies. Le choix est mémorisé dans localStorage
 * ("accepted" | "rejected") et un évènement `sf:cookie-consent` est émis
 * pour que le reste du site (analytics, etc.) réagisse.
 *
 * Utilisation :
 *   <script src="assets/js/cookie-consent.js"></script>
 *   <script>SyrixCookieConsent.init();</script>
 *
 *   document.addEventListener('sf:cookie-consent', (e) => {
 *     if (e.detail.choice === 'accepted') { / * activer analytics * / }
 *   });
 */
(function () {
  const STORAGE_KEY = "sf_cookie_consent";

  function init(options) {
    const opts = Object.assign(
      {
        privacyUrl: "confidentialite.html",
        termsUrl: "conditions-utilisation.html",
      },
      options || {}
    );

    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      emit(existing);
      return;
    }

    const banner = document.createElement("div");
    banner.className = "sf-cookie-banner";
    banner.innerHTML = `
      <p>
        Nous utilisons des cookies pour améliorer votre expérience et mesurer
        l'audience du site. Consultez notre
        <a href="${opts.privacyUrl}">politique de confidentialité</a> et nos
        <a href="${opts.termsUrl}">conditions d'utilisation</a>.
      </p>
      <div class="sf-cookie-banner__actions">
        <button class="sf-btn sf-btn--ghost" data-choice="rejected">Refuser</button>
        <button class="sf-btn sf-btn--primary" data-choice="accepted">Accepter</button>
      </div>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add("sf-show"));

    banner.querySelectorAll("[data-choice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const choice = btn.getAttribute("data-choice");
        localStorage.setItem(STORAGE_KEY, choice);
        banner.classList.remove("sf-show");
        setTimeout(() => banner.remove(), 350);
        emit(choice);
      });
    });
  }

  function emit(choice) {
    document.dispatchEvent(new CustomEvent("sf:cookie-consent", { detail: { choice } }));
  }

  window.SyrixCookieConsent = { init };
})();
