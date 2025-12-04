/**
 * Metrics Collector
 *
 * Comprehensive performance and usage analytics for PWA features.
 * Collects data on cache performance, service worker operations,
 * user engagement, and system health.
 */

import type { PWAAnalytics, CacheMetrics } from '../types/pwa';
import { logger } from '../logging/logger';

/**
 * Metrics Collector Class
 *
 * Collects and analyzes various PWA performance and usage metrics
 * for optimization and monitoring purposes.
 */
export class MetricsCollector {
  private metrics: PWAAnalytics = {
    cacheHitRate: 0,
    offlineUsage: 0,
    pushNotificationEngagement: 0,
    backgroundSyncSuccess: 0,
    serviceWorkerUptime: 0,
  };

  private cacheMetrics = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    responseTimes: [] as number[],
  };

  private pushMetrics = {
    received: 0,
    clicked: 0,
    closed: 0,
    errors: 0,
  };

  private syncMetrics = new Map<string, { success: number; failure: number; lastSync?: number }>();

  private errorMetrics = {
    total: 0,
    byType: new Map<string, number>(),
    critical: 0,
  };

  private performanceMetrics = {
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0,
  };

  private startTime = Date.now();
  private isOnline = navigator.onLine;

  constructor() {
    this.initializePerformanceObservers();
    this.initializeConnectivityListeners();
    this.initializePeriodicReporting();
  }

  /**
   * Initialize performance observers for web vitals
   */
  private initializePerformanceObservers(): void {
    try {
      // First Contentful Paint
      if ('PerformanceObserver' in self) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              this.performanceMetrics.firstContentfulPaint = entry.startTime;
            }
          });
        });
        observer.observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              this.performanceMetrics.largestContentfulPaint = lastEntry.startTime;
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // LCP might not be supported
          logger.warn('LCP observer not supported');
        }

        // First Input Delay
        try {
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
              if (entry.name === 'first-input') {
                this.performanceMetrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
              }
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (e) {
          // FID might not be supported
          logger.warn('FID observer not supported');
        }

        // Cumulative Layout Shift
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            });
            this.performanceMetrics.cumulativeLayoutShift = clsValue;
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          // CLS might not be supported
          logger.warn('CLS observer not supported');
        }
      }
    } catch (error) {
      logger.warn('Failed to initialize performance observers', { error });
    }
  }

  /**
   * Initialize connectivity listeners
   */
  private initializeConnectivityListeners(): void {
    // Listen for online/offline events
    self.addEventListener('online', () => {
      this.isOnline = true;
      logger.debug('Device online status updated', { online: true });
    });

    self.addEventListener('offline', () => {
      this.isOnline = false;
      this.metrics.offlineUsage++;
      logger.debug('Device offline status updated', { online: false });
    });
  }

  /**
   * Initialize periodic metrics reporting
   */
  private initializePeriodicReporting(): void {
    // Report metrics every 5 minutes
    setInterval(() => {
      this.reportMetrics();
    }, 5 * 60 * 1000);
  }

  /**
   * Record request metrics
   */
  recordRequest(request: Request, duration: number): void {
    this.cacheMetrics.totalRequests++;
    this.cacheMetrics.responseTimes.push(duration);

    // Keep only last 100 response times for memory efficiency
    if (this.cacheMetrics.responseTimes.length > 100) {
      this.cacheMetrics.responseTimes = this.cacheMetrics.responseTimes.slice(-100);
    }

    // Update cache hit rate
    this.updateCacheHitRate();

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        url: request.url,
        duration,
        method: request.method,
      });
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.cacheMetrics.hits++;
    this.updateCacheHitRate();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.cacheMetrics.misses++;
    this.updateCacheHitRate();
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses;
    this.metrics.cacheHitRate = total > 0 ? (this.cacheMetrics.hits / total) * 100 : 0;
  }

  /**
   * Record push notification received
   */
  recordPushReceived(): void {
    this.pushMetrics.received++;
  }

  /**
   * Record push notification click
   */
  recordPushClick(): void {
    this.pushMetrics.clicked++;
    this.updatePushEngagement();
  }

  /**
   * Record push notification close
   */
  recordPushClose(): void {
    this.pushMetrics.closed++;
    this.updatePushEngagement();
  }

  /**
   * Update push notification engagement rate
   */
  private updatePushEngagement(): void {
    const total = this.pushMetrics.received;
    const engaged = this.pushMetrics.clicked;
    this.metrics.pushNotificationEngagement = total > 0 ? (engaged / total) * 100 : 0;
  }

  /**
   * Record sync success
   */
  recordSyncSuccess(tag: string): void {
    if (!this.syncMetrics.has(tag)) {
      this.syncMetrics.set(tag, { success: 0, failure: 0 });
    }

    const metrics = this.syncMetrics.get(tag)!;
    metrics.success++;
    metrics.lastSync = Date.now();

    this.updateBackgroundSyncSuccess();
  }

  /**
   * Record sync failure
   */
  recordSyncFailure(tag: string): void {
    if (!this.syncMetrics.has(tag)) {
      this.syncMetrics.set(tag, { success: 0, failure: 0 });
    }

    this.syncMetrics.get(tag)!.failure++;
    this.updateBackgroundSyncSuccess();
  }

  /**
   * Update background sync success rate
   */
  private updateBackgroundSyncSuccess(): void {
    let totalSuccess = 0;
    let totalAttempts = 0;

    this.syncMetrics.forEach(metrics => {
      totalSuccess += metrics.success;
      totalAttempts += metrics.success + metrics.failure;
    });

    this.metrics.backgroundSyncSuccess = totalAttempts > 0 ? (totalSuccess / totalAttempts) * 100 : 0;
  }

  /**
   * Record online status change
   */
  recordOnlineStatus(online: boolean): void {
    if (!online) {
      this.metrics.offlineUsage++;
    }
  }

  /**
   * Record error
   */
  recordError(error: any, context?: string): void {
    this.errorMetrics.total++;

    const errorType = error?.name || 'UnknownError';
    const currentCount = this.errorMetrics.byType.get(errorType) || 0;
    this.errorMetrics.byType.set(errorType, currentCount + 1);

    // Check for critical errors
    if (this.isCriticalError(error)) {
      this.errorMetrics.critical++;
      logger.error('Critical error recorded', { error, context });
    }

    // Report error patterns
    this.reportErrorPatterns();
  }

  /**
   * Determine if error is critical
   */
  private isCriticalError(error: any): boolean {
    const criticalErrorTypes = [
      'QuotaExceededError',
      'SecurityError',
      'TypeError',
      'NetworkError',
    ];

    return criticalErrorTypes.includes(error?.name);
  }

  /**
   * Report error patterns
   */
  private reportErrorPatterns(): void {
    if (this.errorMetrics.total > 0 && this.errorMetrics.total % 10 === 0) {
      logger.warn('Error pattern detected', {
        totalErrors: this.errorMetrics.total,
        criticalErrors: this.errorMetrics.critical,
        errorTypes: Object.fromEntries(this.errorMetrics.byType),
      });
    }
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): PWAAnalytics & {
    detailed: {
      cache: CacheMetrics;
      push: any;
      sync: any;
      errors: any;
      performance: any;
      uptime: number;
      onlineStatus: boolean;
    };
  } {
    const averageResponseTime = this.cacheMetrics.responseTimes.length > 0
      ? this.cacheMetrics.responseTimes.reduce((a, b) => a + b, 0) / this.cacheMetrics.responseTimes.length
      : 0;

    return {
      ...this.metrics,
      detailed: {
        cache: {
          hits: this.cacheMetrics.hits,
          misses: this.cacheMetrics.misses,
          total: this.cacheMetrics.totalRequests,
          hitRate: this.metrics.cacheHitRate,
          averageResponseTime,
        },
        push: {
          ...this.pushMetrics,
          engagementRate: this.metrics.pushNotificationEngagement,
        },
        sync: Object.fromEntries(this.syncMetrics),
        errors: {
          total: this.errorMetrics.total,
          critical: this.errorMetrics.critical,
          byType: Object.fromEntries(this.errorMetrics.byType),
        },
        performance: this.performanceMetrics,
        uptime: Date.now() - this.startTime,
        onlineStatus: this.isOnline,
      },
    };
  }

  /**
   * Report metrics periodically
   */
  private reportMetrics(): void {
    const metrics = this.getMetrics();

    logger.info('PWA Metrics Report', {
      cacheHitRate: metrics.cacheHitRate.toFixed(2) + '%',
      offlineUsage: metrics.offlineUsage,
      pushEngagement: metrics.pushNotificationEngagement.toFixed(2) + '%',
      syncSuccess: metrics.backgroundSyncSuccess.toFixed(2) + '%',
      uptime: Math.round(metrics.detailed.uptime / 1000 / 60) + ' minutes',
      onlineStatus: metrics.detailed.onlineStatus,
    });

    // Alert on poor performance
    if (metrics.cacheHitRate < 50) {
      logger.warn('Low cache hit rate detected', { rate: metrics.cacheHitRate });
    }

    if (metrics.backgroundSyncSuccess < 80 && this.syncMetrics.size > 0) {
      logger.warn('Low sync success rate detected', { rate: metrics.backgroundSyncSuccess });
    }

    if (this.errorMetrics.critical > 0) {
      logger.warn('Critical errors detected', { count: this.errorMetrics.critical });
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = {
      cacheHitRate: 0,
      offlineUsage: 0,
      pushNotificationEngagement: 0,
      backgroundSyncSuccess: 0,
      serviceWorkerUptime: 0,
    };

    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      responseTimes: [],
    };

    this.pushMetrics = {
      received: 0,
      clicked: 0,
      closed: 0,
      errors: 0,
    };

    this.syncMetrics.clear();
    this.errorMetrics = {
      total: 0,
      byType: new Map(),
      critical: 0,
    };

    this.startTime = Date.now();

    logger.info('Metrics reset completed');
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    const metrics = this.getMetrics();
    const exportData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      metrics,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'service-worker',
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get performance score
   */
  getPerformanceScore(): number {
    let score = 100;

    // Deduct points for poor cache performance
    if (this.metrics.cacheHitRate < 50) score -= 20;
    else if (this.metrics.cacheHitRate < 70) score -= 10;

    // Deduct points for poor sync performance
    if (this.metrics.backgroundSyncSuccess < 70 && this.syncMetrics.size > 0) score -= 15;
    else if (this.metrics.backgroundSyncSuccess < 85 && this.syncMetrics.size > 0) score -= 5;

    // Deduct points for errors
    if (this.errorMetrics.critical > 0) score -= 25;
    else if (this.errorMetrics.total > 10) score -= 10;

    // Deduct points for slow performance
    if (this.performanceMetrics.firstContentfulPaint > 3000) score -= 15;
    else if (this.performanceMetrics.firstContentfulPaint > 2000) score -= 5;

    if (this.performanceMetrics.largestContentfulPaint > 4000) score -= 15;
    else if (this.performanceMetrics.largestContentfulPaint > 2500) score -= 5;

    return Math.max(0, score);
  }
}