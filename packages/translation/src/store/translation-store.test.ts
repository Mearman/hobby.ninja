/* eslint-disable barrel-files/avoid-namespace-import, @typescript-eslint/no-magic-numbers */
/**
 * Unit tests for TranslationStore core infrastructure
 */

import * as fs from "node:fs/promises";
import path from "node:path";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { TranslationStore, TranslationStoreError, StoreConfiguration } from "./translation-store";

describe("TranslationStore - Core Infrastructure", () => {
	let store: TranslationStore;
	let testConfig: StoreConfiguration;
	let testDir: string;

	beforeEach(async () => {
		testDir = path.join(process.cwd(), ".test-store-" + Date.now());
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
	});

	afterEach(async () => {
		// Clean up test directory
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Constructor and Configuration", () => {
		it("should create store with valid configuration", () => {
			expect(store).toBeDefined();
			expect(store.isReady()).toBe(false);
			expect(store.getConfiguration()).toEqual(testConfig);
		});

		it("should throw error for invalid storage path", () => {
			expect(() => {
				new TranslationStore({
					...testConfig,
					storagePath: "",
				});
			}).toThrow(TranslationStoreError);
		});

		it("should throw error for negative max entries", () => {
			expect(() => {
				new TranslationStore({
					...testConfig,
					maxEntries: -1,
				});
			}).toThrow(TranslationStoreError);
		});

		it("should throw error for negative max size", () => {
			expect(() => {
				new TranslationStore({
					...testConfig,
					maxSizeBytes: -1,
				});
			}).toThrow(TranslationStoreError);
		});
	});

	describe("Store Initialization", () => {
		it("should initialize successfully", async () => {
			await store.initialize();
			expect(store.isReady()).toBe(true);

			// Check that directory was created
			const stats = await fs.stat(testDir);
			expect(stats.isDirectory()).toBe(true);
		});

		it("should create metadata file on first initialization", async () => {
			await store.initialize();

			const metadataPath = path.join(testDir, "metadata.json");
			const stats = await fs.stat(metadataPath);
			expect(stats.isFile()).toBe(true);

			const metadataData = await fs.readFile(metadataPath, "utf8");
			const metadata = JSON.parse(metadataData);
			expect(metadata.version).toBe("1.0.0");
			expect(metadata.storeId).toBeDefined();
		});

		it("should load existing metadata on subsequent initialization", async () => {
			await store.initialize();
			const health1 = store.getHealth();

			// Create new instance with same config
			const store2 = new TranslationStore(testConfig);
			await store2.initialize();

			const health2 = store2.getHealth();
			expect(health1.status).toBe("healthy");
			expect(health2.status).toBe("healthy");
		});
	});

	describe("Statistics and Health", () => {
		it("should return initial statistics", () => {
			const stats = store.getStatistics();
			expect(stats.totalEntries).toBe(0);
			expect(stats.activeEntries).toBe(0);
			expect(stats.expiredEntries).toBe(0);
			expect(stats.diskUsageBytes).toBe(0);
			expect(stats.hitRate).toBe(0);
		});

		it("should return initial health status", () => {
			const health = store.getHealth();
			expect(health.status).toBe("healthy");
			expect(health.errors).toHaveLength(0);
			expect(health.warnings).toHaveLength(0);
			expect(health.lockStatus).toBe("unlocked");
		});
	});

	describe("Key Generation", () => {
		it("should generate unique keys based on content", () => {
			const key1 = store.generateKey("ja", "en", "こんにちは");
			const key2 = store.generateKey("ja", "en", "こんにちは");
			const key3 = store.generateKey("ja", "en", "さようなら");

			expect(key1).toBe(key2);
			expect(key1).not.toBe(key3);
			expect(key1).toMatch(/^ja:en:[a-f0-9]{64}$/);
		});

		it("should generate different keys for different language pairs", () => {
			const text = "こんにちは";
			const key1 = store.generateKey("ja", "en", text);
			const key2 = store.generateKey("ja", "fr", text);

			expect(key1).not.toBe(key2);
		});
	});

	describe("Hash Sharding", () => {
		it("should generate consistent shard paths", () => {
			const hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

			// Access private method via type assertion for testing
			const storeAny = store as any;
			const [shard, filename] = storeAny.generateShardPath(hash);

			expect(shard).toBe("ab");
			expect(filename).toBe(`${hash}.json`);
		});

		it("should generate correct file paths", () => {
			const hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

			// Access private method via type assertion for testing
			const storeAny = store as any;
			const filePath = storeAny.getFilePath(hash);

			const expectedPath = path.join(testDir, "ab", `${hash}.json`);
			expect(filePath).toBe(expectedPath);
		});
	});
});