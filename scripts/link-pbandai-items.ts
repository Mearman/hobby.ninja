/**
 * Link items and P-Bandai records via matching image hashes
 * - Adds pbandaiIds to item files
 * - Adds itemId to P-Bandai files
 * - Updates P-Bandai image paths to point to item assets
 * - Removes duplicate P-Bandai images
 */

import { readFileSync, writeFileSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import path from "node:path";

const WORKSPACE_ROOT = process.cwd();
const ITEMS_DIR = path.join(WORKSPACE_ROOT, "data/src/items");
const PBANDAI_DIR = path.join(WORKSPACE_ROOT, "data/src/pbandai/en/items");
const ASSETS_DIR = path.join(WORKSPACE_ROOT, "assets");

interface ImageData {
	path: string;
	hash?: string;
}

interface ItemImages {
	product?: ImageData[];
}

interface ItemData {
	id: string;
	images?: ItemImages;
	pbandaiIds?: string[];
}

interface PBandaiImageData {
	path: string;
	hash?: string;
}

interface PBandaiData {
	id: string;
	images?: PBandaiImageData[];
	itemId?: string;
}

interface HashEntry {
	source: "item" | "pbandai";
	id: string;
	path: string;
	hash: string;
	imageIndex?: number;
}

// Build hash maps
const itemHashMap = new Map<string, HashEntry[]>(); // hash -> item entries
const pbandaiHashMap = new Map<string, HashEntry[]>(); // hash -> pbandai entries

console.log("Building hash maps...\n");

// Process items
const itemFiles = readdirSync(ITEMS_DIR).filter(
	(f) => f.endsWith(".json") && f !== "index.json",
);

for (const file of itemFiles) {
	const data = JSON.parse(readFileSync(path.join(ITEMS_DIR, file), "utf8")) as ItemData;
	const id = data.id;

	for (const img of data.images?.product ?? []) {
		if (img.hash) {
			const existing = itemHashMap.get(img.hash);
			if (existing) {
				existing.push({
					source: "item",
					id,
					path: img.path,
					hash: img.hash,
				});
			} else {
				itemHashMap.set(img.hash, [{
					source: "item",
					id,
					path: img.path,
					hash: img.hash,
				}]);
			}
		}
	}
}

// Process P-Bandai
const pbandaiFiles = readdirSync(PBANDAI_DIR).filter(
	(f) => f.endsWith(".json") && f !== "index.json",
);

for (const file of pbandaiFiles) {
	const data = JSON.parse(readFileSync(path.join(PBANDAI_DIR, file), "utf8")) as PBandaiData;
	const id = data.id;

	const images = data.images ?? [];
	for (const [i, img] of images.entries()) {
		if (img.hash) {
			const existing = pbandaiHashMap.get(img.hash);
			if (existing) {
				existing.push({
					source: "pbandai",
					id,
					path: img.path,
					hash: img.hash,
					imageIndex: i,
				});
			} else {
				pbandaiHashMap.set(img.hash, [{
					source: "pbandai",
					id,
					path: img.path,
					hash: img.hash,
					imageIndex: i,
				}]);
			}
		}
	}
}

// Find cross-matches and build link map
// itemId -> Set of pbandaiIds
const itemToPbandai = new Map<string, Set<string>>();
// pbandaiId -> itemId
const pbandaiToItem = new Map<string, string>();
// pbandaiId -> imageIndex -> new path from item
const pbandaiImageUpdates = new Map<string, Map<number, string>>();

for (const [hash, itemEntries] of itemHashMap) {
	const pbandaiEntries = pbandaiHashMap.get(hash);
	if (!pbandaiEntries) continue;

	for (const itemEntry of itemEntries) {
		for (const pbandaiEntry of pbandaiEntries) {
			// Link item -> pbandai
			const existingPbandaiSet = itemToPbandai.get(itemEntry.id);
			if (existingPbandaiSet) {
				existingPbandaiSet.add(pbandaiEntry.id);
			} else {
				itemToPbandai.set(itemEntry.id, new Set([pbandaiEntry.id]));
			}

			// Link pbandai -> item
			pbandaiToItem.set(pbandaiEntry.id, itemEntry.id);

			// Track image path update
			const existingUpdates = pbandaiImageUpdates.get(pbandaiEntry.id);
			if (existingUpdates && pbandaiEntry.imageIndex !== undefined) {
				existingUpdates.set(pbandaiEntry.imageIndex, itemEntry.path);
			} else if (pbandaiEntry.imageIndex !== undefined) {
				pbandaiImageUpdates.set(pbandaiEntry.id, new Map([[pbandaiEntry.imageIndex, itemEntry.path]]));
			}
		}
	}
}

console.log(`Found ${itemToPbandai.size} items linking to P-Bandai`);
console.log(`Found ${pbandaiToItem.size} P-Bandai items linking to items`);
console.log(`Found ${pbandaiImageUpdates.size} P-Bandai items with image updates\n`);

// Update item files
console.log("Updating item files...");
let itemsUpdated = 0;

for (const [itemId, pbandaiIds] of itemToPbandai) {
	const filePath = path.join(ITEMS_DIR, `${itemId}.json`);
	const data = JSON.parse(readFileSync(filePath, "utf8")) as ItemData;

	// Add pbandaiIds array (merge with existing if present)
	const existingIds = data.pbandaiIds ? new Set(data.pbandaiIds) : new Set<string>();
	for (const id of pbandaiIds) {
		existingIds.add(id);
	}
	data.pbandaiIds = [...existingIds].toSorted();

	writeFileSync(filePath, JSON.stringify(data, null, "\t"));
	itemsUpdated++;
	console.log(`  ${itemId} -> pbandaiIds: [${data.pbandaiIds.join(", ")}]`);
}

// Update P-Bandai files and collect images to delete
console.log("\nUpdating P-Bandai files...");
let pbandaiUpdated = 0;
const imagesToDelete: string[] = [];

for (const [pbandaiId, itemId] of pbandaiToItem) {
	const filePath = path.join(PBANDAI_DIR, `${pbandaiId}.json`);
	const data = JSON.parse(readFileSync(filePath, "utf8")) as PBandaiData;

	// Add itemId
	data.itemId = itemId;

	// Update image paths for matching images
	const imageUpdates = pbandaiImageUpdates.get(pbandaiId);
	if (imageUpdates && data.images) {
		for (const [index, newPath] of imageUpdates) {
			// Index is validated during hash map building, so image exists
			const image = data.images[index];
			const oldPath = image.path;
			const oldAbsPath = path.join(ASSETS_DIR, oldPath);

			// Track for deletion
			imagesToDelete.push(oldAbsPath);

			// Update path to point to item asset
			image.path = newPath;
			console.log(`  ${pbandaiId}[${index}]: ${oldPath} -> ${newPath}`);
		}
	}

	writeFileSync(filePath, JSON.stringify(data, null, "\t"));
	pbandaiUpdated++;
}

// Delete duplicate images
console.log("\nDeleting duplicate P-Bandai images...");
let imagesDeleted = 0;
const dirsToCheck = new Set<string>();

for (const imagePath of imagesToDelete) {
	try {
		unlinkSync(imagePath);
		imagesDeleted++;
		dirsToCheck.add(path.dirname(imagePath));
	} catch {
		// File may not exist or already deleted
	}
}

// Try to remove empty directories
let dirsRemoved = 0;
for (const dir of dirsToCheck) {
	try {
		const files = readdirSync(dir);
		if (files.length === 0) {
			rmdirSync(dir);
			dirsRemoved++;
		}
	} catch {
		// Directory may not exist or not empty
	}
}

console.log(`\n=== Summary ===`);
console.log(`Items updated with pbandaiIds: ${itemsUpdated}`);
console.log(`P-Bandai items updated with itemId: ${pbandaiUpdated}`);
console.log(`Duplicate images deleted: ${imagesDeleted}`);
console.log(`Empty directories removed: ${dirsRemoved}`);
