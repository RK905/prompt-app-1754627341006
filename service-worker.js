// Service Worker for "A weather app with current conditions" PWA
const CACHE_NAME = 'weather-app-v1';
const RUNTIME_CACHE = 'weather-runtime-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/offline-weather.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/images/sunny.svg',
  '/images/cloudy.svg'
];

// Install event - pre-cache core resources for fast load & offline UI
self.addEventListener('install', event => {
  // Activate worker immediately after install
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching core assets for Weather App');
        return cache.addAll(urlsToCache);
      })
  );
});

// Helper: Network-first strategy for API (current conditions)
// Fetch from network, update runtime cache, fallback to cache on failure
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    // Only cache successful GET responses
    if (request.method === 'GET' && response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // As last resort, try core cache (e.g., offline-weather.html for navigations)
    return caches.match('/offline-weather.html');
  }
}

// Helper: Cache-first strategy for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    if (request.method === 'GET' && response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // If request is a navigation, show offline page
    if (request.mode === 'navigate' || (request.headers && request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
      return caches.match('/offline-weather.html');
    }
    // No cached response found
    return new Response('Service unavailable', { status: 503, statusText: 'Offline' });
  }
}

// Fetch event - apply different strategies based on request type
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Treat navigations (app shell) specially: try cache first, then network
  const isNavigation = request.mode === 'navigate' || (request.headers && request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

  // Identify likely weather API calls by path or host (adjust to your API domain if needed)
  const isWeatherApi = url.pathname.includes('/weather') ||
                       url.pathname.includes('/api/weather') ||
                       url.hostname.includes('openweathermap.org') ||
                       url.hostname.includes('weatherapi.com');

  if (isWeatherApi) {
    // Network-first for current conditions so users get freshest data when online
    event.respondWith(networkFirst(request));
    return;
  }

  if (isNavigation) {
    // Serve the app shell from cache, fallback to network, fallback to offline page
    event.respondWith(
      caches.match('/index.html').then(resp => {
        return resp || fetch(request).catch(() => caches.match('/offline-weather.html'));
      })
    );
    return;
  }

  // For other requests (static assets), use cache-first for speed
  event.respondWith(cacheFirst(request));
});

// Activate event - clean up old caches and take control of clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Immediately take control of uncontrolled clients
      return self.clients.claim();
    })
  );
});

// Allow the web app to trigger skipWaiting via postMessage
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications for severe weather or periodic updates
self.addEventListener('push', event => {
  let title = 'Weather Update';
  let options = {
    body: 'Tap to open current conditions.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'weather-update',
    renotify: true,
    data: { url: '/' } // default action
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      options.icon = data.icon || options.icon;
      options.data.url = data.url || options.data.url;
    } catch (e) {
      // If not JSON, use text as body
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler - focus or open app and navigate to provided URL (e.g., details or alerts)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Try to focus an open window
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Optional: Periodic sync (if supported) - attempt to refresh current conditions in background
self.addEventListener('periodicsync', event => {
  if (event.tag === 'sync-current-conditions') {
    event.waitUntil(
      // Trigger a fetch on a known API endpoint to refresh cache
      fetch('/api/weather/current').then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return caches.open(RUNTIME_CACHE).then(cache => cache.put('/api/weather/current', response));
      }).catch(err => {
        console.warn('[ServiceWorker] Periodic sync failed:', err);
      })
    );
  }
});