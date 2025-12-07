#!/usr/bin/env node

import { config } from "dotenv";
import { Command } from "commander";
import { readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { TRANSLATION_STORE_DIR } from "../../../translation/src/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from repo root (packages/cli/src/bin -> repo root is 4 levels up)
config({ path: resolve(__dirname, "../../../../.env") });

const packageJson = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));
const version = packageJson.version;

const program = new Command();

program
	.name("gunpla-scraper")
	.description("CLI tool for scraping Gundam/Gunpla data from various sources (Placeholder)")
	.version(version);

// Scrape command implementation
program
	.command("scrape")
	.description("Scrape data from various sources")
	.option("-s, --source <source>", "Data source to scrape (manuals, bandai-catalog)")
	.option("-o, --output <dir>", "Output directory", "./data")
	.option("-c, --cache", "Enable caching", true)
	.option("-r, --resume", "Resume from previous run", false)
	.option("-v, --verbose", "Verbose output", false)
	.option("-t, --translate", "Translate Japanese text to English", false)
	.option("-d, --delay <ms>", "Delay between requests in ms", "1000")
	.option("--start-id <id>", "Starting ID for catalog discovery", "00_0000")
	.option("--count <number>", "Number of IDs to process", "10")
	.action(async (options) => {
		try {
			const { scrapeData } = await import("../cli/scrape-command.js");
			await scrapeData(options);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("❌ Error in scrape command:", errorMessage);
			if (options.verbose) {
				const errorStack = error instanceof Error ? error.stack : String(error);
				console.error(errorStack);
			}
			process.exit(1);
		}
	});

// Translate command implementation
program
	.command("translate")
	.description("Translate existing scraped data from Japanese to English")
	.option("-s, --source <source>", "Data source (all, bandai-catalog, bandai-manuals)", "all")
	.option("-i, --input <dir>", "Override input directory for the specified source")
	.option("-c, --cache-dir <dir>", "Directory for translation cache", TRANSLATION_STORE_DIR)
	.option("--dry-run", "Preview changes without writing", false)
	.option("-v, --verbose", "Verbose output", false)
	.action(async (options) => {
		try {
			const { translateCatalogData } = await import("../cli/translate-command.js");
			await translateCatalogData(options);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("❌ Error in translate command:", errorMessage);
			if (options.verbose) {
				const errorStack = error instanceof Error ? error.stack : String(error);
				console.error(errorStack);
			}
			process.exit(1);
		}
	});

// Normalize command implementation
program
	.command("normalize")
	.description("Normalize text spacing in existing data files (Gundam/ガンダム padding)")
	.option("-s, --source <source>", "Data source (all, bandai-catalog, bandai-manuals)", "all")
	.option("-i, --input <dir>", "Override input directory for the specified source")
	.option("--dry-run", "Preview changes without writing", false)
	.option("-v, --verbose", "Verbose output", false)
	.action(async (options) => {
		try {
			const { normalizeData } = await import("../cli/normalize-command.js");
			await normalizeData(options);
			process.exit(0);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("Error in normalize command:", errorMessage);
			if (options.verbose) {
				const errorStack = error instanceof Error ? error.stack : String(error);
				console.error(errorStack);
			}
			process.exit(1);
		}
	});

program
	.command("export")
	.description("Export cached data in various formats (PLACEHOLDER - Not yet implemented)")
	.action(() => {
		console.log("🚧 Export command is not yet implemented");
		console.log("This will eventually export data in formats:");
		console.log("  - JSON (for web application)");
		console.log("  - CSV (for spreadsheets)");
		console.log("  - XLSX (for Excel)");
	});

program
	.command("cache")
	.description("Manage cache (PLACEHOLDER - Not yet implemented)")
	.action(() => {
		console.log("🚧 Cache management is not yet implemented");
		console.log("This will eventually provide:");
		console.log("  - Clear cache functionality");
		console.log("  - Cache statistics");
		console.log("  - Cache size management");
	});

program
	.command("status")
	.description("Show scraping status and statistics (PLACEHOLDER - Not yet implemented)")
	.action(() => {
		console.log("🚧 Status command is not yet implemented");
		console.log("This will eventually show:");
		console.log("  - Scraping progress");
		console.log("  - Data statistics");
		console.log("  - Last update times");
	});

