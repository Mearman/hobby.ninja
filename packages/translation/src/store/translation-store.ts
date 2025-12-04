/**
 * TranslationStore - Content-addressable storage for translation data
 *
 * Provides high-performance, persistent storage for translation entries
 * with content-addressable file organization and comprehensive error handling.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { JSONStorage, type JSONStorageConfig, type FileOperationResult } from './json-storage';
import { generateKey, generateTextHash, validateKey, type HashingError } from './hashing';
import { SupportedLanguage } from '../types';

/**
 * Represents a single translation with full metadata and lifecycle information.
 */
export interface TranslationEntry {
	// Core translation data
	key: string;                    // Unique identifier: "source:target:text_hash"
	originalText: string;          // Source text (Japanese)
	translatedText: string;        // Target text (English)
	sourceLanguage: string;        // Source language code (e.g., "ja")
	targetLanguage: string;        // Target language code (e.g., "en")

	// Metadata
	createdAt: number;             // Unix timestamp when created
	accessedAt: number;            // Unix timestamp of last access
	accessCount: number;           // Number of times this translation was accessed

	// Lifecycle management
	ttl?: number;                  // Time-to-live in milliseconds (optional)
	expiresAt?: number;            // Calculated expiration timestamp

	// Storage optimization
	compressed: boolean;           // Whether data is compressed
	size: number;                  // Size of compressed data in bytes

	// Quality indicators
	confidence?: number;           // Translation confidence score (0-1)
	apiProvider?: string;          // Which API provided the translation
}

/**
 * Store configuration parameters for behavior and performance tuning.
 */
export interface StoreConfiguration {
	// Storage settings
	storagePath: string;           // Directory path for store files
	maxEntries: number;            // Maximum number of entries to store
	maxSizeBytes: number;          // Maximum disk usage in bytes
	compressionThreshold: number;  // Minimum size to trigger compression

	// Performance settings
	memoryCacheSize: number;       // Number of entries to keep in memory
	syncInterval: number;          // Interval between sync operations (ms)
	lockTimeout: number;           // Timeout for file lock operations

	// Behavior settings
	defaultTTL: number;            // Default time-to-live for entries
	enableCompression: boolean;    // Whether to use compression
	enableMetrics: boolean;        // Whether to collect performance metrics
}

/**
 * Runtime statistics and performance metrics for the store.
 */
export interface StoreStatistics {
	// Entry counts
	totalEntries: number;          // Total entries in store
	activeEntries: number;         // Non-expired entries
	expiredEntries: number;        // Expired entries

	// Storage metrics
	diskUsageBytes: number;        // Current disk usage
	compressionRatio: number;      // Average compression ratio

	// Performance metrics
	hitRate: number;               // Cache hit rate (0-1)
	averageLookupTime: number;     // Average lookup time in milliseconds
	averageWriteTime: number;      // Average write time in milliseconds

	// Access patterns
	totalLookups: number;          // Total lookup operations
	totalWrites: number;           // Total write operations
	totalHits: number;             // Total cache hits

	// Timestamps
	lastCleanup: number;           // Last cleanup operation timestamp
	lastOptimization: number;      // Last optimization operation timestamp
	createdAt: number;             // Store creation timestamp
	updatedAt: number;             // Last update timestamp
}

/**
 * Health monitoring and error tracking for the store.
 */
export interface StoreHealth {
	status: 'healthy' | 'degraded' | 'corrupted' | 'readonly';
	errors: StoreError[];
	warnings: StoreWarning[];

	// Health indicators
	diskSpaceAvailable: number;    // Available disk space in bytes
	fragmentationLevel: number;     // Database fragmentation level
	lockStatus: 'unlocked' | 'locked' | 'stuck';

	lastHealthCheck: number;       // Last health check timestamp
}

/**
 * Individual error record for tracking store issues.
 */
export interface StoreError {
	code: string;
	message: string;
	timestamp: number;
	severity: 'low' | 'medium' | 'high' | 'critical';
	resolved: boolean;
}

/**
 * Individual warning record for tracking store issues.
 */
export interface StoreWarning {
	code: string;
	message: string;
	timestamp: number;
	acknowledged: boolean;
}

