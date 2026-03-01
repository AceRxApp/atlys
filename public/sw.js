const CACHE_NAME = 'nxstops-v12';
const API_CACHE_NAME = 'nxstops-api-v8';
const ASSETS_CACHE_NAME = 'nxstops-assets-v8';
const API_CACHE_MAX_AGE = 4 * 60 * 60 * 1000; // 4 hours in ms (reduced from 24h to prevent stale city data)
const API_CACHE_MAX_ENTRIES = 50;
const API_ROUTES = ['/api/places', '/api/events', '/api/weather', '/api/currency'];
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
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
  const keepCaches = [CACHE_NAME, API_CACHE_NAME, ASSETS_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keepCaches.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Offline save: cache specific URLs on demand from the client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    event.waitUntil(
      caches.open(ASSETS_CACHE_NAME).then(async (cache) => {
        let cached = 0;
        for (const url of urls) {
          try {
            const response = await fetch(url, { mode: 'no-cors' });
            if (response.ok || response.type === 'opaque') {
              await cache.put(url, response);
              cached++;
            }
          } catch { /* skip failed */ }
        }
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHE_COMPLETE', total: urls.length, cached });
        });
      })
    );
  }

  if (event.data?.type === 'CACHE_API') {
    const urls = event.data.urls;
    event.waitUntil(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        for (const url of urls) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch { /* skip */ }
        }
      })
    );
  }
});

// Helper: trim cache to max entries (LRU-style, remove oldest)
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    for (let i = 0; i < keys.length - maxEntries; i++) {
      await cache.delete(keys[i]);
    }
  }
}

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
  }).catch(() => response);
}

// Fetch — network-first with cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests — let the browser handle external images, fonts, etc. natively
  let requestUrl;
  try { requestUrl = new URL(event.request.url); } catch { return; }
  if (requestUrl.origin !== self.location.origin) return;

  // Handle API requests with separate cache + timeout
  const isApiRequest = API_ROUTES.some((route) => event.request.url.includes(route));
  if (isApiRequest) {
    event.respondWith(
      fetchWithTimeout(event.request, 5000)
        .then((response) => {
          if (response.ok) {
            const cloneForCache = response.clone();
            stampResponse(cloneForCache).then((stamped) => {
              caches.open(API_CACHE_NAME).then((cache) => {
                cache.put(event.request, stamped);
                trimCache(API_CACHE_NAME, API_CACHE_MAX_ENTRIES);
              });
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

  // Hashed build assets (JS/CSS with hash in filename) — cache-first (immutable)
  const isHashedAsset = /\/assets\/.*\.[a-f0-9]{8,}\.(js|css|woff2?)$/.test(requestUrl.pathname);
  if (isHashedAsset) {
    event.respondWith(
      caches.open(ASSETS_CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Navigation requests — network-first, fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Other static assets — network-first with cache fallback
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
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = (typeof data.title === 'string' && data.title.length < 200) ? data.title : 'NxStops';
  const body = (typeof data.body === 'string' && data.body.length < 500) ? data.body : 'Check out what\'s happening nearby!';
  const url = (typeof data.url === 'string' && data.url.startsWith('/')) ? data.url : '/';
  const options = {
    body: body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: url,
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
