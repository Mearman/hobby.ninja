# PWA Configuration

This document covers the Progressive Web App (PWA) configuration, service worker setup, and web app manifest for the Gunpla App.

##  Overview

The Gunpla App is built as a Progressive Web Application with the following PWA features:

- **Offline Functionality**: Full offline operation with local data storage
- **App Installation**: Installable on desktop and mobile devices
- **Background Sync**: Queue actions while offline and sync when online
- **Push Notifications**: Reminders and build notifications
- **App Shortcuts**: Quick access to common actions
- **Responsive Design**: Adaptive layouts for all devices

## ⚙️ Web App Manifest

### Manifest Configuration

The Web App Manifest defines how the app appears when installed and provides metadata for the browser.

**Location**: `apps/gunpla-app/public/manifest.json`

```json
{
  "name": "Gunpla App - Gundam Model Kit Collection Manager",
  "short_name": "Gunpla App",
  "description": "Manage and track your Gundam model kit collection offline-first with this feature-rich PWA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#ff6b35",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "en",
  "categories": ["productivity", "utilities", "lifestyle"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "shortcuts": [
    {
      "name": "Add New Kit",
      "short_name": "Add Kit",
      "description": "Add a new Gundam model kit to your collection",
      "url": "/add-kit",
      "icons": [
        {
          "src": "/icons/add-kit-96x96.png",
          "sizes": "96x96"
        }
      ]
    },
    {
      "name": "View Collection",
      "short_name": "Collection",
      "description": "Browse your Gundam model kit collection",
      "url": "/collection",
      "icons": [
        {
          "src": "/icons/collection-96x96.png",
          "sizes": "96x96"
        }
      ]
    },
    {
      "name": "Search Kits",
      "short_name": "Search",
      "description": "Search through your Gundam model kit collection",
      "url": "/search",
      "icons": [
        {
          "src": "/icons/search-96x96.png",
          "sizes": "96x96"
        }
      ]
    },
    {
      "name": "Build Progress",
      "short_name": "Progress",
      "description": "Track your current build progress",
      "url": "/progress",
      "icons": [
        {
          "src": "/icons/progress-96x96.png",
          "sizes": "96x96"
        }
      ]
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop-home.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Home screen showing collection overview"
    },
    {
      "src": "/screenshots/mobile-collection.png",
      "sizes": "375x667",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Mobile collection view"
    },
    {
      "src": "/screenshots/desktop-kit-detail.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Detailed kit information view"
    }
  ],
  "related_applications": [],
  "prefer_related_applications": false,
  "edge_side_panel": {
    "preferred_width": 400
  }
}
```

### Manifest Icon Requirements

All icons should follow these guidelines:

- **Format**: PNG (recommended) or WebP
- **Background**: Transparent for maskable icons
- **Design**: Simple, recognizable at small sizes
- **Color Scheme**: Consistent with app theme (`#ff6b35` primary, `#1a1a1a` background)

#### Icon Generation

Icons can be generated using the following command:

```bash
# Generate icons from source image
npm run pwa:generate-icons

# Manual icon creation requirements:
# - 512x512px source image
# - Transparent background
# - High-resolution vector logo if possible
```

## 🔄 Service Worker

### Service Worker Registration

**Location**: `apps/gunpla-app/src/lib/service-worker/registration.ts`

```typescript
// Service worker registration and lifecycle management
export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private updateAvailable = false

  async register(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true
              this.onUpdateAvailable()
            }
          })
        }
      })

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })

      console.log('Service Worker registered successfully')
      return true
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return false
    }
  }

  async checkForUpdates(): Promise<boolean> {
    if (this.registration) {
      await this.registration.update()
      return this.updateAvailable
    }
    return false
  }

  async applyUpdate(): Promise<void> {
    if (this.updateAvailable && this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  private onUpdateAvailable(): void {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('sw-update-available'))
  }
}
```

### Service Worker Implementation

**Location**: `apps/gunpla-app/public/sw.js`

