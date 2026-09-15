/**
 * SYRIX FLIX — Service Worker PWA (Offline & Fast Streaming Cache)
 */

const CACHE_NAME = "syrix-flix-v2";
const STATIC_ASSETS = [
  "/",
  "/accueil.html",
  "/manifest.json",
  "/assets/css/site.css",
  "/assets/css/app.css",
  "/assets/js/app-common.js",
  "/assets/js/apk-banner.js",
  "/assets/js/cookie-consent.js",
  "/assets/icons/icon.svg",
  "/assets/icons/pwa-192.png",
  "/assets/icons/pwa-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Cache preload partial:", err);
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ne pas cacher les appels d'API dynamiques ni les requêtes non-GET
  if (req.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // Network First avec Fallback Cache pour les pages HTML
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/accueil.html")))
    );
    return;
  }

  // Cache First pour les images et styles statiques
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.status === 200 && (url.pathname.startsWith("/assets/") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".png"))) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});
