/* 3PhaseFlow PWA service worker — installability + network-only (no stale app cache). */
const SW_VERSION = "3phaseflow-pwa-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("3phaseflow-pwa-") || key.startsWith("iqmotorbase-pwa-"))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});

/**
 * Chromium WebAPK minting expects a fetch handler. Network-only passthrough —
 * do not cache app shells (keeps Next.js / auth correct).
 */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      new Response("You are offline. Reconnect to use 3PhaseFlow.", {
        status: 503,
        statusText: "Offline",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    )
  );
});
