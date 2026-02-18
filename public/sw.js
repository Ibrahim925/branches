const CACHE_VERSION = 'branches-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = ['/', '/login', '/dashboard', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function shouldHandle(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/')) return false;
  return true;
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function cacheSuccessfulResponse(cacheName, request, response) {
  if (!response || !response.ok) return;
  const cloned = response.clone();
  void caches.open(cacheName).then((cache) => cache.put(request, cloned));
}

function offlineDocumentFallback() {
  return new Response(
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{font-family:Inter,system-ui,sans-serif;padding:24px;color:#3A3A3A;background:#fff}h1{font-size:20px;margin:0 0 8px}p{opacity:.75;margin:0}</style></head><body><h1>You are offline</h1><p>Reconnect to continue syncing your latest Branches updates.</p></body></html>',
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!shouldHandle(request)) return;

  const isDocument = request.mode === 'navigate';
  const isStaticAsset =
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image';

  if (isDocument) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          cacheSuccessfulResponse(RUNTIME_CACHE, request, response);
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match('/');
          return rootCached || offlineDocumentFallback();
        })
    );
    return;
  }

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            cacheSuccessfulResponse(STATIC_CACHE, request, response);
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        cacheSuccessfulResponse(RUNTIME_CACHE, request, response);
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error('offline');
      })
  );
});
