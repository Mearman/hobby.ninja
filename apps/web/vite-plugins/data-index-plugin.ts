import { readdir, writeFile, stat, readFile } from "node:fs/promises";
import { join, relative, extname } from "node:path";

import type { Plugin } from "vite";

// Debouncing mechanism to prevent infinite loops
let regenerateTimeout: NodeJS.Timeout | null = null;
const REGENERATE_DELAY = 1000; // 1 second debounce

// Debounced function to prevent infinite loops
function debouncedRegenerateIndices(dataDir: string) {
	if (regenerateTimeout) {
		clearTimeout(regenerateTimeout);
	}

	regenerateTimeout = setTimeout(() => {
		console.log("🔄 Regenerating hierarchical data indices...");
		generateHierarchicalIndices(dataDir);
	}, REGENERATE_DELAY);
}

interface IndexEntry {
  filename: string;
  relativePath: string;
  size: number;
  lastModified: number;
  type: "file" | "directory";
  id?: string;
  metadata?: any;
}

interface HierarchicalIndex {
  generated: string;
  version: string;
  type: "master" | "directory";
  path: string;
  entries: IndexEntry[];
  children: string[]; // Paths to child indexes
  summary: {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
  };
}

/**
 * Recursively scan a directory and build hierarchical index entries
 */
async function scanDirectory(
	dirPath: string,
	basePath: string = dirPath,
): Promise<{
  entries: IndexEntry[];
  children: string[];
  summary: HierarchicalIndex["summary"];
}> {
	const entries: IndexEntry[] = [];
	const children: string[] = [];
	let totalFiles = 0;
	let totalDirectories = 0;
	let totalSize = 0;

	try {
		const items = await readdir(dirPath, { withFileTypes: true });

		for (const item of items) {
			const fullPath = join(dirPath, item.name);
			const relativePath = relative(basePath, fullPath);
			const stats = await stat(fullPath);

			const entry: IndexEntry = {
				filename: item.name,
				relativePath,
				size: stats.size,
				lastModified: stats.mtime.getTime(),
				type: item.isDirectory() ? "directory" : "file",
			};

			// Add ID and metadata for JSON files
			if (!item.isDirectory() && extname(item.name) === ".json") {
				entry.id = item.name.replace(".json", "");

				// Extract metadata for specific file types
				if (item.name.startsWith("up_")) {
					// Unified product file
					entry.metadata = {
						sourceType: "unified",
						productId: entry.id,
					};
				} else if (/^\d+/.test(item.name)) {
					// Manual file (numeric prefix)
					entry.metadata = {
						sourceType: "manual",
						manualId: entry.id,
					};
				} else if (item.name.startsWith("01_")) {
					// Catalog file
					entry.metadata = {
						sourceType: "catalog",
						catalogId: entry.id,
					};
				}
			}

			entries.push(entry);

			if (item.isDirectory()) {
				totalDirectories++;

				// Recursively scan subdirectories
				const childIndex = await scanDirectory(fullPath, basePath);
				children.push(relativePath);

				// Add child summary to parent totals
				totalFiles += childIndex.summary.totalFiles;
				totalDirectories += childIndex.summary.totalDirectories;
				totalSize += childIndex.summary.totalSize;
			} else {
				totalFiles++;
				totalSize += stats.size;
			}
		}

		// Sort entries: directories first, then files alphabetically
		entries.sort((a, b) => {
			if (a.type !== b.type) {
				return a.type === "directory" ? -1 : 1;
			}
			return a.filename.localeCompare(b.filename);
		});

	} catch (error) {
		console.error(`Error scanning directory ${dirPath}:`, error);
		throw error;
	}

	return {
		entries,
		children,
		summary: {
			totalFiles,
			totalDirectories,
			totalSize,
		},
	};
}

/**
 * Generate hierarchical index for a directory
 */
async function generateHierarchicalIndex(
	dirPath: string,
	basePath: string,
	type: "master" | "directory" = "directory",
): Promise<HierarchicalIndex> {
	const { entries, children, summary } = await scanDirectory(dirPath, dirPath);

	const index: HierarchicalIndex = {
		generated: new Date().toISOString(),
		version: "1.0.0",
		type,
		path: relative(basePath, dirPath) || ".",
		entries,
		children,
		summary,
	};

	return index;
}

/**
 * Compare two indices to check if content has changed (excluding timestamps)
 */
function hasIndexContentChanged(oldIndex: HierarchicalIndex, newIndex: HierarchicalIndex): boolean {
	// Remove timestamp fields before comparison
	const { generated: oldGenerated, ...oldContent } = oldIndex;
	const { generated: newGenerated, ...newContent } = newIndex;

	// Deep comparison of content
	return JSON.stringify(oldContent) !== JSON.stringify(newContent);
}

/**
 * Write index file only if content has changed or file doesn't exist
 */
