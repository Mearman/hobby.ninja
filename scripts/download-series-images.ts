/**
 * Download series images from Bandai Hobby website
 *
 * Uses Playwright to navigate to series pages and download logo images
 * before the CloudFront CDN URLs expire.
 *
 * Usage: pnpm tsx scripts/download-series-images.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "@playwright/test";

const SERIES_JSON_PATH = "apps/next/public/data/series.json";
const OUTPUT_DIR = "apps/next/public/images/series";
const IMAGE_SELECTOR = "#series > div.l-wrap > main > div > div.pg-brand__brand > div > img";
const SUMMARY_SEPARATOR_LENGTH = 50;
const SLOW_MO_MS = 100;
const NAVIGATION_TIMEOUT_MS = 30_000;
const SELECTOR_TIMEOUT_MS = 10_000;
const DELAY_BETWEEN_REQUESTS_MS = 500;
const BYTES_PER_KB = 1024;

interface SeriesNode {
	id: string;
	name: { ja?: string; en?: string } | string;
	url?: string;
	image?: string;
}

interface SeriesData {
	nodes: SeriesNode[];
}

async function downloadImage(page: Page, imageUrl: string, outputPath: string): Promise<boolean> {
	try {
		// Navigate to image URL directly - this keeps the CloudFront session cookies
		const response = await page.goto(imageUrl, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT_MS });

		if (!response?.ok()) {
			console.error(`  Failed to fetch image: ${String(response?.status())}`);
			return false;
		}

		const buffer = await response.body();
		writeFileSync(outputPath, buffer);
		console.log(`  Saved: ${outputPath} (${(buffer.length / BYTES_PER_KB).toFixed(1)} KB)`);
		return true;
	} catch (error) {
		console.error(`  Error downloading image: ${String(error)}`);
		return false;
	}
}

function getFileExtension(url: string): string {
	const urlPath = new URL(url).pathname;
	const ext = path.extname(urlPath).toLowerCase();
	return ext || ".jpg"; // Default to jpg if no extension
}

function sanitizeFilename(id: string): string {
	// Convert series ID to a clean filename
	return id
		.replace(/^mobile-suit-gundam-/, "")
		.replace(/^gundam-/, "")
		.replace(/^mobile-suit-/, "")
		.replace(/-series$/, "");
}

async function main() {
	// Load series data
	const seriesData = JSON.parse(readFileSync(SERIES_JSON_PATH, "utf8")) as SeriesData;

	// Filter to series that need images (have URL but no image)
	const seriesToProcess = seriesData.nodes.filter(
		(s) => s.url && (!s.image || s.image === ""),
	);

	console.log(`Found ${String(seriesToProcess.length)} series needing images\n`);

	// Ensure output directory exists
	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	// Launch browser
	const browser = await chromium.launch({
		headless: false, // Set to true for automated runs
		slowMo: SLOW_MO_MS,
	});
	const context = await browser.newContext({
		userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	});
	const page = await context.newPage();

	const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

	for (const series of seriesToProcess) {
		if (!series.url) continue;
		const seriesUrl = series.url;
		const filename = sanitizeFilename(series.id);

		console.log(`\nProcessing: ${series.id}`);
		console.log(`  URL: ${seriesUrl}`);

		try {
			// Navigate to series page
			await page.goto(seriesUrl, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });

			// Wait for the image element
			const imgElement = await page.waitForSelector(IMAGE_SELECTOR, { timeout: SELECTOR_TIMEOUT_MS }).catch(() => null);

			if (!imgElement) {
				console.log(`  No image found at selector`);
				results.failed.push(series.id);
				continue;
			}

			// Get the image src
			const imgSrc = await imgElement.getAttribute("src");

			if (!imgSrc) {
				console.log(`  Image element has no src`);
				results.failed.push(series.id);
				continue;
			}

			console.log(`  Found image: ${imgSrc.slice(0, 80)}...`);

			// Determine file extension and output path
			const ext = getFileExtension(imgSrc);
			const outputPath = path.join(OUTPUT_DIR, `${filename}${ext}`);

			// Check if file already exists
			if (existsSync(outputPath)) {
				console.log(`  Already exists: ${outputPath}`);
				results.success.push(series.id);
				continue;
			}

			// Download the image immediately (before CDN URL expires)
			const success = await downloadImage(page, imgSrc, outputPath);

			if (success) {
				results.success.push(series.id);
			} else {
				results.failed.push(series.id);
			}

			// Small delay between requests
			await page.waitForTimeout(DELAY_BETWEEN_REQUESTS_MS);

		} catch (error) {
			console.error(`  Error processing ${series.id}: ${String(error)}`);
			results.failed.push(series.id);
		}
	}

	await browser.close();

	// Print summary
	console.log("\n" + "=".repeat(SUMMARY_SEPARATOR_LENGTH));
	console.log("SUMMARY");
	console.log("=".repeat(SUMMARY_SEPARATOR_LENGTH));
	console.log(`Success: ${String(results.success.length)}`);
	console.log(`Failed: ${String(results.failed.length)}`);

	if (results.failed.length > 0) {
		console.log("\nFailed series:");
		for (const id of results.failed) {
			console.log(`  - ${id}`);
		}
	}
}

await main();
