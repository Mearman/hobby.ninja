/**
 * Common constants used across the CLI package
 * Replaces magic numbers with named constants for better maintainability
 */

// Process exit codes
export const EXIT_CODES = {
	SUCCESS: 0,
	GENERAL_ERROR: 1,
	INVALID_ARGS: 2,
	NETWORK_ERROR: 3,
	FILE_ERROR: 4,
	VALIDATION_ERROR: 5,
} as const;

// Time-related constants (in milliseconds)
export const TIME_MILLISECONDS = {
	SECOND: 1000,
	MINUTE: 60_000,
	HOUR: 3_600_000,
	DAY: 86_400_000,
	WEEK: 604_800_000,
} as const;

export const TIME_SECONDS = {
	ONE: 1,
	TWO: 2,
	FIVE: 5,
	TEN: 10,
	THIRTY: 30,
	SIXTY: 60,
} as const;

export const TIME_MINUTES = {
	ONE: 1,
	FIVE: 5,
	TEN: 10,
	THIRTY: 30,
	SIXTY: 60,
} as const;

export const TIME_HOURS = {
	ONE: 1,
	TWELVE: 12,
	TWENTY_FOUR: 24,
	ONE_HUNDRED_AND_SIXTY_EIGHT: 168, // 1 week in hours
} as const;

// Default timeouts and delays
export const DEFAULT_TIMEOUTS = {
	SHORT: 1000,           // 1 second
	MEDIUM: 5000,          // 5 seconds
	LONG: 10_000,           // 10 seconds
	DEFAULT_DELAY: 0,      // No artificial delay between requests
	MIN_DELAY: 0,           // Minimum allowed delay
	MAX_DELAY: 60_000,      // Maximum allowed delay (1 minute)
	REQUEST_TIMEOUT: 30_000, // 30 seconds for HTTP requests
	CLEANUP_INTERVAL: 1000,  // 1 second for cleanup intervals (reduced)
} as const;

// Retry and attempt constants
export const RETRY_CONFIG = {
	DEFAULT_RETRIES: 3,
	MAX_RETRIES: 10,
	MIN_RETRIES: 0,
	RETRY_DELAY_BASE: 1000, // Base delay for exponential backoff
} as const;

// Concurrency limits
export const CONCURRENCY_LIMITS = {
	MIN: 1,
	DEFAULT: 3,
	MAX: 10,
	HIGH_CONCURRENCY: 16,
	MEDIUM_CONCURRENCY: 8,
	LOW_CONCURRENCY: 4,
} as const;

// Batch sizes for processing
export const BATCH_SIZES = {
	SMALL: 10,
	MEDIUM: 100,
	LARGE: 1000,
	EXTRA_LARGE: 10_000,
} as const;

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
	KILOBYTE: 1024,
	MEGABYTE: 1_048_576, // 1024 * 1024
	DEFAULT_MAX_FILE_SIZE: 10 * 1_048_576, // 10MB
	LARGE_FILE_SIZE: 100 * 1_048_576, // 100MB
} as const;

// Progress percentages
export const PROGRESS_PERCENTAGES = {
	START: 0,
	PREPARING: 25,
	PROCESSING: 50,
	FINALIZING: 75,
	COMPLETE: 100,
	EXPORTING_PROGRESS: 0.5, // 50% for exporting stage
	FINALIZING_PROGRESS: 0.9, // 90% for finalizing stage
	COMPLETE_PROGRESS: 1, // 100% for complete
} as const;

// Cache and storage constants
export const CACHE_CONFIG = {
	DEFAULT_TTL_HOURS: 24,
	DEFAULT_TTL_MILLISECONDS: 24 * 60 * 60 * 1000, // 24 hours
	MIN_TTL_HOURS: 1,
	MAX_TTL_HOURS: 168, // 1 week
	DEFAULT_CACHE_DIR: ".cache/gundam-scraper",
	COMPRESSION_THRESHOLD: 1024, // Compress files larger than 1KB
} as const;

