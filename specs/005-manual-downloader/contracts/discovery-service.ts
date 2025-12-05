/**
 * Discovery Service Contract
 *
 * Intelligent ID discovery algorithms for finding valid manual pages
 * when the ID range is unknown or contains gaps.
 *
 * @version 1.0.0
 * @since 2025-12-05
 */

import {
  DiscoveryResult,
  GapPattern,
  CLIOptions,
  SessionConfiguration
} from '../data-model';

/**
 * Discovery service interface for intelligent ID range detection
 */
export interface IDiscoveryService {
  /** Service configuration */
  readonly config: DiscoveryConfig;

  /**
   * Discover the optimal ID range for the target URL pattern
   * @param baseUrl Base URL pattern (e.g., 'https://manual.bandai-hobby.net/menus/detail/')
   * @param options Discovery options
   * @returns Promise resolving to discovery results
   */
  discoverRange(baseUrl: string, options?: DiscoveryOptions): Promise<DiscoveryResult>;

  /**
   * Detect gaps in a given range of IDs
   * @param baseUrl Base URL pattern
   * @param minId Starting ID
   * @param maxId Ending ID
   * @param options Gap detection options
   * @returns Promise resolving to detected gap patterns
   */
  detectGaps(baseUrl: string, minId: number, maxId: number, options?: GapDetectionOptions): Promise<GapPattern[]>;

  /**
   * Validate individual IDs efficiently
   * @param baseUrl Base URL pattern
   * @param ids Array of IDs to validate
   * @param options Validation options
   * @returns Promise resolving to validation results
   */
  validateIds(baseUrl: string, ids: number[], options?: ValidationOptions): Promise<ValidationResult>;

  /**
   * Perform adaptive range expansion from a starting point
   * @param baseUrl Base URL pattern
   * @param startId Starting ID for expansion
   * @param options Expansion options
   * @returns Promise resolving to expanded range information
   */
  expandRange(baseUrl: string, startId: number, options?: ExpansionOptions): Promise<RangeExpansionResult>;

  /**
   * Estimate total processing time for discovery
   * @param baseUrl Base URL pattern
   * @param estimatedRange Estimated ID range size
   * @returns Promise resolving to time estimate in seconds
   */
  estimateDiscoveryTime(baseUrl: string, estimatedRange: number): Promise<number>;

  /**
   * Get discovery statistics and performance metrics
   * @returns Current discovery performance statistics
   */
  getDiscoveryStats(): DiscoveryStats;

  /**
   * Reset discovery cache and statistics
   */
  resetStats(): void;
}

/**
 * Discovery service configuration
 */
export interface DiscoveryConfig {
  /** Rate limiting configuration */
  rateLimiting: {
    baseDelay: number;           // milliseconds between requests
    maxConcurrent: number;      // concurrent validation requests
    exponentialBackoff: boolean; // enable exponential backoff
    backoffMultiplier: number;  // multiplier for backoff
    maxDelay: number;          // maximum delay between requests
  };

  /** HTTP request configuration */
  http: {
    timeout: number;           // request timeout in milliseconds
    userAgent: string;         // user agent string
    maxRetries: number;        // maximum retry attempts
    retryDelay: number;        // delay between retries
  };

  /** Discovery algorithm configuration */
  algorithms: {
    expansionStrategy: 'linear' | 'exponential' | 'adaptive' | 'hybrid';
    maxExpansionSteps: number; // maximum steps in each direction
    consecutiveFailureThreshold: number; // stop after this many failures
    confidenceThreshold: number; // minimum confidence to accept range
    sampleSize: number;        // sample size for gap detection
  };

  /** Performance optimization */
  optimization: {
    enableCaching: boolean;    // cache validation results
    cacheSize: number;         // maximum cache entries
    enableBatching: boolean;   // batch validation requests
    batchSize: number;         // requests per batch
    enableParallelProcessing: boolean; // parallel validation
  };

