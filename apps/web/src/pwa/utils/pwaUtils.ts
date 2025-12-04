/**
 * PWA Utility Functions
 *
 * Utility functions for Progressive Web App functionality including
 * detection, installation prompts, and feature availability checks.
 */

/**
 * Check if PWA is supported in current browser
 */
export function isPWASupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    'caches' in window
  );
}

/**
 * Check if app is running in standalone mode (PWA installed)
 */
export function isStandaloneMode(): boolean {
  return !!(
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && window.navigator.standalone) ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if app is installed as PWA
 */
export function isInstalled(): boolean {
  return isStandaloneMode() || !!window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Get app install status
 */
export function getInstallStatus(): 'unknown' | 'installed' | 'installable' | 'not-supported' {
  if (!isPWASupported()) {
    return 'not-supported';
  }

  if (isInstalled()) {
    return 'installed';
  }

  // Check if installable (this will be detected by beforeinstallprompt event)
  return 'installable';
}

/**
 * Get device information
 */
export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    isStandalone: isStandaloneMode(),
    displayMode: getDisplayMode(),
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
  };
}

/**
 * Get current display mode
 */
export function getDisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
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

/**
 * Check if specific PWA feature is available
 */
export function isFeatureAvailable(feature: 'service-worker' | 'push' | 'notifications' | 'background-sync' | 'storage' | 'install-prompt'): boolean {
  switch (feature) {
    case 'service-worker':
      return 'serviceWorker' in navigator;
    case 'push':
      return 'PushManager' in window;
    case 'notifications':
      return 'Notification' in window;
    case 'background-sync':
      return 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype;
    case 'storage':
      return 'storage' in navigator && 'estimate' in navigator.storage;
    case 'install-prompt':
      return 'onbeforeinstallprompt' in window;
    default:
      return false;
  }
}

/**
 * Get all available PWA features
 */
export function getAvailableFeatures() {
  return {
    serviceWorker: isFeatureAvailable('service-worker'),
    push: isFeatureAvailable('push'),
    notifications: isFeatureAvailable('notifications'),
    backgroundSync: isFeatureAvailable('background-sync'),
    storage: isFeatureAvailable('storage'),
    installPrompt: isFeatureAvailable('install-prompt'),
  };
}

/**
 * Get storage usage information
 */
export async function getStorageInfo() {
  if (!isFeatureAvailable('storage')) {
    return {
      supported: false,
      usage: 0,
      quota: 0,
      usagePercentage: 0,
      available: 0,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const available = quota - usage;

    return {
      supported: true,
      usage,
      quota,
      usagePercentage: quota > 0 ? (usage / quota) * 100 : 0,
      available,
      usageFormatted: formatBytes(usage),
      quotaFormatted: formatBytes(quota),
      availableFormatted: formatBytes(available),
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return {
      supported: true,
      usage: 0,
      quota: 0,
      usagePercentage: 0,
      available: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear app data (caches, storage, etc.)
 */
export async function clearAppData(): Promise<{ success: boolean; cleared: any; error?: any }> {
  const results: any = {};

  try {
    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const cacheResults = await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
      results.caches = {
        count: cacheNames.length,
        cleared: cacheResults.filter(Boolean).length,
      };
    }

    // Clear localStorage
    if ('localStorage' in window) {
      const localStorageKeys = Object.keys(localStorage);
      localStorageKeys.forEach(key => localStorage.removeItem(key));
      results.localStorage = {
        cleared: localStorageKeys.length,
      };
    }

    // Clear sessionStorage
    if ('sessionStorage' in window) {
      const sessionStorageKeys = Object.keys(sessionStorage);
      sessionStorageKeys.forEach(key => sessionStorage.removeItem(key));
      results.sessionStorage = {
        cleared: sessionStorageKeys.length,
      };
    }

    return {
      success: true,
      cleared: results,
    };
  } catch (error) {
    return {
      success: false,
      cleared: results,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!isFeatureAvailable('storage')) {
    return false;
  }

  try {
    const isPersistent = await navigator.storage.persist();
    return isPersistent;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Check if storage is persistent
 */
export async function isStoragePersistent(): Promise<boolean> {
  if (!isFeatureAvailable('storage')) {
    return false;
  }

  try {
    const isPersistent = await navigator.storage.persisted();
    return isPersistent;
  } catch (error) {
    console.error('Failed to check storage persistence:', error);
    return false;
  }
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Generate manifest data
 */
export function generateManifest(baseHref = '/') {
  const deviceInfo = getDeviceInfo();

  return {
    name: 'Gunpla App',
    short_name: 'Gunpla',
    description: 'Your Gunpla collection management app',
    start_url: baseHref,
    scope: baseHref,
    display: 'standalone',
    orientation: deviceInfo.isMobile ? 'portrait' : 'any',
    theme_color: '#1971c2',
    background_color: '#ffffff',
    lang: 'en',
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Add Gunpla',
        short_name: 'Add',
        description: 'Add a new Gunpla model to your collection',
        url: `${baseHref}add`,
        icons: [
          {
            src: '/icons/add-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Collection',
        short_name: 'Collection',
        description: 'View your Gunpla collection',
        url: `${baseHref}collection`,
        icons: [
          {
            src: '/icons/collection-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
    ],
    categories: ['productivity', 'utilities'],
    prefer_related_applications: false,
  };
}

/**
 * Create share data for Web Share API
 */
export function createShareData(title: string, text: string, url?: string): ShareData {
  return {
    title,
    text,
    url: url || window.location.href,
  };
}

/**
 * Share content using Web Share API
 */
export async function shareContent(shareData: ShareData): Promise<boolean> {
  if (!navigator.share) {
    console.warn('Web Share API not supported');
    return false;
  }

  try {
    await navigator.share(shareData);
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled sharing
      return false;
    }
    console.error('Sharing failed:', error);
    return false;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      textArea.remove();
      return result;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Get network connection information
 */
export function getNetworkInfo() {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }
  return null;
}

/**
 * Check if device has good connection for caching
 */
export function hasGoodConnection(): boolean {
  const networkInfo = getNetworkInfo();
  if (!networkInfo) {
    return true; // Assume good connection if not available
  }

  const { effectiveType, saveData } = networkInfo;

  // Don't cache heavily on slow connections or data saver mode
  if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
    return false;
  }

  return true;
}

/**
 * Debounce function for PWA operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for PWA operations
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}