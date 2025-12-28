#!/usr/bin/env node

/**
 * CLI command entry point for URL scanner
 *
 * Usage:
 *   scan-urls <url-file> [options]
 *   scan-urls --url <single-url> [options]
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { URLScanner } from "../url-scanner/scanner.js";

const DEFAULT_OUTPUT_DIR = "./scan-results";
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_DELAY_MS = 500;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_USER_AGENT = "GundamURLScanner/1.0";

interface CLIOptions {
  url?: string;
  file?: string;
  output?: string;
  concurrency?: number;
  timeout?: number;
  retries?: number;
  delay?: number;
  progress?: string;
  resume?: boolean;
  userAgent?: string;
  followRedirects?: boolean;
  maxRedirects?: number;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions & { help?: boolean } {
	const args = process.argv.slice(2);
	const options: CLIOptions & { help?: boolean } = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		switch (arg) {
			case "--help":
			case "-h": {
				options.help = true;
				break;
			}

			case "--url":
			case "-u": {
				options.url = nextArg;
				i++; // Skip next arg
				break;
			}

			case "--output":
			case "-o": {
				options.output = nextArg;
				i++; // Skip next arg
				break;
			}

			case "--concurrency":
			case "-c": {
				options.concurrency = Number.parseInt(nextArg, 10);
				i++; // Skip next arg
				break;
			}

			case "--timeout":
			case "-t": {
				options.timeout = Number.parseInt(nextArg, 10);
				i++; // Skip next arg
				break;
			}

			case "--retries":
			case "-r": {
				options.retries = Number.parseInt(nextArg, 10);
				i++; // Skip next arg
				break;
			}

			case "--delay":
			case "-d": {
				options.delay = Number.parseInt(nextArg, 10);
				i++; // Skip next arg
				break;
			}

			case "--progress":
			case "-p": {
				options.progress = nextArg;
				i++; // Skip next arg
				break;
			}

			case "--resume": {
				options.resume = true;
				break;
			}

			case "--user-agent": {
				options.userAgent = nextArg;
				i++; // Skip next arg
				break;
			}

			case "--no-redirects": {
				options.followRedirects = false;
				break;
			}

			case "--max-redirects": {
				options.maxRedirects = Number.parseInt(nextArg, 10);
				i++; // Skip next arg
				break;
			}

			default: {
				// If not a flag, treat as file path
				if (!arg.startsWith("-") && !options.file && !options.url) {
					options.file = arg;
				}
				break;
			}
		}
	}

	return options;
}

/**
 * Show help message
 */
function showHelp(): void {
	console.log(`
URL Scanner - Check URLs for static data availability

USAGE:
  scan-urls <file> [options]        Scan URLs from file
  scan-urls --url <url> [options]   Scan single URL

ARGUMENTS:
  <file>                          Path to file containing URLs (one per line)

OPTIONS:
  -u, --url <url>                Single URL to scan
  -o, --output <dir>             Output directory (default: ./scan-results)
  -c, --concurrency <num>        Concurrent requests (default: 3)
  -t, --timeout <ms>             Request timeout (default: 10000)
  -r, --retries <num>            Retry attempts (default: 3)
  -d, --delay <ms>               Delay between requests (default: 500)
  -p, --progress <file>          Progress file for resume capability
  --resume                       Resume from progress file
  --user-agent <agent>           Custom user agent string
  --no-redirects                 Don't follow redirects
  --max-redirects <num>          Maximum redirects (default: 5)
  -h, --help                     Show this help

EXAMPLES:
  # Scan URLs from file
  scan-urls urls.txt --output ./results

  # Scan single URL with custom settings
  scan-urls --url "https://bandai-hobby.net/item/01_3804/" --timeout 15000

  # Resume interrupted scan
  scan-urls urls.txt --progress scan-progress.json --resume

  # Test with real Bandai URLs
  scan-urls --url "https://bandai-hobby.net/item/01_3804/"
  scan-urls --url "https://manual.bandai-hobby.net/menus/detail/652/"
  scan-urls --url "https://p-bandai.com/us/item/F2434385006"

OUTPUT FILES:
  Single JSON file is created in the output directory:
  - scan-results.json      - All scan results with metadata

  JSON Structure:
  {
    "scanInfo": {
      "timestamp": "2025-12-05T...",
      "version": "1.0.0",
      "scannerType": "bandai-url-scanner"
    },
    "results": [
      {
        "url": "https://...",
        "timestamp": "2025-12-05T...",
        "status": "valid|invalid",
        "hasStaticData": true,
        "dataType": "complete|partial|none",
        "confidence": 0.85,
        "indicators": ["static-title", "structured-data"],
        "statusCode": 200,
        "finalUrl": "https://...",
        "error": null
      }
    ]
  }
`);
}

