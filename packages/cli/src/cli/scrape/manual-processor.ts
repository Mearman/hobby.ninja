/**
 * Manual processing logic for scraping operations
 * Handles fetching, parsing, downloading assets, and saving manual data
 */

import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";

import type { TranslationService } from "@hobby-ninja/translation";

import type { ImageHashIndex } from "../../utils/image-utils.js";
import type { ManualParser } from "../manual-parser.js";

import { calculateMaxAgeMs } from "./cache-manager.js";
import { saveManualJson } from "./data-merger.js";
import { fetchWithRetry, withTimeout } from "./http-client.js";
import { padManualId, unpadManualId } from "./id-utils.js";
import {
	downloadManualImage,
	findImageSrcFromHtml,
} from "./image-processor.js";
import { updateItemWithManualLink } from "./item-processor.js";
import { downloadManualPdfs } from "./pdf-processor.js";
import { createTimer, printTimings } from "./timing-utils.js";
import { translateManualFallback } from "./translation-handler.js";
import {
	DEFAULT_USER_AGENT,
	FETCH_TIMEOUT_MS,
	MANUALS_DATA_DIR,
	MINUTES_PER_HOUR,
	MS_PER_SECOND,
	SECONDS_PER_MINUTE,
	UNKNOWN_ERROR,
	type ScrapeOptions,
	type StepTiming,
} from "./types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of processing a single manual
 */
export interface ManualProcessResult {
	success: boolean;
	error?: string;
}

/**
 * Dependencies required for manual processing
 */
