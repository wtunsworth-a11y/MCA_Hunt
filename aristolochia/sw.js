/*
 * sw.js — service worker for offline use AND reliable updates.
 *
 * Strategy: precache the app shell for instant offline load, then serve with
 * "stale-while-revalidate" — the page loads instantly from cache, and each GET
 * is refreshed from the network in the background whenever the device is
 * online. So after a new version is deployed, an installed app picks it up the
 * next time it's opened with connectivity (applied on the following open).
 *
 * Plot data lives in IndexedDB, which is NEVER touched here — updates refresh
 * code only and never delete saved plots.
 *
 * Bump CACHE on a deploy you want to force a clean re-cache for (e.g. a schema
 * change). Content changes propagate without a bump thanks to revalidation.
 */
const CACHE = 'mca-aristolochia-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/config.js',
  './js/db.js',
  './js/schema.js',
  './js/export.js',
  './js/app.js',
  '../data/reference.json',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for same-origin GETs: serve cache immediately, update
// the cache from the network in the background so the next open is fresh.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await network) || new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
