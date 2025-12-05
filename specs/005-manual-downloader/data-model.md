# Data Model: Bandai Manual Content Downloader

**Feature**: Manual Downloader | **Spec**: 005-manual-downloader | **Date**: 2025-12-05-124900
**Phase**: Phase 1 - Design and Architecture | **Status**: Complete
**Type**: TypeScript Interfaces and Entity Definitions

---

## 1. Core Entity Definitions

### 1.1. Manual Page Entity

```typescript
/**
 * Represents a single Bandai manual page with all associated metadata
 */
interface ManualPage {
  /** Unique identifier from the URL (e.g., 652 from /menus/detail/652/) */
  id: number;

  /** Full URL to the manual page */
  url: string;

  /** Download timestamp in ISO 8601 format */
  downloadedAt: string;

  /** Raw HTML content as downloaded from the server */
  htmlContent: string;

  /** Content length in bytes */
  contentSize: number;

  /** HTTP status code received during download */
  statusCode: number;

  /** Response headers received from server */
  headers: Record<string, string>;

  /** Download duration in milliseconds */
  downloadDuration: number;

  /** Content hash for integrity verification */
  contentHash: string;

  /** Whether the content was successfully verified */
  isVerified: boolean;

  /** File path where content is stored */
  filePath: string;

  /** Processing status */
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'verified';

  /** Error details if download failed */
  error?: {
    type: 'network' | 'http' | 'filesystem' | 'verification';
    message: string;
    timestamp: string;
    retryCount: number;
  };
}
```

### 1.2. Download Session Entity

```typescript
/**
 * Tracks the overall scraping session progress and metadata
 */
interface DownloadSession {
  /** Unique session identifier (UUID v4) */
  sessionId: string;

  /** Session start timestamp in ISO 8601 format */
  startTime: string;

  /** Session end timestamp (null if ongoing) */
  endTime?: string;

  /** Total duration in milliseconds (calculated) */
  duration?: number;

  /** Target URL pattern for discovery */
  targetUrl: string;

  /** Directory where downloaded files are stored */
  outputDirectory: string;

  /** Current processing status */
  status: 'initializing' | 'discovering' | 'downloading' | 'completed' | 'failed' | 'paused';

  /** Current phase of operation */
  currentPhase: 'range-discovery' | 'gap-detection' | 'bulk-download' | 'verification';

  /** Last processed manual ID */
  lastProcessedId: number;

  /** All discovered valid manual IDs */
  discoveredIds: number[];

  /** IDs that permanently failed processing */
  failedIds: number[];

  /** IDs that are currently queued for processing */
  queuedIds: number[];

  /** Session configuration */
  config: SessionConfiguration;

  /** Performance and progress statistics */
  stats: SessionStatistics;

  /** Checkpoint information for resume capability */
  checkpoint: CheckpointInfo;
}
```

### 1.3. Session Configuration

```typescript
/**
 * Configuration parameters for the download session
 */
interface SessionConfiguration {
  /** Rate limiting delay between requests in milliseconds */
  rateLimitDelay: number;

  /** Maximum number of concurrent download attempts */
  maxConcurrent: number;

  /** Maximum retry attempts for failed downloads */
  maxRetries: number;

  /** Exponential backoff multiplier for retries */
  backoffMultiplier: number;

  /** Request timeout in milliseconds */
  requestTimeout: number;

  /** User agent string for HTTP requests */
  userAgent: string;

  /** Checkpoint interval (number of processed IDs between saves) */
  checkpointInterval: number;

  /** Whether to verify downloaded content integrity */
  verifyDownloads: boolean;

  /** Whether to compress downloaded HTML files */
  compressFiles: boolean;

  /** Maximum disk space usage in bytes (0 = unlimited) */
  maxDiskUsage: number;

  /** Custom HTTP headers */
  customHeaders: Record<string, string>;

  /** ID range constraints (if known) */
  idRange?: {
    min: number;
    max: number;
  };
}
```

### 1.4. Session Statistics

