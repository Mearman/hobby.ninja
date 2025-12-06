/**
 * Hashing and key generation utilities for translation store.
 *
 * This module provides pure functions for:
 * - SHA-256 hashing of original text content
 * - Base64 encoding for hash representation
 * - Key generation in "source:target:base64hash" format
 * - Hash validation for data integrity
 * - Key component extraction and validation
 *
 * Uses Node.js built-in crypto module for SHA-256 hashing.
 *
 * @since 1.0.0
 */

import { createHash } from "node:crypto";
import { SupportedLanguage } from "../types";

/**
 * Error thrown when hashing operations fail
 */
export class HashingError extends Error {
	public override readonly cause?: Error;
	constructor(message: string, cause?: Error) {
		super(message);
		this.name = "HashingError";
		this.cause = cause;
	}
}

/**
 * Configuration options for hashing operations
 */
export interface HashingOptions {
	/**
	 * The hash algorithm to use (currently only SHA-256 is supported)
	 * @default 'sha256'
	 */
	readonly algorithm?: 'sha256';

	/**
	 * The output encoding format
	 * @default 'base64'
	 */
	readonly encoding?: 'base64' | 'hex';
}

/**
 * Components extracted from a translation key
 */
export interface KeyComponents {
	/**
	 * Source language code
	 */
	readonly sourceLang: SupportedLanguage;

	/**
	 * Target language code
	 */
	readonly targetLang: SupportedLanguage;

	/**
	 * Base64-encoded SHA-256 hash of original text
	 */
	readonly hash: string;
}

/**
 * Default hashing configuration
 */
const DEFAULT_OPTIONS: Required<HashingOptions> = {
	algorithm: 'sha256',
	encoding: 'hex',
} as const;

/**
 * Key format separator
 */
const KEY_SEPARATOR = ':';

/**
 * Regular expression for validating key format
 * Matches: sourceLang:targetLang:hexhash
 * Uses hex encoding (0-9a-f) for filesystem compatibility
 */
const KEY_FORMAT_REGEX = /^([a-z]{2}(_[a-z]{2})?):([a-z]{2}(_[a-z]{2})?):([a-f0-9]+)$/;

/**
 * Regular expression for validating hex strings
 */
const HEX_REGEX = /^[a-f0-9]+$/;

/**
 * Generates a SHA-256 hash of the provided text and returns it as a hex encoded string.
 *
 * This function is pure and deterministic - the same input will always produce the same hash.
 * Uses Node.js built-in crypto module for consistent, cross-platform results.
 *
 * @param text - The text to hash. Empty strings and null/undefined are handled gracefully.
 * @param options - Optional configuration for hashing operations
 * @returns Hex-encoded SHA-256 hash of the input text
 *
 * @throws {HashingError} When hashing operation fails due to invalid input or crypto errors
 *
 * @example
 * ```typescript
 * const hash = generateTextHash("Hello world");
 * console.log(hash); // "64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c"
 * ```
 */
export function generateTextHash(text: string, options: HashingOptions = {}): string {
	const config = { ...DEFAULT_OPTIONS, ...options };

	try {
		// Input validation
		if (typeof text !== 'string') {
			throw new HashingError('Input text must be a string');
		}

		// Generate SHA-256 hash
		const hash = createHash(config.algorithm)
			.update(text, 'utf8')
			.digest(config.encoding);

		return hash;
	} catch (error) {
		if (error instanceof HashingError) {
			throw error;
		}
		throw new HashingError('Failed to generate text hash', error as Error);
	}
}

/**
 * Generates a unique translation key in the format "source:target:base64hash".
 *
 * The key combines source language, target language, and content hash to create
 * a unique identifier for translation caching and lookup.
 *
 * @param sourceLang - Source language code (e.g., 'en', 'ja')
 * @param targetLang - Target language code (e.g., 'ja', 'en')
 * @param originalText - The original text to be translated
 * @param options - Optional hashing configuration
 * @returns Translation key in format "source:target:base64hash"
 *
 * @throws {HashingError} When parameters are invalid or hashing fails
 *
 * @example
 * ```typescript
 * const key = generateKey('en', 'ja', 'Hello world');
 * console.log(key); // "en:ja:SGVsbG8gd29ybGQ="
 * ```
 */
export function generateKey(
	sourceLang: SupportedLanguage,
	targetLang: SupportedLanguage,
	originalText: string,
	options: HashingOptions = {}
): string {
	try {
		// Input validation
		if (!sourceLang || typeof sourceLang !== 'string') {
			throw new HashingError('Source language must be a non-empty string');
		}

		if (!targetLang || typeof targetLang !== 'string') {
			throw new HashingError('Target language must be a non-empty string');
		}

		if (typeof originalText !== 'string') {
			throw new HashingError('Original text must be a string');
		}

		// Generate content hash
		const contentHash = generateTextHash(originalText, options);

		// Combine components into key
		return [sourceLang, targetLang, contentHash].join(KEY_SEPARATOR);
	} catch (error) {
		if (error instanceof HashingError) {
			throw error;
		}
		throw new HashingError('Failed to generate translation key', error as Error);
	}
}

/**
 * Validates the format and structure of a translation key.
 *
 * Checks that the key follows the "source:target:hash" format with valid
 * language codes and Base64-encoded hash.
 *
 * @param key - The translation key to validate
 * @returns true if the key format is valid, false otherwise
 *
 * @example
 * ```typescript
 * validateKey('en:ja:SGVsbG8gd29ybGQ='); // true
 * validateKey('invalid-key'); // false
 * ```
 */
