#!/usr/bin/env tsx
/**
 * Re-scrape items that have old image format (array of strings)
 * and migrate them to the new format (object with product/instructions)
 *
 * Uses the exported scrape APIs directly instead of accessing private methods.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { TranslationService } from "@hobby-ninja/translation";

import { BandaiCatalogParser } from "./bandai-catalog-parser.js";
import { GlobalSiteLookup } from "./global-site-lookup.js";
import { ManualParser } from "./manual-parser.js";
import {
	BrowserManager,
	processItemComplete,
	processManualComplete,
	type ItemProcessDeps,
	type ManualProcessDeps,
	type ScrapeOptions,
} from "./scrape/index.js";

const ITEMS_DIR = "data/src/items";
const PROGRESS_INTERVAL = 100;
const SECONDS_PER_MINUTE = 60;

interface OldFormatItem {
	id: string;
	file: string;
}

interface ItemJson {
	id: string;
	images: string[] | Record<string, unknown>;
}

function findOldFormatItems(): OldFormatItem[] {
	const files = readdirSync(ITEMS_DIR).filter(f => f.endsWith(".json") && f !== "index.json");
	const oldFormat: OldFormatItem[] = [];

	for (const file of files) {
		try {
			const data = JSON.parse(readFileSync(path.join(ITEMS_DIR, file), "utf8")) as ItemJson;
			// Old format: images is an array of strings
			if (Array.isArray(data.images) && data.images.length > 0) {
				oldFormat.push({ id: data.id, file });
			}
		} catch {
			// Skip invalid files
		}
	}

	return oldFormat;
}

async function main(): Promise<void> {
	const oldFormatItems = findOldFormatItems();
	console.log(`Found ${oldFormatItems.length} items with old image format\n`);

	if (oldFormatItems.length === 0) {
		console.log("No items to migrate.");
		return;
	}

	// Initialize all dependencies directly using exported APIs
	const browserManager = new BrowserManager();
	const parser = new BandaiCatalogParser();
	const globalLookup = new GlobalSiteLookup();
	const translator = new TranslationService();
	const manualParser = new ManualParser();

	await browserManager.initializeBrowser();

	const browserContext = browserManager.getBrowserContext();
	if (browserContext) {
		globalLookup.setBrowserContext(browserContext);
	}

	// Set up manual processing dependencies
	const manualDeps: ManualProcessDeps = {
		manualParser,
		translator,
	};

	// Set up item processing dependencies
	const itemDeps: ItemProcessDeps = {
		parser,
		globalLookup,
		translator,
		browserManager,
		processManualComplete: (manualId, opts) => processManualComplete(manualId, opts, manualDeps),
	};

	const options: ScrapeOptions = {
		language: "en",
		output: "./data/src",
		cache: true, // Use cached HTML if available to avoid re-fetching
		resume: false,
		dryRun: false,
		maxAgeDays: 30, // Use cache if less than 30 days old
	};

	let success = 0;
	let failed = 0;
	const startTime = Date.now();

	for (let i = 0; i < oldFormatItems.length; i++) {
		const item = oldFormatItems[i];
		if (!item) continue;

		const progress = `[${i + 1}/${oldFormatItems.length}]`;

		console.log(`\n${progress} Processing ${item.id}`);
		try {
			const result = await processItemComplete(item.id, options, itemDeps);
			if (result.success) {
				success++;
				console.log(`  ✓ Migrated successfully`);
			} else {
				failed++;
				console.log(`  ✗ Failed: ${result.error ?? "Unknown"}`);
			}
		} catch (error) {
			failed++;
			const msg = error instanceof Error ? error.message : "Unknown error";
			console.log(`  ✗ Error: ${msg}`);
		}

		// Progress report every PROGRESS_INTERVAL items
		if ((i + 1) % PROGRESS_INTERVAL === 0) {
			const elapsed = (Date.now() - startTime) / 1000;
			const rate = (i + 1) / elapsed;
			const remaining = (oldFormatItems.length - i - 1) / rate;
			console.log(
				`\n--- Progress: ${success} success, ${failed} failed, ~${Math.round(remaining / SECONDS_PER_MINUTE)} min remaining ---\n`,
			);
		}
	}

	await browserManager.cleanupBrowser();

	const elapsed = Math.round((Date.now() - startTime) / 1000);
	console.log(`\n=== Migration Complete ===`);
	console.log(`Success: ${success}`);
	console.log(`Failed: ${failed}`);
	console.log(`Time: ${Math.floor(elapsed / SECONDS_PER_MINUTE)}m ${elapsed % SECONDS_PER_MINUTE}s`);
}

await main();
