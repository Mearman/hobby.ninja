/**
 * Image processing utilities for scraping operations
 * Handles downloading, deduplication, and cleanup of item and manual images
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";
import type { BrowserContext } from "playwright";

import { computeBufferHash, computeFileHash, normalizeImageExtension } from "../../utils/file-utils.js";
import { findExistingItemImage, ImageHashIndex } from "../../utils/image-utils.js";
import type { Item, ItemImage } from "../bandai-catalog-parser.js";
import { extractFilenameFromUrl } from "../download-command.js";
import type { ManualData } from "../manual-parser.js";

import {
	ASSETS_DIR,
	DEFAULT_USER_AGENT,
	FETCH_TIMEOUT_MS,
	MANUALS_ASSETS_DIR,
	UNKNOWN_ERROR,
	type DownloadStats,
} from "./types.js";

/**
 * Promise with a hard timeout
 * Rejects if the operation doesn't complete within timeoutMs
 */
async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	timeoutMsg = "Operation timed out",
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout>;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(timeoutMsg));
		}, timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		clearTimeout(timeoutId!);
	}
}

/**
 * Fetch with timeout and retry logic
 * Uses hard timeout that covers the entire operation including body reading
 */
async function fetchWithRetry(
	url: string,
	options: RequestInit,
	maxRetries = 3,
): Promise<Response> {
	const RETRY_DELAY_MS = 2000;
	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const response = await withTimeout(
				fetch(url, options),
				FETCH_TIMEOUT_MS,
				`Fetch timeout after ${FETCH_TIMEOUT_MS}ms`,
			);
			return response;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(UNKNOWN_ERROR);
			const isTimeout = lastError.message.includes("timeout") || lastError.message.includes("Timeout");
			const isAbort = lastError.name === "AbortError";

			if (attempt < maxRetries && (isTimeout || isAbort)) {
				const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
				console.log(`    Retry ${attempt}/${maxRetries} after ${delay}ms (${lastError.message})`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			} else {
				// Throw on final attempt OR non-retryable errors
				throw lastError;
			}
		}
	}

	throw lastError ?? new Error("Fetch failed after retries");
}

/**
 * Download item images (product and instructions) from URLs
 * Creates item-specific directory and downloads images with appropriate naming
 * Uses hash-based deduplication to avoid storing duplicate images
 *
 * @param itemId - Item identifier (e.g., "01_5771")
 * @param itemData - Item data containing images to download
 * @param jsonPath - Path to item JSON file (for updating after download)
 * @param browserContext - Playwright browser context for signed/protected URLs
 * @param saveItemJson - Callback to save updated item JSON
 * @param hashIndex - Optional hash index for deduplication (item assets are authoritative)
 * @returns Download statistics (downloaded/skipped/deduplicated counts)
 */
export async function downloadItemImages(
	itemId: string,
	itemData: Item,
	jsonPath: string,
	browserContext: BrowserContext | null,
	saveItemJson: (path: string, data: Item) => Promise<void>,
	hashIndex?: ImageHashIndex,
): Promise<DownloadStats> {
	const stats: DownloadStats = { downloaded: 0, skipped: 0, deduplicated: 0 };

	if (!itemData.images) {
		return stats;
	}

	// Create item's image directory
	const itemImagesDir = path.join(ASSETS_DIR, itemId);
	await fs.mkdir(itemImagesDir, { recursive: true });

	// Collect all images to download
	const allImages: Array<{ image: ItemImage; type: "product" | "instruction" }> = [];

	for (const img of itemData.images.product) {
		allImages.push({ image: img, type: "product" });
	}
	for (const img of itemData.images.instructions) {
		allImages.push({ image: img, type: "instruction" });
	}

	// Download each image
	for (const { image, type } of allImages) {
		if (!image.src) {
			continue;
		}

		// Extract filename from URL (preserves original naming like 153_1.jpg)
		const baseFilename = extractImageFilename(image.src);
		const prefix = type === "instruction" ? "inst_" : "";
		const filename = `${prefix}${baseFilename}`;
		const localPath = path.join(itemImagesDir, filename);
		const relativePath = `/images/items/${itemId}/${filename}`;

		// Check if already downloaded locally
		try {
			await fs.access(localPath);
			// File exists, update path and compute hash
			image.path = relativePath;
			image.hash = await computeFileHash(localPath);
			// Add to hash index for future deduplication
			if (hashIndex && image.hash) {
				hashIndex.add(image.hash, relativePath);
			}
			stats.skipped++;
			continue;
		} catch {
			// File doesn't exist, need to download
		}

		// Download the image
		try {
			const imageBuffer = await downloadImage(image.src, browserContext);
			const hash = computeBufferHash(imageBuffer);

			// Check if this image already exists elsewhere (hash-based deduplication)
			const existingPath = hashIndex?.findByHash(hash);
			if (existingPath) {
				// Use existing image path instead of saving duplicate
				image.path = existingPath;
				image.hash = hash;
				stats.deduplicated = (stats.deduplicated ?? 0) + 1;
				console.log(`    Deduplicated: ${filename} → ${existingPath}`);
				continue;
			}

			// Save new image
			await fs.writeFile(localPath, imageBuffer);
			image.path = relativePath;
			image.hash = hash;

			// Add to hash index for future deduplication
			if (hashIndex) {
				hashIndex.add(hash, relativePath);
			}

			stats.downloaded++;
			console.log(`    Downloaded: ${filename}`);
		} catch (error) {
			const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
			console.log(`    Failed: ${filename} - ${msg}`);
		}
	}

	// Update JSON with local paths if any images were processed
	if (stats.downloaded > 0 || stats.skipped > 0 || (stats.deduplicated ?? 0) > 0) {
		await saveItemJson(jsonPath, itemData);
	}

	return stats;
}

