/**
 * Normalize command - applies text normalization to existing JSON data files
 *
 * Fixes spacing issues around "Gundam" and "ガンダム" in both
 * Japanese and English text fields.
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";

import { normalizeText } from "@hobby-ninja/translation/text-normalizer";

const DEFAULT_CATALOG_DIR = "data/bandai/items";
const DEFAULT_MANUALS_DIR = "data/bandai/manuals";

export interface NormalizeOptions {
	/** Data source to normalize: 'all', 'bandai-catalog', 'bandai-manuals' */
	source: "all" | "bandai-catalog" | "bandai-manuals";
	/** Input directory (overrides default for source) */
	input?: string;
	/** Preview changes without writing */
	dryRun?: boolean;
	/** Enable verbose logging */
	verbose?: boolean;
}

interface NormalizeProgress {
	filesProcessed: number;
	filesModified: number;
	fieldsNormalized: number;
}

/**
 * Main entry point - normalize data from all or specific sources
 */
export async function normalizeData(options: NormalizeOptions): Promise<void> {
	const { source, dryRun = false, verbose = false } = options;

	console.log("Text Normalization Configuration:");
	console.log(`  Source: ${source}`);
	console.log(`  Dry run: ${dryRun}`);
	console.log("");

	const totalProgress: NormalizeProgress = {
		filesProcessed: 0,
		filesModified: 0,
		fieldsNormalized: 0,
	};

	// Normalize catalog items
	if (source === "all" || source === "bandai-catalog") {
		const catalogDir =
			options.input && source === "bandai-catalog"
				? options.input
				: DEFAULT_CATALOG_DIR;
		const result = await normalizeCatalogItems({
			inputDir: catalogDir,
			dryRun,
			verbose,
		});
		totalProgress.filesProcessed += result.filesProcessed;
		totalProgress.filesModified += result.filesModified;
		totalProgress.fieldsNormalized += result.fieldsNormalized;
	}

	// Normalize manual files
	if (source === "all" || source === "bandai-manuals") {
		const manualsDir =
			options.input && source === "bandai-manuals"
				? options.input
				: DEFAULT_MANUALS_DIR;
		const result = await normalizeManualFiles({
			inputDir: manualsDir,
			dryRun,
			verbose,
		});
		totalProgress.filesProcessed += result.filesProcessed;
		totalProgress.filesModified += result.filesModified;
		totalProgress.fieldsNormalized += result.fieldsNormalized;
	}

	console.log("\n" + "=".repeat(60));
	console.log("Normalization Summary:");
	console.log(`  Files processed: ${totalProgress.filesProcessed}`);
	console.log(`  Files modified: ${totalProgress.filesModified}`);
	console.log(`  Fields normalized: ${totalProgress.fieldsNormalized}`);

	if (dryRun) {
		console.log("\n[DRY RUN] No files were modified.");
	}
}

// ============================================================================
// Catalog Normalization
// ============================================================================

interface CatalogNormalizeOptions {
	inputDir: string;
	dryRun: boolean;
	verbose: boolean;
}

async function normalizeCatalogItems(
	options: CatalogNormalizeOptions,
): Promise<NormalizeProgress> {
	const { inputDir, dryRun, verbose } = options;

	console.log("=".repeat(60));
	console.log("Normalizing Bandai catalog items...");
	console.log(`  Input directory: ${inputDir}`);
	console.log("");

	const progress: NormalizeProgress = {
		filesProcessed: 0,
		filesModified: 0,
		fieldsNormalized: 0,
	};

	// Find all item directories
	let entries: string[];
	try {
		const dirEntries = await fs.readdir(inputDir, { withFileTypes: true });
		entries = dirEntries
			.filter((e) => e.isDirectory())
			.map((e) => e.name)
			.sort();
	} catch (error) {
		console.error(`Failed to read input directory: ${inputDir}`, error);
		return progress;
	}

	if (entries.length === 0) {
		console.log("No catalog items found.");
		return progress;
	}

	console.log(`Found ${entries.length} items to process\n`);

	for (const dirName of entries) {
		const jsonPath = join(inputDir, dirName, `${dirName}.json`);

		try {
			const content = await fs.readFile(jsonPath, "utf8");
			const data = JSON.parse(content);

			const { modified, fieldsChanged } = normalizeObject(data);

			progress.filesProcessed++;

			if (modified) {
				progress.filesModified++;
				progress.fieldsNormalized += fieldsChanged;

				if (!dryRun) {
					await fs.writeFile(jsonPath, JSON.stringify(data, null, 2) + "\n");
				}

				if (verbose) {
					console.log(`  [MODIFIED] ${dirName}: ${fieldsChanged} fields`);
				}
			}
		} catch {
			// File doesn't exist or isn't valid JSON - skip
		}

		// Progress indicator every 500 items
		if (progress.filesProcessed % 500 === 0) {
			console.log(
				`Progress: ${progress.filesProcessed}/${entries.length} | Modified: ${progress.filesModified}`,
			);
		}
	}

	console.log(
		`\nCatalog complete: ${progress.filesModified}/${progress.filesProcessed} files modified, ${progress.fieldsNormalized} fields normalized`,
	);

	return progress;
}

