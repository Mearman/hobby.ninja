#!/usr/bin/env node

import { Command } from "commander";

 
import { WaybackSource } from "../types/wayback.js";

import { CacheCommand } from "./cache.js";
import type { ScrapeOptions } from "./scrape/index.js";
import { ScrapeCommand } from "./scrape.js";
import { SingleUrlCommand } from "./single-url.js";
import { ValidateCommand } from "./validate.js";
import { WaybackCommand } from "./wayback.js";

// Constants for repeated strings
const DEFAULT_SOURCE = "bandai-hobby";
const DEFAULT_OUTPUT_DIR = "./output";
const DEFAULT_OUTPUT_OPTION = "--output <dir>";
const OUTPUT_DIR_DESC = "Output directory";
const UNKNOWN_ERROR = "Unknown error";
const SOURCE_LIST = "bandai-hobby, bandai-manual, gundam-info";
const SOURCE_OPTION = "--source <source>";

// Constants for time conversions
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

// Constants for exit codes
const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

// Constants for process radix
const DECIMAL_RADIX = 10;

// Constants for error display limits
const MAX_ERROR_DISPLAY_COUNT = 10;

// Type for Commander option values
type CommanderOptions = Record<string, string | boolean | undefined>;

const program = new Command();

program
	.name("gundam-scraper")
	.description("CLI tool for scraping Gundam data from Bandai sources")
	.version("0.0.1");

program
	.command("scrape")
	.description("Scrape data from configured sources")
	.option(SOURCE_OPTION, `Source to scrape (${SOURCE_LIST})`, DEFAULT_SOURCE)
	.option("--language <lang>", "Language filter (en, ja, all)", "all")
	.option(DEFAULT_OUTPUT_OPTION, OUTPUT_DIR_DESC, DEFAULT_OUTPUT_DIR)
	.option("--cache", "Enable caching", true)
	.option("--resume", "Resume from last checkpoint", false)
	.option("--dry-run", "Perform dry run without actual scraping", false)
	.option("--max-age <days>", "Skip items checked within this many days (0 = no filtering)", "7")
	.option("--id <id>", "Scrape a single specific item ID (e.g., 01_1234)")
	.option("--start <id>", "Start ID for range (e.g., 01_1000)")
	.option("--end <id>", "End ID for range (e.g., 01_2000)")
	.option("--count <n>", "Number of items to process from start")
	.option("--profile", "Enable step timing profiling", false)
	.action(async (options: CommanderOptions) => {
		const scrapeCommand = new ScrapeCommand();
		const scrapeOptions: ScrapeOptions = {
			language: options.language as string,
			output: options.output as string,
			cache: options.cache as boolean,
			resume: options.resume as boolean,
			dryRun: options.dryRun as boolean,
			maxAgeDays: Number.parseInt(options.maxAge as string, DECIMAL_RADIX),
			id: options.id as string | undefined,
			start: options.start as string | undefined,
			end: options.end as string | undefined,
			count: options.count ? Number.parseInt(options.count as string, DECIMAL_RADIX) : undefined,
			profile: options.profile as boolean,
		};

		try {
			console.log("Starting Gundam Data Scraper...");
			console.log(`Language: ${scrapeOptions.language}`);
			console.log(`Output: ${scrapeOptions.output}`);
			console.log(`Cache: ${scrapeOptions.cache ? "enabled" : "disabled"}`);
			console.log(`Max age: ${scrapeOptions.maxAgeDays === 0 ? "disabled (scrape all)" : `${scrapeOptions.maxAgeDays} days`}`);
			if (scrapeOptions.id) {
				console.log(`ID filter: single item ${scrapeOptions.id}`);
			} else if (scrapeOptions.start) {
				if (scrapeOptions.end) {
					console.log(`ID filter: range ${scrapeOptions.start} to ${scrapeOptions.end}`);
				} else if (scrapeOptions.count) {
					console.log(`ID filter: ${scrapeOptions.count} items starting from ${scrapeOptions.start}`);
				} else {
					console.log(`ID filter: single item ${scrapeOptions.start}`);
				}
			}
			console.log("");

			const result = await scrapeCommand.execute(scrapeOptions);

			console.log("\n📊 Scrape Results:");
			console.log(`Total processed: ${result.totalProcessed}`);
			console.log(`Successful: ${result.successful}`);
			console.log(`Failed: ${result.failed}`);
			console.log(`Cached: ${result.cached}`);
			console.log(`New: ${result.new}`);
			console.log(`Duration: ${(result.duration / MS_PER_SECOND).toFixed(2)}s`);

			if (result.errors.length > 0) {
				console.log("\n❌ Errors:");
				for (const error of result.errors) { console.log(`  - ${error}`); }
			}

			if (result.failed === 0) {
				console.log("\n✅ Scrape completed successfully!");
				process.exit(EXIT_SUCCESS);
			} else {
				console.log("\n⚠️ Scrape completed with errors");
				process.exit(EXIT_FAILURE);
			}
		} catch (error) {
			console.error("❌ Scrape failed:", error instanceof Error ? error.message : UNKNOWN_ERROR);
			process.exit(EXIT_FAILURE);
		}
	});