  /** Validation criteria */
  validation: {
    successStatusCodes: number[]; // HTTP status codes indicating success
    contentLengthThreshold: number; // minimum content length for valid pages
    contentPatterns: string[];   // regex patterns indicating valid content
    titlePatterns: string[];     // regex patterns for valid page titles
    redirectHandling: 'follow' | 'reject' | 'analyze';
  };
}

/**
 * Discovery process options
 */
export interface DiscoveryOptions {
  /** Starting point for discovery (if known) */
  startId?: number;

  /** Maximum range to explore in each direction */
  maxRange?: number;

  /** Discovery strategy override */
  strategy?: 'linear' | 'exponential' | 'adaptive' | 'hybrid';

  /** Whether to perform gap detection */
  detectGaps?: boolean;

  /** Confidence threshold for accepting results */
  minConfidence?: number;

  /** Time limit for discovery in seconds */
  timeLimit?: number;

  /** Whether to stop on first range detection */
  stopOnFirstRange?: boolean;

  /** Custom validation rules */
  customValidation?: ValidationRule[];
}

/**
 * Gap detection options
 */
export interface GapDetectionOptions {
  /** Strategy for gap detection */
  strategy: 'sequential' | 'sampling' | 'adaptive' | 'statistical';

  /** Sample size for statistical detection */
  sampleSize?: number;

  /** Minimum gap size to report */
  minGapSize?: number;

  /** Gap confidence threshold */
  confidenceThreshold?: number;

  /** Whether to validate gap boundaries */
  validateBoundaries?: boolean;

  /** Maximum time for gap detection in seconds */
  timeLimit?: number;
}

/**
 * ID validation options
 */
export interface ValidationOptions {
  /** Whether to validate in parallel */
  parallel?: boolean;

  /** Number of concurrent validations */
  concurrency?: number;

  /** Whether to cache results */
  cache?: boolean;

  /** Timeout per validation in milliseconds */
  timeout?: number;

  /** Custom validation rules */
  customRules?: ValidationRule[];
}

/**
 * Range expansion options
 */
export interface ExpansionOptions {
  /** Expansion direction */
  direction: 'both' | 'up' | 'down';

  /** Maximum expansion steps */
  maxSteps?: number;

  /** Step size strategy */
  stepStrategy: 'linear' | 'exponential' | 'fibonacci';

  /** Base step size */
  baseStepSize?: number;

  /** Whether to validate intermediate ranges */
  validateIntermediate?: boolean;

  /** Confidence threshold for stopping */
  confidenceThreshold?: number;
}

/**
 * Custom validation rule
 */
export interface ValidationRule {
  /** Rule identifier */
  id: string;

  /** Rule description */
  description: string;

  /** Validation function */
  validator: (response: ValidationResponse) => boolean;

  /** Rule priority (higher = more important) */
  priority: number;

  /** Whether rule failure is critical */
  critical: boolean;
}

/**
 * HTTP validation response
 */
export interface ValidationResponse {
  /** HTTP status code */
  statusCode: number;

  /** Response headers */
  headers: Record<string, string>;

  /** Content length in bytes */
  contentLength: number;

  /** Response content (first N bytes) */
  contentSample: string;

  /** Final URL after redirects */
  finalUrl: string;

  /** Response time in milliseconds */
  responseTime: number;

  /** Whether validation used cache */
  fromCache: boolean;
}

/**
 * Validation result for multiple IDs
 */
export interface ValidationResult {
  /** Array of validation results for each ID */
  results: IdValidationResult[];

  /** Summary statistics */
  summary: {
    total: number;
    valid: number;
    invalid: number;
    errors: number;
    cached: number;
  };

  /** Performance metrics */
  performance: {
    duration: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    cacheHitRate: number;
  };
}

/**
 * Individual ID validation result
 */
export interface IdValidationResult {
  /** The ID that was validated */
  id: number;

  /** Whether the ID represents a valid page */
  isValid: boolean;

  /** HTTP status code */
  statusCode: number;

  /** Final URL after redirects */
  finalUrl: string;

  /** Content length */
  contentLength: number;

  /** Page title (if extractable) */
  title?: string;

