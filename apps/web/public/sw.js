/**
 * PWA Service Worker
 *
 * This service worker provides offline functionality, caching strategies,
 * and background sync capabilities for the Gunpla Collection Manager app.
 */

const CACHE_NAME = 'gunpla-app-v1';
const STATIC_CACHE_NAME = 'gunpla-static-v1';
const RUNTIME_CACHE_NAME = 'gunpla-runtime-v1';

// Files that should always be cached
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.ico'
];

// API endpoints that can be cached
const API_CACHE_URLS = [
  '/api/kits',
  '/api/grades',
  '/api/series'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME &&
                cacheName !== RUNTIME_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Failed to activate service worker:', error);
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests except for known CDNs
  if (url.origin !== self.location.origin && !isAllowedCDN(url.origin)) {
    return;
  }

  event.respondWith(handleRequest(request));
});

/**
 * Handle different types of requests with appropriate caching strategies
 */
async function handleRequest(request) {
  const url = new URL(request.url);

  try {
    // HTML pages - Network first, fallback to cache, then offline page
    if (isHTMLRequest(request)) {
      return await networkFirst(request, STATIC_CACHE_NAME, '/offline.html');
    }

    // Static assets (CSS, JS, images) - Cache first
    if (isStaticAsset(request)) {
      return await cacheFirst(request, STATIC_CACHE_NAME);
    }

    // API requests - Network first with short cache
    if (isAPIRequest(request)) {
      return await networkFirst(request, RUNTIME_CACHE_NAME, null, 5 * 60 * 1000); // 5 minutes
    }

    // External fonts and CDN resources - Cache first with long TTL
    if (isExternalFont(request)) {
      return await cacheFirst(request, RUNTIME_CACHE_NAME, 365 * 24 * 60 * 60 * 1000); // 1 year
    }

    // Default - Network first
    return await networkFirst(request, RUNTIME_CACHE_NAME);

  } catch (error) {
    console.error('[SW] Request handling failed:', error);
    return new Response('Service Error', { status: 500 });
  }
}

/**
 * Network First Strategy
 * Tries network first, falls back to cache, then to fallback URL
 */
async function networkFirst(request, cacheName, fallbackUrl = null, maxAge = null) {
  const cache = await caches.open(cacheName);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache the successful response
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      return networkResponse;
    }

    throw new Error('Network response not ok');

  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // Try cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse && (!maxAge || !isExpired(cachedResponse, maxAge))) {
      return cachedResponse;
    }

    // Try fallback URL
    if (fallbackUrl) {
      const fallbackResponse = await cache.match(fallbackUrl);
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }

    // Return error response
    return new Response('Offline - No cached version available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Cache First Strategy
 * Tries cache first, falls back to network
 */
async function cacheFirst(request, cacheName, maxAge = null) {
  const cache = await caches.open(cacheName);

  try {
    // Try cache first
    const cachedResponse = await cache.match(request);

    if (cachedResponse && (!maxAge || !isExpired(cachedResponse, maxAge))) {
      // Background refresh for frequently used resources
      if (Math.random() < 0.1) { // 10% chance to refresh
        refreshCache(request, cache);
      }
      return cachedResponse;
    }

    // Try network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      return networkResponse;
    }

    throw new Error('Network response not ok');

  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    throw error;
  }
}

/**
 * Refresh cache in background
 */
async function refreshCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse);
      console.log('[SW] Background cache refreshed:', request.url);
    }
  } catch (error) {
    console.log('[SW] Background refresh failed:', request.url);
  }
}

/**
 * Check if cached response is expired
 */
function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;

  const cachedTime = new Date(dateHeader).getTime();
  const now = Date.now();
  return (now - cachedTime) > maxAge;
}

/**
 * Request type checkers
 */
function isHTMLRequest(request) {
  return request.headers.get('accept')?.includes('text/html') ||
         request.url.endsWith('.html');
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return /\.(css|js|png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$/i.test(url.pathname);
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/graphql');
}

function isExternalFont(request) {
  const url = new URL(request.url);
  return (url.origin.includes('fonts.googleapis.com') ||
          url.origin.includes('fonts.gstatic.com') ||
          url.origin.includes('cdn.jsdelivr.net'));
}

function isAllowedCDN(origin) {
  const allowedCDNs = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'unpkg.com'
  ];

  return allowedCDNs.some(cdn => origin.includes(cdn));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-user-data') {
    event.waitUntil(syncUserData());
  }

  if (event.tag === 'sync-collection-data') {
    event.waitUntil(syncCollectionData());
  }
});

/**
 * Sync user data when back online
 */
async function syncUserData() {
  try {
    console.log('[SW] Syncing user data...');

    // Get pending actions from IndexedDB
    const pendingActions = await getPendingActions();

    // Process each pending action
    for (const action of pendingActions) {
      try {
        await processAction(action);
        await removePendingAction(action.id);
      } catch (error) {
        console.error('[SW] Failed to process action:', action, error);
      }
    }

    console.log('[SW] User data sync completed');
  } catch (error) {
    console.error('[SW] User data sync failed:', error);
  }
}

/**
 * Sync collection data
 */
async function syncCollectionData() {
  try {
    console.log('[SW] Syncing collection data...');

    // Refresh collection data from server
    const response = await fetch('/api/collection/sync');

    if (response.ok) {
      const data = await response.json();

      // Update local cache
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      await cache.put('/api/collection', new Response(JSON.stringify(data)));

      console.log('[SW] Collection data sync completed');
    }
  } catch (error) {
    console.error('[SW] Collection data sync failed:', error);
  }
}

/**
 * Push notification handler
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  if (!event.data) {
    return;
  }

  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: 'gunpla-notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Gunpla Collection Manager', options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // Focus existing window if available
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }

          // Open new window
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

/**
 * IndexedDB helpers for offline actions
 */
async function getPendingActions() {
  // This would integrate with your IndexedDB setup
  // For now, return empty array as placeholder
  return [];
}

async function removePendingAction(actionId) {
  // Remove action from IndexedDB
  console.log('[SW] Removing pending action:', actionId);
}

async function processAction(action) {
  // Process individual offline action
  console.log('[SW] Processing action:', action);

  const response = await fetch(action.url, {
    method: action.method,
    headers: action.headers,
    body: action.body
  });

  if (!response.ok) {
    throw new Error(`Action failed: ${response.statusText}`);
  }

  return response;
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_UPDATED') {
    console.log('[SW] Cache update requested');
    // Handle cache updates if needed
  }
});

console.log('[SW] Service worker script loaded');