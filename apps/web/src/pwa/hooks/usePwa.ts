/**
 * PWA React Hooks
 *
 * React hooks for integrating PWA functionality with components,
 * including service worker status, updates, offline detection,
 * and push notifications.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { pwaRegistration, type PWAEvents } from '../lifecycle/pwaRegistration';
import { logger } from '../logging/logger';

/**
 * PWA Status Hook
 *
 * Returns the current PWA status including registration state,
 * update availability, and online status.
 */
export function usePWAStatus() {
  const [status, setStatus] = useState({
    isSupported: false,
    isRegistered: false,
    updateAvailable: false,
    isOnline: navigator.onLine,
    isControlled: false,
    version: null as string | null,
    registration: null as ServiceWorkerRegistration | null,
  });

  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator;
    const isControlled = !!navigator.serviceWorker.controller;

    setStatus(prev => ({
      ...prev,
      isSupported,
      isControlled,
    }));

    // Get initial status
    if (isSupported) {
      const registration = pwaRegistration.getRegistration();
      const isRegistered = !!registration;
      const updateAvailable = pwaRegistration.isUpdateAvailable();

      setStatus(prev => ({
        ...prev,
        isRegistered,
        updateAvailable,
        registration,
      }));

      // Get version
      pwaRegistration.getVersion().then(version => {
        setStatus(prev => ({ ...prev, version }));
      });
    }

    // Setup event listeners
    const events: PWAEvents = {
      onRegistered: (registration) => {
        setStatus(prev => ({
          ...prev,
          isRegistered: true,
          registration,
        }));
      },
      onUpdated: () => {
        setStatus(prev => ({ ...prev, updateAvailable: true }));
      },
      onOnline: () => {
        setStatus(prev => ({ ...prev, isOnline: true }));
      },
      onOffline: () => {
        setStatus(prev => ({ ...prev, isOnline: false }));
      },
      onError: (error) => {
        logger.error('PWA hook error', { error });
      },
    };

    pwaRegistration.register(events);

    // Listen for online/offline events
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

/**
 * Service Worker Registration Hook
 *
 * Manages service worker registration and updates.
 */
export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const register = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const reg = await pwaRegistration.register();
      setRegistration(reg);
      return reg;
    } catch (err) {
      setError(err as Error);
      logger.error('Service worker registration failed in hook', { err });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unregister = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await pwaRegistration.unregister();
      if (success) {
        setRegistration(null);
      }
      return success;
    } catch (err) {
      setError(err as Error);
      logger.error('Service worker unregistration failed in hook', { err });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    try {
      return await pwaRegistration.checkForUpdate();
    } catch (err) {
      setError(err as Error);
      logger.error('Update check failed in hook', { err });
      return false;
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    try {
      await pwaRegistration.applyUpdate();
    } catch (err) {
      setError(err as Error);
      logger.error('Update application failed in hook', { err });
      throw err;
    }
  }, []);

  const getVersion = useCallback(async () => {
    try {
      return await pwaRegistration.getVersion();
    } catch (err) {
      setError(err as Error);
      logger.error('Version check failed in hook', { err });
      return null;
    }
  }, []);

  useEffect(() => {
    // Get initial registration
    const reg = pwaRegistration.getRegistration();
    if (reg) {
      setRegistration(reg);
    }
  }, []);

  return {
    registration,
    isLoading,
    error,
    register,
    unregister,
    checkForUpdate,
    applyUpdate,
    getVersion,
    isUpdateAvailable: registration ? pwaRegistration.isUpdateAvailable() : false,
  };
}