  /** Response time in milliseconds */
  responseTime: number;

  /** Whether result came from cache */
  fromCache: boolean;

  /** Validation error (if any) */
  error?: string;

  /** Confidence score for validation (0-1) */
  confidence: number;
}

/**
 * Range expansion result
 */
export interface RangeExpansionResult {
  /** Discovered minimum ID */
  minId: number;

  /** Discovered maximum ID */
  maxId: number;

  /** Total range size */
  rangeSize: number;

  /** Expansion statistics */
  expansion: {
    upwardSteps: number;
    downwardSteps: number;
    totalSteps: number;
    consecutiveFailures: {
      upward: number;
      downward: number;
    };
  };

  /** Quality metrics */
  quality: {
    confidence: number;
    coverage: number;     // percentage of range likely valid
    gapDensity: number;   // estimated gaps per 100 IDs
  };

  /** Performance metrics */
  performance: {
    duration: number;
    requestsMade: number;
    averageResponseTime: number;
    successRate: number;
  };
}

/**
 * Discovery service statistics
 */
export interface DiscoveryStats {
  /** Total discovery operations performed */
  totalOperations: number;

  /** Total IDs validated */
  totalIdsValidated: number;

  /** Cache statistics */
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };

  /** Performance metrics */
  performance: {
    averageResponseTime: number;
    requestsPerSecond: number;
    successRate: number;
    totalDuration: number;
  };

  /** Quality metrics */
  quality: {
    averageConfidence: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
  };

  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Discovery service factory
 */
export interface IDiscoveryServiceFactory {
  /**
   * Create discovery service with configuration
   * @param config Service configuration
   * @returns Configured discovery service
   */
  create(config: DiscoveryConfig): IDiscoveryService;

  /**
   * Create discovery service with defaults
   * @returns Discovery service with default configuration
   */
  createWithDefaults(): IDiscoveryService;

  /**
   * Create discovery service for testing
   * @param httpClient Mock HTTP client for testing
   * @param config Optional configuration overrides
   * @returns Discovery service with mocked dependencies
   */
  createForTesting(httpClient: IHttpClient, config?: Partial<DiscoveryConfig>): IDiscoveryService;
}

/**
 * HTTP client interface for discovery service
 */
export interface IHttpClient {
  /**
   * Make HTTP request with validation information
   * @param url URL to request
   * @param options Request options
   * @returns Promise resolving to validation response
   */
  validateUrl(url: string, options?: RequestOptions): Promise<ValidationResponse>;

  /**
   * Make multiple validation requests in parallel
   * @param urls URLs to validate
   * @param options Batch request options
   * @returns Promise resolving to array of validation responses
   */
  validateUrls(urls: string[], options?: BatchRequestOptions): Promise<ValidationResponse[]>;

  /**
   * Get HTTP client statistics
   * @returns HTTP client performance statistics
   */
  getStats(): HttpClientStats;
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;

  /** Custom headers */
  headers?: Record<string, string>;

  /** Whether to follow redirects */
  followRedirects?: boolean;

  /** Maximum number of redirects to follow */
  maxRedirects?: number;

  /** User agent string */
  userAgent?: string;

  /** Whether to validate SSL certificates */
  validateSSL?: boolean;
}

/**
 * Batch request options
 */
export interface BatchRequestOptions extends RequestOptions {
  /** Maximum concurrent requests */
  concurrency?: number;

  /** Delay between batches in milliseconds */
  batchDelay?: number;

  /** Batch size */
  batchSize?: number;

  /** Whether to fail fast on first error */
  failFast?: boolean;
}

/**
 * HTTP client statistics
 */
export interface HttpClientStats {
  /** Total requests made */
  totalRequests: number;

  /** Successful requests */
  successfulRequests: number;

  /** Failed requests */
  failedRequests: number;

  /** Average response time */
  averageResponseTime: number;

  /** Total bytes transferred */
  bytesTransferred: number;

  /** Cache statistics */
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };

  /** Last updated timestamp */
  lastUpdated: string;
}