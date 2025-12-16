/**
 * Asset download command for manuals and catalog items
 *
 * Downloads images and PDFs from JSON metadata into their corresponding folders.
 * Supports both bandai manuals (productImage, pdfs array)
 * and catalog items (images array).
 *
 * CloudFront/Akamai signed URLs require Playwright browser context for authentication.
 */

import { promises as fs, createWriteStream } from "node:fs";
import path from "node:path";

import type { Browser, BrowserContext, Page } from "playwright";

import { ItemsIndexUpdater } from "./items-index-updater.js";

// Retry configuration
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000; // 1 second base delay

// Parallel download configuration
const CONCURRENT_DOWNLOADS_PER_ITEM = 5; // Download up to 5 images simultaneously per item

/**
 * Split array into chunks of specified size
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
}

/**
 * Batch check if files exist to reduce filesystem I/O overhead
 * Returns a Map of filepath -> exists boolean
 */
async function batchCheckFileExists(filePaths: string[]): Promise<Map<string, boolean>> {
	const existenceMap = new Map<string, boolean>();

	// Group files by directory to reduce context switching overhead
	const filesByDir = new Map<string, string[]>();

	for (const filePath of filePaths) {
		const dir = path.dirname(filePath);
		if (!filesByDir.has(dir)) {
			filesByDir.set(dir, []);
		}
		filesByDir.get(dir)!.push(path.basename(filePath));
	}

	// Check files in batches per directory
	for (const [dir, files] of filesByDir) {
		try {
			// Try to read directory contents first
			const dirContents = await fs.readdir(dir, { withFileTypes: true });
			const existingFiles = new Set(
				dirContents
					.filter(dirent => dirent.isFile())
					.map(dirent => dirent.name)
			);

			// Mark files as existing or not
			for (const file of files) {
				const fullPath = path.join(dir, file);
				existenceMap.set(fullPath, existingFiles.has(file));
			}
		} catch (error) {
			// If directory doesn't exist or can't be read, assume no files exist
			for (const file of files) {
				const fullPath = path.join(dir, file);
				existenceMap.set(fullPath, false);
			}
		}
	}

	return existenceMap;
}

/**
 * Stream file write for better memory efficiency with large files
 */
async function streamFileWrite(buffer: Buffer, filePath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const writeStream = createWriteStream(filePath);

		writeStream.on('error', reject);
		writeStream.on('finish', resolve);

		// Write buffer in chunks to avoid memory spikes
		const chunkSize = 64 * 1024; // 64KB chunks
		let offset = 0;

		function writeChunk() {
			if (offset >= buffer.length) {
				writeStream.end();
				return;
			}

			const chunk = buffer.subarray(offset, offset + chunkSize);
			const canContinue = writeStream.write(chunk);

			if (canContinue) {
				offset += chunkSize;
				// Use setImmediate to allow event loop processing between chunks
				setImmediate(writeChunk);
			} else {
				writeStream.once('drain', () => {
					offset += chunkSize;
					writeChunk();
				});
			}
		}

		writeChunk();
	});
}

/**
 * Download multiple images in parallel
 */
