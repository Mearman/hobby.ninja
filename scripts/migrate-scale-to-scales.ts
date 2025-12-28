/**
 * Migrate items from `scale` (string) to `scales` (string[])
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ITEMS_DIR = path.join(import.meta.dirname, "../data/src/items");

interface ItemData {
	scale?: string;
	scales?: string[];
}

let migratedCount = 0;
let skippedCount = 0;

const files = readdirSync(ITEMS_DIR).filter(f => f.endsWith(".json"));

for (const file of files) {
	const filePath = path.join(ITEMS_DIR, file);
	const content = readFileSync(filePath, "utf8");
	const item = JSON.parse(content) as ItemData;

	// Skip if already has scales array
	if (Array.isArray(item.scales)) {
		skippedCount++;
		continue;
	}

	// Migrate scale to scales
	if (typeof item.scale === "string" && item.scale) {
		item.scales = [item.scale];
		delete item.scale;
		migratedCount++;
	} else {
		// No scale - add empty scales array
		item.scales = [];
		if ("scale" in item) {
			delete item.scale;
		}
		migratedCount++;
	}

	// Write back with consistent formatting
	writeFileSync(filePath, JSON.stringify(item, null, "\t") + "\n");
}

console.log(`Migrated: ${migratedCount}`);
console.log(`Skipped (already migrated): ${skippedCount}`);
