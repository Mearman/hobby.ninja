/**
 * Asset download command for manuals and catalog items
 *
 * Downloads images and PDFs from JSON metadata into their corresponding folders.
 * Supports both bandai manuals (productImage, pdfs array)
 * and catalog items (images array).
 *
 * CloudFront/Akamai signed URLs require Playwright browser context for authentication.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { load as cheerioLoad } from "cheerio";
import type { Browser, BrowserContext, Page } from "playwright";

const IMAGE_DELAY_MS = 50;

export type DownloadSource = "all" | "manuals" | "catalog";

export interface DownloadOptions {
	source: DownloadSource;
	manualsSourceDir: string; // Directory containing manual JSON files
	manualsDir: string; // Output directory for manual assets (images, PDFs)
	catalogDir: string;
	catalogImagesDir: string; // Output directory for catalog images
	catalogIds?: string[]; // Specific catalog IDs to download
	concurrency: number;
	delayMs: number;
	dryRun: boolean;
	verbose: boolean;
	usePlaywright?: boolean;
}

// Playwright browser instance (lazy initialized)
let playwrightBrowser: Browser | null = null;
let playwrightContext: BrowserContext | null = null;
let playwrightPage: Page | null = null;

/**
 * Scrape and immediately download images using the shared Playwright instance
 */
async function scrapeAndDownloadImages(sourceUrl: string, itemId: string, outputDir: string): Promise<string[]> {
	const localPaths: string[] = [];

	try {
		// Initialize Playwright browser first to get fresh URLs from live page
		if (!playwrightPage) {
			await initPlaywright();
		}
		if (!playwrightPage) throw new Error("Playwright not initialized");

		console.log(`  Visiting page to get fresh image URLs...`);
		// Clear cache and cookies to ensure fresh content
		await playwrightPage.context().clearCookies();

		// Visit the page with cache-busting to get fresh URLs - only ONCE
		await playwrightPage.goto(`${sourceUrl}?_=${Date.now()}`, {
			waitUntil: "networkidle",
			timeout: 30_000,
			extraHTTPHeaders: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': '0'
			}
		});
		await playwrightPage.waitForTimeout(3000);

		// Try to trigger any lazy loading or dynamic content
		await playwrightPage.evaluate(() => {
			// Scroll to bottom to trigger lazy loading
			window.scrollTo(0, document.body.scrollHeight);
		});
		await playwrightPage.waitForTimeout(2000);
		await playwrightPage.evaluate(() => {
			// Scroll back to top
			window.scrollTo(0, 0);
		});
		await playwrightPage.waitForTimeout(1000);

		// Get image URLs directly from the live browser page - only ONCE
		const imageUrls = await playwrightPage.evaluate(() => {
			const urls = [];
			const seen = new Set();

			console.log("Looking for product images in correct order...");

			// Use the specific selector for product images in the correct order
			const selector = '#products > div.l-wrap > main > div > div > div.pg-pg-products__Wrap > div.pg-products__contentLeft > div.pg-products__sliderThumbnailWrap img';
			const images = document.querySelectorAll(selector);
			console.log(`Found ${images.length} product images in slider`);

			images.forEach((element, index) => {
				const img = element as HTMLImageElement;
				// Check src first, then data-src
				const src = img.src || img.getAttribute('data-src') || "";

				if (src && !seen.has(src)) {
					seen.add(src);
					urls.push(src);
					console.log(`  Image ${index}: ${src.substring(0, 100)}...`);
				}
			});

			return urls;
		});

		console.log(`  Found ${imageUrls.length} product images`);

		// Debug: Print the first few URLs
		imageUrls.slice(0, 3).forEach((url, i) => {
			console.log(`  URL ${i}: ${url.substring(0, 120)}...`);
		});

		if (imageUrls.length === 0) {
			return [];
		}

		// Ensure output directory exists
		await fs.mkdir(outputDir, { recursive: true });

		// Download images using the URLs we already captured - NO REVISITS
		for (let i = 0; i < imageUrls.length; i++) {
			const url = imageUrls[i];
			const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
			const filename = `${itemId}_${i}.${ext}`;
			const localPath = path.join(outputDir, filename);

			// Skip if already exists
			try {
				await fs.access(localPath);
				console.log(`  Skipped (exists): ${filename}`);
				localPaths.push(`/images/items/${filename}`);
				continue;
			} catch {
				// File doesn't exist, download it
			}

			try {
				console.log(`  Downloading: ${filename}...`);

				// Use the URL we already captured
				const response = await playwrightPage.goto(url, {
					waitUntil: "load",
					timeout: 30_000,
				});

				if (response && response.ok()) {
					const buffer = await response.body();
					await fs.writeFile(localPath, buffer);
					console.log(`  ✓ Downloaded: ${filename}`);
					localPaths.push(`/images/items/${filename}`);
				} else {
					throw new Error(`HTTP ${response?.status() || 'unknown'}`);
				}
			} catch (error) {
				console.error(`  ✗ Failed to download ${filename}:`, error instanceof Error ? error.message : error);
			}

			// Small delay between downloads
			if (i < imageUrls.length - 1) {
				await sleep(100);
			}
		}

		return localPaths;
	} catch (error) {
		console.error(`Failed to scrape/download images from ${sourceUrl}:`, error instanceof Error ? error.message : error);
		return [];
	}
}

