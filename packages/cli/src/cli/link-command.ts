#!/usr/bin/env tsx
/**
 * Link command - Establish and propagate relationships between items, manuals, and P-Bandai US
 *
 * This command:
 * 1. Ensures all image hashes are populated across items, manuals, and P-Bandai US
 * 2. Performs image deduplication (removes duplicate images, points to canonical item images)
 * 3. Creates bidirectional links between items, manuals, and P-Bandai US items using image hashes
 * 4. Propagates transitive relationships (Manual ↔ P-Bandai US through Item hub)
 *
 * Relationship structure (all arrays use EntityRef objects with {id, url}):
 *    - Items get: manual (singular ManualRef), pbandaiUs[] (EntityRef[])
 *    - Manuals get: items[] (EntityRef[]), pbandaiUs[] (transitive EntityRef[])
 *    - P-Bandai US get: items[] (EntityRef[]), manuals[] (transitive EntityRef[])
 *
 * Usage:
 *   pnpm link-data [options]
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

// Constants
const INDEX_JSON = "index.json";

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
	itemToPBandaiUsLinks: number; // P-Bandai US
	pbandaiUsToItemLinks: number; // P-Bandai US
	// Transitive links (through item hub)
	manualToPBandaiUsLinks: number;
	pbandaiUsToManualLinks: number;
	errors: number;
}

interface ImageWithHash {
	src?: string;
	path?: string;
	hash?: string;
}

interface ManualRef {
	id: string;
	url: string;
}

interface ItemData {
	id: string;
	images?: {
		product: ImageWithHash[];
		instructions: ImageWithHash[];
	};
	manual?: ManualRef; // Singular - each item has at most one manual
	pbandaiUs?: EntityRef[]; // P-Bandai US items (separate from future pbandaiJp)
}

interface EntityRef {
	id: string;
	url: string;
}

interface ManualData {
	id: string;
	image?: ImageWithHash;
	items?: EntityRef[];
	pbandaiUs?: EntityRef[]; // Transitive: P-Bandai US items for the same linked items
}

interface PBandaiData {
	id: string;
	images: Array<{ order: number; src?: string; path: string; hash?: string }>;
	items?: EntityRef[];
	manuals?: EntityRef[]; // Transitive: manuals for the same linked items
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
		.filter(f => f.endsWith(".json") && f !== INDEX_JSON)
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

			const imageFile_ = readdirSync(manualDir).find(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
			const imageFile = imageFile_;
			if (!imageFile) continue;

			// Use the first image (should match path)
			const imagePath = path.join(manualDir, imageFile);
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
		.filter(f => f.endsWith(".json") && f !== INDEX_JSON)
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
		.filter(f => f.endsWith(".json") && f !== INDEX_JSON)
		.toSorted();

	if (options.verbose) console.log(`Linking ${manualFiles.length} manuals to items...`);

	// Track item updates to batch them (singular - each item has at most one manual)
	const itemUpdates = new Map<string, ManualRef>(); // itemId -> ManualRef

	for (const file of manualFiles) {
		const jsonPath = path.join(MANUALS_DATA_DIR, file);
		const manualId = file.replace(".json", "");

		try {
			const content = readFileSync(jsonPath, "utf8");
			const manual = JSON.parse(content) as ManualData & { sourceUrl?: string };

			if (!manual.image?.hash) continue;

			const match = hashIndex.get(manual.image.hash);
			if (!match) continue;

			const { path: existingPath, itemId } = match;
			let modified = false;

			// Build item reference
			const itemRef: EntityRef = {
				id: itemId,
				url: `https://bandai-hobby.net/item/${itemId}/`,
			};

			// Update manual's items array
			const existingItems = manual.items ?? [];
			if (!existingItems.some(i => i.id === itemId)) {
				if (!options.dryRun) {
					manual.items = [...existingItems, itemRef];
					modified = true;
				}
				manualToItem++;

				if (options.verbose) {
					console.log(`  Manual ${manualId} -> Item ${itemId}`);
				}
			}

			// Track item update (only if not already tracked - first match wins)
			if (!itemUpdates.has(itemId)) {
				// Use manual's id (canonical unpadded format) and sourceUrl
				const canonicalId = manual.id;
				const url = manual.sourceUrl ?? `https://manual.bandai-hobby.net/menus/detail/${canonicalId}/`;
				itemUpdates.set(itemId, { id: canonicalId, url });
			}

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

	// Apply item updates (set singular manual property)
	for (const [itemId, manualRef] of itemUpdates) {
		const itemPath = path.join(ITEMS_DATA_DIR, `${itemId}.json`);
		if (!existsSync(itemPath)) continue;

		try {
			const content = readFileSync(itemPath, "utf8");
			const item = JSON.parse(content) as ItemData;

			// Only set if item doesn't already have a manual (preserve existing)
			if (!item.manual) {
				if (!options.dryRun) {
					item.manual = manualRef;
					writeFileSync(itemPath, JSON.stringify(item, null, "\t") + "\n");
				}
				itemToManual++;

				if (options.verbose) {
					console.log(`  Item ${itemId} -> Manual ${manualRef.id}`);
				}
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	return { manualToItem, itemToManual, duplicatesRemoved, bytesReclaimed };
}

/**
 * Link P-Bandai US items to items based on image hash matching
 */
