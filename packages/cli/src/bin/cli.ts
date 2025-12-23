#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TRANSLATION_STORE_DIR } from "@hobby-ninja/translation";
import { Command } from "commander";
import { config } from "dotenv";


// CLI-internal imports (not cross-package, so relative imports are appropriate)
 
import type { DownloadSource } from "../cli/download-command.js";
import type { NormalizeOptions } from "../cli/normalize-command.js";
import type { TranslateOptions, TranslateSource } from "../cli/translate-command.js";
import { CLI_COMMANDS, MESSAGES, FILES } from "../constants/index.js";
import type { WaybackSource } from "../types/wayback.js";

// Type guards for CLI options
const TRANSLATE_SOURCES: readonly TranslateSource[] = ["all", "bandai-catalog", "bandai-manuals"];
const NORMALIZE_SOURCES = ["all", "bandai-catalog", "bandai-manuals"] as const;
const DOWNLOAD_SOURCES: readonly DownloadSource[] = ["all", "manuals", "catalog"];
const WAYBACK_SOURCES: readonly WaybackSource[] = ["all", "manuals", "catalog"];

function isTranslateSource(value: unknown): value is TranslateSource {
	return typeof value === "string" && TRANSLATE_SOURCES.includes(value as TranslateSource);
}

function isDownloadSource(value: unknown): value is DownloadSource {
	return typeof value === "string" && DOWNLOAD_SOURCES.includes(value as DownloadSource);
}

function isWaybackSource(value: unknown): value is WaybackSource {
	return typeof value === "string" && WAYBACK_SOURCES.includes(value as WaybackSource);
}

function parseTranslateOptions(options: unknown): TranslateOptions {
	const opts = options as Record<string, unknown>;
	const source = opts["source"];
	if (!isTranslateSource(source)) {
		throw new Error(`Invalid source: ${String(source)}. Must be one of: ${TRANSLATE_SOURCES.join(", ")}`);
	}
	return {
		source,
		input: typeof opts["input"] === "string" ? opts["input"] : undefined,
		cacheDir: typeof opts["cacheDir"] === "string" ? opts["cacheDir"] : undefined,
		dryRun: opts["dryRun"] === true,
		verbose: opts["verbose"] === true,
	};
}