/**
 * Download an image from URL
 * Tries plain fetch first, falls back to Playwright for signed/protected URLs
 *
 * @param url - Image URL to download
 * @param browserContext - Playwright browser context for fallback (null if not available)
 * @returns Image data as Buffer
 */
export async function downloadImage(url: string, browserContext: BrowserContext | null): Promise<Buffer> {
	// Try plain fetch first with hard timeout
	try {
		const response = await withTimeout(
			fetch(url, {
				headers: {
					"User-Agent": DEFAULT_USER_AGENT,
					Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
					Referer: "https://bandai-hobby.net/",
				},
			}),
			FETCH_TIMEOUT_MS,
			"Image fetch timeout",
		);

		if (response.ok) {
			// Validate content-type is actually an image (servers may return HTML for 404s with 200 status)
			const contentType = response.headers.get("content-type") ?? "";
			if (!contentType.startsWith("image/")) {
				throw new Error(`Invalid content-type: ${contentType} (expected image/*)`);
			}
			const arrayBuffer = await withTimeout(
				response.arrayBuffer(),
				FETCH_TIMEOUT_MS,
				"Image download timeout",
			);
			return Buffer.from(arrayBuffer);
		}
	} catch {
		// Fall back to Playwright
	}

	// Use Playwright for signed/protected URLs
	if (!browserContext) {
		throw new Error("Browser not initialized");
	}

	const page = await browserContext.newPage();
	try {
		const response = await page.goto(url, { waitUntil: "load", timeout: 30_000 });
		if (!response) {
			throw new Error("No response received");
		}
		if (!response.ok()) {
			throw new Error(`HTTP ${String(response.status())}`);
		}
		// Validate content-type is actually an image
		const contentType = response.headers()["content-type"] ?? "";
		if (!contentType.startsWith("image/")) {
			throw new Error(`Invalid content-type: ${contentType} (expected image/*)`);
		}
		return await response.body();
	} finally {
		await page.close();
	}
}

/**
 * Extract clean filename from image URL
 * Removes CDN-specific hash suffixes while preserving base filename
 *
 * Examples:
 * - bandai-hobby.net: "153_1_s_{hash}.jpg" → "153_1.jpg"
 * - akamaihd.net: "1000085708_1.jpg" → "1000085708_1.jpg" (unchanged)
 *
 * @param url - Image URL
 * @returns Clean filename
 */
export function extractImageFilename(url: string): string {
	const urlPath = new URL(url).pathname;
	const fullFilename = path.basename(urlPath);
	const ext = path.extname(fullFilename);
	const nameWithoutExt = fullFilename.slice(0, -ext.length);

	// Pattern for bandai-hobby.net CDN: {num}_{num}_s_{hash} or {num}_{num}_{letter}_{hash}
	// Examples: 153_1_s_1l14qctcn4r6fhud4l6u8ilrw9iv, 153_1008_s_maqcpwjhzdqc3zkmb8jg5lymakct
	const bandaiPattern = /^(\d+_\d+)_[a-z]_[a-z0-9]+$/i;
	const match = bandaiPattern.test(nameWithoutExt) ? (bandaiPattern.exec(nameWithoutExt)) : null;
	if (match?.[1]) {
		return normalizeImageExtension(`${match[1]}${ext}`);
	}

	// For other URLs (Akamai, etc.), use the original filename with normalized extension
	return normalizeImageExtension(fullFilename);
}

/**
 * Merge image paths from existing data into new scraped data
 * Preserves local paths when image sources match
 *
 * @param newImages - Newly scraped image data
 * @param existingImages - Existing image data with local paths
 * @returns Merged image data
 */
