/**
 * Comprehensive unit tests for PageCache
 * Tests edge cases, error scenarios, and boundary conditions
 */

import { promises as fs } from "node:fs";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PageCache, CacheOptions, createPageCache, createProductCache, createImageCache } from "./index";

// Mock fs promises
vi.mock("fs", () => ({
	promises: {
		access: vi.fn(),
		mkdir: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		readdir: vi.fn(),
		unlink: vi.fn(),
		stat: vi.fn(),
	},
}));

// Mock crypto
vi.mock("crypto", () => ({
	createHash: vi.fn(() => ({
		update: vi.fn().mockReturnThis(),
		digest: vi.fn(() => "abcdef1234567890abcdef1234567890abcdef12"),
	})),
}));

// Mock path
vi.mock("path", () => ({
	join: vi.fn((...args) => args.join("/")),
}));

describe("PageCache", () => {
	let cache: PageCache;
	let mockFs: typeof fs;

	beforeEach(() => {
		vi.clearAllMocks();
		mockFs = vi.mocked(fs);

		// Default successful mock implementations
		mockFs.access.mockResolvedValue();
		mockFs.mkdir.mockResolvedValue();
		mockFs.readFile.mockResolvedValue("{}");
		mockFs.writeFile.mockResolvedValue();
		mockFs.readdir.mockResolvedValue([]);
		mockFs.unlink.mockResolvedValue();
		mockFs.stat.mockResolvedValue({
			size: 1024,
			isFile: () => true,
			isDirectory: () => false,
		} as any);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Constructor and initialization", () => {
		it("should initialize with default options", () => {
			cache = new PageCache();
			expect(cache).toBeDefined();
		});

		it("should initialize with custom options", () => {
			const options: CacheOptions = {
				cacheDir: "/custom/cache",
				ttl: 7_200_000,
				maxSize: 200 * 1024 * 1024,
				compressionEnabled: true,
			};
			cache = new PageCache(options);
			expect(cache).toBeDefined();
		});

		it("should create cache directory on initialization", async () => {
			mockFs.access.mockRejectedValue(new Error("Directory does not exist"));

			cache = new PageCache({ cacheDir: "/test/cache" });

			await new Promise(resolve => setTimeout(resolve, 0)); // Allow async initialization

			expect(mockFs.mkdir).toHaveBeenCalledWith("/test/cache", { recursive: true });
		});

		it("should not create directory if it already exists", async () => {
			cache = new PageCache({ cacheDir: "/existing/cache" });

			await new Promise(resolve => setTimeout(resolve, 0));

			expect(mockFs.mkdir).not.toHaveBeenCalled();
		});
	});

	describe("Cache operations - basic get/set", () => {
		beforeEach(() => {
			cache = new PageCache({ cacheDir: "/test/cache" });
		});

		it("should store and retrieve data successfully", async () => {
			const testData = { message: "hello world" };
			const mockEntry = {
				data: testData,
				createdAt: Date.now(),
				expiresAt: Date.now() + 3_600_000,
				size: 100,
			};

			mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockEntry));

			await cache.set("test-key", testData);
			const result = await cache.get("test-key");

			expect(result).toEqual(testData);
			expect(mockFs.writeFile).toHaveBeenCalled();
		});

		it("should return null for non-existent key", async () => {
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			const result = await cache.get("non-existent-key");

			expect(result).toBeNull();
		});

		it("should return null for expired entries", async () => {
			const expiredEntry = {
				data: { message: "expired" },
				createdAt: Date.now() - 7_200_000, // 2 hours ago
				expiresAt: Date.now() - 3_600_000, // 1 hour ago (expired)
				size: 100,
			};

			mockFs.readFile
				.mockResolvedValueOnce(JSON.stringify(expiredEntry))
				.mockResolvedValueOnce(""); // For unlink operation

			const result = await cache.get("expired-key");

			expect(result).toBeNull();
			expect(mockFs.unlink).toHaveBeenCalled(); // Should delete expired entry
		});

		it("should handle corrupted cache files gracefully", async () => {
			mockFs.readFile.mockResolvedValue("invalid json content");

			const result = await cache.get("corrupted-key");

			expect(result).toBeNull();
		});

		it("should handle custom TTL", async () => {
			const testData = { message: "custom ttl" };
			const now = Date.now();

			vi.spyOn(Date, "now").mockReturnValue(now);

			await cache.set("custom-ttl-key", testData, 7_200_000); // 2 hours

			const writeCall = mockFs.writeFile.mock.calls[0];
			const entry = JSON.parse(writeCall[1] as string);

			expect(entry.expiresAt).toBe(now + 7_200_000);

			vi.restoreAllMocks();
		});
	});

	describe("Cache operations - delete", () => {
		beforeEach(() => {
			cache = new PageCache({ cacheDir: "/test/cache" });
		});

		it("should delete existing cache entry", async () => {
			await cache.delete("test-key");

			expect(mockFs.unlink).toHaveBeenCalled();
		});

		it("should handle deletion of non-existent key gracefully", async () => {
			mockFs.unlink.mockRejectedValue(new Error("File not found"));

			await expect(cache.delete("non-existent")).resolves.not.toThrow();
		});
	});

	describe("Cache operations - clear", () => {
		beforeEach(() => {
			cache = new PageCache({ cacheDir: "/test/cache" });
		});

		it("should clear all cache entries", async () => {
			mockFs.readdir.mockResolvedValue(["file1.json", "file2.json", "non-json.txt"]);

			await cache.clear();

			expect(mockFs.unlink).toHaveBeenCalledTimes(2);
			expect(mockFs.unlink).toHaveBeenCalledWith("/test/cache/file1.json");
			expect(mockFs.unlink).toHaveBeenCalledWith("/test/cache/file2.json");
		});

		it("should handle empty cache directory", async () => {
			mockFs.readdir.mockResolvedValue([]);

			await cache.clear();

			expect(mockFs.unlink).not.toHaveBeenCalled();
		});

		it("should handle errors during clear operation", async () => {
			mockFs.readdir.mockRejectedValue(new Error("Permission denied"));

			await expect(cache.clear()).rejects.toThrow("Failed to clear cache");
		});
	});

	describe("Cache operations - cleanup", () => {
		beforeEach(() => {
			cache = new PageCache({ cacheDir: "/test/cache" });
		});

		it("should remove expired entries", async () => {
			const now = Date.now();
			const expiredEntry = {
				data: { message: "expired" },
				createdAt: now - 7_200_000,
				expiresAt: now - 3_600_000, // expired
				size: 100,
			};
			const validEntry = {
				data: { message: "valid" },
				createdAt: now - 1_800_000,
				expiresAt: now + 1_800_000, // still valid
				size: 100,
			};

			mockFs.readdir.mockResolvedValue(["expired.json", "valid.json", "invalid.txt"]);
			mockFs.readFile
				.mockResolvedValueOnce(JSON.stringify(expiredEntry))
				.mockResolvedValueOnce(JSON.stringify(validEntry));

			await cache.cleanup();

			expect(mockFs.unlink).toHaveBeenCalledWith("/test/cache/expired.json");
			expect(mockFs.unlink).not.toHaveBeenCalledWith("/test/cache/valid.json");
		});

		it("should remove corrupted files during cleanup", async () => {
			mockFs.readdir.mockResolvedValue(["corrupted.json"]);
			mockFs.readFile.mockRejectedValue(new Error("Corrupted file"));

			await cache.cleanup();

			expect(mockFs.unlink).toHaveBeenCalledWith("/test/cache/corrupted.json");
		});
	});

	describe("Cache statistics", () => {
		beforeEach(() => {
			cache = new PageCache({ cacheDir: "/test/cache" });
		});

		it("should return correct statistics for valid cache", async () => {
			mockFs.readdir.mockResolvedValue(["file1.json", "file2.json", "file3.txt"]);
			mockFs.stat
				.mockResolvedValueOnce({ size: 1024 } as any)
				.mockResolvedValueOnce({ size: 2048 } as any)
				.mockRejectedValueOnce(new Error("Stat error"));

			const stats = await cache.getStats();

			expect(stats).toEqual({
				totalFiles: 2,
				totalSize: 3072,
				cacheDir: "/test/cache",
				error: undefined,
			});
		});

		it("should handle inaccessible cache directory", async () => {
			mockFs.readdir.mockRejectedValue(new Error("Permission denied"));

			const stats = await cache.getStats();

			expect(stats.totalFiles).toBe(0);
			expect(stats.totalSize).toBe(0);
			expect(stats.error).toBeDefined();
		});
	});

	describe("Cache size management", () => {
		beforeEach(() => {
			cache = new PageCache({
				cacheDir: "/test/cache",
				maxSize: 1024 * 1024, // 1MB
			});
		});

		it("should trigger cleanup when cache exceeds size limit", async () => {
			const largeEntry = {
				data: { message: "large data".repeat(1000) },
				createdAt: Date.now(),
				expiresAt: Date.now() + 3_600_000,
				size: 1024 * 1024, // 1MB
			};

			mockFs.readFile.mockResolvedValue(JSON.stringify(largeEntry));
			mockFs.stat.mockResolvedValue({ size: 1024 * 1024 } as any);
			mockFs.readdir.mockResolvedValue(["large-file.json"]);

			await cache.set("large-key", largeEntry.data);

			// Should trigger eviction
			expect(mockFs.unlink).toHaveBeenCalled();
		});

		it("should remove oldest entries during LRU eviction", async () => {
			const now = Date.now();
			const oldEntry = {
				data: { message: "old" },
				createdAt: now - 3_600_000,
				expiresAt: now + 3_600_000,
				size: 500,
			};
			const newEntry = {
				data: { message: "new" },
				createdAt: now,
				expiresAt: now + 3_600_000,
				size: 500,
			};

			mockFs.readdir.mockResolvedValue(["old.json", "new.json"]);
			mockFs.readFile
				.mockResolvedValueOnce(JSON.stringify(oldEntry))
				.mockResolvedValueOnce(JSON.stringify(newEntry));
			mockFs.stat
				.mockResolvedValueOnce({ size: 500, ctime: new Date(now - 3_600_000) } as any)
				.mockResolvedValueOnce({ size: 500, ctime: new Date(now) } as any);

			// Simulate cache size limit exceeded
			await cache["checkCacheSize"]();

			// Should remove oldest entry first
			expect(mockFs.unlink).toHaveBeenCalled();
		});
	});

	describe("Metadata operations", () => {
		beforeEach(() => {
			cache = new PageCache({ cacheDir: "/test/cache" });
		});

		it("should store and retrieve data with metadata", async () => {
			const testData = { message: "test" };
			const metadata = { source: "scraper", version: 1 };
			const mockEntry = {
				data: testData,
				createdAt: Date.now(),
				expiresAt: Date.now() + 3_600_000,
				size: 100,
				metadata,
			};

			mockFs.readFile.mockResolvedValue(JSON.stringify(mockEntry));

			await cache.setWithMetadata("test-key", testData, metadata);
			const result = await cache.getWithMetadata("test-key");

			expect(result).toEqual({
				data: testData,
				metadata,
			});
		});

		it("should return null for metadata entry that does not exist", async () => {
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			const result = await cache.getWithMetadata("non-existent");

			expect(result).toBeNull();
		});
	});

	describe("Utility operations", () => {
		beforeEach(() => {
			cache = new PageCache({ cacheDir: "/test/cache" });
		});

		it("should check if key exists and is not expired", async () => {
			const validEntry = {
				data: { message: "valid" },
				createdAt: Date.now(),
				expiresAt: Date.now() + 3_600_000,
				size: 100,
			};

			mockFs.readFile.mockResolvedValue(JSON.stringify(validEntry));

			const exists = await cache.has("valid-key");

			expect(exists).toBe(true);
		});

		it("should return false for expired keys", async () => {
			const expiredEntry = {
				data: { message: "expired" },
				createdAt: Date.now() - 7_200_000,
				expiresAt: Date.now() - 3_600_000,
				size: 100,
			};

			mockFs.readFile
				.mockResolvedValueOnce(JSON.stringify(expiredEntry))
				.mockResolvedValueOnce(""); // For unlink

			const exists = await cache.has("expired-key");

			expect(exists).toBe(false);
		});

		it("should get remaining TTL for key", async () => {
			const entry = {
				data: { message: "test" },
				createdAt: Date.now(),
				expiresAt: Date.now() + 60_000, // 1 minute from now
				size: 100,
			};

			mockFs.readFile.mockResolvedValue(JSON.stringify(entry));

			const ttl = await cache.getTTL("test-key");

			expect(ttl).toBeGreaterThan(0);
			expect(ttl).toBeLessThanOrEqual(60_000);
		});

		it("should return 0 TTL for non-existent keys", async () => {
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			const ttl = await cache.getTTL("non-existent");

			expect(ttl).toBe(0);
		});

		it("should extend TTL for existing keys", async () => {
			const entry = {
				data: { message: "test" },
				createdAt: Date.now() - 30_000,
				expiresAt: Date.now() + 30_000, // expires in 30 seconds
				size: 100,
			};

			mockFs.readFile.mockResolvedValue(JSON.stringify(entry));

			await cache.touch("test-key", 60_000); // Extend to 1 minute

			const writeCall = mockFs.writeFile.mock.calls[0];
			const updatedEntry = JSON.parse(writeCall[1] as string);

			expect(updatedEntry.expiresAt).toBeGreaterThan(Date.now() + 50_000);
		});
	});

	describe("Batch operations", () => {
		beforeEach(() => {
			cache = new PageCache({ cacheDir: "/test/cache" });
		});

		it("should perform multiple get operations", async () => {
			const entries = {
				key1: { data: "value1", exists: true },
				key2: { data: "value2", exists: true },
				key3: { exists: false }, // non-existent
			};

			mockFs.readFile
				.mockImplementation((path) => {
					const key = path.toString().split("/").pop()?.split("_")[0];
					if (key && entries[key as keyof typeof entries]?.exists) {
						const entry = entries[key as keyof typeof entries];
						return Promise.resolve(JSON.stringify({
							data: entry.data,
							createdAt: Date.now(),
							expiresAt: Date.now() + 3_600_000,
							size: 100,
						}));
					}
					return Promise.reject(new Error("File not found"));
				});

			const results = await cache.mget(["key1", "key2", "key3"]);

			expect(results.get("key1")).toBe("value1");
			expect(results.get("key2")).toBe("value2");
			expect(results.get("key3")).toBeNull();
		});

		it("should perform multiple set operations", async () => {
			const entries = [
				{ key: "key1", data: "value1" },
				{ key: "key2", data: "value2" },
				{ key: "key3", data: "value3", ttl: 7_200_000 },
			];

			await cache.mset(entries);

			expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
		});

		it("should perform multiple delete operations", async () => {
			await cache.mdelete(["key1", "key2", "key3"]);

			expect(mockFs.unlink).toHaveBeenCalledTimes(3);
		});
	});

	describe("Health check", () => {
		beforeEach(() => {
			cache = new PageCache({ cacheDir: "/test/cache" });
		});

		it("should return healthy status for working cache", async () => {
			mockFs.readdir.mockResolvedValue(["test.json"]);

			const health = await cache.healthCheck();

			expect(health.healthy).toBe(true);
			expect(health.issues).toHaveLength(0);
		});

		it("should detect issues with cache directory access", async () => {
			mockFs.access.mockRejectedValue(new Error("Permission denied"));

			const health = await cache.healthCheck();

			expect(health.healthy).toBe(false);
			expect(health.issues.length).toBeGreaterThan(0);
		});

		it("should detect write access issues", async () => {
			mockFs.writeFile.mockRejectedValue(new Error("Write permission denied"));

			const health = await cache.healthCheck();

			expect(health.healthy).toBe(false);
			expect(health.issues.some(issue => issue.includes("health-check"))).toBe(true);
		});
	});

	describe("Key and filename handling", () => {
		beforeEach(() => {
			cache = new PageCache({ cacheDir: "/test/cache" });
		});

		it("should sanitize keys with special characters", async () => {
			const specialKey = "key with spaces & special@chars#";
			const testData = { message: "test" };

			await cache.set(specialKey, testData);

			const writeCall = mockFs.writeFile.mock.calls[0];
			const filePath = writeCall[0];

			expect(filePath).toMatch(/key_with_spaces___special_chars_/);
			expect(filePath).toMatch(/\.json$/);
		});

		it("should extract keys from filenames correctly", async () => {
			const mockFiles = [
				"normal_key_abcdef1234567890abcdef1234567890abcdef12.json",
				"key-with-dashes_a1b2c3d4e5f67890123456789012345.json",
				"key_with_underscores_fedcba0987654321fedcba0987654321.json",
				"invalid-file.txt",
				"malformed.json",
				"no_hash_here.json",
			];

			mockFs.readdir.mockResolvedValue(mockFiles);

			const keys = await cache.getKeys();

			expect(keys).toContain("normal_key");
			expect(keys).toContain("key-with-dashes");
			expect(keys).toContain("key_with_underscores");
			expect(keys).not.toContain("invalid-file");
			expect(keys).not.toContain("malformed");
			expect(keys).not.toContain("no_hash_here");
		});
	});

	describe("Factory functions", () => {
		it("should create basic page cache", () => {
			const cache = createPageCache({ cacheDir: "/cache" });
			expect(cache).toBeInstanceOf(PageCache);
		});

		it("should create product cache with default options", () => {
			const cache = createProductCache();
			expect(cache).toBeInstanceOf(PageCache);
		});

		it("should create product cache with custom options", () => {
			const cache = createProductCache({
				cacheDir: "/custom",
				ttl: 14_400_000, // 4 hours
				maxSize: 300 * 1024 * 1024, // 300MB
			});
			expect(cache).toBeInstanceOf(PageCache);
		});

		it("should create image cache with default options", () => {
			const cache = createImageCache();
			expect(cache).toBeInstanceOf(PageCache);
		});

		it("should create image cache with custom options", () => {
			const cache = createImageCache({
				cacheDir: "/images",
				ttl: 172_800_000, // 48 hours
				maxSize: 1024 * 1024 * 1024, // 1GB
			});
			expect(cache).toBeInstanceOf(PageCache);
		});
	});

	describe("Error handling and edge cases", () => {
		beforeEach(() => {
			cache = new PageCache({ cacheDir: "/test/cache" });
		});

		it("should handle circular reference data serialization", async () => {
			const circularData: any = { name: "test" };
			circularData.self = circularData;

			await expect(cache.set("circular", circularData)).rejects.toThrow();
		});

		it("should handle extremely large data objects", async () => {
			const largeData = { data: "x".repeat(10 * 1024 * 1024) }; // 10MB string

			await cache.set("large", largeData);

			const writeCall = mockFs.writeFile.mock.calls[0];
			expect(writeCall[1]).toBeDefined();
		});

		it("should handle concurrent access to same key", async () => {
			const testData = { message: "concurrent test" };

			// Simulate concurrent sets
			const promises = Array.from({length: 10}).fill(null).map((_, i) =>
				cache.set(`key-${i}`, { ...testData, index: i }),
			);

			await Promise.all(promises);

			expect(mockFs.writeFile).toHaveBeenCalledTimes(10);
		});

		it("should handle cache operations during rapid succession", async () => {
			const promises = Array.from({length: 100}).fill(null).map((_, i) =>
				cache.set(`rapid-${i}`, { index: i }),
			);

			await Promise.all(promises);

			expect(mockFs.writeFile).toHaveBeenCalledTimes(100);
		});

		it("should handle zero and negative TTL values", async () => {
			const testData = { message: "zero ttl" };

			await cache.set("zero-ttl", testData, 0);

			const writeCall = mockFs.writeFile.mock.calls[0];
			const entry = JSON.parse(writeCall[1] as string);

			expect(entry.expiresAt).toBeLessThanOrEqual(Date.now() + 1000); // Should be expired immediately
		});

		it("should handle null and undefined data", async () => {
			await cache.set("null-data", null);
			await cache.set("undefined-data", undefined);

			expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
		});

		it("should handle file system permission errors gracefully", async () => {
			mockFs.mkdir.mockRejectedValue(new Error("EACCES: permission denied"));

			expect(() => new PageCache({ cacheDir: "/root/cache" })).not.toThrow();
		});
	});
});