```javascript
// Service worker with caching strategies and offline support
const CACHE_NAME = 'gunpla-app-v1'
const STATIC_CACHE = 'gunpla-static-v1'
const DYNAMIC_CACHE = 'gunpla-dynamic-v1'
const IMAGE_CACHE = 'gunpla-images-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  // CSS and JS bundles (generated at build time)
  '/assets/main.css',
  '/assets/main.js',
  // Critical icons
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name =>
              name !== STATIC_CACHE &&
              name !== DYNAMIC_CACHE &&
              name !== IMAGE_CACHE
            )
            .map(name => caches.delete(name))
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle different request types with appropriate strategies
  if (url.origin === location.origin) {
    // Same-origin requests
    if (isStaticAsset(request.url)) {
      // Cache first for static assets
      event.respondWith(cacheFirst(request, STATIC_CACHE))
    } else if (isImageRequest(request.url)) {
      // Cache first with fallback for images
      event.respondWith(cacheFirst(request, IMAGE_CACHE))
    } else {
      // Network first for dynamic content
      event.respondWith(networkFirst(request, DYNAMIC_CACHE))
    }
  } else {
    // Cross-origin requests (external APIs, images)
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE))
  }
})

// Caching strategies
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.error('Cache first strategy failed:', error)
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('Network failed, trying cache:', error)
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(error => {
      console.error('Stale while revalidate failed:', error)
      return cached || new Response('Network Error', { status: 500 })
    })

  return cached || fetchPromise
}

// Helper functions
function isStaticAsset(url) {
  return url.includes('/assets/') ||
         url.endsWith('.css') ||
         url.endsWith('.js') ||
         url.endsWith('.woff2') ||
         url.endsWith('.woff')
}

function isImageRequest(url) {
  return url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineActions())
  }
})

async function syncOfflineActions() {
  // Get queued actions from IndexedDB
  const actions = await getQueuedActions()

  for (const action of actions) {
    try {
      await processAction(action)
      await removeQueuedAction(action.id)
    } catch (error) {
      console.error('Failed to process action:', action, error)
    }
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New notification from Gunpla App',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Kit',
        icon: '/icons/explore-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close-icon.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('Gunpla App', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  } else if (event.action === 'close') {
    // Notification already closed
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})
```

### Service Worker Utilities

**Location**: `apps/gunpla-app/src/lib/service-worker/utils.ts`

```typescript
// Background sync utilities
export interface QueuedAction {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'kit' | 'photo' | 'category'
  data: unknown
  timestamp: number
  retryCount: number
}

export class BackgroundSyncManager {
  private db: Dexie

  constructor() {
    this.db = new Dexie('GunplaAppSync')
    this.db.version(1).stores({
      queuedActions: '++id,type,entity,timestamp,retryCount'
    })
  }

  async queueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    await this.db.table('queuedActions').add({
      ...action,
      timestamp: Date.now(),
      retryCount: 0
    })

    // Register for background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready
      await registration.sync.register('background-sync')
    }
  }

  async getQueuedActions(): Promise<QueuedAction[]> {
    return await this.db.table('queuedActions').toArray()
  }

  async removeQueuedAction(id: number): Promise<void> {
    await this.db.table('queuedActions').delete(id)
  }

  async incrementRetryCount(id: number): Promise<void> {
    await this.db.table('queuedActions').update(id, {
      retryCount: Dexie.getDefaultInstance().table('queuedActions')
        .get(id)
        .then(action => action?.retryCount || 0)
        .then(count => count + 1)
    })
  }
}

// Caching utilities
export class CacheManager {
  private static readonly CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
  }

  static async cacheResponse(
    request: Request,
    response: Response,
    cacheName: string
  ): Promise<void> {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
  }

  static async getCachedResponse(
    request: Request,
    cacheName: string
  ): Promise<Response | null> {
    const cache = await caches.open(cacheName)
    return await cache.match(request)
  }

  static async clearCache(cacheName: string): Promise<void> {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    await Promise.all(keys.map(key => cache.delete(key)))
  }

  static async getCacheSize(cacheName: string): Promise<number> {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()

    let totalSize = 0
    for (const request of keys) {
      const response = await cache.match(request)
      if (response) {
        const blob = await response.blob()
        totalSize += blob.size
      }
    }

    return totalSize
  }
}
```

##  Installation and Updates

### Installation Prompt

**Location**: `apps/gunpla-app/src/hooks/useInstallPrompt.ts`

```typescript
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if already installed
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          setIsInstalled(true)
        }
      })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) {
      return false
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      return true
    }

    return false
  }

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled,
    install
  }
}
```

### Update Management

**Location**: `apps/gunpla-app/src/components/UpdatePrompt.tsx`

