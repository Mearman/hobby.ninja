/**
 * Type definitions for Bandai Manual Content Downloader
 *
 * Core entities and interfaces for the manual downloader system.
 * These types define the data structures used throughout the application.
 *
 * @version 1.0.0
 * @since 2025-12-05
 */

// Define types inline for now (will be refined based on specifications)

export interface ManualPage {
  id: number;
  url: string;
  downloadedAt: string;
  htmlContent: string;
  contentSize: number;
  statusCode: number;
  headers: Record<string, string>;
  downloadDuration: number;
  contentHash: string;
  isVerified: boolean;
  filePath: string;
  status: "pending" | "downloading" | "completed" | "failed" | "verified";
  error?: {
    type: "network" | "http" | "filesystem" | "verification";
    message: string;
    timestamp: string;
    retryCount: number;
  };
  metadata?: {
    title?: string;
    description?: string;
    pageCount?: number;
    fileSize?: number;
    lastModified?: string;
    etag?: string;
  };
}

export interface SessionConfiguration {
  rateLimitDelay: number;
  maxConcurrent: number;
  maxRetries: number;
  backoffMultiplier: number;
  requestTimeout: number;
  userAgent: string;
  checkpointInterval: number;
  verifyDownloads: boolean;
  compressFiles: boolean;
  maxDiskUsage: number;
  customHeaders: Record<string, string>;
  idRange?: {
    min: number;
    max: number;
  };
  enableDetailedLogging?: boolean;
  enableMetrics?: boolean;
}

/** Statistics for a download session */
export interface SessionStats {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  bytesDownloaded: number;
  averageResponseTime: number;
}

/** Checkpoint for resuming sessions */
export interface SessionCheckpoint {
  lastProcessedId: number;
  timestamp: string;
  recoveredFromError: boolean;
}

export interface DownloadSession {
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  targetUrl: string;
  outputDirectory: string;
  status: "initializing" | "discovering" | "downloading" | "completed" | "failed" | "paused";
  currentPhase: "range-discovery" | "gap-detection" | "bulk-download" | "verification";
  lastProcessedId: number;
  discoveredIds: number[];
  failedIds: number[];
  queuedIds: number[];
  config: SessionConfiguration;
  stats: SessionStats;
  checkpoint: SessionCheckpoint;
}

export interface DiscoveryResult {
  minId: number;
  maxId: number;
  validIds: number[];
  gaps: GapPattern[];
  confidence: number;
  discoveryDuration: number;
  idsTested: number;
  strategy: string;
}

export interface GapPattern {
  startId: number;
  endId: number;
  gapSize: number;
  confidence: number;
  type: "small-gap" | "medium-gap" | "large-gap" | "range-boundary";
  recommendedAction: string;
}

export interface IdValidationResult {
  id: number;
  isValid: boolean;
  statusCode: number;
  finalUrl: string;
  contentLength: number;
  responseTime: number;
  fromCache: boolean;
  error?: string;
  confidence: number;
}

export interface RangeExpansionResult {
  minId: number;
  maxId: number;
  rangeSize: number;
  expansion: {
    upwardSteps: number;
    downwardSteps: number;
    totalSteps: number;
    consecutiveFailures: {
      upward: number;
      downward: number;
    };
  };
  quality: {
    confidence: number;
    coverage: number;
    gapDensity: number;
  };
  performance: {
    duration: number;
    requestsMade: number;
    averageResponseTime: number;
    successRate: number;
  };
}

export interface CLIOptions {
  url?: string;
  output?: string;
  start?: number;
  end?: number;
  delay?: number;
  concurrent?: number;
  resume?: boolean;
  sessionId?: string;
  verbose?: boolean;
  quiet?: boolean;
  config?: string;
  verify?: boolean;
  compress?: boolean;
  dryRun?: boolean;
  maxRuntime?: number;
}

/** Output statistics for a CLI run */
export interface CLIStatistics {
  totalDownloaded: number;
  totalFailed: number;
  totalSkipped: number;
  bytesDownloaded: number;
  duration: number;
}

