/**
 * Core Web Vitals Constants and Thresholds
 */

export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },  // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 },   // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, poor: 500 },   // Interaction to Next Paint (ms)
} as const;

export const METRIC_NAMES = {
  LCP: 'Largest Contentful Paint',
  FID: 'First Input Delay',
  CLS: 'Cumulative Layout Shift',
  FCP: 'First Contentful Paint',
  TTFB: 'Time to First Byte',
  INP: 'Interaction to Next Paint',
} as const;

export const PERFORMANCE_ENTRY_TYPES = {
  LCP: 'largest-contentful-paint',
  FID: 'first-input',
  CLS: 'layout-shift',
  FCP: 'paint',
  TTFB: 'navigation',
  INP: 'event',
} as const;

export const RATING_WEIGHTS = {
  LCP: 0.25,
  FID: 0.20,
  CLS: 0.25,
  FCP: 0.15,
  TTFB: 0.10,
  INP: 0.05,
} as const;

export const DEFAULT_CONFIG = {
  reportThreshold: 'all' as const,
  reportInterval: 5000,
  maxEntries: 100,
  debug: false,
};

export const NAVIGATION_TYPES = {
  navigate: 'navigate',
  reload: 'reload',
  back_forward: 'back_forward',
  prerender: 'prerender',
} as const;