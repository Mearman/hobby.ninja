import { promises as fs } from "node:fs";
import * as path from "node:path";

import { getScraper } from "@hobby-ninja/scrapers";
import type { BaseScraper } from "@hobby-ninja/scrapers/base-scraper";

import { validateProductData } from "../schemas/validation.js";
import type { ProductData } from "../types/product-data.js";
import { CacheManager } from "../utils/cache-manager.js";
import { BandaiRateLimiter } from "../utils/rate-limiter.js";
import { ItemsIndexUpdater } from "./items-index-updater.js";
import { ManualsIndexUpdater } from "./manuals-index-updater.js";


export interface ScrapeOptions {
  source: string;
  language: string;
  output: string;
  cache: boolean;
  resume: boolean;
  verbose: boolean;
  dryRun: boolean;
  maxAgeDays: number;
}

export interface ScrapeResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  cached: number;
  new: number;
  errors: string[];
  duration: number;
}

export class ScrapeCommand {
	private cacheManager: CacheManager;
	private rateLimiter: BandaiRateLimiter;
	private scraper: BaseScraper;

	constructor() {
		this.cacheManager = new CacheManager();
		this.rateLimiter = new BandaiRateLimiter();
		this.scraper = getScraper("bandai-hobby");
	}

	async execute(options: ScrapeOptions): Promise<ScrapeResult> {
		const startTime = Date.now();

		try {
			// Initialize cache
			if (options.cache) {
				await this.cacheManager.initialize();
			}

			// Load index and get items to scrape based on max age
			const maxAgeHours = options.maxAgeDays * 24;
			const itemsToScrape = this.getItemsToScrape(options.source, maxAgeHours);

			console.log(`Starting scrape: ${itemsToScrape.length} items to process`);
			if (options.maxAgeDays > 0) {
				console.log(`(Skipping items checked within last ${options.maxAgeDays} days)`);
			}

			if (options.dryRun) {
				console.log("DRY RUN MODE - No actual scraping will be performed");
				if (options.verbose && itemsToScrape.length > 0) {
					console.log("Items to scrape:", itemsToScrape.slice(0, 10).join(", "), itemsToScrape.length > 10 ? `... and ${itemsToScrape.length - 10} more` : "");
				}
				return {
					totalProcessed: itemsToScrape.length,
					successful: 0,
					failed: 0,
					cached: 0,
					new: 0,
					errors: [],
					duration: Date.now() - startTime,
				};
			}

			// Process items
			const result = await this.processItems(itemsToScrape, options);
			result.duration = Date.now() - startTime;

			// Save index (progress already saved incrementally)
			this.saveIndex(options.source);

			return result;
		} catch (error) {
			return {
				totalProcessed: 0,
				successful: 0,
				failed: 1,
				cached: 0,
				new: 0,
				errors: [error instanceof Error ? error.message : "Unknown error"],
				duration: Date.now() - startTime,
			};
		}
	}

	/**
	 * Get items to scrape based on source and max age filtering
	 */
	private getItemsToScrape(source: string, maxAgeHours: number): string[] {
		if (source === "bandai-hobby" || source === "bandai-catalog") {
			// Load items index and filter by age
			ItemsIndexUpdater.load();
			const stats = ItemsIndexUpdater.getDisplayStats();
			console.log(`Index loaded: ${stats.totalChecked} items tracked, ${stats.valid} with pages`);

			// Get all item IDs that have pages (we want to scrape content from valid pages)
			const allItemIds = this.getAllItemIds();

			if (maxAgeHours === 0) {
				// No filtering - scrape all items with pages
				return allItemIds;
			}

			// Filter to items not recently scraped
			return allItemIds.filter((id) => !ItemsIndexUpdater.wasPageRecentlyScraped(id, maxAgeHours));
		}

		if (source === "bandai-manual") {
			// Load manuals index and filter by age
			ManualsIndexUpdater.load();
			const stats = ManualsIndexUpdater.getDisplayStats();
			console.log(`Index loaded: ${stats.totalChecked} manuals tracked, ${stats.valid} with pages`);

			// Get all manual IDs that have pages
			const allManualIds = ManualsIndexUpdater.getIdsWithPages();

			if (maxAgeHours === 0) {
				// No filtering - scrape all manuals with pages
				return allManualIds;
			}

			// Filter to manuals not recently checked
			return ManualsIndexUpdater.getStaleIds(allManualIds, maxAgeHours);
		}

		console.warn(`Unknown source: ${source}`);
		return [];
	}

	/**
	 * Get all item IDs that have pages in the index
	 */
	private getAllItemIds(): string[] {
		ItemsIndexUpdater.load();
		// Get IDs by checking which ones are indexed with hasPage = true
		// We need to iterate through the index - for now, return items that need download
		// This is a simplified approach - in production, we'd want a dedicated method
		const testIds: string[] = [];
		for (let i = 1; i <= 9999; i++) {
			const id = `01_${i.toString().padStart(4, "0")}`;
			const status = ItemsIndexUpdater.isIndexed(id);
			if (status.indexed && status.hasPage) {
				testIds.push(id);
			}
		}
		return testIds;
	}

