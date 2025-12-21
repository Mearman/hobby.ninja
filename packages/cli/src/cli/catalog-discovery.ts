import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";

import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";

import { BandaiCatalogParser, type EntityData, type Item } from "./bandai-catalog-parser";
import { CatalogTranslator } from "./catalog-translator";
import { SimpleCatalogScraper, type SimpleCatalogResult } from "./simple-catalog-scraper";
import type { CatalogDiscoveryOptions, CatalogDiscoveryResult, CatalogRangeStats } from "./types/catalog-discovery";
import { ItemsIndexUpdater } from "./items-index-updater";

// ============================================================================
// Filename Padding
// ============================================================================

/**
 * Pad the numeric suffix of an item ID to 4 digits for consistent filename sorting
 * 01_1 -> 01_0001, 01_778 -> 01_0778, 01_1000 -> 01_1000 (unchanged)
 * Note: This only affects the filename, not the id field in the JSON data
 */
function padItemId(id: string): string {
	const parts = id.split("_");
	if (parts.length !== 2) return id;
	const [prefix, suffix] = parts;
	// Validate both parts are numeric
	if (!/^\d+$/.test(prefix) || !/^\d+$/.test(suffix)) return id;
	return `${prefix}_${suffix.padStart(4, "0")}`;
}

// ============================================================================
// Entity Upsert Logic
// ============================================================================

/**
 * Upsert entity data to the appropriate directory
 * Only creates new entities, preserves existing ones (they may have curated data)
 */
async function upsertEntity(entity: EntityData, dataDir: string, verbose?: boolean): Promise<boolean> {
	// Map entity type to directory name (handle pluralization correctly)
	const entityDirMap: Record<string, string> = {
		brand: "brands",
		series: "series", // series is already plural
		category: "categories",
	};
	const entityDir = entityDirMap[entity.type] ?? `${entity.type}s`;
	const filePath = join(dataDir, entityDir, `${entity.id}.json`);

	// Check if entity already exists
	if (existsSync(filePath)) {
		// Entity exists - don't overwrite (preserves curated EN translations, images, etc.)
		return false;
	}

	// Create new entity file
	const entityData = {
		id: entity.id,
		type: entity.type,
		name: entity.name,
		url: entity.url,
	};

	// Ensure directory exists
	const dir = dirname(filePath);
	await mkdir(dir, { recursive: true });

	await writeFile(filePath, JSON.stringify(entityData, null, "\t"), "utf8");

	if (verbose) {
		console.log(`    📁 Created ${entity.type}: ${entity.id}`);
	}

	return true;
}

/**
 * Upsert multiple entities, returns count of newly created
 */
async function upsertEntities(entities: EntityData[], dataDir: string, verbose?: boolean): Promise<number> {
	let created = 0;
	for (const entity of entities) {
		const wasCreated = await upsertEntity(entity, dataDir, verbose);
		if (wasCreated) created++;
	}
	return created;
}

// ============================================================================
// Item Merge Logic
// ============================================================================

/**
 * Extract image ID from URL or path (e.g., "153_1937" from various URL formats)
 */
function extractImageId(urlOrPath: string): string | null {
	// Match patterns like "153_1937" from URLs/paths
	const match = /(\d+_\d+)(?:_s_[a-z0-9]+)?\.jpg/i.exec(urlOrPath);
	return match?.[1] ?? null;
}

/**
 * Merge scraped item data with existing curated data
 * Preserves: English translations, manualId, downloadVerifiedAt, image paths, and other curated fields
 * Updates: Japanese data from fresh scrape, adds new fields
 */