// Download command implementation
program
	.command("download")
	.description("Download images and PDFs from scraped data")
	.option("--source <source>", "Data source (all, manuals, catalog)", "all")
	.option("--manuals-dir <dir>", "Manual data directory", "./data/bandai/manuals")
	.option("--catalog-dir <dir>", "Catalog data directory", "./data/bandai/items")
	.option("--concurrency <n>", "Number of concurrent downloads", "5")
	.option("--delay <ms>", "Delay between batches in milliseconds", "0")
	.option("--dry-run", "Show what would be downloaded without downloading", false)
	.option("-v, --verbose", "Verbose output", false)
	.action(async (options) => {
		try {
			const { downloadAssets } = await import("../cli/download-command.js");

			console.log("Downloading assets from scraped data...");
			console.log(`Source: ${options.source}`);
			console.log(`Manuals directory: ${options.manualsDir}`);
			console.log(`Catalog directory: ${options.catalogDir}`);
			console.log(`Concurrency: ${options.concurrency}`);
			console.log(`Delay: ${options.delay}ms`);
			console.log(`Dry run: ${options.dryRun}`);
			console.log("");

			const result = await downloadAssets({
				source: options.source,
				manualsDir: options.manualsDir,
				catalogDir: options.catalogDir,
				concurrency: parseInt(options.concurrency, 10),
				delayMs: parseInt(options.delay, 10),
				dryRun: options.dryRun,
				verbose: options.verbose,
			});

			console.log("\nDownload Results:");
			console.log(`Total items processed: ${result.totalItems}`);
			console.log(`Downloaded: ${result.downloaded}`);
			console.log(`Skipped (already exist): ${result.skipped}`);
			console.log(`Failed: ${result.failed}`);
			console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);

			if (result.errors.length > 0 && result.errors.length <= 10) {
				console.log("\nErrors:");
				result.errors.forEach((error) => console.log(`  - ${error}`));
			} else if (result.errors.length > 10) {
				console.log(`\n${result.errors.length} errors occurred (showing first 10):`);
				result.errors.slice(0, 10).forEach((error) => console.log(`  - ${error}`));
			}

			process.exit(result.failed === 0 ? 0 : 1);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("Download failed:", errorMessage);
			if (options.verbose) {
				const errorStack = error instanceof Error ? error.stack : String(error);
				console.error(errorStack);
			}
			process.exit(1);
		}
	});

// Wayback command implementation
program
	.command("wayback")
	.description("Submit URLs to Internet Archive Wayback Machine")
	.option("--source <source>", "Data source (all, manuals, catalog)", "all")
	.option("--manuals-dir <dir>", "Manual data directory", "./data/bandai/manuals")
	.option("--catalog-dir <dir>", "Catalog data directory", "./data/bandai/items")
	.option("--dry-run", "Show URLs without submitting", false)
	.option("--resume", "Resume from checkpoint", true)
	.option("-v, --verbose", "Verbose logging", false)
	.option("--retries <n>", "Retry attempts (-1 for unlimited)", "-1")
	.option("--delay <seconds>", "Delay between requests", "0")
	.option("--rate-limit-delay <seconds>", "Base delay after rate limit error", "30")
	.option("--access-key <key>", "Internet Archive S3 access key")
	.option("--secret-key <key>", "Internet Archive S3 secret key")
	.option("--output <dir>", "Results directory", "./wayback-results")
	.option("--min-archive-age <duration>", "Skip archives newer than this (e.g., 30d, 6m)", "30d")
	.option("--max-archive-age <duration>", "Force re-archive if older than this (e.g., 1y, 18m)", "1y")
	.action(async (options) => {
		try {
			const { WaybackCommand } = await import("../cli/wayback.js");
			const waybackCommand = new WaybackCommand();

			// Parse API keys from options or environment
			const accessKey = options.accessKey || process.env["IA_ACCESS_KEY"];
			const secretKey = options.secretKey || process.env["IA_SECRET_KEY"];

			console.log("Submitting URLs to Internet Archive Wayback Machine...");
			console.log(`Source: ${options.source}`);
			console.log(`Manuals directory: ${options.manualsDir}`);
			console.log(`Catalog directory: ${options.catalogDir}`);
			console.log(`Delay between requests: ${options.delay}s`);
			console.log(`Rate limit retry delay: ${options.rateLimitDelay}s (exponential backoff)`);
			console.log(`Max retries: ${options.retries}`);
			console.log(`Authentication: ${accessKey ? "API keys provided" : "No authentication"}`);
			console.log(`Archive age thresholds: min=${options.minArchiveAge}, max=${options.maxArchiveAge}`);
			console.log(`Resume: ${options.resume}`);
			console.log(`Dry run: ${options.dryRun}`);
			console.log("");

			const result = await waybackCommand.execute({
				source: options.source,
				manualsDir: options.manualsDir,
				catalogDir: options.catalogDir,
				fields: [], // Fields are determined by source type internally
				dryRun: options.dryRun,
				resume: options.resume,
				verbose: options.verbose,
				retries: parseInt(options.retries, 10),
				delayMs: parseFloat(options.delay) * 1000,
				rateLimitDelayMs: parseFloat(options.rateLimitDelay) * 1000,
				accessKey,
				secretKey,
				output: options.output,
				minArchiveAge: options.minArchiveAge,
				maxArchiveAge: options.maxArchiveAge,
			});

			console.log("\nWayback Submission Results:");
			console.log(`Total URLs: ${result.totalUrls}`);
			console.log(`Submitted: ${result.submitted}`);
			console.log(`Successful: ${result.successful}`);
			console.log(`Failed: ${result.failed}`);
			console.log(`Skipped: ${result.skipped}`);
			console.log(`Duration: ${(result.duration / 1000 / 60).toFixed(1)} minutes`);

			if (result.ageStats) {
				console.log("\nArchive Age Analysis:");
				console.log(`Too recent (skipped): ${result.ageStats.tooNew}`);
				console.log(`Needs update: ${result.ageStats.needsUpdate}`);
				console.log(`Not archived: ${result.ageStats.notArchived}`);
			}

			if (result.errors.length > 0 && result.errors.length <= 10) {
				console.log("\nErrors:");
				result.errors.forEach((error) => console.log(`  - ${error}`));
			} else if (result.errors.length > 10) {
				console.log(`\n${result.errors.length} errors (see results file for details)`);
			}

			process.exit(result.failed === 0 ? 0 : 1);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("Wayback submission failed:", errorMessage);
			if (options.verbose) {
				const errorStack = error instanceof Error ? error.stack : String(error);
				console.error(errorStack);
			}
			process.exit(1);
		}
	});

