import { SimpleCatalogScraper } from "./simple-catalog-scraper";
import { SimpleHtmlParser } from "@unnamed-gunpla-app/scrapers/manual-parser/core/simple-html-parser";
import { BandaiCatalogParser } from "./bandai-catalog-parser";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { CatalogDiscoveryOptions, CatalogDiscoveryResult, CatalogRangeStats, CatalogIndex, CatalogIndexEntry } from "./types/catalog-discovery";

// Fast HTTP client for discovery phase
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fast HTTP check to determine if a catalog page is valid (has product content)
 * Checks the raw HTML title for "404" without rendering JavaScript
 */
async function quickCheckUrl(url: string): Promise<{ isValid: boolean; title?: string }> {
	try {
		const response = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT },
			signal: AbortSignal.timeout(10000)
		});

		if (!response.ok) {
			return { isValid: false };
		}

		const html = await response.text();

		// Check for 404 in title (Bandai returns HTTP 200 but shows 404 page)
		const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
		const title = titleMatch?.[1] || '';

		// If title contains "404", it's an invalid/missing page
		if (title.includes('404')) {
			return { isValid: false, title };
		}

		return { isValid: true, title };
	} catch (error) {
		// Network error - treat as invalid for now
		return { isValid: false };
	}
}

/**
 * Fast discovery phase - iterates through all IDs using HTTP requests
 * Builds index.json with valid/invalid status before downloading content
 */
export async function discoverValidIds(
	ranges: string[],
	options: CatalogDiscoveryOptions
): Promise<{ validIds: string[]; invalidIds: string[]; skippedIds: string[] }> {
	const validIds: string[] = [];
	const invalidIds: string[] = [];
	const skippedIds: string[] = [];

	console.log(`\n🔍 Phase 1: Fast discovery of ${ranges.length} IDs...`);

	for (let i = 0; i < ranges.length; i++) {
		const range = ranges[i];

		// Check if already indexed
		const indexCheck = isIdIndexed(range);
		if (indexCheck.indexed) {
			skippedIds.push(range);
			if (indexCheck.isValid) {
				validIds.push(range);
			} else {
				invalidIds.push(range);
			}

			if (options.verbose) {
				const status = indexCheck.isValid ? '✅' : '❌';
				console.log(`  ${status} ${range} - already indexed`);
			}
			continue;
		}

		// Fast HTTP check
		const url = buildCatalogUrl(range);
		const result = await quickCheckUrl(url);

		if (result.isValid) {
			validIds.push(range);
			// Don't record in index yet - will be recorded after full download
			console.log(`  ✅ ${range} - valid (${result.title?.substring(0, 50) || 'unknown'})`);
		} else {
			invalidIds.push(range);
			recordInvalidId(range);
			console.log(`  ❌ ${range} - invalid (404)`);
		}

		// Save index periodically (every 10 checks)
		if ((i + 1) % 10 === 0) {
			saveCatalogIndex();
		}

		// Small delay between HTTP requests
		if (i < ranges.length - 1) {
			await new Promise(resolve => setTimeout(resolve, options.delayMs / 10)); // Fast delay (1/10th)
		}
	}

	// Final save
	saveCatalogIndex();

	console.log(`\n📊 Discovery complete:`);
	console.log(`   ✅ Valid: ${validIds.length}`);
	console.log(`   ❌ Invalid: ${invalidIds.length}`);
	console.log(`   ⏭️  Skipped (already indexed): ${skippedIds.length}`);

	return { validIds, invalidIds, skippedIds };
}

// Module-level index state
let catalogIndex: CatalogIndex = createEmptyIndex();
let indexPath: string = '';

/**
 * Creates an empty catalog index
 */
function createEmptyIndex(): CatalogIndex {
	return {
		valid: {},
		invalidRanges: [],
		invalidSingles: [],
		totalChecked: 0,
		lastUpdated: new Date().toISOString()
	};
}

/**
 * Loads the catalog index from disk
 */
export function loadCatalogIndex(outputDir: string): CatalogIndex {
	indexPath = join(outputDir, 'index.json');

	try {
		if (existsSync(indexPath)) {
			const data = readFileSync(indexPath, 'utf8');
			catalogIndex = JSON.parse(data);
			return catalogIndex;
		}
	} catch (error) {
		console.warn(`⚠️  Failed to load index: ${error}`);
	}

	catalogIndex = createEmptyIndex();
	return catalogIndex;
}

