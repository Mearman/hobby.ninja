import { useState, useEffect, useRef } from 'react';
// Performance monitoring utilities for tracking application performance

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

interface WebVitalsMetrics {
  LCP?: PerformanceMetric; // Largest Contentful Paint
  FID?: PerformanceMetric; // First Input Delay
  CLS?: PerformanceMetric; // Cumulative Layout Shift
  FCP?: PerformanceMetric; // First Contentful Paint
  TTFB?: PerformanceMetric; // Time to First Byte
}

interface CustomMetric {
  name: string;
  startTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

// Core Web Vitals thresholds
const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Time in milliseconds
  FID: { good: 100, poor: 300 },   // Time in milliseconds
  CLS: { good: 0.1, poor: 0.25 },   // Cumulative Layout Shift score
  FCP: { good: 1800, poor: 3000 }, // Time in milliseconds
  TTFB: { good: 800, poor: 1800 }, // Time in milliseconds
};

class PerformanceMonitor {
  private metrics: WebVitalsMetrics = {};
  private customMetrics: Map<string, CustomMetric[]> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  private config: {
    onMetric?: (metric: PerformanceMetric) => void;
    onError?: (error: Error) => void;
    reportToAnalytics?: boolean;
    sampleRate: number;
  };

  constructor(config = {}) {
    this.config = {
      reportToAnalytics: true,
      sampleRate: 1.0,
      ...config,
    };

    this.initializeWebVitals();
    this.initializeCustomMetrics();
  }

