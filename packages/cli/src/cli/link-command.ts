#!/usr/bin/env tsx
/**
 * Link command - Establish and propagate relationships between items, manuals, and P-Bandai
 *
 * This command:
 * 1. Ensures all image hashes are populated
 * 2. Performs image deduplication
 * 3. Creates bidirectional links between items, manuals, and P-Bandai US items using image hashes
 * 4. Propagates relationships across all three data sources
 *
 * Usage:
 *   pnpm link [options]
 *
 * Options:
 *   --dry-run        Show what would be done without making changes
 *   --verbose        Show detailed output
 *   --skip-hashes    Skip hash population step
 *   --skip-dedup     Skip deduplication step
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Directories
const ITEMS_DATA_DIR = "data/src/items";
const MANUALS_DATA_DIR = "data/src/manuals";
const MANUALS_ASSETS_DIR = "assets/manuals";
const PBANDAI_DATA_DIR = "data/src/pbandai/en/items";
const PBANDAI_ASSETS_DIR = "assets/pbandai/en/items";

export interface LinkOptions {
	dryRun: boolean;
	verbose: boolean;
	skipHashes: boolean;
	skipDedup: boolean;
}

interface LinkStats {
	hashesPopulated: number;
	duplicatesFound: number;
	duplicatesRemoved: number;
	bytesReclaimed: number;
	itemToManualLinks: number;
	manualToItemLinks: number;
	itemToPBandaiLinks: number;
	pbandaiToItemLinks: number;
	errors: number;
}

interface ImageWithHash {
	src?: string;
	path?: string;
	hash?: string;
}

interface ItemData {
	id: string;
	images?: {
		product: ImageWithHash[];
		instructions: ImageWithHash[];
	};
	manualIds?: string[];
	pbandaiIds?: string[];
}

interface ManualData {
	id: string;
	image?: ImageWithHash;
	itemIds?: string[];
}

interface PBandaiData {
	id: string;
	images: Array<{ order: number; src?: string; path: string; hash?: string }>;
	linkedItemIds?: string[];
}

/**
 * Calculate MD5 hash of a file
 */
async function calculateFileHash(filePath: string): Promise<string | null> {
	try {
		const content = await readFile(filePath);
		return createHash("md5").update(content).digest("hex");
	} catch {
		return null;
	}
}

/**
 * Build hash index from all item images
 */
