/* FoodBridge service worker: offline support.
 * - Static assets (/_next/static, icons, fonts, images): cache-first.
 * - Pages, RSC payloads and read-only API calls: network-first, falling back to the last saved copy.
 * - Page navigations with nothing saved fall back to /offline.
 * Saved pages/data are wiped on log out (see lib/pwa.ts) so accounts never leak on shared devices.
 */
const VERSION = "v1";
const STATIC = `fb-static-${VERSION}`;
const RUNTIME = `fb-runtime-${VERSION}`;
const MAX_RUNTIME_ENTRIES = 120;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];
const NEVER_CACHE = [/^\/api\/v1\/auth\//, /^\/api\/v1\/chat/, /^\/api\/v1\/uploads\//, /^\/api\/v1\/cron\//, /^\/api\/docs/, /^\/api\/v1\/me\/notifications\/stream/];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "CLEAR_USER_CACHE") event.waitUntil(caches.delete(RUNTIME));
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, isNavigation) {
  const cache = await caches.open(RUNTIME);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") {
      cache.put(request, res.clone()).then(() => trim(RUNTIME, MAX_RUNTIME_ENTRIES));
    }
    return res;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (isNavigation) {
      const offline = await caches.match("/offline");
      if (offline) return offline;
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // map tiles, Supabase, fonts CDN: leave to the browser
  if (url.pathname === "/sw.js" || NEVER_CACHE.some((re) => re.test(url.pathname))) return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i.test(url.pathname);

  if (isStatic) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(networkFirst(request, request.mode === "navigate"));
});
