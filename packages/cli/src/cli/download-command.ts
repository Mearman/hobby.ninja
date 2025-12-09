/**
 * Asset download command for manuals and catalog items
 *
 * Downloads images and PDFs from JSON metadata into their corresponding folders.
 * Supports both bandai manuals (productImage, pdfUrl, supplementaryPdfUrl)
 * and catalog items (images array).
 */

import { promises as fs } from "node:fs";
import { join, basename } from "node:path";

export type DownloadSource = "all" | "manuals" | "catalog";

export interface DownloadOptions {
	source: DownloadSource;
	manualsDir: string;
	catalogDir: string;
	concurrency: number;
	delayMs: number;
	dryRun: boolean;
	verbose: boolean;
}

export interface DownloadResult {
	totalItems: number;
	downloaded: number;
	skipped: number;
	failed: number;
	errors: string[];
	duration: number;
}

interface ManualJson {
	id: string;
	productImage?: string;
	pdfUrl?: string;
	supplementaryPdfUrl?: string;
}

interface CatalogItemJson {
	id: string;
	images?: string[];
}

const HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
	"Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
	Referer: "https://bandai-hobby.net/",
};

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
): Promise<{ downloaded: boolean; error?: string }> {
	if (await fileExists(destPath)) {
		if (verbose) {
			console.log(`  Skipped (exists): ${basename(destPath)}`);
		}
		return { downloaded: false };
	}

	try {
		const response = await fetch(url, { headers: HEADERS });
		if (!response.ok) {
			return { downloaded: false, error: `HTTP ${response.status}` };
		}

		const buffer = await response.arrayBuffer();
		await fs.writeFile(destPath, Buffer.from(buffer));
		if (verbose) {
			console.log(`  Downloaded: ${basename(destPath)}`);
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
		const imagePath = join(manualDir, `${manual.id}.${ext}`);

		if (options.dryRun) {
			console.log(`  Would download: ${manual.productImage} -> ${basename(imagePath)}`);
			stats.skipped++;
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

	// Download main PDF
	if (manual.pdfUrl) {
		const pdfPath = join(manualDir, `${manual.id}.pdf`);

		if (options.dryRun) {
			console.log(`  Would download: ${manual.pdfUrl} -> ${basename(pdfPath)}`);
			stats.skipped++;
		} else {
			const result = await downloadFile(manual.pdfUrl, pdfPath, options.verbose);
			if (result.downloaded) {
				stats.downloaded++;
			} else if (result.error) {
				stats.failed++;
				stats.errors.push(`${manual.id} pdfUrl: ${result.error}`);
			} else {
				stats.skipped++;
			}
		}
	}

	// Download supplementary PDF
	if (manual.supplementaryPdfUrl) {
		const pdfPath = join(manualDir, `${manual.id}_2.pdf`);

		if (options.dryRun) {
			console.log(`  Would download: ${manual.supplementaryPdfUrl} -> ${basename(pdfPath)}`);
			stats.skipped++;
		} else {
			const result = await downloadFile(manual.supplementaryPdfUrl, pdfPath, options.verbose);
			if (result.downloaded) {
				stats.downloaded++;
			} else if (result.error) {
				stats.failed++;
				stats.errors.push(`${manual.id} supplementaryPdfUrl: ${result.error}`);
			} else {
				stats.skipped++;
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

	for (let i = 0; i < item.images.length; i++) {
		const imageUrl = item.images[i];
		if (!imageUrl) continue;

		const ext = getImageExtension(imageUrl);
		// Name images as {id}_0.jpg, {id}_1.jpg, etc.
		const imagePath = join(itemDir, `${item.id}_${i}.${ext}`);

		if (options.dryRun) {
			console.log(`  Would download: ${imageUrl} -> ${basename(imagePath)}`);
			stats.skipped++;
		} else {
			const result = await downloadFile(imageUrl, imagePath, options.verbose);
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
			await sleep(50);
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
		const entries = await fs.readdir(options.manualsDir, { withFileTypes: true });
		const ids = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
		result.totalItems = ids.length;

		console.log(`Processing ${ids.length} manuals from ${options.manualsDir}`);

		// Process in batches for concurrency
		for (let i = 0; i < ids.length; i += options.concurrency) {
			const batch = ids.slice(i, i + options.concurrency);

			const batchResults = await Promise.all(
				batch.map(async (id) => {
					const manualDir = join(options.manualsDir, id);
					const jsonPath = join(manualDir, `${id}.json`);

					try {
						const content = await fs.readFile(jsonPath, "utf8");
						const manual: ManualJson = JSON.parse(content);

						if (options.verbose) {
							console.log(`[${id}] Processing...`);
						}

						return await downloadManualAssets(manualDir, manual, options);
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
		const ids = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
		result.totalItems = ids.length;

		console.log(`Processing ${ids.length} catalog items from ${options.catalogDir}`);

		// Process in batches for concurrency
		for (let i = 0; i < ids.length; i += options.concurrency) {
			const batch = ids.slice(i, i + options.concurrency);

			const batchResults = await Promise.all(
				batch.map(async (id) => {
					const itemDir = join(options.catalogDir, id);
					const jsonPath = join(itemDir, `${id}.json`);

					try {
						const content = await fs.readFile(jsonPath, "utf8");
						const item: CatalogItemJson = JSON.parse(content);

						if (options.verbose) {
							console.log(`[${id}] Processing ${item.images?.length || 0} images...`);
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

	combinedResult.duration = Date.now() - startTime;
	return combinedResult;
}
