/**
 * Core Web Vitals Tracking and Monitoring
 */

import type {
  CoreWebVitalMetric,
  WebVitalsThresholds,
  PerformanceReport,
  WebVitalsConfig,
  MetricCallback
} from './types';
import {
  WEB_VITALS_THRESHOLDS,
  METRIC_NAMES,
  PERFORMANCE_ENTRY_TYPES,
  RATING_WEIGHTS,
  DEFAULT_CONFIG,
  NAVIGATION_TYPES
} from './constants';

class WebVitalsTracker {
  private config: Required<WebVitalsConfig>;
  private callbacks: MetricCallback[] = [];
  private metrics: Partial<PerformanceReport['metrics']> = {};
  private observer?: PerformanceObserver;
  private isReporting = false;

  constructor(config: WebVitalsConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<WebVitalsConfig>;
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined' || !window.performance) {
      this.debugLog('Performance API not available');
      return;
    }

    this.setupObservers();
    this.startReporting();
  }

  private setupObservers(): void {
    // LCP Observer
    this.observeLCP();

    // FID Observer
    this.observeFID();

    // CLS Observer
    this.observeCLS();

    // FCP Observer
    this.observeFCP();

    // TTFB Observer
    this.observeTTFB();

    // INP Observer (if supported)
    this.observeINP();
  }

  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformancePaintTiming;

        if (lastEntry) {
          const metric = this.createMetric('LCP', lastEntry.startTime, [lastEntry]);
          this.metrics.LCP = metric;
          this.notifyCallbacks(metric);
        }
      });

      observer.observe({ type: PERFORMANCE_ENTRY_TYPES.LCP, buffered: true });
      this.debugLog('LCP observer setup complete');
    } catch (error) {
      this.debugLog('LCP observer setup failed:', error);
    }
  }

  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === 'first-input') {
            const metric = this.createMetric('FID', entry.processingStart - entry.startTime, [entry]);
            this.metrics.FID = metric;
            this.notifyCallbacks(metric);
          }
        });
      });

      observer.observe({ type: PERFORMANCE_ENTRY_TYPES.FID, buffered: true });
      this.debugLog('FID observer setup complete');
    } catch (error) {
      this.debugLog('FID observer setup failed:', error);
    }
  }

  private observeCLS(): void {
    try {
      let clsValue = 0;
      const clsEntries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);

            const metric = this.createMetric('CLS', clsValue, clsEntries);
            this.metrics.CLS = metric;
            this.notifyCallbacks(metric);
          }
        });
      });

      observer.observe({ type: PERFORMANCE_ENTRY_TYPES.CLS, buffered: true });
      this.debugLog('CLS observer setup complete');
    } catch (error) {
      this.debugLog('CLS observer setup failed:', error);
    }
  }

  private observeFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformancePaintTiming[];
        let fcpEntry: PerformancePaintTiming | undefined;
        for (let i = 0; i < entries.length; i++) {
          if (entries[i].name === 'first-contentful-paint') {
            fcpEntry = entries[i] as PerformancePaintTiming;
            break;
          }
        }

        if (fcpEntry) {
          const metric = this.createMetric('FCP', fcpEntry.startTime, [fcpEntry]);
          this.metrics.FCP = metric;
          this.notifyCallbacks(metric);
        }
      });

      observer.observe({ type: PERFORMANCE_ENTRY_TYPES.FCP, buffered: true });
      this.debugLog('FCP observer setup complete');
    } catch (error) {
      this.debugLog('FCP observer setup failed:', error);
    }
  }

  private observeTTFB(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const navEntry = entries[0] as PerformanceNavigationTiming;

        if (navEntry) {
          const ttfb = navEntry.responseStart - navEntry.requestStart;
          const metric = this.createMetric('TTFB', ttfb, [navEntry]);
          this.metrics.TTFB = metric;
          this.notifyCallbacks(metric);
        }
      });

      observer.observe({ type: PERFORMANCE_ENTRY_TYPES.TTFB, buffered: true });
      this.debugLog('TTFB observer setup complete');
    } catch (error) {
      this.debugLog('TTFB observer setup failed:', error);
    }
  }

  private observeINP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        let maxINP = 0;
        let inpEntries: PerformanceEntry[] = [];

        entries.forEach((entry: any) => {
          const inp = entry.processingEnd - entry.startTime;
          if (inp > maxINP) {
            maxINP = inp;
            inpEntries = [entry];
          }
        });

        if (inpEntries.length > 0) {
          const metric = this.createMetric('INP', maxINP, inpEntries);
          this.metrics.INP = metric;
          this.notifyCallbacks(metric);
        }
      });

      observer.observe({ type: PERFORMANCE_ENTRY_TYPES.INP, buffered: true });
      this.debugLog('INP observer setup complete');
    } catch (error) {
      this.debugLog('INP observer setup failed:', error);
    }
  }

  private createMetric(
    name: keyof typeof WEB_VITALS_THRESHOLDS,
    value: number,
    entries: PerformanceEntry[]
  ): CoreWebVitalMetric {
    const thresholds = WEB_VITALS_THRESHOLDS[name];
    const rating = this.getRating(value, thresholds);
    const navigationType = this.getNavigationType();

    return {
      id: `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: METRIC_NAMES[name],
      value: Math.round(value * 100) / 100,
      rating,
      delta: 0, // Will be calculated if we have previous values
      entries,
      navigationType,
    };
  }

  private getRating(value: number, thresholds: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  private getNavigationType(): string {
    if (typeof (window as any).navigation !== 'undefined') {
      return NAVIGATION_TYPES[(window as any).navigation.type as keyof typeof NAVIGATION_TYPES] || 'unknown';
    }
    return 'unknown';
  }

  private notifyCallbacks(metric: CoreWebVitalMetric): void {
    if (this.shouldReport(metric.rating)) {
      this.callbacks.forEach(callback => {
        try {
          callback(metric);
        } catch (error) {
          this.debugLog('Callback error:', error);
        }
      });
    }
  }

  private shouldReport(rating: string): boolean {
    const threshold = this.config.reportThreshold;
    if (threshold === 'all') return true;
    if (threshold === rating) return true;
    if (threshold === 'needs-improvement' && (rating === 'needs-improvement' || rating === 'poor')) return true;
    if (threshold === 'poor' && rating === 'poor') return true;
    return false;
  }

  private startReporting(): void {
    if (this.config.reportUrl && !this.isReporting) {
      this.isReporting = true;
      setInterval(() => {
        this.sendReport();
      }, this.config.reportInterval);
    }
  }

  private sendReport(): void {
    if (Object.keys(this.metrics).length === 0) return;

    const report = this.generateReport();

    if (this.config.reportUrl) {
      fetch(this.config.reportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      }).catch(error => {
        this.debugLog('Report send failed:', error);
      });
    }

    this.debugLog('Performance report generated:', report);
  }

  private generateReport(): PerformanceReport {
    const overallScore = this.calculateOverallScore();
    const deviceInfo = this.getDeviceInfo();

    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      overallScore,
      deviceInfo,
    };
  }

  private calculateOverallScore(): number {
    let totalScore = 0;
    let totalWeight = 0;

    const metricNames = Object.keys(this.metrics);
    for (let i = 0; i < metricNames.length; i++) {
      const metricName = metricNames[i];
      const metric = (this.metrics as any)[metricName];

      if (metric) {
        const weight = (RATING_WEIGHTS as any)[metricName] || 0;
        let score = 0;

        switch (metric.rating) {
          case 'good':
            score = 100;
            break;
          case 'needs-improvement':
            score = 50;
            break;
          case 'poor':
            score = 0;
            break;
        }

        totalScore += score * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  private getDeviceInfo() {
    return {
      memory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt,
      } : undefined,
    };
  }

  private debugLog(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WebVitals]', ...args);
    }
  }

  // Public API methods
  public onMetric(callback: MetricCallback): void {
    this.callbacks.push(callback);
  }

  public getMetrics(): Partial<PerformanceReport['metrics']> {
    return { ...this.metrics };
  }

  public getReport(): PerformanceReport {
    return this.generateReport();
  }

  public forceReport(): void {
    this.sendReport();
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.callbacks = [];
    this.metrics = {};
    this.isReporting = false;
  }

  public updateConfig(config: Partial<WebVitalsConfig>): void {
    this.config = { ...this.config, ...config } as Required<WebVitalsConfig>;
  }
}

// Singleton instance
let webVitalsTracker: WebVitalsTracker | null = null;

export const getWebVitalsTracker = (config?: WebVitalsConfig): WebVitalsTracker => {
  if (!webVitalsTracker) {
    webVitalsTracker = new WebVitalsTracker(config);
  }
  return webVitalsTracker;
};

export const createWebVitalsTracker = (config?: WebVitalsConfig): WebVitalsTracker => {
  return new WebVitalsTracker(config);
};

export { WebVitalsTracker };
export type { CoreWebVitalMetric, PerformanceReport, WebVitalsConfig, MetricCallback };