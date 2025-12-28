/**
 * Check Bandai brand/series landing pages and download images
 *
 * For each canonical brand/series ID:
 * - Navigate to the Bandai page
 * - Detect if it's a 404 or valid landing page
 * - Update the JSON file with hasLandingPage status
 * - Download the image immediately (CloudFront URLs expire quickly)
 *
 * Usage:
 *   pnpm tsx scripts/check-landing-pages.ts [options]
 *
 * Options:
 *   --brands        Check only brands
 *   --series        Check only series
 *   --headless      Run without browser window
 *   --skip-existing Skip if image already exists
 *   --force         Recheck even if already checked
 *   --dry-run       Don't save changes
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "@playwright/test";

// =============================================================================
// Constants
// =============================================================================

const CANONICAL_IDS_PATH = "scripts/temp/official-bandai-ids.json";
const BRANDS_DATA_DIR = "data/src/brands";
const SERIES_DATA_DIR = "data/src/series";
const BRANDS_IMAGE_DIR = "apps/next/public/images/brands";
const SERIES_IMAGE_DIR = "apps/next/public/images/series";

const BRAND_URL_TEMPLATE = "https://bandai-hobby.net/brand/{id}/";
const SERIES_URL_TEMPLATE = "https://bandai-hobby.net/series/{id}/";

const BRAND_IMAGE_SELECTOR = ".pg-brand__brand img";
const SERIES_IMAGE_SELECTOR = "#series > div.l-wrap > main > div > div.pg-brand__brand > div > img";

const DELAY_BETWEEN_REQUESTS_MS = 500;
const NAVIGATION_TIMEOUT_MS = 30_000;
const SELECTOR_TIMEOUT_MS = 10_000;
const SLOW_MO_MS = 100;
const BYTES_PER_KB = 1024;
const SUMMARY_SEPARATOR_LENGTH = 50;
const IMAGE_URL_TRUNCATE_LENGTH = 60;

// =============================================================================
// Interfaces
// =============================================================================

interface CanonicalIds {
	brands: string[];
	series: string[];
}

interface BrandSeriesJson {
	id: string;
	type: "brand" | "series";
	name: { ja?: string; en?: string } | string;
	url?: string;
	hasLandingPage?: boolean;
	landingPageCheckedAt?: string;
}

interface CheckerOptions {
	mode: "brands" | "series" | "all";
	headless: boolean;
	skipExisting: boolean;
	force: boolean;
	dryRun: boolean;
}

interface ProcessingResult {
	id: string;
	type: "brand" | "series";
	hasLandingPage: boolean;
	imageDownloaded: boolean;
	imageSkipped: boolean;
	error?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function parseArgs(): CheckerOptions {
	const args = new Set(process.argv.slice(2));

	return {
		mode: args.has("--brands")
			? "brands"
			: args.has("--series")
				? "series"
				: "all",
		headless: args.has("--headless"),
		skipExisting: args.has("--skip-existing"),
		force: args.has("--force"),
		dryRun: args.has("--dry-run"),
	};
}

function loadCanonicalIds(): CanonicalIds {
	return JSON.parse(readFileSync(CANONICAL_IDS_PATH, "utf8")) as CanonicalIds;
}

function getDataDir(type: "brand" | "series"): string {
	return type === "brand" ? BRANDS_DATA_DIR : SERIES_DATA_DIR;
}

function getImageDir(type: "brand" | "series"): string {
	return type === "brand" ? BRANDS_IMAGE_DIR : SERIES_IMAGE_DIR;
}

function getUrlTemplate(type: "brand" | "series"): string {
	return type === "brand" ? BRAND_URL_TEMPLATE : SERIES_URL_TEMPLATE;
}

function getImageSelector(type: "brand" | "series"): string {
	return type === "brand" ? BRAND_IMAGE_SELECTOR : SERIES_IMAGE_SELECTOR;
}

function loadOrCreateJsonFile(id: string, type: "brand" | "series"): BrandSeriesJson {
	const dir = getDataDir(type);
	const filePath = path.join(dir, `${id}.json`);

	if (existsSync(filePath)) {
		return JSON.parse(readFileSync(filePath, "utf8")) as BrandSeriesJson;
	}

	// Create minimal JSON if file doesn't exist
	return {
		id,
		type,
		name: { ja: id, en: id },
	};
}

function saveJsonFile(id: string, type: "brand" | "series", data: BrandSeriesJson): void {
	const dir = getDataDir(type);
	const filePath = path.join(dir, `${id}.json`);

	// Ensure directory exists
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	writeFileSync(filePath, JSON.stringify(data, null, "\t") + "\n");
}

function getFileExtension(url: string): string {
	try {
		const urlPath = new URL(url).pathname;
		const ext = path.extname(urlPath).toLowerCase();
		return ext || ".jpg";
	} catch {
		return ".jpg";
	}
}

async function detectIs404(page: Page): Promise<boolean> {
	const title = await page.title();
	if (title.includes("404") || title.includes("Not Found")) {
		return true;
	}

	// Check for Japanese 404 message
	const bodyText = await page.textContent("body").catch(() => "");
	if (
		bodyText?.includes("ページが見つかりません") ||
		bodyText?.includes("Page Not Found")
	) {
		return true;
	}

	return false;
}

async function downloadImage(
	page: Page,
	imageUrl: string,
	outputPath: string,
): Promise<boolean> {
	try {
		// Navigate to image URL directly - this keeps the CloudFront session cookies
		const response = await page.goto(imageUrl, {
			waitUntil: "load",
			timeout: NAVIGATION_TIMEOUT_MS,
		});

		if (!response?.ok()) {
			console.error(`  Failed to fetch image: ${String(response?.status())}`);
			return false;
		}

		const buffer = await response.body();
		writeFileSync(outputPath, buffer);
		console.log(
			`  Saved: ${outputPath} (${(buffer.length / BYTES_PER_KB).toFixed(1)} KB)`,
		);
		return true;
	} catch (error) {
		console.error(`  Error downloading image: ${String(error)}`);
		return false;
	}
}

// =============================================================================
// Main Processing
// =============================================================================

async function processItem(
	page: Page,
	id: string,
	type: "brand" | "series",
	options: CheckerOptions,
): Promise<ProcessingResult> {
	const url = getUrlTemplate(type).replace("{id}", id);
	const selector = getImageSelector(type);
	const timestamp = new Date().toISOString();

	console.log(`\nChecking: ${type}/${id}`);
	console.log(`  URL: ${url}`);

	const result: ProcessingResult = {
		id,
		type,
		hasLandingPage: false,
		imageDownloaded: false,
		imageSkipped: false,
	};

	try {
		// Load existing JSON data
		const jsonData = loadOrCreateJsonFile(id, type);

		// Skip if already checked (unless --force)
		if (jsonData.hasLandingPage !== undefined && !options.force) {
			console.log(`  Already checked (use --force to recheck)`);
			result.hasLandingPage = jsonData.hasLandingPage;
			result.imageSkipped = true;
			return result;
		}

		// Navigate to the page
		await page.goto(url, {
			waitUntil: "domcontentloaded",
			timeout: NAVIGATION_TIMEOUT_MS,
		});

		// Check for 404
		if (await detectIs404(page)) {
			console.log(`  Result: 404 - No landing page`);
			result.hasLandingPage = false;

			// Update JSON
			jsonData.hasLandingPage = false;
			jsonData.landingPageCheckedAt = timestamp;

			if (!options.dryRun) {
				saveJsonFile(id, type, jsonData);
				console.log(`  Updated: ${getDataDir(type)}/${id}.json`);
			}

			return result;
		}

		// Page exists
		console.log(`  Result: Landing page exists`);
		result.hasLandingPage = true;

		// Update JSON with URL and status
		jsonData.url = url;
		jsonData.hasLandingPage = true;
		jsonData.landingPageCheckedAt = timestamp;

		// Try to find and download image
		const imgElement = await page
			.waitForSelector(selector, { timeout: SELECTOR_TIMEOUT_MS })
			.catch(() => null);

		if (imgElement) {
			const imgSrc = await imgElement.getAttribute("src");

			if (imgSrc) {
				console.log(`  Image found: ${imgSrc.slice(0, IMAGE_URL_TRUNCATE_LENGTH)}...`);

				const ext = getFileExtension(imgSrc);
				const imageDir = getImageDir(type);
				const outputPath = path.join(imageDir, `${id}${ext}`);

				// Check if image already exists
				if (existsSync(outputPath) && options.skipExisting) {
					console.log(`  Image exists: ${outputPath} (skipping)`);
					result.imageSkipped = true;
				} else {
					// Ensure image directory exists
					if (!existsSync(imageDir)) {
						mkdirSync(imageDir, { recursive: true });
					}

					// Download immediately before CloudFront URL expires
					if (options.dryRun) {
						console.log(`  [dry-run] Would download to: ${outputPath}`);
					} else {
						const success = await downloadImage(page, imgSrc, outputPath);
						result.imageDownloaded = success;

						// Navigate back to original page for next iteration
						await page.goto(url, {
							waitUntil: "domcontentloaded",
							timeout: NAVIGATION_TIMEOUT_MS,
						});
					}
				}
			} else {
				console.log(`  Image element has no src`);
			}
		} else {
			console.log(`  No image found on page`);
		}

		// Save JSON
		if (!options.dryRun) {
			saveJsonFile(id, type, jsonData);
			console.log(`  Updated: ${getDataDir(type)}/${id}.json`);
		}

		return result;
	} catch (error) {
		console.error(`  Error: ${String(error)}`);
		result.error = String(error);
		return result;
	}
}

async function main() {
	const options = parseArgs();
	const startTime = Date.now();

	console.log("Bandai Landing Page Checker");
	console.log("=".repeat(SUMMARY_SEPARATOR_LENGTH));
	console.log(`Mode: ${options.mode}`);
	console.log(`Headless: ${String(options.headless)}`);
	console.log(`Skip existing: ${String(options.skipExisting)}`);
	console.log(`Force recheck: ${String(options.force)}`);
	console.log(`Dry run: ${String(options.dryRun)}`);

	// Load canonical IDs
	const canonicalIds = loadCanonicalIds();
	console.log(
		`\nLoaded ${String(canonicalIds.brands.length)} brands and ${String(canonicalIds.series.length)} series`,
	);

	// Build list of items to process
	const itemsToProcess: Array<{ id: string; type: "brand" | "series" }> = [];

	if (options.mode === "brands" || options.mode === "all") {
		for (const id of canonicalIds.brands) {
			itemsToProcess.push({ id, type: "brand" });
		}
	}

	if (options.mode === "series" || options.mode === "all") {
		for (const id of canonicalIds.series) {
			itemsToProcess.push({ id, type: "series" });
		}
	}

	console.log(`\nProcessing ${String(itemsToProcess.length)} items...`);

	// Launch browser
	const browser = await chromium.launch({
		headless: options.headless,
		slowMo: SLOW_MO_MS,
	});
	const context = await browser.newContext({
		userAgent:
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	});
	const page = await context.newPage();

	// Process each item
	const results: ProcessingResult[] = [];

	for (const item of itemsToProcess) {
		const result = await processItem(page, item.id, item.type, options);
		results.push(result);

		// Rate limiting
		await page.waitForTimeout(DELAY_BETWEEN_REQUESTS_MS);
	}

	await browser.close();

	// Print summary
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	const brandResults = results.filter((r) => r.type === "brand");
	const seriesResults = results.filter((r) => r.type === "series");

	console.log("\n" + "=".repeat(SUMMARY_SEPARATOR_LENGTH));
	console.log("SUMMARY");
	console.log("=".repeat(SUMMARY_SEPARATOR_LENGTH));

	if (brandResults.length > 0) {
		const withPages = brandResults.filter((r) => r.hasLandingPage).length;
		const downloaded = brandResults.filter((r) => r.imageDownloaded).length;
		const skipped = brandResults.filter((r) => r.imageSkipped).length;
		console.log(
			`Brands: ${String(brandResults.length)} checked, ${String(withPages)} with pages, ${String(brandResults.length - withPages)} without`,
		);
		console.log(`  Images: ${String(downloaded)} downloaded, ${String(skipped)} skipped`);
	}

	if (seriesResults.length > 0) {
		const withPages = seriesResults.filter((r) => r.hasLandingPage).length;
		const downloaded = seriesResults.filter((r) => r.imageDownloaded).length;
		const skipped = seriesResults.filter((r) => r.imageSkipped).length;
		console.log(
			`Series: ${String(seriesResults.length)} checked, ${String(withPages)} with pages, ${String(seriesResults.length - withPages)} without`,
		);
		console.log(`  Images: ${String(downloaded)} downloaded, ${String(skipped)} skipped`);
	}

	const errors = results.filter((r) => r.error);
	if (errors.length > 0) {
		console.log(`\nErrors: ${String(errors.length)}`);
		for (const r of errors) {
			console.log(`  - ${r.type}/${r.id}: ${r.error ?? "Unknown error"}`);
		}
	}

	console.log(`\nTime: ${elapsed}s`);
}

await main();