// Wayback status command - view checkpoint data
program
	.command("wayback-status")
	.description("View Wayback submission status from checkpoint")
	.option("--checkpoint <file>", "Checkpoint file path", ".wayback-checkpoint.json")
	.option("--show-failed", "Show failed URLs", false)
	.option("--show-successful", "Show successful URLs", false)
	.option("--limit <n>", "Limit number of URLs to show", "20")
	.option("--export-failed <file>", "Export failed URLs to a file")
	.action(async (options) => {
		try {
			const checkpointPath = resolve(process.cwd(), options.checkpoint);
			const content = readFileSync(checkpointPath, "utf8");
			const checkpoint = JSON.parse(content);

			console.log("Wayback Checkpoint Status");
			console.log("=".repeat(50));
			console.log(`Checkpoint file: ${checkpointPath}`);
			console.log(`Last updated: ${new Date(checkpoint.lastUpdated).toLocaleString()}`);
			console.log(`Source: ${checkpoint.source || "unknown"}`);
			console.log("");

			console.log("Progress:");
			console.log(`  Total URLs tracked: ${checkpoint.totalUrls || "unknown"}`);
			console.log(`  Processed: ${checkpoint.processedUrls?.length || 0}`);
			console.log(`  Successful: ${checkpoint.successfulSubmissions?.length || 0}`);
			console.log(`  Failed: ${checkpoint.failedSubmissions?.length || 0}`);
			console.log("");

			// Group failures by error type
			if (checkpoint.failedSubmissions?.length > 0) {
				const errorGroups: Record<string, number> = {};
				const ageGroups: Record<string, number> = {};

				for (const sub of checkpoint.failedSubmissions) {
					const error = sub.error || "(empty error)";
					errorGroups[error] = (errorGroups[error] || 0) + 1;

					const age = sub.ageCheckResult || "unknown";
					ageGroups[age] = (ageGroups[age] || 0) + 1;
				}

				console.log("Failed by error type:");
				for (const [error, count] of Object.entries(errorGroups).sort((a, b) => b[1] - a[1])) {
					console.log(`  ${count}x: ${error.substring(0, 80)}`);
				}
				console.log("");

				console.log("Failed by age check:");
				for (const [age, count] of Object.entries(ageGroups).sort((a, b) => b[1] - a[1])) {
					console.log(`  ${count}x: ${age}`);
				}
				console.log("");
			}

			// Show failed URLs if requested
			if (options.showFailed && checkpoint.failedSubmissions?.length > 0) {
				const limit = parseInt(options.limit, 10);
				console.log(`Failed URLs (showing ${Math.min(limit, checkpoint.failedSubmissions.length)} of ${checkpoint.failedSubmissions.length}):`);
				for (const sub of checkpoint.failedSubmissions.slice(0, limit)) {
					console.log(`  [${sub.sourceType || "manual"}:${sub.itemId || sub.manualId}] ${sub.field}: ${sub.url}`);
					if (sub.error) {
						console.log(`    Error: ${sub.error}`);
					}
				}
				console.log("");
			}

			// Show successful URLs if requested
			if (options.showSuccessful && checkpoint.successfulSubmissions?.length > 0) {
				const limit = parseInt(options.limit, 10);
				console.log(`Successful URLs (showing ${Math.min(limit, checkpoint.successfulSubmissions.length)} of ${checkpoint.successfulSubmissions.length}):`);
				for (const sub of checkpoint.successfulSubmissions.slice(0, limit)) {
					console.log(`  [${sub.sourceType || "manual"}:${sub.itemId || sub.manualId}] ${sub.field}: ${sub.url}`);
					if (sub.archiveUrl) {
						console.log(`    Archive: ${sub.archiveUrl}`);
					}
				}
				console.log("");
			}

			// Export failed URLs to file if requested
			if (options.exportFailed && checkpoint.failedSubmissions?.length > 0) {
				const exportPath = resolve(process.cwd(), options.exportFailed);
				const failedUrls = checkpoint.failedSubmissions.map((sub: { url: string }) => sub.url);
				const { writeFileSync } = await import("fs");
				writeFileSync(exportPath, failedUrls.join("\n"), "utf8");
				console.log(`Exported ${failedUrls.length} failed URLs to ${exportPath}`);
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				console.error("No checkpoint file found. Run `wayback` command first to create one.");
			} else {
				console.error("Error reading checkpoint:", error instanceof Error ? error.message : String(error));
			}
			process.exit(1);
		}
	});

