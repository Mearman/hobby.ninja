#!/usr/bin/env tsx
/**
 * Migrate items from old image format (array of paths) to new format (object with hashes)
 * Uses existing local images - no downloading required
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ITEMS_DIR = "data/src/items";
const ASSETS_BASE = "assets/images/items";
const PROGRESS_INTERVAL = 500;

interface OldFormatItem {
	id: string;
	file: string;
	images: string[];
}

interface NewImageFormat {
	src: string;
	path: string;
	hash: string;
}

interface ItemJson {
	id: string;
	images: string[] | { product: NewImageFormat[]; instructions: NewImageFormat[] };
}

function computeFileHash(filePath: string): string | null {
	try {
		const content = readFileSync(filePath);
		return createHash("md5").update(content).digest("hex");
	} catch {
		return null;
	}
}

function findOldFormatItems(): OldFormatItem[] {
	const files = readdirSync(ITEMS_DIR).filter(f => f.endsWith(".json") && f !== "index.json");
	const oldFormat: OldFormatItem[] = [];

	for (const file of files) {
		try {
			const data = JSON.parse(readFileSync(path.join(ITEMS_DIR, file), "utf8")) as ItemJson;
			if (Array.isArray(data.images) && data.images.length > 0) {
				oldFormat.push({ id: data.id, file, images: data.images });
			}
		} catch {
			// Skip invalid files
		}
	}

	return oldFormat;
}

function migrateItem(item: OldFormatItem): { success: boolean; imagesWithHash: number; imagesMissing: number } {
	const jsonPath = path.join(ITEMS_DIR, item.file);
	const data = JSON.parse(readFileSync(jsonPath, "utf8")) as Record<string, unknown>;

	const productImages: NewImageFormat[] = [];
	let imagesWithHash = 0;
	let imagesMissing = 0;

	for (const imagePath of item.images) {
		// Extract filename from path like "/images/items/01_3422/153_4376.jpg"
		const filename = path.basename(imagePath);
		const localPath = path.join(ASSETS_BASE, item.id, filename);

		const hash = computeFileHash(localPath);

		if (hash) {
			// Construct source URL based on filename pattern
			let src: string;
			if (/^\d{3}_\d+\.jpg$/i.test(filename)) {
				// Manual-style filename (153_4376.jpg) - from bandai-hobby.net
				src = `https://bandai-hobby.net/images/${filename}`;
			} else if (/^1\d{9}_\d+\.jpg$/i.test(filename)) {
				// CDN-style filename (1000070726_1.jpg) - from Akamai CDN
				src = `https://bandai-a.akamaihd.net/bc/img/model/xl/${filename}`;
			} else {
				// Other patterns - use generic bandai-hobby.net
				src = `https://bandai-hobby.net/images/${filename}`;
			}

			productImages.push({
				src,
				path: imagePath,
				hash,
			});
			imagesWithHash++;
		} else {
			imagesMissing++;
		}
	}

	// Update to new format
	data.images = {
		product: productImages,
		instructions: [],
	};

	writeFileSync(jsonPath, JSON.stringify(data, null, "\t") + "\n");

	return { success: true, imagesWithHash, imagesMissing };
}

function main(): void {
	const oldFormatItems = findOldFormatItems();
	console.log(`Found ${oldFormatItems.length} items with old image format\n`);

	if (oldFormatItems.length === 0) {
		console.log("No items to migrate.");
		return;
	}

	let success = 0;
	let failed = 0;
	let totalWithHash = 0;
	let totalMissing = 0;

	for (let i = 0; i < oldFormatItems.length; i++) {
		const item = oldFormatItems[i];
		if (!item) continue;

		try {
			const result = migrateItem(item);
			if (result.success) {
				success++;
				totalWithHash += result.imagesWithHash;
				totalMissing += result.imagesMissing;
			} else {
				failed++;
			}
		} catch (error) {
			failed++;
			const msg = error instanceof Error ? error.message : "Unknown error";
			console.log(`Error migrating ${item.id}: ${msg}`);
		}

		// Progress report every PROGRESS_INTERVAL items
		if ((i + 1) % PROGRESS_INTERVAL === 0 || i + 1 === oldFormatItems.length) {
			console.log(`Progress: ${i + 1}/${oldFormatItems.length} items`);
		}
	}

	console.log(`\n=== Migration Complete ===`);
	console.log(`Success: ${success}`);
	console.log(`Failed: ${failed}`);
	console.log(`Images with hash: ${totalWithHash}`);
	console.log(`Images missing locally: ${totalMissing}`);
}

main();
