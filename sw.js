// Bump VERSION each time you update the app so phones fetch the new files.
const VERSION = 'myshop-v8';
const ASSETS = [
  './', 'index.html', 'style.css',
  'i18n.js', 'db.js', 'sfx.js', 'mascots.js', 'data.js',
  'core.js', 'money.js', 'economy.js', 'views.js', 'nav.js', 'actions.js', 'cpu.js', 'skills.js', 'app.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'icon-maskable-512.png', 'apple-touch-icon.png'
];

// Only the install of a new VERSION fills a cache, all files at once from the network.
// If any file fails, the install fails and the old version keeps running: files are never mixed.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(ASSETS.map(a => fetch(new Request(a, { cache: 'reload' })).then(r => {
      if (!r.ok) throw new Error('fetch ' + a);
      return c.put(a, r);
    }))))
    .then(() => self.skipWaiting())
    .catch(err => caches.delete(VERSION).then(() => { throw err; })));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve the app files from this version's cache only (never written to after install).
// Anything else goes to the network; offline navigation falls back to the cached index.html.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(VERSION).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).catch(() => e.request.mode === 'navigate' ? c.match('index.html') : Response.error());
    }))
  );
});