/**
 * Read URLs from file
 */
async function readUrlsFromFile(filePath: string): Promise<string[]> {
	try {
		const content = await fs.readFile(filePath, "utf8");
		return content
			.split("\n")
			.map(line => line.trim())
			.filter(line => line.length > 0 && !line.startsWith("#"));
	} catch (error) {
		throw new Error(`Failed to read URLs from file "${filePath}": ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
	try {
		const options = parseArgs();

		if (options.help) {
			showHelp();
			process.exit(0);
		}

		if (!options.url && !options.file) {
			console.error("Error: Please provide either a URL file (--file) or single URL (--url)");
			console.error("Use --help for usage information");
			process.exit(1);
		}

		// Get URLs to scan
		let urls: string[] = [];
		if (options.url) {
			urls = [options.url];
		} else if (options.file) {
			urls = await readUrlsFromFile(options.file);
		}

		if (urls.length === 0) {
			console.error("Error: No URLs to scan");
			process.exit(1);
		}

		const outputDir = options.output ?? DEFAULT_OUTPUT_DIR;
		console.log(`Initializing URL scanner...`);
		console.log(`URLs to scan: ${urls.length}`);
		console.log(`Output directory: ${outputDir}`);

		// Initialize scanner
		const scanner = new URLScanner();
		await scanner.initialize({
			urlPatterns: [],
			concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
			timeoutMs: options.timeout ?? DEFAULT_TIMEOUT_MS,
			retryAttempts: options.retries ?? DEFAULT_RETRIES,
			requestDelayMs: options.delay ?? DEFAULT_DELAY_MS,
			outputDirectory: outputDir,
			followRedirects: options.followRedirects !== false,
			maxRedirects: options.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
			userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
			progressFile: options.progress,
		});

		// Show progress if resuming
		if (options.resume && options.progress) {
			const progress = scanner.getProgress();
			console.log(`Resuming from previous scan: ${progress.totalProcessed} URLs already processed`);
		}

		console.log("Starting URL scan...\n");

		// Scan URLs
		const startTime = Date.now();
		const results = await scanner.scanUrls(urls);
		const endTime = Date.now();

		// Show results
		console.log("\n=== Scan Results ===");
		const stats = scanner.getStatistics();

		console.log(`Total URLs: ${stats.totalProcessed}`);
		console.log(`Successful: ${Math.round(stats.successRate * 100)}%`);
		console.log(`Static data available: ${Math.round(stats.staticDataRate * 100)}%`);
		console.log(`Average confidence: ${stats.averageConfidence.toFixed(2)}`);
		console.log(`Duration: ${((endTime - startTime) / 1000).toFixed(1)}s`);

		// Show categorized results
		const staticResults = results.filter(r => r.isValid && r.hasStaticData);
		const dynamicResults = results.filter(r => r.isValid && !r.hasStaticData);
		const invalidResults = results.filter(r => !r.isValid);

		console.log(`\n--- Static Data URLs (${staticResults.length}) ---`);
		for (const result of staticResults) {
			console.log(`  ✓ ${result.url} (${result.dataType}, confidence: ${result.confidence.toFixed(2)})`);
		}

		console.log(`\n--- Dynamic/JavaScript URLs (${dynamicResults.length}) ---`);
		for (const result of dynamicResults) {
			console.log(`  ⚡ ${result.url} (${result.dataType}, confidence: ${result.confidence.toFixed(2)})`);
		}

		console.log(`\n--- Invalid/Error URLs (${invalidResults.length}) ---`);
		for (const result of invalidResults) {
			console.log(`  ✗ ${result.url} (${result.error ?? "Invalid"})`);
		}

		console.log(`\nResults saved to: ${path.join(outputDir, "scan-results.json")}`);

	} catch (error) {
		console.error("Error:", error instanceof Error ? error.message : "Unknown error");
		process.exit(1);
	}
}

// Run main function
if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}