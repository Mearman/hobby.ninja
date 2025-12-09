import { describe, test, expect, vi } from "vitest";

import { processCatalogRanges, buildCatalogUrl } from "../../cli/catalog-discovery";

// Mock the BaseScraper since we're testing integration with existing scraper
vi.mock("../../scrappers", () => ({
	getScraper: vi.fn(() => ({
		fetchPage: vi.fn(),
	})),
}));

// Mock the BandaiHobbyScraper
vi.mock("../scrappers", () => ({
	BandaiHobbyScraper: vi.fn(),
}));

describe("Catalog Discovery - Range Processing", () => {
	describe("processCatalogRanges", () => {
		test("should process multiple catalog ranges and pass to scraper", async () => {
			// Mock successful scraper processing
			const mockScraper = {
				scrapeItem: vi.fn()
					.mockResolvedValueOnce({ success: true, itemId: "catalog-00_0000" })
					.mockResolvedValueOnce({ success: true, itemId: "catalog-00_0001" }),
			};

			vi.doMock("../scrappers", () => ({
				BandaiHobbyScraper: vi.fn(() => mockScraper),
			}));

			const ranges = ["00_0000", "00_0001"];
			const result = await processCatalogRanges(ranges);

			expect(result.totalRanges).toBe(2);
			expect(result.completedRanges).toBe(2);
			expect(result.failedRanges).toBe(0);
			expect(result.errors).toHaveLength(0);
		});

		test("should handle empty ranges array", async () => {
			const ranges: string[] = [];
			const result = await processCatalogRanges(ranges);

			expect(result.totalRanges).toBe(0);
			expect(result.completedRanges).toBe(0);
			expect(result.failedRanges).toBe(0);
			expect(result.errors).toHaveLength(0);
		});

		test("should handle range processing errors gracefully", async () => {
			// Mock one successful, one failed
			const mockScraper = {
				scrapeItem: vi.fn()
					.mockResolvedValueOnce({ success: true, itemId: "catalog-00_0000" })
					.mockRejectedValueOnce(new Error("Network timeout")),
			};

			vi.doMock("../scrappers", () => ({
				BandaiHobbyScraper: vi.fn(() => mockScraper),
			}));

			const ranges = ["00_0000", "00_0001"];
			const result = await processCatalogRanges(ranges);

			expect(result.totalRanges).toBe(2);
			expect(result.completedRanges).toBe(1); // Only one succeeded
			expect(result.failedRanges).toBe(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toContain("00_0001");
		});

		test("should collect statistics per range", async () => {
			const mockScraper = {
				scrapeItem: vi.fn()
					.mockResolvedValueOnce({ success: true, items: ["item1", "item2"] })
					.mockResolvedValueOnce({ success: true, items: ["item3"] }),
			};

			vi.doMock("../scrappers", () => ({
				BandaiHobbyScraper: vi.fn(() => mockScraper),
			}));

			const ranges = ["00_0000", "00_0001"];
			const result = await processCatalogRanges(ranges);

			expect(result.rangeStats).toHaveLength(2);
			expect(result.rangeStats["00_0000"]).toEqual({
				status: "success",
				error: undefined,
			});
			expect(result.rangeStats["00_0001"]).toEqual({
				status: "success",
				error: undefined,
			});
		});

		test("should build correct catalog URLs for processing", async () => {
			const ranges = ["00_0000", "00_0001"];

			expect(buildCatalogUrl("00_0000")).toBe("https://bandai-hobby.net/item/00_0000/");
			expect(buildCatalogUrl("00_0001")).toBe("https://bandai-hobby.net/item/00_0001/");
		});

		test("should handle 404 errors for non-existent ranges", async () => {
			const mockScraper = {
				scrapeItem: vi.fn().mockRejectedValue(new Error("HTTP 404: Page not found")),
			};

			vi.doMock("../scrappers", () => ({
				BandaiHobbyScraper: vi.fn(() => mockScraper),
			}));

			const ranges = ["99_9999"]; // Assume this doesn't exist
			const result = await processCatalogRanges(ranges);

			expect(result.totalRanges).toBe(1);
			expect(result.completedRanges).toBe(0);
			expect(result.failedRanges).toBe(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toContain("99_9999");
		});
	});
});