async function downloadImagesInParallel(
	imageData: Array<{ url: string; filename: string; localPath: string; type: 'product' | 'instruction' }>,
	playwrightPage: Page,
	outputDir: string
): Promise<{ successful: string[], failed: Array<{ filename: string; error: string }> }> {
	const successful: string[] = [];
	const failed: Array<{ filename: string; error: string }> = [];

	// Process images in chunks for controlled parallelism
	const chunks = chunkArray(imageData, CONCURRENT_DOWNLOADS_PER_ITEM);

	for (const chunk of chunks) {
		console.log(`  Downloading ${chunk.length} images in parallel...`);

		const downloadPromises = chunk.map(async ({ url, filename, localPath, type }) => {
			// Use different download methods for different image types and sources
			const downloadResult = await retryWithBackoff(async () => {
				let buffer: Buffer;

				// Use context.request API for:
				// 1. Instruction images (CloudFront signed URLs)
				// 2. Product images from akamaihd.net (CORS restrictions)
				if (type === 'instruction' || url.includes('akamaihd.net')) {
					const response = await playwrightPage!.context().request.get(url);
					if (!response.ok()) {
						throw new Error(`HTTP ${response.status()}`);
					}
					buffer = await response.body();
				} else {
					// Other product images can use fetch within page context
					const bufferArray = await playwrightPage!.evaluate(async (imageUrl: string) => {
						const response = await fetch(imageUrl, {
							method: 'GET',
							mode: 'cors',
							credentials: 'include',
						});

						if (!response.ok) {
							throw new Error(`HTTP ${response.status}`);
						}

						const arrayBuffer = await response.arrayBuffer();
						return [...new Uint8Array(arrayBuffer)];
					}, url);
					buffer = Buffer.from(bufferArray);
				}

				// Validate downloaded instruction images are actually JPEGs, not error pages
				if (type === 'instruction') {
					const fileSize = buffer.length;
					const minSize = 50000; // 50KB minimum for instruction images

					if (fileSize < minSize) {
						throw new Error(`Downloaded instruction image too small (${fileSize} bytes). Likely an error page or banner.`);
					}

					// Check JPEG magic bytes (FF D8 FF)
					const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
					if (!isJPEG) {
						const firstBytes = buffer.slice(0, 10).toString('hex');
						throw new Error(`Downloaded instruction image is not a valid JPEG. First bytes: ${firstBytes}`);
					}
				}

				// Use streaming write for better memory efficiency
				await streamFileWrite(buffer, localPath);
				return { success: true };
			}, `Download ${filename}`);

			if (downloadResult.success) {
				successful.push(`/images/items/${filename}`);
				return { filename, success: true };
			} else {
				failed.push({ filename, error: downloadResult.error || 'Unknown error' });
				return { filename, success: false, error: downloadResult.error };
			}
		});

		// Wait for this chunk to complete before starting the next
		await Promise.all(downloadPromises);

		// Report progress for this chunk
		const chunkSuccessful = downloadPromises.filter(p => p.success).length;
		const chunkFailed = downloadPromises.filter(p => !p.success).length;
		console.log(`  ✓ Chunk complete: ${chunkSuccessful} successful, ${chunkFailed} failed`);
	}

	return { successful, failed };
}

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

// Browser session recycling to prevent memory buildup
const MAX_ITEMS_PER_PAGE = 50; // Recreate page every 50 items to prevent memory leaks
let itemsProcessedOnCurrentPage = 0;

/**
 * Refresh page if needed to prevent memory buildup
 */
async function refreshPageIfNeeded(): Promise<void> {
	if (itemsProcessedOnCurrentPage >= MAX_ITEMS_PER_PAGE) {
		console.log(`  Page recycling: processed ${itemsProcessedOnCurrentPage} items, creating fresh optimized page...`);

		if (playwrightPage) {
			await playwrightPage.close();
		}

		if (playwrightContext) {
			playwrightPage = await createOptimizedPage(playwrightContext);
		}

		itemsProcessedOnCurrentPage = 0;
		console.log(`  ✓ Fresh optimized page ready for next batch`);
	}
}

/**
 * Scrape and immediately download images using the shared Playwright instance
 */
