/**
 * Item processing logic for scraping and updating items
 *
 * This module handles:
 * - Processing complete item scrapes (HTML fetch, parse, translate, download assets)
 * - Updating translations for existing items
 * - Updating items with manual links
 * - Cleaning up blog items
 * - Fetching pages with fallback strategies
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import type { TranslationService } from "@hobby-ninja/translation";

import { writeJsonIfChanged } from "../../utils/file-utils.js";
import type { ImageHashIndex } from "../../utils/image-utils.js";
import type { BandaiCatalogParser, Item } from "../bandai-catalog-parser.js";
import type { GlobalSiteLookup, GlobalSiteData } from "../global-site-lookup.js";
import { ItemsIndexUpdater } from "../items-index-updater.js";
import { ManualsIndexUpdater } from "../manuals-index-updater.js";

import { calculateMaxAgeMs } from "./cache-manager.js";
import { saveItemJson, upsertEntities, mergeEnglishTranslation } from "./data-merger.js";
import { BrowserManager, withTimeout } from "./http-client.js";
import { padManualId, unpadManualId } from "./id-utils.js";
import { downloadItemImages } from "./image-processor.js";
import { createTimer, printTimings } from "./timing-utils.js";
import { storeCanonicalTranslations, translateItemFallback } from "./translation-handler.js";
import {
	type ScrapeOptions,
	type StepTiming,
	UNKNOWN_ERROR,
	DEFAULT_USER_AGENT,
	FETCH_TIMEOUT_MS,
	MS_PER_SECOND,
	SECONDS_PER_MINUTE,
	MINUTES_PER_HOUR,
	ITEMS_DATA_DIR,
	ASSETS_DIR,
} from "./types.js";

/**
 * Result of processing a single item
 */
export interface ItemProcessResult {
	/** Whether processing succeeded */
	success: boolean;
	/** Whether HTML was served from cache */
	cached: boolean;
	/** Manual ID if the item has a linked manual */
	manualId?: string;
	/** Error message if processing failed */
	error?: string;
}

/**
 * Dependencies for item processing operations
 */
export interface ItemProcessDeps {
	parser: BandaiCatalogParser;
	globalLookup: GlobalSiteLookup;
	translator: TranslationService;
	browserManager: BrowserManager;
	/** Callback to process a complete manual */
	processManualComplete: (manualId: string, options: ScrapeOptions) => Promise<{ success: boolean; error?: string }>;
	/** Callback to track when translations are added */
	onTranslationsAdded?: () => void;
	/** Hash index for image deduplication (item assets are authoritative) */
	hashIndex?: ImageHashIndex;
}

/**
 * Process a single item completely: scrape data, scrape manual if linked, download all assets
 *
 * @param itemId - Item ID to process (e.g., "01_0001")
 * @param options - Scrape options
 * @param deps - Dependencies (parser, lookup, translator, browser manager, callbacks)
 * @returns Processing result with success status, cache status, manual ID, and error
 */
