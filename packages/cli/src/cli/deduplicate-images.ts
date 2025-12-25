#!/usr/bin/env tsx
/**
 * Deduplicate images after the fact
 *
 * Scans manual and/or P-Bandai images, finds duplicates that exist in item assets
 * (the authoritative source), updates JSON files to reference existing paths,
 * and optionally deletes duplicate files.
 *
 * Usage:
 *   pnpm exec tsx packages/cli/src/cli/deduplicate-images.ts [options]
 *
 * Options:
 *   --manuals        Deduplicate manual images (default: true)
 *   --pbandai        Deduplicate P-Bandai US images (default: false)
 *   --dry-run        Show what would be done without making changes
 *   --keep-files     Update JSON but don't delete duplicate files
 *   --verbose        Show detailed output for each duplicate found
 *
 * Examples:
 *   # Deduplicate manual images (default)
 *   pnpm exec tsx packages/cli/src/cli/deduplicate-images.ts
 *
 *   # Dry run to see what would be deduplicated
 *   pnpm exec tsx packages/cli/src/cli/deduplicate-images.ts --dry-run
 *
 *   # Deduplicate both manuals and P-Bandai
 *   pnpm exec tsx packages/cli/src/cli/deduplicate-images.ts --manuals --pbandai
 */

import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ImageHashIndex } from "../utils/image-utils.js";

// Directories
const MANUALS_DATA_DIR = "data/src/manuals";
const MANUALS_ASSETS_DIR = "assets/manuals";
const PBANDAI_DATA_DIR = "data/src/pbandai/en/items";
const PBANDAI_ASSETS_DIR = "assets/pbandai/en/items";

interface DedupeStats {
	scanned: number;
	duplicatesFound: number;
	jsonUpdated: number;
	filesDeleted: number;
	bytesReclaimed: number;
	errors: number;
}

interface DedupeOptions {
	dryRun: boolean;
	keepFiles: boolean;
	verbose: boolean;
}

/**
 * Deduplicate manual images
 */
function deduplicateManuals(
	hashIndex: ImageHashIndex,
	options: DedupeOptions,
): DedupeStats {
	const stats: DedupeStats = {
		scanned: 0,
		duplicatesFound: 0,
		jsonUpdated: 0,
		filesDeleted: 0,
		bytesReclaimed: 0,
		errors: 0,
	};

	const manualFiles = readdirSync(MANUALS_DATA_DIR)
		.filter(f => f.endsWith(".json") && f !== "index.json")
		.toSorted();

	console.log(`Scanning ${manualFiles.length} manual JSON files...`);

	for (const file of manualFiles) {
		const jsonPath = path.join(MANUALS_DATA_DIR, file);
		const manualId = file.replace(".json", "");

		try {
			const content = readFileSync(jsonPath, "utf8");
			const manual = JSON.parse(content) as {
				image?: { src?: string; path?: string; hash?: string };
			};

			if (!manual.image?.path || !manual.image.hash) {
				continue;
			}

			stats.scanned++;

			// Check if this hash exists in item assets
			const existingPath = hashIndex.findByHash(manual.image.hash);

			if (existingPath && existingPath !== manual.image.path) {
				stats.duplicatesFound++;

				if (options.verbose) {
					console.log(`  Manual ${manualId}: ${manual.image.path} -> ${existingPath}`);
				}

				// Find the actual file path for the manual image
				const manualImagePath = path.join(MANUALS_ASSETS_DIR, manualId, path.basename(manual.image.path));

				if (!options.dryRun) {
					// Update JSON to reference existing path
					manual.image.path = existingPath;
					writeFileSync(jsonPath, JSON.stringify(manual, null, "\t") + "\n");
					stats.jsonUpdated++;

					// Delete duplicate file if it exists and we're not keeping files
					if (!options.keepFiles && existsSync(manualImagePath)) {
						const fileSize = statSync(manualImagePath).size;
						unlinkSync(manualImagePath);
						stats.filesDeleted++;
						stats.bytesReclaimed += fileSize;
					}
				}
			}
		} catch (error) {
			stats.errors++;
			if (options.verbose) {
				console.error(`  Error processing ${file}:`, error);
			}
		}
	}

	return stats;
}

/**
 * Deduplicate P-Bandai US images
 */
