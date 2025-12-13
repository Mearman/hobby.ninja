/**
 * Update brands.json with image paths for downloaded images
 *
 * Scans the images/brands directory and updates brands.json
 * with image paths for any brands that have matching files.
 *
 * Usage: pnpm tsx scripts/update-brand-images.ts
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BRANDS_JSON_PATH = "apps/next/public/data/brands.json";
const IMAGES_DIR = "apps/next/public/images/brands";
const IMAGE_PATH_PREFIX = "/images/brands/";
const SUMMARY_SEPARATOR_LENGTH = 50;

interface BrandNode {
	id: string;
	type: string;
	name: { ja?: string; en?: string } | string;
	url?: string;
	image?: string;
}

interface BrandData {
	nodes: BrandNode[];
}

function main() {
	// Load brand data
	const brandData = JSON.parse(readFileSync(BRANDS_JSON_PATH, "utf8")) as BrandData;

	// Get list of image files
	const imageFiles = readdirSync(IMAGES_DIR);
	const imageMap = new Map<string, string>();

	// Create a map of base filename to full filename (with extension)
	for (const file of imageFiles) {
		const baseName = path.basename(file, path.extname(file));
		imageMap.set(baseName, file);
	}

	console.log(`Found ${String(imageFiles.length)} image files`);
	console.log(`Found ${String(brandData.nodes.length)} brands\n`);

	let updated = 0;
	let alreadyHasImage = 0;
	let noImageFound = 0;

	// Update brands with image paths
	for (const brand of brandData.nodes) {
		if (brand.image) {
			alreadyHasImage++;
			continue;
		}

		// Try to find matching image file
		const imageFile = imageMap.get(brand.id);
		if (imageFile) {
			brand.image = `${IMAGE_PATH_PREFIX}${imageFile}`;
			console.log(`Updated: ${brand.id} -> ${brand.image}`);
			updated++;
		} else {
			noImageFound++;
		}
	}

	// Write updated data
	writeFileSync(BRANDS_JSON_PATH, JSON.stringify(brandData, null, "\t") + "\n");

	console.log("\n" + "=".repeat(SUMMARY_SEPARATOR_LENGTH));
	console.log("SUMMARY");
	console.log("=".repeat(SUMMARY_SEPARATOR_LENGTH));
	console.log(`Already had image: ${String(alreadyHasImage)}`);
	console.log(`Updated with image: ${String(updated)}`);
	console.log(`No image found: ${String(noImageFound)}`);
}

main();
