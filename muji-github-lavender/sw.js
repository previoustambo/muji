const CACHE_PREFIX = `muji-${self.registration.scope}-`;
const CACHE = `${CACHE_PREFIX}lavender-v1`;
const ASSETS = ['./', './index.html', './styles.css', './app.mjs', './model.mjs', './manifest.webmanifest', './assets/icon.svg', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png'];
const assetURLs = new Set(ASSETS.map(path => new URL(path, self.location).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL('./index.html', self.location).href)));
    return;
  }
  if (!assetURLs.has(event.request.url)) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
