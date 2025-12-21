/**
 * Type definitions for Bandai Hobby Catalog Discovery functionality
 */

/**
 * Configuration options for catalog discovery operations
 */
export interface CatalogDiscoveryOptions {
	/** Catalog ranges to process (e.g., ["01_1000", "02_1000"]) */
	ranges: string[];

	/** Output directory for scraped items (default: "./data/bandai/items/") */
	outputDir: string;

	/** Enable caching of catalog pages */
	cache: boolean;

	/** Resume from previous discovery session */
	resume: boolean;

	/** Enable verbose logging */
	verbose: boolean;

	/** Delay between requests in milliseconds */
	delayMs: number;

	/** Enable translation of Japanese text to English */
	translate?: boolean;

	/** Force re-scrape even if items already have files (preserves curated data via merge) */
	forceRescrape?: boolean;
}

/**
 * Statistics for a single catalog range processing
 */
export interface CatalogRangeStats {
	/** Processing status ('success' | 'error') */
	status: "success" | "error";

	/** Number of URLs discovered for this range */
	urlCount: number;

	/** Processing error if any */
	error?: string | undefined;
}

/**
 * Results from catalog discovery operation
 */
export interface CatalogDiscoveryResult {
	/** Whether the operation was completely successful */
	successful: boolean;

	/** Total catalog ranges processed */
	totalRanges: number;

	/** Number of ranges that completed successfully */
	completedRanges: number;

	/** Number of ranges that failed */
	failedRanges: number;

	/** Total URLs discovered across all ranges */
	discoveredUrls: number;

	/** Total URLs successfully processed */
	processedUrls: number;

	/** Array of error messages */
	errors: string[];

	/** Total operation duration in milliseconds */
	processingTime: number;

	/** Detailed processing statistics */
	stats: {
		totalRanges: number;
		completedRanges: number;
		failedRanges: number;
		averageProcessingTime: number;
	};

	/** Per-range statistics (added in implementation) */
	rangeStats?: Record<string, CatalogRangeStats>;
}

/**
 * Represents a single catalog range page
 */
export interface CatalogRange {
	/** Range identifier (e.g., "01_1000") */
	id: string;

	/** Full URL to the catalog page */
	url: string;

	/** Current processing status */
	status: "pending" | "discovering" | "completed" | "failed";

	/** Number of item URLs discovered */
	itemCount: number;

	/** Processing errors if any */
	error?: string;
}

/**
 * Input validation for catalog discovery CLI command
 */
export interface CatalogDiscoveryInput {
	source: "bandai-items-catalog";
	ranges?: string[];           // Parsed from --ranges option
	output?: string;             // Existing --output option
	cache?: boolean;             // Existing --cache option
	resume?: boolean;            // Existing --resume option
	verbose?: boolean;           // Existing --verbose option
	dryRun?: boolean;            // New --dry-run option
	delayMs?: number;            // Existing delay option
}

/**
 * Entry for a valid catalog item in the index
 */
export interface CatalogIndexEntry {
	/** Catalog ID (e.g., "01_1000") */
	id: string;

	/** Whether the page contains valid product content */
	hasContent: boolean;

	/** Last time this entry was checked */
	lastChecked: string;

	/** Whether the HTML file exists on disk */
	hasFile: boolean;

	/** Product name if available */
	productName?: string;
}

/**
 * Range of invalid catalog IDs
 */
export interface CatalogInvalidRange {
	/** Starting ID of invalid range */
	start: string;

	/** Ending ID of invalid range */
	end: string;

	/** When this range was last checked */
	lastChecked: string;
}

/**
 * Compact index format for tracking valid/invalid catalog IDs
 * Similar to manual downloader's index.json structure
 */
export interface CatalogIndex {
	/** Valid catalog entries keyed by ID */
	valid: Record<string, CatalogIndexEntry>;

	/** Ranges of consecutive invalid IDs (for efficient storage) */
	invalidRanges: CatalogInvalidRange[];

	/** Individual invalid IDs that don't form ranges */
	invalidSingles: string[];

	/** Total number of IDs checked */
	totalChecked: number;

	/** Timestamp of last index update */
	lastUpdated: string;
}