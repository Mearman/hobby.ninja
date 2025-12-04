/**
 * PWA Registration
 *
 * Handles service worker registration, updates, and lifecycle management
 * for the client-side application.
 */

// Use global DOM types for ServiceWorkerRegistration
import { logger } from '../logging/logger';

/**
 * PWA Registration Events
 */
export interface PWAEvents {
  onRegistered?: (registration: ServiceWorkerRegistration) => void;
  onUpdateFound?: (registration: ServiceWorkerRegistration) => void;
  onUpdated?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

/**
 * PWA Registration Options
 */
export interface PWARegistrationOptions {
  serviceWorkerUrl: string;
  scope: string;
  updateInterval: number;
  enableUpdatePrompt: boolean;
}

/**
 * PWA Registration Manager
 */
export class PWARegistration {
  private registration: ServiceWorkerRegistration | null = null;
  private isRegistered = false;
  private updateTimer?: number;
  private updateAvailable = false;
  private events: PWAEvents = {};
  private config: PWARegistrationOptions;

  constructor(config: Partial<PWARegistrationOptions> = {}) {
    this.config = {
      serviceWorkerUrl: '/sw.js',
      scope: '/',
      updateInterval: 60 * 60 * 1000, // 1 hour
      enableUpdatePrompt: true,
      ...config,
    };

    this.setupConnectivityListeners();
  }

  /**
   * Register service worker
   */
  async register(events: PWAEvents = {}): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      logger.warn('Service Worker not supported');
      return null;
    }

    if (this.isRegistered) {
      return this.registration;
    }

    this.events = events;

    try {
      logger.info('Registering service worker', {
        scriptUrl: this.config.serviceWorkerUrl,
        scope: this.config.scope,
      });

      this.registration = await navigator.serviceWorker.register(this.config.serviceWorkerUrl, {
        scope: this.config.scope,
      });

      this.isRegistered = true;

      // Set up event listeners
      this.setupEventListeners();

      // Start update checking
      this.startUpdateChecker();

      logger.info('Service worker registered successfully', {
        scope: this.registration.scope,
        scriptURL: this.registration.active?.scriptURL,
      });

      this.events.onRegistered?.(this.registration);

      return this.registration;

    } catch (error) {
      logger.error('Service worker registration failed', { error });
      this.events.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return true;
    }

    try {
      logger.info('Unregistering service worker');

      const success = await this.registration.unregister();
      this.registration = null;
      this.isRegistered = false;
      this.updateAvailable = false;

      // Stop update checking
      this.stopUpdateChecker();

      logger.info('Service worker unregistered', { success });
      return success;

    } catch (error) {
      logger.error('Service worker unregistration failed', { error });
      this.events.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Get current registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Check if update is available
   */
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /**
   * Apply update (skip waiting and claim clients)
   */
  async applyUpdate(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      logger.warn('No waiting service worker to update');
      return;
    }

    try {
      logger.info('Applying service worker update');

      // Send message to skip waiting
      this.registration.waiting.postMessage({
        type: 'SKIP_WAITING',
      });

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      logger.error('Failed to apply update', { error });
      this.events.onError?.(error as Error);
    }
  }