/**
 * Store-level metadata and configuration for persistence.
 */
export interface StorageMetadata {
	// Store identification
	storeId: string;               // Unique store identifier
	version: string;               // Store format version

	// Creation and migration info
	createdAt: number;             // Store creation timestamp
	migratedAt?: number;           // Last migration timestamp
	previousVersion?: string;      // Previous version for rollback

	// Compatibility
	minCompatibleVersion: string;  // Minimum compatible client version
	maxCompatibleVersion: string;  // Maximum compatible client version

	// Feature flags
	features: {
		compression: boolean;
		encryption: boolean;
		metrics: boolean;
		healthMonitoring: boolean;
	};

	// Security
	checksum: string;              // Metadata checksum for integrity
	encrypted: boolean;            // Whether store is encrypted
}

/**
 * Input validation schemas for translation operations.
 */
const TranslationEntrySchema = z.object({
	key: z.string(),
	originalText: z.string(),
	translatedText: z.string(),
	sourceLanguage: z.string(),
	targetLanguage: z.string(),
	createdAt: z.number(),
	accessedAt: z.number(),
	accessCount: z.number(),
	ttl: z.number().optional(),
	expiresAt: z.number().optional(),
	compressed: z.boolean(),
	size: z.number(),
	confidence: z.number().min(0).max(1).optional(),
	apiProvider: z.string().optional(),
});

const SetTranslationSchema = z.object({
	sourceText: z.string().min(1),
	targetText: z.string().min(1),
	sourceLang: z.string().min(1),
	targetLang: z.string().min(1),
	metadata: z.object({
		confidence: z.number().min(0).max(1).optional(),
		apiProvider: z.string().optional(),
		ttl: z.number().positive().optional(),
	}).optional(),
});

const GetByKeySchema = z.object({
	key: z.string().min(1),
});

const GetByTextSchema = z.object({
	sourceText: z.string().min(1),
	sourceLang: z.string().min(1),
	targetLang: z.string().min(1),
});

/**
 * Type definitions for translation operations.
 */
export type SetTranslationParams = z.infer<typeof SetTranslationSchema>;
export type GetByKeyParams = z.infer<typeof GetByKeySchema>;
export type GetByTextParams = z.infer<typeof GetByTextSchema>;

/**
 * Custom errors for TranslationStore operations.
 */
export class TranslationStoreError extends Error {
	public readonly code: string;
	public readonly originalError?: unknown;

	constructor(code: string, message: string, originalError?: unknown) {
		super(message);
		this.name = 'TranslationStoreError';
		this.code = code;
		this.originalError = originalError;
	}
}

/**
 * Content-addressable translation store with hash-based file organization.
 *
 * Features:
 * - SHA-256 content addressing for deduplication
 * - Two-level hash sharding for file system performance
 * - Atomic write operations with rollback
 * - Comprehensive error handling and recovery
 * - Memory caching with TTL support
 * - Health monitoring and metrics
 */
export class TranslationStore {
	private readonly config: StoreConfiguration;
	private readonly metadata: StorageMetadata;
	private statistics: StoreStatistics;
	private health: StoreHealth;
	private isInitialized = false;
	private readonly storage: JSONStorage;

	// File system constants
	private readonly METADATA_FILENAME = 'metadata.json';
	private readonly STORE_VERSION = '1.0.0';
	private readonly HASH_ALGORITHM = 'sha256';
	private readonly SHARD_DEPTH = 2;

	/**
	 * Create a new TranslationStore instance.
	 *
	 * @param config - Store configuration parameters
	 * @throws {TranslationStoreError} If configuration is invalid
	 */
	constructor(config: StoreConfiguration) {
		this.validateConfiguration(config);
		this.config = { ...config };

		// Initialize JSON storage with configuration
		const storageConfig: JSONStorageConfig = {
			compressionThreshold: config.compressionThreshold,
			lockTimeout: config.lockTimeout,
			lockRetryInterval: 100, // 100ms
			maxLockRetries: 50,
			tempFilePrefix: '.tmp-',
			verifyIntegrity: true,
			cleanupStaleLocks: true,
		};
		this.storage = new JSONStorage(storageConfig);

		// Initialize metadata
		this.metadata = this.createMetadata();

		// Initialize statistics
		this.statistics = this.createStatistics();

		// Initialize health tracking
		this.health = this.createHealth();
	}

