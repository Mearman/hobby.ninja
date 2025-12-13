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

import type { Browser, BrowserContext, Page } from "playwright";

const IMAGE_DELAY_MS = 50;

export type DownloadSource = "all" | "manuals" | "catalog";

export interface DownloadOptions {
	source: DownloadSource;
	manualsSourceDir: string; // Directory containing manual JSON files
	manualsDir: string; // Output directory for manual assets (images, PDFs)
	catalogDir: string;
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

		const buffer = await response.arrayBuffer();
		await fs.writeFile(destPath, Buffer.from(buffer));
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
	itemDir: string,
	item: CatalogItemJson,
	options: DownloadOptions,
): Promise<{ downloaded: number; skipped: number; failed: number; errors: string[] }> {
	const stats = { downloaded: 0, skipped: 0, failed: 0, errors: [] as string[] };

	if (!item.images || item.images.length === 0) {
		return stats;
	}

	// Check if any images require Playwright (CloudFront/Akamai signed URLs)
	const needsPlaywright = item.images.some((url) => url && requiresPlaywright(url));

	// If signed URLs and we have a source URL, visit the page first to get cookies
	if (needsPlaywright && item.sourceUrl && !options.dryRun) {
		try {
			await visitPageForSession(item.sourceUrl);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			stats.errors.push(`${item.id}: Failed to load source page: ${msg}`);
			stats.failed += item.images.length;
			return stats;
		}
	}

	for (let i = 0; i < item.images.length; i++) {
		const imageUrl = item.images[i];
		if (!imageUrl) continue;

		const ext = getImageExtension(imageUrl);
		// Name images as {id}_0.jpg, {id}_1.jpg, etc.
		const imagePath = path.join(itemDir, `${item.id}_${i}.${ext}`);

		if (options.dryRun) {
			console.log(`  Would download: ${imageUrl} -> ${path.basename(imagePath)}`);
			stats.skipped++;
		} else {
			const result = await downloadFile(imageUrl, imagePath, options.verbose, needsPlaywright);
			if (result.downloaded) {
				stats.downloaded++;
			} else if (result.error) {
				stats.failed++;
				stats.errors.push(`${item.id} image[${i}]: ${result.error}`);
			} else {
				stats.skipped++;
			}
		}

		// Small delay between images in same item
		if (i < item.images.length - 1 && !options.dryRun) {
			await sleep(IMAGE_DELAY_MS);
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
		const ids = entries.filter((e) => e.isDirectory()).map((e) => e.name).toSorted();
		result.totalItems = ids.length;

		console.log(`Processing ${ids.length} catalog items from ${options.catalogDir}`);

		// Process in batches for concurrency
		for (let i = 0; i < ids.length; i += options.concurrency) {
			const batch = ids.slice(i, i + options.concurrency);

			const batchResults = await Promise.all(
				batch.map(async (id) => {
					const itemDir = path.join(options.catalogDir, id);
					const jsonPath = path.join(itemDir, `${id}.json`);

					try {
						const content = await fs.readFile(jsonPath, "utf8");
						const item = JSON.parse(content) as CatalogItemJson;

						if (options.verbose) {
							console.log(`[${id}] Processing ${item.images?.length ?? 0} images...`);
						}

						return await downloadCatalogAssets(itemDir, item, options);
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
