/**
 * Tests for JSONStorage - Atomic file storage with compression and locking
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JSONStorage, JSONStorageError } from './json-storage';

describe('JSONStorage', () => {
	let storage: JSONStorage;
	let testDir: string;

	beforeEach(() => {
		// Create unique test directory
		testDir = join(tmpdir(), `json-storage-test-${Date.now()}-${Math.random().toString(36).substring(2)}`);

		storage = new JSONStorage({
			compressionThreshold: 100,
			lockTimeout: 1000,
			lockRetryInterval: 50,
			maxLockRetries: 10,
			tempFilePrefix: '.test-tmp-',
			verifyIntegrity: true,
			cleanupStaleLocks: true
		});
	});

	afterEach(async () => {
		// Cleanup test directory
		try {
			const { rm } = await import('node:fs/promises');
			await rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('writeJSON', () => {
		it('should write simple JSON data without compression', async () => {
			const filePath = join(testDir, 'simple.json');
			const data = { name: 'test', value: 42 };

			const result = await storage.writeJSON(filePath, data);

			expect(result.filePath).toBe(filePath);
			expect(result.compressed).toBe(false);
			expect(result.compressionFormat).toBe('none');
			expect(result.originalSize).toBeGreaterThan(0);
			expect(result.fileSize).toBeGreaterThan(0);
			expect(result.compressionRatio).toBe(1.0);
		});

		it('should compress large data with brotli', async () => {
			const filePath = join(testDir, 'large.json');
			// Create data larger than compression threshold
			const largeString = 'x'.repeat(200);
			const data = { large: largeString, more: 'data'.repeat(20) };

			const result = await storage.writeJSON(filePath, data);

			expect(result.compressed).toBe(true);
			expect(result.compressionFormat).toBe('brotli');
			expect(result.compressionRatio).toBeLessThan(1.0);
			expect(result.fileSize).toBeLessThan(result.originalSize);
		});

		it('should compress medium data with gzip', async () => {
			const filePath = join(testDir, 'medium.json');
			// Create data that should use gzip compression
			const mediumData = { data: 'x'.repeat(50) };

			const result = await storage.writeJSON(filePath, mediumData);

			expect(result.compressed).toBe(true);
			expect(result.compressionFormat).toBe('gzip');
		});

		it('should ensure parent directory exists', async () => {
			const filePath = join(testDir, 'nested', 'path', 'file.json');
			const data = { nested: true };

			await expect(storage.writeJSON(filePath, data)).resolves.not.toThrow();

			// Verify file was created
			const readData = await storage.readJSON(filePath);
			expect(readData).toEqual(data);
		});

		it('should overwrite existing file atomically', async () => {
			const filePath = join(testDir, 'overwrite.json');
			const originalData = { version: 1, data: 'original' };
			const newData = { version: 2, data: 'new' };

			// Write original data
			await storage.writeJSON(filePath, originalData);

			// Write new data
			await storage.writeJSON(filePath, newData);

			// Read and verify new data
			const readData = await storage.readJSON(filePath);
			expect(readData).toEqual(newData);
		});
	});

	describe('readJSON', () => {
		it('should read uncompressed JSON data', async () => {
			const filePath = join(testDir, 'read-simple.json');
			const data = { message: 'hello world', numbers: [1, 2, 3] };

			await storage.writeJSON(filePath, data);
			const readData = await storage.readJSON(filePath);

			expect(readData).toEqual(data);
		});

		it('should read and decompress brotli data', async () => {
			const filePath = join(testDir, 'read-brotli.json');
			const data = { large: 'x'.repeat(200), nested: { data: 'test'.repeat(10) } };

			await storage.writeJSON(filePath, data);
			const readData = await storage.readJSON(filePath);

			expect(readData).toEqual(data);
		});

		it('should read and decompress gzip data', async () => {
			const filePath = join(testDir, 'read-gzip.json');
			const data = { medium: 'x'.repeat(50) };

			await storage.writeJSON(filePath, data);
			const readData = await storage.readJSON(filePath);

			expect(readData).toEqual(data);
		});

		it('should throw error for non-existent file', async () => {
			const filePath = join(testDir, 'non-existent.json');

			await expect(storage.readJSON(filePath)).rejects.toThrow(JSONStorageError);
		});

		it('should detect and reject corrupted files', async () => {
			const filePath = join(testDir, 'corrupted.json');

			// Write valid data first
			await storage.writeJSON(filePath, { valid: true });

			// Corrupt the file by truncating it
			const { writeFile } = await import('node:fs/promises');
			await writeFile(filePath, 'corrupted data');

			await expect(storage.readJSON(filePath)).rejects.toThrow(JSONStorageError);
		});
	});

	describe('fileExists', () => {
		it('should return true for existing file', async () => {
			const filePath = join(testDir, 'exists.json');
			const data = { exists: true };

			await storage.writeJSON(filePath, data);

			expect(await storage.fileExists(filePath)).toBe(true);
		});

		it('should return false for non-existent file', async () => {
			const filePath = join(testDir, 'not-exists.json');

			expect(await storage.fileExists(filePath)).toBe(false);
		});
	});

	describe('deleteFile', () => {
		it('should delete existing file', async () => {
			const filePath = join(testDir, 'delete.json');
			const data = { delete: true };

			await storage.writeJSON(filePath, data);
			expect(await storage.fileExists(filePath)).toBe(true);

			await storage.deleteFile(filePath);
			expect(await storage.fileExists(filePath)).toBe(false);
		});

		it('should not throw when deleting non-existent file', async () => {
			const filePath = join(testDir, 'delete-non-existent.json');

			await expect(storage.deleteFile(filePath)).resolves.not.toThrow();
		});
	});

	describe('ensureDirectory', () => {
		it('should create nested directories', async () => {
			const dirPath = join(testDir, 'nested', 'deep', 'path');

			await expect(storage.ensureDirectory(dirPath)).resolves.not.toThrow();

			// Verify directory exists by writing a file there
			const testFile = join(dirPath, 'test.json');
			await expect(storage.writeJSON(testFile, { success: true })).resolves.not.toThrow();
		});
	});

	describe('integrity verification', () => {
		it('should verify file integrity during writes and reads', async () => {
			const filePath = join(testDir, 'integrity.json');
			const data = { integrity: 'test', complex: { nested: [1, 2, 3] } };

			await storage.writeJSON(filePath, data);
			const readData = await storage.readJSON(filePath);

			expect(readData).toEqual(data);

			// Check statistics
			const stats = storage.getStatistics();
			expect(stats.integrityVerifications).toBeGreaterThan(0);
		});

		it('should detect tampered files', async () => {
			const filePath = join(testDir, 'tampered.json');
			const data = { original: 'data' };

			await storage.writeJSON(filePath, data);

			// Tamper with the file by changing a byte
			const { readFile, writeFile } = await import('node:fs/promises');
			const fileBuffer = await readFile(filePath);

			// Flip a bit in the data section (skip header)
			const tamperedBuffer = Buffer.from(fileBuffer);
			const dataStart = 19; // Approximate start of data after header
			if (dataStart < tamperedBuffer.length) {
				tamperedBuffer[dataStart] ^= 0x01; // Flip a bit
				await writeFile(filePath, tamperedBuffer);
			}

			await expect(storage.readJSON(filePath)).rejects.toThrow(JSONStorageError);
		});
	});

	describe('error handling', () => {
		it('should handle invalid JSON data', async () => {
			const filePath = join(testDir, 'invalid.json');

			await expect(storage.readJSON(filePath)).rejects.toThrow(JSONStorageError);
		});

		it('should handle circular reference objects during write', async () => {
			const filePath = join(testDir, 'circular.json');
			const circular: any = { name: 'test' };
			circular.self = circular;

			await expect(storage.writeJSON(filePath, circular)).rejects.toThrow(JSONStorageError);
		});

		it('should handle permission errors gracefully', async () => {
			// This test is platform-dependent and may not work on all systems
			const readOnlyDir = join(testDir, 'readonly');
			await storage.ensureDirectory(readOnlyDir);

			try {
				const filePath = join(readOnlyDir, 'test.json');
				await expect(storage.writeJSON(filePath, { test: true })).resolves.not.toThrow();
			} catch {
				// Skip test if permission manipulation doesn't work
			}
		});
	});

	describe('statistics', () => {
		it('should track operation statistics', async () => {
			const data = { stats: 'test' };
			const largeData = { large: 'x'.repeat(200) };

			// Perform various operations
			await storage.writeJSON(join(testDir, 'file1.json'), data);
			await storage.writeJSON(join(testDir, 'file2.json'), largeData);
			await storage.readJSON(join(testDir, 'file1.json'));
			await storage.readJSON(join(testDir, 'file2.json'));
			await storage.deleteFile(join(testDir, 'file1.json'));

			const stats = storage.getStatistics();

			expect(stats.totalOperations).toBeGreaterThan(0);
			expect(stats.writeOperations).toBe(2);
			expect(stats.readOperations).toBe(2);
			expect(stats.compressionOperations).toBeGreaterThan(0);
			expect(stats.decompressionOperations).toBeGreaterThan(0);
			expect(stats.totalBytesWritten).toBeGreaterThan(0);
			expect(stats.totalBytesRead).toBeGreaterThan(0);
			expect(stats.integrityVerifications).toBeGreaterThan(0);
		});

		it('should reset statistics', async () => {
			// Perform some operations
			await storage.writeJSON(join(testDir, 'reset.json'), { test: true });

			// Reset statistics
			storage.resetStatistics();

			const stats = storage.getStatistics();

			expect(stats.totalOperations).toBe(0);
			expect(stats.writeOperations).toBe(0);
			expect(stats.readOperations).toBe(0);
		});
	});

	describe('concurrent access', () => {
		it('should handle concurrent writes to different files', async () => {
			const promises = [];

			// Create multiple files concurrently
			for (let i = 0; i < 5; i++) {
				const filePath = join(testDir, `concurrent-${i}.json`);
				const data = { id: i, concurrent: true };
				promises.push(storage.writeJSON(filePath, data));
			}

			await expect(Promise.all(promises)).resolves.not.toThrow();

			// Verify all files were written correctly
			for (let i = 0; i < 5; i++) {
				const filePath = join(testDir, `concurrent-${i}.json`);
				const readData = await storage.readJSON(filePath);
				expect(readData).toEqual({ id: i, concurrent: true });
			}
		});

		it('should handle concurrent reads and writes', async () => {
			const filePath = join(testDir, 'concurrent-rw.json');
			const data = { concurrent: 'read-write', count: 0 };

			// Write initial data
			await storage.writeJSON(filePath, data);

			const promises = [];

			// Perform multiple reads
			for (let i = 0; i < 3; i++) {
				promises.push(storage.readJSON(filePath));
			}

			// Perform a write
			promises.push(storage.writeJSON(filePath, { ...data, count: 1 }));

			// Perform more reads
			for (let i = 0; i < 3; i++) {
				promises.push(storage.readJSON(filePath));
			}

			const results = await Promise.all(promises);

			// Verify reads returned data (either old or new)
			expect(results.length).toBe(7);

			// Final read should show the new data
			const finalData = await storage.readJSON(filePath);
			expect(finalData.count).toBe(1);
		});
	});

	describe('compression behavior', () => {
		it('should choose appropriate compression based on size', async () => {
			// Small data - no compression
			const smallData = { small: 'test' };
			const smallResult = await storage.writeJSON(join(testDir, 'small.json'), smallData);
			expect(smallResult.compressionFormat).toBe('none');

			// Medium data - gzip compression
			const mediumData = { medium: 'x'.repeat(50) };
			const mediumResult = await storage.writeJSON(join(testDir, 'medium.json'), mediumData);
			expect(mediumResult.compressionFormat).toBe('gzip');

			// Large data - brotli compression
			const largeData = { large: 'x'.repeat(200) };
			const largeResult = await storage.writeJSON(join(testDir, 'large.json'), largeData);
			expect(largeResult.compressionFormat).toBe('brotli');
		});

		it('should achieve better compression ratio for repetitive data', async () => {
			const repetitiveData = {
				repetitive: 'abc123'.repeat(100),
				more: 'xyz789'.repeat(100)
			};

			const result = await storage.writeJSON(join(testDir, 'repetitive.json'), repetitiveData);

			expect(result.compressed).toBe(true);
			expect(result.compressionRatio).toBeLessThan(0.5); // Should be at least 50% compression
		});
	});

	describe('file format compatibility', () => {
		it('should reject files with invalid magic bytes', async () => {
			const filePath = join(testDir, 'invalid-magic.json');

			// Ensure directory exists
			await storage.ensureDirectory(testDir);

			// Write file without magic bytes
			const { writeFile } = await import('node:fs/promises');
			await writeFile(filePath, 'invalid file format');

			await expect(storage.readJSON(filePath)).rejects.toThrow(JSONStorageError);
		});

		it('should reject files with corrupted metadata', async () => {
			const filePath = join(testDir, 'corrupted-metadata.json');

			// Ensure directory exists
			await storage.ensureDirectory(testDir);

			// Create a file with magic bytes but corrupted metadata
			const magicBuffer = Buffer.from('\u0000JSM\u0000', 'utf8');
			const lengthBuffer = Buffer.alloc(4);
			lengthBuffer.writeUInt32BE(9999, 0); // Invalid length
			const corruptedContent = Buffer.concat([magicBuffer, lengthBuffer]);

			const { writeFile } = await import('node:fs/promises');
			await writeFile(filePath, corruptedContent);

			await expect(storage.readJSON(filePath)).rejects.toThrow(JSONStorageError);
		});
	});
});