// Unify command implementation
program
	.command("unify")
	.description("Build unified product database by matching catalog items to manuals")
	.option("--data-dir <dir>", "Base data directory", "./data/bandai")
	.option("--output <dir>", "Output directory for unified data", "./data/bandai/unified")
	.option("--min-confidence <n>", "Minimum confidence for auto-match (0.0-1.0)", "0.70")
	.option("--review-threshold <n>", "Below this goes to orphans, above to review queue (0.0-1.0)", "0.50")
	.option("--dry-run", "Preview without writing files", false)
	.option("-v, --verbose", "Verbose output", false)
	.action(async (options) => {
		try {
			const { runUnification, printStats } = await import("../unify/unifier.js");
			const { resolve } = await import("path");

			const dataDir = resolve(process.cwd(), options.dataDir);
			const outputDir = resolve(process.cwd(), options.output);

			console.log("Building unified product database...");
			console.log(`Data directory: ${dataDir}`);
			console.log(`Output directory: ${outputDir}`);
			console.log(`Min confidence: ${options.minConfidence}`);
			console.log(`Review threshold: ${options.reviewThreshold}`);
			console.log(`Dry run: ${options.dryRun}`);
			console.log("");

			const stats = await runUnification(dataDir, {
				thresholds: {
					autoAccept: parseFloat(options.minConfidence),
					reviewCutoff: parseFloat(options.reviewThreshold),
				},
				dryRun: options.dryRun,
				outputDir,
			});

			printStats(stats);
			process.exit(0);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("Unification failed:", errorMessage);
			if (options.verbose) {
				const errorStack = error instanceof Error ? error.stack : String(error);
				console.error(errorStack);
			}
			process.exit(1);
		}
	});

program
	.command("config")
	.description("Manage configuration")
	.command("show")
	.description("Show current configuration")
	.action(() => {
		console.log("Current configuration:");
		console.log(JSON.stringify({
			status: "placeholder",
			futureScrapers: ["bandai", "gundam-info", "dalong"],
			futureFormats: ["json", "csv", "xlsx"],
			plannedFeatures: [
				"Web scraping with caching",
				"Data export functionality",
				"Progress tracking",
				"Error handling and retries"
			]
		}, null, 2));
	});

// Help command
program
	.command("help")
	.description("Show help information")
	.action(() => {
		program.outputHelp();
	});

// Parse command line arguments
if (process.argv.length < 3) {
	program.outputHelp();
	process.exit(1);
}

program.parse();