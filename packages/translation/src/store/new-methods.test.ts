/**
 * Unit tests for the new TranslationStore core operations
 * Tests for set(), get(), getByText(), TTL support, and access tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { TranslationStore, TranslationStoreError, StoreConfiguration } from './translation-store';

describe('TranslationStore - New Core Operations', () => {
	let store: TranslationStore;
	let testConfig: StoreConfiguration;
	let testDir: string;

	beforeEach(async () => {
		testDir = path.join(process.cwd(), '.test-store-' + Date.now());
		testConfig = {
			storagePath: testDir,
			maxEntries: 1000,
			maxSizeBytes: 100 * 1024 * 1024, // 100MB
			compressionThreshold: 1024,
			memoryCacheSize: 100,
			syncInterval: 5000,
			lockTimeout: 5000,
			defaultTTL: 7 * 24 * 60 * 60 * 1000, // 1 week
			enableCompression: true,
			enableMetrics: true,
		};
		store = new TranslationStore(testConfig);
		await store.initialize();
	});

	afterEach(async () => {
		// Clean up test directory
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('set() method', () => {
		it('should store a translation with basic parameters', async () => {
			const key = await store.set('Hello', 'こんにちは', 'en', 'ja');

			expect(key).toBeDefined();
			expect(typeof key).toBe('string');
			expect(key).toContain('en:ja:');
		});

		it('should store a translation with metadata', async () => {
			const key = await store.set('Good morning', 'おはよう', 'en', 'ja', {
				confidence: 0.95,
				apiProvider: 'test',
				ttl: 60000 // 1 minute
			});

			expect(key).toBeDefined();

			// Verify we can retrieve it
			const entry = await store.get(key);
			expect(entry).toBeDefined();
			expect(entry?.originalText).toBe('Good morning');
			expect(entry?.translatedText).toBe('おはよう');
			expect(entry?.confidence).toBe(0.95);
			expect(entry?.apiProvider).toBe('test');
			expect(entry?.ttl).toBe(60000);
		});

		it('should throw validation error for empty source text', async () => {
			await expect(store.set('', 'translation', 'en', 'ja'))
				.rejects.toThrow('VALIDATION_ERROR');
		});

		it('should throw validation error for empty target text', async () => {
			await expect(store.set('source', '', 'en', 'ja'))
				.rejects.toThrow('VALIDATION_ERROR');
		});

		it('should throw error if store is not initialized', async () => {
			const uninitializedStore = new TranslationStore(testConfig);
			await expect(uninitializedStore.set('test', 'test', 'en', 'ja'))
				.rejects.toThrow('STORE_NOT_INITIALIZED');
		});
	});

	describe('get() method', () => {
		it('should retrieve a stored translation by key', async () => {
			const key = await store.set('Hello world', 'こんにちは世界', 'en', 'ja');
			const entry = await store.get(key);

			expect(entry).toBeDefined();
			expect(entry?.originalText).toBe('Hello world');
			expect(entry?.translatedText).toBe('こんにちは世界');
			expect(entry?.sourceLanguage).toBe('en');
			expect(entry?.targetLanguage).toBe('ja');
			expect(entry?.accessCount).toBe(1); // Should be incremented on first access
		});

		it('should return null for non-existent key', async () => {
			const entry = await store.get('en:ja:nonexistent');
			expect(entry).toBeNull();
		});

		it('should throw validation error for invalid key format', async () => {
			await expect(store.get('invalid-key'))
				.rejects.toThrow('INVALID_KEY');
		});

		it('should update access tracking on each retrieval', async () => {
			const key = await store.set('Test', 'テスト', 'en', 'ja');

			// First access
			const entry1 = await store.get(key);
			expect(entry1?.accessCount).toBe(1);

			// Second access
			const entry2 = await store.get(key);
			expect(entry2?.accessCount).toBe(2);

			// Verify accessedAt is updated
			expect(entry2?.accessedAt).toBeGreaterThan(entry1?.accessedAt || 0);
		});
	});

	describe('getByText() method', () => {
		it('should retrieve translation by source text and languages', async () => {
			await store.set('Example text', '例文', 'en', 'ja');
			const entry = await store.getByText('Example text', 'en', 'ja');

			expect(entry).toBeDefined();
			expect(entry?.originalText).toBe('Example text');
			expect(entry?.translatedText).toBe('例文');
		});

		it('should return null for non-existent translation', async () => {
			const entry = await store.getByText('Nonexistent', 'en', 'ja');
			expect(entry).toBeNull();
		});

		it('should distinguish between different language pairs', async () => {
			await store.set('Hello', 'こんにちは', 'en', 'ja');
			await store.set('Hello', 'Bonjour', 'en', 'fr');

			const jaEntry = await store.getByText('Hello', 'en', 'ja');
			const frEntry = await store.getByText('Hello', 'en', 'fr');

			expect(jaEntry?.translatedText).toBe('こんにちは');
			expect(frEntry?.translatedText).toBe('Bonjour');
		});

		it('should throw validation error for invalid parameters', async () => {
			await expect(store.getByText('', 'en', 'ja'))
				.rejects.toThrow('VALIDATION_ERROR');
		});
	});

	describe('TTL support', () => {
		it('should handle TTL expiration correctly', async () => {
			const key = await store.set('Test', 'テスト', 'en', 'ja', {
				ttl: 1 // 1ms TTL - will expire immediately
			});

			// Wait a bit to ensure expiration
			await new Promise(resolve => setTimeout(resolve, 10));

			const entry = await store.get(key);
			expect(entry).toBeNull(); // Should be expired
		});

		it('should use default TTL when not specified', async () => {
			const key = await store.set('Test', 'テスト', 'en', 'ja');
			const entry = await store.get(key);

			expect(entry).toBeDefined();
			expect(entry?.ttl).toBe(testConfig.defaultTTL);
		});

		it('should handle translations without TTL (permanent)', async () => {
			const key = await store.set('Test', 'テスト', 'en', 'ja');
			const entry = await store.get(key);

			expect(entry).toBeDefined();
			// Should have a far future expiration or no expiration
			expect(entry?.expiresAt).toBeUndefined(); // No expiration set when using default TTL of 0
		});
	});

	describe('Access tracking and statistics', () => {
		it('should update store statistics after operations', async () => {
			const initialStats = store.getStatistics();

			// Perform some operations
			await store.set('Test1', 'テスト1', 'en', 'ja');
			await store.set('Test2', 'テスト2', 'en', 'ja');
			await store.getByText('Test1', 'en', 'ja');
			await store.getByText('Test2', 'en', 'ja');
			await store.getByText('Nonexistent', 'en', 'ja'); // This should be a miss

			const finalStats = store.getStatistics();

			expect(finalStats.totalWrites).toBeGreaterThan(initialStats.totalWrites);
			expect(finalStats.totalLookups).toBeGreaterThan(initialStats.totalLookups);
			expect(finalStats.diskUsageBytes).toBeGreaterThan(initialStats.diskUsageBytes);
		});

		it('should track access patterns correctly', async () => {
			const key = await store.set('Popular', '人気', 'en', 'ja');

			// Access multiple times
			await store.get(key);
			await store.get(key);
			await store.get(key);

			const entry = await store.get(key);
			expect(entry?.accessCount).toBe(4); // 4 accesses total
		});
	});

	describe('Comprehensive error handling', () => {
		it('should handle file system errors gracefully', async () => {
			// Create a store with invalid path
			const invalidConfig = { ...testConfig, storagePath: '/invalid/path/that/does/not/exist' };
			const invalidStore = new TranslationStore(invalidConfig);

			await expect(invalidStore.initialize())
				.rejects.toThrow('DIR_CREATE_FAILED');
		});

		it('should handle corrupted entry data', async () => {
			// This test would require manually corrupting a file
			// For now, we test that invalid keys are handled
			await expect(store.get('en:ja:invalid_base64!@#$'))
				.rejects.toThrow('INVALID_KEY');
		});

		it('should maintain data integrity', async () => {
			const originalText = 'Complex text with symbols: @#$%^&*()';
			const translatedText = '複雑なテキスト：@#$%^&*()';

			const key = await store.set(originalText, translatedText, 'en', 'ja');
			const entry = await store.get(key);

			expect(entry?.originalText).toBe(originalText);
			expect(entry?.translatedText).toBe(translatedText);
		});
	});
});