// Bump VERSION each time you update the app so phones fetch the new files.
const VERSION = 'myshop-v1';
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'db.js', 'i18n.js', 'mascots.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'icon-maskable-512.png', 'apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match('index.html'));
    })
  );
});
