/**
 * PWA Configuration
 *
 * Central configuration for Progressive Web App features including
 * caching strategies, service worker settings, and feature flags.
 */

import type { PWAConfig, CacheConfig } from '../types/pwa';

/**
 * Default PWA Configuration
 *
 * This configuration provides production-ready settings for:
 * - Precaching of critical assets
 * - Runtime caching with multiple strategies
 * - Offline functionality and fallbacks
 * - Push notifications
 * - Background sync
 */
export const PWA_DEFAULT_CONFIG: PWAConfig = {
  version: '1.0.0',
  cache: {
    precache: [
      '/',
      '/index.html',
      '/manifest.json',
      '/offline.html',
      '/favicon.ico',
      '/robots.txt',
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
        networkTimeout: 10 * 1000, // 10 seconds
      },
      {
        name: 'images',
        strategy: 'cacheFirst',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxEntries: 200,
      },
      {
        name: 'pages',
        strategy: 'staleWhileRevalidate',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        maxEntries: 30,
      },
    ],
  },
  offline: {
    enabled: true,
    fallbackRoute: '/offline.html',
    networkOnlyRoutes: [
      '/api/analytics',
      '/api/metrics',
      '/api/logging',
    ],
  },
  push: {
    enabled: true,
    vapidPublicKey: process.env['VITE_VAPID_PUBLIC_KEY'] || '',
  },
  sync: {
    enabled: true,
    syncTasks: [
      'sync-user-data',
      'sync-photos',
      'sync-messages',
      'sync-actions',
    ],
  },
};

/**
 * Development PWA Configuration
 *
 * Modified settings for development environment with more aggressive
 * caching and relaxed security settings.
 */
export const PWA_DEV_CONFIG: Partial<PWAConfig> = {
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
        strategy: 'staleWhileRevalidate',
        maxAge: 5 * 60 * 1000, // 5 minutes
        maxEntries: 50,
      },
      {
        name: 'api-responses',
        strategy: 'networkFirst',
        maxAge: 60 * 1000, // 1 minute
        maxEntries: 20,
        networkTimeout: 5 * 1000, // 5 seconds
      },
      {
        name: 'images',
        strategy: 'cacheFirst',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        maxEntries: 100,
      },
    ],
  },
  offline: {
    enabled: true,
    fallbackRoute: '/offline.html',
    networkOnlyRoutes: [],
  },
  push: {
    enabled: false, // Disable push in development
    vapidPublicKey: '',
  },
  sync: {
    enabled: true,
    syncTasks: [
      'sync-user-data',
    ],
  },
};

/**
 * Cache strategy configurations for different content types
 */
export const CACHE_STRATEGIES = {
  // HTML pages - stale while revalidate for fresh content
  HTML: {
    name: 'html-cache',
    strategy: 'staleWhileRevalidate' as const,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    maxEntries: 30,
  },

  // CSS and JS - cache first for performance
  STATIC_ASSETS: {
    name: 'static-cache',
    strategy: 'cacheFirst' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 100,
  },

  // Images - cache first with large storage
  IMAGES: {
    name: 'images-cache',
    strategy: 'cacheFirst' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 200,
  },

  // API responses - network first for fresh data
  API: {
    name: 'api-cache',
    strategy: 'networkFirst' as const,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50,
    networkTimeout: 10 * 1000, // 10 seconds
  },

  // External CDN resources - cache first
  CDN: {
    name: 'cdn-cache',
    strategy: 'cacheFirst' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 50,
  },

  // Analytics - network only
  ANALYTICS: {
    name: 'analytics-cache',
    strategy: 'networkOnly' as const,
    maxAge: 0,
    maxEntries: 0,
  },
} as const;

/**
 * URL patterns for different content types
 */
export const URL_PATTERNS = {
  HTML: [
    '/',
    '/(about|contact|help)',
    '/*.html',
  ],

  STATIC_ASSETS: [
    '/styles/',
    '/scripts/',
    '/assets/',
    '/*.css',
    '/*.js',
  ],

  IMAGES: [
    '/images/',
    '/icons/',
    '/avatars/',
    '/*.png',
    '/*.jpg',
    '/*.jpeg',
    '/*.gif',
    '/*.svg',
    '/*.webp',
    '/*.avif',
  ],

  API: [
    '/api/',
    '/graphql',
  ],

  CDN: [
    'https://cdn.jsdelivr.net',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://unpkg.com',
  ],

  ANALYTICS: [
    '/api/analytics',
    '/api/metrics',
    '/api/events',
    'https://www.google-analytics.com',
    'https://analytics.google.com',
  ],
} as const;

