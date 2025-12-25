/**
 * Shared types and constants for the scrape command
 */

import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Options for scrape command execution
 */
export interface ScrapeOptions {
	language: string;
	output: string;
	cache: boolean;
	resume: boolean;
	dryRun: boolean;
	maxAgeDays: number;
	/** Single specific ID to process (e.g., "01_1234") */
	id?: string;
	/** Start ID for range (e.g., "01_1000") */
	start?: string;
	/** End ID for range (e.g., "01_2000") */
	end?: string;
	/** Number of items to process from start */
	count?: number;
	/** Profile timing for each step */
	profile?: boolean;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of scrape command execution
 */
export interface ScrapeResult {
	totalProcessed: number;
	successful: number;
	failed: number;
	cached: number;
	new: number;
	errors: string[];
	duration: number;
	/** Manual IDs discovered during item scraping */
	discoveredManuals: number;
	/** Orphan manuals processed (not linked to items) */
	orphanManuals: {
		total: number;
		processed: number;
		failed: number;
	};
	/** Images downloaded */
	imagesDownloaded: number;
	/** Translations updated in existing items */
	translationsUpdated: number;
}

/**
 * Timing data for profiling
 */
export interface StepTiming {
	name: string;
	durationMs: number;
}

/**
 * Statistics for download operations
 */
export interface DownloadStats {
	downloaded: number;
	skipped: number;
	deduplicated?: number;
}

// ============================================================================
// Constants - Error Messages
// ============================================================================

export const UNKNOWN_ERROR = "Unknown error";

// ============================================================================
// Constants - Limits
// ============================================================================

/** Maximum item ID to process */
export const MAX_ITEM_ID = 9999;

// ============================================================================
// Constants - HTTP Configuration
// ============================================================================

/** Default user agent for HTTP requests */
export const DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

/** Timeout for HTTP requests in milliseconds (30 seconds) */
export const FETCH_TIMEOUT_MS = 30_000;

/** Maximum number of retries for failed HTTP requests */
export const MAX_FETCH_RETRIES = 3;

/** Base delay between retries in milliseconds (with exponential backoff) */
export const RETRY_DELAY_MS = 2000;

// ============================================================================
// Constants - Time Conversion
// ============================================================================

/** Milliseconds per second */
export const MS_PER_SECOND = 1000;

/** Seconds per minute */
export const SECONDS_PER_MINUTE = 60;

/** Minutes per hour */
export const MINUTES_PER_HOUR = 60;

/** Hours per day */
export const HOURS_PER_DAY = 24;

// ============================================================================
// Constants - Data Directories
// ============================================================================

/** Directory for item JSON files */
export const ITEMS_DATA_DIR = resolveWorkspacePath("data/src/items");

/** Directory for manual JSON files */
export const MANUALS_DATA_DIR = resolveWorkspacePath("data/src/manuals");

/** Directory for brand JSON files */
export const BRANDS_DATA_DIR = resolveWorkspacePath("data/src/brands");

/** Directory for series JSON files */
export const SERIES_DATA_DIR = resolveWorkspacePath("data/src/series");

/** Directory for category JSON files */
export const CATEGORIES_DATA_DIR = resolveWorkspacePath("data/src/categories");

/** Directory for item image assets */
export const ASSETS_DIR = resolveWorkspacePath("assets/images/items");

/** Directory for manual assets (PDFs and images) */
export const MANUALS_ASSETS_DIR = resolveWorkspacePath("assets/manuals");
