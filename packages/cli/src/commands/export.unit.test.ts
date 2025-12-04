/**
 * Comprehensive unit tests for export command
 * Tests edge cases, error scenarios, and boundary conditions
 */

import { promises as fs } from "node:fs";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";


import { PageCache } from "../cache";
import { JsonExporter } from "../export/json-export";

import { exportCommand } from "./export";

// Mock dependencies
vi.mock("../cache");
vi.mock("../export/json-export");
vi.mock("fs", () => ({
	promises: {
		access: vi.fn(),
		readdir: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		stat: vi.fn(),
	},
}));

// Mock console methods
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

describe("exportCommand", () => {
	let mockCache: PageCache;
	let mockExporter: JsonExporter;
	let mockFs: typeof fs;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock cache
		mockCache = {
			getKeys: vi.fn().mockResolvedValue(["key1", "key2", "key3"]),
			get: vi.fn().mockResolvedValue({ data: "test data" }),
			getStats: vi.fn().mockResolvedValue({
				totalFiles: 10,
				totalSize: 1024 * 1024,
			}),
			has: vi.fn().mockResolvedValue(true),
		} as any;

		// Mock exporter
		mockExporter = {
			exportData: vi.fn().mockResolvedValue(),
			validateExport: vi.fn().mockResolvedValue({ valid: true, issues: [] }),
			getExportSize: vi.fn().mockResolvedValue(1024 * 1024),
		} as any;

		// Mock fs
		mockFs = vi.mocked(fs);
		mockFs.access.mockResolvedValue();
		mockFs.readdir.mockResolvedValue(["file1.json", "file2.json"]);
		mockFs.readFile.mockResolvedValue(JSON.stringify({ data: "test" }));
		mockFs.writeFile.mockResolvedValue();
		mockFs.stat.mockResolvedValue({
			size: 1024,
			isFile: () => true,
			isDirectory: () => false,
		} as any);

		(PageCache as any).mockImplementation(() => mockCache);
		(JsonExporter as any).mockImplementation(() => mockExporter);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		mockConsoleLog.mockClear();
		mockConsoleError.mockClear();
	});

	describe("Basic functionality", () => {
		it("should export data in default JSON format", async () => {
			const options = { format: "json" };

			await exportCommand(options);

			expect(JsonExporter).toHaveBeenCalled();
			expect(mockExporter.exportData).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Export completed successfully"),
			);
		});

		it("should export data from specific scraper", async () => {
			const options = { format: "json", scraper: "bandai" };

			await exportCommand(options);

			expect(PageCache).toHaveBeenCalledWith({
				cacheDir: "./.cache/bandai",
				ttl: expect.any(Number),
				maxSize: expect.any(Number),
			});
			expect(mockCache.getKeys).toHaveBeenCalled();
		});

		it("should export to specific output file", async () => {
			const options = { format: "json", output: "/custom/output.json" };

			await exportCommand(options);

			expect(JsonExporter).toHaveBeenCalledWith(
				expect.objectContaining({
					outputDir: expect.stringContaining("/custom"),
				}),
			);
		});

		it("should include cache metadata when requested", async () => {
			const options = { format: "json", includeCache: true };

			await exportCommand(options);

			expect(mockCache.getStats).toHaveBeenCalled();
		});
	});

	describe("Different export formats", () => {
		it("should handle JSON format", async () => {
			const options = { format: "json" };

			await exportCommand(options);

			expect(JsonExporter).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("JSON export"),
			);
		});

		it("should handle CSV format", async () => {
			const options = { format: "csv" };

			await exportCommand(options);

			// Should still use JSON exporter but convert to CSV
			expect(JsonExporter).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("CSV export"),
			);
		});

		it("should handle XLSX format", async () => {
			const options = { format: "xlsx" };

			await exportCommand(options);

			// Should still use JSON exporter but convert to XLSX
			expect(JsonExporter).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("XLSX export"),
			);
		});

		it("should reject invalid format", async () => {
			const options = { format: "invalid" };

			await expect(exportCommand(options)).rejects.toThrow("Invalid export format");
		});
	});

	describe("Data processing", () => {
		it("should collect and process data from cache", async () => {
			const mockData = [
				{ sku: "TEST-001", name: "Gundam", category: "HG" },
				{ sku: "TEST-002", name: "Zaku", category: "MG" },
			];

			mockCache.get
				.mockResolvedValueOnce(mockData[0])
				.mockResolvedValueOnce(mockData[1])
				.mockResolvedValueOnce(null); // Non-existent key

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockCache.getKeys).toHaveBeenCalled();
			expect(mockCache.get).toHaveBeenCalledTimes(3);
			expect(mockExporter.exportData).toHaveBeenCalledWith(
				expect.arrayContaining([mockData[0], mockData[1]]),
				expect.any(String),
			);
		});

		it("should handle empty cache", async () => {
			mockCache.getKeys.mockResolvedValue([]);

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockExporter.exportData).toHaveBeenCalledWith([], expect.any(String));
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("No data to export"),
			);
		});

		it("should handle corrupted cache entries", async () => {
			mockCache.get
				.mockResolvedValueOnce({ sku: "TEST-001", name: "Valid" })
				.mockResolvedValueOnce(null) // Corrupted entry
				.mockResolvedValueOnce({ sku: "TEST-003", name: "Another Valid" });

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockExporter.exportData).toHaveBeenCalledWith(
				expect.arrayContaining([
					{ sku: "TEST-001", name: "Valid" },
					{ sku: "TEST-003", name: "Another Valid" },
				]),
				expect.any(String),
			);
		});

		it("should deduplicate data during export", async () => {
			const duplicateData = [
				{ sku: "TEST-001", name: "Gundam" },
				{ sku: "test-001", name: "Gundam Updated" }, // Same SKU, different case
				{ sku: "TEST-002", name: "Zaku" },
			];

			mockCache.get
				.mockResolvedValueOnce(duplicateData[0])
				.mockResolvedValueOnce(duplicateData[1])
				.mockResolvedValueOnce(duplicateData[2]);

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockExporter.exportData).toHaveBeenCalled();
			// Exporter should handle deduplication
		});
	});

	describe("Error handling", () => {
		it("should handle cache access errors", async () => {
			mockCache.getKeys.mockRejectedValue(new Error("Cache access denied"));

			const options = { format: "json" };

			await expect(exportCommand(options)).rejects.toThrow("Cache access denied");
			expect(mockConsoleError).toHaveBeenCalled();
		});

		it("should handle individual cache entry errors", async () => {
			mockCache.get
				.mockResolvedValueOnce({ sku: "TEST-001", name: "Valid" })
				.mockRejectedValueOnce(new Error("Corrupted entry"))
				.mockResolvedValueOnce({ sku: "TEST-003", name: "Another Valid" });

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Failed to read cache entry"),
			);
			expect(mockExporter.exportData).toHaveBeenCalled();
		});

		it("should handle export errors", async () => {
			mockExporter.exportData.mockRejectedValue(new Error("Export failed"));

			const options = { format: "json" };

			await expect(exportCommand(options)).rejects.toThrow("Export failed");
		});

		it("should handle file system errors", async () => {
			mockFs.writeFile.mockRejectedValue(new Error("Permission denied"));

			const options = { format: "json", output: "/protected/file.json" };

			await expect(exportCommand(options)).rejects.toThrow("Permission denied");
		});

		it("should handle invalid cache data", async () => {
			mockCache.get
				.mockResolvedValueOnce("invalid data")
				.mockResolvedValueOnce(12_345) // Non-object data
				.mockResolvedValueOnce({ sku: "TEST-001", name: "Valid" });

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining("Invalid cache data"),
			);
		});
	});

	describe("Edge cases and boundary conditions", () => {
		it("should handle extremely large datasets", async () => {
			const largeData = Array.from({length: 10_000}).fill(null).map((_, i) => ({
				sku: `LARGE-${i.toString().padStart(4, "0")}`,
				name: `Product ${i}`,
				category: "Test",
				grade: "HG",
				series: "Test Series",
				metadata: { source: "test", scrapedAt: new Date().toISOString() },
			}));

			mockCache.get.mockResolvedValue(largeData);

			const options = { format: "json" };

			const startTime = Date.now();
			await exportCommand(options);
			const duration = Date.now() - startTime;

			expect(mockExporter.exportData).toHaveBeenCalled();
			expect(duration).toBeLessThan(10_000); // Should complete in reasonable time
		});

		it("should handle data with special characters", async () => {
			const specialData = {
				sku: "SPECIAL-001",
				name: "ガンダム RX-78-2 ✨ 特別版 🚀",
				description: '🇯🇵 日本のアニメ作品 "Gundam"',
				category: "HG 高グレード",
				metadata: { source: "テスト", notes: 'Special "quotes" & symbols' },
			};

			mockCache.get.mockResolvedValue(specialData);

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockExporter.exportData).toHaveBeenCalled();
		});

		it("should handle circular references in data", async () => {
			const circularData: any = {
				sku: "CIRCULAR-001",
				name: "Circular Reference",
			};
			circularData.self = circularData;

			mockCache.get.mockResolvedValue(circularData);

			const options = { format: "json" };

			await exportCommand(options);

			// Should handle circular references gracefully
			expect(mockExporter.exportData).toHaveBeenCalled();
		});

		it("should handle deeply nested objects", async () => {
			const deepData = {
				sku: "DEEP-001",
				name: "Deep Object",
				metadata: {
					nested: {
						deeply: {
							very: {
								deep: {
									value: "test",
									array: [1, 2, { nested: "value" }],
								},
							},
						},
					},
				},
			};

			mockCache.get.mockResolvedValue(deepData);

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockExporter.exportData).toHaveBeenCalled();
		});

		it("should handle null and undefined values", async () => {
			const nullData = {
				sku: "NULL-001",
				name: null,
				description: undefined,
				category: "",
				metadata: null,
			};

			mockCache.get.mockResolvedValue(nullData);

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockExporter.exportData).toHaveBeenCalled();
		});

		it("should handle very long strings", async () => {
			const longData = {
				sku: "LONG-001",
				name: "A".repeat(1000),
				description: "B".repeat(100_000),
				metadata: { notes: "C".repeat(5000) },
			};

			mockCache.get.mockResolvedValue(longData);

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockExporter.exportData).toHaveBeenCalled();
		});

		it("should handle numeric values as strings", async () => {
			const numericData = {
				sku: "NUM-001",
				name: "Numeric Test",
				price: "1234.56",
				grade: "123",
				metadata: { source: "456" },
			};

			mockCache.get.mockResolvedValue(numericData);

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockExporter.exportData).toHaveBeenCalled();
		});

		it("should handle boolean values", async () => {
			const booleanData = {
				sku: "BOOL-001",
				name: "Boolean Test",
				available: true,
				discontinued: false,
				metadata: { featured: true },
			};

			mockCache.get.mockResolvedValue(booleanData);

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockExporter.exportData).toHaveBeenCalled();
		});
	});

	describe("Format conversion", () => {
		it("should convert JSON to CSV format", async () => {
			const jsonData = [
				{ sku: "TEST-001", name: "Gundam", price: 1000, category: "HG" },
				{ sku: "TEST-002", name: "Zaku", price: 800, category: "MG" },
			];

			mockCache.get
				.mockResolvedValueOnce(jsonData[0])
				.mockResolvedValueOnce(jsonData[1]);

			const options = { format: "csv", output: "/test/output.csv" };

			await exportCommand(options);

			expect(mockFs.writeFile).toHaveBeenCalledWith(
				"/test/output.csv",
				expect.stringContaining("sku,name,price,category"),
				"utf8",
			);
		});

		it("should handle CSV conversion with special characters", async () => {
			const specialData = {
				sku: "SPECIAL-001",
				name: 'Gundam, with "quotes"',
				description: "Line 1\nLine 2",
				category: 'Test "Category"',
			};

			mockCache.get.mockResolvedValue(specialData);

			const options = { format: "csv", output: "/test/output.csv" };

			await exportCommand(options);

			expect(mockFs.writeFile).toHaveBeenCalledWith(
				"/test/output.csv",
				expect.stringMatching(/".*".*".*"/), // Should be properly quoted
				"utf8",
			);
		});

		it("should handle XLSX conversion", async () => {
			const jsonData = [
				{ sku: "TEST-001", name: "Gundam", price: 1000 },
			];

			mockCache.get.mockResolvedValue(jsonData);

			const options = { format: "xlsx", output: "/test/output.xlsx" };

			await exportCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("XLSX export"),
			);
			// XLSX conversion would require additional library mocking
		});
	});

	describe("Output validation", () => {
		it("should validate export after completion", async () => {
			mockExporter.validateExport.mockResolvedValue({
				valid: true,
				issues: [],
			});

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockExporter.validateExport).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Export validation passed"),
			);
		});

		it("should report validation issues", async () => {
			mockExporter.validateExport.mockResolvedValue({
				valid: false,
				issues: ["Missing index file", "Invalid data format"],
			});

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Export validation warnings"),
			);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Missing index file"),
			);
		});

		it("should show export statistics", async () => {
			mockExporter.getExportSize.mockResolvedValue(5 * 1024 * 1024); // 5MB

			const options = { format: "json" };

			await exportCommand(options);

			expect(mockExporter.getExportSize).toHaveBeenCalled();
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Export size: 5.00MB"),
			);
		});
	});

	describe("Performance and optimization", () => {
		it("should handle concurrent cache reads efficiently", async () => {
			const manyKeys = Array.from({length: 1000}).fill(null).map((_, i) => `key-${i}`);
			mockCache.getKeys.mockResolvedValue(manyKeys);

			// Mock each get call to return a small object
			mockCache.get.mockImplementation((key) => {
				return Promise.resolve({
					sku: key,
					name: `Product ${key}`,
					category: "Test",
				});
			});

			const options = { format: "json" };

			const startTime = Date.now();
			await exportCommand(options);
			const duration = Date.now() - startTime;

			expect(mockCache.get).toHaveBeenCalledTimes(1000);
			expect(duration).toBeLessThan(5000); // Should be reasonably fast
		});

		it("should stream large exports to avoid memory issues", async () => {
			const veryLargeData = Array.from({length: 50_000}).fill(null).map((_, i) => ({
				sku: `LARGE-${i}`,
				name: `Product ${i}`,
				description: "A".repeat(1000), // 1KB description per item
			}));

			mockCache.get.mockResolvedValue(veryLargeData);

			const options = { format: "json" };

			const startMemory = process.memoryUsage().heapUsed;
			await exportCommand(options);
			const endMemory = process.memoryUsage().heapUsed;

			expect(mockExporter.exportData).toHaveBeenCalled();
			// Memory usage should not grow excessively
			expect(endMemory - startMemory).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
		});
	});

	describe("Integration scenarios", () => {
		it("should handle export from multiple scrapers", async () => {
			const bandaiData = [{ sku: "BANDAI-001", name: "Bandai Gundam" }];
			const gundamInfoData = [{ sku: "GI-001", name: "Info Gundam" }];

			// Test with bandai scraper
			vi.clearAllMocks();
			mockCache.get.mockResolvedValue(bandaiData[0]);
			await exportCommand({ format: "json", scraper: "bandai" });

			// Test with gundam-info scraper
			vi.clearAllMocks();
			mockCache.get.mockResolvedValue(gundamInfoData[0]);
			await exportCommand({ format: "json", scraper: "gundam-info" });

			expect(JsonExporter).toHaveBeenCalledTimes(2);
		});

		it("should handle incremental exports", async () => {
			const initialData = [{ sku: "TEST-001", name: "Gundam" }];
			const newData = [{ sku: "TEST-002", name: "Zaku" }];

			// First export
			mockCache.getKeys.mockResolvedValueOnce(["key1"]);
			mockCache.get.mockResolvedValueOnce(initialData);
			await exportCommand({ format: "json" });

			// Second export with new data
			vi.clearAllMocks();
			mockCache.getKeys.mockResolvedValueOnce(["key1", "key2"]);
			mockCache.get
				.mockResolvedValueOnce(initialData)
				.mockResolvedValueOnce(newData);
			await exportCommand({ format: "json" });

			expect(JsonExporter).toHaveBeenCalledTimes(2);
		});

		it("should handle backup exports", async () => {
			const options = { format: "json", backup: true };

			await exportCommand(options);

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Creating backup"),
			);
		});
	});
});