function mergeItemData(scraped: Item, existing: Record<string, unknown>): Item {
	const merged = { ...scraped };

	// Preserve English name if it exists
	if (existing.name && typeof existing.name === "object" && "en" in existing.name) {
		merged.name = { ...scraped.name, en: (existing.name as { en?: string }).en };
	}

	// Preserve English translations in localized text arrays
	const localizedFields = ["description", "accessories", "contents"] as const;
	for (const field of localizedFields) {
		const existingField = existing[field];
		const scrapedField = scraped[field];
		if (existingField && typeof existingField === "object" && "en" in existingField && scrapedField) {
			(merged[field] as { ja: string[]; en?: string[] }).en = (existingField as { en?: string[] }).en;
		}
	}

	// Preserve manualId if existing has it and scraped doesn't
	if (existing.manualId && !scraped.manualId) {
		merged.manualId = existing.manualId as string;
	}

	// Preserve download verification timestamp
	if (existing.downloadVerifiedAt) {
		(merged as Record<string, unknown>).downloadVerifiedAt = existing.downloadVerifiedAt;
	}

	// Merge images: preserve local paths from existing, update source URLs from scrape
	if (scraped.images && existing.images) {
		// Build map of existing image paths by image ID
		const existingPathMap = new Map<string, string>();

		// Handle old format (flat array) or new format (object with product/instructions)
		const existingImages = existing.images;
		if (Array.isArray(existingImages)) {
			// Old format: flat array of strings or objects
			for (const img of existingImages) {
				const imgPath = typeof img === "string" ? img : (img as { path?: string }).path;
				if (imgPath) {
					const imgId = extractImageId(imgPath);
					if (imgId) existingPathMap.set(imgId, imgPath);
				}
			}
		} else if (typeof existingImages === "object") {
			// New format: { product: [], instructions: [] }
			const imgObj = existingImages as { product?: unknown[]; instructions?: unknown[] };
			for (const img of imgObj.product ?? []) {
				const imgPath = typeof img === "string" ? img : (img as { path?: string }).path;
				if (imgPath) {
					const imgId = extractImageId(imgPath);
					if (imgId) existingPathMap.set(imgId, imgPath);
				}
			}
			for (const img of imgObj.instructions ?? []) {
				const imgPath = typeof img === "string" ? img : (img as { path?: string }).path;
				if (imgPath) {
					const imgId = extractImageId(imgPath);
					if (imgId) existingPathMap.set(imgId, imgPath);
				}
			}
		}

		// Merge paths into scraped images
		if (existingPathMap.size > 0) {
			merged.images = {
				product: scraped.images.product.map(img => {
					const imgId = extractImageId(img.src);
					if (imgId && existingPathMap.has(imgId)) {
						return { ...img, path: existingPathMap.get(imgId) };
					}
					return img;
				}),
				instructions: scraped.images.instructions.map(img => {
					const imgId = extractImageId(img.src);
					if (imgId && existingPathMap.has(imgId)) {
						return { ...img, path: existingPathMap.get(imgId) };
					}
					return img;
				}),
			};
		}
	}

	return merged;
}

/**
 * Read existing item file if it exists
 */
async function readExistingItem(filePath: string): Promise<Record<string, unknown> | null> {
	try {
		if (!existsSync(filePath)) return null;
		const content = await readFile(filePath, "utf8");
		return JSON.parse(content) as Record<string, unknown>;
	} catch {
		return null;
	}
}

// ============================================================================
// URL Checking
// ============================================================================

// Fast HTTP client for discovery phase
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
			headers: { "User-Agent": USER_AGENT },
			signal: controller.signal,
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
		let html = "";
		let bytesRead = 0;

		// Read chunks until we have enough to find title or hit our limit
		while (bytesRead < PARTIAL_READ_BYTES) {
			const { done, value } = await reader.read();
			if (done) break;

			html += decoder.decode(value, { stream: true });
			bytesRead += value.length;

			// Check if we have the complete title tag yet
			const titleMatch = /<title>([^<]+)<\/title>/i.exec(html);
			const matchedTitle = titleMatch?.[1];
			if (matchedTitle) {
				// Found title - abort the connection and return result
				controller.abort();
				const isValid = !matchedTitle.includes("404");
				return { isValid, title: matchedTitle };
			}
		}

		// Abort connection after reading enough bytes
		controller.abort();

		// Check for title in what we read
		const titleMatch = /<title>([^<]+)<\/title>/i.exec(html);
		const title = titleMatch?.[1] || "";

		if (title.includes("404")) {
			return { isValid: false, title };
		}

		return { isValid: true, title };
	} catch (error) {
		// AbortError is expected when we abort after finding title
		if (error instanceof Error && error.name === "AbortError") {
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
	_options: CatalogDiscoveryOptions,
): Promise<{ validIds: string[]; invalidIds: string[]; skippedIds: string[] }> {
	const validIds: string[] = [];
	const invalidIds: string[] = [];
	const skippedIds: string[] = [];
	const needsCheck: string[] = [];

	console.log(`\n🔍 Checking which product pages exist (${ranges.length} IDs)...`);

	// First pass: quickly categorize indexed vs needs-check (no async, instant)
	for (const range of ranges) {
		const indexCheck = ItemsIndexUpdater.isIndexed(range);
		if (indexCheck.indexed) {
			skippedIds.push(range);
			if (indexCheck.hasPage) {
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
				}),
			);

			// Process results (no per-item logging)
			for (const { range, result } of results) {
				if (result.isValid) {
					validIds.push(range);
					ItemsIndexUpdater.recordJpValid(range, result.title);
					newExistCount++;
				} else {
					invalidIds.push(range);
					ItemsIndexUpdater.recordJpInvalid(range);
					newNotFoundCount++;
				}
			}

			// Save index after each batch
			ItemsIndexUpdater.save();
		}

		// Final summary on new line
		console.log(`\n  📋 ${newExistCount} pages exist, ${newNotFoundCount} not found`);
	}

	console.log(`\n📊 Summary: ${validIds.length} products found, ${invalidIds.length} IDs have no page`);

	return { validIds, invalidIds, skippedIds };
}


