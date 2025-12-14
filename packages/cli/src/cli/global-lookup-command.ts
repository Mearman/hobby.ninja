/**
 * Global site translation lookup command
 *
 * Checks global.bandai-hobby.net for English versions of items
 * and updates both the items index and individual item files.
 *
 * Uses Playwright for browser-based requests to bypass bot protection.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";
import { load as cheerioLoad } from "cheerio";
import { chromium, type Page } from "playwright";

const ITEMS_PATH = resolveWorkspacePath("data/src/items");
const ITEMS_INDEX_PATH = path.join(ITEMS_PATH, "index.json");
const GLOBAL_BASE_URL = "https://global.bandai-hobby.net/en-us";

// Delay between requests (ms) to be polite to the server
const REQUEST_DELAY = 2000;

export interface GlobalLookupOptions {
	/** Maximum number of items to check */
	limit?: number;
	/** Preview changes without writing */
	dryRun?: boolean;
	/** Skip updating individual item files */
	noUpdateFiles?: boolean;
	/** Retry items that had errors */
	retryErrors?: boolean;
	/** Show browser window */
	headed?: boolean;
	/** Enable verbose logging */
	verbose?: boolean;
}

interface SiteStatus {
	hasPage: boolean;
	checkedAt: string;
	productName?: string;
	error?: string;
}

interface SiteStats {
	checked: number;
	withPage: number;
	withoutPage: number;
	errors: number;
}

interface ItemIndexEntry {
	japaneseSite?: SiteStatus;
	globalSite?: SiteStatus;
}

interface ItemsIndex {
	version: string;
	updatedAt: string;
	stats: {
		totalItems: number;
		japaneseSite: SiteStats;
		globalSite: SiteStats;
	};
	items: Record<string, ItemIndexEntry>;
}

interface LocalizedText {
	ja: string;
	en?: string;
}

interface LocalizedTextArray {
	ja: string[];
	en?: string[];
}

interface ItemFile {
	id: string;
	name: LocalizedText;
	description?: LocalizedTextArray;
	accessories?: LocalizedTextArray;
	contents?: LocalizedTextArray;
	[key: string]: unknown;
}


function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string, dryRun: boolean): void {
	const timestamp = new Date().toISOString().slice(11, 19);
	console.log(`[${timestamp}] ${dryRun ? "[DRY-RUN] " : ""}${message}`);
}

/**
 * Look up English translation from global site using Playwright
 */
