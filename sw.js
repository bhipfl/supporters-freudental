/**
 * Service Worker für Supporters Freudental
 * Ermöglicht Offline-Nutzung: cached die App-Dateien beim ersten Besuch,
 * danach läuft die App auch ohne Internetverbindung (Daten in localStorage).
 */
const CACHE_NAME = 'supporters-freudental-v11';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './apple-touch-icon-120.png',
  './apple-touch-icon-152.png',
  './apple-touch-icon-167.png',
  './favicon-16.png',
  './favicon-32.png',
  './fixtures/index.json',
  './fixtures/2025-26.json',
  './fixtures/2026-27.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(resp => {
        if (resp && resp.status === 200) {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, respClone));
        }
        return resp;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
  );
});