function buildItemHashIndex(verbose: boolean): Map<string, { path: string; itemId: string }> {
	const index = new Map<string, { path: string; itemId: string }>();

	const itemFiles = readdirSync(ITEMS_DATA_DIR)
		.filter(f => f.endsWith(".json") && f.startsWith("01_"))
		.toSorted();

	if (verbose) console.log(`Building hash index from ${itemFiles.length} item files...`);

	for (const file of itemFiles) {
		try {
			const content = readFileSync(path.join(ITEMS_DATA_DIR, file), "utf8");
			const item = JSON.parse(content) as ItemData;

			if (!item.images) continue;

			const allImages = [...item.images.product, ...item.images.instructions];
			for (const img of allImages) {
				if (img.hash && img.path) {
					index.set(img.hash, { path: img.path, itemId: item.id });
				}
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	if (verbose) console.log(`  Indexed ${index.size} unique image hashes`);
	return index;
}

/**
 * Populate missing hashes for item images
 */
async function populateItemHashes(options: LinkOptions): Promise<number> {
	let populated = 0;

	const itemFiles = readdirSync(ITEMS_DATA_DIR)
		.filter(f => f.endsWith(".json") && f.startsWith("01_"))
		.toSorted();

	if (options.verbose) console.log(`Checking ${itemFiles.length} item files for missing hashes...`);

	for (const file of itemFiles) {
		const jsonPath = path.join(ITEMS_DATA_DIR, file);

		try {
			const content = readFileSync(jsonPath, "utf8");
			const item = JSON.parse(content) as ItemData;

			if (!item.images) continue;

			let modified = false;
			const allImages = [...item.images.product, ...item.images.instructions];

			for (const img of allImages) {
				if (img.path && !img.hash) {
					// Convert path to actual file path
					const assetPath = path.join("assets", img.path.replace(/^\//, ""));
					if (existsSync(assetPath)) {
						const hash = await calculateFileHash(assetPath);
						if (hash) {
							img.hash = hash;
							modified = true;
							populated++;
							if (options.verbose) {
								console.log(`  ${item.id}: Added hash for ${path.basename(img.path)}`);
							}
						}
					}
				}
			}

			if (modified && !options.dryRun) {
				writeFileSync(jsonPath, JSON.stringify(item, null, "\t") + "\n");
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	return populated;
}

/**
 * Populate missing hashes for manual images
 */
async function populateManualHashes(options: LinkOptions): Promise<number> {
	let populated = 0;

	const manualFiles = readdirSync(MANUALS_DATA_DIR)
		.filter(f => f.endsWith(".json") && f !== "index.json")
		.toSorted();

	if (options.verbose) console.log(`Checking ${manualFiles.length} manual files for missing hashes...`);

	for (const file of manualFiles) {
		const jsonPath = path.join(MANUALS_DATA_DIR, file);
		const manualId = file.replace(".json", "");

		try {
			const content = readFileSync(jsonPath, "utf8");
			const manual = JSON.parse(content) as ManualData;

			if (!manual.image?.path || manual.image.hash) continue;

			// Try to find the image file
			const manualDir = path.join(MANUALS_ASSETS_DIR, manualId.padStart(4, "0"));
			if (!existsSync(manualDir)) continue;

			const imageFiles = readdirSync(manualDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
			if (imageFiles.length === 0) continue;

			// Use the first image (should match path)
			const imagePath = path.join(manualDir, imageFiles[0]);
			const hash = await calculateFileHash(imagePath);

			if (hash) {
				manual.image.hash = hash;
				populated++;

				if (options.verbose) {
					console.log(`  Manual ${manualId}: Added hash`);
				}

				if (!options.dryRun) {
					writeFileSync(jsonPath, JSON.stringify(manual, null, "\t") + "\n");
				}
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	return populated;
}

/**
 * Populate missing hashes for P-Bandai images
 */
async function populatePBandaiHashes(options: LinkOptions): Promise<number> {
	let populated = 0;

	if (!existsSync(PBANDAI_DATA_DIR)) return 0;

	const itemFiles = readdirSync(PBANDAI_DATA_DIR)
		.filter(f => f.endsWith(".json") && f !== "index.json")
		.toSorted();

	if (options.verbose) console.log(`Checking ${itemFiles.length} P-Bandai files for missing hashes...`);

	for (const file of itemFiles) {
		const jsonPath = path.join(PBANDAI_DATA_DIR, file);
		const pbandaiId = file.replace(".json", "");

		try {
			const content = readFileSync(jsonPath, "utf8");
			const item = JSON.parse(content) as PBandaiData;

			let modified = false;

			for (const img of item.images) {
				if (img.path && !img.hash) {
					// Convert path to actual file path
					const assetPath = path.join(PBANDAI_ASSETS_DIR, pbandaiId, path.basename(img.path));
					if (existsSync(assetPath)) {
						const hash = await calculateFileHash(assetPath);
						if (hash) {
							img.hash = hash;
							modified = true;
							populated++;
							if (options.verbose) {
								console.log(`  P-Bandai ${pbandaiId}: Added hash for image ${img.order}`);
							}
						}
					}
				}
			}

			if (modified && !options.dryRun) {
				writeFileSync(jsonPath, JSON.stringify(item, null, "\t") + "\n");
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	return populated;
}

/**
 * Link manuals to items based on image hash matching
 */
function linkManualsToItems(
	hashIndex: Map<string, { path: string; itemId: string }>,
	options: LinkOptions,
): { manualToItem: number; itemToManual: number; duplicatesRemoved: number; bytesReclaimed: number } {
	let manualToItem = 0;
	let itemToManual = 0;
	let duplicatesRemoved = 0;
	let bytesReclaimed = 0;

	const manualFiles = readdirSync(MANUALS_DATA_DIR)
		.filter(f => f.endsWith(".json") && f !== "index.json")
		.toSorted();

	if (options.verbose) console.log(`Linking ${manualFiles.length} manuals to items...`);

	// Track item updates to batch them
	const itemUpdates = new Map<string, Set<string>>(); // itemId -> Set<manualId>

	for (const file of manualFiles) {
		const jsonPath = path.join(MANUALS_DATA_DIR, file);
		const manualId = file.replace(".json", "");

		try {
			const content = readFileSync(jsonPath, "utf8");
			const manual = JSON.parse(content) as ManualData;

			if (!manual.image?.hash) continue;

			const match = hashIndex.get(manual.image.hash);
			if (!match) continue;

			const { path: existingPath, itemId } = match;
			let modified = false;

			// Update manual's itemIds
			const existingItemIds = manual.itemIds ?? [];
			if (!existingItemIds.includes(itemId)) {
				if (!options.dryRun) {
					manual.itemIds = [...existingItemIds, itemId];
					modified = true;
				}
				manualToItem++;

				if (options.verbose) {
					console.log(`  Manual ${manualId} -> Item ${itemId}`);
				}
			}

			// Track item update
			if (!itemUpdates.has(itemId)) {
				itemUpdates.set(itemId, new Set());
			}
			itemUpdates.get(itemId)!.add(manualId);

			// Update image path to reference existing item image
			if (manual.image.path !== existingPath) {
				const oldPath = manual.image.path;
				if (!options.dryRun) {
					manual.image.path = existingPath;
					modified = true;
				}

				// Delete duplicate file
				if (oldPath) {
					const manualImagePath = path.join(
						MANUALS_ASSETS_DIR,
						manualId.padStart(4, "0"),
						path.basename(oldPath),
					);
					if (existsSync(manualImagePath) && !options.dryRun) {
						const fileSize = statSync(manualImagePath).size;
						unlinkSync(manualImagePath);
						duplicatesRemoved++;
						bytesReclaimed += fileSize;
					}
				}
			}

			if (modified && !options.dryRun) {
				writeFileSync(jsonPath, JSON.stringify(manual, null, "\t") + "\n");
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	// Apply item updates
	for (const [itemId, manualIds] of itemUpdates) {
		const itemPath = path.join(ITEMS_DATA_DIR, `${itemId}.json`);
		if (!existsSync(itemPath)) continue;

		try {
			const content = readFileSync(itemPath, "utf8");
			const item = JSON.parse(content) as ItemData;

			const existingManualIds = item.manualIds ?? [];
			const newManualIds = [...manualIds].filter(id => !existingManualIds.includes(id));

			if (newManualIds.length > 0) {
				if (!options.dryRun) {
					item.manualIds = [...existingManualIds, ...newManualIds];
					writeFileSync(itemPath, JSON.stringify(item, null, "\t") + "\n");
				}
				itemToManual += newManualIds.length;
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	return { manualToItem, itemToManual, duplicatesRemoved, bytesReclaimed };
}

/**
 * Link P-Bandai items to items based on image hash matching
 */
function linkPBandaiToItems(
	hashIndex: Map<string, { path: string; itemId: string }>,
	options: LinkOptions,
): { pbandaiToItem: number; itemToPBandai: number; duplicatesRemoved: number; bytesReclaimed: number } {
	let pbandaiToItem = 0;
	let itemToPBandai = 0;
	let duplicatesRemoved = 0;
	let bytesReclaimed = 0;

	if (!existsSync(PBANDAI_DATA_DIR)) return { pbandaiToItem, itemToPBandai, duplicatesRemoved, bytesReclaimed };

	const pbandaiFiles = readdirSync(PBANDAI_DATA_DIR)
		.filter(f => f.endsWith(".json") && f !== "index.json")
		.toSorted();

	if (options.verbose) console.log(`Linking ${pbandaiFiles.length} P-Bandai items to items...`);

	// Track item updates to batch them
	const itemUpdates = new Map<string, Set<string>>(); // itemId -> Set<pbandaiId>

	for (const file of pbandaiFiles) {
		const jsonPath = path.join(PBANDAI_DATA_DIR, file);
		const pbandaiId = file.replace(".json", "");

		try {
			const content = readFileSync(jsonPath, "utf8");
			const pbandai = JSON.parse(content) as PBandaiData;

			let modified = false;
			const discoveredItemIds = new Set<string>();

			for (const img of pbandai.images) {
				if (!img.hash) continue;

				const match = hashIndex.get(img.hash);
				if (!match) continue;

				const { path: existingPath, itemId } = match;
				discoveredItemIds.add(itemId);

				// Update image path to reference existing item image
				if (img.path !== existingPath) {
					const oldPath = img.path;
					if (!options.dryRun) {
						img.path = existingPath;
						modified = true;
					}

					// Delete duplicate file
					const pbandaiImagePath = path.join(PBANDAI_ASSETS_DIR, pbandaiId, path.basename(oldPath));
					if (existsSync(pbandaiImagePath) && !options.dryRun) {
						const fileSize = statSync(pbandaiImagePath).size;
						unlinkSync(pbandaiImagePath);
						duplicatesRemoved++;
						bytesReclaimed += fileSize;
					}
				}
			}

			// Update P-Bandai's linkedItemIds
			if (discoveredItemIds.size > 0) {
				const existingIds = pbandai.linkedItemIds ?? [];
				const newIds = [...discoveredItemIds].filter(id => !existingIds.includes(id));

				if (newIds.length > 0) {
					if (!options.dryRun) {
						pbandai.linkedItemIds = [...existingIds, ...newIds];
						modified = true;
					}
					pbandaiToItem += newIds.length;

					if (options.verbose) {
						console.log(`  P-Bandai ${pbandaiId} -> Items: ${newIds.join(", ")}`);
					}

					// Track item updates
					for (const itemId of newIds) {
						if (!itemUpdates.has(itemId)) {
							itemUpdates.set(itemId, new Set());
						}
						itemUpdates.get(itemId)!.add(pbandaiId);
					}
				}
			}

			if (modified && !options.dryRun) {
				writeFileSync(jsonPath, JSON.stringify(pbandai, null, "\t") + "\n");
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	// Apply item updates
	for (const [itemId, pbandaiIds] of itemUpdates) {
		const itemPath = path.join(ITEMS_DATA_DIR, `${itemId}.json`);
		if (!existsSync(itemPath)) continue;

		try {
			const content = readFileSync(itemPath, "utf8");
			const item = JSON.parse(content) as ItemData;

			const existingPBandaiIds = item.pbandaiIds ?? [];
			const newPBandaiIds = [...pbandaiIds].filter(id => !existingPBandaiIds.includes(id));

			if (newPBandaiIds.length > 0) {
				if (!options.dryRun) {
					item.pbandaiIds = [...existingPBandaiIds, ...newPBandaiIds];
					writeFileSync(itemPath, JSON.stringify(item, null, "\t") + "\n");
				}
				itemToPBandai += newPBandaiIds.length;
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	return { pbandaiToItem, itemToPBandai, duplicatesRemoved, bytesReclaimed };
}

function formatBytes(bytes: number): string {
	const KB = 1024;
	const MB = KB * 1024;
	if (bytes < KB) return `${bytes} B`;
	if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
	return `${(bytes / MB).toFixed(1)} MB`;
}

export async function linkData(options: LinkOptions): Promise<LinkStats> {
	const stats: LinkStats = {
		hashesPopulated: 0,
		duplicatesFound: 0,
		duplicatesRemoved: 0,
		bytesReclaimed: 0,
		itemToManualLinks: 0,
		manualToItemLinks: 0,
		itemToPBandaiLinks: 0,
		pbandaiToItemLinks: 0,
		errors: 0,
	};

	console.log("Link Command - Establish Data Relationships");
	console.log("============================================");
	console.log(`Mode: ${options.dryRun ? "DRY RUN" : "LIVE"}`);
	console.log();

	// Step 1: Populate missing image hashes
	if (!options.skipHashes) {
		console.log("Step 1: Populating missing image hashes...");

		const itemHashes = await populateItemHashes(options);
		const manualHashes = await populateManualHashes(options);
		const pbandaiHashes = await populatePBandaiHashes(options);

		stats.hashesPopulated = itemHashes + manualHashes + pbandaiHashes;
		console.log(`  Items: ${itemHashes}, Manuals: ${manualHashes}, P-Bandai: ${pbandaiHashes}`);
		console.log();
	}

	// Step 2: Build hash index from items (authoritative source)
	console.log("Step 2: Building hash index from item assets...");
	const hashIndex = buildItemHashIndex(options.verbose);
	console.log();

	// Step 3: Link manuals to items
	if (!options.skipDedup) {
		console.log("Step 3: Linking manuals to items...");
		const manualResults = linkManualsToItems(hashIndex, options);
		stats.manualToItemLinks = manualResults.manualToItem;
		stats.itemToManualLinks = manualResults.itemToManual;
		stats.duplicatesRemoved += manualResults.duplicatesRemoved;
		stats.bytesReclaimed += manualResults.bytesReclaimed;
		console.log(`  Manual -> Item: ${manualResults.manualToItem}, Item -> Manual: ${manualResults.itemToManual}`);
		console.log();

		// Step 4: Link P-Bandai to items
		console.log("Step 4: Linking P-Bandai items to items...");
		const pbandaiResults = linkPBandaiToItems(hashIndex, options);
		stats.pbandaiToItemLinks = pbandaiResults.pbandaiToItem;
		stats.itemToPBandaiLinks = pbandaiResults.itemToPBandai;
		stats.duplicatesRemoved += pbandaiResults.duplicatesRemoved;
		stats.bytesReclaimed += pbandaiResults.bytesReclaimed;
		console.log(`  P-Bandai -> Item: ${pbandaiResults.pbandaiToItem}, Item -> P-Bandai: ${pbandaiResults.itemToPBandai}`);
		console.log();
	}

	// Summary
	console.log("============================================");
	console.log("Summary:");
	console.log(`  Hashes populated: ${stats.hashesPopulated}`);
	console.log(`  Manual <-> Item links: ${stats.manualToItemLinks} / ${stats.itemToManualLinks}`);
	console.log(`  P-Bandai <-> Item links: ${stats.pbandaiToItemLinks} / ${stats.itemToPBandaiLinks}`);
	console.log(`  Duplicate files removed: ${stats.duplicatesRemoved}`);
	console.log(`  Space reclaimed: ${formatBytes(stats.bytesReclaimed)}`);

	if (options.dryRun) {
		console.log("\n(Dry run - no changes made. Remove --dry-run to apply changes.)");
	}

	return stats;
}

// CLI entry point when run directly
const currentFile = new URL(import.meta.url).pathname;
const executedFile = process.argv[1];
if (currentFile === executedFile) {
	const args = new Set(process.argv.slice(2));

	const options: LinkOptions = {
		dryRun: args.has("--dry-run"),
		verbose: args.has("--verbose"),
		skipHashes: args.has("--skip-hashes"),
		skipDedup: args.has("--skip-dedup"),
	};

	try {
		await linkData(options);
	} catch (error: unknown) {
		console.error("Fatal error:", error);
		process.exit(1);
	}
}
