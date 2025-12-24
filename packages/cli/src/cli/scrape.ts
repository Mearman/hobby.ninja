/**
 * Unified scrape command for bandai-hobby items and manuals
 *
 * Workflow:
 * 1. For each item on bandai-hobby.net/item:
 *    - Scrape item data and update JSON
 *    - If item has manualId, scrape manual data and update JSON
 *    - Download all associated assets (item images + manual assets)
 *    - Complete all before moving to next item
 *
 * 2. After all items processed:
 *    - Find manuals not discovered via product items (orphans)
 *    - Process orphan manuals sequentially
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import {
	TranslationService,
	loadDictionary,
	addPhraseSync,
	lookupPhrase,
	rebuildAndReloadDictionary,
} from "@hobby-ninja/translation";
import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";
import { chromium, type Browser, type BrowserContext, type Route } from "playwright";


import { writeJsonIfChanged } from "../utils/file-utils.js";
import { findExistingItemImage, stripEphemeralImageUrls } from "../utils/image-utils.js";
import { BandaiRateLimiter } from "../utils/rate-limiter.js";


import { BandaiCatalogParser, type EntityData, type Item, type ItemImage, type ParsedAccessoryItem } from "./bandai-catalog-parser.js";
import { parseCountedItems } from "./count-parser.js";
import { extractFilenameFromUrl } from "./download-command.js";
import { GlobalSiteLookup, type GlobalSiteData } from "./global-site-lookup.js";
import { ItemsIndexUpdater } from "./items-index-updater.js";
import { ManualParser, type ManualData } from "./manual-parser.js";
import { ManualsIndexUpdater } from "./manuals-index-updater.js";


export interface ScrapeOptions {
	language: string;
	output: string;
	cache: boolean;
	resume: boolean;
	dryRun: boolean;
	maxAgeDays: number;
	/** Single specific ID to process (e.g., "01_1234") */
	id?: string;
	/** Start ID for range (e.g., "01_1000") */
	start?: string;
	/** End ID for range (e.g., "01_2000") */
	end?: string;
	/** Number of items to process from start */
	count?: number;
	/** Profile timing for each step */
	profile?: boolean;
}

/** Timing data for profiling */
interface StepTiming {
	name: string;
	durationMs: number;
}

export interface ScrapeResult {
	totalProcessed: number;
	successful: number;
	failed: number;
	cached: number;
	new: number;
	errors: string[];
	duration: number;
	/** Manual IDs discovered during item scraping */
	discoveredManuals: number;
	/** Orphan manuals processed (not linked to items) */
	orphanManuals: {
		total: number;
		processed: number;
		failed: number;
	};
	/** Images downloaded */
	imagesDownloaded: number;
	/** Translations updated in existing items */
	translationsUpdated: number;
}

// Constants
const UNKNOWN_ERROR = "Unknown error";
const MAX_ITEM_ID = 9999;
const DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

// Data directories
const ITEMS_DATA_DIR = resolveWorkspacePath("data/src/items");
const MANUALS_DATA_DIR = resolveWorkspacePath("data/src/manuals");
const BRANDS_DATA_DIR = resolveWorkspacePath("data/src/brands");
const SERIES_DATA_DIR = resolveWorkspacePath("data/src/series");
const CATEGORIES_DATA_DIR = resolveWorkspacePath("data/src/categories");
const ASSETS_DIR = resolveWorkspacePath("assets/images/items");
const MANUALS_ASSETS_DIR = resolveWorkspacePath("assets/manuals");

export class ScrapeCommand {
	private rateLimiter: BandaiRateLimiter;
	private parser: BandaiCatalogParser;
	private manualParser: ManualParser;
	private globalLookup: GlobalSiteLookup;
	private translator: TranslationService;
	/** Manual IDs discovered during item scraping (linked to items) */
	private discoveredManualIds = new Set<string>();
	/** Playwright browser instance */
	private browser: Browser | null = null;
	private browserContext: BrowserContext | null = null;
	/** Track if new translations were added (need dictionary rebuild) */
	private translationsAdded = false;

	constructor() {
		this.rateLimiter = new BandaiRateLimiter();
		this.parser = new BandaiCatalogParser();
		this.manualParser = new ManualParser();
		this.globalLookup = new GlobalSiteLookup();
		this.translator = new TranslationService();
	}

