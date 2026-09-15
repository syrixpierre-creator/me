/**
 * SYRIX FLIX — Lecteur vidéo plein écran cinéma & rotation paysage universelle
 */
(function () {
  const ICONS = {
    play: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
    fullscreen: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
    fullscreenExit: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z"/></svg>`,
    rotate: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-12.96 19C.25 19.97-2.09 16.8-2.45 13.04H-3.95C-3.44 19.16 1.71 24 8 24l.66-.03-3.81-3.81-1.33 1.32zM19 7h-8c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 12h-8V9h8v10z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
    forward10: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.92 12c-.04-3.07-2.19-5.64-5.13-6.26l.48-1.92-3.89 1.48 2.45 3.39.5-2C15.4 7.15 17 9.38 17 12c0 3.31-2.69 6-6 6s-6-2.69-6-6H3c0 4.42 3.58 8 8 8s8-3.58 8-8zm-8.5 2.5h-1V10h1.5v3.5h-.5zm3 0h-2V10h2c.55 0 1 .45 1 1v2.5c0 .55-.45 1-1 1zm0-3.5h-1v2.5h1V11z"/></svg>`,
    replay10: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm-1.5 9.5h-1V11h1.5v3.5h-.5zm3 0h-2V11h2c.55 0 1 .45 1 1v2.5c0 .55-.45 1-1 1zm0-3.5h-1v2.5h1v-2.5z"/></svg>`,
  };

  function init(options) {
    const opts = Object.assign(
      { containerId: "", videoId: "", autoLockLandscapeOnFullscreen: true },
      options || {}
    );

    const container = document.getElementById(opts.containerId);
    const video = document.getElementById(opts.videoId);
    if (!container || !video) return;

    let isLandscapeForced = false;

    // --- Barre de contrôle moderne avec SVGs ---
    const controls = document.createElement("div");
    controls.className = "sf-player__controls";
    controls.innerHTML = `
      <button class="sf-icon-btn" data-action="play-pause" aria-label="Lecture/Pause">${ICONS.play}</button>
      <button class="sf-icon-btn" data-action="replay10" aria-label="Reculer 10s">${ICONS.replay10}</button>
      <button class="sf-icon-btn" data-action="forward10" aria-label="Avancer 10s">${ICONS.forward10}</button>
      <div class="sf-player__spacer"></div>
      <button class="sf-icon-btn" data-action="landscape-toggle" title="Mode Paysage / Horizontal">${ICONS.rotate}</button>
      <button class="sf-icon-btn" data-action="settings" aria-label="Réglages">${ICONS.settings}</button>
      <button class="sf-icon-btn" data-action="fullscreen" aria-label="Plein écran">${ICONS.fullscreen}</button>
    `;
    container.appendChild(controls);

    // --- Menu réglages ---
    const menu = document.createElement("div");
    menu.className = "sf-settings-menu";
    menu.innerHTML = `
      <div class="sf-settings-menu__group" data-group="speed">
        <div class="sf-settings-menu__item" data-speed="0.75">0.75x</div>
        <div class="sf-settings-menu__item" data-speed="1" data-active="true">Vitesse Normale (1x)</div>
        <div class="sf-settings-menu__item" data-speed="1.25">1.25x</div>
        <div class="sf-settings-menu__item" data-speed="1.5">1.5x</div>
        <div class="sf-settings-menu__item" data-speed="2">2x</div>
      </div>
    `;
    container.appendChild(menu);

    const playBtn = controls.querySelector('[data-action="play-pause"]');
    const fsBtn = controls.querySelector('[data-action="fullscreen"]');
    const rotateBtn = controls.querySelector('[data-action="landscape-toggle"]');
    const settingsBtn = controls.querySelector('[data-action="settings"]');

    // Lecture / pause
    playBtn.addEventListener("click", () => {
      if (video.paused) {
        video.play();
        playBtn.innerHTML = ICONS.pause;
      } else {
        video.pause();
        playBtn.innerHTML = ICONS.play;
      }
    });

    video.addEventListener("play", () => { playBtn.innerHTML = ICONS.pause; });
    video.addEventListener("pause", () => { playBtn.innerHTML = ICONS.play; });

    // Saut 10s
    controls.querySelector('[data-action="replay10"]').addEventListener("click", () => {
      video.currentTime = Math.max(0, video.currentTime - 10);
    });
    controls.querySelector('[data-action="forward10"]').addEventListener("click", () => {
      video.currentTime = Math.min(video.duration || 9999, video.currentTime + 10);
    });

    // Plein écran
    fsBtn.addEventListener("click", toggleFullscreen);

    // Basculement Mode Paysage / Horizontal Universel
    rotateBtn.addEventListener("click", toggleForcedLandscape);

    // Menu réglages toggle
    settingsBtn.addEventListener("click", () => {
      menu.classList.toggle("sf-settings-menu--open");
    });

    // Vitesse
    menu.querySelectorAll("[data-speed]").forEach((item) => {
      item.addEventListener("click", () => {
        video.playbackRate = parseFloat(item.getAttribute("data-speed"));
        menu.querySelectorAll("[data-speed]").forEach((i) => i.removeAttribute("data-active"));
        item.setAttribute("data-active", "true");
        menu.classList.remove("sf-settings-menu--open");
      });
    });

    // Implémentation du plein écran avec verrouillage d'orientation
    async function toggleFullscreen() {
      try {
        if (!document.fullscreenElement) {
          if (container.requestFullscreen) {
            await container.requestFullscreen();
          } else if (container.webkitRequestFullscreen) {
            await container.webkitRequestFullscreen();
          } else if (video.webkitEnterFullscreen) {
            video.webkitEnterFullscreen();
            return;
          }
          fsBtn.innerHTML = ICONS.fullscreenExit;

          if (opts.autoLockLandscapeOnFullscreen) {
            try {
              if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock("landscape");
              }
            } catch {
              // Si le verrouillage de l'écran n'est pas autorisé par le navigateur
              if (window.innerWidth < window.innerHeight) {
                toggleForcedLandscape();
              }
            }
          }
        } else {
          await document.exitFullscreen?.();
          fsBtn.innerHTML = ICONS.fullscreen;
          try { screen.orientation?.unlock?.(); } catch {}
          if (isLandscapeForced) toggleForcedLandscape();
        }
      } catch {
        toggleForcedLandscape();
      }
    }

    // Mode Horizontal Forcé (fonctionne sur 100% des téléphones, iOS Safari & iframes)
    function toggleForcedLandscape() {
      isLandscapeForced = !isLandscapeForced;
      container.classList.toggle("sf-player--landscape-forced", isLandscapeForced);
      document.body.classList.toggle("sf-lock-scroll", isLandscapeForced);
    }
  }

  window.SyrixPlayer = { init };
})();
