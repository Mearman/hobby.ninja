/**
 * Populate MD5 hashes for all images in existing JSON files
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const WORKSPACE_ROOT = process.cwd();
const ITEMS_DIR = join(WORKSPACE_ROOT, "data/src/items");
const MANUALS_DIR = join(WORKSPACE_ROOT, "data/src/manuals");
const ASSETS_DIR = join(WORKSPACE_ROOT, "assets");

function computeHash(filePath: string): string | undefined {
	try {
		const buffer = readFileSync(filePath);
		return createHash("md5").update(buffer).digest("hex");
	} catch {
		return undefined;
	}
}

function resolveImagePath(relativePath: string): string {
	// Convert /images/items/... to assets/images/items/...
	// Convert /manuals/... to assets/manuals/...
	if (relativePath.startsWith("/images/")) {
		return join(ASSETS_DIR, relativePath);
	}
	if (relativePath.startsWith("/manuals/")) {
		return join(ASSETS_DIR, relativePath);
	}
	return join(ASSETS_DIR, relativePath);
}

interface ImageData {
	src?: string;
	path?: string;
	hash?: string;
}

interface ItemData {
	images?: {
		product?: ImageData[];
		instructions?: ImageData[];
	};
}

interface ManualData {
	image?: ImageData;
}

let itemsUpdated = 0;
let itemsSkipped = 0;
let manualsUpdated = 0;
let manualsSkipped = 0;
let hashesAdded = 0;

// Process items
console.log("Processing items...");
const itemFiles = readdirSync(ITEMS_DIR).filter((f) => f.endsWith(".json") && f !== "index.json");

for (const file of itemFiles) {
	const filePath = join(ITEMS_DIR, file);
	const data: ItemData = JSON.parse(readFileSync(filePath, "utf8"));
	let modified = false;

	if (data.images) {
		for (const img of data.images.product || []) {
			if (img.path && !img.hash) {
				const absPath = resolveImagePath(img.path);
				const hash = computeHash(absPath);
				if (hash) {
					img.hash = hash;
					modified = true;
					hashesAdded++;
				}
			}
		}
		for (const img of data.images.instructions || []) {
			if (img.path && !img.hash) {
				const absPath = resolveImagePath(img.path);
				const hash = computeHash(absPath);
				if (hash) {
					img.hash = hash;
					modified = true;
					hashesAdded++;
				}
			}
		}
	}

	if (modified) {
		writeFileSync(filePath, JSON.stringify(data, null, "\t"));
		itemsUpdated++;
	} else {
		itemsSkipped++;
	}

	if ((itemsUpdated + itemsSkipped) % 500 === 0) {
		console.log(`  Items: ${itemsUpdated + itemsSkipped}/${itemFiles.length}`);
	}
}

console.log(`Items: ${itemsUpdated} updated, ${itemsSkipped} skipped`);

// Process manuals
console.log("\nProcessing manuals...");
const manualFiles = readdirSync(MANUALS_DIR).filter((f) => f.endsWith(".json") && f !== "index.json");

for (const file of manualFiles) {
	const filePath = join(MANUALS_DIR, file);
	const data: ManualData = JSON.parse(readFileSync(filePath, "utf8"));
	let modified = false;

	if (data.image?.path && !data.image.hash) {
		const absPath = resolveImagePath(data.image.path);
		const hash = computeHash(absPath);
		if (hash) {
			data.image.hash = hash;
			modified = true;
			hashesAdded++;
		}
	}

	if (modified) {
		writeFileSync(filePath, JSON.stringify(data, null, "\t"));
		manualsUpdated++;
	} else {
		manualsSkipped++;
	}

	if ((manualsUpdated + manualsSkipped) % 500 === 0) {
		console.log(`  Manuals: ${manualsUpdated + manualsSkipped}/${manualFiles.length}`);
	}
}

console.log(`Manuals: ${manualsUpdated} updated, ${manualsSkipped} skipped`);
console.log(`\nTotal hashes added: ${hashesAdded}`);
