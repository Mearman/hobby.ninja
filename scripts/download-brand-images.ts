/**
 * Download brand images from Bandai Hobby website
 *
 * Uses Playwright to navigate to brand pages and download logo images
 * before the CloudFront CDN URLs expire.
 *
 * Usage: pnpm tsx scripts/download-brand-images.ts
 */

import { chromium, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const BRANDS_JSON_PATH = "apps/next/public/data/brands.json";
const OUTPUT_DIR = "apps/next/public/images/brands";
// Brand pages use a similar structure to series pages
const IMAGE_SELECTOR = ".pg-brand__brand img";

interface BrandNode {
	id: string;
	name: { ja?: string; en?: string } | string;
	url?: string;
	image?: string;
}

interface BrandData {
	nodes: BrandNode[];
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
	// Convert brand ID to a clean filename
	return id.replace(/-brand$/, "");
}

async function main() {
	// Load brand data
	const brandData: BrandData = JSON.parse(fs.readFileSync(BRANDS_JSON_PATH, "utf-8"));

	// Filter to brands that need images (have URL but no image)
	const brandsToProcess = brandData.nodes.filter(
		(b) => b.url && (!b.image || b.image === "")
	);

	console.log(`Found ${brandsToProcess.length} brands needing images\n`);

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

	for (const brand of brandsToProcess) {
		const brandUrl = brand.url!;
		const filename = sanitizeFilename(brand.id);

		console.log(`\nProcessing: ${brand.id}`);
		console.log(`  URL: ${brandUrl}`);

		try {
			// Navigate to brand page
			await page.goto(brandUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

			// Check if it's a 404 page
			const title = await page.title();
			if (title.includes("404") || title.includes("Not Found")) {
				console.log(`  Page not found (404)`);
				results.failed.push(brand.id);
				continue;
			}

			// Wait for the image element
			const imgElement = await page.waitForSelector(IMAGE_SELECTOR, { timeout: 10000 }).catch(() => null);

			if (!imgElement) {
				console.log(`  No image found at selector`);
				results.failed.push(brand.id);
				continue;
			}

			// Get the image src
			const imgSrc = await imgElement.getAttribute("src");

			if (!imgSrc) {
				console.log(`  Image element has no src`);
				results.failed.push(brand.id);
				continue;
			}

			console.log(`  Found image: ${imgSrc.substring(0, 80)}...`);

			// Determine file extension and output path
			const ext = getFileExtension(imgSrc);
			const outputPath = path.join(OUTPUT_DIR, `${filename}${ext}`);

			// Check if file already exists
			if (fs.existsSync(outputPath)) {
				console.log(`  Already exists: ${outputPath}`);
				results.success.push(brand.id);
				continue;
			}

			// Download the image immediately (before CDN URL expires)
			const success = await downloadImage(page, imgSrc, outputPath);

			if (success) {
				results.success.push(brand.id);
			} else {
				results.failed.push(brand.id);
			}

			// Small delay between requests
			await page.waitForTimeout(500);

		} catch (error) {
			console.error(`  Error processing ${brand.id}: ${error}`);
			results.failed.push(brand.id);
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
		console.log("\nFailed brands:");
		results.failed.forEach((id) => console.log(`  - ${id}`));
	}
}

main().catch(console.error);
