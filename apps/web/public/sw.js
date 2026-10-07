const CACHE_NAME = 'nirware-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache static assets and HTML
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((res) => {
            // Cache successful GET api requests or assets
            if (res.status === 200 && (url.pathname.startsWith('/assets') || url.pathname.startsWith('/api/v1/products'))) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return res;
          })
          .catch(() => {
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
    );
  }
});
