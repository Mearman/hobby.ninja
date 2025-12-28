#!/usr/bin/env node

/**
 * Enhanced image cleaner that removes incorrectly sized images AND updates JSON data files
 * to remove references to deleted images, maintaining data integrity.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// Configuration
const THUMBNAIL_MAX_SIZE = 300;
const SMALL_SQUARE_MAX_SIZE = 250;
const PREVIEW_ASPECT_RATIOS = [
	{ width: 200, height: 200 },
	{ width: 150, height: 150 },
	{ width: 100, height: 100 },
];

const DATA_DIR = "apps/next/public/data/items";
const IMAGES_DIR = "apps/next/public/images/items";

interface ImageInfo {
  path: string;
  itemId: string;
  imageNumber: number;
  width: number;
  height: number;
  size: number;
  isThumbnail: boolean;
  isPreview: boolean;
}

interface ManualEntry {
  images?: string[];
  [key: string]: unknown;
}

interface ItemData {
  id: string;
  images?: string[];
  gallery?: string[];
  manuals?: ManualEntry[];
  [key: string]: unknown;
}

interface UpdateResults {
  itemsUpdated: number;
  imagesRemovedFromJson: number;
  jsonErrors: string[];
  itemsWithMissingImages: string[];
}

/**
 * Extract image dimensions from file headers
 */
