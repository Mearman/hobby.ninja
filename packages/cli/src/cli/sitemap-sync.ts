/**
 * Sitemap sync command - discovers new items from Bandai's sitemap
 * and adds them to the items index for future scraping.
 */

import {
	extractItemIdsFromSitemap,
	extractNestedSitemapUrls,
	isSitemapIndex,
} from "../utils/sitemap-parser.js";

import { ItemsIndexUpdater } from "./items-index-updater.js";

const DEFAULT_SITEMAP_URL = "https://bandai-hobby.net/sitemap.xml";
const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export interface SitemapSyncOptions {
	sitemapUrl?: string;
	dryRun?: boolean;
	verbose?: boolean;
}

export interface SitemapSyncResult {
	totalUrlsFound: number;
	newItemIds: string[];
	existingItemIds: string[];
	skippedUrls: number;
	errors: string[];
	duration: number;
}

/**
 * Pad item ID to standard format (01_1 -> 01_0001)
 */
function padItemId(id: string): string {
	const parts = id.split("_");
	if (parts.length !== 2) return id;
	const prefix = parts[0];
	const suffix = parts[1];
	if (!prefix || !suffix) return id;
	return `${prefix}_${suffix.padStart(4, "0")}`;
}

/**
 * Fetch URL with retry logic
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<string> {
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				controller.abort();
			}, FETCH_TIMEOUT_MS);

			const response = await fetch(url, {
				signal: controller.signal,
				headers: {
					"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
					"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
					"Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
					"Accept-Encoding": "gzip, deflate, br",
					"Cache-Control": "no-cache",
					"Pragma": "no-cache",
				},
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
			}

			return await response.text();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (attempt < retries) {
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
			}
		}
	}

	throw lastError ?? new Error("Failed to fetch after retries");
}

/**
 * Recursively fetch and parse sitemaps, following sitemap index references
 */
async function fetchAllItemIds(
	url: string,
	verbose: boolean,
	errors: string[],
): Promise<string[]> {
	const allItemIds: string[] = [];

	try {
		if (verbose) {
			console.log(`  Fetching: ${url}`);
		}

		const xml = await fetchWithRetry(url);

		if (isSitemapIndex(xml)) {
			// This is a sitemap index - fetch nested sitemaps
			const nestedUrls = extractNestedSitemapUrls(xml);

			if (verbose) {
				console.log(`  Found ${String(nestedUrls.length)} nested sitemap(s)`);
			}

			for (const nestedUrl of nestedUrls) {
				const nestedIds = await fetchAllItemIds(nestedUrl, verbose, errors);
				allItemIds.push(...nestedIds);
			}
		} else {
			// This is a urlset - extract item IDs
			const itemIds = extractItemIdsFromSitemap(xml);

			if (verbose) {
				console.log(`  Extracted ${String(itemIds.length)} item IDs`);
			}

			allItemIds.push(...itemIds);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		errors.push(`Failed to fetch ${url}: ${message}`);

		if (verbose) {
			console.error(`  Error: ${message}`);
		}
	}

	return allItemIds;
}

/**
 * Main sitemap sync function
 */
export async function sitemapSync(options: SitemapSyncOptions = {}): Promise<SitemapSyncResult> {
	const startTime = Date.now();
	const sitemapUrl = options.sitemapUrl ?? DEFAULT_SITEMAP_URL;
	const verbose = options.verbose ?? false;
	const dryRun = options.dryRun ?? false;

	const result: SitemapSyncResult = {
		totalUrlsFound: 0,
		newItemIds: [],
		existingItemIds: [],
		skippedUrls: 0,
		errors: [],
		duration: 0,
	};

	console.log("Fetching Bandai sitemap...");
	console.log(`  URL: ${sitemapUrl}`);

	if (dryRun) {
		console.log("  Mode: DRY RUN (no changes will be made)");
	}

	// Load current index
	ItemsIndexUpdater.load();

	// Fetch all item IDs from sitemap
	const sitemapItemIds = await fetchAllItemIds(sitemapUrl, verbose, result.errors);
	result.totalUrlsFound = sitemapItemIds.length;

	console.log(`\nFound ${String(sitemapItemIds.length)} item URLs in sitemap`);

	// Compare with existing index
	for (const itemId of sitemapItemIds) {
		const paddedId = padItemId(itemId);

		if (ItemsIndexUpdater.hasItem(paddedId)) {
			result.existingItemIds.push(paddedId);
		} else {
			result.newItemIds.push(paddedId);
		}
	}

	console.log(`\nComparison results:`);
	console.log(`  Existing items: ${String(result.existingItemIds.length)}`);
	console.log(`  New items: ${String(result.newItemIds.length)}`);

	// Add new items to index
	if (result.newItemIds.length > 0) {
		if (dryRun) {
			console.log(`\nDry run - would add ${String(result.newItemIds.length)} new items:`);
			const previewItems = result.newItemIds.slice(0, 10);
			for (const itemId of previewItems) {
				console.log(`  ${itemId}`);
			}
			if (result.newItemIds.length > 10) {
				console.log(`  ... and ${String(result.newItemIds.length - 10)} more`);
			}
		} else {
			console.log(`\nAdding ${String(result.newItemIds.length)} new items to index...`);

			for (const itemId of result.newItemIds) {
				ItemsIndexUpdater.recordFromSitemap(itemId);
			}

			ItemsIndexUpdater.save();
			console.log("Index updated successfully.");
		}
	} else {
		console.log("\nNo new items to add.");
	}

	if (result.errors.length > 0) {
		console.log(`\nErrors encountered: ${String(result.errors.length)}`);
		for (const error of result.errors) {
			console.error(`  ${error}`);
		}
	}

	result.duration = Date.now() - startTime;
	console.log(`\nCompleted in ${String(result.duration)}ms`);

	if (!dryRun && result.newItemIds.length > 0) {
		console.log(`\nRun 'scrape' command to fetch content for new items.`);
	}

	return result;
}