async function writeIndexIfNeeded(
	filePath: string,
	index: HierarchicalIndex,
): Promise<boolean> {
	try {
		// Try to read existing index
		const existingContent = await readFile(filePath, 'utf-8');
		const existingIndex: HierarchicalIndex = JSON.parse(existingContent);

		// Check if content has changed (excluding timestamps)
		if (!hasIndexContentChanged(existingIndex, index)) {
			// No content changes detected - don't write anything to avoid triggering watchers
			console.log(`📝 ${filePath.replace(process.cwd(), '')}: Only timestamps changed, skipping write`);
			return false; // No content change
		}
	} catch {
		// File doesn't exist or is invalid, need to write
	}

	// Write full index if content changed or file doesn't exist
	await writeFile(filePath, JSON.stringify(index, null, 2), "utf-8");
	return true; // Content changed
}


async function generateHierarchicalIndices(dataDir: string): Promise<void> {
	console.log("🚀 Generating hierarchical data indices...");

	try {
		// Check if data directory exists
		const { stat } = await import("node:fs/promises");
		try {
			await stat(dataDir);
		} catch {
			console.log(`📁 Data directory does not exist: ${dataDir}`);
			return;
		}

		let hasChanges = false;
		let totalFiles = 0;
		let totalDirectories = 0;
		let totalSize = 0;

		// Generate master index for the entire data directory
		console.log(`📁 Scanning data directory: ${dataDir}`);
		const masterIndex = await generateHierarchicalIndex(dataDir, dataDir, "master");
		const masterIndexChanged = await writeIndexIfNeeded(
			join(dataDir, "index.json"),
			masterIndex
		);
		if (masterIndexChanged) {
			hasChanges = true;
		}

		// Update totals from master index
		totalFiles = masterIndex.summary.totalFiles;
		totalDirectories = masterIndex.summary.totalDirectories;
		totalSize = masterIndex.summary.totalSize;

		// Generate indexes for all subdirectories that contain JSON files
		const entries = masterIndex.entries.filter(entry => entry.type === "directory");

		for (const entry of entries) {
			const subDirPath = join(dataDir, entry.relativePath);
			try {
				console.log(`📂 Processing ${entry.relativePath}/...`);

				// Only generate index for directories that might contain JSON files
				const subDirStat = await stat(subDirPath);
				if (subDirStat.isDirectory()) {
					const subIndex = await generateHierarchicalIndex(subDirPath, dataDir, "directory");

					// Only write index if there are JSON files or subdirectories
					const hasJsonFiles = subIndex.entries.some(e => e.type === "file" && e.filename.endsWith(".json"));
					const hasSubdirs = subIndex.entries.some(e => e.type === "directory");

					if (hasJsonFiles || hasSubdirs) {
						const subIndexChanged = await writeIndexIfNeeded(
							join(subDirPath, "index.json"),
							subIndex
						);
						if (subIndexChanged) {
							hasChanges = true;
						}
					}
				}
			} catch (error) {
				console.warn(`⚠️  Could not process ${entry.relativePath}:`, error);
			}
		}

		if (hasChanges) {
			console.log("✅ Hierarchical data indices generated successfully!");
		} else {
			console.log("📝 Index files updated with new timestamps (no content changes)");
		}

		console.log(`   Master index: ${totalFiles.toLocaleString()} files`);
		console.log(`   Directories: ${totalDirectories.toLocaleString()}`);
		console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);

	} catch (error) {
		console.error("❌ Error generating hierarchical data indices:", error);
	}
}

/**
 * Vite plugin to automatically generate data indices
 *
 * This plugin monitors the data/bandai/ directory and automatically
 * generates index.json files for efficient data loading.
 */
export function dataIndexPlugin(): Plugin {
	return {
		name: "data-index-plugin",
		configureServer(server) {
			// Generate initial indices once when server starts
			const dataDir = join(process.cwd(), "public/data/bandai");

			// Only watch for changes if data directory exists
			server.watcher.add([join(dataDir, "**/!(*index).json")]);

			// Debounced regeneration for file changes (excluding index.json)
			server.watcher.on("change", (path) => {
				if (path.includes("/public/data/") && path.endsWith(".json") && !path.includes("/index.json")) {
					console.log(`📝 Data file changed: ${path}`);
					debouncedRegenerateIndices(dataDir);
				}
			});

			server.watcher.on("add", (path) => {
				if (path.includes("/public/data/") && path.endsWith(".json") && !path.includes("/index.json")) {
					console.log(`➕ Data file added: ${path}`);
					debouncedRegenerateIndices(dataDir);
				}
			});

			server.watcher.on("unlink", (path) => {
				if (path.includes("/public/data/") && path.endsWith(".json") && !path.includes("/index.json")) {
					console.log(`➖ Data file removed: ${path}`);
					debouncedRegenerateIndices(dataDir);
				}
			});
		},
		buildStart() {
			// Generate hierarchical indices before build
			const dataDir = join(process.cwd(), "public/data");
			return generateHierarchicalIndices(dataDir);
		},
	};
}