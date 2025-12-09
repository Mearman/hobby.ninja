#!/usr/bin/env node

import { Command } from "commander";

import { WaybackSource } from "../types/wayback.js";

import { CacheCommand } from "./cache.js";
import { ScrapeCommand, ScrapeOptions } from "./scrape.js";
import { SingleUrlCommand } from "./single-url.js";
import { ValidateCommand } from "./validate.js";
import { WaybackCommand } from "./wayback.js";


const program = new Command();

program
	.name("gundam-scraper")
	.description("CLI tool for scraping Gundam data from Bandai sources")
	.version("0.0.1");

program
	.command("scrape")
	.description("Scrape data from configured sources")
	.option("--source <source>", "Source to scrape (bandai-hobby, bandai-manual, gundam-info)", "bandai-hobby")
	.option("--language <lang>", "Language filter (en, ja, all)", "all")
	.option("--output <dir>", "Output directory", "./output")
	.option("--cache", "Enable caching", true)
	.option("--resume", "Resume from last checkpoint", false)
	.option("--verbose", "Enable verbose logging", false)
	.option("--dry-run", "Perform dry run without actual scraping", false)
	.action(async (options) => {
		const scrapeCommand = new ScrapeCommand();
		const scrapeOptions: ScrapeOptions = {
			source: options.source,
			language: options.language,
			output: options.output,
			cache: options.cache,
			resume: options.resume,
			verbose: options.verbose,
			dryRun: options.dryRun,
		};

		try {
			console.log("🚀 Starting Gundam Data Scraper...");
			console.log(`Source: ${scrapeOptions.source}`);
			console.log(`Language: ${scrapeOptions.language}`);
			console.log(`Output: ${scrapeOptions.output}`);
			console.log(`Cache: ${scrapeOptions.cache ? "enabled" : "disabled"}`);
			console.log("");

			const result = await scrapeCommand.execute(scrapeOptions);

			console.log("\n📊 Scrape Results:");
			console.log(`Total processed: ${result.totalProcessed}`);
			console.log(`Successful: ${result.successful}`);
			console.log(`Failed: ${result.failed}`);
			console.log(`Cached: ${result.cached}`);
			console.log(`New: ${result.new}`);
			console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);

			if (result.errors.length > 0) {
				console.log("\n❌ Errors:");
				for (const error of result.errors) { console.log(`  - ${error}`); }
			}

			if (result.failed === 0) {
				console.log("\n✅ Scrape completed successfully!");
				process.exit(0);
			} else {
				console.log("\n⚠️ Scrape completed with errors");
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Scrape failed:", error instanceof Error ? error.message : "Unknown error");
			process.exit(1);
		}
	});

program
	.command("cache")
	.description("Manage cache")
	.option("--clear", "Clear all cached data")
	.option("--stats", "Show cache statistics")
	.option("--cleanup", "Remove expired entries")
	.action(async (options) => {
		const cacheCommand = new CacheCommand();
		await cacheCommand.execute(options);
	});

program
	.command("validate")
	.description("Validate scraped data")
	.option("--source <source>", "Source to validate (bandai-hobby, bandai-manual, gundam-info, all)")
	.option("--fix", "Attempt to fix validation errors")
	.option("--file <file>", "Specific file to validate")
	.option("--output <dir>", "Output directory for fixed files", "./output")
	.action(async (options) => {
		const validateCommand = new ValidateCommand();
		await validateCommand.execute(options);
	});

program
	.command("single-url")
	.description("Scrape data from a single URL")
	.argument("<url>", "URL to scrape (must be from bandai-hobby.net, manual.bandai-hobby.net, or gundam.info)")
	.option("--output <dir>", "Output directory", "./gundam-single-scrape")
	.option("--verbose", "Enable verbose logging", false)
	.action(async (url, options) => {
		const singleUrlCommand = new SingleUrlCommand();

		try {
			const result = await singleUrlCommand.execute({
				url,
				output: options.output,
				verbose: options.verbose,
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

				process.exit(0);
			} else {
				console.error("❌ Single URL scraping failed:", result.error);
				process.exit(1);
			}
		} catch (error) {
			console.error("❌ Single URL scraping failed:", error instanceof Error ? error.message : "Unknown error");
			process.exit(1);
		}
	});

program
	.command("wayback")
	.description("Submit URLs to Internet Archive Wayback Machine")
	.option("--source <source>", "Data source (all, manuals, catalog)", "all")
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
	.option("--output <dir>", "Results directory", "./wayback-results")
	.option("--min-archive-age <duration>", "Skip archives newer than this (e.g., 30d, 6m)", "30d")
	.option("--max-archive-age <duration>", "Force re-archive if older than this (e.g., 1y, 18m)", "1y")
	.action(async (options) => {
		const waybackCommand = new WaybackCommand();

		try {
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
				source: options.source as WaybackSource,
				manualsDir: options.manualsDir,
				catalogDir: options.catalogDir,
				fields: [], // Fields are determined by source type internally
				dryRun: options.dryRun,
				resume: options.resume,
				verbose: options.verbose,
				retries: Number.parseInt(options.retries, 10),
				delayMs: Number.parseFloat(options.delay) * 1000,
				rateLimitDelayMs: Number.parseFloat(options.rateLimitDelay) * 1000,
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
				for (const error of result.errors) { console.log(`  - ${error}`); }
			} else if (result.errors.length > 10) {
				console.log(`\n${result.errors.length} errors (see results file for details)`);
			}

			process.exit(result.failed === 0 ? 0 : 1);
		} catch (error) {
			console.error("Wayback submission failed:", error instanceof Error ? error.message : "Unknown error");
			process.exit(1);
		}
	});

if (require.main === module) {
	program.parse();
}