	private async initializeBrowser(): Promise<void> {
		this.browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
		this.browserContext = await this.browser.newContext({
			userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			extraHTTPHeaders: {
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "ja,en-US,en;q=0.5",
			},
		});

		// Block unnecessary resources to speed up page loads
		await this.browserContext.route("**/*", (route: Route) => {
			const resourceType = route.request().resourceType();
			if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
				return route.abort();
			}
			return route.continue();
		});
	}

	private async cleanupBrowser(): Promise<void> {
		if (this.browserContext) {
			await this.browserContext.close();
			this.browserContext = null;
		}
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}

	async execute(options: ScrapeOptions): Promise<ScrapeResult> {
		const startTime = Date.now();
		const result: ScrapeResult = {
			totalProcessed: 0,
			successful: 0,
			failed: 0,
			cached: 0,
			new: 0,
			errors: [],
			duration: 0,
			discoveredManuals: 0,
			orphanManuals: { total: 0, processed: 0, failed: 0 },
			imagesDownloaded: 0,
			translationsUpdated: 0,
		};

		try {
			// Load indexes
			ItemsIndexUpdater.load();
			ManualsIndexUpdater.load();

			// Load translation dictionary for canonical translations
			try {
				await loadDictionary();
				console.log("Translation dictionary loaded");
			} catch {
				console.log("Translation dictionary not found (will be created)");
			}

			const itemsStats = ItemsIndexUpdater.getDisplayStats();
			const manualsStats = ManualsIndexUpdater.getDisplayStats();
			console.log(`Items index: ${itemsStats.totalChecked} tracked, ${itemsStats.valid} with pages`);
			console.log(`Manuals index: ${manualsStats.totalChecked} tracked, ${manualsStats.valid} with pages`);

			// Get all items and determine what needs processing
			const maxAgeHours = options.maxAgeDays * 24;
			const allItemIds = this.getAllItemIds(options);
			const itemsNeedingScrape = new Set(this.getItemsToProcess(options, maxAgeHours));

			console.log(`\n=== Phase 1: Processing Items ===`);
			console.log(`Total items: ${allItemIds.length}, needing scrape: ${itemsNeedingScrape.size}`);
			if (options.maxAgeDays > 0) {
				console.log(`(Re-scraping items not checked within last ${options.maxAgeDays} days)`);
			}

			if (options.dryRun) {
				console.log("DRY RUN MODE - No actual scraping will be performed");
				if (allItemIds.length > 0) {
					console.log("Items:", allItemIds.slice(0, 10).join(", "), allItemIds.length > 10 ? `... and ${allItemIds.length - 10} more` : "");
				}
				result.totalProcessed = allItemIds.length;
				result.duration = Date.now() - startTime;
				return result;
			}

			// Initialize browser for scraping (site requires JS rendering)
			console.log("Initializing browser...");
			await this.initializeBrowser();
			if (!this.browserContext) {
				throw new Error("Browser context failed to initialize");
			}
			this.globalLookup.setBrowserContext(this.browserContext);

			// Phase 1: Process each item - scrape if needed, then ensure translations
			for (let i = 0; i < allItemIds.length; i++) {
				const itemId = allItemIds[i];
				if (!itemId) continue;

				// Check if item is a blog post - cleanup and skip
				if (ItemsIndexUpdater.isBlog(itemId)) {
					const removed = await this.cleanupBlogItem(itemId);
					if (removed) {
						console.log(`\n--- [${i + 1}/${allItemIds.length}] Removed blog item ${itemId} ---`);
					}
					continue;
				}

				const needsScrape = itemsNeedingScrape.has(itemId);

				// If item needs scraping, do full processing
				if (needsScrape) {
					console.log(`\n--- [${i + 1}/${allItemIds.length}] Processing item ${itemId} ---`);

					try {
						const itemResult = await this.processItemComplete(itemId, options);

						if (itemResult.success) {
							result.successful++;
							if (itemResult.cached) result.cached++;
							else result.new++;

							if (itemResult.manualId) {
								this.discoveredManualIds.add(itemResult.manualId);
							}
						} else {
							result.failed++;
							if (itemResult.error) {
								result.errors.push(`${itemId}: ${itemResult.error}`);
								console.error(`  ✗ Failed: ${itemResult.error}`);
							}
						}

						result.totalProcessed++;
					} catch (error) {
						result.failed++;
						result.totalProcessed++;
						const errorMsg = error instanceof Error ? error.message : UNKNOWN_ERROR;
						result.errors.push(`${itemId}: ${errorMsg}`);
						console.error(`  ✗ Error: ${errorMsg}`);
					}
				} else {
					// Item already scraped - check if it needs translation updates
					try {
						const updated = await this.updateItemTranslations(itemId);
						if (updated) {
							result.translationsUpdated++;
							console.log(`\n--- [${i + 1}/${allItemIds.length}] Updated translations for ${itemId} ---`);
						}
					} catch {
						// Silently skip translation errors for already-scraped items
					}
				}

				// Save indexes periodically for crash recovery
				if (i % 10 === 0) {
					ItemsIndexUpdater.save();
					ManualsIndexUpdater.save();
				}
			}

			result.discoveredManuals = this.discoveredManualIds.size;
			console.log(`\n✓ Phase 1 complete: ${result.successful} items scraped, ${result.translationsUpdated} translations updated, ${this.discoveredManualIds.size} manuals discovered`);

			// Phase 2: Process orphan manuals (not linked to any item)
			console.log(`\n=== Phase 2: Processing Orphan Manuals ===`);
			const orphanManualIds = this.getOrphanManualIds(maxAgeHours);
			result.orphanManuals.total = orphanManualIds.length;

			if (orphanManualIds.length === 0) {
				console.log("No orphan manuals to process");
			} else {
				console.log(`Orphan manuals to process: ${orphanManualIds.length}`);

				for (let i = 0; i < orphanManualIds.length; i++) {
					const manualId = orphanManualIds[i];
					if (!manualId) continue;

					console.log(`\n--- [${i + 1}/${orphanManualIds.length}] Processing orphan manual ${manualId} ---`);

					try {
						const manualResult = await this.processManualComplete(manualId, options);

						if (manualResult.success) {
							result.orphanManuals.processed++;
						} else {
							result.orphanManuals.failed++;
							if (manualResult.error) {
								result.errors.push(`manual-${manualId}: ${manualResult.error}`);
							}
						}

						// Save index periodically
						if (i % 10 === 0) {
							ManualsIndexUpdater.save();
						}
					} catch (error) {
						result.orphanManuals.failed++;
						const errorMsg = error instanceof Error ? error.message : UNKNOWN_ERROR;
						result.errors.push(`manual-${manualId}: ${errorMsg}`);
						console.error(`  ✗ Error: ${errorMsg}`);
					}
				}

				console.log(`\n✓ Phase 2 complete: ${result.orphanManuals.processed} orphan manuals processed`);
			}

			// Save final index state
			ItemsIndexUpdater.save();
			ManualsIndexUpdater.save();

			// Rebuild dictionary if new translations were added
			if (this.translationsAdded) {
				console.log("\nRebuilding translation dictionary with new entries...");
				try {
					await rebuildAndReloadDictionary();
					console.log("Dictionary rebuilt successfully");
				} catch (error) {
					const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
					console.log(`Dictionary rebuild failed: ${msg}`);
				}
			}

			result.duration = Date.now() - startTime;
			return result;
		} catch (error) {
			result.errors.push(error instanceof Error ? error.message : UNKNOWN_ERROR);
			result.duration = Date.now() - startTime;
			return result;
		} finally {
			// Always cleanup browser
			await this.cleanupBrowser();
		}
	}

	/**
	 * Get items to process based on max age filtering
	 */
	private getItemsToProcess(options: ScrapeOptions, maxAgeHours: number): string[] {
		const allItemIds = this.getAllItemIds(options);

		if (maxAgeHours === 0) {
			return allItemIds;
		}

		return allItemIds.filter((id) => !ItemsIndexUpdater.wasPageRecentlyScraped(id, maxAgeHours));
	}

	/**
	 * Parse an item ID and return the numeric suffix
	 * Accepts: "01_1234", "1234", "01_0001", "0001", "1"
	 * All resolve to the numeric value (e.g., 1234 or 1)
	 */
	private parseItemIdSuffix(id: string): number {
		// If contains underscore, extract suffix
		if (id.includes("_")) {
			const parts = id.split("_");
			if (parts.length !== 2 || !parts[1]) return 0;
			return Number.parseInt(parts[1], 10);
		}
		// Otherwise treat entire string as the numeric ID
		return Number.parseInt(id, 10);
	}

	/**
	 * Format a numeric suffix into a padded item ID
	 * e.g., 1234 -> "01_1234", 1 -> "01_0001"
	 */
	private formatItemId(suffix: number): string {
		return `01_${suffix.toString().padStart(4, "0")}`;
	}

	/**
	 * Get item IDs to process based on options
	 * Supports: single ID, start+count, start+end, or all items
	 */
	private getAllItemIds(options: ScrapeOptions): string[] {
		// Single specific ID
		if (options.id) {
			const id = this.formatItemId(this.parseItemIdSuffix(options.id));
			return [id];
		}

		// Range specified by start (and optionally end or count)
		if (options.start) {
			const startSuffix = this.parseItemIdSuffix(options.start);
			let endSuffix: number;

			if (options.end) {
				endSuffix = this.parseItemIdSuffix(options.end);
			} else if (options.count) {
				endSuffix = startSuffix + options.count - 1;
			} else {
				// Just start specified - process that single item
				return [this.formatItemId(startSuffix)];
			}

			// Generate range
			const itemIds: string[] = [];
			for (let i = startSuffix; i <= endSuffix && i <= MAX_ITEM_ID; i++) {
				const id = this.formatItemId(i);
				const status = ItemsIndexUpdater.isIndexed(id);
				if (status.indexed && status.hasPage) {
					itemIds.push(id);
				}
			}
			return itemIds;
		}

		// Default: all items with pages
		const itemIds: string[] = [];
		for (let i = 1; i <= MAX_ITEM_ID; i++) {
			const id = this.formatItemId(i);
			const status = ItemsIndexUpdater.isIndexed(id);
			if (status.indexed && status.hasPage) {
				itemIds.push(id);
			}
		}
		return itemIds;
	}

	/**
	 * Remove JSON/HTML files for a blog post item
	 * @returns true if any files were removed
	 */
	private async cleanupBlogItem(id: string): Promise<boolean> {
		const jsonPath = path.join(ITEMS_DATA_DIR, `${id}.json`);
		const htmlPath = path.join(ITEMS_DATA_DIR, `${id}.html`);
		const enHtmlPath = path.join(ITEMS_DATA_DIR, `${id}.en.html`);
		const assetsPath = path.join(ASSETS_DIR, id);
		let removed = false;

		// Remove JSON file
		try {
			await fs.unlink(jsonPath);
			removed = true;
		} catch {
			// File doesn't exist, skip
		}

		// Remove HTML cache files
		try {
			await fs.unlink(htmlPath);
		} catch {
			// File doesn't exist, skip
		}
		try {
			await fs.unlink(enHtmlPath);
		} catch {
			// File doesn't exist, skip
		}

		// Remove assets directory if it exists
		try {
			await fs.rm(assetsPath, { recursive: true, force: true });
		} catch {
			// Directory doesn't exist, skip
		}

		return removed;
	}

	/**
	 * Get manual IDs that weren't discovered via items (orphans)
	 */
	private getOrphanManualIds(maxAgeHours: number): string[] {
		const allManualIds = ManualsIndexUpdater.getIdsWithPages();

		// Filter out manuals that were discovered via items
		const orphanIds = allManualIds.filter((id) => !this.discoveredManualIds.has(id));

		if (maxAgeHours === 0) {
			return orphanIds;
		}

		// Filter by age
		return ManualsIndexUpdater.getStaleIds(orphanIds, maxAgeHours);
	}

	// Time conversion constants
	private static readonly MS_PER_SECOND = 1000;
	private static readonly SECONDS_PER_MINUTE = 60;
	private static readonly MINUTES_PER_HOUR = 60;
	private static readonly HOURS_PER_DAY = 24;

	/**
	 * Print timing summary for profiling
	 */
	private printTimings(options: ScrapeOptions, timings: StepTiming[]): void {
		if (!options.profile || timings.length === 0) return;

		const total = timings.reduce((sum, t) => sum + t.durationMs, 0);
		console.log(`  ⏱ Timings: ${timings.map((t) => `${t.name}=${t.durationMs.toFixed(0)}ms`).join(", ")} (total=${total.toFixed(0)}ms)`);
	}

	/**
	 * Process a single item completely: scrape data, scrape manual if linked, download all assets
	 */
	private async processItemComplete(
		itemId: string,
		options: ScrapeOptions,
	): Promise<{ success: boolean; cached: boolean; manualId?: string; error?: string }> {
		const timings: StepTiming[] = [];
		const time = <T>(name: string, fn: () => T): T => {
			const start = performance.now();
			const result = fn();
			if (result instanceof Promise) {
				const timedPromise = result.then((r: Awaited<T>) => {
					timings.push({ name, durationMs: performance.now() - start });
					return r;
				});
				return timedPromise as T;
			}
			timings.push({ name, durationMs: performance.now() - start });
			return result;
		};

		// Convert itemId (e.g., "01_0001") to URL format (e.g., "01_1")
		const [category = "", numStr] = itemId.split("_");
		const urlId = `${category}_${Number.parseInt(numStr ?? "0", 10)}`;
		const url = `https://bandai-hobby.net/item/${urlId}/`;

		// File paths
		const htmlPath = path.join(ITEMS_DATA_DIR, `${itemId}.html`);
		const jsonPath = path.join(ITEMS_DATA_DIR, `${itemId}.json`);

		// Step 1: Get HTML (from saved file or fetch fresh)
		console.log(`  Scraping item data from ${url}`);
		let html: string | null = null;
		let cached = false;

		// Check for existing HTML file (use as cache)
		if (options.cache) {
			try {
				const htmlStat = await time("cache-stat", () => fs.stat(htmlPath));
				const ageMs = Date.now() - htmlStat.mtimeMs;
				const maxAgeMs = options.maxAgeDays * ScrapeCommand.HOURS_PER_DAY * ScrapeCommand.MINUTES_PER_HOUR * ScrapeCommand.SECONDS_PER_MINUTE * ScrapeCommand.MS_PER_SECOND;
				const ageMinutes = Math.round(ageMs / ScrapeCommand.MS_PER_SECOND / ScrapeCommand.SECONDS_PER_MINUTE);
				const ageHours = Math.round(ageMs / ScrapeCommand.MS_PER_SECOND / ScrapeCommand.SECONDS_PER_MINUTE / ScrapeCommand.MINUTES_PER_HOUR);

				if (maxAgeMs === 0 || ageMs < maxAgeMs) {
					html = await time("cache-read", () => fs.readFile(htmlPath, "utf8"));
					cached = true;
					console.log(`  Using cached HTML (${ageMinutes} min old)`);
				} else {
					console.log(`  HTML too old (${ageHours} hours), re-fetching`);
				}
			} catch {
				// File doesn't exist, will fetch
			}
		}

		// Fetch fresh HTML if needed
		if (!html) {
			console.log(`  Fetching fresh...`);
			try {
				html = await time("fetch-html", () =>
					this.rateLimiter.executeWithLimit(async () => {
						return this.fetchPage(url);
					}),
				);

				// Save HTML file
				await time("save-html", () => fs.writeFile(htmlPath, html, "utf8"));
			} catch (fetchError) {
				const errorMsg = fetchError instanceof Error ? fetchError.message : "Unknown fetch error";
				this.printTimings(options, timings);
				return { success: false, cached: false, error: `Fetch failed: ${errorMsg}` };
			}
		}

		// Step 2: Extract data from HTML using catalog parser
		const parseResult = time("parse", () => this.parser.parse(html, itemId, url));
		if (!parseResult.success || !parseResult.data) {
			this.printTimings(options, timings);
			return { success: false, cached, error: parseResult.error ?? "Parse failed" };
		}

		let itemData = parseResult.data;
		console.log(`  ✓ Data extracted: ${itemData.name.ja}`);

		// Step 2b: Look up English translations from global site
		let hasGlobalTranslation = false;
		const enHtmlPath = path.join(ITEMS_DATA_DIR, `${itemId}.en.html`);
		try {
			let globalData: GlobalSiteData | null = null;
			let usedEnCache = false;

			// Check for cached English HTML first
			if (options.cache) {
				try {
					const enHtmlStat = await time("en-cache-stat", () => fs.stat(enHtmlPath));
					const ageMs = Date.now() - enHtmlStat.mtimeMs;
					const maxAgeMs = options.maxAgeDays * ScrapeCommand.HOURS_PER_DAY * ScrapeCommand.MINUTES_PER_HOUR * ScrapeCommand.SECONDS_PER_MINUTE * ScrapeCommand.MS_PER_SECOND;

					if (maxAgeMs === 0 || ageMs < maxAgeMs) {
						const enHtml = await time("en-cache-read", () => fs.readFile(enHtmlPath, "utf8"));
						globalData = time("en-parse", () => this.globalLookup.parseFromHtml(enHtml));
						usedEnCache = true;
					}
				} catch {
					// Cache doesn't exist, will fetch
				}
			}

			// Fetch from network if no cache hit
			if (!globalData) {
				globalData = await time("global-lookup", () => this.globalLookup.lookup(itemId));

				// Save English HTML for future cache use
				if (globalData.hasPage && globalData.html) {
					await fs.writeFile(enHtmlPath, globalData.html, "utf8");
				}
			}

			if (globalData.hasPage) {
				itemData = this.mergeEnglishTranslation(itemData, globalData);
				hasGlobalTranslation = true;

				// Store canonical translations in dictionary (persisted immediately)
				this.storeCanonicalTranslations(itemData, globalData);

				const source = usedEnCache ? "cached" : "fetched";
				console.log(`  ✓ English translation (${source}): ${globalData.name ?? "(name)"}`);
			} else {
				const reason = globalData.error ? `: ${globalData.error}` : "";
				console.log(`  - No English page${reason}`);
			}
		} catch (error) {
			// Don't fail the item for English lookup failures
			const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
			console.log(`  ⚠ English lookup failed: ${msg}`);
		}

		// Step 2c: Fallback translation for items without global page
		if (!hasGlobalTranslation && !itemData.name.en) {
			try {
				itemData = await time("fallback-translate", () => this.translateItemFallback(itemData));
				if (itemData.name.en) {
					console.log(`  ✓ Fallback translation: ${itemData.name.en}`);
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				console.log(`  ⚠ Fallback translation failed: ${msg}`);
			}
		}

		// Step 3: Save item JSON
		const itemWritten = await time("save-json", () => this.saveItemJson(jsonPath, itemData));
		if (itemWritten) {
			console.log(`  ✓ Item JSON saved`);
		} else {
			console.log(`  - Item unchanged`);
		}

		// Step 3b: Upsert discovered entities (brands, series, categories)
		const entities = parseResult.entities;
		if (entities && entities.length > 0) {
			const newEntities = await time("upsert-entities", () => this.upsertEntities(entities));
			if (newEntities > 0) {
				console.log(`  ✓ ${newEntities} new entities added`);
			}
		}

		// Record in index that this item has a valid page
		ItemsIndexUpdater.recordFileCreated(itemId, itemData.name.ja);

		// Record that we scraped this page (for freshness tracking)
		ItemsIndexUpdater.recordPageScraped(itemId);

		// Only update extractedAt when item data was actually written/changed
		if (itemWritten) {
			ItemsIndexUpdater.recordExtracted(itemId);
		}

		// Step 4: Process linked manual if exists
		const manualId = itemData.manual?.id;
		if (manualId) {
			console.log(`  ✓ Manual link: ${manualId}`);
			try {
				await time("process-manual", () => this.processManualComplete(manualId, options));
				ManualsIndexUpdater.recordValid(manualId, itemData.name.ja);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				console.error(`  ⚠ Manual processing failed: ${errorMsg}`);
				// Don't fail the whole item for manual failure
			}
		}

		// Step 5: Download images for this item
		if (itemData.images && !options.dryRun) {
			try {
				const downloadResult = await time("download-images", () =>
					this.downloadItemImages(itemId, itemData, jsonPath),
				);
				if (downloadResult.downloaded > 0) {
					console.log(`  ✓ Images: ${downloadResult.downloaded} downloaded, ${downloadResult.skipped} skipped`);
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				console.error(`  ⚠ Image download failed: ${errorMsg}`);
			}
		}

		this.printTimings(options, timings);
		return { success: true, cached, manualId };
	}

	/**
	 * Process a manual completely: scrape data and download PDFs
	 */
	private async processManualComplete(
		manualId: string,
		options: ScrapeOptions,
	): Promise<{ success: boolean; error?: string }> {
		const timings: StepTiming[] = [];
		const time = <T>(name: string, fn: () => T): T => {
			const start = performance.now();
			const result = fn();
			if (result instanceof Promise) {
				const timedPromise = result.then((r: Awaited<T>) => {
					timings.push({ name, durationMs: performance.now() - start });
					return r;
				});
				return timedPromise as T;
			}
			timings.push({ name, durationMs: performance.now() - start });
			return result;
		};

		const url = `https://manual.bandai-hobby.net/menus/detail/${manualId}/`;
		const htmlPath = path.join(MANUALS_DATA_DIR, `${manualId}.html`);
		const jsonPath = path.join(MANUALS_DATA_DIR, `${manualId}.json`);

		console.log(`  Scraping manual at ${url}`);

		// Step 1: Get HTML (from saved file or fetch fresh)
		let html: string | null = null;

		// Check for existing HTML file (use as cache)
		if (options.cache) {
			try {
				const htmlStat = await time("cache-stat", () => fs.stat(htmlPath));
				const ageMs = Date.now() - htmlStat.mtimeMs;
				const maxAgeMs = options.maxAgeDays * ScrapeCommand.HOURS_PER_DAY * ScrapeCommand.MINUTES_PER_HOUR * ScrapeCommand.SECONDS_PER_MINUTE * ScrapeCommand.MS_PER_SECOND;
				const ageMinutes = Math.round(ageMs / ScrapeCommand.MS_PER_SECOND / ScrapeCommand.SECONDS_PER_MINUTE);
				const ageHours = Math.round(ageMs / ScrapeCommand.MS_PER_SECOND / ScrapeCommand.SECONDS_PER_MINUTE / ScrapeCommand.MINUTES_PER_HOUR);

				if (maxAgeMs === 0 || ageMs < maxAgeMs) {
					html = await time("cache-read", () => fs.readFile(htmlPath, "utf8"));
					console.log(`  Using cached HTML (${ageMinutes} min old)`);
				} else {
					console.log(`  HTML too old (${ageHours} hours), re-fetching`);
				}
			} catch {
				// File doesn't exist, will fetch
			}
		}

		// Fetch fresh HTML if needed
		if (!html) {
			console.log(`  Fetching fresh...`);
			try {
				html = await time("fetch-html", () =>
					this.rateLimiter.executeWithLimit(async () => {
						return this.fetchManualPage(url);
					}),
				);

				// Save HTML file
				await fs.mkdir(path.dirname(htmlPath), { recursive: true });
				await time("save-html", () => fs.writeFile(htmlPath, html, "utf8"));
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				ManualsIndexUpdater.recordChecked(manualId);
				this.printTimings(options, timings);
				return { success: false, error: `Fetch failed: ${errorMsg}` };
			}
		}

		// Step 2: Parse with ManualParser
		const parseResult = time("parse", () => this.manualParser.parse(html, manualId, url));
		if (!parseResult.success || !parseResult.data) {
			ManualsIndexUpdater.recordChecked(manualId);
			this.printTimings(options, timings);
			return { success: false, error: parseResult.error ?? "Parse failed" };
		}

		const manualData = parseResult.data;
		console.log(`  ✓ Manual data extracted: ${manualData.name.ja}`);
		console.log(`  ✓ Found ${manualData.pdfs.length} PDF(s)`);

		// Step 3: Download PDFs
		if (manualData.pdfs.length > 0 && !options.dryRun) {
			const downloadResult = await time("download-pdfs", () =>
				this.downloadManualPdfs(manualId, manualData),
			);
			if (downloadResult.downloaded > 0) {
				console.log(`  ✓ PDFs: ${downloadResult.downloaded} downloaded, ${downloadResult.skipped} skipped`);
			}
		}

		// Step 3b: Download/locate image
		if (manualData.image?.src && !options.dryRun) {
			await time("download-image", () => this.downloadManualImage(manualId, manualData));
		}

		// Step 3c: Translate manual if missing English
		if (!manualData.name.en) {
			try {
				await time("translate", () => this.translateManualFallback(manualData));
				if (manualData.name.en) {
					console.log(`  ✓ Translated: ${manualData.name.en}`);
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				console.log(`  ⚠ Translation failed: ${msg}`);
			}
		}

		// Step 4: Save manual JSON
		await time("save-json", () => this.saveManualJson(jsonPath, manualData));
		console.log(`  ✓ Manual JSON saved`);

		// Record in index (valid status + extraction timestamp)
		ManualsIndexUpdater.recordValid(manualId, manualData.name.ja);
		ManualsIndexUpdater.recordExtracted(manualId);

		this.printTimings(options, timings);
		return { success: true };
	}

	/**
	 * Fetch a manual page HTML
	 */
	private async fetchManualPage(url: string): Promise<string> {
		const response = await fetch(url, {
			headers: {
				"User-Agent": DEFAULT_USER_AGENT,
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "ja,en-US,en;q=0.9",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		return response.text();
	}

	/**
	 * Download PDFs for a manual and update paths
	 */
	private async downloadManualPdfs(
		manualId: string,
		manualData: ManualData,
	): Promise<{ downloaded: number; skipped: number }> {
		const stats = { downloaded: 0, skipped: 0 };

		// Create manual's PDF directory
		const manualPdfDir = path.join(MANUALS_ASSETS_DIR, manualId);
		await fs.mkdir(manualPdfDir, { recursive: true });

		for (const pdf of manualData.pdfs) {
			if (!pdf.url) continue;

			// Extract filename from URL (e.g., "1.pdf" from ".../pdf/1.pdf")
			const urlPath = new URL(pdf.url).pathname;
			const filename = path.basename(urlPath);

			// Check for existing file with either unpadded or padded name
			// URLs use unpadded (1.pdf) but existing files may be padded (0001.pdf)
			const existingPath = await this.findExistingPdf(manualPdfDir, filename);
			if (existingPath) {
				const existingFilename = path.basename(existingPath);
				pdf.path = `/manuals/${manualId}/${existingFilename}`;
				stats.skipped++;
				continue;
			}

			// Download the PDF using the URL filename
			const localPath = path.join(manualPdfDir, filename);
			const relativePath = `/manuals/${manualId}/${filename}`;

			try {
				const pdfBuffer = await this.downloadPdf(pdf.url);
				await fs.writeFile(localPath, pdfBuffer);
				pdf.path = relativePath;
				stats.downloaded++;
				console.log(`    Downloaded: ${filename}`);
			} catch (error) {
				const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				console.log(`    Failed: ${filename} - ${msg}`);
			}
		}

		return stats;
	}

	/**
	 * Find existing PDF file, checking both unpadded and padded filenames
	 * e.g., for "1.pdf", also checks "0001.pdf", "001.pdf", "01.pdf"
	 */
	private async findExistingPdf(dir: string, filename: string): Promise<string | null> {
		// Try exact filename first
		const exactPath = path.join(dir, filename);
		try {
			await fs.access(exactPath);
			return exactPath;
		} catch {
			// Not found, try padded versions
		}

		// Extract base name and extension (e.g., "1" and ".pdf")
		const ext = path.extname(filename);
		const base = path.basename(filename, ext);

		// If base is numeric, try padded versions
		const num = Number.parseInt(base, 10);
		if (!Number.isNaN(num)) {
			const paddedVersions = [
				num.toString().padStart(4, "0"), // 0001
				num.toString().padStart(3, "0"), // 001
				num.toString().padStart(2, "0"), // 01
			];

			for (const padded of paddedVersions) {
				if (padded === base) continue; // Skip if same as original
				const paddedPath = path.join(dir, `${padded}${ext}`);
				try {
					await fs.access(paddedPath);
					return paddedPath;
				} catch {
					// Not found, try next
				}
			}
		}

		return null;
	}

	/**
	 * Download a PDF from URL
	 */
	private async downloadPdf(url: string): Promise<Buffer> {
		const response = await fetch(url, {
			headers: {
				"User-Agent": DEFAULT_USER_AGENT,
				"Accept": "application/pdf,*/*;q=0.8",
				"Referer": "https://manual.bandai-hobby.net/",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		return Buffer.from(await response.arrayBuffer());
	}

	/**
	 * Download or locate manual image
	 * Prefers existing item assets over manual assets to avoid duplication.
	 * If image exists in both, removes the manual copy.
	 */
	private async downloadManualImage(
		manualId: string,
		manualData: ManualData,
	): Promise<void> {
		if (!manualData.image?.src) return;

		const imageUrl = manualData.image.src;
		const filename = extractFilenameFromUrl(imageUrl);
		// Extract base filename without extension or Bandai hash suffix (_s_xxxxx)
		// e.g., "155_303_s_kwjuc0ri80ktzu3ahk5r92ecrdr4.jpg" -> "155_303"
		const filenameWithoutExt = filename.replace(/\.[^.]+$/, "");
		const filenamePrefix = filenameWithoutExt.replace(/_s_[a-z0-9]+$/i, "");

		// Manual asset paths
		const manualImageDir = path.join(MANUALS_ASSETS_DIR, manualId);
		const manualLocalPath = path.join(manualImageDir, filename);

		// Check for existing image in items (preferred location)
		const existingItemPath = await findExistingItemImage(filenamePrefix);
		if (existingItemPath) {
			manualData.image.path = existingItemPath;
			console.log(`    Found existing image: ${existingItemPath}`);

			// Remove duplicate from manual assets if it exists
			try {
				await fs.access(manualLocalPath);
				await fs.unlink(manualLocalPath);
				console.log(`    Removed duplicate: /manuals/${manualId}/${filename}`);
				// Clean up empty directory
				await this.removeEmptyDir(manualImageDir);
			} catch {
				// Manual copy doesn't exist, nothing to remove
			}
			return;
		}

		// No item image found - check/download to manuals directory
		await fs.mkdir(manualImageDir, { recursive: true });
		const relativePath = `/manuals/${manualId}/${filename}`;

		// Check if already downloaded to manuals
		try {
			await fs.access(manualLocalPath);
			manualData.image.path = relativePath;
			console.log(`    Image already exists: ${filename}`);
			return;
		} catch {
			// File doesn't exist, download it
		}

		try {
			const response = await fetch(imageUrl, {
				headers: {
					"User-Agent": DEFAULT_USER_AGENT,
					"Accept": "image/*",
					"Referer": "https://manual.bandai-hobby.net/",
				},
			});

			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const buffer = Buffer.from(await response.arrayBuffer());
			await fs.writeFile(manualLocalPath, buffer);
			manualData.image.path = relativePath;
			console.log(`    Downloaded image: ${filename}`);
		} catch (error) {
			const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
			console.log(`    Failed to download image: ${msg}`);
		}
	}

	/**
	 * Remove directory if empty
	 */
	private async removeEmptyDir(dirPath: string): Promise<void> {
		try {
			const files = await fs.readdir(dirPath);
			if (files.length === 0) {
				await fs.rmdir(dirPath);
			}
		} catch {
			// Directory doesn't exist or can't be read
		}
	}

	/**
	 * Save manual data to JSON file, merging with existing data to preserve translations
	 */
	private async saveManualJson(filePath: string, data: ManualData): Promise<void> {
		await fs.mkdir(path.dirname(filePath), { recursive: true });

		// Merge with existing data to preserve English translations and metadata
		const mergedData = await this.mergeWithExistingManual(filePath, data);

		await fs.writeFile(filePath, JSON.stringify(mergedData, null, "\t"), "utf8");
	}

	/**
	 * Merge new manual data with existing file to preserve translations and metadata
	 */
	private async mergeWithExistingManual(filePath: string, newData: ManualData): Promise<ManualData> {
		try {
			const existingContent = await fs.readFile(filePath, "utf8");
			const existing = JSON.parse(existingContent) as Record<string, unknown>;

			// Preserve English name if not in new data
			if (existing["name"] && typeof existing["name"] === "object") {
				const existingName = existing["name"] as Record<string, string>;
				if (existingName["en"] && !newData.name.en) {
					newData.name.en = existingName["en"];
				}
			}

			// Preserve English PDF names
			if (existing["pdfs"] && Array.isArray(existing["pdfs"])) {
				for (let i = 0; i < newData.pdfs.length; i++) {
					const existingPdf = existing["pdfs"][i] as Record<string, unknown> | undefined;
					if (existingPdf?.["name"] && typeof existingPdf["name"] === "object") {
						const existingPdfName = existingPdf["name"] as Record<string, string>;
						if (existingPdfName["en"] && !newData.pdfs[i]?.name.en) {
							newData.pdfs[i].name.en = existingPdfName["en"];
						}
					}
				}
			}

			// Preserve English brand/series translations
			if (existing["brand"] && typeof existing["brand"] === "object") {
				const existingBrand = existing["brand"] as Record<string, unknown>;
				if (existingBrand["en"] && newData.brand && !newData.brand.en) {
					newData.brand.en = existingBrand["en"] as string;
				}
			}
			if (existing["series"] && typeof existing["series"] === "object") {
				const existingSeries = existing["series"] as Record<string, unknown>;
				if (existingSeries["en"] && newData.series && !newData.series.en) {
					newData.series.en = existingSeries["en"] as string;
				}
			}

			// Preserve image.path if exists (image structure matches items: { src, path })
			if (existing["image"] && typeof existing["image"] === "object") {
				const existingImage = existing["image"] as Record<string, unknown>;
				if (existingImage["path"] && newData.image && !newData.image.path) {
					newData.image.path = existingImage["path"] as string;
				}
			}

			return newData;
		} catch {
			// File doesn't exist or can't be read, use new data as-is
			return newData;
		}
	}

	/**
	 * Save item data to JSON file
	 * Note: Timing fields (extractedAt, pageScrapedAt) are stored in the
	 * centralized index.json, not in individual item files
	 */
	private async saveItemJson(filePath: string, data: Item): Promise<boolean> {
		// Merge with existing data to preserve local image paths
		const mergedData = await this.mergeWithExistingItem(filePath, data);

		// Strip ephemeral URLs before saving (CloudFront signed URLs expire)
		const outputData: Record<string, unknown> = { ...mergedData };
		if (mergedData.images && "product" in mergedData.images) {
			outputData["images"] = stripEphemeralImageUrls(mergedData.images);
		}

		return writeJsonIfChanged(filePath, outputData);
	}

	/**
	 * Merge new item data with existing file to preserve local image paths
	 */
	private async mergeWithExistingItem(filePath: string, newData: Item): Promise<Item> {
		try {
			const existingContent = await fs.readFile(filePath, "utf8");
			const existingItem = JSON.parse(existingContent) as Item;

			// Merge image paths from existing data
			if (existingItem.images && newData.images) {
				newData.images = this.mergeImagePaths(newData.images, existingItem.images);
			}

			// Preserve globalSiteUrls if global lookup failed but existing data has it
			if (existingItem.globalSiteUrls && !newData.globalSiteUrls) {
				newData.globalSiteUrls = existingItem.globalSiteUrls;
			}

			return newData;
		} catch {
			// File doesn't exist or can't be read, use new data as-is
			return newData;
		}
	}

	/**
	 * Merge local paths from existing images into new images
	 * Matches images by src URL to preserve downloaded paths
	 */
	private mergeImagePaths(newImages: Item["images"], existingImages: Item["images"]): Item["images"] {
		if (!newImages || !existingImages) return newImages;

		// Build a map of src -> path from existing images
		const pathMap = new Map<string, string>();
		for (const img of existingImages.product) {
			if (img.src && img.path) {
				pathMap.set(img.src, img.path);
			}
		}
		for (const img of existingImages.instructions) {
			if (img.src && img.path) {
				pathMap.set(img.src, img.path);
			}
		}

		// Apply existing paths to new images
		const mergeArray = (images: ItemImage[]): ItemImage[] => {
			return images.map((img) => {
				if (img.src && !img.path) {
					const existingPath = pathMap.get(img.src);
					if (existingPath) {
						return { ...img, path: existingPath };
					}
				}
				return img;
			});
		};

		return {
			product: mergeArray(newImages.product),
			instructions: mergeArray(newImages.instructions),
		};
	}

	/**
	 * Upsert entities (brands, series, categories) - only creates new ones
	 * Preserves all existing fields in entity files
	 * @returns Number of new entities created
	 */
	private async upsertEntities(entities: EntityData[]): Promise<number> {
		let newCount = 0;

		for (const entity of entities) {
			const dir = this.getEntityDir(entity.type);
			const filePath = path.join(dir, `${entity.id}.json`);

			// Check if entity already exists
			try {
				await fs.access(filePath);
				// File exists, skip (don't overwrite existing data)
				continue;
			} catch {
				// File doesn't exist, create it
			}

			// Create new entity file with base structure
			const entityData = {
				id: entity.id,
				type: entity.type,
				name: entity.name,
				url: entity.url,
			};

			await fs.writeFile(filePath, JSON.stringify(entityData, null, "\t"), "utf8");
			newCount++;
		}

		return newCount;
	}

	/**
	 * Get directory for entity type
	 */
	private getEntityDir(type: "brand" | "series" | "category"): string {
		switch (type) {
			case "brand": {
				return BRANDS_DATA_DIR;
			}
			case "series": {
				return SERIES_DATA_DIR;
			}
			case "category": {
				return CATEGORIES_DATA_DIR;
			}
		}
	}

	/**
	 * Download images for an item and update the JSON with local paths
	 */
	private async downloadItemImages(
		itemId: string,
		itemData: Item,
		jsonPath: string,
	): Promise<{ downloaded: number; skipped: number }> {
		const stats = { downloaded: 0, skipped: 0 };

		if (!itemData.images) {
			return stats;
		}

		// Create item's image directory
		const itemImagesDir = path.join(ASSETS_DIR, itemId);
		await fs.mkdir(itemImagesDir, { recursive: true });

		// Collect all images to download
		const allImages: Array<{ image: ItemImage; type: "product" | "instruction" }> = [];

		for (const img of itemData.images.product) {
			allImages.push({ image: img, type: "product" });
		}
		for (const img of itemData.images.instructions) {
			allImages.push({ image: img, type: "instruction" });
		}

		// Download each image
		for (const { image, type } of allImages) {
			if (!image.src) {
				continue;
			}

			// Extract filename from URL (preserves original naming like 153_1.jpg)
			const baseFilename = this.extractImageFilename(image.src);
			const prefix = type === "instruction" ? "inst_" : "";
			const filename = `${prefix}${baseFilename}`;
			const localPath = path.join(itemImagesDir, filename);
			const relativePath = `/images/items/${itemId}/${filename}`;

			// Check if already downloaded
			try {
				await fs.access(localPath);
				// File exists, update path in image object
				image.path = relativePath;
				stats.skipped++;
				continue;
			} catch {
				// File doesn't exist, download it
			}

			// Download the image
			try {
				const imageBuffer = await this.downloadImage(image.src);
				await fs.writeFile(localPath, imageBuffer);
				image.path = relativePath;
				stats.downloaded++;
				console.log(`    Downloaded: ${filename}`);
			} catch (error) {
				const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				console.log(`    Failed: ${filename} - ${msg}`);
			}
		}

		// Update JSON with local paths if any images were processed (downloaded or already existed)
		if (stats.downloaded > 0 || stats.skipped > 0) {
			await this.saveItemJson(jsonPath, itemData);
		}

		return stats;
	}

	/**
	 * Download an image from URL
	 */
	private async downloadImage(url: string): Promise<Buffer> {
		// Try plain fetch first
		try {
			const response = await fetch(url, {
				headers: {
					"User-Agent": DEFAULT_USER_AGENT,
					"Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
					"Referer": "https://bandai-hobby.net/",
				},
			});

			if (response.ok) {
				return Buffer.from(await response.arrayBuffer());
			}
		} catch {
			// Fall back to Playwright
		}

		// Use Playwright for signed/protected URLs
		if (!this.browserContext) {
			throw new Error("Browser not initialized");
		}

		const page = await this.browserContext.newPage();
		try {
			const response = await page.goto(url, { waitUntil: "load", timeout: 30_000 });
			if (!response) {
				throw new Error("No response received");
			}
			if (!response.ok()) {
				throw new Error(`HTTP ${String(response.status())}`);
			}
			return await response.body();
		} finally {
			await page.close();
		}
	}

	/**
	 * Extract clean filename from image URL
	 * - bandai-hobby.net: "153_1_s_{hash}.jpg" → "153_1.jpg"
	 * - akamaihd.net: "1000085708_1.jpg" → "1000085708_1.jpg" (unchanged)
	 */
	private extractImageFilename(url: string): string {
		const urlPath = new URL(url).pathname;
		const fullFilename = path.basename(urlPath);
		const ext = path.extname(fullFilename);
		const nameWithoutExt = fullFilename.slice(0, -ext.length);

		// Pattern for bandai-hobby.net CDN: {num}_{num}_s_{hash} or {num}_{num}_{letter}_{hash}
		// Examples: 153_1_s_1l14qctcn4r6fhud4l6u8ilrw9iv, 153_1008_s_maqcpwjhzdqc3zkmb8jg5lymakct
		const bandaiPattern = /^(\d+_\d+)_[a-z]_[a-z0-9]+$/i;
		const match = bandaiPattern.exec(nameWithoutExt);
		if (match?.[1]) {
			return `${match[1]}${ext}`;
		}

		// For other URLs (Akamai, etc.), use the original filename
		return fullFilename;
	}

	/**
	 * Merge English translation data into Item
	 * Updates name.en, description.en, brands[].en, series[].en, accessories[].name.en, and globalSiteUrls
	 */
	private mergeEnglishTranslation(item: Item, globalData: GlobalSiteData): Item {
		// Set English name
		if (globalData.name) {
			item.name.en = globalData.name;
		}

		// Set English description
		if (globalData.description && globalData.description.length > 0) {
			item.description ??= { ja: [] };
			item.description.en = globalData.description;
		}

		// Update brand with English name if found
		if (globalData.brand && item.brands.length > 0) {
			// Match by looking for the first brand (usually just one)
			const brand = item.brands[0];
			if (brand) {
				brand.en = globalData.brand;
			}
		}

		// Update series with English name if found
		if (globalData.series && item.series.length > 0) {
			const series = item.series[0];
			if (series) {
				series.en = globalData.series;
			}
		}

		// Merge English accessories if found
		if (globalData.accessories && globalData.accessories.length > 0 && item.accessories) {
			item.accessories = this.mergeEnglishAccessories(item.accessories, globalData.accessories);
		}

		// Set globalSiteUrls
		if (globalData.url) {
			item.globalSiteUrls = {
				enUs: globalData.url,
			};
		}

		return item;
	}

	/**
	 * Merge English accessory strings into existing Japanese accessories
	 * Matches by position (index) since accessories are listed in the same order
	 */
	private mergeEnglishAccessories(
		jaAccessories: ParsedAccessoryItem[],
		enStrings: string[],
	): ParsedAccessoryItem[] {
		// Parse English strings to extract names and counts
		const enParsed = parseCountedItems(enStrings);

		// Merge by position
		return jaAccessories.map((jaItem, index) => {
			const enItem = enParsed[index];
			if (enItem) {
				const merged: ParsedAccessoryItem = {
					...jaItem,
					name: {
						ja: jaItem.name.ja,
						en: enItem.name,
					},
				};
				// Merge EN unit if present
				if (enItem.unit) {
					merged.unit = {
						ja: jaItem.unit?.ja ?? enItem.unit,
						en: enItem.unit,
					};
				}
				return merged;
			}
			return jaItem;
		});
	}

	/**
	 * Store canonical translations from global site in dictionary
	 * These are official Bandai translations and should be preferred
	 * Persists immediately to disk for crash safety
	 */
	private storeCanonicalTranslations(item: Item, globalData: GlobalSiteData): void {
		// Store product name translation
		if (globalData.name && item.name.ja) {
			addPhraseSync(item.name.ja, globalData.name, "product-name");
			this.translationsAdded = true;
		}

		// Store brand translation
		if (globalData.brand && item.brands[0]?.ja) {
			addPhraseSync(item.brands[0].ja, globalData.brand, "brand");
			this.translationsAdded = true;
		}

		// Store series translation
		if (globalData.series && item.series[0]?.ja) {
			addPhraseSync(item.series[0].ja, globalData.series, "series");
			this.translationsAdded = true;
		}
	}

	/**
	 * Fallback translation for items without global site page
	 * Checks dictionary first (for canonical translations from other items),
	 * then falls back to TranslationService (Google Translate)
	 */
	private async translateItemFallback(item: Item): Promise<Item> {
		// Translate name - check dictionary first
		if (item.name.ja && !item.name.en) {
			const cached = lookupPhrase(item.name.ja);
			if (cached) {
				item.name.en = cached.en;
			} else {
				const result = await this.translator.translateText(item.name.ja, "en", "ja");
				if (result.translated && result.translated !== item.name.ja) {
					item.name.en = result.translated;
				}
			}
		}

		// Translate description bullets - check dictionary first for each
		if (item.description?.ja && !item.description.en) {
			const translatedBullets: string[] = [];
			for (const bullet of item.description.ja) {
				const cached = lookupPhrase(bullet);
				if (cached) {
					translatedBullets.push(cached.en);
				} else {
					const result = await this.translator.translateText(bullet, "en", "ja");
					translatedBullets.push(result.translated);
				}
			}
			item.description.en = translatedBullets;
		}

		// Translate accessories (name and unit)
		if (item.accessories) {
			for (const accessory of item.accessories) {
				if (accessory.name.ja && !accessory.name.en) {
					const cached = lookupPhrase(accessory.name.ja);
					if (cached) {
						accessory.name.en = cached.en;
					} else {
						const result = await this.translator.translateText(accessory.name.ja, "en", "ja");
						if (result.translated && result.translated !== accessory.name.ja) {
							accessory.name.en = result.translated;
						}
					}
				}
				if (accessory.unit?.ja && !accessory.unit.en) {
					const cached = lookupPhrase(accessory.unit.ja);
					if (cached) {
						accessory.unit.en = cached.en;
					} else {
						const result = await this.translator.translateText(accessory.unit.ja, "en", "ja");
						if (result.translated && result.translated !== accessory.unit.ja) {
							accessory.unit.en = result.translated;
						}
					}
				}
			}
		}

		// Translate contents (name and unit)
		if (item.contents) {
			for (const content of item.contents) {
				if (content.name.ja && !content.name.en) {
					const cached = lookupPhrase(content.name.ja);
					if (cached) {
						content.name.en = cached.en;
					} else {
						const result = await this.translator.translateText(content.name.ja, "en", "ja");
						if (result.translated && result.translated !== content.name.ja) {
							content.name.en = result.translated;
						}
					}
				}
				if (content.unit?.ja && !content.unit.en) {
					const cached = lookupPhrase(content.unit.ja);
					if (cached) {
						content.unit.en = cached.en;
					} else {
						const result = await this.translator.translateText(content.unit.ja, "en", "ja");
						if (result.translated && result.translated !== content.unit.ja) {
							content.unit.en = result.translated;
						}
					}
				}
			}
		}

		return item;
	}

	/**
	 * Fallback translation for manuals without English
	 * Checks dictionary first, then uses translation service
	 */
	private async translateManualFallback(manual: ManualData): Promise<void> {
		// Translate name - check dictionary first
		if (manual.name.ja && !manual.name.en) {
			const cached = lookupPhrase(manual.name.ja);
			if (cached) {
				manual.name.en = cached.en;
			} else {
				const result = await this.translator.translateText(manual.name.ja, "en", "ja");
				if (result.translated && result.translated !== manual.name.ja) {
					manual.name.en = result.translated;
				}
			}
		}

		// Translate PDF names
		for (const pdf of manual.pdfs) {
			if (pdf.name.ja && !pdf.name.en) {
				const cached = lookupPhrase(pdf.name.ja);
				if (cached) {
					pdf.name.en = cached.en;
				} else {
					const result = await this.translator.translateText(pdf.name.ja, "en", "ja");
					if (result.translated && result.translated !== pdf.name.ja) {
						pdf.name.en = result.translated;
					}
				}
			}
		}

		// Translate brand if present
		if (manual.brand?.ja && !manual.brand.en) {
			const cached = lookupPhrase(manual.brand.ja);
			if (cached) {
				manual.brand.en = cached.en;
			} else {
				const result = await this.translator.translateText(manual.brand.ja, "en", "ja");
				if (result.translated && result.translated !== manual.brand.ja) {
					manual.brand.en = result.translated;
				}
			}
		}

		// Translate series if present
		if (manual.series?.ja && !manual.series.en) {
			const cached = lookupPhrase(manual.series.ja);
			if (cached) {
				manual.series.en = cached.en;
			} else {
				const result = await this.translator.translateText(manual.series.ja, "en", "ja");
				if (result.translated && result.translated !== manual.series.ja) {
					manual.series.en = result.translated;
				}
			}
		}
	}

	/**
	 * Update translations for an existing item JSON file
	 * Checks if translations are missing and adds them via global site or fallback
	 * @returns true if the item was updated, false if no updates needed
	 */
	private async updateItemTranslations(itemId: string): Promise<boolean> {
		const jsonPath = path.join(ITEMS_DATA_DIR, `${itemId}.json`);

		// Read existing JSON
		let itemData: Item;
		try {
			const content = await fs.readFile(jsonPath, "utf8");
			itemData = JSON.parse(content) as Item;
		} catch {
			// File doesn't exist or is invalid
			return false;
		}

		// Check if translations are missing
		const missingName = itemData.name.ja && !itemData.name.en;
		const missingDescription = itemData.description?.ja && !itemData.description.en;

		if (!missingName && !missingDescription) {
			return false; // Nothing to update
		}

		console.log(`  Checking translations for ${itemId}...`);

		let updated = false;

		// Try global site lookup first
		try {
			const globalData = await this.globalLookup.lookup(itemId);
			if (globalData.hasPage) {
				if (missingName && globalData.name) {
					itemData.name.en = globalData.name;
					updated = true;
				}
				if (missingDescription && globalData.description && globalData.description.length > 0) {
					itemData.description ??= { ja: [] };
					itemData.description.en = globalData.description;
					updated = true;
				}

				// Store canonical translations (persisted immediately)
				this.storeCanonicalTranslations(itemData, globalData);

				// Update globalSiteUrls if not set
				if (!itemData.globalSiteUrls && globalData.url) {
					itemData.globalSiteUrls = { enUs: globalData.url };
					updated = true;
				}

				if (updated) {
					console.log(`  ✓ Found translations on global site`);
				}
			}
		} catch {
			// Global site lookup failed, continue to fallback
		}

		// Fallback translation for remaining missing translations
		const stillMissingName = itemData.name.ja && !itemData.name.en;
		const stillMissingDescription = itemData.description?.ja && !itemData.description.en;

		if (stillMissingName || stillMissingDescription) {
			try {
				itemData = await this.translateItemFallback(itemData);
				updated = true;
				console.log(`  ✓ Used fallback translation`);
			} catch {
				// Fallback translation failed
			}
		}

		// Save updated JSON if changes were made
		if (updated) {
			await this.saveItemJson(jsonPath, itemData);
		}

		return updated;
	}

	private async fetchPage(url: string): Promise<string> {
		// Try plain fetch first (faster)
		try {
			const response = await fetch(url, {
				headers: {
					"User-Agent": DEFAULT_USER_AGENT,
					"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"Accept-Language": "ja,en-US,en;q=0.9",
				},
			});

			if (response.ok) {
				const html = await response.text();
				// Check if we got real content (not a 404 page or empty shell)
				const has404 = html.includes("404 NOT FOUND");
				const hasMain = html.includes("<main");
				if (!has404 && hasMain) {
					return html;
				}
			}
		} catch {
			// Plain fetch failed, fall back to Playwright
		}

		// Fall back to Playwright for JS-rendered pages
		return this.fetchPageWithPlaywright(url);
	}

	private async fetchPageWithPlaywright(url: string): Promise<string> {
		if (!this.browserContext) {
			throw new Error("Browser not initialized. Call initializeBrowser() first.");
		}

		const page = await this.browserContext.newPage();
		try {
			await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

			// Check for 404 page
			const title = await page.title();
			if (title.includes("404") || title.includes("NOT FOUND")) {
				throw new Error("Page not found (404)");
			}

			return await page.content();
		} finally {
			await page.close();
		}
	}
}
