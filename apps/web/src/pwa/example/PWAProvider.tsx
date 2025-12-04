/**
 * PWA Provider Component
 *
 * Example component demonstrating how to integrate PWA functionality
 * with a React application using the provided hooks and utilities.
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { initializePWA, type PWAEvents } from '../setup';
import { logger } from '../logging/logger';
import { usePWAStatus, useServiceWorker, useNotifications, useOfflineDetection } from '../hooks/usePwa';

/**
 * PWA Context Interface
 */
interface PWAContextType {
  // Status
  isSupported: boolean;
  isRegistered: boolean;
  updateAvailable: boolean;
  isOnline: boolean;
  isOffline: boolean;
  version: string | null;

  // Actions
  applyUpdate: () => Promise<void>;
  checkForUpdate: () => Promise<boolean>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;

  // Features
  features: {
    serviceWorker: boolean;
    notifications: boolean;
    backgroundSync: boolean;
    storage: boolean;
  };
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

/**
 * PWA Provider Props
 */
interface PWAProviderProps {
  children: ReactNode;
  config?: {
    enableServiceWorker?: boolean;
    enableNotifications?: boolean;
    enableBackgroundSync?: boolean;
    enableUpdatePrompt?: boolean;
    serviceWorkerUrl?: string;
    vapidPublicKey?: string;
  };
  onPWAReady?: () => void;
  onUpdateAvailable?: () => void;
  onError?: (error: Error) => void;
}

/**
 * PWA Provider Component
 *
 * Provides PWA functionality to the entire application tree.
 */
export function PWAProvider({
  children,
  config = {},
  onPWAReady,
  onUpdateAvailable,
  onError,
}: PWAProviderProps) {
  // Hooks for different aspects of PWA
  const { isOnline, isOffline } = useOfflineDetection();
  const { isSupported, isRegistered, updateAvailable, version } = usePWAStatus();
  const { applyUpdate, checkForUpdate, register } = useServiceWorker();
  const { requestPermission } = useNotifications();

  // PWA events configuration
  const pwaEvents: PWAEvents = {
    onRegistered: (registration) => {
      logger.info('PWA Provider: Service worker registered', {
        scope: registration.scope,
      });
      onPWAReady?.();
    },
    onUpdateFound: (registration) => {
      logger.info('PWA Provider: Update found', {
        waiting: !!registration.waiting,
      });
    },
    onUpdated: (registration) => {
      logger.info('PWA Provider: Service worker updated');
      onUpdateAvailable?.();
    },
    onOnline: () => {
      logger.info('PWA Provider: Back online');
    },
    onOffline: () => {
      logger.info('PWA Provider: Gone offline');
    },
    onError: (error) => {
      logger.error('PWA Provider: Service worker error', { error });
      onError?.(error);
    },
  };

  // Initialize PWA on mount
  useEffect(() => {
    let mounted = true;

    const initPWA = async () => {
      try {
        logger.info('PWA Provider: Initializing PWA', config);

        await initializePWA(config, pwaEvents);

        if (mounted) {
          logger.info('PWA Provider: PWA initialized successfully');
        }

      } catch (error) {
        if (mounted) {
          logger.error('PWA Provider: PWA initialization failed', { error });
          onError?.(error as Error);
        }
      }
    };

    initPWA();

    return () => {
      mounted = false;
    };
  }, []);

  // Detect PWA features
  const features = {
    serviceWorker: 'serviceWorker' in navigator,
    notifications: 'Notification' in window,
    backgroundSync: 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype,
    storage: 'storage' in navigator && 'estimate' in navigator.storage,
  };

  // Context value
  const contextValue: PWAContextType = {
    // Status
    isSupported,
    isRegistered,
    updateAvailable,
    isOnline,
    isOffline,
    version,

    // Actions
    applyUpdate,
    checkForUpdate,
    requestNotificationPermission: requestPermission,
    registerServiceWorker: register,

    // Features
    features,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
    </PWAContext.Provider>
  );
}

/**
 * usePWA Hook
 *
 * Convenience hook to access PWA context.
 */
export function usePWA(): PWAContextType {
  const context = useContext(PWAContext);

  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }

