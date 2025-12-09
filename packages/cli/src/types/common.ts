/**
 * Common types used across the CLI application
 */

/**
 * Generic context object for logging, error handling, and metadata
 * Represents a key-value store of contextual information
 */
export type Context = Record<string, unknown>;

/**
 * Metadata object for scrape progress and checkpoints
 */
export type Metadata = Record<string, unknown>;

/**
 * Generic key-value store for configuration or data
 */
export type KeyValueStore = Record<string, unknown>;

/**
 * Type guard to check if a value is a valid Context object
 */
export function isContext(value: unknown): value is Context {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a valid Metadata object
 */
export function isMetadata(value: unknown): value is Metadata {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}