/**
 * Saves the catalog index to disk
 */
export function saveCatalogIndex(): void {
	if (!indexPath) return;

	try {
		catalogIndex.lastUpdated = new Date().toISOString();
		writeFileSync(indexPath, JSON.stringify(catalogIndex, null, 2), 'utf8');
	} catch (error) {
		console.warn(`⚠️  Failed to save index: ${error}`);
	}
}

/**
 * Checks if an ID is already in the index (valid or invalid)
 */
export function isIdIndexed(id: string): { indexed: boolean; isValid?: boolean; entry?: CatalogIndexEntry } {
	// Check valid entries
	if (catalogIndex.valid[id]) {
		return { indexed: true, isValid: true, entry: catalogIndex.valid[id] };
	}

	// Check invalid singles
	if (catalogIndex.invalidSingles.includes(id)) {
		return { indexed: true, isValid: false };
	}

	// Check invalid ranges (convert string IDs to comparable format)
	for (const range of catalogIndex.invalidRanges) {
		if (compareIds(id, range.start) >= 0 && compareIds(id, range.end) <= 0) {
			return { indexed: true, isValid: false };
		}
	}

	return { indexed: false };
}

/**
 * Compare two catalog IDs (e.g., "01_1000" vs "01_1001")
 */
function compareIds(a: string, b: string): number {
	const [prefixA, suffixA] = a.split('_');
	const [prefixB, suffixB] = b.split('_');

	if (prefixA !== prefixB) {
		return prefixA.localeCompare(prefixB);
	}

	return parseInt(suffixA) - parseInt(suffixB);
}

/**
 * Records a valid catalog entry in the index
 */
export function recordValidId(id: string, hasContent: boolean, productName?: string): void {
	catalogIndex.totalChecked++;
	catalogIndex.valid[id] = {
		id,
		hasContent,
		lastChecked: new Date().toISOString(),
		hasFile: true,
		productName
	};

	// Remove from invalid lists if present
	catalogIndex.invalidSingles = catalogIndex.invalidSingles.filter(s => s !== id);
}

/**
 * Records an invalid catalog ID in the index
 */
export function recordInvalidId(id: string): void {
	catalogIndex.totalChecked++;

	// Don't add if already in valid (shouldn't happen but be safe)
	if (catalogIndex.valid[id]) return;

	// Don't add if already in invalid singles
	if (catalogIndex.invalidSingles.includes(id)) return;

	// Check if already covered by a range
	for (const range of catalogIndex.invalidRanges) {
		if (compareIds(id, range.start) >= 0 && compareIds(id, range.end) <= 0) {
			return;
		}
	}

	// Add to invalid singles (range compression done on save if needed)
	catalogIndex.invalidSingles.push(id);
}

/**
 * Gets index statistics for display
 */
export function getIndexStats(): { valid: number; invalid: number; totalChecked: number } {
	const invalidCount = catalogIndex.invalidSingles.length +
		catalogIndex.invalidRanges.reduce((sum, r) => {
			const [, startSuffix] = r.start.split('_');
			const [, endSuffix] = r.end.split('_');
			return sum + (parseInt(endSuffix) - parseInt(startSuffix) + 1);
		}, 0);

	return {
		valid: Object.keys(catalogIndex.valid).length,
		invalid: invalidCount,
		totalChecked: catalogIndex.totalChecked
	};
}

/**
 * Generates sequential catalog range identifiers starting from 00_0000
 */
export function generateCatalogRanges(count: number): string[] {
	const ranges: string[] = [];

	for (let i = 0; i < count; i++) {
		// Generate IDs in format 00_0000, 00_0001, 00_0002, etc.
		// This follows the pattern observed on bandai-hobby.net
		const id = 0 + i;
		const formattedId = id.toString().padStart(4, '0');
		ranges.push(`00_${formattedId}`);
	}

	return ranges;
}

/**
 * Builds a catalog URL from a range identifier
 */
export function buildCatalogUrl(range: string): string {
	return `https://bandai-hobby.net/item/${range}/`;
}

/**
 * Processes a single catalog range using SimpleCatalogScraper
 * Catalog pages are static HTML but require browser headers to bypass anti-bot protection
 * @param scraper - Optional pre-initialized scraper instance for browser reuse
 */
