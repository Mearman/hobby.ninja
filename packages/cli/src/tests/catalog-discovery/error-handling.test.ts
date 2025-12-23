import { describe, test, expect, vi } from "vitest";

import { discoverCatalogItems } from "../../cli/catalog-discovery";

// Test constants
const MOCK_SCRAPPERS_PATH = "../scrappers";

// Mock the BandaiHobbyScraper for error scenarios
vi.mock(MOCK_SCRAPPERS_PATH, () => ({
	BandaiHobbyScraper: vi.fn(),
}));

describe("Catalog Discovery - Error Handling", () => {
	// Test constants
	const TEST_OUTPUT_DIR = "./data/bandai/items/";
	const DELAY_MS = 1000;

	describe("discoverCatalogItems", () => {
		test("should handle network timeout errors during catalog processing", async () => {
			// Mock scraper to throw network error
			const mockScraper = {
				scrapeItem: vi.fn().mockRejectedValue(new Error("Network timeout")),
			};

			vi.doMock(MOCK_SCRAPPERS_PATH, () => ({
				BandaiHobbyScraper: vi.fn(() => mockScraper),
			}));

			const options = {
				ranges: ["00_0000"],
				outputDir: TEST_OUTPUT_DIR,
				cache: true,
				resume: false,
				verbose: false,
				delayMs: DELAY_MS,
			};

			const result = await discoverCatalogItems(options);

			expect(result.successful).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain("Network timeout");
		});

		test("should handle 404 catalog page not found", async () => {
			const mockScraper = {
				scrapeItem: vi.fn().mockRejectedValue(new Error("HTTP 404: Page not found")),
			};

			vi.doMock(MOCK_SCRAPPERS_PATH, () => ({
				BandaiHobbyScraper: vi.fn(() => mockScraper),
			}));

			const options = {
				ranges: ["00_0000"],
				outputDir: TEST_OUTPUT_DIR,
				cache: true,
				resume: false,
				verbose: false,
				delayMs: DELAY_MS,
			};

			const result = await discoverCatalogItems(options);

			expect(result.successful).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		test("should handle client-side rendering failures", async () => {
			const mockScraper = {
				scrapeItem: vi.fn().mockRejectedValue(new Error("Client-side rendering timeout")),
			};

			vi.doMock(MOCK_SCRAPPERS_PATH, () => ({
				BandaiHobbyScraper: vi.fn(() => mockScraper),
			}));

			const options = {
				ranges: ["00_0000"],
				outputDir: TEST_OUTPUT_DIR,
				cache: true,
				resume: false,
				verbose: false,
				delayMs: DELAY_MS,
			};

			const result = await discoverCatalogItems(options);

			expect(result.successful).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		test("should continue processing after individual range errors", async () => {
			// Mock one successful, one failed, one successful
			const mockScraper = {
				scrapeItem: vi.fn()
					.mockResolvedValueOnce({ success: true, items: [] })
					.mockRejectedValueOnce(new Error("Range 02_1000 failed"))
					.mockResolvedValueOnce({ success: true, items: [] }),
			};

			vi.doMock(MOCK_SCRAPPERS_PATH, () => ({
				BandaiHobbyScraper: vi.fn(() => mockScraper),
			}));

			const options = {
				ranges: ["00_0000", "00_0001", "00_0002"],
				outputDir: TEST_OUTPUT_DIR,
				cache: true,
				resume: false,
				verbose: false,
				delayMs: DELAY_MS,
			};

			const result = await discoverCatalogItems(options);

			expect(result.successful).toBe(true); // Partial success
			expect(result.completedRanges).toBe(2); // 2 out of 3
			expect(result.failedRanges).toBe(1);
			expect(result.errors.length).toBe(1);
			expect(result.errors[0]).toContain("00_0001");
		});

		test("should handle catalog pages with no item data gracefully", async () => {
			const mockScraper = {
				scrapeItem: vi.fn().mockResolvedValue({ success: true, items: [] }),
			};

			vi.doMock(MOCK_SCRAPPERS_PATH, () => ({
				BandaiHobbyScraper: vi.fn(() => mockScraper),
			}));

			const options = {
				ranges: ["00_0000"],
				outputDir: TEST_OUTPUT_DIR,
				cache: true,
				resume: false,
				verbose: false,
				delayMs: DELAY_MS,
			};

			const result = await discoverCatalogItems(options);

			expect(result.successful).toBe(true);
			expect(result.completedRanges).toBe(1);
			expect(result.discoveredUrls).toBe(0);
			expect(result.processedUrls).toBe(0);
		});

		test("should log errors when verbose is enabled", async () => {
			const mockScraper = {
				scrapeItem: vi.fn().mockRejectedValue(new Error("Test error")),
			};

			vi.doMock(MOCK_SCRAPPERS_PATH, () => ({
				BandaiHobbyScraper: vi.fn(() => mockScraper),
			}));

			const consoleSpy = vi.spy(console, "log");

			const options = {
				ranges: ["00_0000"],
				outputDir: "./data/bandai/items/",
				cache: true,
				resume: false,
				verbose: true,
				delayMs: 1000,
			};

			await discoverCatalogItems(options);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Error processing catalog range"),
			);
		});

		test("should handle rate limiting delays between ranges", async () => {
			const mockScraper = {
				scrapeItem: vi.fn().mockResolvedValue({ success: true, items: [] }),
			};

			vi.doMock(MOCK_SCRAPPERS_PATH, () => ({
				BandaiHobbyScraper: vi.fn(() => mockScraper),
			}));

			const startTime = Date.now();

			const options = {
				ranges: ["00_0000", "00_0001"],
				outputDir: TEST_OUTPUT_DIR,
				cache: true,
				resume: false,
				verbose: false,
				delayMs: DELAY_MS,
			};

			await discoverCatalogItems(options);

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Should have delays for rate limiting between ranges
			expect(duration).toBeGreaterThan(1000);
		});

		test("should handle invalid range identifiers", async () => {
			const options = {
				ranges: ["invalid_range"],
				outputDir: TEST_OUTPUT_DIR,
				cache: true,
				resume: false,
				verbose: false,
				delayMs: DELAY_MS,
			};

			const result = await discoverCatalogItems(options);

			expect(result.successful).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain("invalid_range");
		});
	});
});