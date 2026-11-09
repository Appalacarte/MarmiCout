/**
 * Service Worker MarmiCout
 * Assure la mise en cache de l'app shell et l'installabilité PWA sur PC, Mac et Mobile (Chrome, Edge, Safari).
 * Ne modifie en aucune manière le stockage des données utilisateur (localStorage / IndexedDB).
 */

const CACHE_NAME = 'marmicout-app-shell-v2';
const APP_SHELL_RESOURCES = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/brand/icon.svg',
  '/brand/logo-marmicout.svg',
  '/brand/logo-marmicout-fond-sombre.svg',
  '/icons/favicon.svg',
  '/icons/favicon-32.png',
  '/icons/favicon-16.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png'
];

// Installation : mise en cache des assets essentiels de l'App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_RESOURCES).catch((err) => {
        console.warn('[Service Worker] Échec partiel de mise en cache de l’app shell :', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch : Stratégie Network-first avec secours sur le cache pour l'App Shell
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non GET ou externes
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Gestion de la navigation principale SPA
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Assets statiques : Network falling back to Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache si la réponse est valide
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
