#!/usr/bin/env npx tsx

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
void path.dirname(__filename); // Keep for potential future use

// Types
interface FileInfo {
  localPath: string;
  remotePath: string;
  originalRemotePath: string; // Before normalization (for cleanup)
  size: number;
  checksum: string;
}

function normalizeExtension(filePath: string): string {
	// Normalize all extensions to lowercase, and .jpeg to .jpg
	return filePath.replace(/\.[^.]+$/, ext =>
		ext.toLowerCase().replace(".jpeg", ".jpg"),
	);
}

function getExtensionVariants(normalizedPath: string): string[] {
	// Return uppercase/alternate variants that might exist in R2
	const match = /\.([^.]+)$/.exec(normalizedPath);
	if (!match) return [];

	const ext = match[1]; // e.g., 'jpg', 'png', 'pdf'
	const basePath = normalizedPath.slice(0, -ext.length - 1);

	const variants: string[] = [
		// Add uppercase variant
		`${basePath}.${ext.toUpperCase()}`,
	];

	// For jpg, also add jpeg variants
	if (ext === "jpg") {
		variants.push(`${basePath}.jpeg`, `${basePath}.JPEG`, `${basePath}.Jpeg`);
	}

	return variants;
}

interface UploadState {
  uploaded: string[];
  failed: Array<{
    file: string;
    error: string;
    checksum: string;
  }>;
}

// Configuration
const BUCKET_NAME = "hobby-ninja";
const DATA_DIR = "./assets";
const BATCH_SIZE = 25; // Smaller batches for better reliability
const DRY_RUN = process.argv.includes("--dry-run");
const RESUME = !process.argv.includes("--force"); // Resume by default, --force to upload all
const SYNC_DELETE = process.argv.includes("--delete") || process.argv.includes("--sync");
const STATE_FILE = "./upload-state.json";

// Utility functions
interface ExecError extends Error {
	signal?: string;
	stderr?: string;
}

async function execCommand(command: string, args: string[], options: Record<string, unknown> = {}): Promise<string> {
	try {
		const { stdout } = await execFileAsync(command, args, {
			timeout: 120_000, // 2 minute timeout
			...options,
		});
		return stdout;
	} catch (error_) {
		const error = error_ as ExecError;
		// Check for SIGINT (Ctrl+C) and exit gracefully
		if (error.signal === "SIGINT") {
			console.log("\n\n⚠️  Upload interrupted by user (Ctrl+C)");
			console.log("💾 Use --resume flag to continue later");
			process.exit(0);
		}
		console.error(`Error executing: ${command} ${args.join(" ")}`);
		console.error(error.message);
		if (error.stderr) {
			console.error(`stderr: ${error.stderr}`);
		}
		throw error;
	}
}

function getAllFiles(dir: string, extensions: string[] = [".jpg", ".jpeg", ".png", ".svg", ".pdf", ".webp"]): FileInfo[] {
	const files: FileInfo[] = [];
	const normalizedExtensions = new Set(extensions.map(ext => ext.toLowerCase()));

	function traverse(currentDir: string): void {
		try {
			const items = readdirSync(currentDir);

			for (const item of items) {
				const fullPath = path.join(currentDir, item);
				const stat = statSync(fullPath);

				if (stat.isDirectory()) {
					traverse(fullPath);
				} else if (normalizedExtensions.has(path.extname(item).toLowerCase())) {
					const relativePath = path.relative(dir, fullPath).replaceAll("\\", "/"); // Convert Windows paths to Unix
					const normalizedPath = normalizeExtension(relativePath);
					files.push({
						localPath: fullPath,
						remotePath: normalizedPath,
						originalRemotePath: relativePath,
						size: stat.size,
						// Use normalized path for checksum so variants don't get re-uploaded
						checksum: createHash("md5").update(normalizedPath).digest("hex"),
					});
				}
			}
		} catch (error) {
			console.error(`Error reading directory ${currentDir}:`, (error as Error).message);
		}
	}

	traverse(dir);
	return files.toSorted((a, b) => a.remotePath.localeCompare(b.remotePath));
}

function formatBytes(bytes: number): string {
	const sizes = ["Bytes", "KB", "MB", "GB"];
	if (bytes === 0) return "0 Bytes";
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
	return `${String(value)} ${sizes[i]}`;
}

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / SECONDS_PER_HOUR);
	const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
	const secs = Math.floor(seconds % SECONDS_PER_MINUTE);

	if (hours > 0) {
		return `${hours}h ${minutes}m ${secs}s`;
	} else if (minutes > 0) {
		return `${minutes}m ${secs}s`;
	} else {
		return `${secs}s`;
	}
}

