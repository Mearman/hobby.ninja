import { SimpleCatalogScraper } from "./simple-catalog-scraper";
import { BandaiCatalogParser } from "./bandai-catalog-parser";
import { CatalogTranslator } from "./catalog-translator";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { CatalogDiscoveryOptions, CatalogDiscoveryResult, CatalogRangeStats, CatalogIndex, CatalogIndexEntry } from "./types/catalog-discovery";

// Fast HTTP client for discovery phase
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Read only 2KB to extract title (95% bandwidth reduction from ~47KB full page)
const PARTIAL_READ_BYTES = 2048;

/**
 * Fast HTTP check to determine if a catalog page is valid (has product content)
 * Uses streaming to read only ~2KB instead of full page (~47KB)
 * Checks the raw HTML title for "404" without rendering JavaScript
 */
async function quickCheckUrl(url: string): Promise<{ isValid: boolean; title?: string }> {
	const controller = new AbortController();

	try {
		const response = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT },
			signal: controller.signal
		});

		if (!response.ok) {
			return { isValid: false };
		}

		// Stream the response and read only what we need
		const reader = response.body?.getReader();
		if (!reader) {
			return { isValid: false };
		}

		const decoder = new TextDecoder();
		let html = '';
		let bytesRead = 0;

		// Read chunks until we have enough to find title or hit our limit
		while (bytesRead < PARTIAL_READ_BYTES) {
			const { done, value } = await reader.read();
			if (done) break;

			html += decoder.decode(value, { stream: true });
			bytesRead += value.length;

			// Check if we have the complete title tag yet
			const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
			const matchedTitle = titleMatch?.[1];
			if (matchedTitle) {
				// Found title - abort the connection and return result
				controller.abort();
				const isValid = !matchedTitle.includes('404');
				return { isValid, title: matchedTitle };
			}
		}

		// Abort connection after reading enough bytes
		controller.abort();

		// Check for title in what we read
		const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
		const title = titleMatch?.[1] || '';

		if (title.includes('404')) {
			return { isValid: false, title };
		}

		return { isValid: true, title };
	} catch (error) {
		// AbortError is expected when we abort after finding title
		if (error instanceof Error && error.name === 'AbortError') {
			return { isValid: false };
		}
		// Network error - treat as invalid
		return { isValid: false };
	}
}

/**
 * Fast discovery phase - iterates through all IDs using HTTP requests
 * Builds index.json with valid/invalid status before downloading content
 */
export async function discoverValidIds(
	ranges: string[],
	_options: CatalogDiscoveryOptions
): Promise<{ validIds: string[]; invalidIds: string[]; skippedIds: string[] }> {
	const validIds: string[] = [];
	const invalidIds: string[] = [];
	const skippedIds: string[] = [];
	const needsCheck: string[] = [];

	console.log(`\n🔍 Checking which product pages exist (${ranges.length} IDs)...`);

	// First pass: quickly categorize indexed vs needs-check (no async, instant)
	for (const range of ranges) {
		const indexCheck = isIdIndexed(range);
		if (indexCheck.indexed) {
			skippedIds.push(range);
			if (indexCheck.isValid) {
				validIds.push(range);
			} else {
				invalidIds.push(range);
			}
		} else {
			needsCheck.push(range);
		}
	}

	// Show summary for previously checked items
	if (skippedIds.length > 0) {
		const existCount = validIds.length;
		const notFoundCount = invalidIds.length;
		console.log(`  ⏭️  ${skippedIds.length} previously checked (${existCount} exist, ${notFoundCount} not found)`);
	}

	// Second pass: parallel HTTP checks for unchecked IDs (batches of 100)
	if (needsCheck.length > 0) {
		const BATCH_SIZE = 100;
		const totalBatches = Math.ceil(needsCheck.length / BATCH_SIZE);
		let newExistCount = 0;
		let newNotFoundCount = 0;

		process.stdout.write(`  🌐 Checking ${needsCheck.length} URLs...`);

		for (let i = 0; i < needsCheck.length; i += BATCH_SIZE) {
			const batch = needsCheck.slice(i, i + BATCH_SIZE);
			const batchNum = Math.floor(i / BATCH_SIZE) + 1;

			// Show progress
			process.stdout.write(`\r  🌐 Checking ${needsCheck.length} URLs... ${batchNum}/${totalBatches}`);

			// Check batch in parallel
			const results = await Promise.all(
				batch.map(async (range) => {
					const url = buildCatalogUrl(range);
					const result = await quickCheckUrl(url);
					return { range, result };
				})
			);

			// Process results (no per-item logging)
			for (const { range, result } of results) {
				if (result.isValid) {
					validIds.push(range);
					recordDiscoveredValidId(range, result.title); // Record in index immediately
					newExistCount++;
				} else {
					invalidIds.push(range);
					recordInvalidId(range);
					newNotFoundCount++;
				}
			}

			// Save index after each batch
			saveCatalogIndex();
		}

		// Final summary on new line
		console.log(`\n  📋 ${newExistCount} pages exist, ${newNotFoundCount} not found`);
	}

	console.log(`\n📊 Summary: ${validIds.length} products found, ${invalidIds.length} IDs have no page`);

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
	const partsA = a.split('_');
	const partsB = b.split('_');
	const prefixA = partsA[0] ?? '';
	const prefixB = partsB[0] ?? '';
	const suffixA = partsA[1] ?? '0';
	const suffixB = partsB[1] ?? '0';

	if (prefixA !== prefixB) {
		return prefixA.localeCompare(prefixB);
	}

	return Number.parseInt(suffixA, 10) - Number.parseInt(suffixB, 10);
}

/**
 * Records a valid catalog entry in the index
 */