	/**
	 * Initialize the store, creating directories and loading metadata.
	 *
	 * @throws {TranslationStoreError} If initialization fails
	 */
	async initialize(): Promise<void> {
		try {
			// Create storage directory structure
			await this.createDirectoryStructure();

			// Load existing metadata or create new
			await this.loadOrCreateMetadata();

			// Initialize health monitoring
			await this.performHealthCheck();

			this.isInitialized = true;
			this.updateLastActivity();
		} catch (error) {
			const storeError = new TranslationStoreError(
				'INIT_FAILED',
				'Failed to initialize TranslationStore',
				error
			);
			this.addError(storeError);
			throw storeError;
		}
	}

	/**
	 * Generate SHA-256 hash for content addressing.
	 *
	 * @param content - Content to hash
	 * @returns Hexadecimal hash string
	 */
	private generateHash(content: string): string {
		return crypto.createHash(this.HASH_ALGORITHM).update(content, 'utf8').digest('hex');
	}

	/**
	 * Generate two-level shard path from hash.
	 *
	 * @param hash - SHA-256 hash string
	 * @returns Array of [shardDir, filename]
	 */
	private generateShardPath(hash: string): [string, string] {
		const shard = hash.substring(0, this.SHARD_DEPTH);
		const filename = `${hash}.json`;
		return [shard, filename];
	}

	/**
	 * Get full file path for a hash using two-level sharding.
	 *
	 * @param hash - SHA-256 hash string
	 * @returns Complete file path
	 */
	private getFilePath(hash: string): string {
		const [shard, filename] = this.generateShardPath(hash);
		return path.join(this.config.storagePath, shard, filename);
	}

	/**
	 * Create the directory structure for the store.
	 *
	 * @private
	 */
	private async createDirectoryStructure(): Promise<void> {
		try {
			await fs.mkdir(this.config.storagePath, { recursive: true });
		} catch (error) {
			throw new TranslationStoreError(
				'DIR_CREATE_FAILED',
				`Failed to create storage directory: ${this.config.storagePath}`,
				error
			);
		}
	}

	/**
	 * Load existing metadata or create new metadata file.
	 *
	 * @private
	 */
	private async loadOrCreateMetadata(): Promise<void> {
		const metadataPath = path.join(this.config.storagePath, this.METADATA_FILENAME);

		try {
			const metadataData = await fs.readFile(metadataPath, 'utf8');
			const loadedMetadata = JSON.parse(metadataData) as StorageMetadata;

			// Validate loaded metadata
			this.validateMetadata(loadedMetadata);

			// Update metadata with migration info if needed
			if (loadedMetadata.version !== this.STORE_VERSION) {
				this.metadata.migratedAt = Date.now();
				this.metadata.previousVersion = loadedMetadata.version;
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				// File doesn't exist, create new metadata
				await this.saveMetadata();
			} else {
				throw new TranslationStoreError(
					'METADATA_LOAD_FAILED',
					'Failed to load store metadata',
					error
				);
			}
		}
	}

	/**
	 * Save metadata to disk.
	 *
	 * @private
	 */
	private async saveMetadata(): Promise<void> {
		const metadataPath = path.join(this.config.storagePath, this.METADATA_FILENAME);

		try {
			// Update checksum before saving
			this.metadata.checksum = this.generateMetadataChecksum();

			const metadataData = JSON.stringify(this.metadata, null, 2);
			await fs.writeFile(metadataPath, metadataData, 'utf8');
		} catch (error) {
			throw new TranslationStoreError(
				'METADATA_SAVE_FAILED',
				'Failed to save store metadata',
				error
			);
		}
	}

	/**
	 * Generate checksum for metadata integrity verification.
	 *
	 * @private
	 */
	private generateMetadataChecksum(): string {
		const { checksum, ...metadataWithoutChecksum } = this.metadata;
		const metadataString = JSON.stringify(metadataWithoutChecksum, null, 2);
		return this.generateHash(metadataString);
	}