```typescript
/**
 * Real-time statistics and performance metrics
 */
interface SessionStatistics {
  /** Total number of IDs checked (including non-existent) */
  totalChecked: number;

  /** Number of successful downloads */
  successCount: number;

  /** Number of failed downloads */
  failureCount: number;

  /** Number of pages skipped (already exists) */
  skippedCount: number;

  /** Number of pages verified for integrity */
  verifiedCount: number;

  /** Average response time in milliseconds */
  averageResponseTime: number;

  /** Total bytes downloaded */
  totalBytesDownloaded: number;

  /** Discovery rate (IDs per minute) */
  discoveryRate: number;

  /** Download rate (pages per minute) */
  downloadRate: number;

  /** Current processing speed (IDs per minute) */
  currentSpeed: number;

  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number;

  /** Progress percentage (0-100) */
  progressPercentage: number;

  /** Last updated timestamp */
  lastUpdateTime: string;
}
```

### 1.5. Checkpoint Information

```typescript
/**
 * Checkpoint data for resume functionality
 */
interface CheckpointInfo {
  /** Last checkpoint timestamp */
  lastCheckpointTime: string;

  /** Number of checkpoints created so far */
  checkpointCount: number;

  /** Total size of checkpoint data in bytes */
  checkpointSize: number;

  /** Whether the last checkpoint was successfully saved */
  lastCheckpointSuccessful: boolean;

  /** List of recent checkpoint files for recovery */
  availableCheckpoints: string[];

  /** Checkpoint validation hash */
  integrityHash: string;
}
```

---

## 2. Discovery and Range Detection

### 2.1. Discovery Result

```typescript
/**
 * Results from the intelligent ID discovery process
 */
interface DiscoveryResult {
  /** Discovered minimum ID range */
  minId: number;

  /** Discovered maximum ID range */
  maxId: number;

  /** All valid IDs found in the range */
  validIds: number[];

  /** Detected gap patterns in the ID sequence */
  gaps: GapPattern[];

  /** Discovery confidence score (0-1) */
  confidence: number;

  /** Total time taken for discovery in milliseconds */
  discoveryDuration: number;

  /** Number of IDs tested during discovery */
  idsTested: number;

  /** Discovery strategy used */
  strategy: 'linear' | 'exponential' | 'adaptive' | 'hybrid';
}
```

### 2.2. Gap Pattern

```typescript
/**
 * Represents a detected gap in the ID sequence
 */
interface GapPattern {
  /** Starting ID of the gap */
  startId: number;

  /** Ending ID of the gap */
  endId: number;

  /** Size of the gap (number of missing IDs) */
  gapSize: number;

  /** Confidence that this is an actual gap vs range boundary */
  confidence: number;

  /** Gap type classification */
  type: 'small-gap' | 'medium-gap' | 'large-gap' | 'range-boundary';

  /** Recommended action for this gap */
  recommendedAction: 'investigate' | 'skip' | 'deep-scan' | 'accept';
}
```

---

## 3. File Storage Management

### 3.1. File Storage Configuration

```typescript
/**
 * Configuration for file storage and organization
 */
interface FileStorageConfig {
  /** Base directory for all downloads */
  baseDirectory: string;

  /** Subdirectory structure template */
  directoryTemplate: string;  // e.g., "./data/raw/bandai/manuals"

  /** File naming pattern */
  filePattern: string;        // e.g., "{id}.html"

  /** Whether to create date-based subdirectories */
  useDateSubdirectories: boolean;

  /** Maximum files per directory (for organization) */
  maxFilesPerDirectory: number;

  /** File compression settings */
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'brotli' | 'none';
    level: number;
  };

  /** File retention settings */
  retention: {
    keepOriginals: boolean;
    maxAgeDays: number;
    maxTotalSize: number;
  };
}
```

### 3.2. File Metadata

```typescript
/**
 * Metadata for stored files
 */
interface FileMetadata {
  /** Original filename */
  originalName: string;

  /** Stored file path */
  storedPath: string;

  /** File size in bytes */
  size: number;

  /** File creation timestamp */
  createdAt: string;

  /** File last modified timestamp */
  modifiedAt: string;

  /** Content hash (SHA-256) */
  contentHash: string;

  /** MIME type */
  mimeType: string;

  /** Encoding */
  encoding: string;

  /** Whether file is compressed */
  isCompressed: boolean;

  /** Compression algorithm used */
  compressionAlgorithm?: string;

  /** Associated manual ID */
  manualId: number;

  /** Download session ID */
  sessionId: string;
}
```

---

## 4. Error and Event Handling

### 4.1. Error Classification

