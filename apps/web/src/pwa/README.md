# Progressive Web App (PWA) Module

A comprehensive PWA implementation with service worker, caching strategies, offline functionality, background sync, and push notifications.

## Features

### Core PWA Features
- **Service Worker** with intelligent caching strategies
- **Offline Support** with fallback pages
- **Background Sync** for deferred operations
- **Push Notifications** with permission management
- **App Installation** prompts and detection

### Caching Strategies
- **Cache First**: For static assets and images
- **Network First**: For API responses
- **Stale While Revalidate**: For HTML pages
- **Network Only**: For analytics and real-time data
- **Cache Only**: For critical offline content

### Performance & Monitoring
- **Request Deduplication** to prevent duplicate network calls
- **Cache Expiration** with intelligent cleanup
- **Performance Metrics** collection and reporting
- **Error Handling** with comprehensive logging
- **Storage Management** with quota monitoring

## Quick Start

### 1. Initialize PWA in your app

```typescript
import { initializePWA } from './src/pwa/setup';

// In your main.tsx or index.tsx
initializePWA({
  enableServiceWorker: true,
  enableNotifications: true,
  enableBackgroundSync: true,
  enableUpdatePrompt: true,
  vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY',
}).catch(error => {
  console.error('PWA initialization failed:', error);
});
```

### 2. Use React Hooks

```typescript
import { usePWAStatus, useServiceWorker, useNotifications } from './src/pwa';

function App() {
  const { isOnline, updateAvailable } = usePWAStatus();
  const { applyUpdate } = useServiceWorker();
  const { permission, requestPermission } = useNotifications();

  return (
    <div>
      <div>Online: {isOnline ? 'Yes' : 'No'}</div>
      {updateAvailable && (
        <button onClick={applyUpdate}>
          Update Available
        </button>
      )}
      {permission === 'default' && (
        <button onClick={requestPermission}>
          Enable Notifications
        </button>
      )}
    </div>
  );
}
```

### 3. Configure Service Worker

The service worker is automatically registered. Configure it in `src/pwa/config/pwa.config.ts`:

```typescript
export const PWA_DEFAULT_CONFIG: PWAConfig = {
  version: '1.0.0',
  cache: {
    precache: [
      '/',
      '/index.html',
      '/manifest.json',
      '/offline.html',
    ],
    runtime: [
      {
        name: 'static-resources',
        strategy: 'cacheFirst',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxEntries: 100,
      },
      {
        name: 'api-responses',
        strategy: 'networkFirst',
        maxAge: 5 * 60 * 1000, // 5 minutes
        maxEntries: 50,
      },
    ],
  },
  offline: {
    enabled: true,
    fallbackRoute: '/offline.html',
    networkOnlyRoutes: ['/api/analytics'],
  },
  push: {
    enabled: true,
    vapidPublicKey: process.env.VITE_VAPID_PUBLIC_KEY || '',
  },
  sync: {
    enabled: true,
    syncTasks: ['sync-user-data', 'sync-photos'],
  },
};
```

## API Reference

### Hooks

#### `usePWAStatus()`
Returns the current PWA status including registration state, update availability, and online status.

```typescript
const {
  isSupported,
  isRegistered,
  updateAvailable,
  isOnline,
  isControlled,
  version,
  registration,
} = usePWAStatus();
```

#### `useServiceWorker()`
Manages service worker registration and updates.

```typescript
const {
  registration,
  isLoading,
  error,
  register,
  unregister,
  checkForUpdate,
  applyUpdate,
  getVersion,
  isUpdateAvailable,
} = useServiceWorker();
```

#### `useNotifications()`
Manages push notification permissions and subscription.

```typescript
const {
  permission,
  subscription,
  isLoading,
  error,
  requestPermission,
  subscribe,
  unsubscribe,
  isSupported,
} = useNotifications();
```

#### `useOfflineDetection()`
Detects online/offline status changes.

```typescript
const {
  isOnline,
  wasOffline,
  isOffline,
} = useOfflineDetection();
```

#### `useBackgroundSync()`
Manages background sync registration and status.

```typescript
const {
  isSupported,
  pendingSyncs,
  registerSync,
  getPendingSyncs,
} = useBackgroundSync();
```

#### `usePWAInstall()`
Manages PWA install prompt for mobile devices.

```typescript
const {
  isInstallable,
  isLoading,
  install,
  dismiss,
} = usePWAInstall();
```

#### `usePWAPerformance()`
Provides PWA performance metrics and monitoring.

```typescript
const {
  cacheHitRate,
  offlineUsage,
  performanceScore,
  loadTime,
} = usePWAPerformance();
```

### Classes

#### `PWARegistration`
Manages service worker registration, updates, and lifecycle.

```typescript
import { pwaRegistration } from './src/pwa';

// Register with custom events
pwaRegistration.register({
  onRegistered: (reg) => console.log('Registered:', reg),
  onUpdated: (reg) => console.log('Updated:', reg),
  onError: (error) => console.error('Error:', error),
});
```

#### `CacheManager`
Handles all caching operations with intelligent strategies.

```typescript
import { CacheManager } from './src/pwa';

const cacheManager = new CacheManager(config);

// Cache operations
await cacheManager.get(request, 'cache-name');
await cacheManager.put(request, response, 'cache-name');
await cacheManager.delete(request, 'cache-name');
```

