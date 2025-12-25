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

import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";

import {
	TranslationService,
	loadDictionary,
	rebuildAndReloadDictionary,
} from "@hobby-ninja/translation";

import { writeJsonIfChanged } from "../utils/file-utils.js";

import { BandaiCatalogParser, type Item } from "./bandai-catalog-parser.js";
import { GlobalSiteLookup, type GlobalSiteData } from "./global-site-lookup.js";
import { ItemsIndexUpdater } from "./items-index-updater.js";
import { ManualParser } from "./manual-parser.js";
import { ManualsIndexUpdater } from "./manuals-index-updater.js";
import {
	type ScrapeOptions,
	type ScrapeResult,
	type StepTiming,
	UNKNOWN_ERROR,
	MAX_ITEM_ID,
	DEFAULT_USER_AGENT,
	FETCH_TIMEOUT_MS,
	MS_PER_SECOND,
	SECONDS_PER_MINUTE,
	MINUTES_PER_HOUR,
	HOURS_PER_DAY,
	ITEMS_DATA_DIR,
	MANUALS_DATA_DIR,
	ASSETS_DIR,
	padManualId,
	unpadManualId,
	parseItemIdSuffix,
	formatItemId,
	withTimeout,
	fetchWithRetry,
	BrowserManager,
	downloadItemImages,
	downloadManualPdfs,
	downloadManualImage,
	findImageSrcFromHtml,
	mergeEnglishTranslation,
	saveItemJson,
	saveManualJson,
	upsertEntities,
	storeCanonicalTranslations,
	translateItemFallback,
	translateManualFallback,
} from "./scrape/index.js";

export class ScrapeCommand {
	private parser: BandaiCatalogParser;
	private manualParser: ManualParser;
	private globalLookup: GlobalSiteLookup;
	private translator: TranslationService;
	private browserManager: BrowserManager;
	/** Manual IDs discovered during item scraping (linked to items) */
	private discoveredManualIds = new Set<string>();
	/** Track if new translations were added (need dictionary rebuild) */
	private translationsAdded = false;

