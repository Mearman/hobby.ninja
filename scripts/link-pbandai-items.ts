/**
 * Link items and P-Bandai records via matching image hashes
 * - Adds pbandaiIds to item files
 * - Adds itemId to P-Bandai files
 * - Updates P-Bandai image paths to point to item assets
 * - Removes duplicate P-Bandai images
 */

import { readFileSync, writeFileSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { join, dirname } from "node:path";

const WORKSPACE_ROOT = process.cwd();
const ITEMS_DIR = join(WORKSPACE_ROOT, "data/src/items");
const PBANDAI_DIR = join(WORKSPACE_ROOT, "data/src/pbandai/en/items");
const ASSETS_DIR = join(WORKSPACE_ROOT, "assets");

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
	const data = JSON.parse(readFileSync(join(ITEMS_DIR, file), "utf8"));
	const id = data.id;

	for (const img of data.images?.product || []) {
		if (img.hash) {
			if (!itemHashMap.has(img.hash)) itemHashMap.set(img.hash, []);
			itemHashMap.get(img.hash)!.push({
				source: "item",
				id,
				path: img.path,
				hash: img.hash,
			});
		}
	}
}

// Process P-Bandai
const pbandaiFiles = readdirSync(PBANDAI_DIR).filter(
	(f) => f.endsWith(".json") && f !== "index.json",
);

for (const file of pbandaiFiles) {
	const data = JSON.parse(readFileSync(join(PBANDAI_DIR, file), "utf8"));
	const id = data.id;

	for (let i = 0; i < (data.images || []).length; i++) {
		const img = data.images[i];
		if (img.hash) {
			if (!pbandaiHashMap.has(img.hash)) pbandaiHashMap.set(img.hash, []);
			pbandaiHashMap.get(img.hash)!.push({
				source: "pbandai",
				id,
				path: img.path,
				hash: img.hash,
				imageIndex: i,
			});
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
			if (!itemToPbandai.has(itemEntry.id)) {
				itemToPbandai.set(itemEntry.id, new Set());
			}
			itemToPbandai.get(itemEntry.id)!.add(pbandaiEntry.id);

			// Link pbandai -> item
			pbandaiToItem.set(pbandaiEntry.id, itemEntry.id);

			// Track image path update
			if (!pbandaiImageUpdates.has(pbandaiEntry.id)) {
				pbandaiImageUpdates.set(pbandaiEntry.id, new Map());
			}
			pbandaiImageUpdates.get(pbandaiEntry.id)!.set(
				pbandaiEntry.imageIndex!,
				itemEntry.path,
			);
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
	const filePath = join(ITEMS_DIR, `${itemId}.json`);
	const data = JSON.parse(readFileSync(filePath, "utf8"));

	// Add pbandaiIds array (merge with existing if present)
	const existingIds = new Set(data.pbandaiIds || []);
	for (const id of pbandaiIds) {
		existingIds.add(id);
	}
	data.pbandaiIds = Array.from(existingIds).sort();

	writeFileSync(filePath, JSON.stringify(data, null, "\t"));
	itemsUpdated++;
	console.log(`  ${itemId} -> pbandaiIds: [${data.pbandaiIds.join(", ")}]`);
}

// Update P-Bandai files and collect images to delete
console.log("\nUpdating P-Bandai files...");
let pbandaiUpdated = 0;
const imagesToDelete: string[] = [];

for (const [pbandaiId, itemId] of pbandaiToItem) {
	const filePath = join(PBANDAI_DIR, `${pbandaiId}.json`);
	const data = JSON.parse(readFileSync(filePath, "utf8"));

	// Add itemId
	data.itemId = itemId;

	// Update image paths for matching images
	const imageUpdates = pbandaiImageUpdates.get(pbandaiId);
	if (imageUpdates) {
		for (const [index, newPath] of imageUpdates) {
			const oldPath = data.images[index].path;
			const oldAbsPath = join(ASSETS_DIR, oldPath);

			// Track for deletion
			imagesToDelete.push(oldAbsPath);

			// Update path to point to item asset
			data.images[index].path = newPath;
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
		dirsToCheck.add(dirname(imagePath));
	} catch (error) {
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