/**
 * Notification Hook
 *
 * Manages push notification permissions and subscription.
 */
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      const err = new Error('Notifications not supported');
      setError(err);
      throw err;
    }

    setIsLoading(true);
    setError(null);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      return perm;
    } catch (err) {
      setError(err as Error);
      logger.error('Notification permission request failed in hook', { err });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const subscribe = useCallback(async (vapidPublicKey?: string) => {
    if (!('serviceWorker' in navigator)) {
      const err = new Error('Service Worker not supported');
      setError(err);
      throw err;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      setSubscription(sub);
      return sub;
    } catch (err) {
      setError(err as Error);
      logger.error('Push subscription failed in hook', { err });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      return true;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await subscription.unsubscribe();
      if (success) {
        setSubscription(null);
      }
      return success;
    } catch (err) {
      setError(err as Error);
      logger.error('Push unsubscription failed in hook', { err });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  useEffect(() => {
    // Get initial permission and subscription
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(sub => {
          setSubscription(sub);
        });
      });
    }
  }, []);

  return {
    permission,
    subscription,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
  };
}

/**
 * Offline Detection Hook
 *
 * Detects online/offline status and provides utilities for offline handling.
 */
export function useOfflineDetection() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      logger.info('Device back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      logger.info('Device went offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    wasOffline,
    isOffline: !isOnline,
  };
}

/**
 * Background Sync Hook
 *
 * Manages background sync registration and status.
 */
export function useBackgroundSync() {
  const [isSupported, setIsSupported] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState<string[]>([]);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype;
    setIsSupported(supported);

    if (supported) {
      // Get pending sync tags
      navigator.serviceWorker.ready.then(registration => {
        if (registration && 'sync' in registration && registration.sync) {
          registration.sync.getTags().then(tags => {
            setPendingSyncs(tags);
          });
        }
      });
    }
  }, []);

  const registerSync = useCallback(async (tag: string) => {
    if (!isSupported) {
      throw new Error('Background sync not supported');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'sync' in registration && registration.sync) {
        await registration.sync.register(tag);
        setPendingSyncs(prev => [...prev, tag]);
      }
    } catch (err) {
      logger.error('Background sync registration failed in hook', { tag, err });
      throw err;
    }
  }, [isSupported]);

  const getPendingSyncs = useCallback(async () => {
    if (!isSupported) {
      return [];
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'sync' in registration && registration.sync) {
        const tags = await registration.sync.getTags();
        setPendingSyncs(tags);
        return tags;
      }
      return [];
    } catch (err) {
      logger.error('Failed to get pending syncs in hook', { err });
      return [];
    }
  }, [isSupported]);

  return {
    isSupported,
    pendingSyncs,
    registerSync,
    getPendingSyncs,
  };
}

/**
 * PWA Install Prompt Hook
 *
 * Manages PWA install prompt for mobile devices.
 */
export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      logger.info('PWA install prompt ready');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) {
      logger.warn('No install prompt available');
      return false;
    }

    setIsLoading(true);

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        logger.info('PWA installation accepted');
        setDeferredPrompt(null);
        setIsInstallable(false);
        return true;
      } else {
        logger.info('PWA installation dismissed');
        return false;
      }
    } catch (err) {
      logger.error('PWA installation failed in hook', { err });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDeferredPrompt(null);
    setIsInstallable(false);
  }, []);

  return {
    isInstallable,
    isLoading,
    install,
    dismiss,
  };
}

/**
 * PWA Performance Hook
 *
 * Provides PWA performance metrics and monitoring.
 */
export function usePWAPerformance() {
  const [metrics, setMetrics] = useState({
    cacheHitRate: 0,
    offlineUsage: 0,
    performanceScore: 100,
    loadTime: 0,
  });

  useEffect(() => {
    // Calculate load time
    const loadTime = performance.now();

    // Get performance metrics from service worker if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'GET_METRICS',
      });

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'METRICS_RESPONSE') {
          setMetrics(prev => ({
            ...prev,
            ...event.data.metrics,
          }));
          navigator.serviceWorker.removeEventListener('message', handleMessage);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    setMetrics(prev => ({ ...prev, loadTime }));

  }, []);

  return metrics;
}