export interface DownloadResult {
	totalItems: number;
	downloaded: number;
	skipped: number;
	failed: number;
	errors: string[];
	duration: number;
}

interface ManualPdf {
	url: string;
	name: { ja: string; en?: string };
}

interface ManualJson {
	id: string;
	productImage?: string;
	pdfs?: ManualPdf[];
}

interface CatalogItemJson {
	id: string;
	images?: string[];
	sourceUrl?: string;
}

const HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
	"Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
	Referer: "https://bandai-hobby.net/",
};

/**
 * Check if a URL requires Playwright (CloudFront or Akamai signed URLs)
 */
function requiresPlaywright(url: string): boolean {
	return url.includes("cloudfront.net") || url.includes("akamaized.net");
}

/**
 * Initialize Playwright browser (lazy initialization)
 */
async function initPlaywright(): Promise<void> {
	if (playwrightBrowser) return;

	const { chromium } = await import("playwright");
	playwrightBrowser = await chromium.launch({
		headless: false, // Bandai requires non-headless for signed URLs
		slowMo: 100,
	});
	playwrightContext = await playwrightBrowser.newContext({
		userAgent: HEADERS["User-Agent"],
		locale: "ja-JP",
	});
	playwrightPage = await playwrightContext.newPage();
}

/**
 * Close Playwright browser
 */
async function closePlaywright(): Promise<void> {
	if (playwrightBrowser) {
		await playwrightBrowser.close();
		playwrightBrowser = null;
		playwrightContext = null;
		playwrightPage = null;
	}
}

/**
 * Visit a page to establish session cookies for signed URL downloads
 */
async function visitPageForSession(sourceUrl: string): Promise<void> {
	if (!playwrightPage) {
		await initPlaywright();
	}
	if (!playwrightPage) throw new Error("Playwright page not initialized");

	await playwrightPage.goto(sourceUrl, { waitUntil: "networkidle", timeout: 30_000 });
	await playwrightPage.waitForTimeout(1000);
}

/**
 * Download a file using Playwright's browser context (for signed URLs)
 */
async function downloadFileWithPlaywright(
	url: string,
	destPath: string,
	verbose: boolean,
): Promise<{ downloaded: boolean; error?: string }> {
	if (await fileExists(destPath)) {
		if (verbose) {
			console.log(`  Skipped (exists): ${path.basename(destPath)}`);
		}
		return { downloaded: false };
	}

	if (!playwrightPage) {
		return { downloaded: false, error: "Playwright not initialized" };
	}

	try {
		// Use page.evaluate to fetch with browser cookies
		const buffer = await playwrightPage.evaluate(async (imageUrl: string) => {
			const response = await fetch(imageUrl);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			const arrayBuffer = await response.arrayBuffer();
			return [...new Uint8Array(arrayBuffer)];
		}, url);

		await fs.writeFile(destPath, Buffer.from(buffer));
		if (verbose) {
			console.log(`  Downloaded (Playwright): ${path.basename(destPath)}`);
		}
		return { downloaded: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { downloaded: false, error: message };
	}
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await fs.access(path);
		return true;
	} catch {
		return false;
	}
}

