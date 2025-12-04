import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializePWA, getPWADiagnostics } from '../setup';
import { SyncManager } from '../sync/syncManager';
import { NotificationManager } from '../notifications/notificationManager';
import { logger } from '../logging';
import type { PWAEvents, PWAConfig } from '../types/pwa';
import type { PWASetupConfig } from '../setup';

interface PWAContextType {
  // PWA Status
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isSupported: boolean;

  // Service Worker
  serviceWorkerReady: boolean;
  updateAvailable: boolean;

  // Features
  notificationsEnabled: boolean;
  backgroundSyncEnabled: boolean;
  offlineMode: boolean;

  // Metrics
  diagnostics: any;
  syncStatus: any;
  notificationStats: any;

  // Actions
  promptInstall: () => Promise<boolean>;
  applyUpdate: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  triggerSync: () => Promise<void>;
  clearCache: () => Promise<void>;

  // Managers
  syncManager: SyncManager | null;
  notificationManager: NotificationManager | null;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface PWAProviderProps {
  children: ReactNode;
  config?: Partial<PWAConfig>;
  events?: PWAEvents;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({
  children,
  config = {},
  events = {}
}) => {
  const [pwaState, setPwaState] = useState<PWAContextType>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isSupported: true,
    serviceWorkerReady: false,
    updateAvailable: false,
    notificationsEnabled: false,
    backgroundSyncEnabled: false,
    offlineMode: false,
    diagnostics: null,
    syncStatus: null,
    notificationStats: null,

    // Actions (will be implemented)
    promptInstall: async () => false,
    applyUpdate: async () => {},
    requestNotificationPermission: async () => 'default',
    triggerSync: async () => {},
    clearCache: async () => {},

    syncManager: null,
    notificationManager: null
  });

  const [managers, setManagers] = useState<{
    syncManager: SyncManager | null;
    notificationManager: NotificationManager | null;
  }>({
    syncManager: null,
    notificationManager: null
  });

  // Initialize PWA
  useEffect(() => {
    const initPWA = async () => {
      try {
        // Check PWA support
        const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

        setPwaState(prev => ({
          ...prev,
          isSupported,
          isInstalled
        }));

        if (!isSupported) {
          logger.warn('PWA not supported in this browser');
          return;
        }

        // Default configuration matching PWASetupConfig interface
        const setupConfig: Partial<PWASetupConfig> = {
          enableServiceWorker: true,
          enableNotifications: true,
          enableBackgroundSync: true,
          enableUpdatePrompt: true,
          serviceWorkerUrl: '/sw.js',
          vapidPublicKey: process.env['VITE_VAPID_PUBLIC_KEY']
        };

        // Initialize PWA
        await initializePWA(setupConfig, {
          ...events,
          onInstalled: () => {
            setPwaState(prev => ({ ...prev, isInstalled: true }));
            logger.info('PWA installed successfully');
          },
          onUpdateFound: (registration) => {
            setPwaState(prev => ({ ...prev, updateAvailable: true }));
            logger.info('PWA update available');
          },
          onUpdated: () => {
            setPwaState(prev => ({ ...prev, updateAvailable: false }));
            logger.info('PWA updated successfully');
          },
          onServiceWorkerReady: (registration: ServiceWorkerRegistration) => {
            setPwaState(prev => ({ ...prev, serviceWorkerReady: true }));
            logger.info('Service worker ready');
          },
          onError: (error) => {
            logger.error('PWA initialization error', { error });
          }
        } as PWAEvents);

        // Initialize managers - use a PWAConfig for managers
        const pwaConfig: PWAConfig = {
          version: '1.0.0',
          cache: {
            precache: [],
            runtime: []
          },
          offline: {
            enabled: true,
            fallbackRoute: '/offline',
            networkOnlyRoutes: []
          },
          push: {
            enabled: setupConfig.enableNotifications || true,
            vapidPublicKey: setupConfig.vapidPublicKey || ''
          },
          sync: {
            enabled: setupConfig.enableBackgroundSync || true,
            syncTasks: []
          }
        };

        const syncManager = new SyncManager(pwaConfig);
        const notificationManager = new NotificationManager(pwaConfig);

        await syncManager.initialize();
        await notificationManager.initialize();

        setManagers({ syncManager, notificationManager });

        setPwaState(prev => ({
          ...prev,
          syncManager,
          notificationManager,
          notificationsEnabled: setupConfig.enableNotifications || true,
          backgroundSyncEnabled: setupConfig.enableBackgroundSync || true
        }));

        // Get initial diagnostics
        const diagnostics = await getPWADiagnostics();
        setPwaState(prev => ({ ...prev, diagnostics }));

        logger.info('PWA initialized successfully', { config: setupConfig });

      } catch (error) {
        logger.error('PWA initialization failed', { error });
        setPwaState(prev => ({ ...prev, isSupported: false }));
      }
    };

    initPWA();
  }, [config, events]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setPwaState(prev => ({ ...prev, isOnline: true, offlineMode: false }));
      logger.info('App is online');

      // Trigger sync when back online
      if (managers.syncManager) {
        managers.syncManager.handleConnectionChange(true);
      }
    };