function loadState(): UploadState {
	try {
		return JSON.parse(readFileSync(STATE_FILE, "utf8")) as UploadState;
	} catch {
		return { uploaded: [], failed: [] };
	}
}

function saveState(state: UploadState): void {
	try {
		writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
	} catch (error) {
		console.error("Error saving state:", (error as Error).message);
	}
}

async function deleteR2Object(key: string): Promise<boolean> {
	try {
		await execCommand("wrangler", [
			"r2", "object", "delete",
			`${BUCKET_NAME}/${key}`,
			"--remote",
		]);
		return true;
	} catch {
		// Object might not exist, which is fine
		return false;
	}
}

async function cleanupVariants(normalizedPath: string): Promise<number> {
	const variants = getExtensionVariants(normalizedPath);
	let deleted = 0;

	for (const variant of variants) {
		if (await deleteR2Object(variant)) {
			deleted++;
		}
	}

	return deleted;
}

interface R2Object {
  key: string;
  size: number;
}

async function listR2Objects(prefix = ""): Promise<R2Object[]> {
	const objects: R2Object[] = [];
	let cursor: string | undefined;

	console.log("📡 Fetching R2 object list...");

	do {
		try {
			const args = ["r2", "object", "list", BUCKET_NAME, "--remote", "--json"];
			if (prefix) {
				args.push("--prefix", prefix);
			}
			if (cursor) {
				args.push("--cursor", cursor);
			}

			const output = await execCommand("wrangler", args);
			const result = JSON.parse(output) as {
        objects: Array<{ key: string; size: number }>;
        truncated: boolean;
        cursor?: string;
      };

			objects.push(...result.objects.map(obj => ({
				key: obj.key,
				size: obj.size,
			})));

			cursor = result.truncated ? result.cursor : undefined;

			if (objects.length % 1000 === 0 && objects.length > 0) {
				process.stdout.write(`\r   Found ${objects.length} objects...`);
			}
		} catch (error) {
			console.error("Error listing R2 objects:", (error as Error).message);
			break;
		}
	} while (cursor);

	console.log(`\r   Found ${objects.length} objects in R2`);
	return objects;
}

async function deleteOrphanedObjects(localFiles: FileInfo[]): Promise<{ deleted: number; failed: number }> {
	console.log("");
	console.log("🔍 Checking for orphaned objects in R2...");

	// Build set of all valid remote paths (normalized)
	const validPaths = new Set<string>();
	for (const file of localFiles) {
		validPaths.add(file.remotePath);
		// Also add the original path in case it wasn't normalized yet
		validPaths.add(file.originalRemotePath);
	}

	// Get all objects in R2
	const r2Objects = await listR2Objects();

	// Find orphaned objects (in R2 but not in local files)
	const orphaned = r2Objects.filter(obj => {
		const normalizedKey = normalizeExtension(obj.key);
		return !validPaths.has(obj.key) && !validPaths.has(normalizedKey);
	});

	if (orphaned.length === 0) {
		console.log("✅ No orphaned objects found");
		return { deleted: 0, failed: 0 };
	}

	console.log(`🗑️  Found ${orphaned.length} orphaned objects to delete`);
	console.log(`   Total size: ${formatBytes(orphaned.reduce((sum, o) => sum + o.size, 0))}`);

	if (DRY_RUN) {
		console.log("");
		console.log("🧪 DRY RUN - Would delete:");
		for (const obj of orphaned.slice(0, 10)) {
			console.log(`   - ${obj.key} (${formatBytes(obj.size)})`);
		}
		if (orphaned.length > 10) {
			console.log(`   ... and ${orphaned.length - 10} more`);
		}
		return { deleted: 0, failed: 0 };
	}

	let deleted = 0;
	let failed = 0;

	for (const obj of orphaned) {
		try {
			await deleteR2Object(obj.key);
			deleted++;

			if (deleted % 10 === 0) {
				process.stdout.write(`\r   Deleted ${deleted}/${orphaned.length} orphaned objects...`);
			}
		} catch {
			failed++;
			console.error(`\n❌ Failed to delete: ${obj.key}`);
		}
	}

	console.log(`\r   Deleted ${deleted}/${orphaned.length} orphaned objects    `);

	return { deleted, failed };
}

