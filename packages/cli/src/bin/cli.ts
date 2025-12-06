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