function parseNormalizeOptions(options: unknown): NormalizeOptions {
	const opts = options as Record<string, unknown>;
	const source = opts["source"];
	if (typeof source !== "string" || !NORMALIZE_SOURCES.includes(source as typeof NORMALIZE_SOURCES[number])) {
		throw new Error(`Invalid source: ${String(source)}. Must be one of: ${NORMALIZE_SOURCES.join(", ")}`);
	}
	return {
		source: source as NormalizeOptions["source"],
		input: typeof opts["input"] === "string" ? opts["input"] : undefined,
		dryRun: opts["dryRun"] === true,
		verbose: opts["verbose"] === true,
	};
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants for repeated strings
const COMMAND_NOT_IMPLEMENTED = "🚧 %s command is not yet implemented";
const VERBOSE_OPTION = "-v, --verbose";
const VERBOSE_OUTPUT_DESC = "Verbose output";
const DRY_RUN_OPTION = "--dry-run";
const SOURCE_OPTION = "--source <source>";
const OUTPUT_DIR_OPTION = "--output <dir>";
const INPUT_DIR_OPTION = "-i, --input <dir>";
const ALL_SOURCES = "all";
const PREVIEW_CHANGES = "Preview changes without writing";

// Error handling constants
const ERROR_PREFIX = "❌ Error in %s command: ";
const GENERIC_ERROR_PREFIX = "❌ %s failed: ";
const VERBOSE_STRING = "verbose";
const AUTHENTICATION_STRING = "Authentication: ";
const API_KEYS_PROVIDED_STRING = "API keys provided";
const NO_AUTHENTICATION_STRING = "No authentication";

// Time constants
const SECONDS_PER_MINUTE = 60;
const DISPLAY_LIMIT = 50;

// Load .env from repo root (packages/cli/src/bin -> repo root is 4 levels up)
config({ path: path.resolve(__dirname, "../../../../.env") });

const packageJson = JSON.parse(readFileSync(path.join(__dirname, "../../package.json"), "utf8")) as { version: string };
const version = packageJson.version;

const program = new Command();

program
	.name("gunpla-scraper")
	.description("CLI tool for scraping Gundam/Gunpla data from various sources (Placeholder)")
	.version(version);

// Scrape command - unified workflow: items → linked manuals → assets → orphan manuals
program
	.command(CLI_COMMANDS.SCRAPE)
	.description("Unified scrape: process items with linked manuals and download assets")
	.option("--max-age <days>", "Skip items checked within this many days (0 = process all)", "7")
	.option("-o, --output <dir>", "Output directory", FILES.OUTPUT_DIR)
	.option("-c, --cache", "Enable caching", true)
	.option(DRY_RUN_OPTION, "Show what would be processed without actual scraping", false)
	.option(VERBOSE_OPTION, MESSAGES.VERBOSE_OUTPUT, false)
	.option("--id <id>", "Scrape a single specific item ID (e.g., 01_1234, 1234, or 1)")
	.option("--start <id>", "Start ID for range (e.g., 01_1000)")
	.option("--end <id>", "End ID for range (e.g., 01_2000)")
	.option("--count <n>", "Number of items to process from start")
	.option("--profile", "Enable step timing profiling", false)
	.action(async (options: unknown) => {
		try {
			const { ScrapeCommand } = await import("../cli/scrape.js");
			const rawOptions = options as Record<string, unknown>;

			const maxAgeValue = rawOptions["maxAge"];
			const maxAgeStr = typeof maxAgeValue === "string" ? maxAgeValue : "7";
			const idFilter = rawOptions["id"] as string | undefined;
			const startFilter = rawOptions["start"] as string | undefined;
			const endFilter = rawOptions["end"] as string | undefined;
			const countFilter = rawOptions["count"] as string | undefined;

			console.log("Starting Unified Scraper...");
			console.log(`Max age: ${maxAgeStr === "0" ? "disabled (process all)" : `${maxAgeStr} days`}`);
			console.log(`Cache: ${rawOptions["cache"] ? "enabled" : "disabled"}`);
			console.log(`Dry run: ${String(rawOptions["dryRun"])}`);
			if (idFilter) {
				console.log(`ID filter: single item ${idFilter}`);
			} else if (startFilter) {
				if (endFilter) {
					console.log(`ID filter: range ${startFilter} to ${endFilter}`);
				} else if (countFilter) {
					console.log(`ID filter: ${countFilter} items starting from ${startFilter}`);
				} else {
					console.log(`ID filter: single item ${startFilter}`);
				}
			}
			console.log("");

			const scrapeCommand = new ScrapeCommand();
			const result = await scrapeCommand.execute({
				language: "all",
				output: rawOptions["output"] as string,
				cache: rawOptions["cache"] === true,
				resume: false,
				verbose: rawOptions["verbose"] === true,
				dryRun: rawOptions["dryRun"] === true,
				maxAgeDays: Number.parseInt(rawOptions["maxAge"] as string, 10),
				id: idFilter,
				start: startFilter,
				end: endFilter,
				count: countFilter ? Number.parseInt(countFilter, 10) : undefined,
				profile: rawOptions["profile"] === true,
			});

			console.log("\n=== Scrape Results ===");
			console.log(`\nItems:`);
			console.log(`  Total processed: ${result.totalProcessed}`);
			console.log(`  Successful: ${result.successful}`);
			console.log(`  Failed: ${result.failed}`);
			console.log(`  Cached: ${result.cached}`);
			console.log(`  New: ${result.new}`);

			console.log(`\nManuals:`);
			console.log(`  Discovered via items: ${result.discoveredManuals}`);
			console.log(`  Orphan manuals found: ${result.orphanManuals.total}`);
			console.log(`  Orphan manuals processed: ${result.orphanManuals.processed}`);
			console.log(`  Orphan manuals failed: ${result.orphanManuals.failed}`);

			console.log(`\nDuration: ${(result.duration / 1000).toFixed(2)}s`);

			if (result.errors.length > 0) {
				console.log("\nErrors:");
				const maxErrors = 10;
				for (const error of result.errors.slice(0, maxErrors)) { console.log(`  - ${error}`); }
				if (result.errors.length > maxErrors) {
					console.log(`  ... and ${result.errors.length - maxErrors} more errors`);
				}
			}

			const totalFailed = result.failed + result.orphanManuals.failed;
			if (totalFailed === 0) {
				console.log("\nScrape completed successfully!");
				process.exit(0);
			} else {
				console.log("\nScrape completed with errors");
				process.exit(1);
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(GENERIC_ERROR_PREFIX.replace("%s", "Scrape"), errorMessage);
			if ((options as Record<string, unknown>)[VERBOSE_STRING]) {
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
	.option(SOURCE_OPTION, "Data source (all, bandai-catalog, bandai-manuals)", ALL_SOURCES)
	.option(INPUT_DIR_OPTION, "Override input directory for the specified source")
	.option("-c, --cache-dir <dir>", "Directory for translation cache", TRANSLATION_STORE_DIR)
	.option(DRY_RUN_OPTION, PREVIEW_CHANGES, false)
	.option(VERBOSE_OPTION, VERBOSE_OUTPUT_DESC, false)
	.action(async (options: unknown) => {
		const parsedOptions = parseTranslateOptions(options);
		try {
			const { translateCatalogData } = await import("../cli/translate-command.js");
			await translateCatalogData(parsedOptions);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(ERROR_PREFIX.replace("%s", "translate"), errorMessage);
			if (parsedOptions.verbose) {
				const errorStack = error instanceof Error ? error.stack : String(error);
				console.error(errorStack);
			}
			process.exit(1);
		}
	});

// Global lookup command implementation
program
	.command("global-lookup")
	.description("Look up English translations from global.bandai-hobby.net")
	.option("-l, --limit <n>", "Maximum number of items to check", "0")
	.option(DRY_RUN_OPTION, PREVIEW_CHANGES, false)
	.option("--no-update-files", "Skip updating individual item files")
	.option("--retry-errors", "Retry items that had errors", false)
	.option("--headed", "Show browser window", false)
	.option(VERBOSE_OPTION, MESSAGES.VERBOSE_OUTPUT, false)
	.action(async (options: unknown) => {
		try {
			const { runGlobalLookup } = await import("../cli/global-lookup-command.js");
			const typedOptions = options as {
				limit: string;
				dryRun: boolean;
				updateFiles: boolean;
				retryErrors: boolean;
				headed: boolean;
				verbose: boolean;
			};

			await runGlobalLookup({
				limit: Number.parseInt(typedOptions.limit, 10),
				dryRun: typedOptions.dryRun,
				noUpdateFiles: !typedOptions.updateFiles,
				retryErrors: typedOptions.retryErrors,
				headed: typedOptions.headed,
				verbose: typedOptions.verbose,
			});

			process.exit(0);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(GENERIC_ERROR_PREFIX.replace("%s", "Global lookup"), errorMessage);
			if ((options as Record<string, unknown>)[VERBOSE_STRING]) {
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
	.option(SOURCE_OPTION, "Data source (all, bandai-catalog, bandai-manuals)", ALL_SOURCES)
	.option(INPUT_DIR_OPTION, "Override input directory for the specified source")
	.option(DRY_RUN_OPTION, PREVIEW_CHANGES, false)
	.option(VERBOSE_OPTION, VERBOSE_OUTPUT_DESC, false)
	.action(async (options: unknown) => {
		const parsedOptions = parseNormalizeOptions(options);
		try {
			const { normalizeData } = await import("../cli/normalize-command.js");
			await normalizeData(parsedOptions);
			process.exit(0);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(ERROR_PREFIX.replace("%s", "normalize").replace("❌ ", ""), errorMessage);
			if (parsedOptions.verbose) {
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
		console.log(COMMAND_NOT_IMPLEMENTED.replace("%s", "Export"));
		console.log("This will eventually export data in formats:");
		console.log("  - JSON (for web application)");
		console.log("  - CSV (for spreadsheets)");
		console.log("  - XLSX (for Excel)");
	});

program
	.command("cache")
	.description("Manage cache (PLACEHOLDER - Not yet implemented)")
	.action(() => {
		console.log(COMMAND_NOT_IMPLEMENTED.replace("%s", "Cache management"));
		console.log("This will eventually provide:");
		console.log("  - Clear cache functionality");
		console.log("  - Cache statistics");
		console.log("  - Cache size management");
	});

program
	.command("status")
	.description("Show scraping status and statistics (PLACEHOLDER - Not yet implemented)")
	.action(() => {
		console.log(COMMAND_NOT_IMPLEMENTED.replace("%s", "Status"));
		console.log("This will eventually show:");
		console.log("  - Scraping progress");
		console.log("  - Data statistics");
		console.log("  - Last update times");
	});

// Download command implementation
program
	.command("download")
	.description("Download images and PDFs from scraped data")
	.option(SOURCE_OPTION, "Data source (all, manuals, catalog)", ALL_SOURCES)
	.option("--manuals-source-dir <dir>", "Source directory for manual JSON files", "./data/raw/bandai/manuals")
	.option("--manuals-dir <dir>", "Output directory for manual assets", "./apps/next/public/manuals")
	.option("--catalog-dir <dir>", "Catalog data directory", "./data/src/items")
	.option("--catalog-images-dir <dir>", "Output directory for catalog images", "./apps/next/public/images/items")
	.option("--id <ids>", "Specific catalog IDs to download (comma-separated)", "")
	.option("--concurrency <n>", "Number of concurrent downloads", "1")
	.option("--delay <ms>", "Delay between batches in milliseconds", "0")
	.option("--recheck", "Recheck items and download missing images to complete arrays", false)
	.option(DRY_RUN_OPTION, "Show what would be downloaded without downloading", false)
	.option(VERBOSE_OPTION, VERBOSE_OUTPUT_DESC, false)
	.action(async (options: unknown) => {
		try {
			const { downloadAssets } = await import("../cli/download-command.js");
			const rawOptions = options as Record<string, unknown>;
			const source = rawOptions["source"];
			if (!isDownloadSource(source)) {
				throw new Error(`Invalid source: ${String(source)}. Must be one of: ${DOWNLOAD_SOURCES.join(", ")}`);
			}
			const typedOptions = {
				source,
				manualsSourceDir: rawOptions["manualsSourceDir"] as string,
				manualsDir: rawOptions["manualsDir"] as string,
				catalogDir: rawOptions["catalogDir"] as string,
				catalogImagesDir: rawOptions["catalogImagesDir"] as string,
				id: rawOptions["id"] as string,
				concurrency: rawOptions["concurrency"] as string,
				delay: rawOptions["delay"] as string,
				recheck: rawOptions["recheck"] === true,
				dryRun: rawOptions["dryRun"] === true,
				verbose: rawOptions["verbose"] === true,
			};

			console.log("Downloading assets from scraped data...");
			console.log(`Source: ${typedOptions.source}`);
			console.log(`Manuals source: ${typedOptions.manualsSourceDir}`);
			console.log(`Manuals output: ${typedOptions.manualsDir}`);
			console.log(`Catalog directory: ${typedOptions.catalogDir}`);
			console.log(`Catalog images output: ${typedOptions.catalogImagesDir}`);
			console.log(`Concurrency: ${typedOptions.concurrency}`);
			console.log(`Delay: ${typedOptions.delay}ms`);
			console.log(`Recheck: ${String(typedOptions.recheck)}`);
			console.log(`Dry run: ${String(typedOptions.dryRun)}`);
			console.log("");

			const result = await downloadAssets({
				source: typedOptions.source,
				manualsSourceDir: typedOptions.manualsSourceDir,
				manualsDir: typedOptions.manualsDir,
				catalogDir: typedOptions.catalogDir,
				catalogImagesDir: typedOptions.catalogImagesDir,
				catalogIds: typedOptions.id ? typedOptions.id.split(",").map(id => id.trim()) : undefined,
				concurrency: Number.parseInt(typedOptions.concurrency, 10),
				delayMs: Number.parseInt(typedOptions.delay, 10),
				recheck: typedOptions.recheck,
				dryRun: typedOptions.dryRun,
				verbose: typedOptions.verbose,
			});

			console.log("\nDownload Results:");
			console.log(`Total items processed: ${result.totalItems}`);
			console.log(`Downloaded: ${result.downloaded}`);
			console.log(`Skipped (already exist): ${result.skipped}`);
			console.log(`Failed: ${result.failed}`);
			console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);

			if (result.errors.length > 0 && result.errors.length <= 10) {
				console.log("\nErrors:");
				for (const error of result.errors) console.log(`  - ${error}`);
			} else if (result.errors.length > 10) {
				console.log(`\n${result.errors.length} errors occurred (showing first 10):`);
				for (const error of result.errors.slice(0, 10)) console.log(`  - ${error}`);
			}

			process.exit(result.failed === 0 ? 0 : 1);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(GENERIC_ERROR_PREFIX.replace("%s", "Download"), errorMessage);
			if ((options as Record<string, unknown>)[VERBOSE_STRING]) {
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
	.option(SOURCE_OPTION, "Data source (all, manuals, catalog)", ALL_SOURCES)
	.option("--manuals-dir <dir>", "Manual data directory", "./data/bandai/manuals")
	.option("--catalog-dir <dir>", "Catalog data directory", "./data/src/items")
	.option("--catalog-images-dir <dir>", "Output directory for catalog images", "./apps/next/public/images/items")
	.option("--id <ids>", "Specific catalog IDs to download (comma-separated)", "")
	.option(DRY_RUN_OPTION, "Show URLs without submitting", false)
	.option("--resume", "Resume from checkpoint", true)
	.option(VERBOSE_OPTION, "Verbose logging", false)
	.option("--retries <n>", "Retry attempts (-1 for unlimited)", "-1")
	.option("--delay <seconds>", "Delay between requests", "0")
	.option("--rate-limit-delay <seconds>", "Base delay after rate limit error", "30")
	.option("--access-key <key>", "Internet Archive S3 access key")
	.option("--secret-key <key>", "Internet Archive S3 secret key")
	.option(OUTPUT_DIR_OPTION, "Results directory", "./wayback-results")
	.option("--min-archive-age <duration>", "Skip archives newer than this (e.g., 30d, 6m)", "30d")
	.option("--max-archive-age <duration>", "Force re-archive if older than this (e.g., 1y, 18m)", "1y")
	.action(async (options: unknown) => {
		try {
			const { WaybackCommand } = await import("../cli/wayback.js");
			const waybackCommand = new WaybackCommand();
			const rawOptions = options as Record<string, unknown>;
			const source = rawOptions["source"];
			if (!isWaybackSource(source)) {
				throw new Error(`Invalid source: ${String(source)}. Must be one of: ${WAYBACK_SOURCES.join(", ")}`);
			}
			const typedOptions = {
				source,
				manualsDir: rawOptions["manualsDir"] as string,
				catalogDir: rawOptions["catalogDir"] as string,
				delay: rawOptions["delay"] as string,
				rateLimitDelay: rawOptions["rateLimitDelay"] as string,
				retries: rawOptions["retries"] as string,
				accessKey: rawOptions["accessKey"] as string | undefined,
				secretKey: rawOptions["secretKey"] as string | undefined,
				output: rawOptions["output"] as string,
				minArchiveAge: rawOptions["minArchiveAge"] as string,
				maxArchiveAge: rawOptions["maxArchiveAge"] as string,
				resume: rawOptions["resume"] === true,
				dryRun: rawOptions["dryRun"] === true,
				verbose: rawOptions["verbose"] === true,
			};

			// Parse API keys from options or environment
			const accessKey = typedOptions.accessKey ?? process.env["IA_ACCESS_KEY"];
			const secretKey = typedOptions.secretKey ?? process.env["IA_SECRET_KEY"];

			console.log("Submitting URLs to Internet Archive Wayback Machine...");
			console.log(`Source: ${typedOptions.source}`);
			console.log(`Manuals directory: ${typedOptions.manualsDir}`);
			console.log(`Catalog directory: ${typedOptions.catalogDir}`);
			console.log(`Delay between requests: ${typedOptions.delay}s`);
			console.log(`Rate limit retry delay: ${typedOptions.rateLimitDelay}s (exponential backoff)`);
			console.log(`Max retries: ${typedOptions.retries}`);
			console.log(AUTHENTICATION_STRING + (accessKey ? API_KEYS_PROVIDED_STRING : NO_AUTHENTICATION_STRING));
			console.log(`Archive age thresholds: min=${typedOptions.minArchiveAge}, max=${typedOptions.maxArchiveAge}`);
			console.log(`Resume: ${String(typedOptions.resume)}`);
			console.log(`Dry run: ${String(typedOptions.dryRun)}`);
			console.log("");

			const result = await waybackCommand.execute({
				source: typedOptions.source,
				manualsDir: typedOptions.manualsDir,
				catalogDir: typedOptions.catalogDir,
				fields: [], // Fields are determined by source type internally
				dryRun: typedOptions.dryRun,
				resume: typedOptions.resume,
				verbose: typedOptions.verbose,
				retries: Number.parseInt(typedOptions.retries, 10),
				delayMs: Number.parseFloat(typedOptions.delay) * 1000,
				rateLimitDelayMs: Number.parseFloat(typedOptions.rateLimitDelay) * 1000,
				accessKey,
				secretKey,
				output: typedOptions.output,
				minArchiveAge: typedOptions.minArchiveAge,
				maxArchiveAge: typedOptions.maxArchiveAge,
			});

			console.log("\nWayback Submission Results:");
			console.log(`Total URLs: ${result.totalUrls}`);
			console.log(`Submitted: ${result.submitted}`);
			console.log(`Successful: ${result.successful}`);
			console.log(`Failed: ${result.failed}`);
			console.log(`Skipped: ${result.skipped}`);
			console.log(`Duration: ${(result.duration / 1000 / SECONDS_PER_MINUTE).toFixed(1)} minutes`);

			console.log("\nArchive Age Analysis:");
			console.log(`Too recent (skipped): ${result.ageStats.tooNew}`);
			console.log(`Needs update: ${result.ageStats.needsUpdate}`);
			console.log(`Not archived: ${result.ageStats.notArchived}`);

			if (result.errors.length > 0 && result.errors.length <= 10) {
				console.log("\nErrors:");
				for (const error of result.errors) console.log(`  - ${error}`);
			} else if (result.errors.length > 10) {
				console.log(`\n${result.errors.length} errors (see results file for details)`);
			}

			process.exit(result.failed === 0 ? 0 : 1);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(GENERIC_ERROR_PREFIX.replace("%s", "Wayback submission"), errorMessage);
			if ((options as Record<string, unknown>)[VERBOSE_STRING]) {
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
	.action(async (options: unknown) => {
		try {
			const typedOptions = options as {
				checkpoint: string;
				showFailed: boolean;
				showSuccessful: boolean;
				limit: string;
				exportFailed?: string;
			};
			const checkpointPath: string = path.resolve(process.cwd(), typedOptions.checkpoint);
			const content: string = readFileSync(checkpointPath, "utf8");
			const checkpoint = JSON.parse(content) as {
				lastUpdated: string;
				source?: string;
				totalUrls?: number;
				processedUrls?: string[];
				successfulSubmissions?: Array<{
					sourceType?: string;
					itemId?: string;
					manualId?: string;
					field: string;
					url: string;
					archiveUrl?: string;
				}>;
				failedSubmissions?: Array<{
					sourceType?: string;
					itemId?: string;
					manualId?: string;
					field: string;
					url: string;
					error?: string;
					ageCheckResult?: string;
				}>;
			};

			console.log("Wayback Checkpoint Status");
			console.log("=".repeat(DISPLAY_LIMIT));
			console.log(`Checkpoint file: ${checkpointPath}`);
			console.log(`Last updated: ${new Date(checkpoint.lastUpdated).toLocaleString()}`);
			console.log(`Source: ${checkpoint.source ?? "unknown"}`);
			console.log("");

			console.log("Progress:");
			console.log(`  Total URLs tracked: ${checkpoint.totalUrls ?? "unknown"}`);
			console.log(`  Processed: ${checkpoint.processedUrls?.length ?? 0}`);
			console.log(`  Successful: ${checkpoint.successfulSubmissions?.length ?? 0}`);
			console.log(`  Failed: ${checkpoint.failedSubmissions?.length ?? 0}`);
			console.log("");

			// Group failures by error type
			if (checkpoint.failedSubmissions && checkpoint.failedSubmissions.length > 0) {
				const errorGroups: Record<string, number> = {};
				const ageGroups: Record<string, number> = {};

				for (const sub of checkpoint.failedSubmissions) {
					const error = sub.error ?? "(empty error)";
					errorGroups[error] = (errorGroups[error] ?? 0) + 1;

					const age = sub.ageCheckResult ?? "unknown";
					ageGroups[age] = (ageGroups[age] ?? 0) + 1;
				}

				console.log("Failed by error type:");
				for (const [error, count] of Object.entries(errorGroups).toSorted((a, b) => b[1] - a[1])) {
					console.log(`  ${count}x: ${error.slice(0, 80)}`);
				}
				console.log("");

				console.log("Failed by age check:");
				for (const [age, count] of Object.entries(ageGroups).toSorted((a, b) => b[1] - a[1])) {
					console.log(`  ${count}x: ${age}`);
				}
				console.log("");
			}

			// Show failed URLs if requested
			if (typedOptions.showFailed && checkpoint.failedSubmissions && checkpoint.failedSubmissions.length > 0) {
				const limit = Number.parseInt(typedOptions.limit, 10);
				console.log(`Failed URLs (showing ${Math.min(limit, checkpoint.failedSubmissions.length)} of ${checkpoint.failedSubmissions.length}):`);
				for (const sub of checkpoint.failedSubmissions.slice(0, limit)) {
					console.log(`  [${sub.sourceType ?? "manual"}:${sub.itemId ?? sub.manualId ?? "unknown"}] ${sub.field}: ${sub.url}`);
					if (sub.error) {
						console.log(`    Error: ${sub.error}`);
					}
				}
				console.log("");
			}

			// Show successful URLs if requested
			if (typedOptions.showSuccessful && checkpoint.successfulSubmissions && checkpoint.successfulSubmissions.length > 0) {
				const limit = Number.parseInt(typedOptions.limit, 10);
				console.log(`Successful URLs (showing ${Math.min(limit, checkpoint.successfulSubmissions.length)} of ${checkpoint.successfulSubmissions.length}):`);
				for (const sub of checkpoint.successfulSubmissions.slice(0, limit)) {
					console.log(`  [${sub.sourceType ?? "manual"}:${sub.itemId ?? sub.manualId ?? "unknown"}] ${sub.field}: ${sub.url}`);
					if (sub.archiveUrl) {
						console.log(`    Archive: ${sub.archiveUrl}`);
					}
				}
				console.log("");
			}

			// Export failed URLs to file if requested
			if (typedOptions.exportFailed && checkpoint.failedSubmissions && checkpoint.failedSubmissions.length > 0) {
				const exportPath: string = path.resolve(process.cwd(), typedOptions.exportFailed);
				const failedUrls = checkpoint.failedSubmissions.map((sub) => sub.url);
				const { writeFileSync } = await import("node:fs");
				writeFileSync(exportPath, failedUrls.join("\n"), "utf8");
				console.log(`Exported ${failedUrls.length} failed URLs to ${exportPath}`);
			}
		} catch (error: unknown) {
			const isEnoent = error instanceof Error && "code" in error && error.code === "ENOENT";
			if (isEnoent) {
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
	.option(OUTPUT_DIR_OPTION, "Output directory for unified data", "./data/bandai/unified")
	.option("--min-confidence <n>", "Minimum confidence for auto-match (0.0-1.0)", "0.70")
	.option("--review-threshold <n>", "Below this goes to orphans, above to review queue (0.0-1.0)", "0.50")
	.option(DRY_RUN_OPTION, "Preview without writing files", false)
	.option(VERBOSE_OPTION, VERBOSE_OUTPUT_DESC, false)
	.action(async (options: unknown) => {
		try {
			const { runUnification, printStats } = await import("../unify/unifier.js");
			const typedOptions = options as {
				dataDir: string;
				output: string;
				minConfidence: string;
				reviewThreshold: string;
				dryRun: boolean;
				verbose: boolean;
			};

			const dataDir: string = path.resolve(process.cwd(), typedOptions.dataDir);
			const outputDir: string = path.resolve(process.cwd(), typedOptions.output);

			console.log("Building unified product database...");
			console.log(`Data directory: ${dataDir}`);
			console.log(`Output directory: ${outputDir}`);
			console.log(`Min confidence: ${typedOptions.minConfidence}`);
			console.log(`Review threshold: ${typedOptions.reviewThreshold}`);
			console.log(`Dry run: ${String(typedOptions.dryRun)}`);
			console.log("");

			const stats = runUnification(dataDir, {
				thresholds: {
					autoAccept: Number.parseFloat(typedOptions.minConfidence),
					reviewCutoff: Number.parseFloat(typedOptions.reviewThreshold),
				},
				dryRun: typedOptions.dryRun,
				outputDir: outputDir,
			});

			printStats(stats);
			process.exit(0);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(GENERIC_ERROR_PREFIX.replace("%s", "Unification"), errorMessage);
			if ((options as Record<string, unknown>)[VERBOSE_STRING]) {
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
				"Error handling and retries",
			],
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