export async function processCatalogRange(
	range: string,
	options: CatalogDiscoveryOptions,
	scraper?: SimpleCatalogScraper
): Promise<{ success: boolean; error?: string; data?: any }> {
	const ownsScraper = !scraper;
	const activeScraper = scraper ?? new SimpleCatalogScraper();

	try {
		if (ownsScraper) {
			if (options.verbose) {
				console.log(`Initializing browser for catalog range: ${range}`);
			}
			await activeScraper.initialize();
		}

		const url = buildCatalogUrl(range);

		if (options.verbose) {
			console.log(`Processing catalog range: ${range} -> ${url}`);
		}

		// Use SimpleCatalogScraper to bypass anti-bot protection and extract data
		const result = await activeScraper.extractFromPage(range, url);

		return {
			success: true,
			data: result
		};

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		if (options.verbose) {
			console.error(`Error processing catalog range ${range}:`, errorMessage);
		}

		return {
			success: false,
			error: `${range}: ${errorMessage}`
		};
	} finally {
		// Only cleanup if we created the scraper (not shared)
		if (ownsScraper) {
			try {
				await activeScraper.cleanup();
			} catch (cleanupError) {
				if (options.verbose) {
					console.error(`Error cleaning up scraper:`, cleanupError);
				}
			}
		}
	}
}

/**
 * Processes multiple catalog ranges sequentially
 */
