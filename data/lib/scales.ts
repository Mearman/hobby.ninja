import { z } from "zod";
import scalesJson from "../dist/scales.json" with { type: "json" };
import { ScaleDataSchema, type ScaleData, type Item } from "./schemas.js";
import { items } from "./items.js";

/**
 * Validated scales data with helper functions
 *
 * Scales are derived from items based on their scales property (items can have multiple scales).
 * Common scales include 1/144, 1/100, 1/60, etc.
 */

const ScalesRecordSchema = z.record(z.string(), ScaleDataSchema);
export const scales = ScalesRecordSchema.parse(scalesJson);

export const scalesList = Object.values(scales);

export function getScaleIds(): string[] {
	return Object.keys(scales);
}

export function getScaleById(id: string): ScaleData | undefined {
	return scales[id];
}

export function getScaleCount(): number {
	return scalesList.length;
}

/**
 * Get scales sorted by item count (descending)
 */
export function getScalesByPopularity(): ScaleData[] {
	return [...scalesList].sort((a, b) => b.itemCount - a.itemCount);
}

/**
 * Parse scale name to numeric ratio for comparison
 * Returns null for non-standard scales
 */
export function parseScaleRatio(scaleName: string): number | null {
	const match = scaleName.match(/^1\/(\d+)$/);
	if (!match) return null;
	const denominator = Number.parseInt(match[1], 10);
	return 1 / denominator;
}

/**
 * Get scales sorted by size (largest to smallest)
 * Non-standard scales appear at the end
 */
export function getScalesBySize(): ScaleData[] {
	return [...scalesList].sort((a, b) => {
		const ratioA = parseScaleRatio(a.name);
		const ratioB = parseScaleRatio(b.name);

		// Both are standard scales - compare ratios
		if (ratioA !== null && ratioB !== null) {
			return ratioB - ratioA; // Larger ratio first
		}

		// One is standard, one is not
		if (ratioA !== null) return -1;
		if (ratioB !== null) return 1;

		// Both are non-standard - alphabetical
		return a.name.localeCompare(b.name);
	});
}

/**
 * Get all items for a given scale ID
 */
export function getItemsByScale(scaleId: string): Item[] {
	const scale = scales[scaleId];
	if (!scale) return [];
	return scale.itemIds.map(id => items[id]).filter(Boolean) as Item[];
}

export type { ScaleData } from "./schemas.js";