program
	.command("cache")
	.description("Manage cache")
	.option("--clear", "Clear all cached data")
	.option("--stats", "Show cache statistics")
	.option("--cleanup", "Remove expired entries")
	.action(async (options: CommanderOptions) => {
		const cacheCommand = new CacheCommand();
		await cacheCommand.execute(options as Parameters<typeof cacheCommand.execute>[0]);
	});

program
	.command("validate")
	.description("Validate scraped data")
	.option(SOURCE_OPTION, `Source to validate (${SOURCE_LIST}, all)`)
	.option("--fix", "Attempt to fix validation errors")
	.option("--file <file>", "Specific file to validate")
	.option(DEFAULT_OUTPUT_OPTION, "Output directory for fixed files", DEFAULT_OUTPUT_DIR)
	.action(async (options: CommanderOptions) => {
		const validateCommand = new ValidateCommand();
		await validateCommand.execute(options as Parameters<typeof validateCommand.execute>[0]);
	});

program
	.command("single-url")
	.description("Scrape data from a single URL")
	.argument("<url>", "URL to scrape (must be from bandai-hobby.net, manual.bandai-hobby.net, or gundam.info)")
	.option(DEFAULT_OUTPUT_OPTION, OUTPUT_DIR_DESC, "./gundam-single-scrape")
	.option("--verbose", "Enable verbose logging", false)
	.action(async (url: string, options: CommanderOptions) => {
		const singleUrlCommand = new SingleUrlCommand();

		try {
			const result = await singleUrlCommand.execute({
				url,
				output: options.output as string,
				verbose: options.verbose as boolean,
			});

			if (result.success) {
				console.log("\n🎉 Single URL scraping completed!");
				console.log(`URL: ${result.url}`);

				if (result.skus && result.skus.length > 0) {
					console.log(`SKUs found: ${result.skus.join(", ")}`);
				}

				if (result.outputFile) {
					console.log(`Output: ${result.outputFile}`);
				}

				process.exit(EXIT_SUCCESS);
			} else {
				console.error("❌ Single URL scraping failed:", result.error);
				process.exit(EXIT_FAILURE);
			}
		} catch (error) {
			console.error("❌ Single URL scraping failed:", error instanceof Error ? error.message : UNKNOWN_ERROR);
			process.exit(EXIT_FAILURE);
		}
	});