    const handleOffline = () => {
      setPwaState(prev => ({ ...prev, isOnline: false, offlineMode: true }));
      logger.info('App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [managers.syncManager]);

  // Monitor beforeinstallprompt event
  useEffect(() => {
    let deferredPrompt: any = null;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setPwaState(prev => ({ ...prev, isInstallable: true }));
      logger.info('PWA install prompt available');
    };

    const handleAppInstalled = () => {
      deferredPrompt = null;
      setPwaState(prev => ({ ...prev, isInstallable: false, isInstalled: true }));
      logger.info('PWA installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Action implementations
  const promptInstall = async (): Promise<boolean> => {
    if (!pwaState.isInstallable) {
      return false;
    }

    try {
      const promptEvent = (window as any).deferredPrompt;
      if (!promptEvent) {
        return false;
      }

      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;

      setPwaState(prev => ({ ...prev, isInstallable: false }));

      return outcome === 'accepted';
    } catch (error) {
      logger.error('Install prompt failed', { error });
      return false;
    }
  };

  const applyUpdate = async (): Promise<void> => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          setPwaState(prev => ({ ...prev, updateAvailable: false }));
          logger.info('PWA update applied');
        }
      }
    } catch (error) {
      logger.error('Failed to apply PWA update', { error });
    }
  };

  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    try {
      if (managers.notificationManager) {
        return await managers.notificationManager.requestPermission();
      }

      return Notification.requestPermission();
    } catch (error) {
      logger.error('Failed to request notification permission', { error });
      return 'denied';
    }
  };

  const triggerSync = async (): Promise<void> => {
    try {
      if (managers.syncManager) {
        await managers.syncManager.requestSync('manual-sync');
      }
    } catch (error) {
      logger.error('Failed to trigger sync', { error });
    }
  };

  const clearCache = async (): Promise<void> => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        logger.info('Cache cleared successfully');
      }
    } catch (error) {
      logger.error('Failed to clear cache', { error });
    }
  };

  // Update sync and notification stats periodically
  useEffect(() => {
    const updateStats = async () => {
      if (managers.syncManager) {
        const syncStatus = managers.syncManager.getStats();
        setPwaState(prev => ({ ...prev, syncStatus }));
      }

      if (managers.notificationManager) {
        const notificationStats = managers.notificationManager.getStats();
        setPwaState(prev => ({ ...prev, notificationStats }));
      }
    };

    const interval = setInterval(updateStats, 30000); // Update every 30 seconds
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, [managers]);

  const value: PWAContextType = {
    ...pwaState,
    promptInstall,
    applyUpdate,
    requestNotificationPermission,
    triggerSync,
    clearCache,
    syncManager: managers.syncManager,
    notificationManager: managers.notificationManager
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = (): PWAContextType => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default PWAProvider;