#### `NotificationManager`
Handles push notifications and local notifications.

```typescript
import { NotificationManager } from './src/pwa';

const notificationManager = new NotificationManager(config);

// Show notification
await notificationManager.showNotification('Title', {
  body: 'Notification body',
  icon: '/icon.png',
});

// Schedule notification
notificationManager.scheduleNotification('Title', options, 5000);
```

#### `SyncManager`
Handles background synchronization with retry logic.

```typescript
import { SyncManager } from './src/pwa';

const syncManager = new SyncManager(config);

// Register sync task
await syncManager.requestSync('sync-user-data', userData);

// Register custom handler
syncManager.registerHandler('custom-sync', async (data) => {
  // Handle sync logic
});
```

### Utilities

#### `isPWASupported()`
Check if PWA is supported in current browser.

```typescript
import { isPWASupported } from './src/pwa';

if (isPWASupported()) {
  // PWA features available
}
```

#### `isInstalled()`
Check if app is installed as PWA.

```typescript
import { isInstalled } from './src/pwa';

if (isInstalled()) {
  // App running in standalone mode
}
```

#### `getStorageInfo()`
Get storage usage information.

```typescript
import { getStorageInfo } from './src/pwa';

const storage = await getStorageInfo();
console.log('Usage:', storage.usageFormatted);
console.log('Quota:', storage.quotaFormatted);
```

## Configuration

### Environment Variables

- `VITE_VAPID_PUBLIC_KEY`: VAPID public key for push notifications

### Service Worker URL

By default, the service worker is expected at `/sw.js`. You can customize this:

```typescript
initializePWA({
  serviceWorkerUrl: '/custom-sw.js',
});
```

## File Structure

```
src/pwa/
├── index.ts                 # Main entry point
├── setup.ts                 # PWA initialization
├── service-worker.ts        # Service worker implementation
├── types/pwa.ts            # TypeScript type definitions
├── config/pwa.config.ts    # PWA configuration
├── cache/
│   └── cache-manager.ts    # Cache management
├── notifications/
│   └── notification-manager.ts # Push notifications
├── sync/
│   └── sync-manager.ts     # Background sync
├── hooks/
│   └── use-pwa.ts          # React hooks
├── logging/
│   └── logger.ts           # Logging system
├── lifecycle/
│   └── pwa-registration.ts # Service worker registration
└── utils/
    ├── pwa-utils.ts        # Utility functions
    └── metrics-collector.ts # Performance metrics
```

## Examples

### Background Sync Example

```typescript
import { useBackgroundSync } from './src/pwa';

function DataSync() {
  const { registerSync } = useBackgroundSync();

  const handleOfflineAction = async (data: any) => {
    try {
      // Try to sync immediately
      await fetch('/api/data', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      // Schedule for background sync if offline
      await registerSync('sync-user-data', data);
    }
  };

  return (
    <button onClick={() => handleOfflineAction({ action: 'update' })}>
      Update Data
    </button>
  );
}
```

### Custom Cache Strategy Example

```typescript
import { getCacheConfigForUrl } from './src/pwa/config/pwa.config';

// Custom cache configuration for specific routes
const customConfig = {
  ...getCacheConfigForUrl('/api/custom-data'),
  maxAge: 10 * 60 * 1000, // 10 minutes
  maxEntries: 25,
};
```

### Push Notification Example

```typescript
import { useNotifications } from './src/pwa';

function NotificationCenter() {
  const { permission, requestPermission, subscribe } = useNotifications();

  const enableNotifications = async () => {
    if (permission === 'default') {
      await requestPermission();
    }

    if (permission === 'granted') {
      const subscription = await subscribe('YOUR_VAPID_PUBLIC_KEY');
      // Send subscription to server
    }
  };

  return (
    <div>
      <button onClick={enableNotifications}>
        Enable Notifications
      </button>
      <p>Permission: {permission}</p>
    </div>
  );
}
```

## Testing

The PWA module includes comprehensive tests. Run them with:

```bash
yarn test src/pwa
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Some features may have limited support in older browsers. Use the feature detection utilities to check availability.

## Security Considerations

- All HTTPS required for service workers
- VAPID keys must be securely generated and stored
- Cache validation prevents caching of malicious content
- Input sanitization for notification data
- Same-origin policy enforcement

## Performance Optimizations

- Request deduplication reduces unnecessary network calls
- Intelligent cache cleanup prevents storage bloat
- Exponential backoff for failed operations
- Performance monitoring identifies bottlenecks
- Compression and minification for assets

## Troubleshooting

### Service Worker Not Registering
- Ensure HTTPS (or localhost for development)
- Check service worker scope
- Verify file path is correct
- Check browser console for errors

### Push Notifications Not Working
- Verify VAPID key configuration
- Check notification permission
- Ensure user has granted permission
- Verify service worker is active

### Cache Issues
- Check cache names match configuration
- Verify request URLs are cacheable
- Check for quota exceeded errors
- Clear cache and re-register

### Background Sync Not Working
- Verify browser supports background sync
- Check sync registration
- Ensure service worker is active
- Test offline functionality