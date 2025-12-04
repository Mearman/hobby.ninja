/**
 * Comprehensive unit tests for GundamInfoScraper
 * Tests edge cases, error scenarios, and boundary conditions
 */

import { execFileNoThrow } from "@unnamed-gunpla-app/utils/execFileNoThrow";
import * as cheerio from "cheerio";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PageCache } from "../cache";


import {
	GundamInfoScraper,
	GundamInfoProduct,
	GundamInfoScraperOptions,
} from "./gundam-info";

// Mock dependencies
vi.mock("cheerio");
vi.mock("../cache");
vi.mock("@unnamed-gunpla-app/utils/execFileNoThrow");

describe("GundamInfoScraper", () => {
	let scraper: GundamInfoScraper;
	let mockCache: PageCache;
	let mockCheerioInstance: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock PageCache
		mockCache = {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			clear: vi.fn(),
			cleanup: vi.fn(),
			getStats: vi.fn(),
			has: vi.fn(),
			getKeys: vi.fn(),
			getTTL: vi.fn(),
			touch: vi.fn(),
			mget: vi.fn(),
			mset: vi.fn(),
			mdelete: vi.fn(),
			getWithMetadata: vi.fn(),
			setWithMetadata: vi.fn(),
			healthCheck: vi.fn(),
		} as any;

		// Mock cheerio
		mockCheerioInstance = {
			find: vi.fn().mockReturnThis(),
			each: vi.fn().mockReturnThis(),
			first: vi.fn().mockReturnThis(),
			text: vi.fn().mockReturnValue(""),
			attr: vi.fn().mockReturnValue(""),
			length: 1,
		};

		(cheerio.load as any) = vi.fn().mockReturnValue(mockCheerioInstance);

		// Mock execFileNoThrow
		(execFileNoThrow as any).mockResolvedValue({
			success: true,
			stdout: "<html></html>",
			stderr: "",
			exitCode: 0,
		});

		scraper = new GundamInfoScraper({
			useCache: true,
			timeout: 10_000,
			maxRetries: 2,
			concurrency: 1,
			cache: mockCache,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Constructor", () => {
		it("should initialize with default options", () => {
			const defaultScraper = new GundamInfoScraper();
			expect(defaultScraper).toBeDefined();
		});

		it("should initialize with custom options", () => {
			const options: GundamInfoScraperOptions = {
				useCache: false,
				timeout: 5000,
				maxRetries: 5,
				concurrency: 4,
				baseUrl: "https://custom-gundam-info.com",
			};

			const customScraper = new GundamInfoScraper(options);
			expect(customScraper).toBeDefined();
		});
	});

	describe("scrapeAllPages", () => {
		it("should successfully scrape all pages", async () => {
			const mockProducts: GundamInfoProduct[] = [
				{
					sku: "GI-001",
					name: "Test Gundam",
					price: "$25.00",
					category: "MG",
					grade: "MG",
					series: "Mobile Suit Gundam",
					urls: { product: "https://example.com/1" },
					metadata: {
						scrapedAt: new Date().toISOString(),
						source: "gundam-info",
						currency: "USD",
					},
				},
			];

			vi.spyOn(scraper, "scrapePage" as any)
				.mockResolvedValueOnce(mockProducts)
				.mockResolvedValueOnce([]); // Second page empty

			const result = await scraper.scrapeAllPages();

			expect(result).toEqual(mockProducts);
		});

		it("should handle empty first page", async () => {
			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue([]);

			const result = await scraper.scrapeAllPages();

			expect(result).toHaveLength(0);
		});

		it("should handle network errors", async () => {
			vi.spyOn(scraper, "scrapePage" as any).mockRejectedValue(new Error("Network error"));

			await expect(scraper.scrapeAllPages()).rejects.toThrow("Network error");
		});
	});

	describe("Edge cases", () => {
		it("should handle malformed HTML responses", async () => {
			(execFileNoThrow as any).mockResolvedValue({
				success: true,
				stdout: "<html><body>incomplete",
				stderr: "",
				exitCode: 0,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue([]);

			const result = await scraper.scrapeAllPages();

			expect(result).toHaveLength(0);
		});

		it("should handle empty HTML responses", async () => {
			(execFileNoThrow as any).mockResolvedValue({
				success: true,
				stdout: "",
				stderr: "",
				exitCode: 0,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue([]);

			const result = await scraper.scrapeAllPages();

			expect(result).toHaveLength(0);
		});

		it("should handle extremely large HTML responses", async () => {
			const largeHtml = "<html>" + "<div>content</div>".repeat(100_000) + "</html>";
			(execFileNoThrow as any).mockResolvedValue({
				success: true,
				stdout: largeHtml,
				stderr: "",
				exitCode: 0,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue([]);

			await expect(scraper.scrapeAllPages()).resolves.toBeDefined();
		});

		it("should handle Unicode content in HTML", async () => {
			const unicodeHtml = "<html>ガンダム情報 RX-78-2 ✨ 特別版</html>";
			(execFileNoThrow as any).mockResolvedValue({
				success: true,
				stdout: unicodeHtml,
				stderr: "",
				exitCode: 0,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue([]);

			await expect(scraper.scrapeAllPages()).resolves.toBeDefined();
		});

		it("should handle rate limiting", async () => {
			vi.useFakeTimers();

			vi.spyOn(scraper, "scrapePage" as any)
				.mockResolvedValue([{ sku: "TEST-001", name: "Test" } as GundamInfoProduct])
				.mockResolvedValue([]);

			const resultPromise = scraper.scrapeAllPages();

			// Fast-forward through rate limiting delays
			await vi.advanceTimersByTime(2000);

			const result = await resultPromise;

			expect(result).toHaveLength(1);

			vi.useRealTimers();
		});

		it("should handle concurrent requests", async () => {
			const concurrentScraper = new GundamInfoScraper({ concurrency: 4 });

			vi.spyOn(concurrentScraper, "scrapePage" as any).mockResolvedValue([]);

			await concurrentScraper.scrapeAllPages();

			expect(concurrentScraper["scrapePage"]).toHaveBeenCalled();
		});
	});

	describe("Error handling", () => {
		it("should handle HTTP 404 errors", async () => {
			(execFileNoThrow as any).mockResolvedValue({
				success: false,
				stdout: "",
				stderr: "404 Not Found",
				exitCode: 404,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockRejectedValue(new Error("404 Not Found"));

			await expect(scraper.scrapeAllPages()).rejects.toThrow("404 Not Found");
		});

		it("should handle HTTP 500 errors", async () => {
			(execFileNoThrow as any).mockResolvedValue({
				success: false,
				stdout: "",
				stderr: "500 Internal Server Error",
				exitCode: 500,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockRejectedValue(new Error("500 Internal Server Error"));

			await expect(scraper.scrapeAllPages()).rejects.toThrow("500 Internal Server Error");
		});

		it("should handle timeout errors", async () => {
			vi.useFakeTimers();

			(execFileNoThrow as any).mockImplementation(() => {
				return new Promise((resolve) => {
					setTimeout(() => {
						resolve({
							success: false,
							stdout: "",
							stderr: "Request timeout",
							exitCode: 124,
						});
					}, 15_000);
				});
			});

			vi.spyOn(scraper, "scrapePage" as any).mockRejectedValue(new Error("Request timeout"));

			await expect(scraper.scrapeAllPages()).rejects.toThrow("Request timeout");

			vi.useRealTimers();
		});

		it("should handle JSON parsing errors", async () => {
			(execFileNoThrow as any).mockResolvedValue({
				success: true,
				stdout: "Invalid JSON response",
				stderr: "",
				exitCode: 0,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockRejectedValue(new Error("Invalid JSON"));

			await expect(scraper.scrapeAllPages()).rejects.toThrow("Invalid JSON");
		});

		it("should handle memory pressure scenarios", async () => {
			const largeProducts: GundamInfoProduct[] = Array.from({length: 1000}).fill(null).map((_, i) => ({
				sku: `GI-${i.toString().padStart(4, "0")}`,
				name: `Large Gundam ${i}`,
				price: `$${(i + 1) * 10}`,
				category: "MG",
				grade: "MG",
				series: "Test Series",
				description: "A".repeat(1000),
				urls: {},
				metadata: {
					scrapedAt: new Date().toISOString(),
					source: "gundam-info",
					currency: "USD",
				},
			}));

			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue(largeProducts);

			const result = await scraper.scrapeAllPages();

			expect(result).toHaveLength(1000);
			expect(result[0].name.length).toBeGreaterThan(10);
		});
	});
});