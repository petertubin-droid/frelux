// FRELUX PAINT CALC — Service Worker v3
// Cache-first for static assets, network-first for navigation, offline calculator support, push notifications

const CACHE_VERSION = 'frelux-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CALCULATOR_CACHE = `${CACHE_VERSION}-calculators`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
];

// Calculator pages to cache for offline use
const CALCULATOR_PAGES = [
  '/paint-calculator',
  '/cost-estimator',
  '/screeding-calculator',
  '/tile-calculator',
  '/pop-ceiling-calculator',
  '/screeding-cost-estimator',
  '/tile-cost-estimator',
  '/pop-ceiling-cost-estimator',
  '/finish-estimator',
];

// Install — pre-cache critical static assets and calculator pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(CALCULATOR_CACHE).then((cache) =>
        Promise.allSettled(
          CALCULATOR_PAGES.map((page) =>
            fetch(page).then((res) => {
              if (res.ok) return cache.put(page, res);
            }).catch(() => {})
          )
        )
      ),
    ])
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('frelux-') && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin requests (Supabase, fonts, analytics)
  if (url.origin !== self.location.origin) return;

  // Skip admin routes — always fetch fresh
  if (url.pathname.startsWith('/admin')) return;

  // Navigation requests — network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          const cacheName = CALCULATOR_PAGES.some((p) => url.pathname.startsWith(p))
            ? CALCULATOR_CACHE
            : RUNTIME_CACHE;
          caches.open(cacheName).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // Static assets — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Listen for messages from the page
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// =========================================================
// PUSH NOTIFICATIONS
// =========================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'FRELUX', body: event.data.text() };
  }

  const title = payload.title || 'FRELUX PAINT CALC';
  const body = payload.body || '';
  const url = payload.url || '/messages';
  const icon = payload.icon || '/icon-192.png';
  const badge = payload.badge || '/icon-192.png';
  const tag = payload.tag || 'frelux-message';

  const options: NotificationOptions = {
    body,
    icon,
    badge,
    tag,
    data: { url },
    requireInteraction: payload.requireInteraction || false,
    actions: payload.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — focus or open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/messages';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a client is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Handle notification action buttons
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/messages';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
