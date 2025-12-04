/**
 * PWA Service Worker
 *
 * This service worker provides offline functionality, caching strategies,
 * and background sync capabilities for the Gunpla Collection Manager app.
 */

const CACHE_VERSION = '2.0.0';
const CACHE_NAME = `gunpla-app-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `gunpla-static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `gunpla-runtime-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `gunpla-data-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `gunpla-images-${CACHE_VERSION}`;

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

// API endpoints that can be cached with different strategies
const API_CACHE_CONFIG = {
  // Static data - Cache first with long TTL
  static: [
    '/api/kits',
    '/api/grades',
    '/api/series',
    '/api/manufacturers'
  ],
  // Dynamic data - Network first with short TTL
  dynamic: [
    '/api/collection',
    '/api/wishlist',
    '/api/builds'
  ],
  // User data - Network only with background sync
  user: [
    '/api/user/profile',
    '/api/user/preferences',
    '/api/user/stats'
  ]
};

// Cache TTL settings (in milliseconds)
const CACHE_TTL = {
  static: 24 * 60 * 60 * 1000,     // 24 hours
  dynamic: 5 * 60 * 1000,          // 5 minutes
  images: 7 * 24 * 60 * 60 * 1000, // 7 days
  runtime: 60 * 60 * 1000          // 1 hour
};

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
    // HTML pages - Stale while revalidate for app shell
    if (isHTMLRequest(request)) {
      return await staleWhileRevalidate(request, STATIC_CACHE_NAME, '/offline.html');
    }

    // Static assets (CSS, JS) - Cache first with background refresh
    if (isStaticAsset(request) && !isImageRequest(request)) {
      return await cacheFirstWithRefresh(request, STATIC_CACHE_NAME, CACHE_TTL.static);
    }

    // Images - Cache first with very long TTL
    if (isImageRequest(request)) {
      return await cacheFirst(request, IMAGE_CACHE_NAME, CACHE_TTL.images);
    }

    // API requests - Different strategies based on endpoint type
    if (isAPIRequest(request)) {
      const apiType = getAPIType(url.pathname);

      switch (apiType) {
        case 'static':
          return await cacheFirst(request, DATA_CACHE_NAME, CACHE_TTL.static);
        case 'dynamic':
          return await networkFirst(request, DATA_CACHE_NAME, null, CACHE_TTL.dynamic);
        case 'user':
          return await networkOnlyWithSync(request);
        default:
          return await networkFirst(request, RUNTIME_CACHE_NAME, null, CACHE_TTL.runtime);
      }
    }

    // External fonts and CDN resources - Cache first with long TTL
    if (isExternalFont(request)) {
      return await cacheFirst(request, RUNTIME_CACHE_NAME, CACHE_TTL.static * 30); // 30 days
    }

    // Default - Network first with short cache
    return await networkFirst(request, RUNTIME_CACHE_NAME, null, CACHE_TTL.runtime);

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
 * Stale While Revalidate Strategy
 * Returns cached version immediately, then updates cache in background
 */
async function staleWhileRevalidate(request, cacheName, fallbackUrl = null) {
  const cache = await caches.open(cacheName);

  try {
    // Get cached version immediately
    const cachedResponse = await cache.match(request);

    // Start network request in background
    const networkPromise = fetch(request).then(async (networkResponse) => {
      if (networkResponse.ok) {
        const responseClone = networkResponse.clone();
        await cache.put(request, responseClone);
      }
      return networkResponse;
    }).catch(error => {
      console.log('[SW] Background network request failed:', error);
      return null;
    });

    // Return cached version if available
    if (cachedResponse) {
      // Don't wait for network, just trigger it
      networkPromise.catch(() => {}); // Prevent unhandled promise rejection
      return cachedResponse;
    }

    // Wait for network if no cache available
    const networkResponse = await networkPromise;
    if (networkResponse) {
      return networkResponse;
    }

    // Try fallback
    if (fallbackUrl) {
      const fallbackResponse = await cache.match(fallbackUrl);
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }

    throw new Error('No cache or network response available');

  } catch (error) {
    console.error('[SW] Stale while revalidate failed:', error);

    // Try fallback URL directly
    if (fallbackUrl) {
      const fallbackResponse = await cache.match(fallbackUrl);
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }

    return new Response('Offline - No cached version available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Cache First with Background Refresh Strategy
 * Returns cached version, then refreshes if it's getting stale
 */
async function cacheFirstWithRefresh(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);

  try {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if cache is getting stale (older than 75% of maxAge)
      const ageThreshold = maxAge * 0.75;
      if (!isExpired(cachedResponse, ageThreshold)) {
        // Refresh in background for frequently used resources
        if (Math.random() < 0.1) { // 10% chance to refresh
          refreshCache(request, cache).catch(() => {});
        }
        return cachedResponse;
      }

      // Cache is stale, try to refresh
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          await cache.put(request, responseClone);
          return networkResponse;
        }
      } catch (error) {
        console.log('[SW] Refresh failed, returning stale cache:', error);
        // Return stale cache if network fails
        return cachedResponse;
      }
    }

    // No cache available, try network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      return networkResponse;
    }

    throw new Error('Network response not ok');

  } catch (error) {
    console.error('[SW] Cache first with refresh failed:', error);
    throw error;
  }
}

/**
 * Network Only with Background Sync Strategy
 * Always tries network, queues requests for background sync if offline
 */
async function networkOnlyWithSync(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      return networkResponse;
    }

    throw new Error(`Network response not ok: ${networkResponse.status}`);

  } catch (error) {
    console.log('[SW] Network request failed, queuing for sync:', request.url);

    // Queue the request for background sync
    await queueForSync(request);

    // Try to get cached version as fallback
    const cache = await caches.open(DATA_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Add warning header to indicate it's stale
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Cache-Status', 'stale');

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }

    throw error;
  }
}

