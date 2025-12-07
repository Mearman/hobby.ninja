#!/usr/bin/env node

/**
 * CLI for Bandai manual parsing
 */

import { promises as fs } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";

import { SimpleHtmlParser } from "./core/simple-html-parser";

const parser = new SimpleHtmlParser();

/**
 * Extract manual ID from file path (e.g., /path/to/638.html -> 638)
 */
function extractManualId(filePath: string): string {
	const baseName = basename(filePath, ".html");
	return baseName;
}

/**
 * Create output directory structure and file path
 */
function createOutputPath(inputPath: string): string {
	const manualId = extractManualId(inputPath);
	const inputDir = dirname(inputPath);
	const outputDir = join(inputDir, manualId);
	return join(outputDir, `${manualId}.json`);
}

/**
 * Recursively find all HTML files in a directory
 */
async function findHtmlFiles(dir: string): Promise<string[]> {
	const files: string[] = [];

	async function scan(currentDir: string) {
		const entries = await fs.readdir(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name);

			if (entry.isDirectory()) {
				await scan(fullPath);
			} else if (entry.isFile() && entry.name.endsWith(".html")) {
				files.push(fullPath);
			}
		}
	}

	await scan(dir);
	return files;
}

async function processAllFiles(forceRecreate = false) {
	try {
		console.log("Finding all HTML files...");

		// Determine the correct path to the manuals directory
		let manualsPath = "data/bandai/manuals";

		// If running from packages/scrapers, use relative path
		if (process.cwd().endsWith("packages/scrapers")) {
			manualsPath = "../../data/bandai/manuals";
		}

		// If running from root, use direct path
		const testPath = process.cwd().endsWith("packages/scrapers") ? manualsPath : "data/bandai/manuals";

		// Verify the directory exists
		try {
			await fs.access(testPath);
		} catch {
			throw new Error(`Manuals directory not found at: ${testPath}. Current directory: ${process.cwd()}`);
		}

		const files = await findHtmlFiles(testPath);
		console.log(`Found ${files.length} HTML files to process...`);

		if (forceRecreate) {
			console.log("⚠ Force mode enabled - recreating all existing JSON files");
		}

		let processed = 0;
		let errors = 0;

		for (const file of files) {
			try {
				const outputPath = createOutputPath(file);

				// Skip if JSON file already exists (unless force is enabled)
				if (!forceRecreate) {
					try {
						await fs.access(outputPath);
						console.log(`⏭ Skipping ${file} (already exists)`);
						continue;
					} catch {
						// File doesn't exist, proceed with processing
					}
				}

				const content = await fs.readFile(file, "utf8");
				const parseResult = await parser.parse(content);

				if (!parseResult.success) {
					console.error(`✗ Failed to parse ${file}: ${parseResult.error}`);
					errors++;
					continue;
				}

				const outputDir = dirname(outputPath);
				await fs.mkdir(outputDir, { recursive: true });

				const jsonContent = JSON.stringify(parseResult.data, null, 2);
				await fs.writeFile(outputPath, jsonContent, "utf-8");

				processed++;
				if (processed % 100 === 0) {
					console.log(`Progress: ${processed}/${files.length} processed`);
				}

			} catch (error) {
				console.error(`✗ Failed to process ${file}: ${error}`);
				errors++;
			}
		}

		console.log(`\nCompleted!`);
		console.log(`✓ Successfully processed: ${processed} files`);
		if (!forceRecreate) {
			console.log(`⏭ Skipped (already exists): ${files.length - processed - errors} files`);
		}
		console.log(`✗ Errors: ${errors} files`);
		console.log(`📊 Total files found: ${files.length}`);

	} catch (error) {
		console.error(`Failed to process files: ${error}`);
		process.exit(1);
	}
}

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log("Usage: manual-parser <file.html>");
		console.log("       manual-parser --all [--force]");
		console.log("Outputs to: <input-directory>/<manual-id>/<manual-id>.json");
		console.log("");
		console.log("Options:");
		console.log("  --all     Process all HTML files in the manuals directory");
		console.log("  --force   Force recreation of existing JSON files (use with --all)");
		process.exit(1);
	}

	if (args[0] === "--all") {
		const forceRecreate = args.includes("--force");
		await processAllFiles(forceRecreate);
		return;
	}

	const inputFile = args[0];

	// Resolve the input file path relative to current working directory
	const resolvedInputPath = resolve(inputFile);
	const outputPath = createOutputPath(resolvedInputPath);

	try {
		// Read and parse the input file
		const content = await fs.readFile(resolvedInputPath, "utf8");
		const result = await parser.parse(content);

		if (!result.success) {
			console.error(`Error: ${result.error}`);
			process.exit(1);
		}

		// Create output directory if it doesn't exist
		const outputDir = dirname(outputPath);
		await fs.mkdir(outputDir, { recursive: true });

		// Write JSON output to file
		const jsonContent = JSON.stringify(result.data, null, 2);
		await fs.writeFile(outputPath, jsonContent, "utf-8");

		console.log(`✓ Parsed ${resolvedInputPath} -> ${outputPath}`);

	} catch (error) {
		console.error(`Failed to process file: ${error}`);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}