export async function processCatalogRanges(ranges: string[], options: CatalogDiscoveryOptions): Promise<{
	totalRanges: number;
	completedRanges: number;
	totalUrls: number;
	urls: string[];
	errors: string[];
	rangeStats: Record<string, CatalogRangeStats>;
}> {
	const errors: string[] = [];
	const rangeStats: Record<string, CatalogRangeStats> = {};
	let completedRanges = 0;
	const urls: string[] = [];

	for (const range of ranges) {
		try {
			const result = await processCatalogRange(range, options);

			rangeStats[range] = {
				status: result.success ? 'success' : 'error',
				urlCount: result.success ? 1 : 0,
				error: result.error
			};

			if (result.success) {
				completedRanges++;
				urls.push(buildCatalogUrl(range));
			} else {
				errors.push(result.error || `${range}: Unknown error`);
			}

			// Add delay between requests to respect rate limiting
			if (ranges.indexOf(range) < ranges.length - 1) {
				await new Promise(resolve => setTimeout(resolve, options.delayMs));
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			errors.push(`${range}: ${errorMessage}`);

			rangeStats[range] = {
				status: 'error',
				urlCount: 0,
				error: errorMessage
			};
		}
	}

	return {
		totalRanges: ranges.length,
		completedRanges,
		totalUrls: urls.length,
		urls,
		errors,
		rangeStats
	};
}

/**
 * Main function to discover and process catalog items
 * Uses two-phase approach:
 * 1. Fast HTTP discovery to build index of valid/invalid IDs
 * 2. Playwright-based content extraction only for valid IDs
 */
export async function discoverCatalogItems(options: CatalogDiscoveryOptions): Promise<CatalogDiscoveryResult> {
	const startTime = Date.now();

	// Ensure output directory exists
	mkdirSync(options.outputDir, { recursive: true });

	// Load existing index
	loadCatalogIndex(options.outputDir);
	const indexStats = getIndexStats();

	console.log(`📊 Index loaded: ${indexStats.valid} valid, ${indexStats.invalid} invalid, ${indexStats.totalChecked} total checked`);

	const result: CatalogDiscoveryResult = {
		successful: true,
		totalRanges: options.ranges.length,
		completedRanges: 0,
		failedRanges: 0,
		discoveredUrls: 0,
		processedUrls: 0,
		errors: [],
		processingTime: 0,
		stats: {
			totalRanges: options.ranges.length,
			completedRanges: 0,
			failedRanges: 0,
			averageProcessingTime: 0
		}
	};

	// Phase 1: Fast HTTP discovery
	const discovery = await discoverValidIds(options.ranges, options);

	result.failedRanges = discovery.invalidIds.length;

	// Filter to only IDs that need content download (valid but not yet downloaded)
	const idsNeedingDownload = discovery.validIds.filter(id => {
		const check = isIdIndexed(id);
		// Need download if not indexed OR indexed but doesn't have file yet
		return !check.indexed || (check.indexed && check.isValid && !check.entry?.hasFile);
	});

	if (idsNeedingDownload.length === 0) {
		console.log(`\n✅ All valid IDs already have content downloaded.`);
		result.completedRanges = discovery.validIds.length;
		result.discoveredUrls = discovery.validIds.length;
		result.processedUrls = discovery.validIds.length;
	} else {
		// Phase 2: Download content for valid IDs using Playwright
		console.log(`\n📥 Phase 2: Downloading content for ${idsNeedingDownload.length} valid IDs...`);

		// Initialize browser ONCE for all downloads
		const scraper = new SimpleCatalogScraper();
		console.log(`  🌐 Initializing browser...`);
		await scraper.initialize();

		try {
			for (let i = 0; i < idsNeedingDownload.length; i++) {
				const range = idsNeedingDownload[i];

				try {
					console.log(`  [${i + 1}/${idsNeedingDownload.length}] Downloading ${range}...`);

					// Pass shared scraper instance to avoid re-launching browser
					const processResult = await processCatalogRange(range, options, scraper);

					if (processResult.success && processResult.data) {
						const productName = processResult.data.productName;
						recordValidId(range, true, productName);
						result.completedRanges++;
						result.discoveredUrls++;
						result.processedUrls++;

						// Save the extracted data to the output directory
						const itemDir = join(options.outputDir, range);
						mkdirSync(itemDir, { recursive: true });

						// Save HTML content and structured HTML as JSON
						if (processResult.data.html) {
							const htmlFile = join(itemDir, `${range}.html`);
							writeFileSync(htmlFile, processResult.data.html, 'utf8');

							// Save structured HTML content as .html.json (generic parse5 output)
							const htmlParser = new SimpleHtmlParser();
							const parsedHtml = htmlParser.parse(processResult.data.html);

							if (parsedHtml.success && parsedHtml.data) {
								const htmlJsonFile = join(itemDir, `${range}.html.json`);
								writeFileSync(htmlJsonFile, JSON.stringify(parsedHtml.data, null, 2), 'utf8');
							}

							// Save structured catalog data as .json (semantic Cheerio extraction)
							const catalogParser = new BandaiCatalogParser();
							const catalogResult = catalogParser.parse(
								processResult.data.html,
								range,
								buildCatalogUrl(range)
							);

							if (catalogResult.success && catalogResult.data) {
								const catalogJsonFile = join(itemDir, `${range}.json`);
								writeFileSync(catalogJsonFile, JSON.stringify(catalogResult.data, null, 2), 'utf8');
							}
						}

						console.log(`     ✅ ${range} - ${productName || processResult.data.title}`);

						// Save index after each successful download
						saveCatalogIndex();
					} else {
						result.errors.push(processResult.error || `${range}: Download failed`);
						console.log(`     ❌ ${range} - Failed: ${processResult.error}`);
					}

					// Delay between Playwright requests
					if (i < idsNeedingDownload.length - 1) {
						await new Promise(resolve => setTimeout(resolve, options.delayMs));
					}
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					result.errors.push(`${range}: ${errorMessage}`);
					console.log(`     ❌ ${range} - Error: ${errorMessage}`);
				}
			}
		} finally {
			// Cleanup browser after all downloads
			console.log(`  🌐 Closing browser...`);
			await scraper.cleanup();
		}

		// Add already-downloaded valid IDs to counts
		const alreadyDownloaded = discovery.validIds.length - idsNeedingDownload.length;
		result.completedRanges += alreadyDownloaded;
		result.discoveredUrls += alreadyDownloaded;
		result.processedUrls += alreadyDownloaded;
	}

	// Final save of index
	saveCatalogIndex();

	const endTime = Date.now();
	result.processingTime = endTime - startTime;

	const finalStats = getIndexStats();
	result.stats = {
		totalRanges: options.ranges.length,
		completedRanges: result.completedRanges,
		failedRanges: result.failedRanges,
		averageProcessingTime: result.processingTime / Math.max(1, options.ranges.length)
	};

	console.log(`\n📊 Final index stats: ${finalStats.valid} valid, ${finalStats.invalid} invalid, ${finalStats.totalChecked} total`);

	result.successful = result.errors.length === 0;
	return result;
}