// Main upload function
async function uploadFiles(): Promise<void> {
	console.log("🚀 Starting R2 upload to hobby-ninja bucket...");
	console.log(`📁 Source directory: ${DATA_DIR}`);
	console.log(`🗑️  Target bucket: ${BUCKET_NAME}`);
	console.log(`🔍 File types: .jpg, .jpeg, .png, .svg, .pdf, .webp`);
	console.log(`🔄 Normalizing: all extensions to lowercase, .jpeg → .jpg (old variants auto-deleted)`);
	console.log("");

	if (DRY_RUN) {
		console.log("🧪 DRY RUN MODE - No files will be uploaded or deleted");
		console.log("");
	}

	if (RESUME) {
		console.log("🔄 RESUME MODE (default) - Will skip already uploaded files");
		console.log("   Use --force to upload all files from scratch");
		console.log("");
	} else {
		console.log("🔄 FORCE MODE - Will upload all files from scratch");
		console.log("");
	}

	if (SYNC_DELETE) {
		console.log("🗑️  SYNC MODE - Will delete R2 objects that no longer exist locally");
		console.log("");
	}

	// Get all files
	console.log("📋 Scanning for files...");
	const allFiles = getAllFiles(DATA_DIR);

	// Separate by type for reporting
	const jpgFiles = allFiles.filter(f =>
		[".jpg", ".jpeg"].includes(path.extname(f.remotePath).toLowerCase()),
	);
	const pngFiles = allFiles.filter(f =>
		path.extname(f.remotePath).toLowerCase() === ".png",
	);
	const svgFiles = allFiles.filter(f =>
		path.extname(f.remotePath).toLowerCase() === ".svg",
	);
	const pdfFiles = allFiles.filter(f =>
		path.extname(f.remotePath).toLowerCase() === ".pdf",
	);
	const webpFiles = allFiles.filter(f =>
		path.extname(f.remotePath).toLowerCase() === ".webp",
	);

	// Count files that will be normalized
	const filesToNormalize = allFiles.filter(f => f.remotePath !== f.originalRemotePath);

	// Report summary
	console.log(`📊 Found ${allFiles.length} files:`);
	console.log(`   🖼️  JPG/JPEG: ${jpgFiles.length} files (${formatBytes(jpgFiles.reduce((sum, f) => sum + f.size, 0))})`);
	console.log(`   🖼️  PNG: ${pngFiles.length} files (${formatBytes(pngFiles.reduce((sum, f) => sum + f.size, 0))})`);
	console.log(`   🎨 SVG: ${svgFiles.length} files (${formatBytes(svgFiles.reduce((sum, f) => sum + f.size, 0))})`);
	console.log(`   📄 PDF: ${pdfFiles.length} files (${formatBytes(pdfFiles.reduce((sum, f) => sum + f.size, 0))})`);
	console.log(`   🖼️  WebP: ${webpFiles.length} files (${formatBytes(webpFiles.reduce((sum, f) => sum + f.size, 0))})`);
	console.log(`   💾 Total: ${formatBytes(allFiles.reduce((sum, f) => sum + f.size, 0))}`);
	if (filesToNormalize.length > 0) {
		console.log(`   🔄 Extensions to normalize: ${filesToNormalize.length} files`);
	}
	console.log("");

	if (DRY_RUN) {
		console.log("🧪 Dry run complete. To upload files, run without --dry-run flag");
		console.log("📝 By default, upload will resume from where it left off");
		console.log("   Use --force to upload all files from scratch");
		console.log("");
		console.log("Example commands that would be executed:");
		console.log(`wrangler r2 object put "${BUCKET_NAME}/path/to/file.jpg" --file="./assets/path/to/file.jpg"`);

		// In dry-run mode with sync, show what would be deleted
		if (SYNC_DELETE) {
			await deleteOrphanedObjects(allFiles);
		}
		return;
	}

	// Handle resume state
	const state: UploadState = RESUME ? loadState() : { uploaded: [], failed: [] };
	const uploadedChecksums = new Set(state.uploaded);

	// Filter out already uploaded files
	const filesToUpload: FileInfo[] = RESUME
		? allFiles.filter(f => !uploadedChecksums.has(f.checksum))
		: allFiles;

	if (RESUME) {
		const skipped = allFiles.length - filesToUpload.length;
		console.log(`⏭️  Skipping ${skipped} already uploaded files`);
		console.log(`📋 Files remaining: ${filesToUpload.length}`);
		console.log("");
	}

	if (filesToUpload.length === 0) {
		console.log("✅ All files have been uploaded!");
		return;
	}

	// Upload in batches
	const startTime = Date.now();
	let uploaded = 0;
	let failed = 0;
	let variantsCleaned = 0;
	const alreadyProcessed = RESUME ? (allFiles.length - filesToUpload.length) : 0;

	for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
		const batch = filesToUpload.slice(i, i + BATCH_SIZE);
		const batchNum = Math.floor(i / BATCH_SIZE) + 1;
		const totalBatches = Math.ceil(filesToUpload.length / BATCH_SIZE);

		console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)...`);

		for (const file of batch) {
			try {
				// Use wrangler r2 object put command with remote flag
				await execCommand("wrangler", [
					"r2", "object", "put",
					`${BUCKET_NAME}/${file.remotePath}`,
					"--file", file.localPath,
					"--remote",
				]);

				uploaded++;
				state.uploaded.push(file.checksum);

				// Clean up any old extension variants (e.g., .JPG, .jpeg when we uploaded .jpg)
				const cleaned = await cleanupVariants(file.remotePath);
				variantsCleaned += cleaned;

				// Progress indicator
				if (uploaded % 5 === 0) {
					const elapsed = (Date.now() - startTime) / 1000;
					const avgTime = elapsed / uploaded;
					const remaining = (filesToUpload.length - uploaded) * avgTime;
					const totalProcessed = alreadyProcessed + uploaded;
					const overallProgress = ((totalProcessed / allFiles.length) * 100).toFixed(1);

					process.stdout.write(`\r⏳ Progress: ${overallProgress}% (${totalProcessed}/${allFiles.length}) [↑${uploaded} ↓${failed} ⏭️${alreadyProcessed}] - ETA: ${formatDuration(remaining)}`);
				}

				// Save state periodically
				if (uploaded % BATCH_SIZE === 0) {
					saveState(state);
				}
			} catch (error) {
				failed++;
				state.failed.push({
					file: file.remotePath,
					error: (error as Error).message,
					checksum: file.checksum,
				});
				console.error(`\n❌ Failed to upload: ${file.remotePath}`);
				console.error(`   Error: ${(error as Error).message}`);
			}
		}

		console.log(` ✅ Batch ${batchNum} complete`);
	}

	// Save final state
	saveState(state);

	// Handle deletions if sync mode is enabled
	let orphanedDeleted = 0;
	let orphanedFailed = 0;
	if (SYNC_DELETE) {
		const deleteResult = await deleteOrphanedObjects(allFiles);
		orphanedDeleted = deleteResult.deleted;
		orphanedFailed = deleteResult.failed;
	}

	// Final report
	const totalTime = (Date.now() - startTime) / 1000;
	const totalProcessed = alreadyProcessed + uploaded + failed;
	console.log("");
	console.log("🎉 Upload session complete!");

	// Summary breakdown
	console.log(`📊 Session Summary:`);
	if (alreadyProcessed > 0) {
		console.log(`   ⏭️  Previously uploaded: ${alreadyProcessed} files`);
	}
	console.log(`   ✅ Successfully uploaded: ${uploaded} files`);
	if (variantsCleaned > 0) {
		console.log(`   🧹 Old variants cleaned: ${variantsCleaned} files`);
	}
	if (orphanedDeleted > 0) {
		console.log(`   🗑️  Orphaned objects deleted: ${orphanedDeleted} files`);
	}
	if (failed > 0) {
		console.log(`   ❌ Failed uploads: ${failed} files`);
	}
	if (orphanedFailed > 0) {
		console.log(`   ❌ Failed deletions: ${orphanedFailed} files`);
	}
	console.log(`   📁 Total processed: ${totalProcessed}/${allFiles.length} files (${((totalProcessed / allFiles.length) * 100).toFixed(1)}%)`);

	if (failed > 0) {
		console.log(`💾 Failed files saved to state file for retry`);
		console.log(`🔄 To retry failed files: ./scripts/upload-to-r2.ts`);
	}
	console.log(`⏱️  Session time: ${formatDuration(totalTime)}`);
	if (uploaded > 0) {
		console.log(`📊 Upload speed: ${formatBytes(filesToUpload.reduce((sum, f) => sum + f.size, 0) / totalTime)}/s`);
	}

	if (!RESUME && failed === 0) {
		// Clean up state file on complete success
		try {
			const { unlinkSync } = await import("node:fs");
			unlinkSync(STATE_FILE);
			console.log("🗑️  Cleaned up state file");
		} catch {
			// Ignore cleanup errors
		}
	}

}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
	console.error("💥 Unexpected error:", error.message);
	process.exit(1);
});

process.on("unhandledRejection", (reason, _promise) => {
	console.error("💥 Unhandled promise rejection:", reason);
	process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
	console.log("\n\n⚠️  Upload interrupted by user");
	console.log("💾 Run script again to continue (resume is enabled by default)");
	process.exit(0);
});

// Run the script
await uploadFiles();