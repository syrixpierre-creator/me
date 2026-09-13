/**
 * Bannière "Télécharger l'app SYRIX FLIX" — s'affiche à l'arrivée sur le site,
 * l'utilisateur peut télécharger l'APK OU ignorer et continuer sur le site web.
 * Le choix "Ignorer" est mémorisé (ne réapparaît plus avant N jours).
 *
 * Utilisation :
 *   <script src="assets/js/apk-banner.js"></script>
 *   <script>
 *     SyrixApkBanner.init({
 *       apkUrl: "/downloads/syrix-flix.apk",
 *       onlyAndroid: true,      // n'affiche la bannière que sur Android (recommandé)
 *       remindAfterDays: 7,     // redemande après ce délai si ignoré
 *     });
 *   </script>
 */
(function () {
  const STORAGE_KEY = "sf_apk_banner_dismissed_at";

  function isAndroid() {
    return /android/i.test(navigator.userAgent);
  }

  function wasRecentlyDismissed(remindAfterDays) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    const elapsedDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return elapsedDays < remindAfterDays;
  }

  function init(options) {
    const opts = Object.assign(
      { apkUrl: "#", onlyAndroid: true, remindAfterDays: 7 },
      options || {}
    );

    if (opts.onlyAndroid && !isAndroid()) return;
    if (wasRecentlyDismissed(opts.remindAfterDays)) return;

    const banner = document.createElement("div");
    banner.className = "sf-apk-banner";
    banner.innerHTML = `
      <div class="sf-apk-banner__icon">S</div>
      <div class="sf-apk-banner__text">
        <p class="sf-apk-banner__title">Profitez de SYRIX FLIX en app</p>
        <p class="sf-apk-banner__subtitle">Streaming plus fluide, notifications, mode hors-ligne.</p>
      </div>
      <div class="sf-apk-banner__actions">
        <button class="sf-btn sf-btn--ghost" data-action="dismiss">Continuer sur le site</button>
        <a class="sf-btn sf-btn--primary" href="${opts.apkUrl}" data-action="download">Télécharger l'APK</a>
      </div>
    `;
    document.body.appendChild(banner);

    requestAnimationFrame(() => banner.classList.add("sf-show"));

    function dismiss() {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      banner.classList.remove("sf-show");
      setTimeout(() => banner.remove(), 350);
    }

    banner.querySelector('[data-action="dismiss"]').addEventListener("click", dismiss);
    // Télécharger l'APK ferme aussi la bannière (l'utilisateur a fait son choix)
    banner.querySelector('[data-action="download"]').addEventListener("click", dismiss);
  }

  window.SyrixApkBanner = { init };
})();
