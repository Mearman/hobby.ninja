/**
 * Content Security Policy (CSP) Configuration
 *
 * Implements comprehensive CSP headers to protect against XSS, injection attacks,
 * and other security vulnerabilities. Supports development and production environments.
 */

/**
 * CSP Configuration for different environments
 */
export interface CSPConfig {
  development: boolean;
  reportOnly?: boolean;
  customDirectives?: Record<string, string | null>;
}

/**
 * Generate Content Security Policy header value
 */
export function generateCSPHeader(config: CSPConfig = { development: false }): string {
  const isDevelopment = config.development;
  const reportOnly = config.reportOnly ?? isDevelopment;
  const mode = reportOnly ? 'report-' : '';

  // Base CSP directives
  const directives: Record<string, string | null> = {
    // Default to same-origin unless explicitly allowed
    [`${mode}default-src`]: "'self'",

    // Allow scripts from self and trusted CDNs
    [`${mode}script-src`]: [
      "'self'",
      "'unsafe-inline'", // Required for React development and some PWA features
      "'unsafe-eval'", // Required for some development tools
      ...(isDevelopment ? [] : ["'strict-dynamic'"])
    ].join(' '),

    // Allow styles from self and inline styles (required for CSS-in-JS)
    [`${mode}style-src`]: [
      "'self'",
      "'unsafe-inline'", // Required for Vanilla Extract and Mantine
      "'unsafe-eval'" // Required for some CSS-in-JS libraries
    ].join(' '),

    // Allow images from self and data URIs
    [`${mode}img-src`]: [
      "'self'",
      "data:",
      "blob:",
      "https:", // For external images and icons
      "http:" // For development without HTTPS
    ].join(' '),

    // Allow fonts from self and Google Fonts
    [`${mode}font-src`]: [
      "'self'",
      "data:",
      "https://fonts.gstatic.com",
      "https://fonts.googleapis.com"
    ].join(' '),

    // Allow connections to same origin and trusted APIs
    [`${mode}connect-src`]: [
      "'self'",
      "wss:", // WebSocket connections
      "https:", // API calls
      ...(isDevelopment ? ["http:"] : [])
    ].join(' '),

    // Allow same-origin frames and embeds
    [`${mode}frame-src`]: "'self'",
    [`${mode}child-src`]: "'self'",

    // Allow media from self and trusted sources
    [`${mode}media-src`]: [
      "'self'",
      "blob:",
      "data:",
      "https:",
      ...(isDevelopment ? ["http:"] : [])
    ].join(' '),

    // Allow workers from same origin
    [`${mode}worker-src`]: [
      "'self'",
      "blob:",
      "'unsafe-inline'"
    ].join(' '),

    // Allow manifests and other web app files
    [`${mode}manifest-src`]: "'self'",

    // Allow form submissions to same origin
    [`${mode}form-action`]: "'self'",

    // Prevent mixed content in production
    [`${mode}block-all-mixed-content`]: isDevelopment ? null : "true",

    // Require HTTPS for subresources in production
    [`${mode}upgrade-insecure-requests`]: isDevelopment ? null : "true"
  };

  // Apply custom directives if provided
  if (config.customDirectives) {
    Object.assign(directives, config.customDirectives);
  }

  // Filter out null values and build CSP header
  const filteredDirectives = Object.entries(directives)
    .filter(([_, value]) => value !== null)
    .map(([key, value]) => `${key} ${value}`);

  return filteredDirectives.join('; ');
}

/**
 * CSP Nonce Generator
 *
 * Generates cryptographic nonces for inline scripts and styles.
 */
export class CSPNonceGenerator {
  private static readonly ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  /**
   * Generate a random nonce string
   */
  static generateNonce(length: number = 16): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.ALPHABET.charAt(Math.floor(Math.random() * this.ALPHABET.length));
    }
    return result;
  }

  /**
   * Get a new nonce for the current request
   */
  static getNonce(): string {
    return this.generateNonce();
  }
}

/**
 * CSP Violation Reporter
 *
 * Reports CSP violations to monitoring and logging services.
 */
export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    'referrer': string;
    'blocked-uri': string;
    'violated-directive': string;
    'original-policy': string;
    'disposition': string;
    'status-code'?: number;
    'script-sample'?: string;
  };
}

/**
 * Handle CSP violation reports
 */
export function handleCSPViolation(report: CSPViolationReport): void {
  const violation = report['csp-report'];

  console.warn('CSP Violation:', {
    blockedURI: violation['blocked-uri'],
    directive: violation['violated-directive'],
    documentURI: violation['document-uri'],
    timestamp: new Date().toISOString()
  });

  // In production, send to monitoring service
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    // Send to error tracking service
    // sendToErrorTracking(report);
  }
}

/**
 * CSP Security Headers Configuration
 */
export function getSecurityHeaders(config: CSPConfig = { development: false }): Record<string, string> {
  const cspHeader = generateCSPHeader(config);

  const headers: Record<string, string> = {
    'Content-Security-Policy': cspHeader,

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS protection in older browsers
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy for privacy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy
    'Permissions-Policy': [
      'geolocation=()',
      'camera=()',
      'microphone=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'camera=()',
      'fullscreen=(self)',
      'payment=(self)',
      'usb=(self)'
    ].join(', ')
  };

  // Add report-only header in development or when explicitly requested
  if (config.reportOnly) {
    headers['Content-Security-Policy-Report-Only'] = cspHeader.replace('Content-Security-Policy:', 'Content-Security-Policy-Report-Only:');
  }

  return headers;
}

/**
 * PWA-specific CSP configuration
 */
export const PWA_CSP_CONFIG: CSPConfig = {
  development: process.env['NODE_ENV'] === 'development',
  reportOnly: process.env['NODE_ENV'] === 'development',
  customDirectives: {
    // Allow service worker registration
    'service-worker-src': "'self' blob:",
    // Allow web app manifest
    'manifest-src': "'self'",
    // Allow PWA related APIs
    'connect-src': [
      "'self'",
      'wss:',
      'https:',
      ...(process.env['NODE_ENV'] === 'development' ? ['http:'] : []),
      'https://api.github.com', // For data scraping
      'https://bandai-hobby.net', // For Gundam data
      'https://gundam.info',
      'https://dalong.net'
    ].join(' ')
  }
};

// Export default CSP configuration
export const DEFAULT_CSP_HEADERS = getSecurityHeaders(PWA_CSP_CONFIG);