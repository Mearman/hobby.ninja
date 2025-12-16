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

// Retry configuration
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000; // 1 second base delay

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
	recheck: boolean; // Recheck items and download missing images to complete arrays
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

	// Wrap the entire page visit in retry logic
	const pageVisitResult = await retryWithBackoff(async () => {
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
			waitUntil: "domcontentloaded", // Faster than networkidle
			timeout: 15_000, // Reduced timeout since we're blocking resources
			extraHTTPHeaders: {
				"Cache-Control": "no-cache, no-store, must-revalidate",
				"Pragma": "no-cache",
				"Expires": "0",
			},
		});

		// Intelligent waiting - check if images are loaded before doing extra work
		const imagesLoaded = await playwrightPage.evaluate(() => {
			// Check if product images are already loaded
			const productSelector = "#products > div.l-wrap > main > div > div > div.pg-pg-products__Wrap > div.pg-products__contentLeft > div.pg-products__sliderThumbnailWrap img";
			const productImages = document.querySelectorAll(productSelector);

			// If we have images with valid src, we can skip the lazy loading steps
			if (productImages.length > 0) {
				const hasValidSources = Array.from(productImages).some(img => {
					const src = (img as HTMLImageElement).src || (img as HTMLImageElement).dataset.src || "";
					return src && !src.includes("placeholder");
				});
				if (hasValidSources) {
					return { loaded: true, count: productImages.length };
				}
			}
			return { loaded: false, count: 0 };
		});

		if (!imagesLoaded.loaded) {
			// Only do scrolling if images aren't loaded yet
			await playwrightPage.evaluate(() => {
				// Scroll to bottom to trigger lazy loading
				window.scrollTo(0, document.body.scrollHeight);
			});

			// Wait for images to appear after scrolling (with timeout)
			await playwrightPage.waitForFunction(() => {
				const productSelector = "#products > div.l-wrap > main > div > div > div.pg-pg-products__Wrap > div.pg-products__contentLeft > div.pg-products__sliderThumbnailWrap img";
				const productImages = document.querySelectorAll(productSelector);
				return productImages.length > 0;
			}, { timeout: 3000 }); // Reduced timeout since page loads faster

			await playwrightPage.evaluate(() => {
				// Scroll back to top
				window.scrollTo(0, 0);
			});
		}
	}, `Page visit for ${itemId}`);

	if (!pageVisitResult.success) {
		throw new Error(pageVisitResult.error || "Failed to visit page after retries");
	}

	try {

		// Get image URLs directly from the live browser page - only ONCE
		const { imageUrls, instructionUrls } = await playwrightPage.evaluate(() => {
			const urls = [];
			const instructionUrls = [];
			const seen = new Set();

			console.log("Looking for product images in correct order...");

			// Get product slider images
			const productSelector = "#products > div.l-wrap > main > div > div > div.pg-pg-products__Wrap > div.pg-products__contentLeft > div.pg-products__sliderThumbnailWrap img";
			const productImages = document.querySelectorAll(productSelector);
			console.log(`Found ${productImages.length} product images in slider`);

			for (const [index, element] of productImages.entries()) {
				const img = element as HTMLImageElement;
				// Check src first, then data-src
				const src = img.src || img.dataset.src || "";

				if (src && !seen.has(src)) {
					seen.add(src);
					urls.push(src);
					console.log(`  Product Image ${index}: ${src.slice(0, 100)}...`);
				}
			}

			// Get instruction images if they exist
			const instructionSelector = "#products > div.l-wrap > main > div > div > section:nth-child(4) > div.pg-products__instruction > div.pg-products__article img";
			const instructionElements = document.querySelectorAll(instructionSelector);
			console.log(`Found ${instructionElements.length} instruction images`);

			for (const [index, element] of instructionElements.entries()) {
				const img = element as HTMLImageElement;
				// Check src first, then data-src
				let src = img.src || img.dataset.src || "";

				// Convert relative URLs to absolute URLs for instruction images
				if (src && !src.startsWith("http")) {
					src = new URL(src, window.location.href).href;
				}

				if (src && !seen.has(src)) {
					seen.add(src);
					instructionUrls.push(src);
					console.log(`  Instruction Image ${index}: ${src.slice(0, 100)}...`);
				}
			}

			return { imageUrls: urls, instructionUrls };
		});

		console.log(`  Found ${imageUrls.length} product images`);
		console.log(`  Found ${instructionUrls.length} instruction images`);

		// Debug: Print the first few URLs
		for (const [i, url] of imageUrls.slice(0, 3).entries()) {
			console.log(`  Product URL ${i}: ${url.slice(0, 120)}...`);
		}
		for (const [i, url] of instructionUrls.slice(0, 3).entries()) {
			console.log(`  Instruction URL ${i}: ${url.slice(0, 120)}...`);
		}

		if (imageUrls.length === 0 && instructionUrls.length === 0) {
			return [];
		}

		// Ensure output directory exists
		await fs.mkdir(outputDir, { recursive: true });

		// Download product images first
		for (const [i, url] of imageUrls.entries()) {
			const ext = url.split(".").pop()?.split("?")[0] || "jpg";
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

			// Download with retry logic
			const downloadResult = await retryWithBackoff(async () => {
				console.log(`  Downloading product image: ${filename}...`);

				// Use page.evaluate with fetch for image downloads (works with resource blocking)
				const buffer = await playwrightPage!.evaluate(async (imageUrl: string) => {
					const response = await fetch(imageUrl, {
						method: 'GET',
						headers: {
							'User-Agent': navigator.userAgent,
							'Referer': window.location.href,
						},
					});

					if (!response.ok) {
						throw new Error(`HTTP ${response.status}`);
					}

					const arrayBuffer = await response.arrayBuffer();
					return [...new Uint8Array(arrayBuffer)];
				}, url);

				await fs.writeFile(localPath, Buffer.from(buffer));
				console.log(`  ✓ Downloaded: ${filename}`);
				return { success: true };
			}, `Download product image ${filename}`);

			if (downloadResult.success) {
				localPaths.push(`/images/items/${filename}`);
			} else {
				console.error(`  ✗ Failed to download ${filename}:`, downloadResult.error);
			}
		}

		// Download instruction images after product images
		for (const [i, url] of instructionUrls.entries()) {
			const ext = url.split(".").pop()?.split("?")[0] || "jpg";
			const filename = `${itemId}_inst_${i}.${ext}`; // Use itemId to avoid conflicts
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

			// Download with retry logic
			const downloadResult = await retryWithBackoff(async () => {
				console.log(`  Downloading instruction image: ${filename}...`);

				// Use page.evaluate with fetch for image downloads (works with resource blocking)
				const buffer = await playwrightPage!.evaluate(async (imageUrl: string) => {
					const response = await fetch(imageUrl, {
						method: 'GET',
						headers: {
							'User-Agent': navigator.userAgent,
							'Referer': window.location.href,
						},
					});

					if (!response.ok) {
						throw new Error(`HTTP ${response.status}`);
					}

					const arrayBuffer = await response.arrayBuffer();
					return [...new Uint8Array(arrayBuffer)];
				}, url);

				await fs.writeFile(localPath, Buffer.from(buffer));
				console.log(`  ✓ Downloaded: ${filename}`);
				return { success: true };
			}, `Download instruction image ${filename}`);

			if (downloadResult.success) {
				localPaths.push(`/images/items/${filename}`);
			} else {
				console.error(`  ✗ Failed to download ${filename}:`, downloadResult.error);
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
		slowMo: 0, // No artificial delay - retry logic handles failures
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

	// Download with retry logic
	const retryResult = await retryWithBackoff(async () => {
		// Use page.evaluate to fetch with browser cookies
		const buffer = await playwrightPage!.evaluate(async (imageUrl: string) => {
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
		return { success: true };
	}, `Download (Playwright) ${path.basename(destPath)}`);

	return {
		downloaded: retryResult.success,
		error: retryResult.error,
	};
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

	// Download with retry logic
	const retryResult = await retryWithBackoff(async () => {
		const response = await fetch(url, { headers: HEADERS });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		await fs.writeFile(destPath, buffer);
		if (verbose) {
			console.log(`  Downloaded: ${path.basename(destPath)}`);
		}
		return { success: true };
	}, `Download ${path.basename(destPath)}`);

	return {
		downloaded: retryResult.success,
		error: retryResult.error,
	};
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

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	operation: string,
	maxRetries: number = MAX_RETRIES,
): Promise<{ result: T; success: boolean; error?: string }> {
	let lastError = "";

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const result = await fn();
			return { result, success: true };
		} catch (error) {
			lastError = error instanceof Error ? error.message : String(error);

			if (attempt === maxRetries) {
				break; // Don't wait after final attempt
			}

			const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1); // 1s, 2s, 4s...
			console.warn(`  ${operation} failed (attempt ${attempt}/${maxRetries}): ${lastError}`);
			console.warn(`  Retrying in ${delay}ms...`);
			await sleep(delay);
		}
	}

	return {
		result: null as unknown as T,
		success: false,
		error: `${operation} failed after ${maxRetries} attempts: ${lastError}`,
	};
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
		const localImagePaths = options.dryRun
			? []
			: await scrapeAndDownloadImages(item.sourceUrl, item.id, options.catalogImagesDir);

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

	// Handle case where images array exists but files might be missing
	if (item.images && item.images.length > 0) {
		// Verify that each image listed in the JSON actually exists
		const missingImages: string[] = [];

		for (const imagePath of item.images) {
			// Convert JSON path to actual file system path
			const filename = path.basename(imagePath);
			const fullPath = path.join(options.catalogImagesDir, filename);

			try {
				await fs.access(fullPath);
			} catch {
				missingImages.push(imagePath);
			}
		}

		if (missingImages.length > 0) {
			if (options.verbose) {
				console.log(`[${item.id}] Found ${missingImages.length} missing images out of ${item.images.length} - re-downloading...`);
			}

			if (!item.sourceUrl) {
				if (options.verbose) {
					console.log(`[${item.id}] Missing images but no sourceUrl - cannot re-download`);
				}
				stats.failed = missingImages.length;
				return stats;
			}

			// Ensure output directory exists
			await fs.mkdir(options.catalogImagesDir, { recursive: true });

			// Scrape and download images in one go
			const localImagePaths = options.dryRun
				? []
				: await scrapeAndDownloadImages(item.sourceUrl, item.id, options.catalogImagesDir);

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
				stats.failed = missingImages.length;
				if (options.verbose) {
					console.log(`  ✗ Failed to download replacement images`);
				}
			}
		} else {
			// All images exist
			stats.skipped = item.images.length;
			if (options.verbose) {
				console.log(`[${item.id}] All ${item.images.length} images already exist - skipping`);
			}

			// Recheck mode: always scrape to verify image array is complete
			if (options.recheck && item.sourceUrl) {
				if (options.verbose) {
					console.log(`[${item.id}] Rechecking for additional images...`);
				}

				// Scrape fresh images to see if there are more than what's in the array
				const freshImagePaths = !options.dryRun
					? await scrapeAndDownloadImages(item.sourceUrl, item.id, options.catalogImagesDir)
					: [];

				if (freshImagePaths.length > item.images.length) {
					if (options.verbose) {
						console.log(`  ✓ Found ${freshImagePaths.length - item.images.length} additional images`);
					}

					// Update the JSON file with the complete image array
					if (jsonPath && !options.dryRun) {
						try {
							// Read the original file to preserve other fields
							const originalContent = await fs.readFile(jsonPath, "utf8");
							const originalItem = JSON.parse(originalContent);

							// Update the images array with the complete set
							originalItem.images = freshImagePaths;

							// Write back to file
							await fs.writeFile(jsonPath, JSON.stringify(originalItem, null, "\t"), "utf8");

							if (options.verbose) {
								console.log(`  ✓ Updated JSON with complete image array (${freshImagePaths.length} images)`);
							}
						} catch (error) {
							const msg = error instanceof Error ? error.message : String(error);
							stats.errors.push(`${item.id}: Failed to update JSON file: ${msg}`);
						}
					}

					// Update stats to reflect newly downloaded images
					stats.downloaded = freshImagePaths.length - item.images.length;
				} else if (options.verbose) {
					console.log(`  ✓ Image array is complete (${freshImagePaths.length} images)`);
				}
			}
		}
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

			// Removed artificial delay - retry logic handles transient failures
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
			.filter((e) => e.isFile() && e.name.endsWith(".json"))
			.map((e) => e.name.replace(".json", ""))
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

			// Removed artificial delay - retry logic handles transient failures
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