function linkPBandaiUsToItems(
	hashIndex: Map<string, { path: string; itemId: string }>,
	options: LinkOptions,
): { pbandaiUsToItem: number; itemToPBandaiUs: number; duplicatesRemoved: number; bytesReclaimed: number } {
	let pbandaiUsToItem = 0;
	let itemToPBandaiUs = 0;
	let duplicatesRemoved = 0;
	let bytesReclaimed = 0;

	if (!existsSync(PBANDAI_DATA_DIR)) return { pbandaiUsToItem, itemToPBandaiUs, duplicatesRemoved, bytesReclaimed };

	const pbandaiFiles = readdirSync(PBANDAI_DATA_DIR)
		.filter(f => f.endsWith(".json") && f !== INDEX_JSON)
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

			// Update P-Bandai's items array
			if (discoveredItemIds.size > 0) {
				const existingItems = pbandai.items ?? [];
				const existingItemIds = new Set(existingItems.map(i => i.id));
				const newItemIds = [...discoveredItemIds].filter(id => !existingItemIds.has(id));

				if (newItemIds.length > 0) {
					const newItemRefs = newItemIds.map(id => ({
						id,
						url: `https://bandai-hobby.net/item/${id}/`,
					}));
					if (!options.dryRun) {
						pbandai.items = [...existingItems, ...newItemRefs];
						modified = true;
					}
					pbandaiUsToItem += newItemIds.length;

					if (options.verbose) {
						console.log(`  P-Bandai ${pbandaiId} -> Items: ${newItemIds.join(", ")}`);
					}
				}

				// Track item updates for ALL discovered items (not just new ones)
				// This ensures items get pbandaiUs even if P-Bandai already has items
				for (const itemId of discoveredItemIds) {
					const pbandaiSet = itemUpdates.get(itemId) ?? new Set<string>();
					pbandaiSet.add(pbandaiId);
					itemUpdates.set(itemId, pbandaiSet);
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
	for (const [itemId, pbandaiUsIdSet] of itemUpdates) {
		const itemPath = path.join(ITEMS_DATA_DIR, `${itemId}.json`);
		if (!existsSync(itemPath)) continue;

		try {
			const content = readFileSync(itemPath, "utf8");
			const item = JSON.parse(content) as ItemData;

			const existingPBandaiUs = item.pbandaiUs ?? [];
			const existingIds = new Set(existingPBandaiUs.map(p => p.id));
			const newPBandaiUsIds = [...pbandaiUsIdSet].filter(id => !existingIds.has(id));

			if (newPBandaiUsIds.length > 0) {
				const newPBandaiUsRefs = newPBandaiUsIds.map(id => ({
					id,
					url: `https://p-bandai.com/us/item/${id}`,
				}));
				if (!options.dryRun) {
					item.pbandaiUs = [...existingPBandaiUs, ...newPBandaiUsRefs];
					writeFileSync(itemPath, JSON.stringify(item, null, "\t") + "\n");
				}
				itemToPBandaiUs += newPBandaiUsIds.length;
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	return { pbandaiUsToItem, itemToPBandaiUs, duplicatesRemoved, bytesReclaimed };
}

/**
 * Propagate transitive relationships through the item hub
 * Manual ↔ Item ↔ P-Bandai US becomes Manual ↔ P-Bandai US
 */
function propagateTransitiveLinks(
	options: LinkOptions,
): { manualToPBandaiUs: number; pbandaiUsToManual: number } {
	let manualToPBandaiUs = 0;
	let pbandaiUsToManual = 0;

	// Step 1: Build item relationship map
	const itemRelations = new Map<string, { manualId?: string; pbandaiUs: EntityRef[] }>();

	const itemFiles = readdirSync(ITEMS_DATA_DIR)
		.filter(f => f.endsWith(".json") && f.startsWith("01_"))
		.toSorted();

	for (const file of itemFiles) {
		try {
			const content = readFileSync(path.join(ITEMS_DATA_DIR, file), "utf8");
			const item = JSON.parse(content) as ItemData;

			if (item.manual?.id || item.pbandaiUs?.length) {
				itemRelations.set(item.id, {
					manualId: item.manual?.id,
					pbandaiUs: item.pbandaiUs ?? [],
				});
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	if (options.verbose) {
		console.log(`  Built relationship map for ${itemRelations.size} items with links`);
	}

	// Step 2: Update manuals with pbandaiUs (transitive through items)
	const manualFiles = readdirSync(MANUALS_DATA_DIR)
		.filter(f => f.endsWith(".json") && f !== INDEX_JSON)
		.toSorted();

	for (const file of manualFiles) {
		const jsonPath = path.join(MANUALS_DATA_DIR, file);

		try {
			const content = readFileSync(jsonPath, "utf8");
			const manual = JSON.parse(content) as ManualData;

			if (!manual.items?.length) continue;

			// Collect all pbandaiUs refs from linked items
			const allPBandaiUsRefs = new Map<string, EntityRef>();
			for (const itemRef of manual.items) {
				const relations = itemRelations.get(itemRef.id);
				if (relations?.pbandaiUs) {
					for (const pbRef of relations.pbandaiUs) {
						allPBandaiUsRefs.set(pbRef.id, pbRef);
					}
				}
			}

			if (allPBandaiUsRefs.size === 0) continue;

			// Check for new links
			const existingRefs = manual.pbandaiUs ?? [];
			const existingIds = new Set(existingRefs.map(r => r.id));
			const newRefs = [...allPBandaiUsRefs.values()].filter(r => !existingIds.has(r.id));

			if (newRefs.length > 0) {
				if (!options.dryRun) {
					manual.pbandaiUs = [...existingRefs, ...newRefs].toSorted((a, b) => a.id.localeCompare(b.id));
					writeFileSync(jsonPath, JSON.stringify(manual, null, "\t") + "\n");
				}
				manualToPBandaiUs += newRefs.length;

				if (options.verbose) {
					console.log(`  Manual ${manual.id} -> P-Bandai US: ${newRefs.map(r => r.id).join(", ")}`);
				}
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	// Step 3: Update P-Bandai US with manuals (transitive through items)
	if (!existsSync(PBANDAI_DATA_DIR)) {
		return { manualToPBandaiUs, pbandaiUsToManual };
	}

	const pbandaiFiles = readdirSync(PBANDAI_DATA_DIR)
		.filter(f => f.endsWith(".json") && f !== INDEX_JSON)
		.toSorted();

	for (const file of pbandaiFiles) {
		const jsonPath = path.join(PBANDAI_DATA_DIR, file);

		try {
			const content = readFileSync(jsonPath, "utf8");
			const pbandai = JSON.parse(content) as PBandaiData;

			if (!pbandai.items?.length) continue;

			// Collect all manual refs from linked items (each item has at most one manual)
			const allManualRefs = new Map<string, EntityRef>();
			for (const itemRef of pbandai.items) {
				const relations = itemRelations.get(itemRef.id);
				if (relations?.manualId) {
					allManualRefs.set(relations.manualId, {
						id: relations.manualId,
						url: `https://manual.bandai-hobby.net/menus/detail/${relations.manualId}/`,
					});
				}
			}

			if (allManualRefs.size === 0) continue;

			// Check for new links
			const existingRefs = pbandai.manuals ?? [];
			const existingIds = new Set(existingRefs.map(r => r.id));
			const newRefs = [...allManualRefs.values()].filter(r => !existingIds.has(r.id));

			if (newRefs.length > 0) {
				if (!options.dryRun) {
					pbandai.manuals = [...existingRefs, ...newRefs].toSorted((a, b) => a.id.localeCompare(b.id));
					writeFileSync(jsonPath, JSON.stringify(pbandai, null, "\t") + "\n");
				}
				pbandaiUsToManual += newRefs.length;

				if (options.verbose) {
					console.log(`  P-Bandai US ${pbandai.id} -> Manuals: ${newRefs.map(r => r.id).join(", ")}`);
				}
			}
		} catch {
			// Skip files that can't be parsed
		}
	}

	return { manualToPBandaiUs, pbandaiUsToManual };
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
		itemToPBandaiUsLinks: 0,
		pbandaiUsToItemLinks: 0,
		manualToPBandaiUsLinks: 0,
		pbandaiUsToManualLinks: 0,
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

		// Step 4: Link P-Bandai US to items
		console.log("Step 4: Linking P-Bandai US items to items...");
		const pbandaiUsResults = linkPBandaiUsToItems(hashIndex, options);
		stats.pbandaiUsToItemLinks = pbandaiUsResults.pbandaiUsToItem;
		stats.itemToPBandaiUsLinks = pbandaiUsResults.itemToPBandaiUs;
		stats.duplicatesRemoved += pbandaiUsResults.duplicatesRemoved;
		stats.bytesReclaimed += pbandaiUsResults.bytesReclaimed;
		console.log(`  P-Bandai US -> Item: ${pbandaiUsResults.pbandaiUsToItem}, Item -> P-Bandai US: ${pbandaiUsResults.itemToPBandaiUs}`);
		console.log();

		// Step 5: Propagate transitive relationships (Manual ↔ P-Bandai US through Item)
		console.log("Step 5: Propagating transitive relationships...");
		const transitiveResults = propagateTransitiveLinks(options);
		stats.manualToPBandaiUsLinks = transitiveResults.manualToPBandaiUs;
		stats.pbandaiUsToManualLinks = transitiveResults.pbandaiUsToManual;
		console.log(`  Manual -> P-Bandai US: ${transitiveResults.manualToPBandaiUs}, P-Bandai US -> Manual: ${transitiveResults.pbandaiUsToManual}`);
		console.log();
	}

	// Summary
	console.log("============================================");
	console.log("Summary:");
	console.log(`  Hashes populated: ${stats.hashesPopulated}`);
	console.log(`  Manual <-> Item links: ${stats.manualToItemLinks} / ${stats.itemToManualLinks}`);
	console.log(`  P-Bandai US <-> Item links: ${stats.pbandaiUsToItemLinks} / ${stats.itemToPBandaiUsLinks}`);
	console.log(`  Manual <-> P-Bandai US (transitive): ${stats.manualToPBandaiUsLinks} / ${stats.pbandaiUsToManualLinks}`);
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
