/**
 * Data merging operations for scrape command
 *
 * Handles merging of scraped data with existing JSON files to preserve:
 * - Local image paths
 * - English translations
 * - Global site URLs
 * - Entity metadata
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { writeJsonIfChanged } from "../../utils/file-utils.js";
import { stripEphemeralImageUrls } from "../../utils/image-utils.js";
import type { EntityData, Item, ItemImage, ParsedAccessoryItem } from "../bandai-catalog-parser.js";
import { parseCountedItems } from "../count-parser.js";
import type { GlobalSiteData } from "../global-site-lookup.js";
import type { ManualData } from "../manual-parser.js";

import {
	BRANDS_DATA_DIR,
	SERIES_DATA_DIR,
	CATEGORIES_DATA_DIR,
} from "./types.js";

// ============================================================================
// Item Data Merging
// ============================================================================

/**
 * Save item data to JSON file
 * Note: Timing fields (extractedAt, pageScrapedAt) are stored in the
 * centralized index.json, not in individual item files
 */
export async function saveItemJson(filePath: string, data: Item): Promise<boolean> {
	// Merge with existing data to preserve local image paths
	const mergedData = await mergeWithExistingItem(filePath, data);

	// Strip ephemeral URLs before saving (CloudFront signed URLs expire)
	const outputData: Record<string, unknown> = { ...mergedData };
	if (mergedData.images && "product" in mergedData.images) {
		outputData["images"] = stripEphemeralImageUrls(mergedData.images);
	}

	return writeJsonIfChanged(filePath, outputData);
}

/**
 * Merge new item data with existing file to preserve local image paths
 * and fields established through other means (hash matching, manual linking)
 */
export async function mergeWithExistingItem(filePath: string, newData: Item): Promise<Item> {
	try {
		const existingContent = await fs.readFile(filePath, "utf8");
		const existingItem = JSON.parse(existingContent) as Item;

		// Merge image paths from existing data
		if (existingItem.images && newData.images) {
			newData.images = mergeImagePaths(newData.images, existingItem.images);
		}

		// Preserve globalSiteUrls if global lookup failed but existing data has it
		if (existingItem.globalSiteUrls && !newData.globalSiteUrls) {
			newData.globalSiteUrls = existingItem.globalSiteUrls;
		}

		// Preserve manual reference if not found in new scrape
		// (may have been established via image hash matching or other means)
		if (existingItem.manual && !newData.manual) {
			newData.manual = existingItem.manual;
		}

		// Preserve pbandaiIds if not in new scrape
		// (established via image hash matching with P-Bandai items)
		const existingRecord = existingItem as Record<string, unknown>;
		const newRecord = newData as Record<string, unknown>;
		if (existingRecord["pbandaiIds"] && !newRecord["pbandaiIds"]) {
			newRecord["pbandaiIds"] = existingRecord["pbandaiIds"];
		}

		// Preserve English translations if new scrape doesn't have them
		// (translations come from global site lookup or fallback translator)
		if (existingItem.name.en && !newData.name.en) {
			newData.name.en = existingItem.name.en;
		}
		if (existingItem.description?.en && !newData.description?.en) {
			if (newData.description) {
				newData.description.en = existingItem.description.en;
			} else {
				newData.description = { ja: [], en: existingItem.description.en };
			}
		}

		// Preserve English translations in brands array
		// Prefer existing translations over page-extracted values (which are often worse)
		for (const brand of newData.brands) {
			const existingBrand = existingItem.brands.find(b => b.ja === brand.ja || b.id === brand.id);
			if (existingBrand?.en) {
				brand.en = existingBrand.en;
			}
		}

		// Preserve English translations in series array
		for (const series of newData.series) {
			const existingSeries = existingItem.series.find(s => s.ja === series.ja || s.id === series.id);
			if (existingSeries?.en) {
				series.en = existingSeries.en;
			}
		}

		// Preserve English translations in categories array
		for (const category of newData.categories) {
			const existingCategory = existingItem.categories.find(c => c.ja === category.ja || c.id === category.id);
			if (existingCategory?.en) {
				category.en = existingCategory.en;
			}
		}

		// Preserve English translations in relatedItems array
		for (const related of newData.relatedItems) {
			const existingRelated = existingItem.relatedItems.find(r => r.id === related.id);
			if (existingRelated?.en) {
				related.en = existingRelated.en;
			}
		}

		// Preserve English translations in accessories
		if (existingItem.accessories && newData.accessories) {
			for (const accessory of newData.accessories) {
				const existingAcc = existingItem.accessories.find(a => a.name.ja === accessory.name.ja);
				if (existingAcc?.name.en && !accessory.name.en) {
					accessory.name.en = existingAcc.name.en;
				}
			}
		}

		return newData;
	} catch {
		// File doesn't exist or can't be read, use new data as-is
		return newData;
	}
}

/**
 * Merge local paths from existing images into new images
 * Matches images by src URL to preserve downloaded paths
 */