export function mergeImagePaths(
	newImages: Item["images"],
	existingImages: Item["images"],
): Item["images"] {
	if (!newImages || !existingImages) return newImages;

	// Build a map of src -> path from existing images
	const pathMap = new Map<string, string>();
	for (const img of existingImages.product) {
		if (img.src && img.path) {
			pathMap.set(img.src, img.path);
		}
	}
	for (const img of existingImages.instructions) {
		if (img.src && img.path) {
			pathMap.set(img.src, img.path);
		}
	}

	// Apply existing paths to new images
	const mergeArray = (images: ItemImage[]): ItemImage[] => {
		return images.map((img) => {
			if (img.src && !img.path) {
				const existingPath = pathMap.get(img.src);
				if (existingPath) {
					return { ...img, path: existingPath };
				}
			}
			return img;
		});
	};

	return {
		product: mergeArray(newImages.product),
		instructions: mergeArray(newImages.instructions),
	};
}

/**
 * Download manual cover image
 * Uses hash-based deduplication - item assets are the authoritative source
 *
 * @param manualId - Manual identifier (4-digit padded, e.g., "0106")
 * @param manualData - Manual data containing image to download
 * @param hashIndex - Optional hash index for deduplication
 * @returns Object with itemId if found via existing item, and whether image was deduplicated
 */
export async function downloadManualImage(
	manualId: string,
	manualData: ManualData,
	hashIndex?: ImageHashIndex,
): Promise<{ itemId?: string; deduplicated?: boolean }> {
	if (!manualData.image?.src) return {};

	const imageUrl = manualData.image.src;
	const filename = extractFilenameFromUrl(imageUrl);
	// Extract base filename without extension or Bandai hash suffix (_s_xxxxx)
	// e.g., "155_303_s_kwjuc0ri80ktzu3ahk5r92ecrdr4.jpg" -> "155_303"
	const filenameWithoutExt = filename.replace(/\.[^.]+$/, "");
	const filenamePrefix = filenameWithoutExt.replace(/_s_[a-z0-9]+$/i, "");
	// Clean filename for local storage (without hash suffix)
	const ext = path.extname(filename);
	const cleanFilename = `${filenamePrefix}${ext}`;

	// Manual asset paths
	const manualImageDir = path.join(MANUALS_ASSETS_DIR, manualId);

	// Check for existing image in items by filename (preferred location)
	const existingItemPath = await findExistingItemImage(filenamePrefix);
	if (existingItemPath) {
		manualData.image.path = existingItemPath;
		// Compute hash from the existing item image file
		const absoluteItemPath = resolveWorkspacePath(`assets${existingItemPath}`);
		manualData.image.hash = await computeFileHash(absoluteItemPath);
		console.log(`    Found existing image: ${existingItemPath}`);

		// Remove ALL image files from manual assets (they're duplicates)
		await cleanupManualImages(manualImageDir);

		// Extract item ID from path: /images/items/01_5771/157_833.jpg -> 01_5771
		const itemIdMatch = /\/images\/items\/([^/]+)\//.test(existingItemPath)
			? (/\/images\/items\/([^/]+)\//.exec(existingItemPath))
			: null;
		return { itemId: itemIdMatch?.[1] };
	}

	// No item image found by filename - check/download to manuals directory
	await fs.mkdir(manualImageDir, { recursive: true });
	const manualLocalPath = path.join(manualImageDir, cleanFilename);
	const relativePath = `/manuals/${manualId}/${cleanFilename}`;

	// Check if already downloaded to manuals (with correct filename)
	try {
		await fs.access(manualLocalPath);
		const hash = await computeFileHash(manualLocalPath);

		// Check hash index - item images may have different filenames (Akamai vs Bandai CDN)
		const existingPath = hashIndex?.findByHash(hash);
		if (existingPath && existingPath !== relativePath) {
			// Found matching item image - use that instead of manual copy
			manualData.image.path = existingPath;
			manualData.image.hash = hash;
			console.log(`    Deduplicated existing: ${cleanFilename} → ${existingPath}`);

			// Clean up ALL manual images (including this one)
			await cleanupManualImages(manualImageDir);

			// Extract item ID from path
			const itemIdMatch = /\/images\/items\/([^/]+)\//.test(existingPath)
				? /\/images\/items\/([^/]+)\//.exec(existingPath)
				: null;
			return { itemId: itemIdMatch?.[1], deduplicated: true };
		}

		// No matching item - use manual path and add to index for cross-entity deduplication
		manualData.image.path = relativePath;
		manualData.image.hash = hash;
		hashIndex?.add(hash, relativePath);
		console.log(`    Image already exists: ${cleanFilename}`);
		// Clean up any incorrectly named duplicates
		await cleanupManualImages(manualImageDir, cleanFilename);
		return {};
	} catch {
		// File doesn't exist, download it
	}

	// Clean up any incorrectly named files before downloading
	await cleanupManualImages(manualImageDir);

	try {
		const response = await fetchWithRetry(imageUrl, {
			headers: {
				"User-Agent": DEFAULT_USER_AGENT,
				Accept: "image/*",
				Referer: "https://manual.bandai-hobby.net/",
			},
		});

		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		// Wrap body reading in timeout
		const arrayBuffer = await withTimeout(
			response.arrayBuffer(),
			FETCH_TIMEOUT_MS,
			"Image download timeout",
		);
		const buffer = Buffer.from(arrayBuffer);
		const hash = computeBufferHash(buffer);

		// Check hash index for existing image with same content
		const existingPath = hashIndex?.findByHash(hash);
		if (existingPath) {
			// Use existing image path instead of saving duplicate
			manualData.image.path = existingPath;
			manualData.image.hash = hash;
			console.log(`    Deduplicated: ${cleanFilename} → ${existingPath}`);

			// Clean up manual images directory since we don't need it
			await cleanupManualImages(manualImageDir);

			// Extract item ID from path if it's an item image
			const itemIdMatch = /\/images\/items\/([^/]+)\//.test(existingPath)
				? /\/images\/items\/([^/]+)\//.exec(existingPath)
				: null;
			return { itemId: itemIdMatch?.[1], deduplicated: true };
		}

		// No duplicate found - save new image and add to index for cross-entity deduplication
		await fs.writeFile(manualLocalPath, buffer);
		manualData.image.path = relativePath;
		manualData.image.hash = hash;
		hashIndex?.add(hash, relativePath);
		console.log(`    Downloaded image: ${cleanFilename}`);
	} catch (error) {
		const msg = error instanceof Error ? error.message : UNKNOWN_ERROR;
		console.log(`    Failed to download image: ${msg}`);
	}

	return {};
}

/**
 * Remove image files from manual directory
 * Used to clean up duplicate images when they exist in items directory
 *
 * @param manualImageDir - Path to manual image directory
 * @param keepFilename - If specified, keep this file and remove others
 */
export async function cleanupManualImages(manualImageDir: string, keepFilename?: string): Promise<void> {
	try {
		const files = await fs.readdir(manualImageDir);
		for (const file of files) {
			if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
				if (keepFilename && file === keepFilename) continue;
				const filePath = path.join(manualImageDir, file);
				await fs.unlink(filePath);
				console.log(`    Removed duplicate: ${file}`);
			}
		}
		// Clean up empty directory
		await removeEmptyDir(manualImageDir);
	} catch {
		// Directory doesn't exist or can't be read
	}
}

