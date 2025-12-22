import { existsSync, mkdirSync } from "node:fs";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { normalizeText } from "@hobby-ninja/translation";

import { BandaiCatalogParser, type EntityData, type GlobalSiteUrls, type Item, type ParsedAccessoryItem } from "./bandai-catalog-parser";
import { CatalogTranslator } from "./catalog-translator";
import { parseCountedItems } from "./count-parser";
import { ItemsIndexUpdater } from "./items-index-updater";
import { SimpleCatalogScraper, type SimpleCatalogResult } from "./simple-catalog-scraper";
import type { CatalogDiscoveryOptions, CatalogDiscoveryResult, CatalogRangeStats } from "./types/catalog-discovery";

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
	const prefix = parts[0];
	const suffix = parts[1];
	if (!prefix || !suffix) return id;
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
	const filePath = path.join(dataDir, entityDir, `${entity.id}.json`);

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
	const dir = path.dirname(filePath);
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
 * Merge scraped item data with existing curated data
 * Preserves: English translations, downloadVerifiedAt, image paths, and other curated fields
 * Updates: Japanese data from fresh scrape, adds new fields
 */
function mergeItemData(scraped: Item, existing: Record<string, unknown>): Item {
	const merged = { ...scraped };

	// Preserve English name only if scraped doesn't have one (global site content takes precedence)
	const existingName = existing["name"];
	if (!scraped.name.en && existingName && typeof existingName === "object" && "en" in existingName) {
		merged.name = { ...scraped.name, en: (existingName as { en?: string }).en };
	}

	// Preserve English translations in description (still uses LocalizedTextArray format)
	const existingDesc = existing["description"];
	const scrapedDesc = scraped.description;
	const scrapedDescHasEn = scrapedDesc && typeof scrapedDesc === "object" && "en" in scrapedDesc;
	if (!scrapedDescHasEn && existingDesc && typeof existingDesc === "object" && "en" in existingDesc && scrapedDesc) {
		(merged.description as { ja: string[]; en?: string[] }).en = (existingDesc as { en?: string[] }).en;
	}

	// Preserve English names and units in accessories/contents arrays (ParsedAccessoryItem[] format)
	interface ExistingAccessoryItem { name: { ja: string; en?: string }; count?: number; unit?: { ja: string; en?: string } }
	const existingAccessoriesArr = existing["accessories"];
	if (scraped.accessories && Array.isArray(existingAccessoriesArr)) {
		const existingAccessories = existingAccessoriesArr as ExistingAccessoryItem[];
		// Check if scraped already has EN in any item
		const scrapedHasEn = scraped.accessories.some(item => item.name.en);
		if (!scrapedHasEn) {
			// Merge existing EN names and units by position
			merged.accessories = scraped.accessories.map((item, index) => {
				const existingItem = existingAccessories[index];
				const existingNameEn = existingItem?.name.en;
				const existingUnitEn = existingItem?.unit?.en;
				if (existingNameEn || existingUnitEn) {
					return {
						...item,
						name: existingNameEn ? { ...item.name, en: existingNameEn } : item.name,
						unit: existingUnitEn && item.unit ? { ...item.unit, en: existingUnitEn } : item.unit,
					};
				}
				return item;
			});
		}
	}
	const existingContentsArr = existing["contents"];
	if (scraped.contents && Array.isArray(existingContentsArr)) {
		const existingContents = existingContentsArr as ExistingAccessoryItem[];
		const scrapedHasEn = scraped.contents.some(item => item.name.en);
		if (!scrapedHasEn) {
			merged.contents = scraped.contents.map((item, index) => {
				const existingItem = existingContents[index];
				const existingNameEn = existingItem?.name.en;
				const existingUnitEn = existingItem?.unit?.en;
				if (existingNameEn || existingUnitEn) {
					return {
						...item,
						name: existingNameEn ? { ...item.name, en: existingNameEn } : item.name,
						unit: existingUnitEn && item.unit ? { ...item.unit, en: existingUnitEn } : item.unit,
					};
				}
				return item;
			});
		}
	}

	// Preserve English translations in entity refs (brands, series, categories)
	// Build maps of existing English translations by ID
	const existingBrandsEn = new Map<string, string>();
	const existingSeriesEn = new Map<string, string>();
	const existingCategoriesEn = new Map<string, string>();

	interface EntityWithEn { id: string; en?: string }
	if (Array.isArray(existing.brands)) {
		for (const b of existing.brands as EntityWithEn[]) {
			if (b.en) existingBrandsEn.set(b.id, b.en);
		}
	}
	if (Array.isArray(existing.series)) {
		for (const s of existing.series as EntityWithEn[]) {
			if (s.en) existingSeriesEn.set(s.id, s.en);
		}
	}
	if (Array.isArray(existing.categories)) {
		for (const c of existing.categories as EntityWithEn[]) {
			if (c.en) existingCategoriesEn.set(c.id, c.en);
		}
	}

	// Merge English translations into scraped refs
	if (existingBrandsEn.size > 0) {
		merged.brands = scraped.brands.map(b =>
			existingBrandsEn.has(b.id) ? { ...b, en: existingBrandsEn.get(b.id) } : b,
		);
	}
	if (existingSeriesEn.size > 0) {
		merged.series = scraped.series.map(s =>
			existingSeriesEn.has(s.id) ? { ...s, en: existingSeriesEn.get(s.id) } : s,
		);
	}
	if (existingCategoriesEn.size > 0) {
		merged.categories = scraped.categories.map(c =>
			existingCategoriesEn.has(c.id) ? { ...c, en: existingCategoriesEn.get(c.id) } : c,
		);
	}

	// Preserve English translations for related items
	const existingRelatedEn = new Map<string, string>();
	if (Array.isArray(existing.relatedItems)) {
		for (const r of existing.relatedItems as EntityWithEn[]) {
			if (r.en) existingRelatedEn.set(r.id, r.en);
		}
	}
	if (existingRelatedEn.size > 0) {
		merged.relatedItems = scraped.relatedItems.map(r =>
			existingRelatedEn.has(r.id) ? { ...r, en: existingRelatedEn.get(r.id) } : r,
		);
	}

	// Preserve manual info: handle old manualId format and preserve if scrape didn't find it
	if (!scraped.manual && existing.manualId) {
		// Convert old manualId string to new ManualRef format
		const oldManualId = existing.manualId as string;
		merged.manual = {
			id: oldManualId,
			url: `https://manual.bandai-hobby.net/menus/detail/${oldManualId}`,
		};
	} else if (!scraped.manual && existing.manual && typeof existing.manual === "object") {
		// Preserve existing manual ref if scrape didn't find one
		merged.manual = existing.manual as typeof merged.manual;
	}

	// Preserve download verification timestamp
	if (existing.downloadVerifiedAt) {
		(merged as Record<string, unknown>).downloadVerifiedAt = existing.downloadVerifiedAt;
	}

	// Preserve existing globalSiteUrls if scrape didn't find any (or merge them)
	if (existing.globalSiteUrls && typeof existing.globalSiteUrls === "object") {
		merged.globalSiteUrls = scraped.globalSiteUrls
			? { ...(existing.globalSiteUrls as typeof merged.globalSiteUrls), ...scraped.globalSiteUrls }
			: (existing.globalSiteUrls as typeof merged.globalSiteUrls);
	}

	// Merge images: preserve local paths from existing, update source URLs from scrape
	if (scraped.images && existing.images) {
		const existingImages = existing.images;

		// Collect existing local paths (strings starting with /images/)
		const existingLocalPaths: string[] = [];

		if (Array.isArray(existingImages)) {
			// Old format: flat array of strings like "/images/items/01_7017/01_7017_0.jpg"
			for (const img of existingImages) {
				const imgPath = typeof img === "string" ? img : (img as { path?: string }).path;
				if (imgPath?.startsWith("/images/")) {
					existingLocalPaths.push(imgPath);
				}
			}
		} else if (typeof existingImages === "object") {
			// New format: { product: [{src, path?}], instructions: [{src, path?}] }
			const imgObj = existingImages as { product?: unknown[]; instructions?: unknown[] };
			for (const img of imgObj.product ?? []) {
				const imgPath = typeof img === "string" ? img : (img as { path?: string }).path;
				if (imgPath?.startsWith("/images/")) {
					existingLocalPaths.push(imgPath);
				}
			}
			for (const img of imgObj.instructions ?? []) {
				const imgPath = typeof img === "string" ? img : (img as { path?: string }).path;
				if (imgPath?.startsWith("/images/")) {
					existingLocalPaths.push(imgPath);
				}
			}
		}

		// Merge local paths into scraped images by position
		if (existingLocalPaths.length > 0) {
			let pathIndex = 0;
			merged.images = {
				product: scraped.images.product.map(img => {
					if (pathIndex < existingLocalPaths.length) {
						return { ...img, path: existingLocalPaths[pathIndex++] };
					}
					return img;
				}),
				instructions: scraped.images.instructions.map(img => {
					if (pathIndex < existingLocalPaths.length) {
						return { ...img, path: existingLocalPaths[pathIndex++] };
					}
					return img;
				}),
			};
		}
	}

	return merged;
}

