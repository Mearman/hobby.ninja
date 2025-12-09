/**
 * Constants for the CLI package
 */

// CLI command strings
export const CLI_COMMANDS = {
	SCRAPE: "scrape",
	SCRAPE_URL: "scrape-url",
	SCRAPE_SINGLE: "scrape-single",
	PROFILE: "profile",
	PROFILE_LIST: "list",
	PROFILE_ADD: "add",
	PROFILE_REMOVE: "remove",
	PROFILE_SET_DEFAULT: "set-default",
	VALIDATE: "validate",
	HELP: "help",
	VERSION: "version",
} as const;

// CLI option strings
export const CLI_OPTIONS = {
	HELP: "-h, --help",
	VERSION: "-V, --version",
	VERBOSE: "--verbose",
	QUIET: "--quiet",
	PROFILE: "--profile",
	URL: "--url",
	OUTPUT: "--output",
	MAX_RETRIES: "--max-retries",
	DELAY: "--delay",
	CONCURRENT: "--concurrent",
	TIMEOUT: "--timeout",
	HEADLESS: "--headless",
	NO_HEADLESS: "--no-headless",
} as const;

// Message strings
export const MESSAGES = {
	NO_PROFILE_FOUND: "No profile found with name",
	DEFAULT_PROFILE_SET: "Default profile set to",
	PROFILE_REMOVED: "Profile removed successfully",
	UNKNOWN_COMMAND: "Unknown command",
	SCRAPING_STARTED: "Starting scraping",
	SCRAPING_COMPLETED: "Scraping completed",
	PROCESSING_URL: "Processing URL",
	ERROR_OCCURRED: "An error occurred",
	VALIDATION_PASSED: "Validation passed",
	VALIDATION_FAILED: "Validation failed",
	VERBOSE_OUTPUT: "Verbose output",
} as const;

// File and directory strings
export const FILES = {
	CACHE_DIR: ".cache",
	OUTPUT_DIR: "output",
	CONFIG_FILE: "config.json",
	PROFILES_DIR: "profiles",
	TEMP_DIR: "temp",
} as const;

// HTTP and network constants
export const NETWORK = {
	DEFAULT_TIMEOUT: 30_000,
	DEFAULT_MAX_RETRIES: 3,
	DEFAULT_DELAY: 1000,
	DEFAULT_CONCURRENT: 5,
	MIN_DELAY: 100,
	MAX_DELAY: 10_000,
	RETRY_BACKOFF_FACTOR: 2,
	HTTP_OK: 200,
	HTTP_NOT_FOUND: 404,
	HTTP_TOO_MANY_REQUESTS: 429,
	HTTP_INTERNAL_SERVER_ERROR: 500,
} as const;

// Time constants in milliseconds
export const TIME = {
	SECOND: 1000,
	MINUTE: 60 * 1000,
	HOUR: 60 * 60 * 1000,
	DAY: 24 * 60 * 60 * 1000,
	WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// Rate limiting constants
export const RATE_LIMITING = {
	MAX_REQUESTS_PER_MINUTE: 60,
	MAX_REQUESTS_PER_HOUR: 1000,
	RATE_LIMIT_WINDOW_MS: 60 * 1000,
	BURST_LIMIT: 10,
} as const;

// Content detection thresholds
export const CONTENT_DETECTION = {
	MIN_CONTENT_LENGTH: 100,
	DYNAMIC_CONTENT_TIMEOUT: 5000,
	ELEMENT_WAIT_TIMEOUT: 2000,
	SCROLL_PAUSE_TIME: 500,
	SIMULATION_DELAY: 500,
	MIN_LOAD_TIME: 1000,
	MAX_LOAD_TIME: 10_000,
	CONTENT_SIMILARITY_THRESHOLD: 0.8,
	MIN_UNIQUE_ELEMENTS: 10,
	MIN_TEXT_CONTENT_LENGTH: 500,
} as const;

// Rendering detection constants
export const RENDERING_DETECTION = {
	CONTENT_SIMILARITY_THRESHOLD: 0.2,
	STRUCTURE_SIMILARITY_THRESHOLD: 0.15,
	INTERACTION_THRESHOLD: 0.1,
	LAZY_LOAD_THRESHOLD: 0.05,
	MIN_UNIQUE_SELECTORS: 5,
	MAX_UNIQUE_SELECTORS: 10,
	WAIT_TIMEOUT: 2000,
	SIMULATION_TIMEOUT: 5000,
	RETRY_DELAY: 500,
	MAX_RETRIES: 3,
} as const;

// Cache constants
export const CACHE = {
	DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hours
	MAX_CACHE_SIZE: 1000,
	CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
	CACHE_KEY_SEPARATOR: ":",
} as const;

// Browser constants
export const BROWSER = {
	DEFAULT_VIEWPORT_WIDTH: 1920,
	DEFAULT_VIEWPORT_HEIGHT: 1080,
	USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
	DEFAULT_TIMEOUT: 30_000,
	NAVIGATION_TIMEOUT: 60_000,
} as const;

// Validation constants
export const VALIDATION = {
	MAX_URL_LENGTH: 2048,
	MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
	MAX_DEPTH: 10,
	MIN_DEPTH: 1,
} as const;

// Progress reporting constants
export const PROGRESS = {
	UPDATE_INTERVAL: 1000,
	SPINNER_FRAMES: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
	DEFAULT_BAR_WIDTH: 40,
} as const;

// Log levels
export const LOG_LEVELS = {
	ERROR: 0,
	WARN: 1,
	INFO: 2,
	DEBUG: 3,
	TRACE: 4,
} as const;