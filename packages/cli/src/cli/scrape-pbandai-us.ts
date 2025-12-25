#!/usr/bin/env tsx
/**
 * CLI script to scrape P-Bandai US product listings
 *
 * Usage:
 *   pnpm exec tsx packages/cli/src/cli/scrape-pbandai-us.ts [options]
 *
 * Options:
 *   --url <url>         Custom search URL (uses URL as-is, no pagination)
 *   --max-pages <n>     Maximum pages to fetch (default: unlimited)
 *   --incremental       Only fetch new items not in index
 *   --skip-images       Skip downloading images
 *   --skip-hash-index   Skip building hash index for image deduplication
 *   --page-delay <ms>   Delay between pages (default: 2000)
 *   --image-delay <ms>  Delay between image downloads (default: 500)
 *
 * Examples:
 *   # Default scrape (Gundam brand)
 *   pnpm exec tsx packages/cli/src/cli/scrape-pbandai-us.ts
 *
 *   # Custom search URL
 *   pnpm exec tsx packages/cli/src/cli/scrape-pbandai-us.ts \
 *     --url "https://p-bandai.com/us/search?limit=10000&_f_categories=04-004&_f_productStatuses=End,On,Waiting"
 */

import { ImageHashIndex } from "../utils/image-utils.js";

import { PBandaiUSListParser } from "./pbandai-us-list-parser.js";

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	// Parse CLI arguments
	const customUrl = getArgValue(args, "--url", String);
	const skipHashIndex = args.includes("--skip-hash-index");
	const options = {
		maxPages: getArgValue(args, "--max-pages", Number.parseInt),
		incrementalOnly: args.includes("--incremental"),
		skipImages: args.includes("--skip-images"),
		pageDelay: getArgValue(args, "--page-delay", Number.parseInt) ?? 2000,
		imageDelay: getArgValue(args, "--image-delay", Number.parseInt) ?? 500,
	};

	console.log("P-Bandai US List Scraper");
	console.log("========================");
	if (customUrl) {
		console.log("Mode: Custom URL");
		console.log(`URL: ${customUrl}`);
	} else {
		console.log("Mode: Default (Gundam brand)");
	}
	console.log("Options:", options);
	console.log();

	const parser = new PBandaiUSListParser();

	try {
		// Initialize hash index for image deduplication (item assets are authoritative)
		if (!skipHashIndex && !options.skipImages) {
			console.log("Building image hash index...");
			const hashIndex = new ImageHashIndex();
			await hashIndex.initialize();
			parser.setHashIndex(hashIndex);
		}

		console.log("Initializing browser...");
		await parser.init();

		const result = customUrl
			? await parser.scrapeFromUrl(customUrl, {
				skipImages: options.skipImages,
				imageDelay: options.imageDelay,
				incrementalOnly: options.incrementalOnly,
				pageDelay: options.pageDelay,
			})
			: await parser.scrape(options);

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