  // Initialize Core Web Vitals monitoring
  private initializeWebVitals(): void {
    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      const value = lastEntry.startTime;

      this.metrics.LCP = this.createMetric('LCP', value, WEB_VITALS_THRESHOLDS.LCP);
      this.reportMetric(this.metrics.LCP);
    });

    // First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entries) => {
      const firstEntry = entries[0];
      const value = (firstEntry as any).processingStart - firstEntry.startTime;

      this.metrics.FID = this.createMetric('FID', value, WEB_VITALS_THRESHOLDS.FID);
      this.reportMetric(this.metrics.FID);
    });

    // Cumulative Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', (entries) => {
      let clsValue = 0;
      entries.forEach(entry => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });

      this.metrics.CLS = this.createMetric('CLS', clsValue, WEB_VITALS_THRESHOLDS.CLS);
      this.reportMetric(this.metrics.CLS);
    });

    // First Contentful Paint (FCP)
    this.observePerformanceEntry('paint', (entries) => {
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        const value = fcpEntry.startTime;
        this.metrics.FCP = this.createMetric('FCP', value, WEB_VITALS_THRESHOLDS.FCP);
        this.reportMetric(this.metrics.FCP);
      }
    });

    // Time to First Byte (TTFB)
    this.observeNavigation(() => {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0];
        const value = navEntry.responseStart - navEntry.requestStart;

        this.metrics.TTFB = this.createMetric('TTFB', value, WEB_VITALS_THRESHOLDS.TTFB);
        this.reportMetric(this.metrics.TTFB);
      }
    });
  }

  // Initialize custom performance metrics
  private initializeCustomMetrics(): void {
    // Resource timing
    this.observePerformanceEntry('resource', (entries) => {
      entries.forEach(entry => {
        if (this.shouldSample()) {
          const metric: PerformanceMetric = {
            name: `resource-${entry.name}`,
            value: entry.duration,
            rating: this.getRatingFromValue(entry.duration, 100, 1000),
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          };
          this.reportMetric(metric);
        }
      });
    });

    // Long tasks
    if ('PerformanceObserver' in window && 'longtask' in PerformanceObserver.supportedEntryTypes) {
      this.observePerformanceEntry('longtask', (entries) => {
        entries.forEach(entry => {
          const metric: PerformanceMetric = {
            name: 'long-task',
            value: entry.duration,
            rating: 'poor', // Any long task is poor performance
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            metadata: {
              startTime: entry.startTime,
              duration: entry.duration,
            },
          };
          this.reportMetric(metric);
        });
      });
    }
  }

  // Observe performance entries
  private observePerformanceEntry(
    type: string,
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });

      observer.observe({ type, buffered: true });
      this.observers.set(type, observer);
    } catch (error) {
      this.config.onError?.(error as Error);
    }
  }

  // Observe navigation timing
  private observeNavigation(callback: () => void): void {
    if (document.readyState === 'complete') {
      callback();
    } else {
      window.addEventListener('load', callback, { once: true });
    }
  }

  // Create a performance metric
  private createMetric(
    name: string,
    value: number,
    thresholds: { good: number; poor: number }
  ): PerformanceMetric {
    return {
      name,
      value,
      rating: this.getRatingFromValue(value, thresholds.good, thresholds.poor),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
  }

  // Get performance rating based on value and thresholds
  private getRatingFromValue(
    value: number,
    good: number,
    poor: number
  ): 'good' | 'needs-improvement' | 'poor' {
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  // Report metric to analytics
  private reportMetric(metric: PerformanceMetric): void {
    if (!this.shouldSample()) return;

    this.config.onMetric?.(metric);

    if (this.config.reportToAnalytics) {
      this.sendToAnalytics(metric);
    }
  }

  // Send metric to analytics (Google Analytics example)
  private sendToAnalytics(metric: PerformanceMetric): void {
    // Example: Send to Google Analytics
    if (typeof (globalThis as any).gtag !== 'undefined') {
      (globalThis as any).gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.rating,
        value: Math.round(metric.value),
        custom_map: { metric_value: metric.value, metric_rating: metric.rating },
      });
    }

    // Example: Send to custom analytics endpoint
    if (typeof fetch !== 'undefined') {
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      }).catch(() => {
        // Silently fail analytics requests
      });
    }
  }

  // Sample rate management
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  // Custom performance timing utilities
  startTiming(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        name,
        value: duration,
        rating: this.getRatingFromValue(duration, 100, 500),
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      this.reportMetric(metric);

      // Store custom metric
      if (!this.customMetrics.has(name)) {
        this.customMetrics.set(name, []);
      }

      this.customMetrics.get(name)!.push({
        name,
        startTime,
        duration,
      });
    };
  }

  // Mark performance checkpoints
  mark(name: string): void {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
  }

  // Measure time between marks
  measure(name: string, startMark: string, endMark?: string): number {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
        const measures = performance.getEntriesByName(name, 'measure');
        return measures[measures.length - 1]?.duration || 0;
      } catch (error) {
        console.warn(`Failed to measure ${name}:`, error);
      }
    }
    return 0;
  }

  // Get current metrics
  getMetrics(): WebVitalsMetrics & { customMetrics: Map<string, CustomMetric[]> } {
    return {
      ...this.metrics,
      customMetrics: new Map(this.customMetrics),
    };
  }

  // Get performance score (0-100)
  getPerformanceScore(): number {
    const vitals = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'] as const;
    let totalScore = 0;
    let count = 0;

    vitals.forEach(vital => {
      const metric = this.metrics[vital];
      if (metric) {
        let score = 0;
        if (metric.rating === 'good') score = 100;
        else if (metric.rating === 'needs-improvement') score = 50;
        else if (metric.rating === 'poor') score = 0;

        totalScore += score;
        count++;
      }
    });

    return count > 0 ? Math.round(totalScore / count) : 0;
  }

  // Generate performance report
  generateReport(): {
    score: number;
    metrics: WebVitalsMetrics;
    recommendations: string[];
    timestamp: number;
  } {
    const score = this.getPerformanceScore();
    const recommendations: string[] = [];

    // Analyze metrics and generate recommendations
    if (this.metrics.LCP?.rating === 'poor') {
      recommendations.push('Optimize LCP: Reduce server response time, eliminate render-blocking resources, and optimize images');
    }

    if (this.metrics.FID?.rating === 'poor') {
      recommendations.push('Optimize FID: Reduce JavaScript execution time and break up long tasks');
    }

    if (this.metrics.CLS?.rating === 'poor') {
      recommendations.push('Optimize CLS: Ensure proper dimensions for images and ads, avoid inserting content above existing content');
    }

    if (this.metrics.FCP?.rating === 'poor') {
      recommendations.push('Optimize FCP: Reduce server response time and eliminate render-blocking resources');
    }

    if (this.metrics.TTFB?.rating === 'poor') {
      recommendations.push('Optimize TTFB: Improve server response time, use CDN, and enable compression');
    }

    return {
      score,
      metrics: this.metrics,
      recommendations,
      timestamp: Date.now(),
    };
  }

  // Cleanup observers
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  // Monitor memory usage
  getMemoryInfo(): {
    used: number;
    total: number;
    limit: number;
    usagePercentage: number;
  } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
        usagePercentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      };
    }
    return null;
  }

  // Monitor connection quality
  getConnectionInfo(): {
    effectiveType: string;
    downlink: number;
    rtt: number;
  } | null {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      };
    }
    return null;
  }
}

