import { describe, test, expect } from "vitest";

import type {
	CatalogDiscoveryOptions,
	CatalogDiscoveryResult,
	CatalogRange,
	CatalogDiscoveryInput,
} from "../../cli/types/catalog-discovery";

describe("CatalogDiscovery Types", () => {
	describe("CatalogDiscoveryOptions", () => {
		test("should create valid options with required fields", () => {
			const options: CatalogDiscoveryOptions = {
				ranges: ["01_1000", "02_1000"],
				outputDir: "./data/bandai/items/",
				cache: true,
				resume: false,
				verbose: false,
				delayMs: 2000,
			};

			expect(options.ranges).toEqual(["01_1000", "02_1000"]);
			expect(options.outputDir).toBe("./data/bandai/items/");
			expect(options.cache).toBe(true);
			expect(options.resume).toBe(false);
			expect(options.verbose).toBe(false);
			expect(options.delayMs).toBe(2000);
		});

		test("should accept empty ranges array", () => {
			const options: CatalogDiscoveryOptions = {
				ranges: [],
				outputDir: "./data/bandai/items/",
				cache: true,
				resume: false,
				verbose: false,
				delayMs: 2000,
			};

			expect(options.ranges).toEqual([]);
		});
	});

	describe("CatalogDiscoveryResult", () => {
		test("should create result with all fields", () => {
			const result: CatalogDiscoveryResult = {
				discoveredUrls: 150,
				processedUrls: 145,
				successful: 140,
				failed: 5,
				errors: ["Network timeout on item 12345"],
				duration: 300_000,
				rangesCompleted: ["01_1000", "02_1000"],
			};

			expect(result.discoveredUrls).toBe(150);
			expect(result.processedUrls).toBe(145);
			expect(result.successful).toBe(140);
			expect(result.failed).toBe(5);
			expect(result.errors).toContain("Network timeout on item 12345");
			expect(result.duration).toBe(300_000);
			expect(result.rangesCompleted).toEqual(["01_1000", "02_1000"]);
		});

		test("should handle empty result", () => {
			const result: CatalogDiscoveryResult = {
				discoveredUrls: 0,
				processedUrls: 0,
				successful: 0,
				failed: 0,
				errors: [],
				duration: 0,
				rangesCompleted: [],
			};

			expect(result.discoveredUrls).toBe(0);
			expect(result.errors).toEqual([]);
			expect(result.rangesCompleted).toEqual([]);
		});
	});

	describe("CatalogRange", () => {
		test("should create catalog range with all fields", () => {
			const range: CatalogRange = {
				id: "01_1000",
				url: "https://bandai-hobby.net/item/01_1000/",
				status: "completed",
				itemCount: 50,
				error: undefined,
			};

			expect(range.id).toBe("01_1000");
			expect(range.url).toBe("https://bandai-hobby.net/item/01_1000/");
			expect(range.status).toBe("completed");
			expect(range.itemCount).toBe(50);
			expect(range.error).toBeUndefined();
		});

		test("should handle failed range with error", () => {
			const range: CatalogRange = {
				id: "02_1000",
				url: "https://bandai-hobby.net/item/02_1000/",
				status: "failed",
				itemCount: 0,
				error: "Page not found",
			};

			expect(range.status).toBe("failed");
			expect(range.error).toBe("Page not found");
		});

		test("should validate status values", () => {
			const validStatuses = ["pending", "discovering", "completed", "failed"] as const;

			for (const status of validStatuses) {
				const range: CatalogRange = {
					id: "test",
					url: "https://example.com",
					status,
					itemCount: 0,
				};
				expect(["pending", "discovering", "completed", "failed"]).toContain(range.status);
			}
		});
	});

	describe("CatalogDiscoveryInput", () => {
		test("should create input with all options", () => {
			const input: CatalogDiscoveryInput = {
				source: "bandai-items-catalog",
				ranges: ["01_1000"],
				output: "./custom-output/",
				cache: false,
				resume: true,
				verbose: true,
				dryRun: true,
				delayMs: 5000,
			};

			expect(input.source).toBe("bandai-items-catalog");
			expect(input.ranges).toEqual(["01_1000"]);
			expect(input.output).toBe("./custom-output/");
			expect(input.cache).toBe(false);
			expect(input.resume).toBe(true);
			expect(input.verbose).toBe(true);
			expect(input.dryRun).toBe(true);
			expect(input.delayMs).toBe(5000);
		});

		test("should create minimal input", () => {
			const input: CatalogDiscoveryInput = {
				source: "bandai-items-catalog",
			};

			expect(input.source).toBe("bandai-items-catalog");
			expect(input.ranges).toBeUndefined();
			expect(input.output).toBeUndefined();
		});
	});
});