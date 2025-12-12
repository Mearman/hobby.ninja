/**
 * Download series images from Bandai Hobby website
 *
 * Uses Playwright to navigate to series pages and download logo images
 * before the CloudFront CDN URLs expire.
 *
 * Usage: pnpm tsx scripts/download-series-images.ts
 */

import { chromium, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SERIES_JSON_PATH = "apps/next/public/data/series.json";
const OUTPUT_DIR = "apps/next/public/images/series";
const IMAGE_SELECTOR = "#series > div.l-wrap > main > div > div.pg-brand__brand > div > img";

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
		const response = await page.goto(imageUrl, { waitUntil: "load", timeout: 30000 });

		if (!response || !response.ok()) {
			console.error(`  Failed to fetch image: ${response?.status()}`);
			return false;
		}

		const buffer = await response.body();
		fs.writeFileSync(outputPath, buffer);
		console.log(`  Saved: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
		return true;
	} catch (error) {
		console.error(`  Error downloading image: ${error}`);
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
	const seriesData: SeriesData = JSON.parse(fs.readFileSync(SERIES_JSON_PATH, "utf-8"));

	// Filter to series that need images (have URL but no image)
	const seriesToProcess = seriesData.nodes.filter(
		(s) => s.url && (!s.image || s.image === "")
	);

	console.log(`Found ${seriesToProcess.length} series needing images\n`);

	// Ensure output directory exists
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	// Launch browser
	const browser = await chromium.launch({
		headless: false, // Set to true for automated runs
		slowMo: 100
	});
	const context = await browser.newContext({
		userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	});
	const page = await context.newPage();

	const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

	for (const series of seriesToProcess) {
		const seriesUrl = series.url!;
		const filename = sanitizeFilename(series.id);

		console.log(`\nProcessing: ${series.id}`);
		console.log(`  URL: ${seriesUrl}`);

		try {
			// Navigate to series page
			await page.goto(seriesUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

			// Wait for the image element
			const imgElement = await page.waitForSelector(IMAGE_SELECTOR, { timeout: 10000 }).catch(() => null);

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

			console.log(`  Found image: ${imgSrc.substring(0, 80)}...`);

			// Determine file extension and output path
			const ext = getFileExtension(imgSrc);
			const outputPath = path.join(OUTPUT_DIR, `${filename}${ext}`);

			// Check if file already exists
			if (fs.existsSync(outputPath)) {
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
			await page.waitForTimeout(500);

		} catch (error) {
			console.error(`  Error processing ${series.id}: ${error}`);
			results.failed.push(series.id);
		}
	}

	await browser.close();

	// Print summary
	console.log("\n" + "=".repeat(50));
	console.log("SUMMARY");
	console.log("=".repeat(50));
	console.log(`Success: ${results.success.length}`);
	console.log(`Failed: ${results.failed.length}`);

	if (results.failed.length > 0) {
		console.log("\nFailed series:");
		results.failed.forEach((id) => console.log(`  - ${id}`));
	}
}

main().catch(console.error);
