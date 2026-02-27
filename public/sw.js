const CACHE_NAME = "marks-v1";
const READER_CACHE = "marks-reader-v1";

// Pre-cache the shell on install
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean old caches
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== READER_CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Reader pages — cache for offline reading
  if (url.pathname.startsWith("/reader/")) {
    event.respondWith(networkFirstWithCache(event.request, READER_CACHE));
    return;
  }

  // API calls — network only
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Everything else — network first, fall back to cache
  event.respondWith(networkFirstWithCache(event.request, CACHE_NAME));
});

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Nothing in cache either — return offline fallback for HTML
    if (request.headers.get("accept")?.includes("text/html")) {
      return new Response(
        "<html><body style='font-family:system-ui;text-align:center;padding:4rem'><h1>Offline</h1><p>Check your connection and try again.</p></body></html>",
        { headers: { "Content-Type": "text/html" } },
      );
    }

    return new Response("Offline", { status: 503 });
  }
}
