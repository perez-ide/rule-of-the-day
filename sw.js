const CACHE = 'rotd-v2';

const assets = [
  '/',
  '/index.html',
  '/css/tokens.css',
  '/css/reset.css',
  '/css/styles.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/anchors.js',
  '/js/queue.js',
  '/js/degraded.js',
  '/js/import.js',
  '/js/streak.js',
  '/js/quotes.js',
  '/js/ui.js',
  '/icons/icons.js',
  '/manifest.json',
  '/icons/hourglass.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(assets)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
