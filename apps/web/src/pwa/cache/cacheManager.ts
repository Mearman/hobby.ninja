/**
 * Cache Manager
 *
 * Advanced cache management with intelligent strategies, cleanup,
 * and performance optimization for Progressive Web Apps.
 */

import type { PWAConfig, CacheConfig } from '../types/pwa';
import { logger } from '../logging/logger';

/**
 * Cache Manager Class
 *
 * Handles all caching operations with intelligent strategies
 * including cleanup, expiration, and performance monitoring.
 */
export class CacheManager {
  private config: PWAConfig;
  private metrics = {
    hits: 0,
    misses: 0,
    puts: 0,
    deletes: 0,
    errors: 0,
  };

  constructor(config: PWAConfig) {
    this.config = config;
  }

  /**
   * Pre-cache critical assets during installation
   */
  async precacheAssets(): Promise<void> {
    const assets = this.config.cache.precache;
    if (!assets.length) {
      logger.debug('No assets to precache');
      return;
    }

    logger.info('Precaching assets', { count: assets.length });

    try {
      const cache = await this.openCache('precache-v1');
      await cache.addAll(assets);

      logger.info('Precaching completed', {
        cached: assets.length,
        assets: assets
      });

      // Update metrics
      this.metrics.puts += assets.length;

    } catch (error) {
      logger.error('Precaching failed', { error, assets });
      throw error;
    }
  }

  /**
   * Get response from cache
   */
  async get(request: Request, cacheName: string): Promise<Response | null> {
    const startTime = performance.now();

    try {
      const cache = await this.openCache(cacheName);
      const response = await cache.match(request);

      if (response) {
        this.metrics.hits++;
        logger.debug('Cache hit', {
          url: request.url,
          cacheName,
          duration: performance.now() - startTime
        });

        return response;
      }

      this.metrics.misses++;
      logger.debug('Cache miss', {
        url: request.url,
        cacheName,
        duration: performance.now() - startTime
      });

      return null;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache get failed', {
        url: request.url,
        cacheName,
        error
      });

