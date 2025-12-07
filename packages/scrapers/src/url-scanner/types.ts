/**
 * TypeScript interfaces for URL Validation Scanner
 */

export interface URLCheckResult {
  /** The URL that was checked */
  url: string;

  /** Timestamp of when the check was performed (ISO 8601) */
  timestamp: string;

  /** Overall validity status */
  validity: 'valid' | 'invalid' | 'error';

  /** HTTP status code (if request completed) */
  statusCode?: number;

  /** Whether essential Gundam data is available in initial HTML */
  hasStaticData: boolean;

  /** Type of data availability */
  dataType: 'complete' | 'partial' | 'none';

  /** Confidence in the static/dynamic classification (0-1) */
  confidence: number;

  /** Detected indicators that influenced classification */
  indicators: string[];

  /** Error message if check failed */
  errorMessage?: string;

  /** Final destination URL if redirects were followed */
  finalUrl?: string;

  /** Content type from response headers */
  contentType?: string;

  /** Response size in bytes */
  responseSize?: number;

  /** Time taken for the request in milliseconds */
  requestTime?: number;

  /** Extracted page title */
  title?: string;

  /** Additional extracted data */
  extractedData?: {
    description?: string;
    sku?: string;
    images?: string[];
  };
}

export interface ProgressState {
  /** Total URLs processed so far */
  totalProcessed: number;

  /** Valid URLs with static data */
  validStatic: number;

  /** Valid URLs with dynamic data only */
  validDynamic: number;

  /** Invalid URLs */
  invalid: number;

  /** Error count */
  errors: number;

  /** Timestamp when scan started */
  startTime: string;

  /** Timestamp when scan ended */
  endTime?: string;

  /** Current scan status */
  status: 'idle' | 'ready' | 'running' | 'paused' | 'completed' | 'failed';

  /** URL results keyed by URL */
  urls: Record<string, ScanResult>;

  /** Optional unique identifier for this scan session */
  scanId?: string;

  /** Optional scan configuration used */
  configuration?: ScanConfiguration;

  /** Optional estimated completion time */
  estimatedCompletion?: string;
}

export interface ScanConfiguration {
  /** URL patterns to scan */
  urlPatterns: URLPattern[];

  /** Maximum concurrent requests */
  concurrency: number;

  /** Request timeout in milliseconds */
  timeoutMs: number;

  /** Number of retry attempts for failed requests */
  retryAttempts: number;

  /** Delay between requests in milliseconds */
  requestDelayMs: number;

  /** Output directory for results */
  outputDirectory: string;

  /** Whether to follow redirects */
  followRedirects: boolean;

  /** Maximum number of redirects to follow */
  maxRedirects: number;

  /** Custom user agent string */
  userAgent?: string;

  /** Progress file location */
  progressFile?: string;
}

export interface URLPattern {
  /** Base URL pattern with placeholder */
  pattern: string;

  /** Placeholder identifier (e.g., {id}) */
  placeholder: string;

  /** Start value for placeholder */
  start: number;

  /** End value for placeholder */
  end: number;

  /** Step increment for placeholder */
  step: number;

  /** Number format (decimal, hex, etc.) */
  numberFormat: 'decimal' | 'hex';

  /** Zero-padding length */
  zeroPad?: number;
}

export interface CheckOptions {
  timeoutMs: number;
  followRedirects: boolean;
  maxRedirects: number;
  userAgent?: string;
  retryAttempts: number;
}

export interface DetectionResult {
  hasStaticData: boolean;
  dataType: 'complete' | 'partial' | 'none';
  confidence: number;
  indicators: string[];
  extractedData?: {
    title?: string;
    sku?: string;
    description?: string;
    images?: string[];
  };
}

export interface ScanStatistics {
  totalChecked: number;
  validStatic: number;
  validDynamic: number;
  invalid: number;
  errors: number;
  averageRequestTime: number;
}

export interface ScanResult {
  /** The URL that was checked */
  url: string;

  /** Timestamp of when the check was performed (ISO 8601) */
  timestamp: string;

  /** Whether the URL is valid (responded successfully) */
  isValid: boolean;

  /** Whether essential Gundam data is available in initial HTML */
  hasStaticData: boolean;

  /** Type of data availability */
  dataType: 'complete' | 'partial' | 'none';

  /** Confidence in the static/dynamic classification (0-1) */
  confidence: number;

  /** Detected indicators that influenced classification */
  indicators: string[];

  /** HTTP status code (if request completed) */
  statusCode?: number;

  /** Final destination URL if redirects were followed */
  finalUrl?: string;

  /** Error message if check failed */
  error?: string;

  /** Extracted page title */
  title?: string;

  /** Additional extracted data */
  extractedData?: {
    description?: string;
    sku?: string;
    images?: string[];
  };
}

export interface ScanSummary {
  scanId: string;
  startedAt: string;
  completedAt: string;
  statistics: ScanStatistics;
  outputFiles: string[];
}