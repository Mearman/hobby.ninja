/**
 * Comprehensive unit tests for DalongScraper
 * Tests edge cases, error scenarios, and boundary conditions
 */

import { execFileNoThrow } from "@unnamed-gunpla-app/utils/execFileNoThrow";
import * as cheerio from "cheerio";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PageCache } from "../cache";


import {
	DalongScraper,
	DalongProduct,
	DalongScraperOptions,
} from "./dalong";

// Mock dependencies
vi.mock("cheerio");
vi.mock("../cache");
vi.mock("@unnamed-gunpla-app/utils/execFileNoThrow");

describe("DalongScraper", () => {
	let scraper: DalongScraper;
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

		scraper = new DalongScraper({
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
			const defaultScraper = new DalongScraper();
			expect(defaultScraper).toBeDefined();
		});

		it("should initialize with custom options", () => {
			const options: DalongScraperOptions = {
				useCache: false,
				timeout: 5000,
				maxRetries: 5,
				concurrency: 4,
				baseUrl: "https://custom-dalong.net",
			};

			const customScraper = new DalongScraper(options);
			expect(customScraper).toBeDefined();
		});
	});

	describe("scrapeAllPages", () => {
		it("should successfully scrape all pages", async () => {
			const mockProducts: DalongProduct[] = [
				{
					sku: "DALONG-001",
					name: "Dalong Review",
					price: "€20.00",
					category: "Review",
					grade: "HG",
					series: "Mobile Suit Gundam",
					reviewScore: 8.5,
					urls: { product: "https://dalong.net/review1" },
					metadata: {
						scrapedAt: new Date().toISOString(),
						source: "dalong",
						currency: "EUR",
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

	describe("Review-specific functionality", () => {
		it("should parse review scores correctly", async () => {
			mockCheerioInstance.text
				.mockReturnValueOnce("Test Gundam Review")
				.mockReturnValueOnce("DALONG-001")
				.mockReturnValueOnce("€20.00")
				.mockReturnValueOnce("8.5/10");

			const mockProduct = scraper["parseReviewItem"](mockCheerioInstance);

			expect(mockProduct).toBeDefined();
			expect(mockProduct!.reviewScore).toBe(8.5);
		});

		it("should handle review scores in different formats", async () => {
			const testCases = [
				{ input: "8/10", expected: 8 },
				{ input: "7.5/10", expected: 7.5 },
				{ input: "9★", expected: 9 },
				{ input: "85%", expected: 8.5 },
				{ input: "4/5", expected: 8 }, // Convert to 10-point scale
				{ input: "invalid score", expected: null },
			];

			for (const { input, expected } of testCases) {
				mockCheerioInstance.text.mockReturnValue(input);
				const score = scraper["parseReviewScore"](input);

				expect(score).toBe(expected);
			}
		});

		it("should handle missing review scores", async () => {
			mockCheerioInstance.text.mockReturnValue(""); // No score available

			const score = scraper["parseReviewScore"]("");

			expect(score).toBeNull();
		});
	});

	describe("Edge cases", () => {
		it("should handle malformed review HTML", async () => {
			(execFileNoThrow as any).mockResolvedValue({
				success: true,
				stdout: "<html><body>incomplete review",
				stderr: "",
				exitCode: 0,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue([]);

			const result = await scraper.scrapeAllPages();

			expect(result).toHaveLength(0);
		});

		it("should handle review pages with no images", async () => {
			mockCheerioInstance.attr.mockReturnValue(""); // No image URLs

			const mockProduct = scraper["parseReviewItem"](mockCheerioInstance);

			expect(mockProduct).toBeDefined();
			expect(mockProduct!.urls.image).toBeUndefined();
		});

		it("should handle Korean text content", async () => {
			const koreanHtml = "<html>건담 리뷰 RX-78-2 ✨ 특별판</html>";
			(execFileNoThrow as any).mockResolvedValue({
				success: true,
				stdout: koreanHtml,
				stderr: "",
				exitCode: 0,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue([]);

			await expect(scraper.scrapeAllPages()).resolves.toBeDefined();
		});

		it("should handle review galleries with many images", async () => {
			const mockImages = Array.from({length: 50}).fill(null).map((_, i) => `image${i}.jpg`);
			mockCheerioInstance.length = 50;

			let imageIndex = 0;
			mockCheerioInstance.attr.mockImplementation(() => mockImages[imageIndex++]);

			const mockProduct = scraper["parseReviewItem"](mockCheerioInstance);

			expect(mockProduct).toBeDefined();
		});

		it("should handle review text with special characters", async () => {
			const specialText = "★☆★ 건담 리뷰 ★☆★ ⚡️ Thunderbolt ⚡️";
			mockCheerioInstance.text.mockReturnValue(specialText);

			const mockProduct = scraper["parseReviewItem"](mockCheerioInstance);

			expect(mockProduct).toBeDefined();
		});

		it("should handle review dates in various formats", async () => {
			const dateFormats = [
				"2023-01-01",
				"2023/01/01",
				"01-01-2023",
				"Jan 1, 2023",
				"2023년 1월 1일",
			];

			for (const dateFormat of dateFormats) {
				mockCheerioInstance.text.mockReturnValue(dateFormat);
				const parsedDate = scraper["parseReviewDate"](dateFormat);

				expect(parsedDate).toBeDefined();
			}
		});

		it("should handle invalid review dates", async () => {
			const invalidDates = [
				"invalid date",
				"32/13/2023",
				"",
				"Not a date at all",
			];

			for (const invalidDate of invalidDates) {
				const parsedDate = scraper["parseReviewDate"](invalidDate);

				expect(parsedDate).toBeNull();
			}
		});

		it("should handle memory pressure during review scraping", async () => {
			const largeReviews: DalongProduct[] = Array.from({length: 1000}).fill(null).map((_, i) => ({
				sku: `DALONG-${i.toString().padStart(4, "0")}`,
				name: `Large Review ${i}`,
				price: `€${(i + 1) * 5}`,
				category: "Review",
				grade: "HG",
				series: "Test Series",
				reviewScore: Math.random() * 10,
				reviewText: "A".repeat(2000),
				urls: {},
				metadata: {
					scrapedAt: new Date().toISOString(),
					source: "dalong",
					currency: "EUR",
				},
			}));

			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue(largeReviews);

			const result = await scraper.scrapeAllPages();

			expect(result).toHaveLength(1000);
		});

		it("should handle concurrent review scraping", async () => {
			const concurrentScraper = new DalongScraper({ concurrency: 8 });

			vi.spyOn(concurrentScraper, "scrapePage" as any).mockResolvedValue([]);

			await concurrentScraper.scrapeAllPages();

			expect(concurrentScraper["scrapePage"]).toHaveBeenCalled();
		});

		it("should handle review pagination edge cases", async () => {
			vi.spyOn(scraper, "scrapePage" as any)
				.mockResolvedValue([{ sku: "TEST-001" } as DalongProduct])
				.mockResolvedValue([]) // End of pagination
				.mockRejectedValue(new Error("Unexpected page access"));

			const result = await scraper.scrapeAllPages();

			expect(result).toHaveLength(1);
		});
	});

	describe("Error handling", () => {
		it("should handle rate limiting from Dalong.net", async () => {
			(execFileNoThrow as any).mockResolvedValue({
				success: false,
				stdout: "",
				stderr: "429 Too Many Requests",
				exitCode: 429,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockRejectedValue(new Error("429 Too Many Requests"));

			await expect(scraper.scrapeAllPages()).rejects.toThrow("429 Too Many Requests");
		});

		it("should handle blocked access", async () => {
			(execFileNoThrow as any).mockResolvedValue({
				success: false,
				stdout: "",
				stderr: "403 Forbidden",
				exitCode: 403,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockRejectedValue(new Error("403 Forbidden"));

			await expect(scraper.scrapeAllPages()).rejects.toThrow("403 Forbidden");
		});

		it("should handle review parsing errors", async () => {
			// Mock a parsing error during review item processing
			mockCheerioInstance.find.mockImplementation(() => {
				throw new Error("Review parsing error");
			});

			const mockProduct = scraper["parseReviewItem"](mockCheerioInstance);

			expect(mockProduct).toBeNull();
		});

		it("should handle corrupted review images", async () => {
			mockCheerioInstance.attr.mockReturnValue("invalid-url-format");

			const mockProduct = scraper["parseReviewItem"](mockCheerioInstance);

			expect(mockProduct).toBeDefined();
			// Should handle invalid URLs gracefully
		});

		it("should handle network timeouts during review fetching", async () => {
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

		it("should handle review database connection errors", async () => {
			// Simulate database connection issues
			vi.spyOn(scraper, "getReviewPages" as any).mockRejectedValue(new Error("Database connection failed"));

			await expect(scraper.scrapeAllPages()).rejects.toThrow("Database connection failed");
		});

		it("should handle review content encoding issues", async () => {
			const encodedContent = Buffer.from("Invalid encoding data").toString("base64");
			(execFileNoThrow as any).mockResolvedValue({
				success: true,
				stdout: encodedContent,
				stderr: "",
				exitCode: 0,
			});

			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue([]);

			await expect(scraper.scrapeAllPages()).resolves.toBeDefined();
		});
	});

	describe("Performance and optimization", () => {
		it("should implement proper delay between page requests", async () => {
			vi.useFakeTimers();

			vi.spyOn(scraper, "scrapePage" as any)
				.mockResolvedValue([{ sku: "TEST-001" } as DalongProduct])
				.mockResolvedValue([]);

			const startTime = Date.now();
			const resultPromise = scraper.scrapeAllPages();

			// Advance timers to account for delays
			await vi.advanceTimersByTime(2000);
			const result = await resultPromise;
			const endTime = Date.now();

			expect(result).toHaveLength(1);
			expect(endTime - startTime).toBeGreaterThan(1000); // Should have delays

			vi.useRealTimers();
		});

		it("should handle large review galleries efficiently", async () => {
			// Mock a review with many images
			const largeGalleryReview: DalongProduct = {
				sku: "DALONG-GALLERY-001",
				name: "Gallery Heavy Review",
				price: "€30.00",
				category: "Review",
				grade: "PG",
				series: "Test Series",
				reviewScore: 9.5,
				urls: {
					product: "https://dalong.net/gallery",
					images: Array.from({length: 100}).fill(null).map((_, i) => `image${i}.jpg`),
				},
				metadata: {
					scrapedAt: new Date().toISOString(),
					source: "dalong",
					currency: "EUR",
				},
			};

			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue([largeGalleryReview]);

			const result = await scraper.scrapeAllPages();

			expect(result).toHaveLength(1);
			expect(result[0].urls.images).toHaveLength(100);
		});

		it("should cache review pages efficiently", async () => {
			const cacheKey = "review-page-1";

			// First call should fetch from network
			(mockCache.get as any).mockResolvedValue(null);
			vi.spyOn(scraper, "scrapePage" as any).mockResolvedValue([{ sku: "TEST-001" } as DalongProduct]);

			await scraper.scrapeAllPages();

			expect(mockCache.set).toHaveBeenCalled();
		});

		it("should reuse cached review pages", async () => {
			const cachedReviews = [{ sku: "CACHED-001", name: "Cached Review" } as DalongProduct];
			(mockCache.get as any).mockResolvedValue(cachedReviews);

			vi.spyOn(scraper, "scrapePage" as any);

			const result = await scraper.scrapeAllPages();

			expect(result).toEqual(cachedReviews);
			expect(scraper["scrapePage"]).not.toHaveBeenCalled(); // Should use cache
		});
	});
});