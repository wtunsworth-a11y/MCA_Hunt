/*
 * sw.js — service worker for offline use of the hosted (multi-file) build.
 *
 * Precaches the app shell so that after the first online visit the app loads
 * and runs with no connectivity. Bump CACHE when any asset changes.
 *
 * (The single-file build, MCA_Hunt_Survey.html, does not use a service worker
 * — opened from disk it is already fully offline.)
 */
const CACHE = 'mca-hunt-v1';
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
  './data/reference.json',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for app-shell requests; network fallback keeps it working online.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
