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
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'verified';
  error?: {
    type: 'network' | 'http' | 'filesystem' | 'verification';
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

export interface DownloadSession {
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  targetUrl: string;
  outputDirectory: string;
  status: 'initializing' | 'discovering' | 'downloading' | 'completed' | 'failed' | 'paused';
  currentPhase: 'range-discovery' | 'gap-detection' | 'bulk-download' | 'verification';
  lastProcessedId: number;
  discoveredIds: number[];
  failedIds: number[];
  queuedIds: number[];
  config: SessionConfiguration;
  stats: any;
  checkpoint: any;
}

export interface DiscoveryResult {
  minId: number;
  maxId: number;
  validIds: number[];
  gaps: any[];
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
  type: 'small-gap' | 'medium-gap' | 'large-gap' | 'range-boundary';
  recommendedAction: string;
}

export interface IdValidationResult {
  id: number;
  exists: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export interface RangeExpansionResult {
  minId: number;
  maxId: number;
  expansions: number;
  confidence: number;
  strategy: string;
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

export interface CLIOutput {
  status: 'success' | 'error' | 'warning';
  message: string;
  results?: {
    session: DownloadSession;
    downloadedFiles: string[];
    errors: string[];
    statistics: any;
  };
  error?: any;
}

export interface ProgressEvent {
  type: 'progress' | 'error' | 'completion' | 'checkpoint';
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

// Service interfaces (simplified)
export interface IDiscoveryService {
  discoverRange(baseUrl: string, options?: any): Promise<DiscoveryResult>;
  detectGaps(baseUrl: string, minId: number, maxId: number, options?: any): Promise<GapPattern[]>;
  validateIds(baseUrl: string, ids: number[], options?: any): Promise<any>;
}

export interface IDownloaderService {
  initialize(options: CLIOptions): Promise<string>;
  startDownload(options: CLIOptions): Promise<CLIOutput>;
}

export interface IHttpClient {
  validateUrl(url: string, options?: any): Promise<any>;
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
  status: 'idle' | 'discovering' | 'downloading' | 'completed' | 'failed' | 'paused';

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
  type: 'network' | 'http' | 'filesystem' | 'validation' | 'configuration';

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