// Hook for React components
export function usePerformanceMonitor() {
  const monitorRef = useRef<PerformanceMonitor | null>(null);

  useEffect(() => {
    monitorRef.current = new PerformanceMonitor({
      onMetric: (metric: PerformanceMetric) => {
        // Handle metrics in React components
        console.log('Performance metric:', metric);
      },
      onError: (error: unknown) => {
        console.error('Performance monitoring error:', error);
      },
    });

    return () => {
      monitorRef.current?.destroy();
    };
  }, []);

  return {
    startTiming: (name: string) => monitorRef.current?.startTiming(name),
    mark: (name: string) => monitorRef.current?.mark(name),
    measure: (name: string, start: string, end?: string) => monitorRef.current?.measure(name, start, end),
    getMetrics: () => monitorRef.current?.getMetrics(),
    getPerformanceScore: () => monitorRef.current?.getPerformanceScore(),
    generateReport: () => monitorRef.current?.generateReport(),
    getMemoryInfo: () => monitorRef.current?.getMemoryInfo(),
    getConnectionInfo: () => monitorRef.current?.getConnectionInfo(),
  };
}

// Performance budget validator
export class PerformanceBudgetValidator {
  private budgets: {
    bundleSize: { js: number; css: number; total: number };
    webVitals: typeof WEB_VITALS_THRESHOLDS;
  };

  constructor(budgets = {}) {
    this.budgets = {
      bundleSize: { js: 250, css: 50, total: 300 }, // KB
      webVitals: WEB_VITALS_THRESHOLDS,
      ...budgets,
    };
  }

  // Validate bundle sizes
  async validateBundleSizes(): Promise<{
    passed: boolean;
    violations: Array<{ type: string; actual: number; budget: number; unit: string }>;
  }> {
    const violations: Array<{ type: string; actual: number; budget: number; unit: string }> = [];

    // Get resource timing data
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    let jsSize = 0;
    let cssSize = 0;
    let totalSize = 0;

    resources.forEach(resource => {
      const size = resource.transferSize || 0;
      totalSize += size;

      if (resource.name.endsWith('.js')) {
        jsSize += size;
      } else if (resource.name.endsWith('.css')) {
        cssSize += size;
      }
    });

    // Convert to KB
    jsSize = Math.round(jsSize / 1024);
    cssSize = Math.round(cssSize / 1024);
    totalSize = Math.round(totalSize / 1024);

    if (jsSize > this.budgets.bundleSize.js) {
      violations.push({ type: 'JavaScript', actual: jsSize, budget: this.budgets.bundleSize.js, unit: 'KB' });
    }

    if (cssSize > this.budgets.bundleSize.css) {
      violations.push({ type: 'CSS', actual: cssSize, budget: this.budgets.bundleSize.css, unit: 'KB' });
    }

    if (totalSize > this.budgets.bundleSize.total) {
      violations.push({ type: 'Total', actual: totalSize, budget: this.budgets.bundleSize.total, unit: 'KB' });
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;