#!/usr/bin/env tsx
/**
 * CLI script to scrape P-Bandai US product listings
 *
 * Usage:
 *   pnpm exec tsx packages/cli/src/cli/scrape-pbandai-us.ts [options]
 *
 * Options:
 *   --max-pages <n>     Maximum pages to fetch (default: unlimited)
 *   --incremental       Only fetch new items not in index
 *   --skip-images       Skip downloading images
 *   --page-delay <ms>   Delay between pages (default: 2000)
 *   --image-delay <ms>  Delay between image downloads (default: 500)
 */

import { PBandaiUSListParser } from "./pbandai-us-list-parser.js";

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	// Parse CLI arguments
	const options = {
		maxPages: getArgValue(args, "--max-pages", Number.parseInt),
		incrementalOnly: args.includes("--incremental"),
		skipImages: args.includes("--skip-images"),
		pageDelay: getArgValue(args, "--page-delay", Number.parseInt) ?? 2000,
		imageDelay: getArgValue(args, "--image-delay", Number.parseInt) ?? 500,
	};

	console.log("P-Bandai US List Scraper");
	console.log("========================");
	console.log("Options:", options);
	console.log();

	const parser = new PBandaiUSListParser();

	try {
		console.log("Initializing browser...");
		await parser.init();

		const result = await parser.scrape(options);

		console.log("\n========================");
		console.log("Final Results:");
		console.log(`  New items discovered: ${result.newItems}`);
		console.log(`  Items updated: ${result.updatedItems}`);
		console.log(`  Total items in index: ${result.totalItems}`);
		console.log(`  Images downloaded: ${result.imagesDownloaded}`);
	} finally {
		await parser.close();
	}
}

function getArgValue<T>(
	args: string[],
	flag: string,
	parser: (value: string) => T,
): T | undefined {
	const index = args.indexOf(flag);
	if (index !== -1 && args[index + 1]) {
		return parser(args[index + 1]);
	}
	return undefined;
}

try {
	await main();
} catch (error: unknown) {
	console.error("Fatal error:", error);
	process.exit(1);
}
