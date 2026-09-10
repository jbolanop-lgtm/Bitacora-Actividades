// Service Worker — Bitácora de Control
// Cachea el "app shell" (HTML, manifest, íconos) para que la app cargue
// aunque no haya conexión. Las llamadas a Firebase/Firestore y a fuentes
// externas NO se interceptan: siempre van directo a la red.

const CACHE_NAME = "bitacora-control-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo controlamos peticiones GET del mismo origen (el app shell).
  // Todo lo externo (Firebase, Firestore, Google Fonts, CDN) pasa de largo
  // directo a la red, sin pasar por el service worker.
  if (req.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached || caches.match("./index.html"));

      // Cache-first: responde rápido desde caché si existe, y actualiza en segundo plano.
      return cached || networkFetch;
    })
  );
});