```typescript
/**
 * Standardized error classification for troubleshooting
 */
interface DownloadError {
  /** Unique error identifier */
  errorId: string;

  /** Error severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Error category */
  category: 'network' | 'http' | 'filesystem' | 'validation' | 'configuration';

  /** Specific error type */
  type: string;

  /** Human-readable error message */
  message: string;

  /** Technical error details */
  details: {
    stack?: string;
    statusCode?: number;
    url?: string;
    attemptNumber: number;
    timestamp: string;
  };

  /** Recovery suggestion */
  recoveryAction: 'retry' | 'skip' | 'abort' | 'manual-intervention';

  /** Whether this error is retryable */
  isRetryable: boolean;

  /** Maximum retry attempts allowed */
  maxRetries: number;

  /** Delay before next retry in milliseconds */
  retryDelay: number;
}
```

### 4.2. Progress Event

```typescript
/**
 * Progress update event for real-time monitoring
 */
interface ProgressEvent {
  /** Event timestamp */
  timestamp: string;

  /** Event type */
  type: 'progress' | 'milestone' | 'error' | 'warning' | 'completion';

  /** Current session state */
  session: {
    id: string;
    phase: string;
    status: string;
  };

  /** Progress metrics */
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

  /** Optional message or details */
  message?: string;

  /** Optional error information */
  error?: DownloadError;
}
```

---

## 5. Command Line Interface

### 5.1. CLI Configuration

```typescript
/**
 * Command line interface configuration options
 */
interface CLIOptions {
  /** Target URL pattern */
  url: string;

  /** Output directory */
  output: string;

  /** Starting ID (optional) */
  start?: number;

  /** Ending ID (optional) */
  end?: number;

  /** Rate limiting delay in seconds */
  delay?: number;

  /** Maximum concurrent downloads */
  concurrent?: number;

  /** Whether to resume from previous session */
  resume?: boolean;

  /** Session ID to resume (specific) */
  sessionId?: string;

  /** Verbose logging */
  verbose?: boolean;

  /** Quiet mode (minimal output) */
  quiet?: boolean;

  /** Configuration file path */
  config?: string;

  /** Whether to verify downloads */
  verify?: boolean;

  /** Whether to compress output files */
  compress?: boolean;

  /** Dry run mode (discovery only) */
  dryRun?: boolean;

  /** Maximum runtime in minutes */
  maxRuntime?: number;
}
```

### 5.2. CLI Output Format

```typescript
/**
 * Standardized output format for CLI operations
 */
interface CLIOutput {
  /** Operation status */
  status: 'success' | 'error' | 'warning';

  /** Human-readable message */
  message: string;

  /** Detailed results (if applicable) */
  results?: {
    session: DownloadSession;
    downloadedFiles: string[];
    errors: DownloadError[];
    statistics: SessionStatistics;
  };

  /** Error information (if applicable) */
  error?: DownloadError;

  /** Performance metrics */
  performance?: {
    duration: number;
    averageSpeed: number;
    peakMemory: number;
    diskUsage: number;
  };

  /** Next action suggestions */
  nextActions?: string[];
}
```

---

## 6. Data Validation Schemas

### 6.1. Input Validation

```typescript
/**
 * Zod schemas for runtime validation
 */
import { z } from 'zod';

const ManualPageSchema = z.object({
  id: z.number().int().positive(),
  url: z.string().url(),
  downloadedAt: z.string().datetime(),
  htmlContent: z.string().min(1000),
  contentSize: z.number().int().positive(),
  statusCode: z.number().int().min(100).max(599),
  headers: z.record(z.string()),
  downloadDuration: z.number().int().nonnegative(),
  contentHash: z.string().length(64),  // SHA-256 hex
  isVerified: z.boolean(),
  filePath: z.string(),
  status: z.enum(['pending', 'downloading', 'completed', 'failed', 'verified']),
  error: z.object({
    type: z.enum(['network', 'http', 'filesystem', 'verification']),
    message: z.string(),
    timestamp: z.string().datetime(),
    retryCount: z.number().int().nonnegative()
  }).optional()
});

const SessionConfigSchema = z.object({
  rateLimitDelay: z.number().int().min(1000),  // Minimum 1 second
  maxConcurrent: z.number().int().min(1).max(10),
  maxRetries: z.number().int().min(0).max(10),
  backoffMultiplier: z.number().min(1).max(5),
  requestTimeout: z.number().int().min(5000),  // Minimum 5 seconds
  userAgent: z.string().min(1),
  checkpointInterval: z.number().int().min(1),
  verifyDownloads: z.boolean(),
  compressFiles: z.boolean(),
  maxDiskUsage: z.number().int().nonnegative(),
  customHeaders: z.record(z.string()),
  idRange: z.object({
    min: z.number().int().positive(),
    max: z.number().int().positive()
  }).optional()
});
```

