/**
 * Download session entity definitions
 *
 * Tracks the overall scraping session progress and metadata
 * with comprehensive statistics and state management.
 */

import { ManualPage } from "./manual-page";

export interface DownloadSession {
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
  status: "initializing" | "discovering" | "downloading" | "completed" | "failed" | "paused";

  /** Current phase of operation */
  currentPhase: "range-discovery" | "gap-detection" | "bulk-download" | "verification";

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

export interface SessionConfiguration {
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

  /** Whether to enable detailed logging */
  enableDetailedLogging?: boolean;

  /** Whether to enable performance metrics */
  enableMetrics?: boolean;
}

export interface SessionStatistics {
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

export interface CheckpointInfo {
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

/**
 * Factory function for creating download sessions
 */
export function createDownloadSession(config: {
  sessionId?: string;
  targetUrl: string;
  outputDirectory: string;
  sessionConfig: SessionConfiguration;
}): DownloadSession {
	const now = new Date().toISOString();
	const sessionId = config.sessionId ?? generateSessionId();

	return {
		sessionId,
		startTime: now,
		targetUrl: config.targetUrl,
		outputDirectory: config.outputDirectory,
		status: "initializing",
		currentPhase: "range-discovery",
		lastProcessedId: 0,
		discoveredIds: [],
		failedIds: [],
		queuedIds: [],
		config: config.sessionConfig,
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
			lastUpdateTime: now,
		},
		checkpoint: {
			lastCheckpointTime: now,
			checkpointCount: 0,
			checkpointSize: 0,
			lastCheckpointSuccessful: true,
			availableCheckpoints: [],
			integrityHash: "",
		},
	};
}

/**
 * Generate a session identifier
 */
function generateSessionId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).slice(2, 15);
	return `${timestamp}-${random}`;
}

/**
 * Update session statistics
 */
export function updateSessionStats(session: DownloadSession, manual: ManualPage): void {
	if (manual.status === "completed") {
		session.stats.successCount++;
		session.stats.totalBytesDownloaded += manual.contentSize;
	} else if (manual.status === "failed") {
		session.stats.failureCount++;
	}

	session.stats.lastUpdateTime = new Date().toISOString();

	// Calculate progress percentage
	if (session.discoveredIds.length > 0) {
		session.stats.progressPercentage = Math.round(
			(session.stats.successCount / session.discoveredIds.length) * 100,
		);
	}

	// Calculate average response time
	const totalRequests = session.stats.successCount + session.stats.failureCount;
	if (totalRequests > 0) {
		const totalTime = session.stats.averageResponseTime * (totalRequests - 1) + manual.downloadDuration;
		session.stats.averageResponseTime = totalTime / totalRequests;
	}

	// Update current speed
	const elapsed = new Date(session.startTime).getTime();
	if (elapsed > 0) {
		session.stats.currentSpeed = (session.stats.successCount / elapsed) * 60_000; // per minute
	}
}

/**
 * Check if session is complete
 */
export function isSessionComplete(session: DownloadSession): boolean {
	return session.status === "completed" &&
         session.discoveredIds.length > 0 &&
         session.stats.successCount === session.discoveredIds.length;
}

/**
 * Get session duration in human readable format
 */
export function getFormattedDuration(session: DownloadSession): string {
	const duration = session.duration ??
    (session.endTime ?
    	new Date(session.endTime).getTime() - new Date(session.startTime).getTime() :
    	Date.now() - new Date(session.startTime).getTime()
    );

	const hours = Math.floor(duration / (1000 * 60 * 60));
	const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((duration % (1000 * 60)) / 1000);

	if (hours > 0) {
		return `${hours}h ${minutes}m ${seconds}s`;
	} else if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	} else {
		return `${seconds}s`;
	}
}