program
	.command("wayback")
	.description("Submit URLs to Internet Archive Wayback Machine")
	.option(SOURCE_OPTION, "Data source (all, manuals, catalog)", "all")
	.option("--manuals-dir <dir>", "Manual data directory", "./data/bandai/manuals")
	.option("--catalog-dir <dir>", "Catalog data directory", "./data/bandai/items")
	.option("--dry-run", "Show URLs without submitting", false)
	.option("--resume", "Resume from checkpoint", true)
	.option("--verbose", "Verbose logging", false)
	.option("--retries <n>", "Retry attempts (-1 for unlimited)", "-1")
	.option("--delay <seconds>", "Delay between requests", "0")
	.option("--rate-limit-delay <seconds>", "Base delay after rate limit error", "30")
	.option("--access-key <key>", "Internet Archive S3 access key")
	.option("--secret-key <key>", "Internet Archive S3 secret key")
	.option(DEFAULT_OUTPUT_OPTION, "Results directory", "./wayback-results")
	.option("--min-archive-age <duration>", "Skip archives newer than this (e.g., 30d, 6m)", "30d")
	.option("--max-archive-age <duration>", "Force re-archive if older than this (e.g., 1y, 18m)", "1y")
	.action(async (options: CommanderOptions) => {
		const waybackCommand = new WaybackCommand();

		try {
			// Parse API keys from options or environment
			const accessKey = (options.accessKey as string | undefined) ?? process.env["IA_ACCESS_KEY"];
			const secretKey = (options.secretKey as string | undefined) ?? process.env["IA_SECRET_KEY"];

			const source = options.source as string;
			const manualsDir = options.manualsDir as string;
			const catalogDir = options.catalogDir as string;
			const delay = options.delay as string;
			const rateLimitDelay = options.rateLimitDelay as string;
			const retries = options.retries as string;
			const minArchiveAge = options.minArchiveAge as string;
			const maxArchiveAge = options.maxArchiveAge as string;
			const resume = options.resume as boolean;
			const dryRun = options.dryRun as boolean;

			console.log("Submitting URLs to Internet Archive Wayback Machine...");
			console.log(`Source: ${source}`);
			console.log(`Manuals directory: ${manualsDir}`);
			console.log(`Catalog directory: ${catalogDir}`);
			console.log(`Delay between requests: ${delay}s`);
			console.log(`Rate limit retry delay: ${rateLimitDelay}s (exponential backoff)`);
			console.log(`Max retries: ${retries}`);
			console.log(`Authentication: ${accessKey ? "API keys provided" : "No authentication"}`);
			console.log(`Archive age thresholds: min=${minArchiveAge}, max=${maxArchiveAge}`);
			console.log(`Resume: ${String(resume)}`);
			console.log(`Dry run: ${String(dryRun)}`);
			console.log("");

			const result = await waybackCommand.execute({
				source: source as WaybackSource,
				manualsDir,
				catalogDir,
				fields: [], // Fields are determined by source type internally
				dryRun,
				resume,
				verbose: options.verbose as boolean,
				retries: Number.parseInt(retries, DECIMAL_RADIX),
				delayMs: Number.parseFloat(delay) * MS_PER_SECOND,
				rateLimitDelayMs: Number.parseFloat(rateLimitDelay) * MS_PER_SECOND,
				accessKey,
				secretKey,
				output: options.output as string,
				minArchiveAge,
				maxArchiveAge,
			});

			console.log("\nWayback Submission Results:");
			console.log(`Total URLs: ${result.totalUrls}`);
			console.log(`Submitted: ${result.submitted}`);
			console.log(`Successful: ${result.successful}`);
			console.log(`Failed: ${result.failed}`);
			console.log(`Skipped: ${result.skipped}`);
			console.log(`Duration: ${(result.duration / MS_PER_SECOND / SECONDS_PER_MINUTE).toFixed(1)} minutes`);

			console.log("\nArchive Age Analysis:");
			console.log(`Too recent (skipped): ${result.ageStats.tooNew}`);
			console.log(`Needs update: ${result.ageStats.needsUpdate}`);
			console.log(`Not archived: ${result.ageStats.notArchived}`);

			if (result.errors.length > 0 && result.errors.length <= MAX_ERROR_DISPLAY_COUNT) {
				console.log("\nErrors:");
				for (const error of result.errors) { console.log(`  - ${error}`); }
			} else if (result.errors.length > MAX_ERROR_DISPLAY_COUNT) {
				console.log(`\n${result.errors.length} errors (see results file for details)`);
			}

			process.exit(result.failed === 0 ? EXIT_SUCCESS : EXIT_FAILURE);
		} catch (error) {
			console.error("Wayback submission failed:", error instanceof Error ? error.message : UNKNOWN_ERROR);
			process.exit(EXIT_FAILURE);
		}
	});

if (require.main === module) {
	program.parse();
}