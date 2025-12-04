/**
 * PWA Module Exports
 *
 * Progressive Web App functionality including service workers,
 * push notifications, background sync, and offline capabilities.
 */

// Core setup
export { initializePWA, cleanupPWA, getPWADiagnostics } from './setup';

// Lifecycle management
export { PWARegistration } from './lifecycle/pwaRegistration';
export type { PWAEvents } from './lifecycle/pwaRegistration';

// Configuration
export { getPWAConfig, PWA_DEFAULT_CONFIG as pwaConfig } from './config/pwaConfig';
export type { PWAConfig } from './types/pwa';

// Logging
export { logger } from './logging/logger';

// Cache management
export { CacheManager } from './cache/cacheManager';

// Sync management
export { SyncManager } from './sync/syncManager';

// Notification management
export { NotificationManager } from './notifications/notificationManager';

// Utilities
export * from './utils/pwaUtils';
export * from './utils/metricsCollector';

// Hooks
export { usePWAStatus, usePWAInstall, usePWAPerformance } from './hooks/usePwa';

// Provider
export { PWAProvider } from './provider/PWAProvider';

// Components
export { default as PWAInstallPrompt } from './components/PWAInstallPrompt';
export { default as PWAUpdater } from './components/PWAUpdater';
export { default as AppShell } from './components/AppShell';
export { default as OfflineSyncManager } from './components/OfflineSyncManager';
export { default as PushNotificationSettings } from './components/PushNotificationSettings';

// Security & Monitoring
export { default as PWASecurityIntegration } from './security/PWASecurityIntegration';
export { default as PWAMonitoringDashboard } from './monitoring/PWAMonitoringDashboard';

// Types
export * from './types/pwa';
