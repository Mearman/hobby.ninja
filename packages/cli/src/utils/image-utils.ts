import path from "node:path";

import { glob } from "glob";

import type { Item, ItemImage, ItemImages } from "../cli/bandai-catalog-parser.js";

const ITEMS_IMAGES_DIR = path.join(process.cwd(), "assets/images/items");

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
