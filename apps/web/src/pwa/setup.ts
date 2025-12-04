/**
 * PWA Setup
 *
 * Initialize PWA functionality with proper configuration and error handling.
 * This file should be imported and called from your main application entry point.
 */

import { pwaRegistration, logger } from './index';
import type { PWAEvents } from './lifecycle/pwaRegistration';

// Re-export PWAEvents for external use
export type { PWAEvents };

/**
 * PWA Setup Configuration
 */
interface PWASetupConfig {
  enableServiceWorker: boolean;
  enableNotifications: boolean;
  enableBackgroundSync: boolean;
  enableUpdatePrompt: boolean;
  serviceWorkerUrl: string;
  vapidPublicKey?: string;
}

/**
 * Default PWA setup configuration
 */
const DEFAULT_CONFIG: PWASetupConfig = {
  enableServiceWorker: true,
  enableNotifications: true,
  enableBackgroundSync: true,
  enableUpdatePrompt: true,
  serviceWorkerUrl: '/sw.js',
};

/**
 * Initialize PWA functionality
 */
export async function initializePWA(
  config: Partial<PWASetupConfig> = {},
  events: PWAEvents = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  logger.info('PWA Setup initializing', finalConfig);

  try {
    // Check PWA support
    if (!('serviceWorker' in navigator)) {
      logger.warn('Service Worker not supported - PWA features disabled');
      return;
    }

    // Register service worker if enabled
    if (finalConfig.enableServiceWorker) {
      await setupServiceWorker(finalConfig, events);
    }

    // Setup notifications if enabled
    if (finalConfig.enableNotifications) {
      await setupNotifications(finalConfig.vapidPublicKey);
    }

    // Setup background sync if enabled
    if (finalConfig.enableBackgroundSync) {
      await setupBackgroundSync();
    }

    logger.info('PWA Setup completed successfully');

  } catch (error) {
    logger.error('PWA Setup failed', { error, config: finalConfig });
    throw error;
  }
}

/**
 * Setup service worker
 */
async function setupServiceWorker(
  config: PWASetupConfig,
  events: PWAEvents
): Promise<void> {
  logger.info('Setting up service worker', {
    url: config.serviceWorkerUrl,
    updatePrompt: config.enableUpdatePrompt,
  });

  try {
    const registration = await pwaRegistration.register({
      ...events,
      onUpdateFound: (reg) => {
        logger.info('Service worker update found');
        events.onUpdateFound?.(reg);

        // Show update notification or prompt
        if (config.enableUpdatePrompt) {
          showUpdateAvailableNotification();
        }
      },
      onUpdated: (reg) => {
        logger.info('Service worker updated');
        events.onUpdated?.(reg);
      },
      onError: (error) => {
        logger.error('Service worker error', { error });
        events.onError?.(error);
      },
    });

    if (registration) {
      logger.info('Service worker registered successfully', {
        scope: registration.scope,
        active: !!registration.active,
        waiting: !!registration.waiting,
      });
    }

  } catch (error) {
    logger.error('Service worker setup failed', { error });
    throw error;
  }
}

/**
 * Setup notifications
 */
async function setupNotifications(vapidPublicKey?: string): Promise<void> {
  if (!('Notification' in window)) {
    logger.warn('Notifications not supported');
    return;
  }

  logger.info('Setting up notifications');

  try {
    // Check current permission
    if (Notification.permission === 'default') {
      logger.info('Requesting notification permission');

      // Don't request permission immediately, wait for user interaction
      // This will be handled by the useNotifications hook
    } else if (Notification.permission === 'granted') {
      logger.info('Notification permission already granted');

      // Subscribe to push notifications if VAPID key is available
      if (vapidPublicKey && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.pushManager) {
          try {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

            logger.info('Push subscription created', {
              endpoint: subscription.endpoint,
            });

            // Send subscription to server
            await sendSubscriptionToServer(subscription);

          } catch (error) {
            logger.error('Push subscription failed', { error });
          }
        }
      }
    } else if (Notification.permission === 'denied') {
      logger.warn('Notification permission denied');
    }

  } catch (error) {
    logger.error('Notifications setup failed', { error });
  }
}

/**
 * Setup background sync
 */
async function setupBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    logger.warn('Background sync not supported');
    return;
  }

  logger.info('Background sync is supported');

  // Background sync doesn't need special setup here
  // It will be used by the sync manager when needed
}

/**
 * Show update available notification
 */
function showUpdateAvailableNotification(): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Create a notification for the update
  const notification = new Notification('App Update Available', {
    body: 'A new version of the app is available. Click to update.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'app-update',
    requireInteraction: true,
    actions: [
      {
        action: 'update',
        title: 'Update Now',
      },
      {
        action: 'dismiss',
        title: 'Later',
      },
    ],
  });

  // Handle notification click
  notification.onclick = (event) => {
    event.preventDefault();
    notification.close();

    // Apply the update
    pwaRegistration.applyUpdate().catch(error => {
      logger.error('Failed to apply update from notification', { error });
    });
  };

  // Handle dismiss action
  notification.onclose = () => {
    logger.info('Update notification dismissed');
  };
}

/**
 * Send push subscription to server
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('/api/pwa/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send subscription: ${response.status}`);
    }

    logger.info('Push subscription sent to server');

  } catch (error) {
    logger.error('Failed to send subscription to server', { error });
    throw error;
  }
}

/**
 * Convert URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
}

/**
 * Cleanup PWA resources
 */
export async function cleanupPWA(): Promise<void> {
  logger.info('Cleaning up PWA resources');

  try {
    // Unregister service worker
    if (pwaRegistration.getRegistration()) {
      await pwaRegistration.unregister();
    }

    // Clear PWA storage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    logger.info('PWA cleanup completed');

  } catch (error) {
    logger.error('PWA cleanup failed', { error });
  }
}

/**
 * Get PWA diagnostics information
 */
export async function getPWADiagnostics(): Promise<any> {
  const diagnostics = {
    support: {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notifications: 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype,
      storageEstimate: 'storage' in navigator && 'estimate' in navigator.storage,
    },
    status: {
      serviceWorker: null as any,
      notifications: 'Notification' in window ? Notification.permission : 'not-supported',
      pushSubscription: null as any,
      registration: pwaRegistration.getRegistration(),
      updateAvailable: pwaRegistration.isUpdateAvailable(),
    },
    device: {
      userAgent: navigator.userAgent,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      displayMode: getDisplayMode(),
      onlineStatus: navigator.onLine,
    },
    storage: null as any,
  };

  // Get service worker status
  if (diagnostics.registration) {
    diagnostics.status.serviceWorker = {
      active: !!diagnostics.registration.active,
      installing: !!diagnostics.registration.installing,
      waiting: !!diagnostics.registration.waiting,
      scope: diagnostics.registration.scope,
    };
  }

  // Get push subscription
  if (diagnostics.registration?.pushManager) {
    try {
      diagnostics.status.pushSubscription = await diagnostics.registration.pushManager.getSubscription();
    } catch (error) {
      logger.warn('Failed to get push subscription', { error });
    }
  }

  // Get storage information
  if (diagnostics.support.storageEstimate) {
    try {
      const estimate = await navigator.storage.estimate();
      diagnostics.storage = {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usagePercentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
      };
    } catch (error) {
      logger.warn('Failed to get storage estimate', { error });
    }
  }

  return diagnostics;
}

/**
 * Get current display mode
 */
function getDisplayMode(): string {
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }

  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }

  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }

  return 'browser';
}

export default initializePWA;