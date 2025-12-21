/**
 * Migration script: Pad item filenames to 4 digits
 * 01_1.json -> 01_0001.json
 * 01_778.json -> 01_0778.json
 * 01_1000.json -> 01_1000.json (no change)
 *
 * Also updates index.json keys to match.
 */

import { readdirSync, renameSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ITEMS_DIR = join(import.meta.dirname, "../src/items");

/**
 * Pad the numeric suffix of an item ID to 4 digits
 * 01_1 -> 01_0001
 * 01_778 -> 01_0778
 * 01_1000 -> 01_1000
 */
function padItemId(id: string): string {
	const match = /^(\d+)_(\d+)$/.test(id) ? id.split("_") : null;
	if (!match || match.length !== 2) return id;

	const prefix = match[0];
	const suffix = match[1];
	const paddedSuffix = suffix.padStart(4, "0");
	return `${prefix}_${paddedSuffix}`;
}

/**
 * Check if an ID needs padding
 */
function needsPadding(id: string): boolean {
	const parts = id.split("_");
	if (parts.length !== 2) return false;
	const suffix = parts[1];
	return suffix.length < 4;
}

async function main() {
	console.log("Padding item filenames to 4 digits...\n");

	// 1. Get all JSON files (excluding index.json)
	const files = readdirSync(ITEMS_DIR)
		.filter(f => f.endsWith(".json") && f !== "index.json");

	console.log(`Found ${files.length} item files`);

	// 2. Rename files that need padding
	let renamedCount = 0;
	const renames: Array<{ from: string; to: string }> = [];

	for (const file of files) {
		const id = file.replace(".json", "");
		if (needsPadding(id)) {
			const paddedId = padItemId(id);
			renames.push({ from: file, to: `${paddedId}.json` });
		}
	}

	console.log(`${renames.length} files need renaming\n`);

	// Show first 10 renames as preview
	console.log("Preview (first 10):");
	for (const { from, to } of renames.slice(0, 10)) {
		console.log(`  ${from} -> ${to}`);
	}
	if (renames.length > 10) {
		console.log(`  ... and ${renames.length - 10} more\n`);
	}

	// Perform renames
	console.log("\nRenaming files...");
	for (const { from, to } of renames) {
		const fromPath = join(ITEMS_DIR, from);
		const toPath = join(ITEMS_DIR, to);

		// Check if target already exists (shouldn't happen, but be safe)
		if (existsSync(toPath)) {
			console.error(`  Target exists: ${to}`);
			continue;
		}

		renameSync(fromPath, toPath);
		renamedCount++;
	}
	console.log(`  Renamed ${renamedCount} files`);

	// 3. Update index.json
	console.log("\nUpdating index.json...");
	const indexPath = join(ITEMS_DIR, "index.json");

	if (existsSync(indexPath)) {
		const index = JSON.parse(readFileSync(indexPath, "utf8"));
		const oldItems = index.items;
		const newItems: Record<string, unknown> = {};
		let indexUpdates = 0;

		for (const [id, entry] of Object.entries(oldItems)) {
			const paddedId = padItemId(id);
			newItems[paddedId] = entry;
			if (paddedId !== id) indexUpdates++;
		}

		index.items = newItems;
		index.updatedAt = new Date().toISOString();

		writeFileSync(indexPath, JSON.stringify(index, null, "\t"), "utf8");
		console.log(`  Updated ${indexUpdates} index entries`);
	} else {
		console.log("  No index.json found");
	}

	console.log("\nMigration complete!");
	console.log("\nNext steps:");
	console.log("  1. Update scraper to use padded filenames");
	console.log("  2. Update any code that constructs item file paths");
}

main().catch(console.error);