function deduplicatePBandai(
	hashIndex: ImageHashIndex,
	options: DedupeOptions,
): DedupeStats {
	const stats: DedupeStats = {
		scanned: 0,
		duplicatesFound: 0,
		jsonUpdated: 0,
		filesDeleted: 0,
		bytesReclaimed: 0,
		errors: 0,
	};

	if (!existsSync(PBANDAI_DATA_DIR)) {
		console.log("P-Bandai data directory not found, skipping...");
		return stats;
	}

	const itemFiles = readdirSync(PBANDAI_DATA_DIR)
		.filter(f => f.endsWith(".json") && f !== "index.json")
		.toSorted();

	console.log(`Scanning ${itemFiles.length} P-Bandai item JSON files...`);

	for (const file of itemFiles) {
		const jsonPath = path.join(PBANDAI_DATA_DIR, file);
		const itemId = file.replace(".json", "");

		try {
			const content = readFileSync(jsonPath, "utf8");
			const item = JSON.parse(content) as {
				id: string;
				images: Array<{ order: number; src?: string; path: string; hash?: string }>;
			};

			let itemModified = false;

			for (const img of item.images) {
				if (!img.path || !img.hash) continue;

				stats.scanned++;

				// Check if this hash exists in item assets
				const existingPath = hashIndex.findByHash(img.hash);

				if (existingPath && existingPath !== img.path) {
					stats.duplicatesFound++;

					if (options.verbose) {
						console.log(`  P-Bandai ${itemId}: ${img.path} -> ${existingPath}`);
					}

					// Find the actual file path
					const imagePath = path.join(PBANDAI_ASSETS_DIR, itemId, path.basename(img.path));

					if (!options.dryRun) {
						// Update image to reference existing path
						img.path = existingPath;
						itemModified = true;

						// Delete duplicate file if it exists and we're not keeping files
						if (!options.keepFiles && existsSync(imagePath)) {
							const fileSize = statSync(imagePath).size;
							unlinkSync(imagePath);
							stats.filesDeleted++;
							stats.bytesReclaimed += fileSize;
						}
					}
				}
			}

			if (itemModified && !options.dryRun) {
				writeFileSync(jsonPath, JSON.stringify(item, null, "\t") + "\n");
				stats.jsonUpdated++;
			}
		} catch (error) {
			stats.errors++;
			if (options.verbose) {
				console.error(`  Error processing ${file}:`, error);
			}
		}
	}

	return stats;
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function main(): Promise<void> {
	const args = new Set(process.argv.slice(2));

	const options: DedupeOptions = {
		dryRun: args.has("--dry-run"),
		keepFiles: args.has("--keep-files"),
		verbose: args.has("--verbose"),
	};

	// Default to manuals if neither specified
	const doManuals = args.has("--manuals") || (!args.has("--pbandai"));
	const doPBandai = args.has("--pbandai");

	console.log("Image Deduplication Tool");
	console.log("========================");
	console.log(`Mode: ${options.dryRun ? "DRY RUN" : "LIVE"}`);
	console.log(`Targets: ${[doManuals && "manuals", doPBandai && "pbandai"].filter(Boolean).join(", ")}`);
	if (options.keepFiles) console.log("Keep files: yes (only update JSON)");
	console.log();

	// Build hash index from item assets (authoritative source)
	console.log("Building hash index from item assets...");
	const hashIndex = new ImageHashIndex();
	await hashIndex.initialize();
	console.log();

	const totalStats: DedupeStats = {
		scanned: 0,
		duplicatesFound: 0,
		jsonUpdated: 0,
		filesDeleted: 0,
		bytesReclaimed: 0,
		errors: 0,
	};

	if (doManuals) {
		console.log("=== Deduplicating Manual Images ===");
		const manualStats = deduplicateManuals(hashIndex, options);
		totalStats.scanned += manualStats.scanned;
		totalStats.duplicatesFound += manualStats.duplicatesFound;
		totalStats.jsonUpdated += manualStats.jsonUpdated;
		totalStats.filesDeleted += manualStats.filesDeleted;
		totalStats.bytesReclaimed += manualStats.bytesReclaimed;
		totalStats.errors += manualStats.errors;
		console.log(`  Scanned: ${manualStats.scanned}, Duplicates: ${manualStats.duplicatesFound}`);
		console.log();
	}

	if (doPBandai) {
		console.log("=== Deduplicating P-Bandai Images ===");
		const pbandaiStats = deduplicatePBandai(hashIndex, options);
		totalStats.scanned += pbandaiStats.scanned;
		totalStats.duplicatesFound += pbandaiStats.duplicatesFound;
		totalStats.jsonUpdated += pbandaiStats.jsonUpdated;
		totalStats.filesDeleted += pbandaiStats.filesDeleted;
		totalStats.bytesReclaimed += pbandaiStats.bytesReclaimed;
		totalStats.errors += pbandaiStats.errors;
		console.log(`  Scanned: ${pbandaiStats.scanned}, Duplicates: ${pbandaiStats.duplicatesFound}`);
		console.log();
	}

	console.log("========================");
	console.log("Summary:");
	console.log(`  Images scanned: ${totalStats.scanned}`);
	console.log(`  Duplicates found: ${totalStats.duplicatesFound}`);
	if (!options.dryRun) {
		console.log(`  JSON files updated: ${totalStats.jsonUpdated}`);
		console.log(`  Files deleted: ${totalStats.filesDeleted}`);
		console.log(`  Space reclaimed: ${formatBytes(totalStats.bytesReclaimed)}`);
	}
	if (totalStats.errors > 0) {
		console.log(`  Errors: ${totalStats.errors}`);
	}

	if (options.dryRun) {
		console.log("\n(Dry run - no changes made. Remove --dry-run to apply changes.)");
	}
}

try {
	await main();
} catch (error: unknown) {
	console.error("Fatal error:", error);
	process.exit(1);
}
