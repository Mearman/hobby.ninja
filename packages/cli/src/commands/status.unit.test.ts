/**
 * Comprehensive unit tests for status command
 * Tests edge cases, error scenarios, and boundary conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PageCache } from "../cache";

import { getStatusCommand } from "./status";

// Mock dependencies
vi.mock("../cache");

// Mock console methods
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

describe("getStatusCommand", () => {
	let mockCache: PageCache;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock cache
		mockCache = {
			getStats: vi.fn().mockResolvedValue({
				totalFiles: 100,
				totalSize: 50 * 1024 * 1024, // 50MB
				cacheDir: "./.cache",
			}),
			getKeys: vi.fn().mockResolvedValue(["key1", "key2", "key3"]),
			getTTL: vi.fn().mockResolvedValue(3_600_000),
			has: vi.fn().mockResolvedValue(true),
			healthCheck: vi.fn().mockResolvedValue({
				healthy: true,
				issues: [],
			}),
		} as any;

		(PageCache as any).mockImplementation(() => mockCache);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		mockConsoleLog.mockClear();
		mockConsoleError.mockClear();
	});

	describe("Basic functionality", () => {
		it("should display general status for all scrapers", async () => {
			const options = {};

			await getStatusCommand(options);

			expect(PageCache).toHaveBeenCalledTimes(3); // For each scraper
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("SCAPING STATUS"),
			);
		});

		it("should display status for specific scraper", async () => {
			const options = { scraper: "bandai" };

			await getStatusCommand(options);

			expect(PageCache).toHaveBeenCalledTimes(1);
			expect(PageCache).toHaveBeenCalledWith({
				cacheDir: "./.cache/bandai",
			});
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Bandai Scraper Status"),
			);
		});

		it("should display cache statistics when requested", async () => {
			const options = { cacheStats: true };

			await getStatusCommand(options);

			expect(mockCache.getStats).toHaveBeenCalledTimes(3); // For each scraper
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("CACHE STATISTICS"),
			);
		});

		it("should show health check results", async () => {
			const options = { healthCheck: true };

			await getStatusCommand(options);

			expect(mockCache.healthCheck).toHaveBeenCalledTimes(3);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("HEALTH CHECK"),
			);
		});
	});

	describe("Multiple scraper status", () => {
		const scrapers = ["bandai", "gundam-info", "dalong"];

		it("should display status for all configured scrapers", async () => {
			const options = {};

			await getStatusCommand(options);

			for (const scraper of scrapers) {
				expect(mockConsoleLog).toHaveBeenCalledWith(
					expect.stringContaining(scraper.toUpperCase()),
				);
			}
		});

		it("should handle missing scraper caches gracefully", async () => {
			mockCache.getStats.mockRejectedValue(new Error("Cache not found"));

			const options = {};

			await getStatusCommand(options);

			expect(mockConsoleError).toHaveBeenCalled();
			// Should continue with other scrapers
		});

		it("should display different cache sizes for different scrapers", async () => {
			mockCache.getStats
				.mockResolvedValueOnce({ totalFiles: 50, totalSize: 25 * 1024 * 1024 }) // bandai
				.mockResolvedValueOnce({ totalFiles: 75, totalSize: 40 * 1024 * 1024 }) // gundam-info
				.mockResolvedValueOnce({ totalFiles: 25, totalSize: 15 * 1024 * 1024 }); // dalong

			const options = { cacheStats: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("50 files"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("75 files"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("25 files"),
			);
		});
	});

	describe("Cache statistics", () => {
		it("should display detailed cache statistics", async () => {
			mockCache.getStats.mockResolvedValue({
				totalFiles: 100,
				totalSize: 50 * 1024 * 1024,
				cacheDir: "./.cache/bandai",
			});

			const options = { scraper: "bandai", cacheStats: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("100 files"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("50.00MB"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("./.cache/bandai"),
			);
		});

		it("should handle empty cache statistics", async () => {
			mockCache.getStats.mockResolvedValue({
				totalFiles: 0,
				totalSize: 0,
				cacheDir: "./.cache/empty",
			});

			const options = { scraper: "empty", cacheStats: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("0 files"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("0.00MB"),
			);
		});

		it("should handle cache statistics errors", async () => {
			mockCache.getStats.mockRejectedValue(new Error("Permission denied"));

			const options = { scraper: "bandai", cacheStats: true };

			await getStatusCommand(options);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to get cache statistics"),
			);
		});

		it("should calculate average file size", async () => {
			mockCache.getStats.mockResolvedValue({
				totalFiles: 10,
				totalSize: 1024 * 1024, // 1MB
			});

			const options = { scraper: "bandai", cacheStats: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("102.40KB"), // Average: 1MB / 10 files
			);
		});
	});

	describe("Health check functionality", () => {
		it("should display healthy status", async () => {
			mockCache.healthCheck.mockResolvedValue({
				healthy: true,
				issues: [],
			});

			const options = { scraper: "bandai", healthCheck: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("✅ Healthy"),
			);
		});

		it("should display unhealthy status with issues", async () => {
			mockCache.healthCheck.mockResolvedValue({
				healthy: false,
				issues: [
					"Cache directory not writable",
					"Disk space low",
					"Corrupted cache entries detected",
				],
			});

			const options = { scraper: "bandai", healthCheck: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("❌ Unhealthy"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Cache directory not writable"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Disk space low"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Corrupted cache entries detected"),
			);
		});

		it("should handle health check errors", async () => {
			mockCache.healthCheck.mockRejectedValue(new Error("Health check failed"));

			const options = { scraper: "bandai", healthCheck: true };

			await getStatusCommand(options);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Health check failed"),
			);
		});

		it("should display mixed health statuses across scrapers", async () => {
			mockCache.healthCheck
				.mockResolvedValueOnce({ healthy: true, issues: [] }) // bandai
				.mockResolvedValueOnce({ healthy: false, issues: ["Issue 1"] }) // gundam-info
				.mockResolvedValueOnce({ healthy: true, issues: [] }); // dalong

			const options = { healthCheck: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("✅"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("❌"),
			);
		});
	});

	describe("Edge cases and boundary conditions", () => {
		it("should handle very large cache sizes", async () => {
			mockCache.getStats.mockResolvedValue({
				totalFiles: 100_000,
				totalSize: 10 * 1024 * 1024 * 1024, // 10GB
			});

			const options = { scraper: "large", cacheStats: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("100,000 files"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("10.00GB"),
			);
		});

		it("should handle zero-sized cache files", async () => {
			mockCache.getStats.mockResolvedValue({
				totalFiles: 100,
				totalSize: 0,
			});

			const options = { scraper: "zero-size", cacheStats: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("0.00MB total"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("0.00KB average"),
			);
		});

		it("should handle single cache file", async () => {
			mockCache.getStats.mockResolvedValue({
				totalFiles: 1,
				totalSize: 1024,
			});

			const options = { scraper: "single", cacheStats: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("1 file"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("1.00KB"),
			);
		});

		it("should handle very small cache sizes", async () => {
			mockCache.getStats.mockResolvedValue({
				totalFiles: 10,
				totalSize: 512, // 512 bytes
			});

			const options = { scraper: "tiny", cacheStats: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("0.00MB"), // Should round to 0.00MB
			);
		});

		it("should handle invalid scraper names", async () => {
			const options = { scraper: "invalid-scraper-name" };

			await getStatusCommand(options);

			expect(PageCache).toHaveBeenCalledWith({
				cacheDir: "./.cache/invalid-scraper-name",
			});
		});

		it("should handle empty scraper name", async () => {
			const options = { scraper: "" };

			await getStatusCommand(options);

			expect(PageCache).toHaveBeenCalledWith({
				cacheDir: "./.cache/",
			});
		});

		it("should handle special characters in scraper names", async () => {
			const options = { scraper: "scraper-with-special@chars#123" };

			await getStatusCommand(options);

			expect(PageCache).toHaveBeenCalledWith({
				cacheDir: "./.cache/scraper-with-special@chars#123",
			});
		});
	});

	describe("Performance and optimization", () => {
		it("should fetch status for all scrapers concurrently", async () => {
			const options = { cacheStats: true };

			const startTime = Date.now();
			await getStatusCommand(options);
			const duration = Date.now() - startTime;

			// Should complete quickly due to concurrent processing
			expect(duration).toBeLessThan(1000);
		});

		it("should handle slow cache operations", async () => {
			// Simulate slow cache operations
			mockCache.getStats.mockImplementation(() => {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve({ totalFiles: 10, totalSize: 1024 });
					}, 1000);
				});
			});

			const options = { cacheStats: true };

			const startTime = Date.now();
			await getStatusCommand(options);
			const duration = Date.now() - startTime;

			expect(duration).toBeGreaterThan(1000); // Should wait for slow operations
		});

		it("should handle timeouts during status fetch", async () => {
			// Simulate timeout
			mockCache.getStats.mockImplementation(() => {
				return new Promise(() => {
					// Never resolves - simulates timeout
				});
			});

			const options = { cacheStats: true, timeout: 100 };

			// Should handle timeout gracefully
			await expect(getStatusCommand(options)).resolves.toBeDefined();
		});
	});

	describe("Integration scenarios", () => {
		it("should show comprehensive status with all options", async () => {
			mockCache.getKeys.mockResolvedValue(["key1", "key2", "key3"]);
			mockCache.getTTL.mockResolvedValue(3_600_000);
			mockCache.has.mockResolvedValue(true);

			const options = {
				cacheStats: true,
				healthCheck: true,
				verbose: true,
				scraper: "bandai",
			};

			await getStatusCommand(options);

			expect(mockCache.getStats).toHaveBeenCalled();
			expect(mockCache.getKeys).toHaveBeenCalled();
			expect(mockCache.healthCheck).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("DETAILED STATUS"),
			);
		});

		it("should display cache hit/miss statistics", async () => {
			mockCache.getKeys.mockResolvedValue(["key1", "key2", "key3"]);
			mockCache.has
				.mockResolvedValueOnce(true)  // key1 exists
				.mockResolvedValueOnce(false) // key2 expired
				.mockResolvedValueOnce(true); // key3 exists

			const options = { scraper: "bandai", cacheStats: true };

			await getStatusCommand(options);

			expect(mockCache.has).toHaveBeenCalledTimes(3);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Cache hits"),
			);
		});

		it("should display cache age information", async () => {
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 7); // 7 days ago

			const recentDate = new Date();
			recentDate.setHours(recentDate.getHours() - 1); // 1 hour ago

			mockCache.getTTL
				.mockResolvedValueOnce(7 * 24 * 60 * 60 * 1000) // 7 days remaining
				.mockResolvedValueOnce(60 * 60 * 1000); // 1 hour remaining

			const options = { scraper: "bandai", cacheStats: true };

			await getStatusCommand(options);

			expect(mockCache.getTTL).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Oldest entry"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Newest entry"),
			);
		});

		it("should handle mixed scraper availability", async () => {
			mockCache.getStats
				.mockResolvedValueOnce({ totalFiles: 10, totalSize: 1024 }) // bandai - working
				.mockRejectedValueOnce(new Error("Cache not found")) // gundam-info - missing
				.mockResolvedValueOnce({ totalFiles: 0, totalSize: 0 }); // dalong - empty

			const options = { cacheStats: true };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Bandai"),
			);
			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Gundam-info"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Dalong"),
			);
		});
	});

	describe("Output formatting", () => {
		it("should format file sizes correctly", async () => {
			const sizeTests = [
				{ bytes: 1024, expected: "1.00KB" },
				{ bytes: 1024 * 1024, expected: "1.00MB" },
				{ bytes: 1024 * 1024 * 1024, expected: "1.00GB" },
				{ bytes: 1536, expected: "1.50KB" },
				{ bytes: 2.5 * 1024 * 1024, expected: "2.50MB" },
			];

			for (const test of sizeTests) {
				mockCache.getStats.mockResolvedValue({
					totalFiles: 1,
					totalSize: test.bytes,
				});

				const options = { scraper: "test", cacheStats: true };
				await getStatusCommand(options);

				expect(mockConsoleLog).toHaveBeenCalledWith(
					expect.stringContaining(test.expected),
				);

				vi.clearAllMocks();
				mockCache.getStats.mockResolvedValue({
					totalFiles: 1,
					totalSize: test.bytes,
				});
			}
		});

		it("should use table formatting for multiple scrapers", async () => {
			const options = { cacheStats: true, format: "table" };

			await getStatusCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringMatching(/\|.*\|.*\|/), // Table format
			);
		});

		it("should use JSON output format when requested", async () => {
			const options = { format: "json" };

			// Mock console.log to capture JSON output
			const logSpy = vi.spyOn(console, "log");
			logSpy.mockImplementation(() => {});

			await getStatusCommand(options);

			const output = logSpy.mock.calls.flat().join(" ");
			expect(() => JSON.parse(output)).not.toThrow(); // Should be valid JSON
		});
	});
});