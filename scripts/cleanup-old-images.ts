/**
 * Clean up old brand/series images that don't match canonical IDs
 *
 * Removes images whose filenames don't match any canonical brand or series ID.
 * Example: removes "toy-story-4.jpg" but keeps "toystory4.jpg"
 */

import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";

const CANONICAL_IDS_PATH = "scripts/temp/official-bandai-ids.json";
const BRANDS_IMAGE_DIR = "apps/next/public/images/brands";
const SERIES_IMAGE_DIR = "apps/next/public/images/series";

interface CanonicalIds {
	brands: string[];
	series: string[];
}

function loadCanonicalIds(): CanonicalIds {
	return JSON.parse(readFileSync(CANONICAL_IDS_PATH, "utf8")) as CanonicalIds;
}

function getImagesInDir(dir: string): string[] {
	const images: string[] = [];
	if (!existsSync(dir)) return images;

	const files = readdirSync(dir);
	for (const file of files) {
		const ext = path.extname(file).toLowerCase();
		if ([".jpg", ".png", ".jpeg", ".svg"].includes(ext)) {
			// Remove extension to get ID
			const id = file.replace(/\.[^.]+$/, "");
			images.push(id);
		}
	}
	return images;
}

function cleanupImages(): void {
	const canonicalIds = loadCanonicalIds();
	const brandIds = new Set(canonicalIds.brands);
	const seriesIds = new Set(canonicalIds.series);

	// Clean up brand images
	console.log("Cleaning up brand images...");
	const brandImages = getImagesInDir(BRANDS_IMAGE_DIR);
	for (const imageId of brandImages) {
		if (!brandIds.has(imageId)) {
			const files = readdirSync(BRANDS_IMAGE_DIR);
			for (const file of files) {
				if (file.startsWith(imageId + ".")) {
					const filePath = path.join(BRANDS_IMAGE_DIR, file);
					unlinkSync(filePath);
					console.log(`  Deleted: ${file}`);
				}
			}
		}
	}

	// Clean up series images
	console.log("\nCleaning up series images...");
	const seriesImages = getImagesInDir(SERIES_IMAGE_DIR);
	for (const imageId of seriesImages) {
		if (!seriesIds.has(imageId)) {
			const files = readdirSync(SERIES_IMAGE_DIR);
			for (const file of files) {
				if (file.startsWith(imageId + ".")) {
					const filePath = path.join(SERIES_IMAGE_DIR, file);
					unlinkSync(filePath);
					console.log(`  Deleted: ${file}`);
				}
			}
		}
	}

	console.log("\nCleanup complete!");
}

cleanupImages();