/**
 * Queue request for background sync
 */
async function queueForSync(request) {
  try {
    // Store request details in IndexedDB for later sync
    const syncData = {
      id: generateSyncId(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: Date.now(),
      type: 'api-request'
    };

    // This would integrate with your IndexedDB setup
    // For now, just register a background sync event
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      await self.registration.sync.register('sync-user-data');
    }

    console.log('[SW] Request queued for sync:', syncData.id);

  } catch (error) {
    console.error('[SW] Failed to queue for sync:', error);
  }
}

/**
 * Generate unique sync ID
 */
function generateSyncId() {
  return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get API type based on URL path
 */
function getAPIType(pathname) {
  if (API_CACHE_CONFIG.static.some(endpoint => pathname.startsWith(endpoint))) {
    return 'static';
  }
  if (API_CACHE_CONFIG.dynamic.some(endpoint => pathname.startsWith(endpoint))) {
    return 'dynamic';
  }
  if (API_CACHE_CONFIG.user.some(endpoint => pathname.startsWith(endpoint))) {
    return 'user';
  }
  return 'unknown';
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

function isImageRequest(request) {
  const url = new URL(request.url);
  return /\.(png|jpg|jpeg|svg|gif|webp|avif|webp)$/i.test(url.pathname);
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
    'unpkg.com',
    'cdnjs.cloudflare.com'
  ];

  return allowedCDNs.some(cdn => origin.includes(cdn));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  switch (event.tag) {
    case 'sync-user-data':
      event.waitUntil(syncUserData().catch(error => {
        console.error('[SW] User data sync failed:', error);
      }));
      break;

    case 'sync-collection-data':
      event.waitUntil(syncCollectionData().catch(error => {
        console.error('[SW] Collection data sync failed:', error);
      }));
      break;

    case 'sync-wishlist':
      event.waitUntil(syncWishlist().catch(error => {
        console.error('[SW] Wishlist sync failed:', error);
      }));
      break;

    case 'sync-build-progress':
      event.waitUntil(syncBuildProgress().catch(error => {
        console.error('[SW] Build progress sync failed:', error);
      }));
      break;

    default:
      console.log('[SW] Unknown sync tag:', event.tag);
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
      const cache = await caches.open(DATA_CACHE_NAME);
      await cache.put('/api/collection', new Response(JSON.stringify(data)));

      console.log('[SW] Collection data sync completed');

      // Notify client about successful sync
      notifyClients('sync-completed', { type: 'collection', count: data.length });
    }
  } catch (error) {
    console.error('[SW] Collection data sync failed:', error);
    throw error;
  }
}

/**
 * Sync wishlist data
 */
async function syncWishlist() {
  try {
    console.log('[SW] Syncing wishlist data...');

    // Get pending wishlist actions from IndexedDB
    const pendingActions = await getPendingSyncActions('wishlist');

    if (pendingActions.length === 0) {
      console.log('[SW] No pending wishlist actions to sync');
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const action of pendingActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });

        if (response.ok) {
          await removePendingSyncAction(action.id);
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error('[SW] Failed to sync wishlist action:', action.id, error);
        failureCount++;
      }
    }

    console.log(`[SW] Wishlist sync completed: ${successCount} success, ${failureCount} failures`);

    // Update wishlist cache
    if (successCount > 0) {
      const wishlistResponse = await fetch('/api/wishlist');
      if (wishlistResponse.ok) {
        const cache = await caches.open(DATA_CACHE_NAME);
        await cache.put('/api/wishlist', wishlistResponse.clone());
      }
    }

  } catch (error) {
    console.error('[SW] Wishlist sync failed:', error);
    throw error;
  }
}

/**
 * Sync build progress data
 */
async function syncBuildProgress() {
  try {
    console.log('[SW] Syncing build progress data...');

    // Get pending build progress updates
    const pendingActions = await getPendingSyncActions('builds');

    if (pendingActions.length === 0) {
      console.log('[SW] No pending build actions to sync');
      return;
    }

    let successCount = 0;

    for (const action of pendingActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });

        if (response.ok) {
          await removePendingSyncAction(action.id);
          successCount++;
        }
      } catch (error) {
        console.error('[SW] Failed to sync build action:', action.id, error);
      }
    }

    console.log(`[SW] Build progress sync completed: ${successCount} actions synced`);

    // Update build progress cache
    if (successCount > 0) {
      const buildsResponse = await fetch('/api/builds');
      if (buildsResponse.ok) {
        const cache = await caches.open(DATA_CACHE_NAME);
        await cache.put('/api/builds', buildsResponse.clone());
      }
    }

  } catch (error) {
    console.error('[SW] Build progress sync failed:', error);
    throw error;
  }
}

/**
 * Get pending sync actions from IndexedDB
 */
async function getPendingSyncActions(type) {
  try {
    // This would integrate with your IndexedDB setup
    // For now, return empty array as placeholder
    console.log(`[SW] Getting pending ${type} sync actions`);
    return [];
  } catch (error) {
    console.error('[SW] Failed to get pending sync actions:', error);
    return [];
  }
}

/**
 * Remove a pending sync action from IndexedDB
 */
async function removePendingSyncAction(actionId) {
  try {
    // Remove action from IndexedDB
    console.log('[SW] Removing pending sync action:', actionId);
  } catch (error) {
    console.error('[SW] Failed to remove pending sync action:', error);
  }
}

/**
 * Notify all clients about sync status
 */
async function notifyClients(type, data) {
  try {
    const clients = await self.clients.matchAll();

    clients.forEach(client => {
      client.postMessage({
        type: type,
        data: data,
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('[SW] Failed to notify clients:', error);
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