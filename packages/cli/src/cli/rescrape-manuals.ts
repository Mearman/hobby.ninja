#!/usr/bin/env tsx
/**
 * Re-scrape specific manuals that need image re-download
 */

import { ScrapeCommand } from "./scrape.js";

const AFFECTED_MANUALS = [
	"157", "159", "162", "163", "176", "210", "211", "212", "215", "218",
	"232", "233", "235", "238", "239", "240", "242", "243", "245", "247",
	"250", "444", "448", "450", "520", "523", "527", "531", "537", "539",
	"540", "812", "813", "816", "819", "820", "867", "873", "875", "896",
	"897", "995", "1115", "1116", "1130", "1132", "1141", "1150", "1155",
];

async function main(): Promise<void> {
	console.log(`Re-scraping ${AFFECTED_MANUALS.length} manuals...\n`);

	const scraper = new ScrapeCommand();

	// @ts-expect-error - accessing private method
	await scraper.initializeBrowser();

	const options = {
		language: "en",
		output: "./data/src",
		cache: false,
		resume: false,
		dryRun: false,
		maxAgeDays: 0,
	};

	let success = 0;
	let failed = 0;

	for (const manualId of AFFECTED_MANUALS) {
		console.log(`\n--- Processing manual ${manualId} ---`);
		try {
			// @ts-expect-error - accessing private method
			const result = await scraper.processManualComplete(manualId, options);
			if (result.success) {
				success++;
				console.log(`  ✓ Success`);
			} else {
				failed++;
				console.log(`  ✗ Failed: ${result.error ?? "Unknown"}`);
			}
		} catch (error) {
			failed++;
			const msg = error instanceof Error ? error.message : "Unknown error";
			console.log(`  ✗ Error: ${msg}`);
		}
	}

	// @ts-expect-error - accessing private method for cleanup
	await (scraper.closeBrowser as () => Promise<void>)();

	console.log(`\n=== Complete ===`);
	console.log(`Success: ${success}`);
	console.log(`Failed: ${failed}`);
}

await main();
