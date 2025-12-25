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

import {
	TranslationService,
	loadDictionary,
	rebuildAndReloadDictionary,
} from "@hobby-ninja/translation";

import { BandaiCatalogParser } from "./bandai-catalog-parser.js";
import { GlobalSiteLookup } from "./global-site-lookup.js";
import { ItemsIndexUpdater } from "./items-index-updater.js";
import { ManualParser } from "./manual-parser.js";
import { ManualsIndexUpdater } from "./manuals-index-updater.js";
import {
	type ScrapeOptions,
	type ScrapeResult,
	UNKNOWN_ERROR,
	BrowserManager,
	getAllItemIds,
	getItemsToProcess,
	getOrphanManualIds,
	processItemComplete,
	updateItemTranslations,
	cleanupBlogItem,
	processManualComplete,
	getManualsNeedingFormatMigration,
	type ItemProcessDeps,
	type ManualProcessDeps,
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
			const allItemIds = getAllItemIds(options);
			const itemsNeedingScrape = new Set(getItemsToProcess(options, maxAgeHours));

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

			// Create dependency objects for processing functions
			const manualDeps: ManualProcessDeps = {
				manualParser: this.manualParser,
				translator: this.translator,
			};

			const itemDeps: ItemProcessDeps = {
				parser: this.parser,
				globalLookup: this.globalLookup,
				translator: this.translator,
				browserManager: this.browserManager,
				processManualComplete: (manualId, opts) => processManualComplete(manualId, opts, manualDeps),
				onTranslationsAdded: () => { this.translationsAdded = true; },
			};

			const translationDeps = {
				globalLookup: this.globalLookup,
				translator: this.translator,
				onTranslationsAdded: () => { this.translationsAdded = true; },
			};

			// Phase 1: Process each item - scrape if needed, then ensure translations
			for (let i = 0; i < allItemIds.length; i++) {
				const itemId = allItemIds[i];
				if (!itemId) continue;

				// Check if item is a blog post - cleanup and skip
				if (ItemsIndexUpdater.isBlog(itemId)) {
					const removed = await cleanupBlogItem(itemId);
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
						const itemResult = await processItemComplete(itemId, options, itemDeps);

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
						const updated = await updateItemTranslations(itemId, translationDeps);
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
			const orphanManualIds = getOrphanManualIds(
				this.discoveredManualIds,
				maxAgeHours,
				getManualsNeedingFormatMigration,
			);
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
						const manualResult = await processManualComplete(manualId, options, manualDeps);

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
}