// ============================================================================
// Manual Normalization
// ============================================================================

interface ManualNormalizeOptions {
	inputDir: string;
	dryRun: boolean;
	verbose: boolean;
}

async function normalizeManualFiles(
	options: ManualNormalizeOptions,
): Promise<NormalizeProgress> {
	const { inputDir, dryRun, verbose } = options;

	console.log("=".repeat(60));
	console.log("Normalizing Bandai manual files...");
	console.log(`  Input directory: ${inputDir}`);
	console.log("");

	const progress: NormalizeProgress = {
		filesProcessed: 0,
		filesModified: 0,
		fieldsNormalized: 0,
	};

	// Find all manual directories
	let entries: string[];
	try {
		const dirEntries = await fs.readdir(inputDir, { withFileTypes: true });
		entries = dirEntries
			.filter((e) => e.isDirectory())
			.map((e) => e.name)
			.sort();
	} catch (error) {
		console.error(`Failed to read input directory: ${inputDir}`, error);
		return progress;
	}

	if (entries.length === 0) {
		console.log("No manual files found.");
		return progress;
	}

	console.log(`Found ${entries.length} manuals to process\n`);

	for (const dirName of entries) {
		const jsonPath = join(inputDir, dirName, `${dirName}.json`);

		try {
			const content = await fs.readFile(jsonPath, "utf8");
			const data = JSON.parse(content);

			const { modified, fieldsChanged } = normalizeObject(data);

			progress.filesProcessed++;

			if (modified) {
				progress.filesModified++;
				progress.fieldsNormalized += fieldsChanged;

				if (!dryRun) {
					await fs.writeFile(jsonPath, JSON.stringify(data, null, 2) + "\n");
				}

				if (verbose) {
					console.log(`  [MODIFIED] ${dirName}: ${fieldsChanged} fields`);
				}
			}
		} catch {
			// File doesn't exist or isn't valid JSON - skip
		}
	}

	console.log(
		`\nManuals complete: ${progress.filesModified}/${progress.filesProcessed} files modified, ${progress.fieldsNormalized} fields normalized`,
	);

	return progress;
}

// ============================================================================
// Object Normalization
// ============================================================================

interface NormalizeResult {
	modified: boolean;
	fieldsChanged: number;
}

/**
 * Recursively normalize all string fields in an object
 */
function normalizeObject(obj: unknown): NormalizeResult {
	let modified = false;
	let fieldsChanged = 0;

	if (typeof obj !== "object" || obj === null) {
		return { modified, fieldsChanged };
	}

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			if (typeof obj[i] === "string") {
				const normalized = normalizeText(obj[i]);
				if (normalized !== obj[i]) {
					obj[i] = normalized;
					modified = true;
					fieldsChanged++;
				}
			} else if (typeof obj[i] === "object" && obj[i] !== null) {
				const result = normalizeObject(obj[i]);
				if (result.modified) {
					modified = true;
					fieldsChanged += result.fieldsChanged;
				}
			}
		}
	} else {
		for (const key of Object.keys(obj)) {
			const record = obj as Record<string, unknown>;
			const value = record[key];

			if (typeof value === "string") {
				const normalized = normalizeText(value);
				if (normalized !== value) {
					record[key] = normalized;
					modified = true;
					fieldsChanged++;
				}
			} else if (typeof value === "object" && value !== null) {
				const result = normalizeObject(value);
				if (result.modified) {
					modified = true;
					fieldsChanged += result.fieldsChanged;
				}
			}
		}
	}

	return { modified, fieldsChanged };
}