export async function processItemComplete(
	itemId: string,
	options: ScrapeOptions,
	deps: ItemProcessDeps,
): Promise<ItemProcessResult> {
	const timings: StepTiming[] = [];
	const time = createTimer(timings);

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
			const maxAgeMs = calculateMaxAgeMs(options.maxAgeDays);
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
			html = await time("fetch-html", () => fetchPage(url, deps.browserManager));

			// Save HTML file
			await time("save-html", () => fs.writeFile(htmlPath, html!, "utf8"));
		} catch (fetchError) {
			const errorMsg = fetchError instanceof Error ? fetchError.message : "Unknown fetch error";
			printTimings(options, timings);
			return { success: false, cached: false, error: `Fetch failed: ${errorMsg}` };
		}
	}

	// Step 2: Extract data from HTML using catalog parser
	const parseResult = time("parse", () => deps.parser.parse(html, itemId, url));
	if (!parseResult.success || !parseResult.data) {
		printTimings(options, timings);
		return { success: false, cached, error: parseResult.error ?? "Parse failed" };
	}

	let itemData = parseResult.data;
	console.log(`  ✓ Data extracted: ${itemData.name.ja}`);

	// Step 2a: Extract article images with Playwright (lazy-loaded images need browser)
	// Article images use data-src for lazy loading - static HTML parsing cannot get actual URLs
	// Need to scroll into view and wait for JavaScript to populate img.src
	try {
		const articleImageUrls = await time("extract-article-images", () =>
			deps.browserManager.extractArticleImageUrls(url),
		);
		if (articleImageUrls.length > 0) {
			// Add article images to instructions
			itemData.images = {
				...itemData.images,
				product: itemData.images?.product ?? [],
				instructions: [
					...(itemData.images?.instructions ?? []),
					...articleImageUrls.map(src => ({ src })),
				],
			};
			console.log(`  ✓ Article images: ${articleImageUrls.length} found`);
		}
	} catch (error) {
		const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
		console.log(`  ⚠ Article image extraction failed: ${msg}`);
	}

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
				const maxAgeMs = calculateMaxAgeMs(options.maxAgeDays);

				if (maxAgeMs === 0 || ageMs < maxAgeMs) {
					const enHtml = await time("en-cache-read", () => fs.readFile(enHtmlPath, "utf8"));
					globalData = time("en-parse", () => deps.globalLookup.parseFromHtml(enHtml));
					usedEnCache = true;
				}
			} catch {
				// Cache doesn't exist, will fetch
			}
		}

		// Fetch from network if no cache hit
		if (!globalData) {
			globalData = await time("global-lookup", () => deps.globalLookup.lookup(itemId));

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
				deps.onTranslationsAdded?.();
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
			itemData = await time("fallback-translate", () => translateItemFallback(itemData, deps.translator));
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
			await time("process-manual", () => deps.processManualComplete(manualId, options));
			// Use unpadded ID for index key (matches canonical format)
			ManualsIndexUpdater.recordValid(unpadManualId(manualId), itemData.name.ja);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : UNKNOWN_ERROR;
			console.error(`  ⚠ Manual processing failed: ${errorMsg}`);
			// Don't fail the whole item for manual failure
		}
	}

	// Step 5: Download images for this item (with hash-based deduplication)
	if (itemData.images && !options.dryRun) {
		try {
			const downloadResult = await time("download-images", () =>
				downloadItemImages(
					itemId,
					itemData,
					jsonPath,
					deps.browserManager.getBrowserContext(),
					async (p, d) => { await saveItemJson(p, d); },
					deps.hashIndex,
				),
			);
			const deduped = downloadResult.deduplicated ?? 0;
			if (downloadResult.downloaded > 0 || deduped > 0) {
				const parts = [`${downloadResult.downloaded} downloaded`, `${downloadResult.skipped} skipped`];
				if (deduped > 0) parts.push(`${deduped} deduplicated`);
				console.log(`  ✓ Images: ${parts.join(", ")}`);
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : UNKNOWN_ERROR;
			console.error(`  ⚠ Image download failed: ${errorMsg}`);
		}
	}

	printTimings(options, timings);
	return { success: true, cached, manualId };
}

/**
 * Update translations for an existing item JSON file
 * Checks if translations are missing and adds them via global site or fallback
 *
 * @param itemId - Item ID to update
 * @param deps - Dependencies (global lookup, translator, callbacks)
 * @returns true if the item was updated, false if no updates needed
 */
export async function updateItemTranslations(
	itemId: string,
	deps: Pick<ItemProcessDeps, "globalLookup" | "translator" | "onTranslationsAdded">,
): Promise<boolean> {
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
		const globalData = await deps.globalLookup.lookup(itemId);
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
				deps.onTranslationsAdded?.();
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
			itemData = await translateItemFallback(itemData, deps.translator);
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

/**
 * Update an item JSON with a manual link reference
 * Only updates if the item doesn't already have a manual link
 *
 * @param itemId - Item ID to update
 * @param manualId - Manual ID to link
 */
export async function updateItemWithManualLink(itemId: string, manualId: string): Promise<void> {
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
 * Remove JSON/HTML files for a blog post item
 *
 * @param id - Item ID to clean up
 * @returns true if any files were removed
 */
export async function cleanupBlogItem(id: string): Promise<boolean> {
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
 * Fetch a page HTML with fallback from plain fetch to Playwright
 *
 * @param url - URL to fetch
 * @param browserManager - Browser manager for Playwright fallback
 * @returns HTML content
 */
export async function fetchPage(url: string, browserManager: BrowserManager): Promise<string> {
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
	return browserManager.fetchPageWithPlaywright(url);
}