/**
 * Determine cache configuration based on URL
 */
export const getCacheConfigForUrl = (url: string): CacheConfig | null => {
  const { origin, pathname } = new URL(url, self.location.origin);

  // Skip external URLs except for whitelisted CDNs
  if (origin !== self.location.origin) {
    const cdnPattern = URL_PATTERNS.CDN.some(pattern => {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}`);
      return regex.test(url);
    });

    if (!cdnPattern) {
      return null;
    }
  }

  // Check patterns in order of specificity
  const checks = [
    { patterns: URL_PATTERNS.HTML, config: CACHE_STRATEGIES.HTML },
    { patterns: URL_PATTERNS.STATIC_ASSETS, config: CACHE_STRATEGIES.STATIC_ASSETS },
    { patterns: URL_PATTERNS.IMAGES, config: CACHE_STRATEGIES.IMAGES },
    { patterns: URL_PATTERNS.API, config: CACHE_STRATEGIES.API },
    { patterns: URL_PATTERNS.ANALYTICS, config: CACHE_STRATEGIES.ANALYTICS },
  ];

  for (const { patterns, config } of checks) {
    const matches = patterns.some(pattern => {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}`);
      return regex.test(pathname) || regex.test(url);
    });

    if (matches) {
      return config;
    }
  }

  // Default to HTML strategy for unknown patterns
  return CACHE_STRATEGIES.HTML;
};

/**
 * Get current PWA configuration based on environment
 */
export const getPWAConfig = (): PWAConfig => {
  const isDevelopment = import.meta.env.DEV;

  if (isDevelopment) {
    return {
      ...PWA_DEFAULT_CONFIG,
      ...PWA_DEV_CONFIG,
    };
  }

  return PWA_DEFAULT_CONFIG;
};

/**
 * Validate PWA configuration
 */
export const validatePWAConfig = (config: Partial<PWAConfig>): boolean => {
  try {
    // Validate cache configuration
    if (config.cache) {
      if (!Array.isArray(config.cache.precache)) {
        throw new Error('cache.precache must be an array');
      }

      if (!Array.isArray(config.cache.runtime)) {
        throw new Error('cache.runtime must be an array');
      }

      config.cache.runtime.forEach((cacheConfig, index) => {
        if (!cacheConfig.name || typeof cacheConfig.name !== 'string') {
          throw new Error(`cache.runtime[${index}].name must be a non-empty string`);
        }

        if (!['cacheFirst', 'networkFirst', 'staleWhileRevalidate', 'networkOnly', 'cacheOnly'].includes(cacheConfig.strategy)) {
          throw new Error(`cache.runtime[${index}].strategy must be a valid cache strategy`);
        }

        if (cacheConfig.maxAge && (typeof cacheConfig.maxAge !== 'number' || cacheConfig.maxAge < 0)) {
          throw new Error(`cache.runtime[${index}].maxAge must be a positive number`);
        }

        if (cacheConfig.maxEntries && (typeof cacheConfig.maxEntries !== 'number' || cacheConfig.maxEntries < 0)) {
          throw new Error(`cache.runtime[${index}].maxEntries must be a positive number`);
        }
      });
    }

    // Validate offline configuration
    if (config.offline) {
      if (typeof config.offline.enabled !== 'boolean') {
        throw new Error('offline.enabled must be a boolean');
      }

      if (config.offline.fallbackRoute && typeof config.offline.fallbackRoute !== 'string') {
        throw new Error('offline.fallbackRoute must be a string');
      }
    }

    // Validate push configuration
    if (config.push) {
      if (typeof config.push.enabled !== 'boolean') {
        throw new Error('push.enabled must be a boolean');
      }

      if (config.push.vapidPublicKey && typeof config.push.vapidPublicKey !== 'string') {
        throw new Error('push.vapidPublicKey must be a string');
      }
    }

    // Validate sync configuration
    if (config.sync) {
      if (typeof config.sync.enabled !== 'boolean') {
        throw new Error('sync.enabled must be a boolean');
      }

      if (!Array.isArray(config.sync.syncTasks)) {
        throw new Error('sync.syncTasks must be an array');
      }
    }

    return true;
  } catch (error) {
    console.error('PWA Configuration validation failed:', error);
    return false;
  }
};

export default getPWAConfig;