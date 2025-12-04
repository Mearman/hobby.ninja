/**
 * Core Web Vitals Types and Interfaces
 */

export interface CoreWebVitalMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  navigationType: string;
}

export interface WebVitalsThresholds {
  LCP: { good: number; poor: number };
  FID: { good: number; poor: number };
  CLS: { good: number; poor: number };
  FCP: { good: number; poor: number };
  TTFB: { good: number; poor: number };
  INP: { good: number; poor: number };
}

export interface PerformanceReport {
  url: string;
  userAgent: string;
  timestamp: number;
  metrics: {
    LCP?: CoreWebVitalMetric;
    FID?: CoreWebVitalMetric;
    CLS?: CoreWebVitalMetric;
    FCP?: CoreWebVitalMetric;
    TTFB?: CoreWebVitalMetric;
    INP?: CoreWebVitalMetric;
  };
  overallScore: number;
  deviceInfo: {
    memory?: number;
    hardwareConcurrency?: number;
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
    };
  };
}

export interface WebVitalsConfig {
  reportThreshold?: 'good' | 'needs-improvement' | 'poor' | 'all';
  reportUrl?: string;
  reportInterval?: number;
  maxEntries?: number;
  debug?: boolean;
}

export interface MetricCallback {
  (metric: CoreWebVitalMetric): void;
}

export interface PerformanceObserverOptions {
  durationThreshold?: number;
  buffered?: boolean;
}