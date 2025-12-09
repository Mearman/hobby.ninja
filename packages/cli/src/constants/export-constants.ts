/**
 * Constants for the CLI package
 */

// Export configuration
export const EXPORT_CONSTANTS = {
	// Processing and batching
	DEFAULT_BATCH_SIZE: 1000,
	MAX_MEMORY_USAGE_BYTES: 512 * 1024 * 1024, // 512MB

	// Preview and sampling
	DEFAULT_PREVIEW_RECORDS: 10,
	SIZE_ESTIMATION_SAMPLE_SIZE: 100,

	// Progress tracking
	PROGRESS_UPDATE_INTERVAL: 100,
	CSV_PROGRESS_UPDATE_INTERVAL: 100,

	// File size estimation
	CSV_NEWLINE_BYTES: 2,
	EXCEL_SIZE_MULTIPLIER: 1.5,
	CONSERVATIVE_BYTES_PER_RECORD: 200,
	EXCEL_OVERHEAD_BYTES: 50_000,
	DEFAULT_OVERHEAD_BYTES: 1000,

	// Format recommendations
	LARGE_DATASET_THRESHOLD: 10_000,
	EXCEL_RICH_DATA_THRESHOLD: 5000,
	CSV_ALTERNATIVE_THRESHOLD: 50_000,
	EXCEL_ALTERNATIVE_THRESHOLD: 1000,

	// Progress percentages for export stages
	PREPARING_PROGRESS: 0,
	EXPORTING_PROGRESS: 0.2,
	FINALIZING_PROGRESS: 0.9,
	COMPLETE_PROGRESS: 1,

	// Column widths for Excel export
	COLUMN_WIDTHS: {
		DEFAULT: 15,
		NAME: 30,
		JAPANESE_NAME: 30,
		ENGLISH_NAME: 30,
		BRAND: 20,
		SERIES: 25,
		CATEGORY: 20,
		PRICE: 15,
		CURRENCY: 10,
		RELEASE_DATE: 15,
		SCALE: 15,
		GRADE: 15,
		LANGUAGE: 12,
		SOURCE: 20,
		SCRAPED_AT: 20,
		URL: 50,
		METRIC: 25,
		VALUE: 20,
	},

	// String processing
	HASH_SUBSTRING_LENGTH: 16,

	// Top brands to display in summary
	TOP_BRANDS_COUNT: 10,
} as const;

// Encoding constants
export const ENCODING_CONSTANTS = {
	SUPPORTED_ENCODINGS: ["utf-8", "shift-jis"] as const,
	DEFAULT_ENCODING: "utf-8" as const,
} as const;

// Format constants
export const FORMAT_CONSTANTS = {
	SUPPORTED_FORMATS: ["json", "csv", "excel", "ndjson"] as const,
	DEFAULT_FORMAT: "json" as const,
} as const;

// File extension constants
export const FILE_EXTENSION_CONSTANTS = {
	JSON: ".json",
	NDJSON: ".ndjson",
	JSONL: ".jsonl",
	CSV: ".csv",
	EXCEL: ".xlsx",
} as const;

// Memory units for conversion
export const MEMORY_UNITS = {
	BYTES_PER_KILOBYTE: 1024,
	UNIT_NAMES: ["Bytes", "KB", "MB", "GB", "TB"] as const,
} as const;

// Special key prefixes for data processing
export const DATA_PROCESSING_CONSTANTS = {
	SPECIFICATION_KEY_PREFIX: "spec_",
	SPECIFICATION_KEY_PREFIX_LENGTH: 5,
} as const;