/**
 * Check if a URL is ephemeral (will expire and shouldn't be persisted)
 */
function isEphemeralUrl(url: string): boolean {
	return url.includes("cloudfront.net") || url.includes("akamaized.net");
}

/**
 * Strip ephemeral src from an image object
 */
function stripEphemeralSrc(img: { src?: string; path?: string }): { src?: string; path?: string } {
	if (img.src && isEphemeralUrl(img.src)) {
		return img.path ? { path: img.path } : {};
	}
	return img;
}

/**
 * Strip ephemeral URLs from images before persisting
 * Keeps only the local path, removes src for CDN URLs that will expire
 */
function stripEphemeralImageUrls(item: Item): Item {
	if (!item.images) return item;

	const cleanImages = {
		product: item.images.product.map((img) => stripEphemeralSrc(img)),
		instructions: item.images.instructions.map((img) => stripEphemeralSrc(img)),
	};

	return { ...item, images: cleanImages };
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
		const title = titleMatch?.[1] ?? "";

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

/** Content extracted from global (English) site */
interface GlobalSiteContent {
	urls: GlobalSiteUrls;
	/** English name from the US site */
	enName?: string;
	/** English description lines from the US site */
	enDescription?: string[];
	/** English accessories from the US site */
	enAccessories?: string[];
	/** English contents from the US site */
	enContents?: string[];
}

/** Section markers used in global site content */
const ACCESSORIES_MARKERS = ["[accessories]"];
const CONTENTS_MARKERS = ["【product details】"];

/**
 * Split global site content into description, accessories, and contents sections.
 * Handles markers that appear either on their own line or at the end of a line.
 */
function splitGlobalSiteContent(lines: string[]): {
	description: string[];
	accessories: string[];
	contents: string[];
} {
	const description: string[] = [];
	const accessories: string[] = [];
	const contents: string[] = [];

	let currentSection: "description" | "accessories" | "contents" = "description";

	for (const line of lines) {
		const lineLower = line.toLowerCase();

		// Check if line contains a section marker
		let accessoriesPos = -1;
		let contentsPos = -1;

		for (const marker of ACCESSORIES_MARKERS) {
			const pos = lineLower.indexOf(marker);
			if (pos !== -1 && (accessoriesPos === -1 || pos < accessoriesPos)) {
				accessoriesPos = pos;
			}
		}

		for (const marker of CONTENTS_MARKERS) {
			const pos = lineLower.indexOf(marker);
			if (pos !== -1 && (contentsPos === -1 || pos < contentsPos)) {
				contentsPos = pos;
			}
		}

		// If line has markers, split it
		if (accessoriesPos !== -1 || contentsPos !== -1) {
			// Determine order of markers
			const markers: Array<{ type: "accessories" | "contents"; pos: number }> = [];
			if (accessoriesPos !== -1) markers.push({ type: "accessories", pos: accessoriesPos });
			if (contentsPos !== -1) markers.push({ type: "contents", pos: contentsPos });
			markers.sort((a, b) => a.pos - b.pos);

			let lastPos = 0;
			for (const marker of markers) {
				// Text before marker goes to current section
				const textBefore = line.slice(lastPos, marker.pos).trim();
				if (textBefore) {
					if (currentSection === "description") description.push(textBefore);
					else if (currentSection === "accessories") accessories.push(textBefore);
					else contents.push(textBefore);
				}

				// Find end of marker
				const markerText = marker.type === "accessories"
					? ACCESSORIES_MARKERS.find(m => lineLower.indexOf(m, marker.pos) === marker.pos)
					: CONTENTS_MARKERS.find(m => lineLower.indexOf(m, marker.pos) === marker.pos);
				lastPos = marker.pos + (markerText?.length ?? 0);
				currentSection = marker.type;
			}

			// Text after last marker goes to that section
			const textAfter = line.slice(lastPos).trim();
			if (textAfter) {
				if (currentSection === "accessories") accessories.push(textAfter);
				else if (currentSection === "contents") contents.push(textAfter);
			}
		} else {
			// No markers, add to current section
			if (currentSection === "description") description.push(line);
			else if (currentSection === "accessories") accessories.push(line);
			else contents.push(line);
		}
	}

	return { description, accessories, contents };
}

/**
 * Merge parsed EN items into existing JA parsed items by position.
 * Adds the EN name and unit to each item's localized fields.
 */
function mergeEnIntoAccessories(
	jaItems: ParsedAccessoryItem[],
	enStrings: string[],
): ParsedAccessoryItem[] {
	// Parse EN strings to extract names and counts
	const enParsed = parseCountedItems(enStrings);

	// Merge by position
	return jaItems.map((jaItem, index) => {
		const enItem = enParsed[index];
		if (enItem) {
			const merged: ParsedAccessoryItem = {
				...jaItem,
				name: {
					ja: jaItem.name.ja,
					en: normalizeText(enItem.name),
				},
			};
			// Merge EN unit if present
			if (enItem.unit) {
				merged.unit = {
					ja: jaItem.unit?.ja ?? enItem.unit,  // Fallback to EN if JA missing
					en: enItem.unit,
				};
			}
			return merged;
		}
		return jaItem;
	});
}

/**
 * Fetch and parse English content from the global US site
 * Returns name, description, and accessories if the page exists
 */
async function fetchGlobalSiteContent(itemId: string, parser: BandaiCatalogParser): Promise<GlobalSiteContent | undefined> {
	const enUsUrl = `https://global.bandai-hobby.net/en-us/item/${itemId}/`;

	// Check if US page exists
	const usCheck = await quickCheckUrl(enUsUrl);
	if (!usCheck.isValid) {
		return undefined;
	}

	// US page exists - fetch full content
	try {
		const response = await fetch(enUsUrl, {
			headers: { "User-Agent": USER_AGENT },
		});

		if (!response.ok) {
			return { urls: { enUs: enUsUrl } };
		}

		const html = await response.text();

		// Use the parser to extract content (it will get Japanese fields, but we just want structure)
		const parseResult = parser.parse(html, itemId, enUsUrl);

		if (!parseResult.success || !parseResult.data) {
			return { urls: { enUs: enUsUrl } };
		}

		// The parser extracts to .ja fields, but for EN site they contain English
		// Global site embeds accessories/contents in description with section markers
		const rawDescription = parseResult.data.description?.ja ?? [];

		// Split into sections based on markers like [Accessories], [Product details], etc.
		const sections = splitGlobalSiteContent(rawDescription);

		const result: GlobalSiteContent = {
			urls: { enUs: enUsUrl },
			enName: parseResult.data.name.ja,
			enDescription: sections.description.length > 0 ? sections.description : undefined,
			enAccessories: sections.accessories.length > 0 ? sections.accessories : undefined,
			enContents: sections.contents.length > 0 ? sections.contents : undefined,
		};

		return result;
	} catch {
		// Network error - return just the URL
		return { urls: { enUs: enUsUrl } };
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
				errors.push(result.error ?? `${range}: Unknown error`);
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
		const translationCacheDir = path.join(options.outputDir, "..", "translations");
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

					const productName = catalogResult.success && catalogResult.data?.name.ja
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
						writeFile(path.join(options.outputDir, `${paddedRange}.html`), processResult.data.html, "utf8"),
					];

					if (catalogResult.success && catalogResult.data) {
						// Upsert entities (brands, series, categories) to data/src/
						// outputDir is typically data/src/items, so parent is data/src/
						if (catalogResult.entities && catalogResult.entities.length > 0) {
							const dataDir = path.dirname(options.outputDir);
							await upsertEntities(catalogResult.entities, dataDir, options.verbose);
						}

						// Translate if translation is enabled
						if (catalogTranslator) {
							try {
								const translateResult = await catalogTranslator.translateItem(catalogResult.data);
								if (translateResult.translated && options.verbose) {
									console.log(`    🌐 Translated ${translateResult.fieldsTranslated} fields`);
								}
							} catch (translateError: unknown) {
								// Log translation error but don't fail the scrape
								if (options.verbose) {
									console.warn(`    ⚠️ Translation failed: ${String(translateError)}`);
								}
							}
						}

						// Check for global site pages and fetch English content
						try {
							const globalContent = await fetchGlobalSiteContent(range, catalogParser);
							if (globalContent) {
								catalogResult.data.globalSiteUrls = globalContent.urls;

								// Apply official English content from global site (normalized)
								if (globalContent.enName) {
									catalogResult.data.name.en = normalizeText(globalContent.enName);
								}
								if (globalContent.enDescription) {
									catalogResult.data.description ??= { ja: [] };
									catalogResult.data.description.en = globalContent.enDescription.map((line) => normalizeText(line));
								}
								// Merge EN accessories/contents into parsed items
								if (globalContent.enAccessories && catalogResult.data.accessories) {
									catalogResult.data.accessories = mergeEnIntoAccessories(
										catalogResult.data.accessories,
										globalContent.enAccessories,
									);
								}
								if (globalContent.enContents && catalogResult.data.contents) {
									catalogResult.data.contents = mergeEnIntoAccessories(
										catalogResult.data.contents,
										globalContent.enContents,
									);
								}

								if (options.verbose) {
									const sites = Object.keys(globalContent.urls).join(", ");
									const hasContent = globalContent.enName ? " + EN content" : "";
									console.log(`    🌍 Global pages: ${sites}${hasContent}`);
								}
							}
						} catch (globalError: unknown) {
							// Log error but don't fail the scrape
							if (options.verbose) {
								console.warn(`    ⚠️ Global site check failed: ${String(globalError)}`);
							}
						}

						// Normalize JA content (fix bullet characters, etc.)
						if (catalogResult.data.name.ja) {
							catalogResult.data.name.ja = normalizeText(catalogResult.data.name.ja);
						}
						if (catalogResult.data.description?.ja) {
							catalogResult.data.description.ja = catalogResult.data.description.ja.map((line) => normalizeText(line));
						}
						// Normalize JA names in accessories/contents arrays
						if (catalogResult.data.accessories) {
							catalogResult.data.accessories = catalogResult.data.accessories.map((item) => ({
								...item,
								name: { ...item.name, ja: normalizeText(item.name.ja) },
							}));
						}
						if (catalogResult.data.contents) {
							catalogResult.data.contents = catalogResult.data.contents.map((item) => ({
								...item,
								name: { ...item.name, ja: normalizeText(item.name.ja) },
							}));
						}

						// Merge with existing data to preserve curated fields (EN translations, manualId, etc.)
						const itemPath = path.join(options.outputDir, `${paddedRange}.json`);
						const existingItem = await readExistingItem(itemPath);
						const mergedItem = existingItem
							? mergeItemData(catalogResult.data, existingItem)
							: catalogResult.data;

						// Strip ephemeral CDN URLs before persisting
						const finalItem = stripEphemeralImageUrls(mergedItem);

						writePromises.push(
							writeFile(itemPath, JSON.stringify(finalItem, null, "\t"), "utf8"),
						);
					}

					await Promise.all(writePromises);

					completedCount++;
					console.log(`  [${completedCount}/${total}] ✅ ${range} - ${productName}`);
				} else {
					const errorMsg = processResult.error ?? `${range}: Download failed`;
					result.errors.push(errorMsg);
					completedCount++;
					console.log(`  [${completedCount}/${total}] ❌ ${range} - Failed: ${errorMsg}`);
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