async function lookupEnglishTranslation(page: Page, itemId: string): Promise<{
	name?: string;
	description?: string[];
	hasPage: boolean;
	error?: string;
}> {
	const url = `${GLOBAL_BASE_URL}/item/${itemId}/`;

	try {
		const response = await page.goto(url, {
			waitUntil: "domcontentloaded",
			timeout: 15_000,
		});

		const status = response?.status() ?? 0;
		if (status === 404) {
			return { hasPage: false };
		}
		if (status >= 400) {
			return { hasPage: false, error: `HTTP ${status}` };
		}

		// Wait for dynamic content
		await sleep(500);

		// Get page HTML and parse with cheerio
		const html = await page.content();
		const $ = cheerioLoad(html);

		// Check if page has actual content
		const h1 = $("main h1").first().text().trim();
		if (!h1) {
			return { hasPage: false };
		}

		// Check for error title
		const title = $("title").text().trim();
		if (title.includes("404") || title.includes("Not Found") || title.includes("Error")) {
			return { hasPage: false };
		}

		// Extract description bullets
		const description: string[] = [];
		const mainText = $("main").text();
		const bulletMatches = mainText.match(/■[^■\n]+/g);
		if (bulletMatches) {
			for (const match of bulletMatches) {
				const cleaned = match.replace(/^■\s*/, "").trim();
				if (cleaned.length > 10) {
					description.push(cleaned);
				}
			}
		}

		return {
			name: h1,
			description: description.length > 0 ? description : undefined,
			hasPage: true,
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "Unknown error";
		const is404 = errorMsg.includes("404") || errorMsg.includes("Not Found");
		const isTimeout = errorMsg.includes("Timeout") || errorMsg.includes("timeout");
		return {
			hasPage: false,
			error: is404 ? undefined : (isTimeout ? "timeout" : errorMsg),
		};
	}
}

/**
 * Update item file with English translations from global site
 * Uses LocalizedTextArray structure: { ja: string[], en?: string[] }
 */
function updateItemFile(itemId: string, globalData: {
	name?: string;
	description?: string[];
	hasPage: boolean;
	error?: string;
}, dryRun: boolean): boolean {
	if (!globalData.hasPage || !globalData.name) {
		return false;
	}

	const filePath = path.join(ITEMS_PATH, `${itemId}.json`);
	if (!existsSync(filePath)) {
		return false;
	}

	try {
		const item = JSON.parse(readFileSync(filePath, "utf8")) as ItemFile;
		let updated = false;

		// Update name.en if missing or different
		if (!item.name.en || item.name.en !== globalData.name) {
			item.name.en = globalData.name;
			updated = true;
		}

		// Update description.en array (canonical source from global site)
		if (globalData.description && globalData.description.length > 0) {
			if (!item.description) {
				item.description = { ja: [], en: globalData.description };
				updated = true;
			} else if (!item.description.en || JSON.stringify(item.description.en) !== JSON.stringify(globalData.description)) {
				item.description.en = globalData.description;
				updated = true;
			}
		}

		if (updated && !dryRun) {
			writeFileSync(filePath, JSON.stringify(item, null, "\t"));
		}

		return updated;
	} catch {
		return false;
	}
}

/**
 * Calculate stats from index entries
 */
function calculateStats(items: Record<string, ItemIndexEntry>): ItemsIndex["stats"] {
	const entries = Object.values(items);
	return {
		totalItems: Object.keys(items).length,
		japaneseSite: {
			checked: entries.filter((e) => e.japaneseSite).length,
			withPage: entries.filter((e) => e.japaneseSite?.hasPage).length,
			withoutPage: entries.filter((e) => e.japaneseSite && !e.japaneseSite.hasPage && !e.japaneseSite.error).length,
			errors: entries.filter((e) => e.japaneseSite?.error).length,
		},
		globalSite: {
			checked: entries.filter((e) => e.globalSite).length,
			withPage: entries.filter((e) => e.globalSite?.hasPage).length,
			withoutPage: entries.filter((e) => e.globalSite && !e.globalSite.hasPage && !e.globalSite.error).length,
			errors: entries.filter((e) => e.globalSite?.error).length,
		},
	};
}

/**
 * Save index to disk
 */
function saveIndex(index: ItemsIndex, dryRun: boolean): void {
	if (dryRun) {
		return;
	}
	index.stats = calculateStats(index.items);
	index.updatedAt = new Date().toISOString();
	writeFileSync(ITEMS_INDEX_PATH, JSON.stringify(index, null, "\t"));
}

/**
 * Main entry point for global lookup command
 */
export async function runGlobalLookup(options: GlobalLookupOptions): Promise<void> {
	const {
		limit = 0,
		dryRun = false,
		noUpdateFiles = false,
		retryErrors = false,
		headed = false,
		verbose = false,
	} = options;

	const updateFiles = !noUpdateFiles;

	console.log("=== Global Site Translation Lookup ===\n");

	if (dryRun) {
		console.log("Running in DRY-RUN mode - no files will be modified\n");
	}

	// Load index
	if (!existsSync(ITEMS_INDEX_PATH)) {
		console.error("Items index not found at:", ITEMS_INDEX_PATH);
		console.error("Run 'pnpm tsx data/scripts/generate-indexes.ts' first.");
		process.exit(1);
	}

	const index = JSON.parse(readFileSync(ITEMS_INDEX_PATH, "utf8")) as ItemsIndex;
	console.log(`Loaded index with ${Object.keys(index.items).length} items\n`);

	// Find items to check
	let itemsToCheck: string[];

	if (retryErrors) {
		itemsToCheck = Object.entries(index.items)
			.filter(([, entry]) => entry.globalSite?.error)
			.map(([id]) => id);
		console.log(`Found ${itemsToCheck.length} items with errors to retry\n`);
	} else {
		itemsToCheck = Object.entries(index.items)
			.filter(([, entry]) => !entry.globalSite)
			.map(([id]) => id);
		console.log(`Found ${itemsToCheck.length} items not yet checked on global site\n`);
	}

	if (itemsToCheck.length === 0) {
		console.log("No items to check.");
		return;
	}

	// Apply limit
	if (limit > 0 && itemsToCheck.length > limit) {
		itemsToCheck = itemsToCheck.slice(0, limit);
		console.log(`Limiting to ${limit} items\n`);
	}

	// Launch browser
	console.log(`Launching ${headed ? "headed" : "headless"} browser...\n`);
	const browser = await chromium.launch({
		headless: !headed,
	});

	const context = await browser.newContext({
		userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		locale: "en-US",
	});

	const page = await context.newPage();

	// Process items
	let checked = 0;
	let found = 0;
	let notFound = 0;
	let errors = 0;
	let filesUpdated = 0;
	let saveCounter = 0;

	try {
		for (const itemId of itemsToCheck) {
			log(`Checking ${itemId}...`, dryRun);

			const result = await lookupEnglishTranslation(page, itemId);

			// Update index
			index.items[itemId] ??= {};

			index.items[itemId].globalSite = {
				hasPage: result.hasPage,
				checkedAt: new Date().toISOString(),
				productName: result.name,
				error: result.error,
			};

			if (result.hasPage) {
				log(`  ✓ Found: ${result.name ?? "unknown"}`, dryRun);
				found++;

				if (updateFiles) {
					const updated = updateItemFile(itemId, result, dryRun);
					if (updated) {
						if (verbose) {
							log(`  → Updated item file with English translations`, dryRun);
						}
						filesUpdated++;
					}
				}
			} else if (result.error) {
				log(`  ✗ Error: ${result.error}`, dryRun);
				errors++;
			} else {
				log(`  - Not found on global site`, dryRun);
				notFound++;
			}

			checked++;
			saveCounter++;

			// Save index periodically (every 50 items)
			if (saveCounter >= 50) {
				saveIndex(index, dryRun);
				saveCounter = 0;
				if (verbose) {
					log(`  [Index saved]`, dryRun);
				}
			}

			// Delay between requests
			if (checked < itemsToCheck.length) {
				await sleep(REQUEST_DELAY);
			}
		}
	} finally {
		await browser.close();
		console.log("\nBrowser closed.");
	}

	// Final save
	saveIndex(index, dryRun);

	// Summary
	console.log("\n=== Summary ===");
	console.log(`  Checked: ${checked}`);
	console.log(`  Found on global site: ${found}`);
	console.log(`  Not found: ${notFound}`);
	console.log(`  Errors: ${errors}`);
	console.log(`  Item files updated: ${filesUpdated}${updateFiles ? "" : " (skipped)"}`);

	// Updated stats
	const stats = calculateStats(index.items);
	console.log("\n=== Updated Index Stats ===");
	console.log(`  Global site checked: ${stats.globalSite.checked}`);
	console.log(`  Global site with page: ${stats.globalSite.withPage}`);
	console.log(`  Global site without page: ${stats.globalSite.withoutPage}`);
	console.log(`  Global site errors: ${stats.globalSite.errors}`);
}