async function downloadFile(
	url: string,
	destPath: string,
	verbose: boolean,
	usePlaywright = false,
): Promise<{ downloaded: boolean; error?: string }> {
	if (await fileExists(destPath)) {
		if (verbose) {
			console.log(`  Skipped (exists): ${path.basename(destPath)}`);
		}
		return { downloaded: false };
	}

	// Use Playwright for signed URLs
	if (usePlaywright || requiresPlaywright(url)) {
		return downloadFileWithPlaywright(url, destPath, verbose);
	}

	try {
		const response = await fetch(url, { headers: HEADERS });
		if (!response.ok) {
			return { downloaded: false, error: `HTTP ${response.status}` };
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		await fs.writeFile(destPath, buffer);
		if (verbose) {
			console.log(`  Downloaded: ${path.basename(destPath)}`);
		}
		return { downloaded: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { downloaded: false, error: message };
	}
}

function getImageExtension(url: string): string {
	try {
		const urlPath = new URL(url).pathname;
		const ext = urlPath.split(".").pop()?.toLowerCase();
		if (ext && ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
			return ext;
		}
	} catch {
		// Invalid URL, use default
	}
	return "jpg";
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadManualAssets(
	manualDir: string,
	manual: ManualJson,
	options: DownloadOptions,
): Promise<{ downloaded: number; skipped: number; failed: number; errors: string[] }> {
	const stats = { downloaded: 0, skipped: 0, failed: 0, errors: [] as string[] };

	// Download product image
	if (manual.productImage) {
		const ext = getImageExtension(manual.productImage);
		const imagePath = path.join(manualDir, `${manual.id}.${ext}`);

		if (options.dryRun) {
			if (await fileExists(imagePath)) {
				if (options.verbose) {
					console.log(`  Would skip (exists): ${path.basename(imagePath)}`);
				}
				stats.skipped++;
			} else {
				console.log(`  Would download: ${manual.productImage} -> ${path.basename(imagePath)}`);
				stats.downloaded++;
			}
		} else {
			const result = await downloadFile(manual.productImage, imagePath, options.verbose);
			if (result.downloaded) {
				stats.downloaded++;
			} else if (result.error) {
				stats.failed++;
				stats.errors.push(`${manual.id} productImage: ${result.error}`);
			} else {
				stats.skipped++;
			}
		}
	}

	// Download PDFs from the pdfs array
	if (manual.pdfs && manual.pdfs.length > 0) {
		for (let i = 0; i < manual.pdfs.length; i++) {
			const pdf = manual.pdfs[i];
			// Use padded ID for filename: 0001.pdf, 0001_2.pdf, etc.
			const suffix = i === 0 ? "" : `_${i + 1}`;
			const filename = `${manual.id}${suffix}.pdf`;
			const pdfPath = path.join(manualDir, filename);

			if (options.dryRun) {
				if (await fileExists(pdfPath)) {
					if (options.verbose) {
						console.log(`  Would skip (exists): ${filename}`);
					}
					stats.skipped++;
				} else {
					console.log(`  Would download: ${pdf.url} -> ${filename}`);
					stats.downloaded++;
				}
			} else {
				const result = await downloadFile(pdf.url, pdfPath, options.verbose);
				if (result.downloaded) {
					stats.downloaded++;
				} else if (result.error) {
					stats.failed++;
					stats.errors.push(`${manual.id} pdf (${pdf.name.ja}): ${result.error}`);
				} else {
					stats.skipped++;
				}
			}
		}
	}

	return stats;
}

async function downloadCatalogAssets(
	item: CatalogItemJson,
	options: DownloadOptions,
	jsonPath?: string,
): Promise<{ downloaded: number; skipped: number; failed: number; errors: string[] }> {
	const stats = { downloaded: 0, skipped: 0, failed: 0, errors: [] as string[] };

	// Handle missing images array by scraping and downloading immediately
	if (!item.images || item.images.length === 0) {
		if (!item.sourceUrl) {
			if (options.verbose) {
				console.log(`[${item.id}] No images array and no sourceUrl - skipping`);
			}
			return stats;
		}

		if (options.verbose) {
			console.log(`[${item.id}] No images array - scraping and downloading immediately...`);
		}

		// Ensure output directory exists
		await fs.mkdir(options.catalogImagesDir, { recursive: true });

		// Scrape and download images in one go
		const localImagePaths = !options.dryRun
			? await scrapeAndDownloadImages(item.sourceUrl, item.id, options.catalogImagesDir)
			: [];

		if (localImagePaths.length > 0) {
			stats.downloaded = localImagePaths.length;
			if (options.verbose) {
				console.log(`  ✓ Downloaded ${localImagePaths.length} images`);
			}

			// Update the JSON file with local paths
			if (jsonPath && !options.dryRun) {
				try {
					// Read the original file to preserve other fields
					const originalContent = await fs.readFile(jsonPath, "utf8");
					const originalItem = JSON.parse(originalContent);

					// Update only the images array
					originalItem.images = localImagePaths;

					// Write back to file
					await fs.writeFile(jsonPath, JSON.stringify(originalItem, null, "\t"), "utf8");

					if (options.verbose) {
						console.log(`  ✓ Updated JSON with ${localImagePaths.length} local image paths`);
					}
				} catch (error) {
					const msg = error instanceof Error ? error.message : String(error);
					stats.errors.push(`${item.id}: Failed to update JSON file: ${msg}`);
				}
			}
		} else {
			if (options.verbose) {
				console.log(`[${item.id}] No images found or downloaded`);
			}
		}

		return stats;
	}

	return stats;
}

async function processManuals(options: DownloadOptions): Promise<DownloadResult> {
	const result: DownloadResult = {
		totalItems: 0,
		downloaded: 0,
		skipped: 0,
		failed: 0,
		errors: [],
		duration: 0,
	};

	const startTime = Date.now();

	try {
		const entries = await fs.readdir(options.manualsSourceDir, { withFileTypes: true });
		const ids = entries.filter((e) => e.isDirectory()).map((e) => e.name).toSorted();
		result.totalItems = ids.length;

		console.log(`Processing ${ids.length} manuals`);
		console.log(`  Source: ${options.manualsSourceDir}`);
		console.log(`  Output: ${options.manualsDir}`);

		// Process in batches for concurrency
		for (let i = 0; i < ids.length; i += options.concurrency) {
			const batch = ids.slice(i, i + options.concurrency);

			const batchResults = await Promise.all(
				batch.map(async (id) => {
					const sourceDir = path.join(options.manualsSourceDir, id);
					const outputDir = path.join(options.manualsDir, id);
					const jsonPath = path.join(sourceDir, `${id}.json`);

					try {
						const content = await fs.readFile(jsonPath, "utf8");
						const manual = JSON.parse(content) as ManualJson;

						// Ensure output directory exists
						if (!options.dryRun) {
							await fs.mkdir(outputDir, { recursive: true });
						}

						if (options.verbose) {
							console.log(`[${id}] Processing...`);
						}

						return await downloadManualAssets(outputDir, manual, options);
					} catch (error) {
						const msg = error instanceof Error ? error.message : String(error);
						return { downloaded: 0, skipped: 0, failed: 1, errors: [`${id}: ${msg}`] };
					}
				}),
			);

			for (const batchResult of batchResults) {
				result.downloaded += batchResult.downloaded;
				result.skipped += batchResult.skipped;
				result.failed += batchResult.failed;
				result.errors.push(...batchResult.errors);
			}

			const processed = Math.min(i + options.concurrency, ids.length);
			if (processed % 100 === 0 || processed === ids.length) {
				console.log(
					`Progress: ${processed}/${ids.length} | Downloaded: ${result.downloaded} | Skipped: ${result.skipped} | Failed: ${result.failed}`,
				);
			}

			if (!options.dryRun && options.delayMs > 0) {
				await sleep(options.delayMs);
			}
		}
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		result.errors.push(`Error reading manuals directory: ${msg}`);
	}

	result.duration = Date.now() - startTime;
	return result;
}

async function processCatalog(options: DownloadOptions): Promise<DownloadResult> {
	const result: DownloadResult = {
		totalItems: 0,
		downloaded: 0,
		skipped: 0,
		failed: 0,
		errors: [],
		duration: 0,
	};

	const startTime = Date.now();

	try {
		const entries = await fs.readdir(options.catalogDir, { withFileTypes: true });
		let ids = entries
			.filter((e) => e.isFile() && e.name.endsWith('.json'))
			.map((e) => e.name.replace('.json', ''))
			.toSorted();

		// Filter by specific IDs if provided
		if (options.catalogIds && options.catalogIds.length > 0) {
			ids = ids.filter(id => options.catalogIds.includes(id));
		}

		result.totalItems = ids.length;

		console.log(`Processing ${ids.length} catalog items from ${options.catalogDir}`);

		// Process in batches for concurrency
		for (let i = 0; i < ids.length; i += options.concurrency) {
			const batch = ids.slice(i, i + options.concurrency);

			const batchResults = await Promise.all(
				batch.map(async (id) => {
					const jsonPath = path.join(options.catalogDir, `${id}.json`);

					try {
						const content = await fs.readFile(jsonPath, "utf8");
						const item = JSON.parse(content) as CatalogItemJson;

						if (options.verbose) {
							console.log(`[${id}] Processing ${item.images?.length ?? 0} images...`);
						}

						return await downloadCatalogAssets(item, options, jsonPath);
					} catch (error) {
						const msg = error instanceof Error ? error.message : String(error);
						return { downloaded: 0, skipped: 0, failed: 1, errors: [`${id}: ${msg}`] };
					}
				}),
			);

			for (const batchResult of batchResults) {
				result.downloaded += batchResult.downloaded;
				result.skipped += batchResult.skipped;
				result.failed += batchResult.failed;
				result.errors.push(...batchResult.errors);
			}

			const processed = Math.min(i + options.concurrency, ids.length);
			if (processed % 100 === 0 || processed === ids.length) {
				console.log(
					`Progress: ${processed}/${ids.length} | Downloaded: ${result.downloaded} | Skipped: ${result.skipped} | Failed: ${result.failed}`,
				);
			}

			if (!options.dryRun && options.delayMs > 0) {
				await sleep(options.delayMs);
			}
		}
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		result.errors.push(`Error reading catalog directory: ${msg}`);
	}

	result.duration = Date.now() - startTime;
	return result;
}

export async function downloadAssets(options: DownloadOptions): Promise<DownloadResult> {
	const combinedResult: DownloadResult = {
		totalItems: 0,
		downloaded: 0,
		skipped: 0,
		failed: 0,
		errors: [],
		duration: 0,
	};

	const startTime = Date.now();

	if (options.source === "all" || options.source === "manuals") {
		console.log("\n--- Downloading Manual Assets ---");
		const manualsResult = await processManuals(options);
		combinedResult.totalItems += manualsResult.totalItems;
		combinedResult.downloaded += manualsResult.downloaded;
		combinedResult.skipped += manualsResult.skipped;
		combinedResult.failed += manualsResult.failed;
		combinedResult.errors.push(...manualsResult.errors);
	}

	if (options.source === "all" || options.source === "catalog") {
		console.log("\n--- Downloading Catalog Assets ---");
		const catalogResult = await processCatalog(options);
		combinedResult.totalItems += catalogResult.totalItems;
		combinedResult.downloaded += catalogResult.downloaded;
		combinedResult.skipped += catalogResult.skipped;
		combinedResult.failed += catalogResult.failed;
		combinedResult.errors.push(...catalogResult.errors);
	}

	// Clean up Playwright browser if it was used
	await closePlaywright();

	combinedResult.duration = Date.now() - startTime;
	return combinedResult;
}