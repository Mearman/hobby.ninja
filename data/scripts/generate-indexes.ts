#!/usr/bin/env tsx
/**
 * Generate index files for items and manuals from existing data
 *
 * This script scans existing item and manual JSON files and creates
 * centralized index files for tracking page availability.
 *
 * Usage:
 *   pnpm tsx data/scripts/generate-indexes.ts
 *   pnpm tsx data/scripts/generate-indexes.ts --items-only
 *   pnpm tsx data/scripts/generate-indexes.ts --manuals-only
 *   pnpm tsx data/scripts/generate-indexes.ts --dry-run
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = join(import.meta.dirname, "../..");
const DATA_ROOT = join(ROOT, "data");

// Items paths
const ITEMS_PATH = join(DATA_ROOT, "src/items");
const ITEMS_INDEX_PATH = join(ITEMS_PATH, "index.json");

// Manuals paths
const MANUALS_PATH = join(DATA_ROOT, "src/manuals");
const MANUALS_INDEX_PATH = join(MANUALS_PATH, "index.json");
const RAW_MANUALS_INDEX_PATH = join(DATA_ROOT, "raw/bandai/manuals/index.json");

// CLI flags
const DRY_RUN = process.argv.includes("--dry-run");
const ITEMS_ONLY = process.argv.includes("--items-only");
const MANUALS_ONLY = process.argv.includes("--manuals-only");

interface LocalizedText {
	ja: string;
	en?: string;
}

interface ItemFile {
	id: string;
	name: LocalizedText;
	[key: string]: unknown;
}

interface ManualFile {
	id: string;
	name: LocalizedText;
	[key: string]: unknown;
}

// Types matching catalogData.ts
interface SiteStatus {
	hasPage: boolean;
	checkedAt: string;
	productName?: string;
	error?: string;
}

interface SiteStats {
	checked: number;
	withPage: number;
	withoutPage: number;
	errors: number;
}

interface ItemIndexEntry {
	japaneseSite?: SiteStatus;
	globalSite?: SiteStatus;
}

interface ItemsIndex {
	version: string;
	updatedAt: string;
	stats: {
		totalItems: number;
		japaneseSite: SiteStats;
		globalSite: SiteStats;
	};
	items: Record<string, ItemIndexEntry>;
}

interface ManualStatus {
	hasPage: boolean;
	checkedAt: string;
	name?: string;
	error?: string;
}

interface InvalidRange {
	start: number;
	end: number;
	checkedAt: string;
}

interface ManualsIndex {
	version: string;
	updatedAt: string;
	stats: {
		totalChecked: number;
		withPage: number;
		withoutPage: number;
		errors: number;
	};
	manuals: Record<string, ManualStatus>;
	invalidRanges: InvalidRange[];
}

interface RawManualIndexEntry {
	id: number;
	isValid: boolean;
	lastChecked: string;
	hasFile: boolean;
	productName?: string;
}

interface RawManualIndex {
	valid?: Record<string, RawManualIndexEntry>;
	invalidRanges?: Array<{ start: number; end: number; lastChecked: string }>;
	invalidSingles?: number[];
	totalChecked?: number;
	lastUpdated?: string;
}

function log(message: string) {
	console.log(DRY_RUN ? `[DRY-RUN] ${message}` : message);
}

/**
 * Generate items index from existing item JSON files
 */
async function generateItemsIndex(): Promise<void> {
	console.log("\n=== Generating Items Index ===\n");

	// Get list of item files (excluding index.json)
	const itemFiles = readdirSync(ITEMS_PATH)
		.filter((f) => f.endsWith(".json") && f !== "index.json");

	console.log(`Found ${itemFiles.length} item files\n`);

	const now = new Date().toISOString();
	const items: Record<string, ItemIndexEntry> = {};
	let processed = 0;
	let errors = 0;

	for (const file of itemFiles) {
		const id = file.replace(".json", "");
		const filePath = join(ITEMS_PATH, file);

		try {
			const data = JSON.parse(readFileSync(filePath, "utf-8")) as ItemFile;
			const name = data.name?.ja || data.name?.en || "";

			// Item exists on Japanese site (we have the file)
			items[id] = {
				japaneseSite: {
					hasPage: true,
					checkedAt: now,
					productName: name,
				},
				// globalSite will be populated later when we check
			};

			processed++;
			if (processed % 1000 === 0) {
				console.log(`  Processed ${processed}/${itemFiles.length}...`);
			}
		} catch (err) {
			console.error(`  Error reading ${file}: ${err}`);
			errors++;
		}
	}

	// Calculate stats
	const entries = Object.values(items);
	const japaneseSiteStats: SiteStats = {
		checked: entries.filter((e) => e.japaneseSite).length,
		withPage: entries.filter((e) => e.japaneseSite?.hasPage).length,
		withoutPage: 0,
		errors: 0,
	};
	const globalSiteStats: SiteStats = {
		checked: 0,
		withPage: 0,
		withoutPage: 0,
		errors: 0,
	};

	const index: ItemsIndex = {
		version: "1.0.0",
		updatedAt: now,
		stats: {
			totalItems: Object.keys(items).length,
			japaneseSite: japaneseSiteStats,
			globalSite: globalSiteStats,
		},
		items,
	};

	if (!DRY_RUN) {
		writeFileSync(ITEMS_INDEX_PATH, JSON.stringify(index, null, "\t"));
	}

	console.log(`\n=== Items Index Complete ===`);
	console.log(`  Total items: ${Object.keys(items).length}`);
	console.log(`  Japanese site checked: ${japaneseSiteStats.checked}`);
	console.log(`  Japanese site with page: ${japaneseSiteStats.withPage}`);
	console.log(`  Global site checked: ${globalSiteStats.checked} (run translation lookup to populate)`);
	console.log(`  Errors: ${errors}`);
	log(`  Index written to: ${ITEMS_INDEX_PATH}`);
}