	constructor() {
		this.parser = new BandaiCatalogParser();
		this.manualParser = new ManualParser();
		this.globalLookup = new GlobalSiteLookup();
		this.translator = new TranslationService();
		this.browserManager = new BrowserManager();
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
			await this.browserManager.initializeBrowser();
			const browserContext = this.browserManager.getBrowserContext();
			if (!browserContext) {
				throw new Error("Browser context failed to initialize");
			}
			this.globalLookup.setBrowserContext(browserContext);

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
			await this.browserManager.cleanupBrowser();
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
	 * Get item IDs to process based on options
	 * Supports: single ID, start+count, start+end, or all items
	 */
	private getAllItemIds(options: ScrapeOptions): string[] {
		// Single specific ID
		if (options.id) {
			const id = formatItemId(parseItemIdSuffix(options.id));
			return [id];
		}

		// Range specified by start (and optionally end or count)
		if (options.start) {
			const startSuffix = parseItemIdSuffix(options.start);
			let endSuffix: number;

			if (options.end) {
				endSuffix = parseItemIdSuffix(options.end);
			} else if (options.count) {
				endSuffix = startSuffix + options.count - 1;
			} else {
				// Just start specified - process that single item
				return [formatItemId(startSuffix)];
			}

			// Generate range
			const itemIds: string[] = [];
			for (let i = startSuffix; i <= endSuffix && i <= MAX_ITEM_ID; i++) {
				const id = formatItemId(i);
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
			const id = formatItemId(i);
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
	 * Also includes manuals with old/invalid format that need re-scraping
	 */
	private getOrphanManualIds(maxAgeHours: number): string[] {
		const allManualIds = ManualsIndexUpdater.getIdsWithPages();

		// Filter out manuals that were discovered via items
		const orphanIds = allManualIds.filter((id) => !this.discoveredManualIds.has(id));

		if (maxAgeHours === 0) {
			return orphanIds;
		}

		// Get stale IDs by age
		const staleByAge = ManualsIndexUpdater.getStaleIds(orphanIds, maxAgeHours);
		const staleIds = new Set(staleByAge);

		// Also include manuals with old format that need migration
		const needsMigration = this.getManualsNeedingFormatMigration(orphanIds);
		const migrationNotStale = needsMigration.filter((id) => !staleIds.has(id));
		for (const id of migrationNotStale) {
			staleIds.add(id);
		}

		if (migrationNotStale.length > 0) {
			console.log(`  (${migrationNotStale.length} manuals need format migration)`);
		}

		return [...staleIds];
	}

	/**
	 * Check which manuals have old/invalid format and need re-scraping
	 * Old format indicators:
	 * - Has productImage/thumbnailImage instead of image.src
	 * - Has brandIds/seriesIds arrays instead of brand/series objects
	 * - Has extractedAt in the file (should be in index only)
	 * - PDFs without path (not downloaded)
	 */
	private getManualsNeedingFormatMigration(manualIds: string[]): string[] {
		const needsMigration: string[] = [];

		for (const id of manualIds) {
			const paddedId = padManualId(id);
			const jsonPath = path.join(MANUALS_DATA_DIR, `${paddedId}.json`);

			try {
				const content = readFileSync(jsonPath, "utf8");
				const data = JSON.parse(content) as Record<string, unknown>;

				// Check for old format indicators
				const hasOldImageFormat = "productImage" in data || "thumbnailImage" in data;
				const hasOldBrandFormat = Array.isArray(data["brandIds"]);
				const hasOldSeriesFormat = Array.isArray(data["seriesIds"]);
				const hasExtractedAt = "extractedAt" in data;
				const hasPdfWithoutPath = Array.isArray(data["pdfs"]) &&
					(data["pdfs"] as Array<Record<string, unknown>>).some(
						(pdf) => pdf["url"] && !pdf["path"],
					);

				if (hasOldImageFormat || hasOldBrandFormat || hasOldSeriesFormat || hasExtractedAt || hasPdfWithoutPath) {
					needsMigration.push(id);
				}
			} catch {
				// File doesn't exist or can't be read - will be handled by normal scrape
			}
		}

		return needsMigration;
	}


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
				const maxAgeMs = options.maxAgeDays * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
				const ageMinutes = Math.round(ageMs / MS_PER_SECOND / SECONDS_PER_MINUTE);
				const ageHours = Math.round(ageMs / MS_PER_SECOND / SECONDS_PER_MINUTE / MINUTES_PER_HOUR);

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
				html = await time("fetch-html", () => this.fetchPage(url));

				// Save HTML file
				await time("save-html", () => fs.writeFile(htmlPath, html!, "utf8"));
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
					const maxAgeMs = options.maxAgeDays * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

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
				itemData = mergeEnglishTranslation(itemData, globalData);
				hasGlobalTranslation = true;

				// Store canonical translations in dictionary (persisted immediately)
				if (storeCanonicalTranslations(itemData, globalData)) {
					this.translationsAdded = true;
				}

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
				itemData = await time("fallback-translate", () => translateItemFallback(itemData, this.translator));
				if (itemData.name.en) {
					console.log(`  ✓ Fallback translation: ${itemData.name.en}`);
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				console.log(`  ⚠ Fallback translation failed: ${msg}`);
			}
		}

		// Step 3: Save item JSON
		const itemWritten = await time("save-json", () => saveItemJson(jsonPath, itemData));
		if (itemWritten) {
			console.log(`  ✓ Item JSON saved`);
		} else {
			console.log(`  - Item unchanged`);
		}

		// Step 3b: Upsert discovered entities (brands, series, categories)
		const entities = parseResult.entities;
		if (entities && entities.length > 0) {
			const newEntities = await time("upsert-entities", () => upsertEntities(entities));
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
			const paddedManualId = padManualId(manualId);
			console.log(`  ✓ Manual link: ${paddedManualId}`);
			try {
				await time("process-manual", () => this.processManualComplete(manualId, options));
				// Use unpadded ID for index key (matches canonical format)
				ManualsIndexUpdater.recordValid(unpadManualId(manualId), itemData.name.ja);
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
					downloadItemImages(itemId, itemData, jsonPath, this.browserManager.getBrowserContext(), async (p, d) => { await saveItemJson(p, d); }),
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

		// Use unpadded ID for URLs (canonical format), padded for filenames (consistent sorting)
		const canonicalId = unpadManualId(manualId);
		const paddedId = padManualId(manualId);
		const url = `https://manual.bandai-hobby.net/menus/detail/${canonicalId}/`;
		const htmlPath = path.join(MANUALS_DATA_DIR, `${paddedId}.html`);
		const jsonPath = path.join(MANUALS_DATA_DIR, `${paddedId}.json`);

		console.log(`  Scraping manual at ${url}`);

		// Step 1: Get HTML (from saved file or fetch fresh)
		let html: string | null = null;

		// Check for existing HTML file (use as cache)
		if (options.cache) {
			try {
				const htmlStat = await time("cache-stat", () => fs.stat(htmlPath));
				const ageMs = Date.now() - htmlStat.mtimeMs;
				const maxAgeMs = options.maxAgeDays * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
				const ageMinutes = Math.round(ageMs / MS_PER_SECOND / SECONDS_PER_MINUTE);
				const ageHours = Math.round(ageMs / MS_PER_SECOND / SECONDS_PER_MINUTE / MINUTES_PER_HOUR);

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
				html = await time("fetch-html", () => this.fetchManualPage(url));

				// Save HTML file
				await fs.mkdir(path.dirname(htmlPath), { recursive: true });
				await time("save-html", () => fs.writeFile(htmlPath, html!, "utf8"));
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				ManualsIndexUpdater.recordChecked(canonicalId);
				this.printTimings(options, timings);
				return { success: false, error: `Fetch failed: ${errorMsg}` };
			}
		}

		// Step 2: Parse with ManualParser (use canonical unpadded ID, canonical URL)
		const parseResult = time("parse", () => this.manualParser.parse(html, canonicalId, url));
		if (!parseResult.success || !parseResult.data) {
			ManualsIndexUpdater.recordChecked(canonicalId);
			this.printTimings(options, timings);
			return { success: false, error: parseResult.error ?? "Parse failed" };
		}

		const manualData = parseResult.data;
		console.log(`  ✓ Manual data extracted: ${manualData.name.ja}`);
		console.log(`  ✓ Found ${manualData.pdfs.length} PDF(s)`);

		// Step 3: Download PDFs (use padded ID for asset directories)
		if (manualData.pdfs.length > 0 && !options.dryRun) {
			const downloadResult = await time("download-pdfs", () =>
				downloadManualPdfs(paddedId, manualData),
			);
			if (downloadResult.downloaded > 0) {
				console.log(`  ✓ PDFs: ${downloadResult.downloaded} downloaded, ${downloadResult.skipped} skipped`);
			}
		}

		// Step 3b: Download/locate image and establish bidirectional links
		// Image can come from: HTML parsing (manualData.image?.src) OR cached HTML file
		let discoveredItemId: string | undefined;
		if (!options.dryRun) {
			if (manualData.image?.src) {
				// Parser found image in HTML - download or find existing (use padded ID for assets)
				discoveredItemId = await time("download-image", () => downloadManualImage(paddedId, manualData));
			} else {
				// Parser didn't find image - try to get src from cached HTML
				const srcUrl = await time("find-src", () => findImageSrcFromHtml(htmlPath, ""));
				if (srcUrl) {
					// Found src in HTML - use the standard download flow
					manualData.image = { src: srcUrl };
					discoveredItemId = await time("download-image", () => downloadManualImage(paddedId, manualData));
				}
			}

			// Establish bidirectional link if item was discovered via shared image
			if (discoveredItemId) {
				const itemId = discoveredItemId; // Capture for closure
				manualData.itemId = itemId;
				console.log(`    Linked to item: ${itemId}`);

				// Update item JSON with manual reference (use canonical unpadded ID)
				await time("update-item-link", () => this.updateItemWithManualLink(itemId, canonicalId));
			}
		}

		// Step 3c: Translate manual if missing English
		if (!manualData.name.en) {
			try {
				await time("translate", () => translateManualFallback(manualData, this.translator));
				if (manualData.name.en) {
					console.log(`  ✓ Translated: ${manualData.name.en}`);
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				console.log(`  ⚠ Translation failed: ${msg}`);
			}
		}

		// Step 4: Save manual JSON
		await time("save-json", () => saveManualJson(jsonPath, manualData));
		console.log(`  ✓ Manual JSON saved`);

		// Record in index (valid status + extraction timestamp) using canonical unpadded ID
		ManualsIndexUpdater.recordValid(canonicalId, manualData.name.ja);
		ManualsIndexUpdater.recordExtracted(canonicalId);

		this.printTimings(options, timings);
		return { success: true };
	}

	/**
	 * Fetch a manual page HTML with retry on timeout
	 */
	private async fetchManualPage(url: string): Promise<string> {
		const response = await fetchWithRetry(url, {
			headers: {
				"User-Agent": DEFAULT_USER_AGENT,
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "ja,en-US,en;q=0.9",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		// Wrap body reading in timeout too (server might hang during transfer)
		return withTimeout(response.text(), FETCH_TIMEOUT_MS, "Response body read timeout");
	}

	/**
	 * Update an item JSON with a manual link reference
	 * Only updates if the item doesn't already have a manual link
	 */
	private async updateItemWithManualLink(itemId: string, manualId: string): Promise<void> {
		const itemJsonPath = path.join(ITEMS_DATA_DIR, `${itemId}.json`);

		try {
			const content = await fs.readFile(itemJsonPath, "utf8");
			const item = JSON.parse(content) as Item;

			// Only update if manual link is missing or different
			if (item.manual?.id !== manualId) {
				item.manual = {
					id: manualId,
					url: `https://manual.bandai-hobby.net/menus/detail/${manualId}/`,
				};

				await writeJsonIfChanged(itemJsonPath, item);
				console.log(`    Updated item ${itemId} with manual link`);
			}
		} catch {
			// Item file doesn't exist or is invalid - skip
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
				if (storeCanonicalTranslations(itemData, globalData)) {
					this.translationsAdded = true;
				}

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
				itemData = await translateItemFallback(itemData, this.translator);
				updated = true;
				console.log(`  ✓ Used fallback translation`);
			} catch {
				// Fallback translation failed
			}
		}

		// Save updated JSON if changes were made
		if (updated) {
			await saveItemJson(jsonPath, itemData);
		}

		return updated;
	}

	private async fetchPage(url: string): Promise<string> {
		// Try plain fetch first (faster) with hard timeout
		try {
			const response = await withTimeout(
				fetch(url, {
					headers: {
						"User-Agent": DEFAULT_USER_AGENT,
						"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
						"Accept-Language": "ja,en-US,en;q=0.9",
					},
				}),
				FETCH_TIMEOUT_MS,
				"Page fetch timeout",
			);

			if (response.ok) {
				const html = await withTimeout(response.text(), FETCH_TIMEOUT_MS, "Page body read timeout");
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
		return this.browserManager.fetchPageWithPlaywright(url);
	}
}
