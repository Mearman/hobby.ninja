/**
 * Common constants used across the utils package
 * Organized by category for better maintainability
 */

// =============================================================================
// TIMEOUT AND TIMING CONSTANTS
// =============================================================================

/** Default timeout for command execution in milliseconds (30 seconds) */
export const DEFAULT_COMMAND_TIMEOUT = 30_000;

/** Default timeout for network operations in milliseconds (5 seconds) */
export const DEFAULT_NETWORK_TIMEOUT = 5_000;

/** Minimum timeout in milliseconds */
export const MINIMUM_TIMEOUT = 1_000;

/** Cleanup interval for cache management in milliseconds (1 minute) */
export const CACHE_CLEANUP_INTERVAL = 60_000;

/** Profile analysis cache TTL in milliseconds (30 minutes) */
export const PROFILE_ANALYSIS_TTL = 1_800_000;

/** Default cache TTL in milliseconds (1 hour) */
export const DEFAULT_CACHE_TTL = 3_600_000;

/** Default update interval for profiles in hours */
export const DEFAULT_UPDATE_INTERVAL_HOURS = 24;

/** Update interval in milliseconds (24 hours) */
export const DEFAULT_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1_000;

// =============================================================================
// CACHE AND STORAGE CONSTANTS
// =============================================================================

/** Default maximum size for memory cache */
export const DEFAULT_CACHE_MAX_SIZE = 1_000;

/** Default maximum size for profile cache */
export const DEFAULT_PROFILE_CACHE_MAX_SIZE = 500;

/** Estimated memory usage per profile in bytes */
export const ESTIMATED_MEMORY_PER_PROFILE = 50_000;

/** Large content size threshold in bytes (1MB) */
export const LARGE_CONTENT_THRESHOLD = 1_000_000;

// =============================================================================
// THRESHOLD AND LIMIT CONSTANTS
// =============================================================================

/** Language detection confidence threshold */
export const LANGUAGE_DETECTION_THRESHOLD = 0.6;

/** Mixed language detection threshold */
export const MIXED_LANGUAGE_THRESHOLD = 0.4;

/** Language similarity threshold for mixed detection */
export const LANGUAGE_SIMILARITY_THRESHOLD = 0.2;

/** Minimum content ratio for evidence display */
export const MIN_CONTENT_RATIO_THRESHOLD = 0.01;

/** Profile confidence threshold for recommendations */
export const PROFILE_CONFIDENCE_THRESHOLD = 0.8;

/** Default profile confidence */
export const DEFAULT_PROFILE_CONFIDENCE = 0.9;

/** Base confidence for calculations */
export const BASE_CONFIDENCE = 0.5;

/** High confidence language detection ratio */
export const HIGH_CONFIDENCE_LANGUAGE_RATIO = 0.8;

/** Initial success rate estimate for new profiles */
export const INITIAL_SUCCESS_RATE_ESTIMATE = 0.95;

// =============================================================================
// SIZE AND COUNT CONSTANTS
// =============================================================================

/** Minimum HTML content length for static analysis */
export const MIN_HTML_CONTENT_LENGTH = 2_000;

/** Minimum text content length */
export const MIN_TEXT_CONTENT_LENGTH = 500;

/** Default retry count for operations */
export const DEFAULT_RETRY_COUNT = 3;

/** Maximum DOM complexity score */
export const MAX_DOM_COMPLEXITY = 1_000;

/** Default DOM complexity score when none is provided */
export const DEFAULT_DOM_COMPLEXITY = 50;

/** Empty div threshold for dynamic content detection */
export const EMPTY_DIV_THRESHOLD = 5;

/** Empty span threshold for dynamic content detection */
export const EMPTY_SPAN_THRESHOLD = 10;

/** Additional content estimate for dynamic analysis */
export const ADDITIONAL_CONTENT_ESTIMATE = 5_000;

/** Timer intervals for async operations */
export const TIMER_INTERVAL_10MS = 10;
export const TIMER_INTERVAL_20MS = 20;
export const TIMER_INTERVAL_30MS = 30;
export const TIMER_INTERVAL_100MS = 100;
export const TIMER_INTERVAL_150MS = 150;

/** Multiplier for timeout calculations */
export const TIMEOUT_MULTIPLIER = 2;

// =============================================================================
// CONFIDENCE INCREMENTS
// =============================================================================

/** Confidence increment for consistent analysis */
export const CONSISTENT_ANALYSIS_INCREMENT = 0.2;

/** Confidence increment for multiple samples */
export const MULTIPLE_SAMPLES_INCREMENT = 0.1;

/** Confidence increment for lang attribute detection */
export const LANG_ATTRIBUTE_INCREMENT = 0.2;

/** Confidence increment for framework detection */
export const FRAMEWORK_DETECTION_INCREMENT = 0.15;

/** Confidence increment for sufficient content */
export const SUFFICIENT_CONTENT_INCREMENT = 0.1;

/** Confidence increment for dynamic indicators */
export const DYNAMIC_INDICATORS_INCREMENT = 0.05;

// =============================================================================
// LOG LEVEL CONSTANTS
// =============================================================================

/** Log level numeric values for priority comparison */
export const LOG_LEVEL_VALUES = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
} as const;

// =============================================================================
// DOM AND CONTENT ANALYSIS CONSTANTS
// =============================================================================

/** Multiplier for nested divs in DOM complexity calculation */
export const NESTED_DIV_MULTIPLIER = 2;

/** Dynamic multiplier for content simulation */
export const DYNAMIC_MULTIPLIER_MIN = 1;
export const DYNAMIC_MULTIPLIER_RANGE = 2;

/** Percentage conversion factor */
export const PERCENTAGE_MULTIPLIER = 100;

/** Hour to millisecond conversion factor */
export const HOUR_TO_MS = 1_000 * 60 * 60;

/** Default attempt frequency in hours (for profile updates) */
export const DEFAULT_ATTEMPT_FREQUENCY_HOURS = 2;