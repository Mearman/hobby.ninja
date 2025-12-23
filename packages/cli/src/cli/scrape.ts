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


import { stripEphemeralImageUrls } from "../utils/image-utils.js";
import { BandaiRateLimiter } from "../utils/rate-limiter.js";

import { BandaiCatalogParser, type EntityData, type Item, type ItemImage, type ParsedAccessoryItem } from "./bandai-catalog-parser.js";
import { parseCountedItems } from "./count-parser.js";
import { GlobalSiteLookup, type GlobalSiteData } from "./global-site-lookup.js";
import { ItemsIndexUpdater } from "./items-index-updater.js";
import { ManualParser, type ManualData } from "./manual-parser.js";
import { ManualsIndexUpdater } from "./manuals-index-updater.js";


export interface ScrapeOptions {
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
			const allItemIds = this.getAllItemIds();
			const itemsNeedingScrape = new Set(this.getItemsToProcess(maxAgeHours));

			console.log(`\n=== Phase 1: Processing Items ===`);
			console.log(`Total items: ${allItemIds.length}, needing scrape: ${itemsNeedingScrape.size}`);
			if (options.maxAgeDays > 0) {
				console.log(`(Re-scraping items not checked within last ${options.maxAgeDays} days)`);
			}

			if (options.dryRun) {
				console.log("DRY RUN MODE - No actual scraping will be performed");
				if (options.verbose && allItemIds.length > 0) {
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
						const updated = await this.updateItemTranslations(itemId, options.verbose);
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
	private getItemsToProcess(maxAgeHours: number): string[] {
		const allItemIds = this.getAllItemIds();

		if (maxAgeHours === 0) {
			return allItemIds;
		}

		return allItemIds.filter((id) => !ItemsIndexUpdater.wasPageRecentlyScraped(id, maxAgeHours));
	}

	/**
	 * Get all item IDs that have pages in the index
	 */
	private getAllItemIds(): string[] {
		const itemIds: string[] = [];
		for (let i = 1; i <= MAX_ITEM_ID; i++) {
			const id = `01_${i.toString().padStart(4, "0")}`;
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
	 * Process a single item completely: scrape data, scrape manual if linked, download all assets
	 */
	private async processItemComplete(
		itemId: string,
		options: ScrapeOptions,
	): Promise<{ success: boolean; cached: boolean; manualId?: string; error?: string }> {
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
				const htmlStat = await fs.stat(htmlPath);
				const ageMs = Date.now() - htmlStat.mtimeMs;
				const maxAgeMs = options.maxAgeDays * ScrapeCommand.HOURS_PER_DAY * ScrapeCommand.MINUTES_PER_HOUR * ScrapeCommand.SECONDS_PER_MINUTE * ScrapeCommand.MS_PER_SECOND;
				const ageMinutes = Math.round(ageMs / ScrapeCommand.MS_PER_SECOND / ScrapeCommand.SECONDS_PER_MINUTE);
				const ageHours = Math.round(ageMs / ScrapeCommand.MS_PER_SECOND / ScrapeCommand.SECONDS_PER_MINUTE / ScrapeCommand.MINUTES_PER_HOUR);

				if (maxAgeMs === 0 || ageMs < maxAgeMs) {
					html = await fs.readFile(htmlPath, "utf8");
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
				html = await this.rateLimiter.executeWithLimit(async () => {
					return this.fetchPage(url);
				});

				// Save HTML file
				await fs.writeFile(htmlPath, html, "utf8");
			} catch (fetchError) {
				const errorMsg = fetchError instanceof Error ? fetchError.message : "Unknown fetch error";
				return { success: false, cached: false, error: `Fetch failed: ${errorMsg}` };
			}
		}

		// Step 2: Extract data from HTML using catalog parser
		const parseResult = this.parser.parse(html, itemId, url);
		if (!parseResult.success || !parseResult.data) {
			return { success: false, cached, error: parseResult.error ?? "Parse failed" };
		}

		let itemData = parseResult.data;
		if (options.verbose) {
			console.log(`  ✓ Data extracted: ${itemData.name.ja}`);
		}

		// Step 2b: Look up English translations from global site
		let hasGlobalTranslation = false;
		try {
			const globalData = await this.globalLookup.lookup(itemId);
			if (globalData.hasPage) {
				itemData = this.mergeEnglishTranslation(itemData, globalData);
				hasGlobalTranslation = true;

				// Store canonical translations in dictionary (persisted immediately)
				this.storeCanonicalTranslations(itemData, globalData);

				if (options.verbose) {
					console.log(`  ✓ English translation found: ${globalData.name ?? "(name)"}`);
				}
				// Save English HTML for debugging/analysis
				if (globalData.html) {
					const enHtmlPath = path.join(ITEMS_DATA_DIR, `${itemId}.en.html`);
					await fs.writeFile(enHtmlPath, globalData.html, "utf8");
				}
			} else if (options.verbose) {
				console.log(`  - No global site page found`);
			}
		} catch (error) {
			// Don't fail the item for English lookup failures
			if (options.verbose) {
				const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				console.log(`  ⚠ English lookup failed: ${msg}`);
			}
		}

		// Step 2c: Fallback translation for items without global page
		if (!hasGlobalTranslation && !itemData.name.en) {
			try {
				itemData = await this.translateItemFallback(itemData);
				if (options.verbose && itemData.name.en) {
					console.log(`  ✓ Fallback translation: ${itemData.name.en}`);
				}
			} catch (error) {
				if (options.verbose) {
					const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
					console.log(`  ⚠ Fallback translation failed: ${msg}`);
				}
			}
		}

		// Step 3: Save item JSON
		await this.saveItemJson(jsonPath, itemData);
		console.log(`  ✓ Item JSON saved`);

		// Step 3b: Upsert discovered entities (brands, series, categories)
		if (parseResult.entities && parseResult.entities.length > 0) {
			const newEntities = await this.upsertEntities(parseResult.entities);
			if (newEntities > 0 && options.verbose) {
				console.log(`  ✓ ${newEntities} new entities added`);
			}
		}

		// Record in index that this item has a valid page and timing info
		ItemsIndexUpdater.recordFileCreated(itemId, itemData.name.ja);
		ItemsIndexUpdater.recordExtracted(itemId);
		ItemsIndexUpdater.recordPageScraped(itemId);

		// Step 4: Process linked manual if exists
		const manualId = itemData.manual?.id;
		if (manualId) {
			console.log(`  Found manual link: ${manualId}`);
			try {
				await this.processManualComplete(manualId, options);
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
				const downloadResult = await this.downloadItemImages(itemId, itemData, jsonPath, options.verbose);
				if (downloadResult.downloaded > 0 || options.verbose) {
					console.log(`  ✓ Images: ${downloadResult.downloaded} downloaded, ${downloadResult.skipped} skipped`);
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				console.error(`  ⚠ Image download failed: ${errorMsg}`);
			}
		}

		return { success: true, cached, manualId };
	}

	/**
	 * Process a manual completely: scrape data and download PDFs
	 */
	private async processManualComplete(
		manualId: string,
		options: ScrapeOptions,
	): Promise<{ success: boolean; error?: string }> {
		const url = `https://manual.bandai-hobby.net/menus/detail/${manualId}/`;
		const jsonPath = path.join(MANUALS_DATA_DIR, `${manualId}.json`);

		console.log(`  Scraping manual at ${url}`);

		// Step 1: Fetch HTML
		let html: string;
		try {
			html = await this.rateLimiter.executeWithLimit(async () => {
				return this.fetchManualPage(url);
			});
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : UNKNOWN_ERROR;
			ManualsIndexUpdater.recordChecked(manualId);
			return { success: false, error: `Fetch failed: ${errorMsg}` };
		}

		// Step 2: Parse with ManualParser
		const parseResult = this.manualParser.parse(html, manualId, url);
		if (!parseResult.success || !parseResult.data) {
			ManualsIndexUpdater.recordChecked(manualId);
			return { success: false, error: parseResult.error ?? "Parse failed" };
		}

		const manualData = parseResult.data;
		if (options.verbose) {
			console.log(`  ✓ Manual data extracted: ${manualData.name.ja}`);
			console.log(`  ✓ Found ${manualData.pdfs.length} PDF(s)`);
		}

		// Step 3: Download PDFs
		if (manualData.pdfs.length > 0 && !options.dryRun) {
			const downloadResult = await this.downloadManualPdfs(manualId, manualData, options.verbose);
			if (downloadResult.downloaded > 0 || options.verbose) {
				console.log(`  ✓ PDFs: ${downloadResult.downloaded} downloaded, ${downloadResult.skipped} skipped`);
			}
		}

		// Step 4: Save manual JSON
		await this.saveManualJson(jsonPath, manualData);
		console.log(`  ✓ Manual JSON saved`);

		// Record checked with valid status
		ManualsIndexUpdater.recordValid(manualId, manualData.name.ja);

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
		verbose: boolean,
	): Promise<{ downloaded: number; skipped: number }> {
		const stats = { downloaded: 0, skipped: 0 };

		// Create manual's PDF directory
		const manualPdfDir = path.join(MANUALS_ASSETS_DIR, manualId);
		await fs.mkdir(manualPdfDir, { recursive: true });

		for (const pdf of manualData.pdfs) {
			if (!pdf.url) continue;

			// Extract filename from URL
			const urlPath = new URL(pdf.url).pathname;
			const filename = path.basename(urlPath);
			const localPath = path.join(manualPdfDir, filename);
			const relativePath = `/manuals/${manualId}/${filename}`;

			// Check if already downloaded
			try {
				await fs.access(localPath);
				pdf.path = relativePath;
				stats.skipped++;
				continue;
			} catch {
				// File doesn't exist, download it
			}

			// Download the PDF
			try {
				const pdfBuffer = await this.downloadPdf(pdf.url);
				await fs.writeFile(localPath, pdfBuffer);
				pdf.path = relativePath;
				stats.downloaded++;

				if (verbose) {
					console.log(`    Downloaded: ${filename}`);
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				if (verbose) {
					console.log(`    Failed: ${filename} - ${msg}`);
				}
			}
		}

		return stats;
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
	 * Save manual data to JSON file
	 */
	private async saveManualJson(filePath: string, data: ManualData): Promise<void> {
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, JSON.stringify(data, null, "\t"), "utf8");
	}

	/**
	 * Save item data to JSON file
	 * Note: Timing fields (extractedAt, pageScrapedAt) are stored in the
	 * centralized index.json, not in individual item files
	 */
	private async saveItemJson(filePath: string, data: Item): Promise<void> {
		// Strip ephemeral URLs before saving (CloudFront signed URLs expire)
		const outputData: Record<string, unknown> = { ...data };
		if (data.images && "product" in data.images) {
			outputData["images"] = stripEphemeralImageUrls(data.images);
		}

		await fs.writeFile(filePath, JSON.stringify(outputData, null, "\t"), "utf8");
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
		verbose: boolean,
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

				if (verbose) {
					console.log(`    Downloaded: ${filename}`);
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
				if (verbose) {
					console.log(`    Failed: ${filename} - ${msg}`);
				}
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

		return item;
	}

	/**
	 * Update translations for an existing item JSON file
	 * Checks if translations are missing and adds them via global site or fallback
	 * @returns true if the item was updated, false if no updates needed
	 */
	private async updateItemTranslations(itemId: string, verbose: boolean): Promise<boolean> {
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

		if (verbose) {
			console.log(`  Checking translations for ${itemId}...`);
		}

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

				if (verbose && updated) {
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
				if (verbose) {
					console.log(`  ✓ Used fallback translation`);
				}
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
