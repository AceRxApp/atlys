const CACHE_NAME = 'nxstops-v2';
const API_CACHE_NAME = 'nxstops-api-v1';
const API_CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in ms
const API_ROUTES = ['/api/places', '/api/events'];
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  const keepCaches = [CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keepCaches.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Helper: fetch with timeout
function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timed out'));
    }, timeoutMs);
    fetch(request, { signal: controller.signal })
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Helper: check if API cache entry is expired (older than 24h)
function isApiCacheExpired(response) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;
  return (Date.now() - parseInt(cachedAt, 10)) > API_CACHE_MAX_AGE;
}

// Helper: clone response with timestamp header for cache expiry tracking
function stampResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', String(Date.now()));
  return response.arrayBuffer().then((body) => {
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    });
  });
}

// Fetch — network-first with cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Handle API requests with separate cache + timeout
  const isApiRequest = API_ROUTES.some((route) => event.request.url.includes(route));
  if (isApiRequest) {
    event.respondWith(
      fetchWithTimeout(event.request, 5000)
        .then((response) => {
          if (response.ok) {
            const cloneForCache = response.clone();
            stampResponse(cloneForCache).then((stamped) => {
              caches.open(API_CACHE_NAME).then((cache) => cache.put(event.request, stamped));
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed or timed out — serve from cache
          return caches.open(API_CACHE_NAME).then((cache) =>
            cache.match(event.request).then((cached) => {
              if (cached) return cached;
              // No cache available — return offline JSON error
              return new Response(
                JSON.stringify({ error: 'offline', message: 'No cached data available' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            })
          );
        })
    );
    return;
  }

  // Static assets — network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'NxStops';
  const options = {
    body: data.body || 'Check out what\'s happening nearby!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/',
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
        clients[0].navigate(event.notification.data);
      } else {
        self.clients.openWindow(event.notification.data);
      }
    })
  );
});
