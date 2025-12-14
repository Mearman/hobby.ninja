/**
 * Migration script: Convert LocalizedText[] to LocalizedTextArray
 *
 * Changes structure from:
 *   { description: [{ ja: "...", en: "..." }, ...] }
 * To:
 *   { description: { ja: ["..."], en: ["..."] } }
 *
 * For: description, accessories, contents
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ITEMS_DIR = path.join(import.meta.dirname, "../src/items");

interface OldLocalizedText {
	ja: string;
	en?: string;
}

interface NewLocalizedTextArray {
	ja: string[];
	en?: string[];
}

interface OldItem {
	description?: OldLocalizedText[];
	accessories?: OldLocalizedText[];
	contents?: OldLocalizedText[];
	[key: string]: unknown;
}

interface NewItem {
	description?: NewLocalizedTextArray;
	accessories?: NewLocalizedTextArray;
	contents?: NewLocalizedTextArray;
	[key: string]: unknown;
}

function migrateArray(arr: OldLocalizedText[] | undefined): NewLocalizedTextArray | undefined {
	if (!arr || arr.length === 0) {
		return undefined;
	}

	const ja: string[] = [];
	const en: string[] = [];

	for (const item of arr) {
		if (item.ja) ja.push(item.ja);
		if (item.en) en.push(item.en);
	}

	const result: NewLocalizedTextArray = { ja };
	if (en.length > 0) {
		result.en = en;
	}

	return result;
}

function migrateItem(item: OldItem): NewItem {
	const newItem = { ...item } as NewItem;

	// Migrate description
	if (Array.isArray(item.description)) {
		newItem.description = migrateArray(item.description);
	}

	// Migrate accessories
	if (Array.isArray(item.accessories)) {
		newItem.accessories = migrateArray(item.accessories);
	}

	// Migrate contents
	if (Array.isArray(item.contents)) {
		newItem.contents = migrateArray(item.contents);
	}

	return newItem;
}

function main() {
	console.log("=== Migrating LocalizedText[] to LocalizedTextArray ===\n");

	const files = readdirSync(ITEMS_DIR).filter(
		(f) => f.endsWith(".json") && f !== "index.json"
	);

	console.log(`Found ${files.length} item files to migrate\n`);

	let migrated = 0;
	let skipped = 0;
	let errors = 0;

	for (const file of files) {
		const filePath = path.join(ITEMS_DIR, file);

		try {
			const content = readFileSync(filePath, "utf8");
			const item = JSON.parse(content) as OldItem;

			// Check if already migrated (description is an object, not array)
			if (item.description && !Array.isArray(item.description)) {
				skipped++;
				continue;
			}

			const newItem = migrateItem(item);
			writeFileSync(filePath, JSON.stringify(newItem, null, "\t"));
			migrated++;
		} catch (error) {
			console.error(`Error migrating ${file}:`, error);
			errors++;
		}
	}

	console.log("\n=== Migration Complete ===");
	console.log(`  Migrated: ${migrated}`);
	console.log(`  Skipped (already migrated): ${skipped}`);
	console.log(`  Errors: ${errors}`);
}

main();
