/**
 * Extract brand and series translations from global site
 *
 * Fetches global site pages for items we know have English versions
 * and extracts official English names for brands and series from breadcrumbs.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";
import { load as cheerioLoad } from "cheerio";
import { chromium, type Page } from "playwright";

const ITEMS_PATH = resolveWorkspacePath("data/src/items");
const ITEMS_INDEX_PATH = path.join(ITEMS_PATH, "index.json");
const GLOBAL_BASE_URL = "https://global.bandai-hobby.net/en-us";
const PROGRESS_LOG_INTERVAL = 50;

interface ItemsIndex {
	items: Record<string, {
		globalSite?: {
			hasPage: boolean;
		};
	}>;
}

interface ExtractedTranslation {
	urlSlug: string;
	englishName: string;
	sourceItemId: string;
}

interface TranslationMap {
	brands: Map<string, ExtractedTranslation>;
	series: Map<string, ExtractedTranslation>;
}

async function extractBrandSeries(page: Page, itemId: string): Promise<{
	brand?: { slug: string; name: string };
	series?: { slug: string; name: string };
}> {
	const url = `${GLOBAL_BASE_URL}/item/${itemId}/`;

	try {
		const response = await page.goto(url, {
			waitUntil: "domcontentloaded",
			timeout: 15_000,
		});

		if (!response || response.status() !== 200) {
			return {};
		}

		const html = await page.content();
		const $ = cheerioLoad(html);

		let brand: { slug: string; name: string } | undefined;
		let series: { slug: string; name: string } | undefined;

		// Extract from breadcrumbs - brand links
		$("a[href*=\"/brand/\"]").each((_, el) => {
			const href = $(el).attr("href") ?? "";
			const text = $(el).text().trim();
			const match = /\/brand\/([^/]+)\//.exec(href);
			if (match && text) {
				brand = { slug: match[1], name: text };
			}
		});

		// Extract from breadcrumbs - series links
		$("a[href*=\"/series/\"]").each((_, el) => {
			const href = $(el).attr("href") ?? "";
			const text = $(el).text().trim();
			const match = /\/series\/([^/]+)\//.exec(href);
			if (match && text) {
				series = { slug: match[1], name: text };
			}
		});

		return { brand, series };
	} catch {
		return {};
	}
}

export async function runExtractGlobalTranslations(options: {
	limit?: number;
	verbose?: boolean;
}): Promise<void> {
	const { limit = 100, verbose = false } = options;

	console.log("=== Extract Brand/Series Translations from Global Site ===\n");

	// Load index
	if (!existsSync(ITEMS_INDEX_PATH)) {
		console.error("Items index not found at:", ITEMS_INDEX_PATH);
		process.exit(1);
	}

	const index = JSON.parse(readFileSync(ITEMS_INDEX_PATH, "utf8")) as ItemsIndex;

	// Find items with global pages
	const itemsWithGlobal = Object.entries(index.items)
		.filter(([, entry]) => entry.globalSite?.hasPage)
		.map(([id]) => id)
		.slice(0, limit);

	console.log(`Found ${itemsWithGlobal.length} items with global site pages (limited to ${limit})\n`);

	// Launch browser
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		locale: "en-US",
	});
	const page = await context.newPage();

	const translations: TranslationMap = {
		brands: new Map(),
		series: new Map(),
	};

	let processed = 0;

	try {
		for (const itemId of itemsWithGlobal) {
			const result = await extractBrandSeries(page, itemId);

			if (result.brand && !translations.brands.has(result.brand.slug)) {
				translations.brands.set(result.brand.slug, {
					urlSlug: result.brand.slug,
					englishName: result.brand.name,
					sourceItemId: itemId,
				});
				if (verbose) {
					console.log(`Brand: ${result.brand.slug} -> "${result.brand.name}"`);
				}
			}

			if (result.series && !translations.series.has(result.series.slug)) {
				translations.series.set(result.series.slug, {
					urlSlug: result.series.slug,
					englishName: result.series.name,
					sourceItemId: itemId,
				});
				if (verbose) {
					console.log(`Series: ${result.series.slug} -> "${result.series.name}"`);
				}
			}

			processed++;
			if (processed % PROGRESS_LOG_INTERVAL === 0) {
				console.log(`Processed ${processed}/${itemsWithGlobal.length} items...`);
			}
		}
	} finally {
		await browser.close();
	}

	// Output results
	console.log("\n=== Extracted Brand Translations ===");
	const brandResults: Record<string, string> = {};
	for (const [slug, data] of translations.brands) {
		console.log(`  ${slug}: "${data.englishName}"`);
		brandResults[slug] = data.englishName;
	}

	console.log("\n=== Extracted Series Translations ===");
	const seriesResults: Record<string, string> = {};
	for (const [slug, data] of translations.series) {
		console.log(`  ${slug}: "${data.englishName}"`);
		seriesResults[slug] = data.englishName;
	}

	// Save to file for later comparison
	const outputPath = resolveWorkspacePath("data/src/global-translations.json");
	writeFileSync(outputPath, JSON.stringify({
		extractedAt: new Date().toISOString(),
		itemsProcessed: processed,
		brands: brandResults,
		series: seriesResults,
	}, null, "\t"));

	console.log(`\nSaved results to ${outputPath}`);
	console.log(`\nTotal unique brands: ${translations.brands.size}`);
	console.log(`Total unique series: ${translations.series.size}`);
}

// CLI entry point
const DEFAULT_LIMIT = 200;
const args = process.argv.slice(2);
const limit = args.includes("--limit") ? Number.parseInt(args[args.indexOf("--limit") + 1], 10) : DEFAULT_LIMIT;
const verbose = args.includes("--verbose");

await runExtractGlobalTranslations({ limit, verbose });