export interface CLIOutput {
  status: "success" | "error" | "warning";
  message: string;
  results?: {
    session: DownloadSession;
    downloadedFiles: string[];
    errors: string[];
    statistics: CLIStatistics;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ProgressEvent {
  type: "progress" | "error" | "completion" | "checkpoint";
  timestamp: string;
  session: {
    id: string;
    phase: string;
    status: string;
  };
  progress: {
    currentId?: number;
    totalProcessed: number;
    totalDiscovered: number;
    successCount: number;
    failureCount: number;
    percentage: number;
    speed: number;
    eta: number;
  };
  message?: string;
}

/** Discovery service options */
export interface DiscoveryServiceOptions {
  startId?: number;
  maxRange?: number;
  strategy?: "linear" | "exponential" | "adaptive" | "hybrid";
  detectGaps?: boolean;
  minConfidence?: number;
  timeLimit?: number;
}

/** Gap detection options */
export interface GapDetectionOptions {
  strategy: "sequential" | "sampling" | "adaptive" | "statistical";
  sampleSize?: number;
  minGapSize?: number;
  confidenceThreshold?: number;
}

/** ID validation options */
export interface IdValidationOptions {
  parallel?: boolean;
  concurrency?: number;
  cache?: boolean;
  timeout?: number;
}

/** Validation result from the discovery service */
export interface ValidationServiceResult {
  results: IdValidationResult[];
  summary: { total: number; valid: number; invalid: number; errors: number; cached: number };
  performance: { duration: number; averageResponseTime: number; requestsPerSecond: number; cacheHitRate: number };
}

/** HTTP client validation options */
export interface HttpValidationOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

/** HTTP validation result */
export interface HttpValidationResult {
  statusCode: number;
  contentLength: number;
  isValid: boolean;
  duration: number;
  headers: Record<string, string>;
  finalUrl: string;
  fromCache: boolean;
}

// Service interfaces (simplified)
export interface IDiscoveryService {
  discoverRange(baseUrl: string, options?: DiscoveryServiceOptions): Promise<DiscoveryResult>;
  detectGaps(baseUrl: string, minId: number, maxId: number, options?: GapDetectionOptions): Promise<GapPattern[]>;
  validateIds(baseUrl: string, ids: number[], options?: IdValidationOptions): Promise<ValidationServiceResult>;
}

export interface IDownloaderService {
  initialize(options: CLIOptions): Promise<string>;
  startDownload(options: CLIOptions): Promise<CLIOutput>;
}

export interface IHttpClient {
  validateUrl(url: string, options?: HttpValidationOptions): Promise<HttpValidationResult>;
}

export interface ManualDownloaderConfig {
  targetUrl: string;
  outputDirectory: string;
  rateLimitDelay: number;
  maxRetries: number;
  userAgent: string;
  timeout: number;
}

export interface DownloadProgress {
  /** Current processing status */
  status: "idle" | "discovering" | "downloading" | "completed" | "failed" | "paused";

  /** Progress metrics */
  totalChecked: number;
  discoveredIds: number[];
  successCount: number;
  failureCount: number;
  currentId?: number;

  /** Performance metrics */
  startTime: number;
  estimatedTimeRemaining?: number;
  requestsPerSecond: number;
}

export interface ErrorInfo {
  /** Error classification */
  type: "network" | "http" | "filesystem" | "validation" | "configuration";

  /** Error details */
  code: string;
  message: string;
  timestamp: string;
  retryCount: number;

  /** Recovery suggestion */
  recoverable: boolean;
  suggestedAction?: string;
}

export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;

  /** Validation details */
  errors: string[];
  warnings: string[];

  /** Performance metrics */
  duration: number;
  bytesValidated: number;
}

export interface FileSystemUtils {
  /** File operations */
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  deleteFile(path: string): Promise<void>;

  /** Directory operations */
  listFiles(directory: string): Promise<string[]>;
  ensureDirectory(path: string): Promise<void>;

  /** File validation */
  getFileSize(path: string): Promise<number>;
  getFileHash(path: string): Promise<string>;
}