// Rate limiting constants
export const RATE_LIMITING = {
	DEFAULT_REQUESTS_PER_SECOND: 2,
	DEFAULT_REQUESTS_PER_MINUTE: 60,
	DEFAULT_REQUESTS_PER_HOUR: 1000,
	DEFAULT_BURST_CAPACITY: 5,
	BANDAI_REQUESTS_PER_SECOND: 1, // Conservative rate for Bandai
	BANDAI_REQUESTS_PER_MINUTE: 30,
	BANDAI_REQUESTS_PER_HOUR: 500,
	BANDAI_BURST_CAPACITY: 3,
	MIN_REQUESTS_PER_SECOND: 0.1,
	MAX_REQUESTS_PER_SECOND: 100,
	MIN_BURST_SIZE: 1,
	MAX_BURST_SIZE: 100,
} as const;

// Logging constants
export const LOGGING = {
	DEFAULT_MAX_FILES: 5,
	DEFAULT_MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
	FLUSH_DELAY: 0, // No artificial delay when flushing logs
	LOG_LEVEL_PRIORITIES: {
		error: 0,
		warn: 1,
		info: 2,
		debug: 3,
	} as const,
	ANSI_COLORS: {
		RED: "\u001B[31m",
		YELLOW: "\u001B[33m",
		BLUE: "\u001B[36m",
		WHITE: "\u001B[37m",
		RESET: "\u001B[0m",
	} as const,
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
	MIN_CONCURRENCY: 1,
	MAX_CONCURRENCY: 10,
	MIN_DELAY_MS: 0,
	MAX_DELAY_MS: 60_000,
	MIN_TIMEOUT_MS: 1000,
	MAX_TIMEOUT_MS: 300_000,
	MIN_CACHE_EXPIRY_HOURS: 1,
	MAX_CACHE_EXPIRY_HOURS: 168,
	MIN_REQUESTS_PER_SECOND: 0.1,
	MAX_REQUESTS_PER_SECOND: 100,
} as const;

// Catalog discovery constants
// Note: Bandai uses variable-length IDs (e.g., 01_1, 01_778, 01_1000)
export const CATALOG_DISCOVERY = {
	DEFAULT_START_ID: "01_1",
	DEFAULT_COUNT: 10,
	ID_PREFIX_LENGTH: 2,
	MAX_RANGES_TO_DISPLAY: 5,
} as const;

// Pagination and display constants
export const DISPLAY = {
	MAX_RANGES_TO_SHOW: 5,
	PAGESIZE_DEFAULT: 20,
	OFFSET_DEFAULT: 0,
	PREVIEW_LINES: 10,
	MAX_CONTEXT_LINES: 5,
} as const;

// Language and locale constants
export const LANGUAGE_CODES = {
	JAPANESE: "ja",
	ENGLISH: "en",
	MIXED: "mixed",
	UNKNOWN: "unknown",
	ALL: "all",
} as const;

// Export format constants
export const EXPORT_FORMATS = {
	JSON: "json",
	CSV: "csv",
	EXCEL: "excel",
	NDJSON: "ndjson",
} as const;

// Log level constants
export const LOG_LEVELS = {
	ERROR: "error",
	WARN: "warn",
	INFO: "info",
	DEBUG: "debug",
} as const;

// Scraper type constants
export const SCRAPER_TYPES = {
	BANDAI_HOBBY: "bandai-hobby",
	GUNDAM_INFO: "gundam-info",
	HOBBYLINK: "hobbylink",
} as const;

// Default directory paths
export const DIRECTORIES = {
	OUTPUT: "./output",
	CACHE: ".cache/gundam-scraper",
	LOGS: ".gundam-scraper/logs",
	CONFIG: "./config",
} as const;

// File patterns and extensions
export const FILE_PATTERNS = {
	JSON_EXTENSION: ".json",
	NDJSON_EXTENSION: ".ndjson",
	CSV_EXTENSION: ".csv",
	EXCEL_EXTENSION: ".xlsx",
	LOG_EXTENSION: ".log",
	CONFIG_EXTENSION: ".config.json",
} as const;

// Default string values
export const DEFAULT_VALUES = {
	UNKNOWN: "Unknown",
	UNKNOWN_SOURCE: "Unknown",
	UNKNOWN_BRAND: "unknown",
	UNKNOWN_STATUS: "unknown",
	EMPTY_STRING: "",
	ALL: "all",
	JA: "ja",
	EN: "en",
	MIXED: "mixed",
	IN_PROGRESS: "in_progress",
	COMPLETED: "completed",
	FAILED: "failed",
} as const;