export interface ManualProcessDeps {
	manualParser: ManualParser;
	translator: TranslationService;
	/** Hash index for image deduplication (item assets are authoritative) */
	hashIndex?: ImageHashIndex;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Process a manual completely: scrape data and download PDFs
 *
 * @param manualId - Manual ID (e.g., "106" or "0106")
 * @param options - Scrape options controlling cache, dry-run, profiling, etc.
 * @param deps - Dependencies (manualParser, translator)
 * @returns Processing result with success flag and optional error
 *
 * @example
 * ```ts
 * const result = await processManualComplete("106", {
 *   cache: true,
 *   maxAgeDays: 7,
 *   dryRun: false,
 *   profile: true,
 * }, {
 *   manualParser,
 *   translator,
 * });
 *
 * if (result.success) {
 *   console.log("Manual processed successfully");
 * } else {
 *   console.error(`Failed: ${result.error}`);
 * }
 * ```
 */
export async function processManualComplete(
	manualId: string,
	options: ScrapeOptions,
	deps: ManualProcessDeps,
): Promise<ManualProcessResult> {
	const timings: StepTiming[] = [];
	const time = createTimer(timings);

	// Use unpadded ID for URLs (canonical format), padded for filenames (consistent sorting)
	const canonicalId = unpadManualId(manualId);
	const paddedId = padManualId(manualId);
	const url = `https://manual.bandai-hobby.net/menus/detail/${canonicalId}/`;
	const htmlPath = path.join(MANUALS_DATA_DIR, `${paddedId}.html`);
	const jsonPath = path.join(MANUALS_DATA_DIR, `${paddedId}.json`);

	console.log(`  Scraping manual at ${url}`);

	// Step 1: Get HTML (from saved file or fetch fresh)
	let html: string | null = null;

	// Check for existing HTML file (use as cache)
	if (options.cache) {
		try {
			const htmlStat = await time("cache-stat", () => fs.stat(htmlPath));
			const ageMs = Date.now() - htmlStat.mtimeMs;
			const maxAgeMs = calculateMaxAgeMs(options.maxAgeDays);
			const ageMinutes = Math.round(ageMs / MS_PER_SECOND / SECONDS_PER_MINUTE);
			const ageHours = Math.round(ageMs / MS_PER_SECOND / SECONDS_PER_MINUTE / MINUTES_PER_HOUR);

			if (maxAgeMs === 0 || ageMs < maxAgeMs) {
				html = await time("cache-read", () => fs.readFile(htmlPath, "utf8"));
				console.log(`  Using cached HTML (${ageMinutes} min old)`);
			} else {
				console.log(`  HTML too old (${ageHours} hours), re-fetching`);
			}
		} catch {
			// File doesn't exist, will fetch
		}
	}

	// Fetch fresh HTML if needed
	if (!html) {
		console.log(`  Fetching fresh...`);
		try {
			html = await time("fetch-html", () => fetchManualPage(url));

			// Save HTML file
			await fs.mkdir(path.dirname(htmlPath), { recursive: true });
			await time("save-html", () => fs.writeFile(htmlPath, html!, "utf8"));
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : UNKNOWN_ERROR;
			printTimings(options, timings);
			return { success: false, error: `Fetch failed: ${errorMsg}` };
		}
	}

	// Step 2: Parse with ManualParser (use canonical unpadded ID, canonical URL)
	const parseResult = time("parse", () => deps.manualParser.parse(html, canonicalId, url));
	if (!parseResult.success || !parseResult.data) {
		printTimings(options, timings);
		return { success: false, error: parseResult.error ?? "Parse failed" };
	}

	const manualData = parseResult.data;
	console.log(`  ✓ Manual data extracted: ${manualData.name.ja}`);
	console.log(`  ✓ Found ${manualData.pdfs.length} PDF(s)`);

	// Step 3: Download PDFs (use padded ID for asset directories)
	if (manualData.pdfs.length > 0 && !options.dryRun) {
		const downloadResult = await time("download-pdfs", () =>
			downloadManualPdfs(paddedId, manualData),
		);
		if (downloadResult.downloaded > 0) {
			console.log(`  ✓ PDFs: ${downloadResult.downloaded} downloaded, ${downloadResult.skipped} skipped`);
		}
	}

	// Step 3b: Download/locate image and establish bidirectional links
	// Image can come from: HTML parsing (manualData.image?.src) OR cached HTML file
	// Uses hash-based deduplication - item assets are the authoritative source
	let discoveredItemId: string | undefined;
	let imageDeduplicated = false;
	if (!options.dryRun) {
		if (manualData.image?.src) {
			// Parser found image in HTML - download or find existing (use padded ID for assets)
			const result = await time("download-image", () =>
				downloadManualImage(paddedId, manualData, deps.hashIndex),
			);
			discoveredItemId = result.itemId;
			imageDeduplicated = result.deduplicated ?? false;
		} else {
			// Parser didn't find image - try to get src from cached HTML
			const srcUrl = await time("find-src", () => findImageSrcFromHtml(htmlPath, ""));
			if (srcUrl) {
				// Found src in HTML - use the standard download flow
				manualData.image = { src: srcUrl };
				const result = await time("download-image", () =>
					downloadManualImage(paddedId, manualData, deps.hashIndex),
				);
				discoveredItemId = result.itemId;
				imageDeduplicated = result.deduplicated ?? false;
			}
		}

		// Establish bidirectional link if item was discovered via shared image
		if (discoveredItemId) {
			// Add to itemIds array (preserving any existing links)
			const existingIds = manualData.itemIds ?? [];
			if (!existingIds.includes(discoveredItemId)) {
				manualData.itemIds = [...existingIds, discoveredItemId];
			}
			const msg = imageDeduplicated ? `Linked to item (via hash): ${discoveredItemId}` : `Linked to item: ${discoveredItemId}`;
			console.log(`    ${msg}`);

			// Update item with reverse link to manual (bidirectional)
			const itemId = discoveredItemId; // Capture for closure (TS narrowing)
			await time("link-item", () => updateItemWithManualLink(itemId, canonicalId));
		}
	}

	// Step 3c: Translate manual if missing English
	if (!manualData.name.en) {
		try {
			await time("translate", () => translateManualFallback(manualData, deps.translator));
			if (manualData.name.en) {
				console.log(`  ✓ Translated: ${manualData.name.en}`);
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
			console.log(`  ⚠ Translation failed: ${msg}`);
		}
	}

	// Step 4: Save manual JSON
	await time("save-json", () => saveManualJson(jsonPath, manualData));
	console.log(`  ✓ Manual JSON saved`);

	printTimings(options, timings);
	return { success: true };
}

/**
 * Fetch a manual page HTML with retry on timeout
 *
 * @param url - Manual page URL (e.g., "https://manual.bandai-hobby.net/menus/detail/106/")
 * @returns HTML content of the manual page
 * @throws Error if fetch fails or returns non-200 status
 *
 * @example
 * ```ts
 * const html = await fetchManualPage("https://manual.bandai-hobby.net/menus/detail/106/");
 * ```
 */
export async function fetchManualPage(url: string): Promise<string> {
	const response = await fetchWithRetry(url, {
		headers: {
			"User-Agent": DEFAULT_USER_AGENT,
			"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"Accept-Language": "ja,en-US,en;q=0.9",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	// Wrap body reading in timeout too (server might hang during transfer)
	return withTimeout(response.text(), FETCH_TIMEOUT_MS, "Response body read timeout");
}

/**
 * Check which manuals have old/invalid format and need re-scraping
 *
 * Old format indicators:
 * - Has productImage/thumbnailImage instead of image.src
 * - Has brandIds/seriesIds arrays instead of brand/series objects
 * - Has extractedAt in the file (should be in index only)
 * - PDFs without path (not downloaded)
 *
 * @param manualIds - List of manual IDs to check (e.g., ["106", "1234"])
 * @returns IDs of manuals that need format migration
 *
 * @example
 * ```ts
 * const allManuals = ["106", "1234", "5678"];
 * const needsMigration = getManualsNeedingFormatMigration(allManuals);
 * console.log(`${needsMigration.length} manuals need re-scraping`);
 * // ["106", "1234"] if those have old format
 * ```
 */
export function getManualsNeedingFormatMigration(manualIds: string[]): string[] {
	const needsMigration: string[] = [];

	for (const id of manualIds) {
		const paddedId = padManualId(id);
		const jsonPath = path.join(MANUALS_DATA_DIR, `${paddedId}.json`);

		try {
			const content = readFileSync(jsonPath, "utf8");
			const data = JSON.parse(content) as Record<string, unknown>;

			// Check for old format indicators
			const hasOldImageFormat = "productImage" in data || "thumbnailImage" in data;
			const hasOldBrandFormat = Array.isArray(data["brandIds"]);
			const hasOldSeriesFormat = Array.isArray(data["seriesIds"]);
			const hasExtractedAt = "extractedAt" in data;
			const hasPdfWithoutPath = Array.isArray(data["pdfs"]) &&
				(data["pdfs"] as Array<Record<string, unknown>>).some(
					(pdf) => pdf["url"] && !pdf["path"],
				);

			if (hasOldImageFormat || hasOldBrandFormat || hasOldSeriesFormat || hasExtractedAt || hasPdfWithoutPath) {
				needsMigration.push(id);
			}
		} catch {
			// File doesn't exist or can't be read - will be handled by normal scrape
		}
	}

	return needsMigration;
}