### 6.2. Output Validation

```typescript
/**
 * Output format validation for API responses
 */
const CLIOutputSchema = z.object({
  status: z.enum(['success', 'error', 'warning']),
  message: z.string(),
  results: z.object({
    session: z.any(),  // Complex object schema
    downloadedFiles: z.array(z.string()),
    errors: z.array(z.any()),
    statistics: z.any()
  }).optional(),
  error: z.any().optional(),
  performance: z.object({
    duration: z.number(),
    averageSpeed: z.number(),
    peakMemory: z.number(),
    diskUsage: z.number()
  }).optional(),
  nextActions: z.array(z.string()).optional()
});
```

---

## 7. Type Utilities and Helpers

### 7.1. Utility Types

```typescript
/**
 * Utility types for common operations
 */

/** Make all properties optional recursively */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Extract array element type */
type ArrayElement<T> = T extends (infer U)[] ? U : never;

/** Create a pick type with optional properties */
type OptionalPick<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

/** Status type for operations */
type OperationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Log level type */
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** File format type */
type FileFormat = 'html' | 'json' | 'csv' | 'txt';

/** Compression type */
type CompressionType = 'none' | 'gzip' | 'brotli' | 'zip';
```

### 7.2. Helper Functions

```typescript
/**
 * Type-safe helper functions
 */

/**
 * Type guard for checking if value is a valid ManualPage
 */
function isManualPage(obj: unknown): obj is ManualPage {
  return ManualPageSchema.safeParse(obj).success;
}

/**
 * Type guard for checking if value is a valid DownloadError
 */
function isDownloadError(obj: unknown): obj is DownloadError {
  return obj && typeof obj === 'object' &&
         'errorId' in obj && 'message' in obj && 'severity' in obj;
}

/**
 * Create a progress event with proper typing
 */
function createProgressEvent(
  type: ProgressEvent['type'],
  session: DownloadSession,
  message?: string
): ProgressEvent {
  return {
    timestamp: new Date().toISOString(),
    type,
    session: {
      id: session.sessionId,
      phase: session.currentPhase,
      status: session.status
    },
    progress: {
      totalProcessed: session.stats.totalChecked,
      totalDiscovered: session.discoveredIds.length,
      successCount: session.stats.successCount,
      failureCount: session.stats.failureCount,
      percentage: session.stats.progressPercentage,
      speed: session.stats.currentSpeed,
      eta: session.stats.estimatedTimeRemaining
    },
    message
  };
}
```

---

## 8. Database Schema (Future Enhancement)

### 8.1. SQLite Schema (Optional)

```sql
-- Manual pages table
CREATE TABLE manual_pages (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  downloaded_at TEXT NOT NULL,
  html_content TEXT NOT NULL,
  content_size INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  headers TEXT, -- JSON
  download_duration INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL,
  error_details TEXT, -- JSON
  session_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Download sessions table
CREATE TABLE download_sessions (
  session_id TEXT PRIMARY KEY,
  start_time TEXT NOT NULL,
  end_time TEXT,
  target_url TEXT NOT NULL,
  output_directory TEXT NOT NULL,
  status TEXT NOT NULL,
  current_phase TEXT NOT NULL,
  last_processed_id INTEGER NOT NULL,
  config TEXT NOT NULL, -- JSON
  stats TEXT NOT NULL, -- JSON
  checkpoint TEXT NOT NULL, -- JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Discovered IDs table for efficient range queries
CREATE TABLE discovered_ids (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL,
  discovered_at TEXT NOT NULL,
  gap_start INTEGER, -- NULL if not a gap start
  gap_end INTEGER,   -- NULL if not a gap end
  FOREIGN KEY (session_id) REFERENCES download_sessions(session_id)
);

-- Indexes for performance
CREATE INDEX idx_manual_pages_session_id ON manual_pages(session_id);
CREATE INDEX idx_manual_pages_status ON manual_pages(status);
CREATE INDEX idx_discovered_ids_session_id ON discovered_ids(session_id);
CREATE INDEX idx_discovered_ids_id ON discovered_ids(id);
```

---

## 9. Migration and Compatibility

### 9.1. Version Compatibility

