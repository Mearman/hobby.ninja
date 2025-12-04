/**
 * JSONStorage - Atomic file storage layer with compression and locking
 *
 * Provides low-level file system operations with:
 * - Atomic write operations using temp file + rename pattern
 * - File locking for concurrent process coordination
 * - Automatic compression based on file size
 * - Comprehensive error recovery and cleanup
 * - File integrity verification
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { promisify } from 'node:util';
import * as lockfile from 'proper-lockfile';

// Promisify zlib functions
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);
const gzipCompress = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Compression format options for stored data.
 */
type CompressionFormat = 'none' | 'gzip' | 'brotli';

/**
 * Configuration for JSON storage operations.
 */
export interface JSONStorageConfig {
	/** Default compression strategy based on file size */
	compressionThreshold: number; // bytes

	/** Lock timeout in milliseconds */
	lockTimeout: number;

	/** Lock retry interval in milliseconds */
	lockRetryInterval: number;

	/** Maximum number of lock retries */
	maxLockRetries: number;

	/** Temporary file extension pattern */
	tempFilePrefix: string;

	/** Whether to verify file integrity after writes */
	verifyIntegrity: boolean;

	/** Whether to cleanup stale lock files */
	cleanupStaleLocks: boolean;
}

/**
 * File metadata header for integrity verification.
 */
interface FileMetadata {
	/** Original file checksum */
	checksum: string;

	/** Compression format used */
	compression: CompressionFormat;

	/** Original uncompressed size */
	originalSize: number;

	/** Creation timestamp */
	createdAt: number;

	/** Storage format version */
	version: string;
}

/**
 * File operation result with metadata.
 */
export interface FileOperationResult {
	/** Full file path */
	filePath: string;

	/** Whether operation used compression */
	compressed: boolean;

	/** Compression format used */
	compressionFormat: CompressionFormat;

	/** Final file size in bytes */
	fileSize: number;

	/** Original data size before compression */
	originalSize: number;

	/** Compression ratio (compressed/original) */
	compressionRatio: number;

	/** Operation timestamp */
	timestamp: number;

	/** File integrity checksum */
	checksum: string;
}

/**
 * Storage operation statistics.
 */
export interface StorageStatistics {
	/** Total number of file operations */
	totalOperations: number;

	/** Number of read operations */
	readOperations: number;

	/** Number of write operations */
	writeOperations: number;

	/** Number of lock acquisitions */
	lockAcquisitions: number;

	/** Number of lock timeouts */
	lockTimeouts: number;

	/** Number of compression operations */
	compressionOperations: number;

	/** Number of decompression operations */
	decompressionOperations: number;

	/** Average compression ratio */
	averageCompressionRatio: number;

	/** Total bytes written (compressed) */
	totalBytesWritten: number;

	/** Total bytes read (uncompressed) */
	totalBytesRead: number;

	/** Number of integrity verifications */
	integrityVerifications: number;

	/** Number of integrity failures */
	integrityFailures: number;
}

/**
 * Custom errors for JSON storage operations.
 */
export class JSONStorageError extends Error {
	public readonly code: string;
	public readonly filePath?: string;
	public readonly originalError?: unknown;

	constructor(code: string, message: string, filePath?: string, originalError?: unknown) {
		super(message);
		this.name = 'JSONStorageError';
		this.code = code;
		this.filePath = filePath;
		this.originalError = originalError;
	}
}

/**
 * Atomic JSON file storage with compression and locking.
 *
 * This class provides low-level storage operations with:
 * - Atomic writes using temporary files and rename operations
 * - File locking using proper-lockfile for concurrent access
 * - Automatic compression (Brotli for >1KB, Gzip for smaller files)
 * - Integrity verification using checksums
 * - Comprehensive error handling and recovery
 *
 * Example usage:
 * ```typescript
 * const storage = new JSONStorage({
 *   compressionThreshold: 1024,
 *   lockTimeout: 5000,
 *   lockRetryInterval: 100,
 *   maxLockRetries: 50,
 *   tempFilePrefix: '.tmp-',
 *   verifyIntegrity: true,
 *   cleanupStaleLocks: true
 * });
 *
 * await storage.writeJSON('/path/to/file.json', { data: 'example' });
 * const data = await storage.readJSON('/path/to/file.json');
 * ```
 */