	/**
	 * Save the appropriate index based on source
	 */
	private saveIndex(source: string): void {
		if (source === "bandai-hobby" || source === "bandai-catalog") {
			ItemsIndexUpdater.save();
		} else if (source === "bandai-manual") {
			ManualsIndexUpdater.save();
		}
	}

	private async processItems(itemIds: string[], options: ScrapeOptions): Promise<ScrapeResult> {
		const results: ProductData[] = [];
		const errors: string[] = [];
		let cached = 0;
		let newItems = 0;

		for (let i = 0; i < itemIds.length; i++) {
			const itemId = itemIds[i];
			if (!itemId) {
				continue; // Skip undefined item IDs
			}

			// Build URL from item ID based on source
			const url = this.buildUrlFromItemId(itemId, options.source);

			try {
				console.log(`Processing ${i + 1}/${itemIds.length}: ${itemId}`);

				// Check cache first
				let productData = null;
				if (options.cache) {
					const cachedData = await this.cacheManager.getByUrl(url);
					if (cachedData?.rawHtml) {
						productData = JSON.parse(cachedData.rawHtml);
						cached++;
						if (options.verbose) {
							console.log(`  ✓ Cached data found`);
						}
					}
				}

				// Scrape if not in cache
				if (!productData) {
					productData = await this.rateLimiter.executeWithLimit(async () => {
						const html = await this.fetchPage(url);
						return this.scraper.extractFromPage(html, url);
					});

					// Cache the result
					if (options.cache && productData) {
						await this.cacheManager.setByUrl(url, JSON.stringify(productData), options.source);
					}
					newItems++;

					if (options.verbose) {
						console.log(`  ✓ Fresh data scraped`);
					}
				}

				// Validate the data
				if (productData) {
					const validation = validateProductData(productData);
					if (validation.isValid) {
						results.push(productData);
						if (options.verbose) {
							console.log(`  ✓ Data validated successfully`);
						}
					} else {
						errors.push(`${itemId}: ${validation.errors.join(", ")}`);
						if (options.verbose) {
							console.log(`  ⚠ Validation failed: ${validation.errors.join(", ")}`);
						}
					}
				}

				// Record progress in index (incremental save for crash recovery)
				this.recordItemScraped(itemId, options.source);
				if (i % 10 === 0) {
					// Save index every 10 items for crash recovery
					this.saveIndex(options.source);
				}

			} catch (error) {
				const errorMsg = `${itemId}: ${error instanceof Error ? error.message : "Unknown error"}`;
				errors.push(errorMsg);
				console.error(`  ✗ Error: ${errorMsg}`);
			}

			// No artificial delay between requests - retry logic handles rate limiting
		}

		// Save results to output directory
		if (results.length > 0) {
			await this.saveResults(results, options.output);
		}

		return {
			totalProcessed: itemIds.length,
			successful: results.length,
			failed: errors.length,
			cached,
			new: newItems,
			errors,
			duration: 0, // Will be set by caller
		};
	}

	/**
	 * Build URL from item ID based on source type
	 */
	private buildUrlFromItemId(itemId: string, source: string): string {
		if (source === "bandai-hobby" || source === "bandai-catalog") {
			// Format: 01_0001 -> https://bandai-hobby.net/item/0001/
			const numericPart = itemId.split("_")[1];
			return `https://bandai-hobby.net/item/${numericPart}/`;
		}

		if (source === "bandai-manual") {
			// Format: 1000 -> https://manual.bandai-hobby.net/1000/
			return `https://manual.bandai-hobby.net/${itemId}/`;
		}

		return itemId; // Fallback - assume it's already a URL
	}

	/**
	 * Record that an item was scraped in the appropriate index
	 */
	private recordItemScraped(itemId: string, source: string): void {
		if (source === "bandai-hobby" || source === "bandai-catalog") {
			ItemsIndexUpdater.recordPageScraped(itemId);
		} else if (source === "bandai-manual") {
			ManualsIndexUpdater.recordChecked(itemId);
		}
	}

	private async fetchPage(url: string): Promise<string> {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "GundamDataScraper/1.0 (+https://github.com/user/repo)",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "ja,en-US,en;q=0.9",
				"Cache-Control": "no-cache",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return await response.text();
	}

	private async saveResults(results: ProductData[], outputDir: string): Promise<void> {
		try {
			await fs.mkdir(outputDir, { recursive: true });

			// Save as JSON
			const jsonFile = path.join(outputDir, `products-${Date.now()}.json`);
			await fs.writeFile(jsonFile, JSON.stringify(results, null, 2));

			// Save as NDJSON for streaming
			const ndjsonFile = path.join(outputDir, `products-${Date.now()}.ndjson`);
			const ndjsonContent = results.map(item => JSON.stringify(item)).join("\n");
			await fs.writeFile(ndjsonFile, ndjsonContent);

			console.log(`Results saved to: ${jsonFile} and ${ndjsonFile}`);
			console.log(`Total products: ${results.length}`);
		} catch (error) {
			throw new Error(`Failed to save results: ${error}`);
		}
	}

}