/**
 * Factory functions and utilities for TranslationStore setup and management
 */

import { TranslationStore, type StoreConfiguration, TranslationStoreError } from './translation-store';
import { JSONStorage } from './json-storage';

/**
 * Default configuration for TranslationStore
 */
export const DEFAULT_STORE_CONFIG: StoreConfiguration = {
	// Storage settings
	storagePath: './translations',
	maxEntries: 10000,
	maxSizeBytes: 100 * 1024 * 1024, // 100MB
	compressionThreshold: 1024, // 1KB

	// Performance settings
	memoryCacheSize: 1000,
	syncInterval: 60000, // 1 minute
	lockTimeout: 5000, // 5 seconds

	// Behavior settings
	defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
	enableCompression: true,
	enableMetrics: true,
};

/**
 * Create a TranslationStore with sensible defaults and error handling
 *
 * @param config - Optional configuration overrides
 * @returns Promise resolving to initialized TranslationStore
 * @throws {TranslationStoreError} If initialization fails
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const store = await createTranslationStore();
 *
 * // Custom configuration
 * const store = await createTranslationStore({
 *   storagePath: './my-translations',
 *   maxEntries: 5000,
 *   defaultTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
 * });
 * ```
 */
export async function createTranslationStore(
	config?: Partial<StoreConfiguration>,
): Promise<TranslationStore> {
	try {
		// Merge with defaults
		const finalConfig: StoreConfiguration = {
			...DEFAULT_STORE_CONFIG,
			...config,
		};

		// Create store instance
		const store = new TranslationStore(finalConfig);

		// Initialize the store
		await store.initialize();

		return store;
	} catch (error) {
		if (error instanceof TranslationStoreError) {
			throw error;
		}

		throw new TranslationStoreError(
			'FACTORY_INIT_FAILED',
			'Failed to create and initialize TranslationStore',
			error
		);
	}
}

/**
 * Create a TranslationStore with configuration optimized for server environments
 *
 * @param storagePath - Directory path for storing translations
 * @param config - Optional additional configuration overrides
 * @returns Promise resolving to initialized TranslationStore
 *
 * @example
 * ```typescript
 * const store = await createServerTranslationStore('/var/cache/translations');
 * ```
 */
export async function createServerTranslationStore(
	storagePath: string,
	config?: Partial<StoreConfiguration>,
): Promise<TranslationStore> {
	return createTranslationStore({
		...config,
		storagePath,
		maxEntries: 50000, // Larger for server use
		maxSizeBytes: 1024 * 1024 * 1024, // 1GB
		memoryCacheSize: 5000, // Larger memory cache
		defaultTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
		enableCompression: true,
		enableMetrics: true,
	});
}

/**
 * Create a TranslationStore with configuration optimized for client-side/browser environments
 *
 * @param storagePath - Directory path for storing translations (defaults to './translations')
 * @param config - Optional additional configuration overrides
 * @returns Promise resolving to initialized TranslationStore
 *
 * @example
 * ```typescript
 * const store = await createBrowserTranslationStore('./user-translations');
 * ```
 */
export async function createBrowserTranslationStore(
	storagePath = './translations',
	config?: Partial<StoreConfiguration>,
): Promise<TranslationStore> {
	return createTranslationStore({
		...config,
		storagePath,
		maxEntries: 1000, // Smaller for client use
		maxSizeBytes: 10 * 1024 * 1024, // 10MB
		memoryCacheSize: 100, // Smaller memory cache
		compressionThreshold: 512, // Compress smaller files
		defaultTTL: 24 * 60 * 60 * 1000, // 1 day
		enableCompression: true,
		enableMetrics: false, // Disable metrics to reduce overhead
	});
}

/**
 * Create a TranslationStore with minimal configuration for testing/development
 *
 * @param storagePath - Directory path for storing translations (optional)
 * @returns Promise resolving to initialized TranslationStore
 *
 * @example
 * ```typescript
 * const store = await createTestTranslationStore('./test-data');
 * ```
 */
export async function createTestTranslationStore(
	storagePath?: string,
): Promise<TranslationStore> {
	return createTranslationStore({
		storagePath: storagePath || './test-translations',
		maxEntries: 100,
		maxSizeBytes: 1024 * 1024, // 1MB
		memoryCacheSize: 10,
		compressionThreshold: 2048, // Don't compress small files in tests
		defaultTTL: 60 * 60 * 1000, // 1 hour
		enableCompression: false, // Disable for simplicity in tests
		enableMetrics: false, // Disable for simplicity in tests
	});
}

/**
 * Validate a store configuration
 *
 * @param config - Configuration to validate
 * @returns true if configuration is valid
 * @throws {TranslationStoreError} If configuration is invalid
 */
export function validateStoreConfig(config: Partial<StoreConfiguration>): boolean {
	try {
		// Check storage path
		if (config.storagePath !== undefined) {
			if (!config.storagePath || typeof config.storagePath !== 'string' || config.storagePath.trim().length === 0) {
				throw new TranslationStoreError(
					'INVALID_CONFIG',
					'storagePath must be a non-empty string'
				);
			}
		}

		// Check numeric values
		if (config.maxEntries !== undefined && config.maxEntries <= 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'maxEntries must be positive'
			);
		}

		if (config.maxSizeBytes !== undefined && config.maxSizeBytes <= 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'maxSizeBytes must be positive'
			);
		}

		if (config.memoryCacheSize !== undefined && config.memoryCacheSize < 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'memoryCacheSize cannot be negative'
			);
		}

		if (config.defaultTTL !== undefined && config.defaultTTL < 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'defaultTTL cannot be negative'
			);
		}

		if (config.syncInterval !== undefined && config.syncInterval <= 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'syncInterval must be positive'
			);
		}

		if (config.lockTimeout !== undefined && config.lockTimeout <= 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'lockTimeout must be positive'
			);
		}

		if (config.compressionThreshold !== undefined && config.compressionThreshold < 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'compressionThreshold cannot be negative'
			);
		}

		return true;
	} catch (error) {
		if (error instanceof TranslationStoreError) {
			throw error;
		}

		throw new TranslationStoreError(
			'VALIDATION_FAILED',
			'Configuration validation failed',
			error
		);
	}
}

/**
 * Utility function to create a store configuration object
 *
 * @param overrides - Configuration overrides
 * @returns Complete store configuration
 */
export function createStoreConfig(
	overrides: Partial<StoreConfiguration>,
): StoreConfiguration {
	const config = { ...DEFAULT_STORE_CONFIG, ...overrides };

	// Validate the final configuration
	validateStoreConfig(config);

	return config;
}

/**
 * Default factory exports
 */
export {
	DEFAULT_STORE_CONFIG as defaultConfig,
};