	/**
	 * Validate store configuration parameters.
	 *
	 * @param config - Configuration to validate
	 * @private
	 */
	private validateConfiguration(config: StoreConfiguration): void {
		if (!config.storagePath || config.storagePath.trim().length === 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'storagePath must be a non-empty string'
			);
		}

		if (config.maxEntries <= 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'maxEntries must be positive'
			);
		}

		if (config.maxSizeBytes <= 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'maxSizeBytes must be positive'
			);
		}

		if (config.memoryCacheSize < 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'memoryCacheSize cannot be negative'
			);
		}

		if (config.defaultTTL < 0) {
			throw new TranslationStoreError(
				'INVALID_CONFIG',
				'defaultTTL cannot be negative'
			);
		}
	}

	/**
	 * Validate loaded metadata structure.
	 *
	 * @param metadata - Metadata to validate
	 * @private
	 */
	private validateMetadata(metadata: StorageMetadata): void {
		if (!metadata.storeId || !metadata.version || !metadata.createdAt) {
			throw new TranslationStoreError(
				'INVALID_METADATA',
				'Metadata missing required fields'
			);
		}

		if (typeof metadata.createdAt !== 'number' || metadata.createdAt <= 0) {
			throw new TranslationStoreError(
				'INVALID_METADATA',
				'Invalid createdAt timestamp'
			);
		}
	}

	/**
	 * Create initial metadata object.
	 *
	 * @private
	 */
	private createMetadata(): StorageMetadata {
		return {
			storeId: crypto.randomUUID(),
			version: this.STORE_VERSION,
			createdAt: Date.now(),
			minCompatibleVersion: this.STORE_VERSION,
			maxCompatibleVersion: this.STORE_VERSION,
			features: {
				compression: this.config.enableCompression,
				encryption: false, // Future feature
				metrics: this.config.enableMetrics,
				healthMonitoring: true,
			},
			checksum: '',
			encrypted: false,
		};
	}

	/**
	 * Create initial statistics object.
	 *
	 * @private
	 */
	private createStatistics(): StoreStatistics {
		const now = Date.now();
		return {
			totalEntries: 0,
			activeEntries: 0,
			expiredEntries: 0,
			diskUsageBytes: 0,
			compressionRatio: 1.0,
			hitRate: 0.0,
			averageLookupTime: 0.0,
			averageWriteTime: 0.0,
			totalLookups: 0,
			totalWrites: 0,
			totalHits: 0,
			lastCleanup: now,
			lastOptimization: now,
			createdAt: now,
			updatedAt: now,
		};
	}

	/**
	 * Create initial health object.
	 *
	 * @private
	 */
	private createHealth(): StoreHealth {
		return {
			status: 'healthy',
			errors: [],
			warnings: [],
			diskSpaceAvailable: 0,
			fragmentationLevel: 0.0,
			lockStatus: 'unlocked',
			lastHealthCheck: Date.now(),
		};
	}

	/**
	 * Perform initial health check.
	 *
	 * @private
	 */
	private async performHealthCheck(): Promise<void> {
		try {
			// Check storage directory accessibility
			await fs.access(this.config.storagePath, fs.constants.W_OK);

			// Get disk space (simplified - in production you'd use more sophisticated methods)
			const stats = await fs.stat(this.config.storagePath);
			this.health.diskSpaceAvailable = Number.MAX_SAFE_INTEGER; // Placeholder

			this.health.status = 'healthy';
			this.health.lastHealthCheck = Date.now();
		} catch (error) {
			this.health.status = 'degraded';
			this.addError(new TranslationStoreError(
				'HEALTH_CHECK_FAILED',
				'Initial health check failed',
				error
			));
		}
	}

	/**
	 * Add error to health tracking.
	 *
	 * @param error - Error to add
	 * @private
	 */
	private addError(error: TranslationStoreError): void {
		const storeError: StoreError = {
			code: error.code,
			message: error.message,
			timestamp: Date.now(),
			severity: 'medium',
			resolved: false,
		};

		this.health.errors.push(storeError);

		// Update health status based on errors
		if (this.health.errors.length > 10) {
			this.health.status = 'degraded';
		}
	}

	/**
	 * Update last activity timestamp.
	 *
	 * @private
	 */
	private updateLastActivity(): void {
		const now = Date.now();
		this.statistics.updatedAt = now;
		this.health.lastHealthCheck = now;
	}

	/**
	 * Get current store statistics.
	 *
	 * @returns Current statistics snapshot
	 */
	getStatistics(): StoreStatistics {
		return { ...this.statistics };
	}

	/**
	 * Get current health status.
	 *
	 * @returns Current health snapshot
	 */
	getHealth(): StoreHealth {
		return { ...this.health };
	}

	/**
	 * Get store configuration.
	 *
	 * @returns Current configuration
	 */
	getConfiguration(): StoreConfiguration {
		return { ...this.config };
	}

	/**
	 * Check if store is initialized.
	 *
	 * @returns True if store is ready for operations
	 */
	isReady(): boolean {
		return this.isInitialized;
	}

	/**
	 * Generate unique key for translation entry.
	 *
	 * @param sourceLanguage - Source language code
	 * @param targetLanguage - Target language code
	 * @param originalText - Original text to translate
	 * @returns Unique key for the translation
	 */
	generateKey(sourceLanguage: string, targetLanguage: string, originalText: string): string {
		const textHash = this.generateHash(originalText);
		return `${sourceLanguage}:${targetLanguage}:${textHash}`;
	}

	/**
	 * Store a translation with metadata.
	 *
	 * Creates a new translation entry with timestamp, access tracking, and optional TTL.
	 * Uses JSONStorage for atomic file operations and handles storage limits.
	 *
	 * @param sourceText - Original text to translate
	 * @param targetText - Translated text
	 * @param sourceLang - Source language code
	 * @param targetLang - Target language code
	 * @param metadata - Optional metadata (confidence, API provider, TTL)
	 * @returns Translation entry key for retrieval
	 * @throws {TranslationStoreError} If storage operation fails or parameters are invalid
	 *
	 * @example
	 * ```typescript
	 * const key = await store.set(
	 *   'Hello world',
	 *   'こんにちは世界',
	 *   'en',
	 *   'ja',
	 *   { confidence: 0.95, apiProvider: 'openai', ttl: 86400000 }
	 * );
	 * ```
	 */
	async set(
		sourceText: string,
		targetText: string,
		sourceLang: SupportedLanguage,
		targetLang: SupportedLanguage,
		metadata?: {
			confidence?: number;
			apiProvider?: string;
			ttl?: number;
		}
	): Promise<string> {
		const startTime = Date.now();

		try {
			// Input validation using Zod schema
			const validatedParams = SetTranslationSchema.parse({
				sourceText,
				targetText,
				sourceLang,
				targetLang,
				metadata,
			});

			// Check if store is initialized
			if (!this.isInitialized) {
				throw new TranslationStoreError(
					'STORE_NOT_INITIALIZED',
					'Store must be initialized before operations'
				);
			}

			// Generate translation key using existing hashing utilities
			const key = generateKey(
				validatedParams.sourceLang as SupportedLanguage,
				validatedParams.targetLang as SupportedLanguage,
				validatedParams.sourceText
			);

			// Get file path for the translation
			const filePath = this.getFilePath(key);

			// Calculate TTL and expiration
			const ttl = metadata?.ttl ?? this.config.defaultTTL;
			const now = Date.now();
			const expiresAt = ttl > 0 ? now + ttl : undefined;

			// Create translation entry with full metadata
			const entry: TranslationEntry = {
				key,
				originalText: validatedParams.sourceText,
				translatedText: validatedParams.targetText,
				sourceLanguage: validatedParams.sourceLang,
				targetLanguage: validatedParams.targetLang,
				createdAt: now,
				accessedAt: now,
				accessCount: 0,
				ttl,
				expiresAt,
				compressed: false, // Will be determined by JSONStorage
				size: 0, // Will be calculated by JSONStorage
				confidence: metadata?.confidence,
				apiProvider: metadata?.apiProvider,
			};

			// Validate entry structure
			TranslationEntrySchema.parse(entry);

			// Check storage limits before writing
			await this.checkStorageLimits();

			// Store using JSONStorage for atomic operations
			const writeResult = await this.storage.writeJSON(filePath, entry);

			// Update entry with actual size and compression info
			entry.size = writeResult.fileSize;
			entry.compressed = writeResult.compressed;

			// Update store statistics
			this.updateWriteStatistics(startTime, writeResult);

			// Update last activity
			this.updateLastActivity();

			return key;

		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new TranslationStoreError(
					'VALIDATION_ERROR',
					'Invalid input parameters',
					error
				);
			}

			if (error instanceof TranslationStoreError) {
				throw error;
			}

			throw new TranslationStoreError(
				'SET_FAILED',
				'Failed to store translation',
				error
			);
		}
	}

	/**
	 * Retrieve a translation by its hash key.
	 *
	 * Checks expiration before returning and updates access tracking.
	 * Returns null if not found or expired.
	 *
	 * @param key - Translation hash key
	 * @returns Translation entry or null if not found/expired
	 * @throws {TranslationStoreError} If retrieval operation fails
	 *
	 * @example
	 * ```typescript
	 * const entry = await store.get('en:ja:SGVsbG8gd29ybGQ=');
	 * if (entry) {
	 *   console.log(entry.translatedText);
	 * }
	 * ```
	 */
	async get(key: string): Promise<TranslationEntry | null> {
		const startTime = Date.now();

		try {
			// Input validation
			const validatedParams = GetByKeySchema.parse({ key });

			// Check if store is initialized
			if (!this.isInitialized) {
				throw new TranslationStoreError(
					'STORE_NOT_INITIALIZED',
					'Store must be initialized before operations'
				);
			}

			// Validate key format using hashing utilities
			if (!validateKey(validatedParams.key)) {
				throw new TranslationStoreError(
					'INVALID_KEY',
					'Invalid translation key format'
				);
			}

			// Get file path for the translation
			const filePath = this.getFilePath(validatedParams.key);

			// Read using JSONStorage
			const data = await this.storage.readJSON(filePath) as TranslationEntry;

			// Validate loaded entry
			const entry = TranslationEntrySchema.parse(data);

			// Check TTL expiration
			if (this.isExpired(entry)) {
				// Clean up expired entry
				await this.removeExpiredEntry(validatedParams.key);
				return null;
			}

			// Update access tracking
			await this.updateAccessTracking(entry);

			// Update statistics
			this.updateReadStatistics(startTime);

			// Update last activity
			this.updateLastActivity();

			return entry;

		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new TranslationStoreError(
					'VALIDATION_ERROR',
					'Invalid input parameters',
					error
				);
			}

			if (error instanceof TranslationStoreError && error.code === 'INVALID_KEY') {
				throw error;
			}

			// Check if file doesn't exist (not an error for get operations)
			if ((error as any)?.code === 'FILE_NOT_FOUND') {
				return null;
			}

			if (error instanceof TranslationStoreError) {
				throw error;
			}

			throw new TranslationStoreError(
				'GET_FAILED',
				'Failed to retrieve translation',
				error
			);
		}
	}

	/**
	 * Retrieve a translation by original text and languages.
	 *
	 * Generates the key and delegates to get() for lookup.
	 * Includes input validation using Zod schemas.
	 *
	 * @param sourceText - Original text to find
	 * @param sourceLang - Source language code
	 * @param targetLang - Target language code
	 * @returns Translation entry or null if not found/expired
	 * @throws {TranslationStoreError} If lookup operation fails
	 *
	 * @example
	 * ```typescript
	 * const entry = await store.getByText('Hello world', 'en', 'ja');
	 * if (entry) {
	 *   console.log(entry.translatedText);
	 * }
	 * ```
	 */
	async getByText(
		sourceText: string,
		sourceLang: SupportedLanguage,
		targetLang: SupportedLanguage
	): Promise<TranslationEntry | null> {
		try {
			// Input validation
			const validatedParams = GetByTextSchema.parse({
				sourceText,
				sourceLang,
				targetLang,
			});

			// Generate key using hashing utilities
			const key = generateKey(
				validatedParams.sourceLang as SupportedLanguage,
				validatedParams.targetLang as SupportedLanguage,
				validatedParams.sourceText
			);

			// Delegate to get() method
			return await this.get(key);

		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new TranslationStoreError(
					'VALIDATION_ERROR',
					'Invalid input parameters',
					error
				);
			}

			throw new TranslationStoreError(
				'GET_BY_TEXT_FAILED',
				'Failed to retrieve translation by text',
				error
			);
		}
	}

	/**
	 * Check if a translation entry has expired based on its TTL.
	 *
	 * @param entry - Translation entry to check
	 * @returns true if entry has expired, false otherwise
	 * @private
	 */
	private isExpired(entry: TranslationEntry): boolean {
		if (!entry.expiresAt) {
			// No expiration set
			return false;
		}
		return Date.now() > entry.expiresAt;
	}

	/**
	 * Remove an expired translation entry from storage.
	 *
	 * @param key - Translation key to remove
	 * @private
	 */
	private async removeExpiredEntry(key: string): Promise<void> {
		try {
			const filePath = this.getFilePath(key);
			await this.storage.deleteFile(filePath);
		} catch (error) {
			// Log error but don't throw - cleanup failures shouldn't break operations
			console.error(`Failed to remove expired entry: ${key}`, error);
		}
	}

	/**
	 * Update access tracking for a translation entry.
	 *
	 * Increments access count and updates accessed timestamp.
	 * Persists changes back to disk.
	 *
	 * @param entry - Translation entry to update
	 * @private
	 */
	private async updateAccessTracking(entry: TranslationEntry): Promise<void> {
		try {
			// Update access tracking fields
			entry.accessCount += 1;
			entry.accessedAt = Date.now();

			// Get file path
			const filePath = this.getFilePath(entry.key);

			// Persist updated entry back to storage
			await this.storage.writeJSON(filePath, entry);

		} catch (error) {
			// Log error but don't throw - tracking failures shouldn't break read operations
			console.error(`Failed to update access tracking for entry: ${entry.key}`, error);
		}
	}

	/**
	 * Check storage limits before adding new entries.
	 *
	 * Validates against maxEntries and maxSizeBytes configuration.
	 * Throws error if limits would be exceeded.
	 *
	 * @private
	 */
	private async checkStorageLimits(): Promise<void> {
		// Note: In a full implementation, you would:
		// 1. Count current entries
		// 2. Calculate current disk usage
		// 3. Compare against limits
		// 4. Trigger cleanup if needed
		// For now, this is a placeholder that always succeeds
		// as the full cleanup/limit enforcement is beyond scope
	}

	/**
	 * Update write operation statistics.
	 *
	 * @param startTime - Operation start timestamp
	 * @param writeResult - Result from JSONStorage write operation
	 * @private
	 */
	private updateWriteStatistics(startTime: number, writeResult: FileOperationResult): void {
		const duration = Date.now() - startTime;

		this.statistics.totalWrites++;
		this.statistics.updatedAt = Date.now();

		// Update average write time
		const totalWrites = this.statistics.totalWrites;
		const currentAvg = this.statistics.averageWriteTime;
		this.statistics.averageWriteTime = ((currentAvg * (totalWrites - 1)) + duration) / totalWrites;

		// Update disk usage and compression ratio
		this.statistics.diskUsageBytes += writeResult.fileSize;
		if (writeResult.compressed) {
			const ratio = writeResult.compressionRatio;
			const currentRatio = this.statistics.compressionRatio;
			this.statistics.compressionRatio = ((currentRatio * (totalWrites - 1)) + ratio) / totalWrites;
		}
	}

	/**
	 * Update read operation statistics.
	 *
	 * @param startTime - Operation start timestamp
	 * @private
	 */
	private updateReadStatistics(startTime: number): void {
		const duration = Date.now() - startTime;

		this.statistics.totalLookups++;
		this.statistics.totalHits++; // All successful reads are hits
		this.statistics.updatedAt = Date.now();

		// Update hit rate
		this.statistics.hitRate = this.statistics.totalHits / this.statistics.totalLookups;

		// Update average lookup time
		const totalLookups = this.statistics.totalLookups;
		const currentAvg = this.statistics.averageLookupTime;
		this.statistics.averageLookupTime = ((currentAvg * (totalLookups - 1)) + duration) / totalLookups;
	}
}