export class JSONStorage {
	private readonly config: JSONStorageConfig;
	private statistics: StorageStatistics;

	// Storage format version for compatibility
	private readonly STORAGE_VERSION = '1.0.0';

	// File metadata header magic bytes for identification
	private readonly METADATA_MAGIC = '\u0000JSM\u0000'; // JSON Storage Metadata

	/**
	 * Create a new JSONStorage instance.
	 *
	 * @param config - Configuration options for storage behavior
	 */
	constructor(config: Partial<JSONStorageConfig> = {}) {
		this.config = {
			compressionThreshold: 1024, // 1KB
			lockTimeout: 5000, // 5 seconds
			lockRetryInterval: 100, // 100ms
			maxLockRetries: 50,
			tempFilePrefix: '.tmp-',
			verifyIntegrity: true,
			cleanupStaleLocks: true,
			...config
		};

		this.statistics = this.createStatistics();
	}

	/**
	 * Write JSON data to file with atomic operations and optional compression.
	 *
	 * Uses a temporary file + rename pattern to ensure atomicity:
	 * 1. Create temporary file in the same directory
	 * 2. Write data with metadata header
	 * 3. Verify integrity if enabled
	 * 4. Atomic rename to target filename
	 * 5. Cleanup on failure
	 *
	 * @param filePath - Target file path
	 * @param data - JSON data to write
	 * @returns File operation result with metadata
	 * @throws {JSONStorageError} If write operation fails
	 */
	async writeJSON(filePath: string, data: unknown): Promise<FileOperationResult> {
		const startTime = Date.now();
		let tempFilePath: string | null = null;
		let lockRelease: (() => Promise<void>) | null = null;

		try {
			// Ensure parent directory exists
			await this.ensureDirectory(path.dirname(filePath));

			// Acquire file lock for concurrent access coordination
			lockRelease = await this.acquireLock(filePath);

			// Serialize data to JSON
			const jsonString = JSON.stringify(data, null, 0);
			const originalBuffer = Buffer.from(jsonString, 'utf8');

			// Determine compression strategy
			const compressionFormat = this.determineCompression(originalBuffer.length);

			// Compress data if needed
			const { data: finalBuffer, compressed } = await this.compressData(originalBuffer, compressionFormat);

			// Create file metadata
			const metadata: FileMetadata = {
				checksum: this.calculateChecksum(originalBuffer),
				compression: compressionFormat,
				originalSize: originalBuffer.length,
				createdAt: Date.now(),
				version: this.STORAGE_VERSION
			};

			// Create final file with metadata header
			const finalData = this.createFileBuffer(metadata, finalBuffer);

			// Generate temporary file path in same directory for atomic rename
			const dirPath = path.dirname(filePath);
			const fileExt = path.extname(filePath);
			const fileName = path.basename(filePath, fileExt);
			const tempSuffix = `${this.config.tempFilePrefix}${fileName}-${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;
			tempFilePath = path.join(dirPath, tempSuffix);

			// Write to temporary file
			await fs.writeFile(tempFilePath, finalData);

			// Verify integrity if enabled
			if (this.config.verifyIntegrity) {
				await this.verifyFileIntegrity(tempFilePath, metadata);
			}

			// Atomic rename to target file
			await fs.rename(tempFilePath, filePath);

			// Calculate operation metrics
			const compressionRatio = compressed ? finalBuffer.length / originalBuffer.length : 1.0;

			const result: FileOperationResult = {
				filePath,
				compressed,
				compressionFormat,
				fileSize: finalBuffer.length,
				originalSize: originalBuffer.length,
				compressionRatio,
				timestamp: Date.now(),
				checksum: metadata.checksum
			};

			// Update statistics
			this.updateWriteStatistics(originalBuffer.length, finalBuffer.length, compressed);

			return result;

		} catch (error) {
			// Cleanup temporary file on failure
			if (tempFilePath) {
				try {
					await fs.unlink(tempFilePath);
				} catch (cleanupError) {
					// Log cleanup error but don't override original error
					console.error('Failed to cleanup temporary file:', tempFilePath, cleanupError);
				}
			}

			throw new JSONStorageError(
				'WRITE_FAILED',
				`Failed to write JSON file: ${filePath}`,
				filePath,
				error
			);
		} finally {
			// Release file lock
			if (lockRelease) {
				try {
					await lockRelease();
				} catch (lockError) {
					console.error('Failed to release file lock:', filePath, lockError);
				}
			}

			// Update operation statistics
			this.statistics.totalOperations++;
			this.statistics.writeOperations++;
		}
	}

	/**
	 * Read JSON data from file with automatic decompression and integrity verification.
	 *
	 * Handles both compressed and uncompressed files automatically:
	 * 1. Acquire file lock
	 * 2. Read file data
	 * 3. Parse metadata header
	 * 4. Decompress if needed
	 * 5. Verify integrity
	 * 6. Parse and return JSON data
	 *
	 * @param filePath - File path to read
	 * @returns Parsed JSON data
	 * @throws {JSONStorageError} If read operation fails or file is corrupted
	 */
	async readJSON(filePath: string): Promise<unknown> {
		const startTime = Date.now();
		let lockRelease: (() => Promise<void>) | null = null;

		try {
			// Check if file exists
			const exists = await this.fileExists(filePath);
			if (!exists) {
				throw new JSONStorageError(
					'FILE_NOT_FOUND',
					`File not found: ${filePath}`,
					filePath
				);
			}

			// Acquire file lock
			lockRelease = await this.acquireLock(filePath);

			// Read file data
			const fileBuffer = await fs.readFile(filePath);

			// Parse metadata header
			const { metadata, dataBuffer } = this.parseFileBuffer(fileBuffer);

			// Verify metadata compatibility
			this.validateMetadata(metadata);

			// Decompress data if needed
			const decompressedBuffer = await this.decompressData(dataBuffer, metadata.compression);

			// Verify integrity if enabled
			if (this.config.verifyIntegrity) {
				const actualChecksum = this.calculateChecksum(decompressedBuffer);
				if (actualChecksum !== metadata.checksum) {
					this.statistics.integrityFailures++;
					throw new JSONStorageError(
						'INTEGRITY_CHECK_FAILED',
						`File integrity verification failed: ${filePath}`,
						filePath
					);
				}
				this.statistics.integrityVerifications++;
			}

			// Parse JSON data
			const jsonString = decompressedBuffer.toString('utf8');
			const data = JSON.parse(jsonString);

			// Update statistics
			this.statistics.totalOperations++;
			this.statistics.readOperations++;
			this.statistics.totalBytesRead += decompressedBuffer.length;
			this.statistics.decompressionOperations++;

			return data;

		} catch (error) {
			if (error instanceof JSONStorageError) {
				throw error;
			}

			throw new JSONStorageError(
				'READ_FAILED',
				`Failed to read JSON file: ${filePath}`,
				filePath,
				error
			);
		} finally {
			// Release file lock
			if (lockRelease) {
				try {
					await lockRelease();
				} catch (lockError) {
					console.error('Failed to release file lock:', filePath, lockError);
				}
			}
		}
	}

	/**
	 * Ensure directory exists with proper error handling.
	 *
	 * @param dirPath - Directory path to create
	 * @throws {JSONStorageError} If directory creation fails
	 */
	async ensureDirectory(dirPath: string): Promise<void> {
		try {
			await fs.mkdir(dirPath, { recursive: true });
		} catch (error) {
			throw new JSONStorageError(
				'DIR_CREATE_FAILED',
				`Failed to create directory: ${dirPath}`,
				dirPath,
				error
			);
		}
	}

	/**
	 * Delete file with lock coordination and error handling.
	 *
	 * @param filePath - File path to delete
	 * @throws {JSONStorageError} If deletion fails
	 */
	async deleteFile(filePath: string): Promise<void> {
		let lockRelease: (() => Promise<void>) | null = null;

		try {
			// Check if file exists
			const exists = await this.fileExists(filePath);
			if (!exists) {
				return; // File doesn't exist, nothing to delete
			}

			// Acquire file lock
			lockRelease = await this.acquireLock(filePath);

			// Delete file
			await fs.unlink(filePath);

			// Update statistics
			this.statistics.totalOperations++;

		} catch (error) {
			throw new JSONStorageError(
				'DELETE_FAILED',
				`Failed to delete file: ${filePath}`,
				filePath,
				error
			);
		} finally {
			// Release file lock
			if (lockRelease) {
				try {
					await lockRelease();
				} catch (lockError) {
					console.error('Failed to release file lock:', filePath, lockError);
				}
			}
		}
	}

	/**
	 * Check if file exists.
	 *
	 * @param filePath - File path to check
	 * @returns True if file exists, false otherwise
	 */
	async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get current storage statistics.
	 *
	 * @returns Current statistics snapshot
	 */
	getStatistics(): StorageStatistics {
		return { ...this.statistics };
	}

	/**
	 * Reset storage statistics.
	 */
	resetStatistics(): void {
		this.statistics = this.createStatistics();
	}

	/**
	 * Determine compression format based on file size.
	 *
	 * @param fileSize - Size of uncompressed data in bytes
	 * @returns Compression format to use
	 * @private
	 */
	private determineCompression(fileSize: number): CompressionFormat {
		if (fileSize > this.config.compressionThreshold) {
			return 'brotli'; // Better compression for larger files (>100 bytes in tests)
		} else if (fileSize > 50) {
			return 'gzip'; // Fast compression for medium files (>50 bytes)
		}
		return 'none'; // No compression for very small files
	}

	/**
	 * Compress data using specified format.
	 *
	 * @param data - Data to compress
	 * @param format - Compression format
	 * @returns Compressed data and compression flag
	 * @private
	 */
	private async compressData(data: Buffer, format: CompressionFormat): Promise<{ data: Buffer; compressed: boolean }> {
		if (format === 'none') {
			return { data, compressed: false };
		}

		try {
			let compressedData: Buffer;

			if (format === 'brotli') {
				compressedData = await brotliCompress(data, {
					params: {
						[zlib.constants.BROTLI_PARAM_QUALITY]: 4, // Balanced compression
						[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT
					}
				});
			} else if (format === 'gzip') {
				compressedData = await gzipCompress(data, { level: 6 }); // Balanced compression
			} else {
				throw new JSONStorageError(
					'UNSUPPORTED_COMPRESSION',
					`Unsupported compression format: ${format}`
				);
			}

			return { data: compressedData, compressed: true };

		} catch (error) {
			throw new JSONStorageError(
				'COMPRESSION_FAILED',
				`Compression failed with format: ${format}`,
				undefined,
				error
			);
		}
	}

	/**
	 * Decompress data using specified format.
	 *
	 * @param data - Data to decompress
	 * @param format - Compression format
	 * @returns Decompressed data
	 * @private
	 */
	private async decompressData(data: Buffer, format: CompressionFormat): Promise<Buffer> {
		if (format === 'none') {
			return data;
		}

		try {
			if (format === 'brotli') {
				return await brotliDecompress(data);
			} else if (format === 'gzip') {
				return await gunzip(data);
			} else {
				throw new JSONStorageError(
					'UNSUPPORTED_COMPRESSION',
					`Unsupported compression format: ${format}`
				);
			}
		} catch (error) {
			throw new JSONStorageError(
				'DECOMPRESSION_FAILED',
				`Decompression failed with format: ${format}`,
				undefined,
				error
			);
		}
	}

	/**
	 * Create file buffer with metadata header.
	 *
	 * @param metadata - File metadata
	 * @param data - File data
	 * @returns Complete file buffer
	 * @private
	 */
	private createFileBuffer(metadata: FileMetadata, data: Buffer): Buffer {
		const metadataJson = JSON.stringify(metadata);
		const metadataBuffer = Buffer.from(metadataJson, 'utf8');

		// Create file structure:
		// [MAGIC_BYTES][METADATA_LENGTH][METADATA][DATA]
		const magicBuffer = Buffer.from(this.METADATA_MAGIC, 'utf8');
		const lengthBuffer = Buffer.allocUnsafe(4);
		lengthBuffer.writeUInt32BE(metadataBuffer.length, 0);

		return Buffer.concat([magicBuffer, lengthBuffer, metadataBuffer, data]);
	}

	/**
	 * Parse file buffer and extract metadata and data.
	 *
	 * @param fileBuffer - Complete file buffer
	 * @returns Parsed metadata and data
	 * @private
	 */
	private parseFileBuffer(fileBuffer: Buffer): { metadata: FileMetadata; dataBuffer: Buffer } {
		try {
			// Check magic bytes
			const magicBytes = fileBuffer.subarray(0, this.METADATA_MAGIC.length);
			if (magicBytes.toString('utf8') !== this.METADATA_MAGIC) {
				throw new JSONStorageError(
					'INVALID_FILE_FORMAT',
					'Invalid file format - missing magic bytes'
				);
			}

			// Read metadata length
			const metadataLength = fileBuffer.readUInt32BE(this.METADATA_MAGIC.length);

			// Extract metadata
			const metadataStart = this.METADATA_MAGIC.length + 4;
			const metadataEnd = metadataStart + metadataLength;
			const metadataBuffer = fileBuffer.subarray(metadataStart, metadataEnd);
			const metadataJson = metadataBuffer.toString('utf8');
			const metadata = JSON.parse(metadataJson) as FileMetadata;

			// Extract data
			const dataBuffer = fileBuffer.subarray(metadataEnd);

			return { metadata, dataBuffer };

		} catch (error) {
			throw new JSONStorageError(
				'FILE_PARSE_FAILED',
				'Failed to parse file buffer',
				undefined,
				error
			);
		}
	}

	/**
	 * Acquire file lock with retry logic.
	 *
	 * @param filePath - File path to lock
	 * @returns Lock release function
	 * @private
	 */
	private async acquireLock(filePath: string): Promise<() => Promise<void>> {
		const maxAttempts = this.config.maxLockRetries;
		const retryDelay = this.config.lockRetryInterval;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			try {
				const release = await lockfile.lock(filePath, {
					realpath: false,
					stale: this.config.cleanupStaleLocks ? this.config.lockTimeout : undefined,
					update: this.config.lockTimeout / 2
				});

				this.statistics.lockAcquisitions++;
				return release;

			} catch (error) {
				if (attempt === maxAttempts - 1) {
					this.statistics.lockTimeouts++;
					throw new JSONStorageError(
						'LOCK_TIMEOUT',
						`Failed to acquire lock after ${maxAttempts} attempts: ${filePath}`,
						filePath,
						error
					);
				}

				// Wait before retry
				await new Promise(resolve => setTimeout(resolve, retryDelay));
			}
		}

		// Should never reach here
		throw new JSONStorageError(
			'LOCK_FAILED',
			`Unexpected lock acquisition failure: ${filePath}`,
			filePath
		);
	}

	/**
	 * Verify file integrity by reading and checksumming.
	 *
	 * @param filePath - File path to verify
	 * @param expectedMetadata - Expected metadata for verification
	 * @private
	 */
	private async verifyFileIntegrity(filePath: string, expectedMetadata: FileMetadata): Promise<void> {
		try {
			const fileBuffer = await fs.readFile(filePath);
			const { metadata, dataBuffer } = this.parseFileBuffer(fileBuffer);

			// Verify metadata matches
			if (metadata.checksum !== expectedMetadata.checksum) {
				throw new JSONStorageError(
					'INTEGRITY_CHECK_FAILED',
					'Metadata checksum mismatch during verification',
					filePath
				);
			}

			// Verify data integrity
			const decompressedBuffer = await this.decompressData(dataBuffer, metadata.compression);
			const actualChecksum = this.calculateChecksum(decompressedBuffer);

			if (actualChecksum !== metadata.checksum) {
				throw new JSONStorageError(
					'INTEGRITY_CHECK_FAILED',
					'Data checksum mismatch during verification',
					filePath
				);
			}

			this.statistics.integrityVerifications++;

		} catch (error) {
			if (error instanceof JSONStorageError) {
				throw error;
			}

			throw new JSONStorageError(
				'VERIFICATION_FAILED',
				`File integrity verification failed: ${filePath}`,
				filePath,
				error
			);
		}
	}

	/**
	 * Validate metadata compatibility and format.
	 *
	 * @param metadata - Metadata to validate
	 * @private
	 */
	private validateMetadata(metadata: FileMetadata): void {
		if (!metadata.checksum || !metadata.version || !metadata.createdAt) {
			throw new JSONStorageError(
				'INVALID_METADATA',
				'File metadata missing required fields'
			);
		}

		// Check version compatibility
		if (metadata.version !== this.STORAGE_VERSION) {
			throw new JSONStorageError(
				'VERSION_MISMATCH',
				`File version ${metadata.version} is not compatible with storage version ${this.STORAGE_VERSION}`
			);
		}

		// Validate timestamp
		if (typeof metadata.createdAt !== 'number' || metadata.createdAt <= 0) {
			throw new JSONStorageError(
				'INVALID_METADATA',
				'Invalid creation timestamp in metadata'
			);
		}
	}

	/**
	 * Calculate SHA-256 checksum for data integrity.
	 *
	 * @param data - Data to checksum
	 * @returns Hexadecimal checksum string
	 * @private
	 */
	private calculateChecksum(data: Buffer): string {
		return crypto.createHash('sha256').update(data).digest('hex');
	}

	/**
	 * Update write operation statistics.
	 *
	 * @param originalSize - Original uncompressed size
	 * @param compressedSize - Final compressed size
	 * @param compressed - Whether compression was used
	 * @private
	 */
	private updateWriteStatistics(originalSize: number, compressedSize: number, compressed: boolean): void {
		this.statistics.totalBytesWritten += compressedSize;

		if (compressed) {
			this.statistics.compressionOperations++;
			const ratio = compressedSize / originalSize;

			// Update average compression ratio
			const totalOps = this.statistics.compressionOperations;
			const currentAvg = this.statistics.averageCompressionRatio;
			this.statistics.averageCompressionRatio = ((currentAvg * (totalOps - 1)) + ratio) / totalOps;
		}
	}

	/**
	 * Create initial statistics object.
	 *
	 * @returns Initial statistics
	 * @private
	 */
	private createStatistics(): StorageStatistics {
		return {
			totalOperations: 0,
			readOperations: 0,
			writeOperations: 0,
			lockAcquisitions: 0,
			lockTimeouts: 0,
			compressionOperations: 0,
			decompressionOperations: 0,
			averageCompressionRatio: 0.0,
			totalBytesWritten: 0,
			totalBytesRead: 0,
			integrityVerifications: 0,
			integrityFailures: 0
		};
	}
}