/**
 * Generates sequential catalog range identifiers starting from 00_0000
 */
export function generateCatalogRanges(count: number): string[] {
	const ranges: string[] = [];

	for (let i = 0; i < count; i++) {
		// Generate IDs in format 00_0, 00_1, 00_2, etc.
		// Bandai uses variable-length IDs (e.g., 01_1, 01_778, 01_1000)
		const id = 0 + i;
		ranges.push(`00_${id}`);
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
	scraper?: SimpleCatalogScraper,
): Promise<{ success: boolean; error?: string; data?: SimpleCatalogResult }> {
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
			data: result,
		};

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		if (options.verbose) {
			console.error(`  Error loading ${range}:`, errorMessage);
		}

		return {
			success: false,
			error: `${range}: ${errorMessage}`,
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
				status: result.success ? "success" : "error",
				urlCount: result.success ? 1 : 0,
				error: result.error,
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
				status: "error",
				urlCount: 0,
				error: errorMessage,
			};
		}
	}

	return {
		totalRanges: ranges.length,
		completedRanges,
		totalUrls: urls.length,
		urls,
		errors,
		rangeStats,
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
	ItemsIndexUpdater.load();
	const indexStats = ItemsIndexUpdater.getDisplayStats();

	console.log(`📊 Index: ${indexStats.valid} products found, ${indexStats.invalid} IDs with no page, ${indexStats.totalChecked} total checked`);

	// Initialize translator if translation is enabled
	let catalogTranslator: CatalogTranslator | undefined;
	if (options.translate) {
		console.log(`🌐 Translation enabled - initializing translation service...`);
		const translationCacheDir = join(options.outputDir, "..", "translations");
		catalogTranslator = new CatalogTranslator({
			storeDir: translationCacheDir,
			verbose: options.verbose,
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
			averageProcessingTime: 0,
		},
	};

	// Phase 1: Fast HTTP discovery
	const discovery = await discoverValidIds(options.ranges, options);

	result.failedRanges = discovery.invalidIds.length;

	// Filter to only IDs that need content download (valid but not yet downloaded)
	// When forceRescrape is true, re-scrape all valid IDs (merge preserves curated data)
	const idsNeedingDownload = options.forceRescrape
		? discovery.validIds
		: ItemsIndexUpdater.getIdsNeedingDownload(discovery.validIds);

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
						buildCatalogUrl(range),
					);

					const productName = catalogResult.success && catalogResult.data?.name?.ja
						? catalogResult.data.name.ja
						: processResult.data.title;

					ItemsIndexUpdater.recordFileCreated(range, productName);
					result.completedRanges++;
					result.discoveredUrls++;
					result.processedUrls++;

					// Save files asynchronously (flat structure: outputDir/{paddedId}.json)
					// Write HTML and JSON in parallel
					const paddedRange = padItemId(range);
					const writePromises: Array<Promise<void>> = [
						writeFile(join(options.outputDir, `${paddedRange}.html`), processResult.data.html, "utf8"),
					];

					if (catalogResult.success && catalogResult.data) {
						// Upsert entities (brands, series, categories) to data/src/
						// outputDir is typically data/src/items, so parent is data/src/
						if (catalogResult.entities && catalogResult.entities.length > 0) {
							const dataDir = dirname(options.outputDir);
							await upsertEntities(catalogResult.entities, dataDir, options.verbose);
						}

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

						// Merge with existing data to preserve curated fields (EN translations, manualId, etc.)
						const itemPath = join(options.outputDir, `${paddedRange}.json`);
						const existingItem = await readExistingItem(itemPath);
						const finalItem = existingItem
							? mergeItemData(catalogResult.data, existingItem)
							: catalogResult.data;

						writePromises.push(
							writeFile(itemPath, JSON.stringify(finalItem, null, "\t"), "utf8"),
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

			// Save index after each item (resilient to interruptions)
			ItemsIndexUpdater.save();
		};

		// Worker function that keeps processing until queue is empty
		const worker = async (): Promise<void> => {
			while (nextIndex < total) {
				const currentIndex = nextIndex++;
				const range = idsNeedingDownload[currentIndex];
				if (range !== undefined) {
					await processItem(range);
				}
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
	ItemsIndexUpdater.save();

	const endTime = Date.now();
	result.processingTime = endTime - startTime;

	const finalStats = ItemsIndexUpdater.getDisplayStats();
	result.stats = {
		totalRanges: options.ranges.length,
		completedRanges: result.completedRanges,
		failedRanges: result.failedRanges,
		averageProcessingTime: result.processingTime / Math.max(1, options.ranges.length),
	};

	console.log(`\n📊 Done! ${finalStats.valid} products found, ${finalStats.invalid} IDs with no page`);

	result.successful = result.errors.length === 0;
	return result;
}