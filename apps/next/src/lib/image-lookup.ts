/**
 * Static image lookup for brands and series
 *
 * This module provides lightweight ID → image path mappings that can be
 * safely imported in client components. The data is bundled at build time
 * (only ~6KB) rather than fetched at runtime.
 *
 * For static export compatibility, this uses a pre-generated JSON file
 * instead of runtime data fetching.
 */

import imageLookup from "@/data/image-lookup.json";

interface ImageLookupData {
	brands: Record<string, string>;
	series: Record<string, string>;
}

const lookup = imageLookup as ImageLookupData;

/**
 * Get the image path for a brand by ID
 * @returns Image path or undefined if no image exists
 */
export function getBrandImage(brandId: string): string | undefined {
	return lookup.brands[brandId];
}

/**
 * Get the image path for a series by ID
 * @returns Image path or undefined if no image exists
 */
export function getSeriesImage(seriesId: string): string | undefined {
	return lookup.series[seriesId];
}

/**
 * Check if a brand has an image
 */
export function hasBrandImage(brandId: string): boolean {
	return brandId in lookup.brands;
}

/**
 * Check if a series has an image
 */
export function hasSeriesImage(seriesId: string): boolean {
	return seriesId in lookup.series;
}

/**
 * Get all brand IDs that have images
 */
export function getBrandIdsWithImages(): string[] {
	return Object.keys(lookup.brands);
}

/**
 * Get all series IDs that have images
 */
export function getSeriesIdsWithImages(): string[] {
	return Object.keys(lookup.series);
}