      return null;
    }
  }

  /**
   * Store response in cache
   */
  async put(request: Request, response: Response, cacheName: string): Promise<void> {
    const startTime = performance.now();

    try {
      const cache = await this.openCache(cacheName);

      // Add timestamp header for expiration handling
      const responseWithTimestamp = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...response.headers,
          'cache-timestamp': Date.now().toString(),
        },
      });

      await cache.put(request, responseWithTimestamp);

      this.metrics.puts++;
      logger.debug('Cache put', {
        url: request.url,
        cacheName,
        status: response.status,
        duration: performance.now() - startTime
      });

      // Enforce cache limits if configured
      await this.enforceCacheLimits(cacheName);

    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache put failed', {
        url: request.url,
        cacheName,
        error
      });

      // If this is a quota exceeded error, try to free space
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        await this.handleQuotaExceeded(cacheName);
      } else {
        throw error;
      }
    }
  }

  /**
   * Delete entry from cache
   */
  async delete(request: Request, cacheName: string): Promise<boolean> {
    try {
      const cache = await this.openCache(cacheName);
      const deleted = await cache.delete(request);

      if (deleted) {
        this.metrics.deletes++;
        logger.debug('Cache delete', {
          url: request.url,
          cacheName
        });
      }

      return deleted;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache delete failed', {
        url: request.url,
        cacheName,
        error
      });

      return false;
    }
  }

  /**
   * Open cache with error handling
   */
  async openCache(cacheName: string): Promise<Cache> {
    try {
      return await caches.open(cacheName);
    } catch (error) {
      logger.error('Failed to open cache', { cacheName, error });
      throw error;
    }
  }

  /**
   * Clean up old caches during activation
   */
  async cleanupOldCaches(): Promise<void> {
    logger.info('Starting cache cleanup');

    try {
      const currentCacheNames = this.getCurrentCacheNames();
      const allCacheNames = await caches.keys();
      const oldCaches = allCacheNames.filter(name => !currentCacheNames.includes(name));

      if (oldCaches.length === 0) {
        logger.debug('No old caches to clean up');
        return;
      }

      logger.info('Found old caches to clean up', {
        oldCaches,
        count: oldCaches.length
      });

      const deletionResults = await Promise.all(
        oldCaches.map(async (cacheName) => {
          try {
            const deleted = await caches.delete(cacheName);
            logger.debug('Cache deletion result', {
              cacheName,
              deleted
            });
            return { cacheName, deleted, error: null };
          } catch (error) {
            logger.error('Failed to delete cache', {
              cacheName,
              error
            });
            return { cacheName, deleted: false, error };
          }
        })
      );

      const successfulDeletions = deletionResults.filter(result => result.deleted);
      const failedDeletions = deletionResults.filter(result => !result.deleted);

      logger.info('Cache cleanup completed', {
        total: oldCaches.length,
        successful: successfulDeletions.length,
        failed: failedDeletions.length,
        failedCaches: failedDeletions.map(result => result.cacheName)
      });

    } catch (error) {
      logger.error('Cache cleanup failed', { error });
      throw error;
    }
  }

  /**
   * Get current cache names based on configuration
   */
  private getCurrentCacheNames(): string[] {
    const cacheNames = [
      'precache-v1',
      'offline-fallback',
      ...this.config.cache.runtime.map(config => config.name),
    ];

    // Add strategy-based cache names
    if (this.config.cache.runtime) {
      this.config.cache.runtime.forEach(config => {
        cacheNames.push(config.name);
      });
    }

    return cacheNames;
  }

  /**
   * Enforce cache size and entry limits
   */
  private async enforceCacheLimits(cacheName: string): Promise<void> {
    const cacheConfig = this.config.cache.runtime.find(config => config.name === cacheName);
    if (!cacheConfig || (!cacheConfig.maxEntries && !cacheConfig.maxAge)) {
      return;
    }

    try {
      const cache = await this.openCache(cacheName);
      const requests = await cache.keys();

      let operations = 0;

      // Enforce max entries limit
      if (cacheConfig.maxEntries && requests.length > cacheConfig.maxEntries) {
        const requestsToDelete = requests.slice(0, requests.length - cacheConfig.maxEntries);

        await Promise.all(
          requestsToDelete.map(request => cache.delete(request))
        );

        operations += requestsToDelete.length;
        logger.debug('Enforced max entries limit', {
          cacheName,
          deleted: requestsToDelete.length,
          total: requests.length,
          limit: cacheConfig.maxEntries
        });
      }

      // Enforce max age limit
      if (cacheConfig.maxAge) {
        const now = Date.now();
        const expiredRequests: Request[] = [];

        for (const request of requests) {
          try {
            const response = await cache.match(request);
            if (response) {
              const timestamp = response.headers.get('cache-timestamp');
              if (timestamp && (now - parseInt(timestamp)) > cacheConfig.maxAge) {
                expiredRequests.push(request);
              }
            }
          } catch (error) {
            // If we can't read the response, consider it expired
            expiredRequests.push(request);
          }
        }

        if (expiredRequests.length > 0) {
          await Promise.all(
            expiredRequests.map(request => cache.delete(request))
          );

          operations += expiredRequests.length;
          logger.debug('Enforced max age limit', {
            cacheName,
            deleted: expiredRequests.length,
            maxAge: cacheConfig.maxAge
          });
        }
      }

      if (operations > 0) {
        logger.info('Cache limits enforced', {
          cacheName,
          totalOperations: operations
        });
      }

    } catch (error) {
      logger.error('Failed to enforce cache limits', {
        cacheName,
        error
      });
    }
  }

  /**
   * Handle quota exceeded errors
   */
  private async handleQuotaExceeded(cacheName: string): Promise<void> {
    logger.warn('Cache quota exceeded, attempting cleanup', { cacheName });

    try {
      // Clean up old caches first
      await this.cleanupOldCaches();

      // Aggressively clean up the specific cache
      const cache = await this.openCache(cacheName);
      const requests = await cache.keys();

      // Delete the oldest 25% of entries
      const entriesToDelete = Math.max(1, Math.floor(requests.length * 0.25));
      const requestsToDelete = requests.slice(0, entriesToDelete);

      await Promise.all(
        requestsToDelete.map(request => cache.delete(request))
      );

      logger.info('Emergency cache cleanup completed', {
        cacheName,
        deleted: entriesToDelete,
        remaining: requests.length - entriesToDelete
      });

    } catch (error) {
      logger.error('Emergency cache cleanup failed', {
        cacheName,
        error
      });
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): any {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      total,
      hitRate: total > 0 ? (this.metrics.hits / total) * 100 : 0,
    };
  }

  /**
   * Get cache information for debugging
   */
  async getCacheInfo(): Promise<any> {
    try {
      const cacheNames = await caches.keys();
      const cacheInfo = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const requests = await cache.keys();

          return {
            name,
            size: requests.length,
            requests: requests.map(request => ({
              url: request.url,
              method: request.method,
            })),
          };
        })
      );

      return {
        caches: cacheInfo,
        totalCaches: cacheNames.length,
        totalEntries: cacheInfo.reduce((sum, info) => sum + info.size, 0),
        metrics: this.getMetrics(),
      };

    } catch (error) {
      logger.error('Failed to get cache info', { error });
      return {
        caches: [],
        totalCaches: 0,
        totalEntries: 0,
        metrics: this.getMetrics(),
      };
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    logger.info('Clearing all caches');

    try {
      const cacheNames = await caches.keys();
      const deletionResults = await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );

      const successCount = deletionResults.filter(Boolean).length;
      const failureCount = deletionResults.length - successCount;

      logger.info('Cache clearing completed', {
        total: cacheNames.length,
        successful: successCount,
        failed: failureCount
      });

      // Reset metrics
      this.metrics = {
        hits: 0,
        misses: 0,
        puts: 0,
        deletes: 0,
        errors: 0,
      };

    } catch (error) {
      logger.error('Failed to clear caches', { error });
      throw error;
    }
  }

  /**
   * Check if URL is cacheable based on configuration
   */
  isCacheable(request: Request): boolean {
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
      return false;
    }

    // Skip chrome-extension URLs
    if (url.protocol === 'chrome-extension:') {
      return false;
    }

    // Skip non-HTTP(S) protocols
    if (!url.protocol.startsWith('http')) {
      return false;
    }

    // Check for network-only routes
    const isNetworkOnly = this.config.offline.networkOnlyRoutes.some(route =>
      url.pathname.startsWith(route)
    );

    return !isNetworkOnly;
  }

  /**
   * Estimate cache usage
   */
  async estimateCacheUsage(): Promise<number> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }

      return 0;
    } catch (error) {
      logger.warn('Failed to estimate cache usage', { error });
      return 0;
    }
  }

  /**
   * Check if storage quota is nearly exceeded
   */
  async isStorageQuotaNearlyExceeded(threshold = 0.9): Promise<boolean> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;

        return quota > 0 && (usage / quota) > threshold;
      }

      return false;
    } catch (error) {
      logger.warn('Failed to check storage quota', { error });
      return false;
    }
  }
}