  /**
   * Get service worker version
   */
  async getVersion(): Promise<string | null> {
    if (!this.registration) {
      return null;
    }

    try {
      const activeWorker = this.registration.active;
      if (!activeWorker) {
        return null;
      }

      // Send message to get version
      activeWorker.postMessage({ type: 'GET_VERSION' });

      // Wait for response
      return new Promise((resolve) => {
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'VERSION_RESPONSE') {
            navigator.serviceWorker.removeEventListener('message', handleMessage);
            resolve(event.data.version);
          }
        };

        navigator.serviceWorker.addEventListener('message', handleMessage);

        // Timeout after 5 seconds
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener('message', handleMessage);
          resolve(null);
        }, 5000);
      });

    } catch (error) {
      logger.error('Failed to get service worker version', { error });
      return null;
    }
  }

  /**
   * Trigger update check
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.registration) {
      logger.warn('No service worker registration available');
      return false;
    }

    try {
      logger.info('Checking for service worker update');

      await this.registration.update();

      // Update check will trigger 'updatefound' event if available
      return true;

    } catch (error) {
      logger.error('Failed to check for update', { error });
      this.events.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Setup service worker event listeners
   */
  private setupEventListeners(): void {
    if (!this.registration) {
      return;
    }

    // Listen for updates
    this.registration.addEventListener('updatefound', () => {
      logger.info('Service worker update found');

      const newWorker = this.registration!.installing;
      if (!newWorker) {
        return;
      }

      // Listen for state changes
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && this.registration!.active) {
          // New SW installed, update available
          this.updateAvailable = true;
          logger.info('Service worker update available');

          if (this.config.enableUpdatePrompt) {
            this.promptForUpdate();
          }

          this.events.onUpdated?.(this.registration!);
        }
      });

      this.registration && this.events.onUpdateFound?.(this.registration);
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.info('Service worker controller changed');
      // Page will be reloaded automatically
    });

    // Listen for messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event);
    });
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type } = event.data;

    switch (type) {
      case 'SW_UPDATED':
        logger.info('Service worker updated via message', {
          version: event.data.version,
        });
        this.events.onUpdated?.(this.registration!);
        break;

      case 'OFFLINE_STATUS':
        if (event.data.online) {
          this.events.onOnline?.();
        } else {
          this.events.onOffline?.();
        }
        break;

      default:
        logger.debug('Unknown service worker message', { type, data: event.data });
    }
  }

  /**
   * Setup connectivity listeners
   */
  private setupConnectivityListeners(): void {
    window.addEventListener('online', () => {
      logger.info('Device back online');
      this.events.onOnline?.();
    });

    window.addEventListener('offline', () => {
      logger.info('Device went offline');
      this.events.onOffline?.();
    });
  }

  /**
   * Start periodic update checker
   */
  private startUpdateChecker(): void {
    if (this.config.updateInterval <= 0) {
      return;
    }

    this.updateTimer = window.setInterval(() => {
      this.checkForUpdate();
    }, this.config.updateInterval);

    logger.debug('Update checker started', {
      interval: this.config.updateInterval,
    });
  }

  /**
   * Stop periodic update checker
   */
  private stopUpdateChecker(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
      logger.debug('Update checker stopped');
    }
  }

  /**
   * Prompt user to apply update
   */
  private promptForUpdate(): void {
    if (!this.config.enableUpdatePrompt) {
      return;
    }

    // Create a simple prompt (in a real app, you'd use a proper UI)
    const shouldUpdate = window.confirm(
      'A new version of the app is available. Would you like to update now?'
    );

    if (shouldUpdate) {
      this.applyUpdate();
    }
  }

  /**
   * Get service worker state
   */
  getServiceWorkerState(): ServiceWorkerState | null {
    const activeWorker = this.registration?.active;
    return activeWorker?.state || null;
  }

  /**
   * Check if service worker is controlling the page
   */
  isControlled(): boolean {
    return !!navigator.serviceWorker.controller;
  }

  /**
   * Get PWA information
   */
  getPWAInfo(): any {
    return {
      isRegistered: this.isRegistered,
      updateAvailable: this.updateAvailable,
      isControlled: this.isControlled(),
      serviceWorkerState: this.getServiceWorkerState(),
      registration: this.registration ? {
        scope: this.registration.scope,
        scriptURL: this.registration.active?.scriptURL,
        updateViaCache: this.registration.updateViaCache,
      } : null,
      config: this.config,
      features: {
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        notifications: 'Notification' in window,
        backgroundSync: 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype,
        storage: 'storage' in navigator && 'estimate' in navigator.storage,
      },
    };
  }

  /**
   * Destroy PWA registration
   */
  destroy(): void {
    this.stopUpdateChecker();
    this.registration = null;
    this.isRegistered = false;
    this.updateAvailable = false;
    this.events = {};

    logger.info('PWA registration destroyed');
  }
}

/**
 * Default PWA registration instance
 */
export const pwaRegistration = new PWARegistration();

export default pwaRegistration;