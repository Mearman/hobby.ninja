/**
 * Migration script to move timing fields (extractedAt, pageScrapedAt, downloadVerifiedAt)
 * from individual item JSON files to the centralized index.json
 *
 * Run with: npx tsx packages/cli/src/scripts/migrate-timing-to-index.ts
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";

const ITEMS_DIR = resolveWorkspacePath("data/src/items");
const INDEX_PATH = path.join(ITEMS_DIR, "index.json");

interface ItemIndexEntry {
	japaneseSite?: {
		hasPage: boolean;
		pageCheckedAt: string;
		productName?: string;
		error?: string;
		isBlog?: boolean;
	};
	globalSite?: {
		hasPage: boolean;
		pageCheckedAt: string;
		productName?: string;
		error?: string;
	};
	extractedAt?: string;
	pageScrapedAt?: string;
	downloadVerifiedAt?: string;
	hasFile?: boolean; // Legacy field to be removed
}

interface ItemsIndex {
	version: string;
	updatedAt: string;
	stats: {
		totalItems: number;
		japaneseSite: { checked: number; withPage: number; withoutPage: number; errors: number };
		globalSite: { checked: number; withPage: number; withoutPage: number; errors: number };
	};
	items: Record<string, ItemIndexEntry>;
}

interface ItemFile {
	id: string;
	extractedAt?: string;
	pageScrapedAt?: string;
	downloadVerifiedAt?: string;
	[key: string]: unknown;
}

const TIMING_FIELDS = ["extractedAt", "pageScrapedAt", "downloadVerifiedAt"] as const;

function loadIndex(): ItemsIndex {
	if (!existsSync(INDEX_PATH)) {
		return {
			version: "1.0.0",
			updatedAt: new Date().toISOString(),
			stats: {
				totalItems: 0,
				japaneseSite: { checked: 0, withPage: 0, withoutPage: 0, errors: 0 },
				globalSite: { checked: 0, withPage: 0, withoutPage: 0, errors: 0 },
			},
			items: {},
		};
	}
	return JSON.parse(readFileSync(INDEX_PATH, "utf8")) as ItemsIndex;
}

function saveIndex(index: ItemsIndex): void {
	index.updatedAt = new Date().toISOString();
	writeFileSync(INDEX_PATH, JSON.stringify(index, null, "\t"));
}

function padItemId(id: string): string {
	const parts = id.split("_");
	if (parts.length !== 2) return id;
	const prefix = parts[0];
	const suffix = parts[1];
	if (!prefix || !suffix || !/^\d+$/.test(prefix) || !/^\d+$/.test(suffix)) return id;
	return `${prefix}_${suffix.padStart(4, "0")}`;
}

function migrateTimingToIndex(): void {
	console.log("Starting migration of timing fields to index.json...\n");

	const index = loadIndex();
	let filesProcessed = 0;
	let timingMigrated = 0;
	let filesModified = 0;
	let hasFileRemoved = 0;

	// First pass: Remove hasFile from all index entries
	console.log("Removing hasFile from index entries...");
	for (const [itemId, entry] of Object.entries(index.items)) {
		if ("hasFile" in entry) {
			delete (entry as ItemIndexEntry & { hasFile?: boolean }).hasFile;
			hasFileRemoved++;
		}
	}
	console.log(`  Removed hasFile from ${hasFileRemoved} index entries\n`);

	// Get all item JSON files (excluding index.json)
	const files = readdirSync(ITEMS_DIR)
		.filter((f) => f.endsWith(".json") && f !== "index.json")
		.sort();

	console.log(`Found ${files.length} item files to process\n`);

	for (const file of files) {
		const filePath = path.join(ITEMS_DIR, file);
		filesProcessed++;

		try {
			const content = readFileSync(filePath, "utf8");
			const item = JSON.parse(content) as ItemFile;

			// Check if this file has any timing fields
			const hasTimingFields = TIMING_FIELDS.some((field) => field in item);
			if (!hasTimingFields) continue;

			// Get the padded ID for index lookup
			const paddedId = padItemId(item.id);

			// Initialize index entry if needed
			index.items[paddedId] ??= {};

			// Migrate timing fields to index
			let migratedAny = false;
			for (const field of TIMING_FIELDS) {
				if (field in item && item[field]) {
					// Only update if index doesn't have this field or item's is newer
					const indexValue = index.items[paddedId][field];
					const itemValue = item[field] as string;

					if (!indexValue || new Date(itemValue) > new Date(indexValue)) {
						index.items[paddedId][field] = itemValue;
						migratedAny = true;
					}
				}
			}

			if (migratedAny) {
				timingMigrated++;
			}

			// Remove timing fields from item file
			const modifiedItem = { ...item };
			let modified = false;
			for (const field of TIMING_FIELDS) {
				if (field in modifiedItem) {
					delete modifiedItem[field];
					modified = true;
				}
			}

			if (modified) {
				writeFileSync(filePath, JSON.stringify(modifiedItem, null, "\t"));
				filesModified++;
			}

			// Progress indicator every 500 files
			if (filesProcessed % 500 === 0) {
				console.log(`  Processed ${filesProcessed}/${files.length} files...`);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`⚠️  Error processing ${file}: ${errorMessage}`);
		}
	}

	// Save updated index
	saveIndex(index);

	console.log("\n✅ Migration complete!");
	console.log(`   Files processed: ${filesProcessed}`);
	console.log(`   Timing migrated: ${timingMigrated}`);
	console.log(`   Files modified: ${filesModified}`);
}

// Run migration
migrateTimingToIndex();
