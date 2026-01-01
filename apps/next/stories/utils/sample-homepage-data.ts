/**
 * Samples real data from @hobby-ninja/data for Storybook stories.
 * Takes a representative subset to keep stories performant while testing with real data.
 */

import {
	brands,
	categories,
	getGradesSorted,
	getScalesBySize,
	items,
	series,
	type Brand,
	type Category,
	type GradeData,
	type Item,
	type ScaleData,
	type Series,
} from "@hobby-ninja/data";

import type { YearData } from "../../src/components/homepage-client";

export interface SampledHomepageData {
	categories: Category[];
	series: Series[];
	grades: GradeData[];
	brands: Brand[];
	scales: ScaleData[];
	years: YearData[];
	items: Item[];
}

export interface SampleOptions {
	/** Max categories to include (default: 5) */
	maxCategories?: number;
	/** Max series to include (default: 10) */
	maxSeries?: number;
	/** Max grades to include (default: 8) */
	maxGrades?: number;
	/** Max brands to include (default: 5) */
	maxBrands?: number;
	/** Max scales to include (default: 6) */
	maxScales?: number;
	/** Max years to include (default: 5) */
	maxYears?: number;
	/** Max items to include (default: 100) */
	maxItems?: number;
}

const DEFAULT_OPTIONS: Required<SampleOptions> = {
	maxCategories: 5,
	maxSeries: 10,
	maxGrades: 8,
	maxBrands: 5,
	maxScales: 6,
	maxYears: 5,
	maxItems: 100,
};

/**
 * Get a representative sample of homepage data.
 * Prioritizes entities with the most items to ensure meaningful filter interactions.
 */
export function sampleHomepageData(options: SampleOptions = {}): SampledHomepageData {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	// Get all items
	const allItems = Object.values(items);

	// Sample categories (by item count, descending)
	const sampledCategories = Object.values(categories)
		.filter((c) => c.itemIds.length > 0)
		.toSorted((a, b) => b.itemIds.length - a.itemIds.length)
		.slice(0, opts.maxCategories);

	// Sample series (by item count, descending)
	const sampledSeries = Object.values(series)
		.filter((s) => s.itemIds.length > 0)
		.toSorted((a, b) => b.itemIds.length - a.itemIds.length)
		.slice(0, opts.maxSeries);

	// Sample grades (by sort order, then limit)
	const sampledGrades = getGradesSorted()
		.filter((g) => g.itemIds.length > 0)
		.slice(0, opts.maxGrades);

	// Sample brands (non-grade brands by item count)
	const sampledBrands = Object.values(brands)
		.filter((b) => b.itemIds.length > 0 && b.type !== "grade")
		.toSorted((a, b) => b.itemIds.length - a.itemIds.length)
		.slice(0, opts.maxBrands);

	// Sample scales (by size order)
	const sampledScales = getScalesBySize()
		.filter((s) => s.itemIds.length > 0)
		.slice(0, opts.maxScales);

	// Build set of relevant item IDs from sampled entities
	const relevantItemIds = new Set<string>();

	// Add items from sampled categories
	for (const cat of sampledCategories) {
		for (const id of cat.itemIds.slice(0, Math.ceil(opts.maxItems / opts.maxCategories))) {
			relevantItemIds.add(id);
		}
	}

	// Add items from sampled series
	for (const s of sampledSeries) {
		for (const id of s.itemIds.slice(0, Math.ceil(opts.maxItems / opts.maxSeries))) {
			relevantItemIds.add(id);
		}
	}

	// Add items from sampled grades
	for (const g of sampledGrades) {
		for (const id of g.itemIds.slice(0, Math.ceil(opts.maxItems / opts.maxGrades))) {
			relevantItemIds.add(id);
		}
	}

	// Filter to items that exist and limit total count
	const sampledItems = allItems
		.filter((item) => relevantItemIds.has(item.id))
		.slice(0, opts.maxItems);

	// If we don't have enough items, add more from the full list
	if (sampledItems.length < opts.maxItems) {
		const existingIds = new Set(sampledItems.map((i) => i.id));
		const additionalItems = allItems
			.filter((item) => !existingIds.has(item.id))
			.slice(0, opts.maxItems - sampledItems.length);
		sampledItems.push(...additionalItems);
	}

	// Build years from sampled items
	const yearMap = new Map<number, string[]>();
	for (const item of sampledItems) {
		const year = item.releaseDate?.year;
		if (year && year > 0) {
			const existing = yearMap.get(year) ?? [];
			existing.push(item.id);
			yearMap.set(year, existing);
		}
	}

	const sampledYears: YearData[] = [...yearMap.entries()]
		.map(([year, itemIds]) => ({
			id: String(year),
			name: String(year),
			year,
			itemIds,
		}))
		.toSorted((a, b) => b.year - a.year)
		.slice(0, opts.maxYears);

	// Update entity itemIds to only include sampled items
	const sampledItemIds = new Set(sampledItems.map((i) => i.id));

	const filteredCategories = sampledCategories.map((c) => ({
		...c,
		itemIds: c.itemIds.filter((id) => sampledItemIds.has(id)),
	}));

	const filteredSeries = sampledSeries.map((s) => ({
		...s,
		itemIds: s.itemIds.filter((id) => sampledItemIds.has(id)),
	}));

	const filteredGrades = sampledGrades.map((g) => ({
		...g,
		itemIds: g.itemIds.filter((id) => sampledItemIds.has(id)),
		itemCount: g.itemIds.filter((id) => sampledItemIds.has(id)).length,
	}));

	const filteredBrands = sampledBrands.map((b) => ({
		...b,
		itemIds: b.itemIds.filter((id) => sampledItemIds.has(id)),
	}));

	const filteredScales = sampledScales.map((s) => ({
		...s,
		itemIds: s.itemIds.filter((id) => sampledItemIds.has(id)),
		itemCount: s.itemIds.filter((id) => sampledItemIds.has(id)).length,
	}));

	return {
		categories: filteredCategories,
		series: filteredSeries,
		grades: filteredGrades,
		brands: filteredBrands,
		scales: filteredScales,
		years: sampledYears,
		items: sampledItems,
	};
}

// Pre-computed samples for different story scenarios
export const defaultSample = sampleHomepageData();

export const minimalSample = sampleHomepageData({
	maxCategories: 2,
	maxSeries: 3,
	maxGrades: 3,
	maxBrands: 2,
	maxScales: 2,
	maxYears: 2,
	maxItems: 20,
});

export const largeSample = sampleHomepageData({
	maxCategories: 10,
	maxSeries: 20,
	maxGrades: 15,
	maxBrands: 10,
	maxScales: 10,
	maxYears: 10,
	maxItems: 300,
});