```typescript
export function UpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setShowUpdatePrompt(true)
    }

    window.addEventListener('sw-update-available', handleUpdateAvailable)

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable)
    }
  }, [])

  const handleUpdate = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }
  }

  const handleDismiss = () => {
    setShowUpdatePrompt(false)
  }

  if (!showUpdatePrompt) {
    return null
  }

  return (
    <Alert
      title="Update Available"
      message="A new version of Gunpla App is available. Would you like to update now?"
      actions={[
        {
          label: "Update Now",
          onClick: handleUpdate,
          variant: "primary"
        },
        {
          label: "Later",
          onClick: handleDismiss,
          variant: "subtle"
        }
      ]}
    />
  )
}
```

## 🔔 Push Notifications

### Permission Request

**Location**: `apps/gunpla-app/src/hooks/useNotifications.ts`

```typescript
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    // Check existing subscription
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(setSubscription)
      })
    }
  }, [])

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return false
    }

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === 'granted') {
      await subscribeToPush()
      return true
    }

    return false
  }

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })

    setSubscription(subscription)

    // Send subscription to server (if needed)
    await sendSubscriptionToServer(subscription)
  }

  const unsubscribe = async () => {
    if (subscription) {
      await subscription.unsubscribe()
      setSubscription(null)
    }
  }

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options
      })
    }
  }

  return {
    permission,
    subscription,
    requestPermission,
    unsubscribe,
    showNotification,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator
  }
}
```

## 📊 PWA Metrics and Monitoring

### Performance Tracking

**Location**: `apps/gunpla-app/src/lib/pwa/metrics.ts`

```typescript
export class PWAMetrics {
  static trackInstallPrompt(promptShown: boolean, accepted: boolean) {
    // Track installation prompt interactions
    this.trackEvent('pwa_install_prompt', {
      promptShown,
      accepted,
      timestamp: Date.now()
    })
  }

  static trackOfflineUsage(duration: number) {
    // Track offline session duration
    this.trackEvent('pwa_offline_session', {
      duration,
      timestamp: Date.now()
    })
  }

  static trackCacheHit(cacheName: string, url: string) {
    // Track cache performance
    this.trackEvent('pwa_cache_hit', {
      cacheName,
      url,
      timestamp: Date.now()
    })
  }

  static trackNetworkFallback(url: string) {
    // Track when network requests fail and fallback to cache
    this.trackEvent('pwa_network_fallback', {
      url,
      timestamp: Date.now()
    })
  }

  private static trackEvent(eventName: string, data: Record<string, unknown>) {
    // Send to analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, data)
    }

    // Also store locally for offline analysis
    this.storeLocalEvent(eventName, data)
  }

  private static storeLocalEvent(eventName: string, data: Record<string, unknown>) {
    const events = JSON.parse(localStorage.getItem('pwa_events') || '[]')
    events.push({ eventName, data, id: Date.now() })

    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100)
    }

    localStorage.setItem('pwa_events', JSON.stringify(events))
  }
}
```

##  PWA Testing

### Testing Commands

```bash
# Test PWA installation
npm run pwa:test:install

# Test offline functionality
npm run pwa:test:offline

# Test service worker
npm run pwa:test:sw

# Test background sync
npm run pwa:test:sync

# Lighthouse PWA audit
npm run pwa:audit:lighthouse

# PWA compliance check
npm run pwa:test:compliance
```

### Testing Checklist

- [ ] App installs successfully on desktop
- [ ] App installs successfully on mobile
- [ ] App works offline
- [ ] Service worker caches appropriate resources
- [ ] Background sync functions correctly
- [ ] Push notifications work (when permitted)
- [ ] App shortcuts are functional
- [ ] Responsive design on all devices
- [ ] Performance meets PWA criteria
- [ ] Accessibility maintained in PWA mode

## 🔧 Development Tools

### PWA Development Extensions

- **Chrome DevTools**: Application tab for Service Worker and Cache inspection
- **Lighthouse**: PWA audit and performance testing
- **Workbox**: Google's service worker utilities
- **PWA Builder**: Microsoft's PWA development tools

### Debugging Service Workers

```javascript
// In browser console
// Check service worker registration
navigator.serviceWorker.getRegistrations()

// Check current controller
navigator.serviceWorker.controller

// Force update
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    registration.update()
  })
})

// Clear caches
caches.keys().then(cacheNames => {
  cacheNames.forEach(cacheName => {
    caches.delete(cacheName)
  })
})
```

## 📚 Additional Resources

- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [Service Worker Cookbook](https://github.com/GoogleChromeLabs/serviceworker-cookbook)
- [Web App Manifest Validator](https://tomayac.github.io/manifest-validator/)
- [Lighthouse PWA Scoring](https://web.dev/lighthouse-pwa/)

---

**Last Updated**: 2025-12-04
**Version**: 1.0.0