function mergeImagePaths(newImages: Item["images"], existingImages: Item["images"]): Item["images"] {
	if (!newImages || !existingImages) return newImages;

	// Build a map of src -> path from existing images
	const pathMap = new Map<string, string>();
	for (const img of existingImages.product) {
		if (img.src && img.path) {
			pathMap.set(img.src, img.path);
		}
	}
	for (const img of existingImages.instructions) {
		if (img.src && img.path) {
			pathMap.set(img.src, img.path);
		}
	}

	// Apply existing paths to new images
	const mergeArray = (images: ItemImage[]): ItemImage[] => {
		return images.map((img) => {
			if (img.src && !img.path) {
				const existingPath = pathMap.get(img.src);
				if (existingPath) {
					return { ...img, path: existingPath };
				}
			}
			return img;
		});
	};

	return {
		product: mergeArray(newImages.product),
		instructions: mergeArray(newImages.instructions),
	};
}

// ============================================================================
// Manual Data Merging
// ============================================================================

/**
 * Save manual data to JSON file, merging with existing data to preserve translations
 */
export async function saveManualJson(filePath: string, data: ManualData): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true });

	// Merge with existing data to preserve English translations and metadata
	const mergedData = await mergeWithExistingManual(filePath, data);

	await fs.writeFile(filePath, JSON.stringify(mergedData, null, "\t"), "utf8");
}

/**
 * Merge new manual data with existing file to preserve translations and metadata
 */
export async function mergeWithExistingManual(filePath: string, newData: ManualData): Promise<ManualData> {
	try {
		const existingContent = await fs.readFile(filePath, "utf8");
		const existing = JSON.parse(existingContent) as Record<string, unknown>;

		// Preserve English name if not in new data
		if (existing["name"] && typeof existing["name"] === "object") {
			const existingName = existing["name"] as Record<string, string>;
			if (existingName["en"] && !newData.name.en) {
				newData.name.en = existingName["en"];
			}
		}

		// Preserve English PDF names
		if (existing["pdfs"] && Array.isArray(existing["pdfs"])) {
			for (let i = 0; i < newData.pdfs.length; i++) {
				const existingPdf = existing["pdfs"][i] as Record<string, unknown> | undefined;
				if (existingPdf?.["name"] && typeof existingPdf["name"] === "object") {
					const existingPdfName = existingPdf["name"] as Record<string, string>;
					const currentPdf = newData.pdfs[i];
					if (existingPdfName["en"] && currentPdf && !currentPdf.name.en) {
						currentPdf.name.en = existingPdfName["en"];
					}
				}
			}
		}

		// Preserve English brand/series translations
		if (existing["brand"] && typeof existing["brand"] === "object") {
			const existingBrand = existing["brand"] as Record<string, unknown>;
			if (existingBrand["en"] && newData.brand && !newData.brand.en) {
				newData.brand.en = existingBrand["en"] as string;
			}
		}
		if (existing["series"] && typeof existing["series"] === "object") {
			const existingSeries = existing["series"] as Record<string, unknown>;
			if (existingSeries["en"] && newData.series && !newData.series.en) {
				newData.series.en = existingSeries["en"] as string;
			}
		}

		// NOTE: We intentionally do NOT preserve image from existing JSON.
		// Image should come from HTML parsing OR from files on disk.
		// The downloadManualImage() function handles finding images on disk.

		// Preserve items from existing data and merge with new ones
		if (existing["items"] && Array.isArray(existing["items"])) {
			const existingItems = existing["items"] as Array<{ id: string; url: string }>;
			const newItems = newData.items ?? [];
			// Merge and dedupe by ID
			const itemMap = new Map<string, { id: string; url: string }>();
			for (const item of existingItems) {
				itemMap.set(item.id, item);
			}
			for (const item of newItems) {
				itemMap.set(item.id, item);
			}
			if (itemMap.size > 0) {
				newData.items = [...itemMap.values()];
			}
		}

		// Preserve pbandaiUs from existing data and merge with new ones
		if (existing["pbandaiUs"] && Array.isArray(existing["pbandaiUs"])) {
			const existingPBandai = existing["pbandaiUs"] as Array<{ id: string; url: string }>;
			const newPBandai = newData.pbandaiUs ?? [];
			// Merge and dedupe by ID
			const pbandaiMap = new Map<string, { id: string; url: string }>();
			for (const item of existingPBandai) {
				pbandaiMap.set(item.id, item);
			}
			for (const item of newPBandai) {
				pbandaiMap.set(item.id, item);
			}
			if (pbandaiMap.size > 0) {
				newData.pbandaiUs = [...pbandaiMap.values()];
			}
		}

		return newData;
	} catch {
		// File doesn't exist or can't be read, use new data as-is
		return newData;
	}
}

// ============================================================================
// Translation Merging
// ============================================================================

/**
 * Merge English translation data into Item
 * Updates name.en, description.en, brands[].en, series[].en, accessories[].name.en, and globalSiteUrls
 */
export function mergeEnglishTranslation(item: Item, globalData: GlobalSiteData): Item {
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
		item.accessories = mergeEnglishAccessories(item.accessories, globalData.accessories);
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
export function mergeEnglishAccessories(
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

// ============================================================================
// Entity Data Merging
// ============================================================================

/**
 * Upsert entities (brands, series, categories) - only creates new ones
 * Preserves all existing fields in entity files
 * @returns Number of new entities created
 */
export async function upsertEntities(entities: EntityData[]): Promise<number> {
	let newCount = 0;

	for (const entity of entities) {
		const dir = getEntityDir(entity.type);
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
export function getEntityDir(type: "brand" | "series" | "category"): string {
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