export function recordValidId(id: string, hasContent: boolean, productName?: string): void {
	// Only increment totalChecked if this is a new entry
	if (!catalogIndex.valid[id]) {
		catalogIndex.totalChecked++;
	}
	catalogIndex.valid[id] = {
		id,
		hasContent,
		lastChecked: new Date().toISOString(),
		hasFile: hasContent, // hasFile = true only if we have content
		productName
	};

	// Remove from invalid lists if present
	catalogIndex.invalidSingles = catalogIndex.invalidSingles.filter(s => s !== id);
}

/**
 * Records a discovered valid ID (before content is downloaded)
 */
export function recordDiscoveredValidId(id: string, productName?: string): void {
	// Don't overwrite if we already have full content
	if (catalogIndex.valid[id]?.hasContent) return;

	recordValidId(id, false, productName);
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
				console.log(`  Opening browser for: ${range}`);
			}
			await activeScraper.initialize();
		}

		const url = buildCatalogUrl(range);

		if (options.verbose) {
			console.log(`  Loading page: ${url}`);
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
			console.error(`  Error loading ${range}:`, errorMessage);
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
					console.error(`  Error closing browser:`, cleanupError);
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

	console.log(`📊 Index: ${indexStats.valid} products found, ${indexStats.invalid} IDs with no page, ${indexStats.totalChecked} total checked`);

	// Initialize translator if translation is enabled
	let catalogTranslator: CatalogTranslator | undefined;
	if (options.translate) {
		console.log(`🌐 Translation enabled - initializing translation service...`);
		const translationCacheDir = join(options.outputDir, '..', 'translations');
		catalogTranslator = new CatalogTranslator({
			storeDir: translationCacheDir,
			verbose: options.verbose
		});
		await catalogTranslator.initialize();
		console.log(`✅ Translation service ready`);
	}

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
		console.log(`\n✅ All product pages already scraped.`);
		result.completedRanges = discovery.validIds.length;
		result.discoveredUrls = discovery.validIds.length;
		result.processedUrls = discovery.validIds.length;
	} else {
		// Phase 2: Scrape product pages using Playwright (rolling worker pool)
		const WORKER_COUNT = 20; // Number of concurrent browser tabs
		console.log(`\n📥 Scraping ${idsNeedingDownload.length} product pages (${WORKER_COUNT} parallel tabs)...`);

		// Initialize browser ONCE for all downloads
		const scraper = new SimpleCatalogScraper();
		console.log(`  🌐 Opening browser...`);
		await scraper.initialize();

		// Track progress
		let completedCount = 0;
		let nextIndex = 0;
		const total = idsNeedingDownload.length;

		// Reusable parser instance (thread-safe for sequential use per worker)
		const catalogParser = new BandaiCatalogParser();

		// Helper function to process a single item
		const processItem = async (range: string): Promise<void> => {
			try {
				const processResult = await processCatalogRange(range, options, scraper);

				if (processResult.success && processResult.data) {
					// Parse HTML to extract product data
					const catalogResult = catalogParser.parse(
						processResult.data.html,
						range,
						buildCatalogUrl(range)
					);

					const productName = catalogResult.success && catalogResult.data?.name?.ja
						? catalogResult.data.name.ja
						: processResult.data.title;

					recordValidId(range, true, productName);
					result.completedRanges++;
					result.discoveredUrls++;
					result.processedUrls++;

					// Save files asynchronously
					const itemDir = join(options.outputDir, range);
					await mkdir(itemDir, { recursive: true });

					// Write HTML and JSON in parallel
					const writePromises: Promise<void>[] = [
						writeFile(join(itemDir, `${range}.html`), processResult.data.html, 'utf8')
					];

					if (catalogResult.success && catalogResult.data) {
						// Translate if translation is enabled
						if (catalogTranslator) {
							try {
								const translateResult = await catalogTranslator.translateItem(catalogResult.data);
								if (translateResult.translated && options.verbose) {
									console.log(`    🌐 Translated ${translateResult.fieldsTranslated} fields`);
								}
							} catch (translateError) {
								// Log translation error but don't fail the scrape
								if (options.verbose) {
									console.warn(`    ⚠️ Translation failed: ${translateError}`);
								}
							}
						}

						writePromises.push(
							writeFile(join(itemDir, `${range}.json`), JSON.stringify(catalogResult.data, null, 2), 'utf8')
						);
					}

					await Promise.all(writePromises);

					completedCount++;
					console.log(`  [${completedCount}/${total}] ✅ ${range} - ${productName}`);
				} else {
					result.errors.push(processResult.error || `${range}: Download failed`);
					completedCount++;
					console.log(`  [${completedCount}/${total}] ❌ ${range} - Failed: ${processResult.error}`);
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				result.errors.push(`${range}: ${errorMessage}`);
				completedCount++;
				console.log(`  [${completedCount}/${total}] ❌ ${range} - Error: ${errorMessage}`);
			}

			// Save index periodically (every 10 completions)
			if (completedCount % 10 === 0) {
				saveCatalogIndex();
			}
		};

		// Worker function that keeps processing until queue is empty
		const worker = async (): Promise<void> => {
			while (nextIndex < total) {
				const currentIndex = nextIndex++;
				const range = idsNeedingDownload[currentIndex];
				await processItem(range);
			}
		};

		try {
			// Start WORKER_COUNT workers that process from the shared queue
			const workers = Array.from({ length: Math.min(WORKER_COUNT, total) }, () => worker());
			await Promise.all(workers);
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

	console.log(`\n📊 Done! ${finalStats.valid} products found, ${finalStats.invalid} IDs with no page`);

	result.successful = result.errors.length === 0;
	return result;
}