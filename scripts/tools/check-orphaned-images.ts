#!/usr/bin/env node

/**
 * Utility to check for orphaned image references in JSON files
 * (images referenced in JSON but missing from filesystem)
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = "apps/next/public/data/items";
const IMAGES_DIR = "apps/next/public/images/items";

interface ItemData {
  id: string;
  images?: string[];
  gallery?: string[];
  manuals?: Array<{ images?: string[] }>;
  [key: string]: string | string[] | Array<{ images?: string[] }> | undefined;
}

interface OrphanedImage {
  itemId: string;
  imagePath: string;
  jsonPath: string;
}

async function loadItemData(itemId: string): Promise<ItemData | null> {
	try {
		const jsonPath = path.join(DATA_DIR, itemId, `${itemId}.json`);
		const content = await fs.readFile(jsonPath, "utf8");
		return JSON.parse(content) as ItemData;
	} catch {
		return null;
	}
}

async function checkImageExists(imagePath: string): Promise<boolean> {
	try {
		const fullImagePath = path.join(IMAGES_DIR, imagePath);
		await fs.access(fullImagePath);
		return true;
	} catch {
		return false;
	}
}

async function findOrphanedImages(): Promise<OrphanedImage[]> {
	const orphaned: OrphanedImage[] = [];

	try {
		const itemDirs = await fs.readdir(DATA_DIR, { withFileTypes: true });
		const itemIds = itemDirs
			.filter(e => e.isDirectory())
			.map(e => e.name);

		console.log(`Checking ${itemIds.length} items for orphaned image references...`);

		for (const itemId of itemIds) {
			try {
				const data = await loadItemData(itemId);
				if (!data) continue;

				// Check main images array
				if (data.images && Array.isArray(data.images)) {
					for (const imgPath of data.images) {
						if (typeof imgPath === "string" && imgPath.endsWith(".jpg")) {
							const exists = await checkImageExists(imgPath);
							if (!exists) {
								orphaned.push({
									itemId,
									imagePath: imgPath,
									jsonPath: `images[${data.images.indexOf(imgPath)}]`,
								});
							}
						}
					}
				}

				// Check gallery array
				if (data.gallery && Array.isArray(data.gallery)) {
					for (const imgPath of data.gallery) {
						if (typeof imgPath === "string" && imgPath.endsWith(".jpg")) {
							const exists = await checkImageExists(imgPath);
							if (!exists) {
								orphaned.push({
									itemId,
									imagePath: imgPath,
									jsonPath: `gallery[${data.gallery.indexOf(imgPath)}]`,
								});
							}
						}
					}
				}

				// Check manual images
				if (data.manuals && Array.isArray(data.manuals)) {
					for (let manualIndex = 0; manualIndex < data.manuals.length; manualIndex++) {
						const manual = data.manuals[manualIndex];
						if (manual.images && Array.isArray(manual.images)) {
							for (const imgPath of manual.images) {
								if (typeof imgPath === "string" && imgPath.endsWith(".jpg")) {
									const exists = await checkImageExists(imgPath);
									if (!exists) {
										orphaned.push({
											itemId,
											imagePath: imgPath,
											jsonPath: `manuals[${manualIndex}].images[${manual.images.indexOf(imgPath)}]`,
										});
									}
								}
							}
						}
					}
				}

			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.log(`Error processing ${itemId}: ${message}`);
			}
		}

	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Error reading data directory: ${message}`);
	}

	return orphaned;
}

async function main(): Promise<void> {
	console.log("🔍 Checking for Orphaned Image References");
	console.log("==========================================");

	const orphaned = await findOrphanedImages();

	if (orphaned.length === 0) {
		console.log("\n✅ No orphaned image references found!");
		return;
	}

	console.log(`\n❌ Found ${orphaned.length} orphaned image references:`);
	console.log("---------------------------------------------");

	// Group by item for better readability
	const byItem = new Map<string, OrphanedImage[]>();
	for (const ref of orphaned) {
		const existing = byItem.get(ref.itemId);
		if (existing) {
			existing.push(ref);
		} else {
			byItem.set(ref.itemId, [ref]);
		}
	}

	for (const [itemId, refs] of byItem.entries()) {
		console.log(`\n${itemId} (${refs.length} missing images):`);
		for (const ref of refs) {
			console.log(`  - ${ref.imagePath} (${ref.jsonPath})`);
		}
	}

	console.log(`\n💡 To clean these references, you can:`);
	console.log(`   1. Manually edit the JSON files to remove the missing image paths`);
	console.log(`   2. Use the enhanced cleaner: pnpm clean-images:json:remove`);
	console.log(`   3. Check if the images were moved or if the paths need updating`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}