```typescript
/**
 * Version information for data model compatibility
 */
interface DataModelVersion {
  /** Current version of the data model */
  version: string;

  /** Minimum compatible version */
  minCompatibleVersion: string;

  /** Migration path from previous versions */
  migrations: {
    from: string;
    to: string;
    migrationFunction: string; // Function name for migration
    description: string;
  }[];

  /** Deprecated fields (for backwards compatibility) */
  deprecatedFields: {
    field: string;
    version: string;
    replacement?: string;
    migrationStrategy?: string;
  }[];
}

/**
 * Current data model version
 */
export const DATA_MODEL_VERSION: DataModelVersion = {
  version: '1.0.0',
  minCompatibleVersion: '1.0.0',
  migrations: [],
  deprecatedFields: []
};
```

---

## 10. Usage Examples

### 10.1. Creating a New Download Session

```typescript
import { v4 as uuidv4 } from 'uuid';

const session: DownloadSession = {
  sessionId: uuidv4(),
  startTime: new Date().toISOString(),
  targetUrl: 'https://manual.bandai-hobby.net/menus/detail/',
  outputDirectory: './data/raw/bandai/manuals',
  status: 'initializing',
  currentPhase: 'range-discovery',
  lastProcessedId: 0,
  discoveredIds: [],
  failedIds: [],
  queuedIds: [],
  config: {
    rateLimitDelay: 8000,
    maxConcurrent: 1,
    maxRetries: 3,
    backoffMultiplier: 2,
    requestTimeout: 30000,
    userAgent: 'ManualDownloader/1.0; +http://example.com/bot',
    checkpointInterval: 10,
    verifyDownloads: true,
    compressFiles: false,
    maxDiskUsage: 0,
    customHeaders: {}
  },
  stats: {
    totalChecked: 0,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    verifiedCount: 0,
    averageResponseTime: 0,
    totalBytesDownloaded: 0,
    discoveryRate: 0,
    downloadRate: 0,
    currentSpeed: 0,
    estimatedTimeRemaining: 0,
    progressPercentage: 0,
    lastUpdateTime: new Date().toISOString()
  },
  checkpoint: {
    lastCheckpointTime: new Date().toISOString(),
    checkpointCount: 0,
    checkpointSize: 0,
    lastCheckpointSuccessful: true,
    availableCheckpoints: [],
    integrityHash: ''
  }
};
```

### 10.2. Processing a Manual Page

```typescript
async function processManualPage(id: number, session: DownloadSession): Promise<ManualPage> {
  const startTime = Date.now();
  const url = `${session.targetUrl}${id}/`;
  const filePath = path.join(session.outputDirectory, `${id}.html`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': session.config.userAgent,
        ...session.config.customHeaders
      },
      signal: AbortSignal.timeout(session.config.requestTimeout)
    });

    const htmlContent = await response.text();
    const downloadDuration = Date.now() - startTime;
    const contentHash = await computeSHA256(htmlContent);

    const manualPage: ManualPage = {
      id,
      url,
      downloadedAt: new Date().toISOString(),
      htmlContent,
      contentSize: Buffer.byteLength(htmlContent, 'utf8'),
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      downloadDuration,
      contentHash,
      isVerified: false,
      filePath,
      status: 'completed'
    };

    // Save to file system
    await fs.writeFile(filePath, htmlContent, 'utf-8');

    // Verify if requested
    if (session.config.verifyDownloads) {
      manualPage.isVerified = await verifyDownloadIntegrity(filePath, url);
    }

    return manualPage;
  } catch (error) {
    const downloadDuration = Date.now() - startTime;

    return {
      id,
      url,
      downloadedAt: new Date().toISOString(),
      htmlContent: '',
      contentSize: 0,
      statusCode: 0,
      headers: {},
      downloadDuration,
      contentHash: '',
      isVerified: false,
      filePath,
      status: 'failed',
      error: {
        type: error.name === 'AbortError' ? 'network' : 'http',
        message: error.message,
        timestamp: new Date().toISOString(),
        retryCount: 0
      }
    };
  }
}
```

---

## Conclusion

This data model provides a comprehensive foundation for the Bandai Manual Content Downloader feature. The interfaces are designed to be:

1. **Type-Safe**: Full TypeScript integration with Zod validation
2. **Extensible**: Easy to add new fields and functionality
3. **Serializable**: JSON-compatible for persistence and API communication
4. **Testable**: Clear contracts for unit and integration testing
5. **Performance-Optimized**: Efficient data structures for large-scale operations

The model supports all requirements from the specification including intelligent discovery, resume capability, progress tracking, and comprehensive error handling.