/**
 * Remove directory if empty
 *
 * @param dirPath - Directory path to check and remove
 */
export async function removeEmptyDir(dirPath: string): Promise<void> {
	try {
		const files = await fs.readdir(dirPath);
		if (files.length === 0) {
			await fs.rmdir(dirPath);
		}
	} catch {
		// Directory doesn't exist or can't be read
	}
}

/**
 * Find image source URL from cached HTML file
 * Extracts product image URLs from bandai-hobby.net HTML
 *
 * @param htmlPath - Path to cached HTML file
 * @param _imagePath - Unused parameter (for potential future use)
 * @returns Image source URL or null if not found
 */
export async function findImageSrcFromHtml(htmlPath: string, _imagePath: string): Promise<string | null> {
	try {
		const html = await fs.readFile(htmlPath, "utf8");

		// Look for product images from bandai-hobby.net (the main catalog images)
		// Pattern: src="https://bandai-hobby.net/images/{product_id}_{variant}.jpg"
		const productImgPattern = /src="(https:\/\/bandai-hobby\.net\/images\/\d+_\d+[^"]+\.(?:jpg|png|webp))"/gi;
		const matches = [...html.matchAll(productImgPattern)];

		// Filter out common/logo images, prefer product images
		for (const match of matches) {
			const url = match[1];
			if (url && !url.includes("/common/") && !url.includes("logo")) {
				return url;
			}
		}

		// Fallback: look for ecms_img images from bandai-hobby.net (newer image hosting)
		// Pattern: src="https://bandai-hobby.net/ecms_img/web/{id}.jpg"
		const ecmsImgPattern = /src="(https:\/\/bandai-hobby\.net\/ecms_img\/[^"]+\.(?:jpg|png|webp))"/gi;
		const ecmsMatches = [...html.matchAll(ecmsImgPattern)];
		for (const match of ecmsMatches) {
			const url = match[1];
			if (url && !url.includes("/common/") && !url.includes("logo")) {
				return url;
			}
		}
	} catch {
		// HTML file doesn't exist or can't be read
	}
	return null;
}