async function scrapeAndDownloadImages(sourceUrl: string, itemId: string, outputDir: string): Promise<string[]> {
	const localPaths: string[] = [];

	// Refresh page if needed to prevent memory buildup
	await refreshPageIfNeeded();

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
		});

		// Intelligent waiting - check if images are loaded before doing extra work
		const imagesLoaded = await playwrightPage.evaluate(() => {
			// Check if product images are already loaded
			const productSelector = "#products > div.l-wrap > main > div > div > div.pg-pg-products__Wrap > div.pg-products__contentLeft > div.pg-products__sliderThumbnailWrap img";
			const productImages = document.querySelectorAll(productSelector);

			// If we have images with valid src, we can skip the lazy loading steps
			if (productImages.length > 0) {
				const hasValidSources = Array.from(productImages).some((img: Element) => {
					const imageEl = img as HTMLImageElement;
					const src = imageEl.src || imageEl.dataset.src || "";
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
		const { imageUrls, instructionUrls } = await playwrightPage.evaluate(async (currentItemId) => {
			const urls = [];
			const instructionUrls = [];
			const seen = new Set();

			console.log("Looking for product images in correct order...");

			// Get product images from the main content area, excluding instruction and related items sections
			// Note: Bandai image URLs use their own internal IDs, not our catalog item IDs
			// We select by DOM location rather than URL pattern
			const productImageSelector = 'main img[src*="bandai-hobby.net/images"]:not([src*="common"]):not([src*="bnr"]), main img[src*="bandai-a.akamaihd.net"]:not([src*="related"]):not([src*="common"])';
			const allProductImages = document.querySelectorAll(productImageSelector);
			console.log(`Found ${allProductImages.length} total product image candidates`);

			// Exclude images that are in the instruction section or related items section
			const instructionContainer = document.querySelector('.pg-products__instruction');
			const relatedItemsContainer = document.querySelector('#products > div.l-wrap > main > div > div > section:nth-child(5) > div.p-card__wrap.c-grid.-cols2-2');
			const imageElements = Array.from(allProductImages).filter(img => {
				// Exclude if this image is within the instruction or related items container
				const inInstructions = instructionContainer && instructionContainer.contains(img);
				const inRelatedItems = relatedItemsContainer && relatedItemsContainer.contains(img);
				return !inInstructions && !inRelatedItems;
			});
			console.log(`After excluding instruction and related item images: ${imageElements.length} product images`);

			// Process images in DOM order to maintain consistency
			const processedSources = new Map(); // Track order by first appearance
			imageElements.forEach(function(element, index) {
				const img = element as HTMLImageElement;
				const src = img.src || img.getAttribute('data-src') || "";

				if (src && !seen.has(src) && !processedSources.has(src)) {
					seen.add(src);
					processedSources.set(src, index);
					urls.push(src);
					console.log(`  Product Image ${urls.length - 1}: ${src.slice(0, 100)}...`);
				}
			});

			console.log(`Found ${urls.length} unique product images`);

			// Get instruction images if they exist
			// Use fallback selector strategies to handle different page layouts
			const selectorStrategies = [
				"div.pg-products__instruction img",  // Flexible class-based selector
				"section[class*='instruction'] img", // Alternative instruction section pattern
				"[class*='manual'] img",            // Manual/instruction pattern
			];

			let instructionElements: Element[] = [];
			let usedSelector = "";
			for (const selector of selectorStrategies) {
				const elements = Array.from(document.querySelectorAll(selector));
				if (elements.length > 0) {
					instructionElements = elements;
					usedSelector = selector;
					console.log(`Found ${elements.length} instruction images using selector: ${selector}`);
					break;
				}
			}

			if (instructionElements.length === 0) {
				console.warn(`No instruction images found using any selector strategy`);
			}

			// Scroll to instruction section to trigger lazy loading of CloudFront signed URLs
			if (instructionElements.length > 0) {
				const instructionSection = document.querySelector('.pg-products__instruction');
				if (instructionSection) {
					instructionSection.scrollIntoView({ behavior: 'instant' });
					// Wait for lazy-loaded images to populate img.src with CloudFront signed URLs
					// Increased timeout to ensure images have time to load
					await new Promise(resolve => setTimeout(resolve, 2000));

					// Verify images actually loaded
					const loadedCount = instructionElements.filter(el => {
						const img = el as HTMLImageElement;
						return img.src && img.src.startsWith('http') && !img.src.includes('data:');
					}).length;

					if (loadedCount === 0) {
						console.warn(`No instruction images loaded after scrolling (found ${instructionElements.length} elements)`);
					} else {
						console.log(`✓ Verified ${loadedCount}/${instructionElements.length} instruction images loaded`);
					}
				}
			}

			Array.from(instructionElements).forEach((element: Element, index: number) => {
				const img = element as HTMLImageElement;
				// After lazy loading, img.src contains the CloudFront signed URL
				// data-src contains the relative path which won't work
				let src = img.src || "";

				// Skip if we only have a relative URL - we need the CloudFront signed URL
				if (src && !src.startsWith("http")) {
					return;
				}

				// Filter out promotional banners and invalid URLs
				if (src && (src.includes('/common/') || src.includes('/bnr/') || src.includes('banner'))) {
					console.log(`  Skipping promotional banner: ${src.slice(0, 100)}...`);
					return;
				}

				// Validate CloudFront domains for instruction images
				if (src && !src.includes('cloudfront.net') && !src.includes('bandai-hobby.net/product/')) {
					console.log(`  Skipping non-instruction image domain: ${src.slice(0, 100)}...`);
					return;
				}

				if (src && !seen.has(src)) {
					seen.add(src);
					instructionUrls.push(src);
					console.log(`  Instruction Image ${index}: ${src.slice(0, 100)}...`);
				}
			});

			return { imageUrls: urls, instructionUrls };
		}, itemId);

		console.log(`  Found ${imageUrls.length} product images`);
		console.log(`  Found ${instructionUrls.length} instruction images`);

		// Debug: Print all URLs (but limit display length for readability)
		for (const [i, url] of imageUrls.entries()) {
			console.log(`  Product URL ${i}: ${url.slice(0, 120)}...`);
		}
		for (const [i, url] of instructionUrls.entries()) {
			console.log(`  Instruction URL ${i}: ${url.slice(0, 120)}...`);
		}

		if (imageUrls.length === 0 && instructionUrls.length === 0) {
			return [];
		}

		// Ensure output directory exists
		await fs.mkdir(outputDir, { recursive: true });

		// Prepare all potential file paths for batch checking
		const productFilePaths: Array<{ url: string; filename: string; localPath: string; index: number }> = [];
		const instructionFilePaths: Array<{ url: string; filename: string; localPath: string; index: number }> = [];

		// Generate file paths for product images
		for (const [i, url] of imageUrls.entries()) {
			const ext = url.split(".").pop()?.split("?")[0] || "jpg";
			const filename = `${itemId}_${i}.${ext}`;
			const localPath = path.join(outputDir, filename);
			productFilePaths.push({ url, filename, localPath, index: i });
		}

		// Generate file paths for instruction images
		for (const [i, url] of instructionUrls.entries()) {
			const ext = url.split(".").pop()?.split("?")[0] || "jpg";
			const filename = `${itemId}_inst_${i}.${ext}`;
			const localPath = path.join(outputDir, filename);
			instructionFilePaths.push({ url, filename, localPath, index: i });
		}

		// Batch check all file existence at once
		const allFilePaths = [...productFilePaths, ...instructionFilePaths];
		const existenceMap = await batchCheckFileExists(allFilePaths.map(fp => fp.localPath));

		// Filter out existing files and prepare download data
		const productDownloads = productFilePaths.filter(({ localPath, filename }) => {
			if (existenceMap.get(localPath)) {
				console.log(`  Skipped (exists): ${filename}`);
				localPaths.push(`/images/items/${filename}`);
				return false;
			}
			return true;
		});

		const instructionDownloads = instructionFilePaths.filter(({ localPath, filename }) => {
			if (existenceMap.get(localPath)) {
				console.log(`  Skipped (exists): ${filename}`);
				localPaths.push(`/images/items/${filename}`);
				return false;
			}
			return true;
		});

		// Combine all downloads with type information
		const allDownloads = [
			...productDownloads.map(({ url, filename, localPath }) => ({ url, filename, localPath, type: 'product' as const })),
			...instructionDownloads.map(({ url, filename, localPath }) => ({ url, filename, localPath, type: 'instruction' as const }))
		];

		if (allDownloads.length > 0) {
			console.log(`  Downloading ${allDownloads.length} images (${productDownloads.length} product, ${instructionDownloads.length} instruction) in parallel...`);

			// Download images in parallel with controlled concurrency
			const { successful, failed } = await downloadImagesInParallel(allDownloads, playwrightPage!, outputDir);

			// Add successful downloads to localPaths
			localPaths.push(...successful);

			// Report failures
			if (failed.length > 0) {
				console.log(`  Failed downloads: ${failed.length}`);
				for (const { filename, error } of failed) {
					console.error(`    ✗ ${filename}: ${error}`);
				}
			}

			console.log(`  ✓ Parallel download complete: ${successful.length} successful, ${failed.length} failed`);
		} else {
			console.log(`  All images already exist for ${itemId}`);
		}

		// Increment counter for successful processing
		itemsProcessedOnCurrentPage++;
		if (itemsProcessedOnCurrentPage % 10 === 0) {
			console.log(`  Session progress: ${itemsProcessedOnCurrentPage}/${MAX_ITEMS_PER_PAGE} items processed on current page`);
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
 * Create an optimized page with aggressive resource blocking
 */
async function createOptimizedPage(context: BrowserContext): Promise<Page> {
	const page = await context.newPage();

	// Block unnecessary resources for faster page loads
	await page.route('**/*.{css,woff,woff2,ttf,otf,eot}', route => route.abort());
	await page.route('**/*.js', route => {
		// Only allow essential JS, block tracking/analytics
		const url = route.request().url();
		if (url.includes('analytics') || url.includes('tracker') || url.includes('pixel')) {
			return route.abort();
		}
		return route.continue();
	});
	await page.route('**/*.{png,gif,jpeg,jpg,webp,svg,ico}', route => {
		// Only allow images from CloudFront/CDN that we need
		const url = route.request().url();
		if (!url.includes('cloudfront.net') && !url.includes('bandai-hobby.net')) {
			return route.abort();
		}
		return route.continue();
	});

	// Optimize timeout settings
	page.setDefaultTimeout(15000); // 15 seconds default
	page.setDefaultNavigationTimeout(20000); // 20 seconds for navigation

	return page;
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
		args: [
			'--no-sandbox',
			'--disable-dev-shm-usage',
			'--disable-gpu',
			'--disable-background-timer-throttling',
			'--disable-backgrounding-occluded-windows',
			'--disable-renderer-backgrounding',
			'--disable-features=TranslateUI',
			'--disable-ipc-flooding-protection',
			'--memory-pressure-off',
		],
	});

	playwrightContext = await playwrightBrowser.newContext({
		userAgent: HEADERS["User-Agent"],
		locale: "ja-JP",
		viewport: { width: 1920, height: 1080 }, // Consistent viewport
	});

	playwrightPage = await createOptimizedPage(playwrightContext);
	itemsProcessedOnCurrentPage = 0;
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
	// Use batchCheckFileExists for single file - more efficient than direct access
	const existenceMap = await batchCheckFileExists([path]);
	return existenceMap.get(path) || false;
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

		// Record that we scraped the page for content (only if not dry run and we got images)
		if (!options.dryRun && localImagePaths.length > 0) {
			ItemsIndexUpdater.recordPageScraped(item.id);
		}

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

					// Sort images: product images first, then instruction images
					const productImages = localImagePaths.filter(path => !path.includes('_inst_'));
					const instructionImages = localImagePaths.filter(path => path.includes('_inst_'));
					productImages.sort();
					instructionImages.sort();
					const sortedImages = [...productImages, ...instructionImages];

					// Update only the images array
					originalItem.images = sortedImages;

					// Write back to file
					await fs.writeFile(jsonPath, JSON.stringify(originalItem, null, "\t"), "utf8");

					// Record that this item's images have been successfully downloaded
					ItemsIndexUpdater.recordDownloadVerified(item.id);

					if (options.verbose) {
						console.log(`  ✓ Updated JSON with ${sortedImages.length} local image paths (${productImages.length} product, ${instructionImages.length} instruction)`);
						console.log(`  ✓ Recorded array verification for ${item.id} (${sortedImages.length} images)`);
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
		// Batch verify that each image listed in the JSON actually exists
		const missingImages: string[] = [];

		// Prepare all file paths for batch checking
		const filePaths = item.images.map(imagePath => {
			const filename = path.basename(imagePath);
			const fullPath = path.join(options.catalogImagesDir, filename);
			return { imagePath, fullPath };
		});

		// Batch check file existence
		const existenceMap = await batchCheckFileExists(filePaths.map(fp => fp.fullPath));

		// Identify missing images
		for (const { imagePath, fullPath } of filePaths) {
			if (!existenceMap.get(fullPath)) {
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

			// Record that we scraped the page for content (only if not dry run and we got images)
			if (!options.dryRun && localImagePaths.length > 0) {
				ItemsIndexUpdater.recordPageScraped(item.id);
			}

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

						// Merge fresh images with existing images to create complete set
						const existingImages = new Set(originalItem.images || []);
						const allImages = new Set([...existingImages, ...localImagePaths]);
						const completeImagePaths = Array.from(allImages);

						// Sort images: product images first, then instruction images
						const productImages = completeImagePaths.filter(path => !path.includes('_inst_'));
						const instructionImages = completeImagePaths.filter(path => path.includes('_inst_'));
						productImages.sort();
						instructionImages.sort();
						const sortedImages = [...productImages, ...instructionImages];

						// Update only the images array
						originalItem.images = sortedImages;

						// Write back to file
						await fs.writeFile(jsonPath, JSON.stringify(originalItem, null, "\t"), "utf8");



						// Record that this item's images have been successfully downloaded
						ItemsIndexUpdater.recordDownloadVerified(item.id);

						if (options.verbose) {
							console.log(`  ✓ Updated JSON with ${sortedImages.length} local image paths (${productImages.length} product, ${instructionImages.length} instruction)`);
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

			// Record that this item's images have been verified as downloaded
			ItemsIndexUpdater.recordDownloadVerified(item.id);

			// Recheck mode: scrape page again to check for new images
			if (options.recheck && item.sourceUrl) {
				// Check if page was recently scraped for content (within 7 days)
				const pageRecentlyScraped = ItemsIndexUpdater.wasPageRecentlyScraped(item.id, 7 * 24); // 7 days

				if (pageRecentlyScraped) {
					if (options.verbose) {
						console.log(`[${item.id}] Skipping page scrape - scraped recently (within 7 days)`);
					}
				} else {
					// Page not recently scraped, verify array completeness
					if (options.verbose) {
					console.log(`[${item.id}] Rechecking for additional images...`);
				}

				// Scrape fresh images to see if there are more than what's in the array
				const freshImagePaths = !options.dryRun
					? await scrapeAndDownloadImages(item.sourceUrl, item.id, options.catalogImagesDir)
					: [];

				// Record that we scraped the page for content
				ItemsIndexUpdater.recordPageScraped(item.id);

				// Merge fresh images with existing images to create complete set
				// Use a Set to deduplicate, then convert back to array
				const existingImages = new Set(item.images || []);
				const allImages = new Set([...existingImages, ...freshImagePaths]);
				const completeImagePaths = Array.from(allImages);

				// Separate product images from instruction images for sorting
				const productImages = completeImagePaths.filter(path => !path.includes('_inst_'));
				const instructionImages = completeImagePaths.filter(path => path.includes('_inst_'));

				// Sort each category and combine
				productImages.sort();
				instructionImages.sort();
				const sortedImagePaths = [...productImages, ...instructionImages];

				if (sortedImagePaths.length > item.images.length) {
					if (options.verbose) {
						console.log(`  ✓ Found ${sortedImagePaths.length - item.images.length} additional images`);
					}

					// Update the JSON file with the complete image array
					if (jsonPath && !options.dryRun) {
						try {
							// Read the original file to preserve other fields
							const originalContent = await fs.readFile(jsonPath, "utf8");
							const originalItem = JSON.parse(originalContent);

							// Update the images array with the complete set
							originalItem.images = sortedImagePaths;

							// Write back to file
							await fs.writeFile(jsonPath, JSON.stringify(originalItem, null, "\t"), "utf8");

							if (options.verbose) {
								console.log(`  ✓ Updated JSON with complete image array (${sortedImagePaths.length} images)`);
							}
						} catch (error) {
							const msg = error instanceof Error ? error.message : String(error);
							stats.errors.push(`${item.id}: Failed to update JSON file: ${msg}`);
						}
					}

					// Update stats to reflect newly downloaded images
					stats.downloaded = sortedImagePaths.length - item.images.length;
				} else if (options.verbose) {
					const newCount = sortedImagePaths.length;
					const existingCount = item.images.length;
					if (freshImagePaths.length === 0 && existingCount > 0) {
						console.log(`  ✓ No new images found on page (item has ${existingCount} existing images)`);
					} else {
						console.log(`  ✓ Image array complete (${Math.max(newCount, existingCount)} images: ${productImages.length} product, ${instructionImages.length} instruction)`);
					}
				}

				// Record that this item's images have been successfully downloaded
				ItemsIndexUpdater.recordDownloadVerified(item.id);
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

						// Add visual separator between items
						console.log(`\n--- Processing ${id} ---`);
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

		// Save any array verification updates to the index
		ItemsIndexUpdater.save();
	}

	// Clean up Playwright browser if it was used
	await closePlaywright();

	combinedResult.duration = Date.now() - startTime;
	return combinedResult;
}