/**
 * Generate manuals index from existing manual JSON files and raw index
 */
async function generateManualsIndex(): Promise<void> {
	console.log("\n=== Generating Manuals Index ===\n");

	// Get list of manual files (excluding index.json)
	const manualFiles = readdirSync(MANUALS_PATH)
		.filter((f) => f.endsWith(".json") && f !== "index.json");

	console.log(`Found ${manualFiles.length} manual files`);

	// Try to load raw index for invalid ranges
	let rawIndex: RawManualIndex | null = null;
	if (existsSync(RAW_MANUALS_INDEX_PATH)) {
		try {
			rawIndex = JSON.parse(readFileSync(RAW_MANUALS_INDEX_PATH, "utf-8")) as RawManualIndex;
			console.log(`Loaded raw index with ${rawIndex.invalidRanges?.length || 0} invalid ranges`);
		} catch (err) {
			console.warn(`  Warning: Could not load raw index: ${err}`);
		}
	}

	const now = new Date().toISOString();
	const manuals: Record<string, ManualStatus> = {};
	let processed = 0;
	let errors = 0;

	// Process existing manual files
	for (const file of manualFiles) {
		const id = file.replace(".json", "");
		const filePath = join(MANUALS_PATH, file);

		try {
			const data = JSON.parse(readFileSync(filePath, "utf-8")) as ManualFile;
			const name = data.name?.ja || data.name?.en || "";

			manuals[id] = {
				hasPage: true,
				checkedAt: now,
				name: name || undefined,
			};

			processed++;
			if (processed % 500 === 0) {
				console.log(`  Processed ${processed}/${manualFiles.length}...`);
			}
		} catch (err) {
			console.error(`  Error reading ${file}: ${err}`);
			errors++;
		}
	}

	// Migrate invalid ranges from raw index
	const invalidRanges: InvalidRange[] = [];
	if (rawIndex?.invalidRanges) {
		for (const range of rawIndex.invalidRanges) {
			invalidRanges.push({
				start: range.start,
				end: range.end,
				checkedAt: range.lastChecked || now,
			});
		}
	}

	// Migrate invalid singles as single-ID ranges
	if (rawIndex?.invalidSingles) {
		for (const id of rawIndex.invalidSingles) {
			invalidRanges.push({
				start: id,
				end: id,
				checkedAt: now,
			});
		}
	}

	// Merge overlapping ranges
	const mergedRanges = mergeInvalidRanges(invalidRanges);

	// Count IDs in invalid ranges
	const invalidRangeCount = mergedRanges.reduce(
		(total, range) => total + (range.end - range.start + 1),
		0
	);

	const index: ManualsIndex = {
		version: "1.0.0",
		updatedAt: now,
		stats: {
			totalChecked: Object.keys(manuals).length + invalidRangeCount,
			withPage: Object.keys(manuals).length,
			withoutPage: invalidRangeCount,
			errors: 0,
		},
		manuals,
		invalidRanges: mergedRanges,
	};

	if (!DRY_RUN) {
		writeFileSync(MANUALS_INDEX_PATH, JSON.stringify(index, null, "\t"));
	}

	console.log(`\n=== Manuals Index Complete ===`);
	console.log(`  Total manuals with pages: ${Object.keys(manuals).length}`);
	console.log(`  Invalid ranges: ${mergedRanges.length}`);
	console.log(`  IDs in invalid ranges: ${invalidRangeCount}`);
	console.log(`  Total checked: ${index.stats.totalChecked}`);
	console.log(`  Errors: ${errors}`);
	log(`  Index written to: ${MANUALS_INDEX_PATH}`);
}

/**
 * Merge overlapping or adjacent invalid ranges
 */
function mergeInvalidRanges(ranges: InvalidRange[]): InvalidRange[] {
	if (ranges.length <= 1) {
		return ranges;
	}

	// Sort by start
	const sorted = [...ranges].sort((a, b) => a.start - b.start);
	const merged: InvalidRange[] = [sorted[0]];

	for (let i = 1; i < sorted.length; i++) {
		const current = sorted[i];
		const last = merged[merged.length - 1];

		// Check if ranges overlap or are adjacent
		if (current.start <= last.end + 1) {
			// Merge: extend the last range
			last.end = Math.max(last.end, current.end);
			// Use the more recent checkedAt
			if (current.checkedAt > last.checkedAt) {
				last.checkedAt = current.checkedAt;
			}
		} else {
			// No overlap, add as new range
			merged.push(current);
		}
	}

	return merged;
}

async function main() {
	console.log("=== Index Generation Script ===");
	if (DRY_RUN) {
		console.log("Running in DRY-RUN mode - no files will be written\n");
	}

	if (!MANUALS_ONLY) {
		await generateItemsIndex();
	}

	if (!ITEMS_ONLY) {
		await generateManualsIndex();
	}

	console.log("\n=== Done ===");
}

main().catch(console.error);
