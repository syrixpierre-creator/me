/**
 * Lecteur SYRIX FLIX : plein écran + menu réglages (vitesse, rotation).
 *
 * Utilisation :
 *   <div id="player-container" class="sf-player">
 *     <video id="player-video" src="..." playsinline></video>
 *   </div>
 *   <script src="assets/js/video-player.js"></script>
 *   <script>
 *     SyrixPlayer.init({
 *       containerId: "player-container",
 *       videoId: "player-video",
 *       autoLockLandscapeOnFullscreen: true, // verrouille en paysage à l'entrée plein écran
 *     });
 *   </script>
 */
(function () {
  function init(options) {
    const opts = Object.assign(
      { containerId: "", videoId: "", autoLockLandscapeOnFullscreen: true },
      options || {}
    );

    const container = document.getElementById(opts.containerId);
    const video = document.getElementById(opts.videoId);
    if (!container || !video) return;

    let rotationMode = "auto"; // auto | portrait | landscape

    // --- Barre de contrôle ---
    const controls = document.createElement("div");
    controls.className = "sf-player__controls";
    controls.innerHTML = `
      <button class="sf-icon-btn" data-action="play-pause" aria-label="Lecture/Pause">▶</button>
      <div class="sf-player__spacer"></div>
      <button class="sf-icon-btn" data-action="settings" aria-label="Réglages">⚙</button>
      <button class="sf-icon-btn" data-action="fullscreen" aria-label="Plein écran">⛶</button>
    `;
    container.appendChild(controls);

    // --- Menu réglages ---
    const menu = document.createElement("div");
    menu.className = "sf-settings-menu";
    menu.innerHTML = `
      <div class="sf-settings-menu__group" data-group="speed">
        <div class="sf-settings-menu__item" data-speed="0.5">0.5x</div>
        <div class="sf-settings-menu__item" data-speed="1" data-active="true">Normal (1x)</div>
        <div class="sf-settings-menu__item" data-speed="1.5">1.5x</div>
        <div class="sf-settings-menu__item" data-speed="2">2x</div>
      </div>
      <div style="height:1px;background:var(--sf-border);margin:6px 0;"></div>
      <div class="sf-settings-menu__group" data-group="rotation">
        <div class="sf-settings-menu__item" data-rotation="auto" data-active="true">Rotation automatique</div>
        <div class="sf-settings-menu__item" data-rotation="portrait">Verrouiller portrait</div>
        <div class="sf-settings-menu__item" data-rotation="landscape">Verrouiller paysage</div>
      </div>
    `;
    container.appendChild(menu);

    // --- Lecture / pause ---
    const playBtn = controls.querySelector('[data-action="play-pause"]');
    playBtn.addEventListener("click", () => {
      if (video.paused) { video.play(); playBtn.textContent = "⏸"; }
      else { video.pause(); playBtn.textContent = "▶"; }
    });

    // --- Vitesse de lecture ---
    menu.querySelectorAll("[data-speed]").forEach((item) => {
      item.addEventListener("click", () => {
        video.playbackRate = parseFloat(item.getAttribute("data-speed"));
        menu.querySelectorAll("[data-speed]").forEach((i) => i.removeAttribute("data-active"));
        item.setAttribute("data-active", "true");
      });
    });

    // --- Rotation ---
    menu.querySelectorAll("[data-rotation]").forEach((item) => {
      item.addEventListener("click", async () => {
        rotationMode = item.getAttribute("data-rotation");
        menu.querySelectorAll("[data-rotation]").forEach((i) => i.removeAttribute("data-active"));
        item.setAttribute("data-active", "true");
        await applyRotation(rotationMode);
      });
    });

    async function applyRotation(mode) {
      // L'API Screen Orientation ne fonctionne généralement qu'en plein écran,
      // et n'est pas supportée partout (notamment iOS Safari) — on échoue en silence.
      try {
        if (!screen.orientation || !screen.orientation.lock) return;
        if (mode === "auto") {
          screen.orientation.unlock();
        } else if (mode === "portrait") {
          await screen.orientation.lock("portrait");
        } else if (mode === "landscape") {
          await screen.orientation.lock("landscape");
        }
      } catch (err) {
        console.warn("[SyrixPlayer] Verrouillage de rotation non supporté :", err.message);
      }
    }

    // --- Toggle du menu réglages ---
    controls.querySelector('[data-action="settings"]').addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("sf-open");
    });
    document.addEventListener("click", () => menu.classList.remove("sf-open"));

    // --- Plein écran ---
    controls.querySelector('[data-action="fullscreen"]').addEventListener("click", async () => {
      if (!document.fullscreenElement) {
        await container.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    });

    document.addEventListener("fullscreenchange", async () => {
      const isFullscreen = document.fullscreenElement === container;
      container.classList.toggle("sf-fullscreen", isFullscreen);
      if (isFullscreen && opts.autoLockLandscapeOnFullscreen && rotationMode === "auto") {
        await applyRotation("landscape");
      }
      if (!isFullscreen) {
        // On relâche le verrouillage en sortant du plein écran
        try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch {}
      }
    });

    // Affiche les contrôles au tap sur mobile (au lieu du hover)
    container.addEventListener("click", (e) => {
      if (e.target === container || e.target === video) {
        container.classList.toggle("sf-controls-visible");
      }
    });
  }

  window.SyrixPlayer = { init };
})();
