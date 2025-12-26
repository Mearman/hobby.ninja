import { promises as fs } from "node:fs";

import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";
import { glob } from "glob";


import type { Item, ItemImage, ItemImages } from "../cli/bandai-catalog-parser.js";

const ITEMS_IMAGES_DIR = resolveWorkspacePath("assets/images/items");
const ITEMS_DATA_DIR = resolveWorkspacePath("data/src/items");

/**
 * Index mapping image hashes to their canonical paths
 * Items are loaded at initialization (authoritative source)
 * Manuals and P-Bandai are added incrementally as they're processed
 * Used for deduplication during image downloads
 */
export class ImageHashIndex {
	private hashToPath = new Map<string, string>();
	private initialized = false;

	/**
	 * Build the hash index from item JSON files
	 * Items are the authoritative source; manuals/P-Bandai are added as processed
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		let itemImages = 0;

		// Load item images (authoritative source)
		const itemFiles = await glob(`${ITEMS_DATA_DIR}/01_*.json`);

		for (const file of itemFiles) {
			try {
				const content = await fs.readFile(file, "utf8");
				const item = JSON.parse(content) as Item;

				if (!item.images) continue;

				// Index product images
				for (const img of item.images.product) {
					if (img.hash && img.path) {
						this.hashToPath.set(img.hash, img.path);
						itemImages++;
					}
				}

				// Index instruction images
				for (const img of item.images.instructions) {
					if (img.hash && img.path) {
						this.hashToPath.set(img.hash, img.path);
						itemImages++;
					}
				}
			} catch {
				// Skip files that can't be parsed
			}
		}

		this.initialized = true;
		console.log(`  Hash index: ${this.hashToPath.size} unique hashes from ${itemImages} item images`);
	}

	/**
	 * Look up an existing image path by its content hash
	 * @param hash - MD5 hash of the image content
	 * @returns Existing path if found, undefined otherwise
	 */
	findByHash(hash: string): string | undefined {
		return this.hashToPath.get(hash);
	}

	/**
	 * Add a new hash→path mapping
	 * Used when a new image is downloaded and saved
	 */
	add(hash: string, path: string): void {
		this.hashToPath.set(hash, path);
	}

	/**
	 * Check if index is initialized
	 */
	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Get the number of indexed hashes
	 */
	get size(): number {
		return this.hashToPath.size;
	}
}

/**
 * Check if a URL is ephemeral (will expire and shouldn't be persisted)
 * CloudFront and Akamai URLs with signed tokens expire
 */
export function isEphemeralUrl(url: string): boolean {
	return url.includes("cloudfront.net") || url.includes("akamaized.net");
}

/**
 * Strip ephemeral src from an image object
 * Keeps permanent URLs, removes ephemeral ones
 */
export function stripEphemeralSrc(img: { src?: string; path?: string }): ItemImage {
	if (img.src && isEphemeralUrl(img.src)) {
		return img.path ? { path: img.path } : {};
	}
	return img;
}

/**
 * Strip ephemeral URLs from all images in an item's images object
 */
export function stripEphemeralImageUrls(images: ItemImages): ItemImages {
	return {
		product: images.product.map(img => stripEphemeralSrc(img)),
		instructions: images.instructions.map(img => stripEphemeralSrc(img)),
	};
}

/**
 * Strip ephemeral URLs from an Item before persisting
 * Keeps only the local path, removes src for CDN URLs that will expire
 */
export function stripEphemeralFromItem(item: Item): Item {
	if (!item.images) return item;

	return {
		...item,
		images: stripEphemeralImageUrls(item.images),
	};
}

/**
 * Search for an existing image by exact filename in item assets
 * @param filenamePrefix e.g., "159_1303" to match "159_1303.jpg" (not "159_13030.jpg")
 * @returns Relative path like "/images/items/01_0324/159_1303.jpg" or null
 */
export async function findExistingItemImage(filenamePrefix: string): Promise<string | null> {
	// Use exact match with extension to avoid prefix collisions (e.g., 157_150 matching 157_1509)
	const pattern = `${ITEMS_IMAGES_DIR}/*/${filenamePrefix}.{jpg,jpeg,png,webp,gif}`;
	const matches = await glob(pattern);

	const match = matches[0];
	if (match) {
		// Return path relative to assets root
		const relativePath = match.replace(/.*\/assets/, "");
		return relativePath;
	}
	return null;
}