  return context;
}

/**
 * PWA Status Display Component
 *
 * Example component showing PWA status information.
 */
export function PWAStatusDisplay() {
  const {
    isSupported,
    isRegistered,
    updateAvailable,
    isOnline,
    isOffline,
    version,
    applyUpdate,
    checkForUpdate,
    features,
  } = usePWA();

  if (!isSupported) {
    return (
      <div className="pwa-status pwa-not-supported">
        PWA features not supported in this browser
      </div>
    );
  }

  return (
    <div className="pwa-status">
      <div className="pwa-status-item">
        <span className="pwa-status-label">Service Worker:</span>
        <span className={`pwa-status-value ${isRegistered ? 'active' : 'inactive'}`}>
          {isRegistered ? 'Registered' : 'Not Registered'}
        </span>
      </div>

      <div className="pwa-status-item">
        <span className="pwa-status-label">Connection:</span>
        <span className={`pwa-status-value ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {version && (
        <div className="pwa-status-item">
          <span className="pwa-status-label">Version:</span>
          <span className="pwa-status-value">{version}</span>
        </div>
      )}

      {updateAvailable && (
        <div className="pwa-update-available">
          <span>Update Available!</span>
          <button
            onClick={applyUpdate}
            className="pwa-update-button"
          >
            Update Now
          </button>
        </div>
      )}

      <div className="pwa-actions">
        <button
          onClick={checkForUpdate}
          className="pwa-action-button"
        >
          Check for Updates
        </button>
      </div>

      <div className="pwa-features">
        <h4>Available Features:</h4>
        <ul>
          {features.serviceWorker && <li>Service Worker</li>}
          {features.notifications && <li>Push Notifications</li>}
          {features.backgroundSync && <li>Background Sync</li>}
          {features.storage && <li>Storage API</li>}
        </ul>
      </div>
    </div>
  );
}

/**
 * Offline Indicator Component
 *
 * Shows offline status with appropriate messaging.
 */
export function OfflineIndicator() {
  const { isOnline, isOffline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-indicator">
      <div className="offline-message">
        <span className="offline-icon">📡</span>
        <span className="offline-text">
          You're currently offline. Some features may be limited.
        </span>
      </div>
    </div>
  );
}

/**
 * Install Prompt Component
 *
 * Shows PWA install prompt when available.
 */
export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      logger.info('PWA installation accepted');
    } else {
      logger.info('PWA installation dismissed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-install-content">
        <h3>Install This App</h3>
        <p>Install this app on your device for a better experience.</p>
        <div className="pwa-install-actions">
          <button
            onClick={handleInstall}
            className="pwa-install-button"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="pwa-install-dismiss"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Notification Permission Component
 *
 * Handles notification permission request.
 */
export function NotificationPermission() {
  const { features, requestNotificationPermission } = usePWA();
  const [permissionRequested, setPermissionRequested] = React.useState(false);

  if (!features.notifications || permissionRequested) {
    return null;
  }

  const handleRequestPermission = async () => {
    try {
      const permission = await requestNotificationPermission();
      setPermissionRequested(true);

      if (permission === 'granted') {
        logger.info('Notification permission granted');
      } else {
        logger.info('Notification permission denied');
      }
    } catch (error) {
      logger.error('Failed to request notification permission', { error });
    }
  };

  return (
    <div className="notification-permission">
      <div className="notification-permission-content">
        <h4>Enable Notifications</h4>
        <p>Stay updated with important notifications from this app.</p>
        <button
          onClick={handleRequestPermission}
          className="notification-permission-button"
        >
          Enable Notifications
        </button>
      </div>
    </div>
  );
}

export default PWAProvider;