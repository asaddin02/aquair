/* AQUAIR service worker: aplikasi tetap terbuka saat sinyal hilang. Data API tidak pernah di-cache. */
const VERSI = 'aquair-v5';
const CANGKANG = ['/', '/index.html', '/manifest.json', '/ikon-192.png', '/ikon-512.png', '/ikon-maskable-512.png', '/apple-touch-icon.png', '/favicon-32.png', '/brand/aquair-mark.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(CANGKANG)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((kunci) => Promise.all(kunci.filter((k) => k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).then((r) => {
      const salinan = r.clone();
      caches.open(VERSI).then((c) => c.put('/index.html', salinan));
      return r;
    }).catch(() => caches.match('/index.html')));
    return;
  }

  if (url.pathname.startsWith('/static/') || CANGKANG.includes(url.pathname)) {
    e.respondWith(caches.open(VERSI).then(async (c) => {
      const tersimpan = await c.match(request);
      const segar = fetch(request).then((r) => { if (r.ok) c.put(request, r.clone()); return r; }).catch(() => tersimpan);
      return tersimpan || segar;
    }));
  }
});