async function getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
	try {
		const buffer = await fs.readFile(filePath);

		// JPEG format check
		if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
			let offset = 2;
			while (offset < buffer.length) {
				if (buffer[offset] !== 0xFF) return null;
				const marker = buffer[offset + 1];
				offset += 2;

				if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
            (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
					const height = (buffer[offset + 3] << 8) | buffer[offset + 4];
					const width = (buffer[offset + 5] << 8) | buffer[offset + 6];
					return { width, height };
				}

				const segmentLength = (buffer[offset] << 8) | buffer[offset + 1];
				offset += segmentLength;
			}
		}

		// PNG format check
		if (buffer.toString("ascii", 1, 8) === "PNG\r\n\u001A\n") {
			const width = (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19];
			const height = (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];
			return { width, height };
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Parse filename to extract item ID and image number
 */
function parseImageFilename(filename: string): { itemId: string; imageNumber: number } | null {
	const match = /^(\d{2}_\d{4})_(\d+)\.(jpg|jpeg|png|webp)$/i.exec(filename);
	if (!match) return null;

	return {
		itemId: match[1],
		imageNumber: Number.parseInt(match[2], 10),
	};
}

/**
 * Classify image based on dimensions
 */
function classifyImage(width: number, height: number): { isThumbnail: boolean; isPreview: boolean } {
	const isThumbnail = width <= THUMBNAIL_MAX_SIZE && height <= THUMBNAIL_MAX_SIZE;
	const isPreview = PREVIEW_ASPECT_RATIOS.some(ratio =>
		width === ratio.width && height === ratio.height,
	);
	const isSmallSquare = width === height && width <= SMALL_SQUARE_MAX_SIZE;

	return { isThumbnail, isPreview: isPreview || isSmallSquare };
}

/**
 * Scan for incorrect images
 */
async function scanIncorrectImages(directory: string): Promise<ImageInfo[]> {
	const incorrectImages: ImageInfo[] = [];

	try {
		const entries = await fs.readdir(directory, { withFileTypes: true });
		const imageFiles = entries
			.filter(e => e.isFile())
			.filter(e => /\.(jpg|jpeg|png|webp)$/i.test(e.name))
			.map(e => e.name);

		for (const filename of imageFiles) {
			const filePath = path.join(directory, filename);

			try {
				const parsed = parseImageFilename(filename);
				if (!parsed) continue; // Skip instruction images or other formats

				const stats = await fs.stat(filePath);
				const dimensions = await getImageDimensions(filePath);

				if (!dimensions) continue;

				const { isThumbnail, isPreview } = classifyImage(dimensions.width, dimensions.height);

				if (isThumbnail || isPreview) {
					incorrectImages.push({
						path: filePath,
						itemId: parsed.itemId,
						imageNumber: parsed.imageNumber,
						width: dimensions.width,
						height: dimensions.height,
						size: stats.size,
						isThumbnail,
						isPreview,
					});
				}
			} catch {
				// Skip errors for individual files
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Error scanning directory: ${message}`);
	}

	return incorrectImages;
}

/**
 * Type guard to check if value is ItemData
 */
function isItemData(value: unknown): value is ItemData {
	return typeof value === "object" && value !== null && "id" in value && typeof (value as ItemData).id === "string";
}

/**
 * Load and parse JSON item data
 */
async function loadItemData(itemId: string): Promise<ItemData | null> {
	try {
		const jsonPath = path.join(DATA_DIR, itemId, `${itemId}.json`);
		const content = await fs.readFile(jsonPath, "utf8");
		const parsed: unknown = JSON.parse(content);
		if (isItemData(parsed)) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Save updated JSON item data
 */
async function saveItemData(itemId: string, data: ItemData): Promise<boolean> {
	try {
		const jsonPath = path.join(DATA_DIR, itemId, `${itemId}.json`);
		await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), "utf8");
		return true;
	} catch {
		return false;
	}
}

/**
 * Remove image references from JSON data
 */
function removeImageReference(data: ItemData, imageNumber: number): { removed: number; updated: boolean } {
	let removed = 0;
	let updated = false;

	const imagePattern = `${data.id}_${imageNumber}`;

	// Remove from main images array
	if (data.images && Array.isArray(data.images)) {
		const originalLength = data.images.length;
		data.images = data.images.filter((img: string) => {
			// Remove if it's the specific image or if it references a file that no longer exists
			return !img.includes(imagePattern) && img.endsWith(".jpg");
		});
		removed += originalLength - data.images.length;
		if (originalLength !== data.images.length) updated = true;
	}

	// Remove from gallery array
	if (data.gallery && Array.isArray(data.gallery)) {
		const originalLength = data.gallery.length;
		data.gallery = data.gallery.filter((img: string) => {
			return !img.includes(imagePattern) && img.endsWith(".jpg");
		});
		removed += originalLength - data.gallery.length;
		if (originalLength !== data.gallery.length) updated = true;
	}

	// Remove from manual images
	if (data.manuals && Array.isArray(data.manuals)) {
		for (const manual of data.manuals) {
			if (manual.images && Array.isArray(manual.images)) {
				const originalLength = manual.images.length;
				manual.images = manual.images.filter((img: string) => {
					return !img.includes(imagePattern) && img.endsWith(".jpg");
				});
				removed += originalLength - manual.images.length;
				if (originalLength !== manual.images.length) updated = true;
			}
		}
	}

	// Remove from any other image arrays
	const imageArrayKeys = Object.keys(data).filter(key => {
		const value = data[key];
		return Array.isArray(value) &&
			(key.includes("image") || key.includes("photo") || key.includes("picture"));
	});

	for (const key of imageArrayKeys) {
		const value = data[key];
		if (!Array.isArray(value)) continue;
		const array = value as string[];
		const originalLength = array.length;
		const filtered = array.filter((img: string) => {
			return !img.includes(imagePattern) && img.endsWith(".jpg");
		});
		data[key] = filtered;
		removed += originalLength - filtered.length;
		if (originalLength !== filtered.length) updated = true;
	}

	return { removed, updated };
}

/**
 * Update JSON files to remove references to deleted images
 */
async function updateJsonFiles(incorrectImages: ImageInfo[]): Promise<UpdateResults> {
	const results: UpdateResults = {
		itemsUpdated: 0,
		imagesRemovedFromJson: 0,
		jsonErrors: [],
		itemsWithMissingImages: [],
	};

	// Group incorrect images by item ID
	const imagesByItem = new Map<string, ImageInfo[]>();
	for (const img of incorrectImages) {
		const existing = imagesByItem.get(img.itemId);
		if (existing) {
			existing.push(img);
		} else {
			imagesByItem.set(img.itemId, [img]);
		}
	}

	console.log(`\n📝 Updating JSON files for ${imagesByItem.size} items...`);

	// Process each item's JSON file
	for (const [itemId, itemImages] of imagesByItem.entries()) {
		try {
			const data = await loadItemData(itemId);
			if (!data) {
				results.jsonErrors.push(`Could not load JSON for item ${itemId}`);
				continue;
			}

			let itemUpdated = false;
			let totalRemoved = 0;

			// Remove references to each incorrect image
			for (const img of itemImages) {
				const { removed, updated } = removeImageReference(data, img.imageNumber);
				totalRemoved += removed;
				if (updated) itemUpdated = true;
			}

			// Save the updated data if changes were made
			if (itemUpdated) {
				const saved = await saveItemData(itemId, data);
				if (saved) {
					results.itemsUpdated++;
					results.imagesRemovedFromJson += totalRemoved;
					console.log(`  ✅ Updated ${itemId}: removed ${totalRemoved} image references`);
				} else {
					results.jsonErrors.push(`Failed to save JSON for item ${itemId}`);
				}
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			results.jsonErrors.push(`Error processing ${itemId}: ${message}`);
		}
	}

	// Check for items with missing image files but JSON references
	try {
		const itemDirs = await fs.readdir(DATA_DIR, { withFileTypes: true });
		const itemIds = itemDirs
			.filter(e => e.isDirectory())
			.map(e => e.name);

		for (const itemId of itemIds) {
			try {
				const data = await loadItemData(itemId);
				if (!data) continue;

				const missingImages: string[] = [];

				// Check images array
				if (data.images && Array.isArray(data.images)) {
					for (const imgPath of data.images) {
						if (typeof imgPath === "string" && imgPath.endsWith(".jpg")) {
							const fullImagePath = path.join(IMAGES_DIR, imgPath);
							try {
								await fs.access(fullImagePath);
							} catch {
								missingImages.push(imgPath);
							}
						}
					}
				}

				if (missingImages.length > 0) {
					results.itemsWithMissingImages.push(itemId);
					console.log(`  ⚠️  Item ${itemId} has ${missingImages.length} missing image references`);
				}
			} catch {
				// Skip individual errors
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.log(`Could not check for missing images: ${message}`);
	}

	return results;
}

/**
 * Remove the actual image files
 */
async function removeImageFiles(images: ImageInfo[]): Promise<{ deleted: number; errors: string[] }> {
	let deleted = 0;
	const errors: string[] = [];

	for (const img of images) {
		try {
			await fs.unlink(img.path);
			deleted++;
			console.log(`  🗑️  Deleted: ${path.basename(img.path)} (${img.width}x${img.height})`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			errors.push(`${path.basename(img.path)}: ${message}`);
		}
	}

	return { deleted, errors };
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const dryRun = !args.includes("--remove");

	console.log("🔍 Enhanced Image Cleaner with JSON Updates");
	console.log("========================================");
	console.log(`Mode: ${dryRun ? "DRY RUN (no files will be modified)" : "REMOVE mode"}`);
	console.log(`Images directory: ${IMAGES_DIR}`);
	console.log(`Data directory: ${DATA_DIR}`);

	// Scan for incorrect images
	const incorrectImages = await scanIncorrectImages(IMAGES_DIR);

	if (incorrectImages.length === 0) {
		console.log("\n✅ No incorrect images found.");
		return;
	}

	console.log(`\n📊 Found ${incorrectImages.length} incorrect images:`);
	console.log("-------------------------------------------");
	for (const img of incorrectImages) {
		console.log(`${img.itemId}_${img.imageNumber}: ${img.width}x${img.height} (${formatFileSize(img.size)})`);
	}

	// Group by item for summary
	const imagesByItem = new Map<string, ImageInfo[]>();
	for (const img of incorrectImages) {
		const existing = imagesByItem.get(img.itemId);
		if (existing) {
			existing.push(img);
		} else {
			imagesByItem.set(img.itemId, [img]);
		}
	}

	console.log(`\n📈 Summary: ${imagesByItem.size} items affected`);

	if (dryRun) {
		console.log("\n💡 To remove these images and update JSON files, run with --remove flag");
		return;
	}

	// Update JSON files first
	console.log("\n📝 Step 1: Updating JSON references...");
	const updateResults = await updateJsonFiles(incorrectImages);

	console.log("\n📊 JSON Update Results:");
	console.log(`  Items updated: ${updateResults.itemsUpdated}`);
	console.log(`  Image references removed: ${updateResults.imagesRemovedFromJson}`);
	console.log(`  JSON errors: ${updateResults.jsonErrors.length}`);
	console.log(`  Items with missing images: ${updateResults.itemsWithMissingImages.length}`);

	if (updateResults.jsonErrors.length > 0) {
		console.log("\n❌ JSON Errors:");
		for (const error of updateResults.jsonErrors) { console.log(`  - ${error}`); }
	}

	// Remove image files
	console.log("\n🗑️  Step 2: Removing image files...");
	const fileResults = await removeImageFiles(incorrectImages);

	console.log("\n📊 File Removal Results:");
	console.log(`  Files deleted: ${fileResults.deleted}`);
	console.log(`  Errors: ${fileResults.errors.length}`);

	if (fileResults.errors.length > 0) {
		console.log("\n❌ File Deletion Errors:");
		for (const error of fileResults.errors) { console.log(`  - ${error}`); }
	}

	console.log("\n✅ Cleanup completed successfully!");
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}