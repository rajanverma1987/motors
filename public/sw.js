/* IQMotorBase PWA service worker — installability only (do not block navigations). */
const SW_VERSION = "iqmotorbase-pwa-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("iqmotorbase-pwa-")).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

// Required for Chromium installability. Do not call respondWith — let the browser
// handle all requests so tablet/LAN loads and Next.js HMR never hang in the SW.
self.addEventListener("fetch", () => {});