export function validateKey(key: string): boolean {
	if (typeof key !== 'string' || !key.trim()) {
		return false;
	}

	const match = KEY_FORMAT_REGEX.exec(key);
	if (!match) {
		return false;
	}

	// Validate Base64 hash component
	const hashComponent = match[5];
	return HEX_REGEX.test(hashComponent);
}

/**
 * Extracts the components (source language, target language, hash) from a translation key.
 *
 * This function validates the key format before extracting components.
 *
 * @param key - The translation key to parse
 * @returns Object containing sourceLang, targetLang, and hash
 *
 * @throws {HashingError} When key format is invalid or parsing fails
 *
 * @example
 * ```typescript
 * const components = extractKeyComponents('en:ja:SGVsbG8gd29ybGQ=');
 * console.log(components); // { sourceLang: 'en', targetLang: 'ja', hash: 'SGVsbG8gd29ybGQ=' }
 * ```
 */
export function extractKeyComponents(key: string): KeyComponents {
	if (typeof key !== 'string' || !key.trim()) {
		throw new HashingError('Key must be a non-empty string');
	}

	const match = KEY_FORMAT_REGEX.exec(key);
	if (!match) {
		throw new HashingError(`Invalid key format: ${key}. Expected format: source:target:base64hash`);
	}

	const [, sourceLang, , targetLang, , hash] = match;

	// Additional validation of hash component
	if (!HEX_REGEX.test(hash)) {
		throw new HashingError(`Invalid Base64 hash component in key: ${key}`);
	}

	return {
		sourceLang: sourceLang as SupportedLanguage,
		targetLang: targetLang as SupportedLanguage,
		hash,
	};
}

/**
 * Verifies that the provided text matches the expected hash.
 *
 * This is useful for data integrity verification and cache validation.
 *
 * @param text - The text to verify
 * @param expectedHash - The expected Base64-encoded SHA-256 hash
 * @param options - Optional hashing configuration
 * @returns true if the text produces the expected hash, false otherwise
 *
 * @example
 * ```typescript
 * const isMatch = validateHash('Hello world', 'SGVsbG8gd29ybGQ=');
 * console.log(isMatch); // true or false
 * ```
 */
export function validateHash(
	text: string,
	expectedHash: string,
	options: HashingOptions = {}
): boolean {
	try {
		if (typeof text !== 'string') {
			return false;
		}

		if (typeof expectedHash !== 'string' || !expectedHash.trim()) {
			return false;
		}

		// Validate Base64 format of expected hash
		const config = { ...DEFAULT_OPTIONS, ...options };
		if (config.encoding === 'base64' && !HEX_REGEX.test(expectedHash)) {
			return false;
		}

		// Generate hash of the text and compare
		const actualHash = generateTextHash(text, options);
		return actualHash === expectedHash;
	} catch (error) {
		// Any error during validation means the hash doesn't match
		return false;
	}
}

/**
 * Normalizes language codes to ensure consistent format.
 *
 * Converts language codes to lowercase and validates they're supported.
 *
 * @param lang - The language code to normalize
 * @returns Normalized language code
 *
 * @throws {HashingError} When language code is invalid or unsupported
 */
export function normalizeLanguageCode(lang: string): SupportedLanguage {
	if (typeof lang !== 'string' || !lang.trim()) {
		throw new HashingError('Language code must be a non-empty string');
	}

	const normalized = lang.toLowerCase().trim();

	// Basic validation for common language code patterns
	if (!/^[a-z]{2}(_[a-z]{2})?$/.test(normalized)) {
		throw new HashingError(`Invalid language code format: ${lang}. Expected format: 'en' or 'en_us'`);
	}

	return normalized as SupportedLanguage;
}

/**
 * Checks if two keys are equivalent (same languages and content hash).
 *
 * This function is useful for cache key comparison and deduplication.
 *
 * @param key1 - First translation key
 * @param key2 - Second translation key
 * @returns true if keys are equivalent, false otherwise
 */
export function areKeysEquivalent(key1: string, key2: string): boolean {
	try {
		// Quick string comparison first
		if (key1 === key2) {
			return true;
		}

		// Validate both keys
		if (!validateKey(key1) || !validateKey(key2)) {
			return false;
		}

		// Extract and compare components
		const components1 = extractKeyComponents(key1);
		const components2 = extractKeyComponents(key2);

		return (
			components1.sourceLang === components2.sourceLang &&
			components1.targetLang === components2.targetLang &&
			components1.hash === components2.hash
		);
	} catch (error) {
		// Any error during comparison means keys are not equivalent
		return false;
	}
}

/**
 * Generates a hash for batch operations (multiple texts combined).
 *
 * Useful for creating cache keys for batch translations or for
 * identifying sets of translations that belong together.
 *
 * @param texts - Array of texts to hash together
 * @param options - Optional hashing configuration
 * @returns Base64-encoded SHA-256 hash of all texts combined
 *
 * @throws {HashingError} When texts array is invalid or hashing fails
 */
export function generateBatchHash(texts: readonly string[], options: HashingOptions = {}): string {
	if (!Array.isArray(texts)) {
		throw new HashingError('Texts must be an array');
	}

	if (texts.length === 0) {
		throw new HashingError('Texts array cannot be empty');
	}

	// Validate all texts are strings
	for (let i = 0; i < texts.length; i++) {
		const text = texts[i];
		if (typeof text !== 'string') {
			throw new HashingError(`Text at index ${i} must be a string`);
		}
	}

	// Combine all texts with a delimiter that won't appear in normal text
	const delimiter = '\x00'; // Null byte as delimiter
	const combinedText = texts.join(delimiter);

	return generateTextHash(combinedText, options);
}

// Export constants for testing and external use
export { KEY_SEPARATOR, KEY_FORMAT_REGEX, HEX_REGEX };