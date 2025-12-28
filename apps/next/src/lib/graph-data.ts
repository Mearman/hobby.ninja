import "server-only";

// Static data imports from @hobby-ninja/data package
// This replaces runtime fetching with build-time imports
// NOTE: This module is SERVER ONLY - it will error if imported in client components
// For client-side data access, use client-data.ts instead

import {
	brands as brandsData,
	brandsList,
	type Brand,
} from "@hobby-ninja/data/brands";
import {
	categories as categoriesData,
	categoriesList,
	type Category,
} from "@hobby-ninja/data/categories";
import {
	items as itemsData,
	itemsList,
	type Item,
} from "@hobby-ninja/data/items";
import {
	manuals as manualsData,
	manualsList,
	type Manual,
} from "@hobby-ninja/data/manuals";
import { getNodeDisplayName } from "@hobby-ninja/data/schemas";
import {
	series as seriesData,
	seriesList,
	type Series,
} from "@hobby-ninja/data/series";

// Re-export types for convenience


// Type aliases for backward compatibility
export type ItemNode = Item;
export type BrandNode = Brand;
export type CategoryNode = Category;
export type SeriesNode = Series;
export type ManualNode = Manual;

// Base node type for common operations
export interface BaseNode {
	id: string;
	type: string;
	name: string | { ja: string; en?: string };
}

// Union type for all graph nodes
export type GraphNode = Item | Brand | Series | Category | Manual;

// Sort data by display name
const sortByName = <T extends GraphNode>(a: T, b: T): number => {
	const nameA = getNodeDisplayName(a);
	const nameB = getNodeDisplayName(b);
	return nameA.localeCompare(nameB);
};

// Memoization caches for sorted/enriched results
let _allItemsCache: EnrichedItem[] | null = null;
let _allBrandsCache: Brand[] | null = null;
let _allCategoriesCache: Category[] | null = null;
let _allSeriesCache: Series[] | null = null;
let _allManualsCache: Manual[] | null = null;

// Type for enriched item with resolved relationship names
// Note: Property names like seriesName/brandName/categoryName avoid conflict with Item's array properties
export type EnrichedItem = Item & {
	seriesName?: string;
	firstSeriesId?: string;
	gradeName?: string;
	scaleName?: string;
	brandName?: string;
	firstBrandId?: string;
	firstCategoryId?: string;
	categoryName?: string;
};

// Helper function to get node name by ID
function getBrandNameById(brandId: string): string {
	const brand = brandsData[brandId] as Brand | undefined;
	return brand ? getNodeDisplayName(brand) : "";
}

function getSeriesNameById(seriesId: string): string {
	const series = seriesData[seriesId] as Series | undefined;
	return series ? getNodeDisplayName(series) : "";
}

function getCategoryNameById(categoryId: string): string {
	const category = categoriesData[categoryId] as Category | undefined;
	return category ? getNodeDisplayName(category) : "";
}

// Extract grade from item name or brand
function extractGradeFromItem(item: Item): string {
	const itemName = getNodeDisplayName(item).toLowerCase();

	// Check for grade indicators in name
	const gradePatterns = [
		/\b(?:pg|perfect grade)\b/,
		/\b(?:mg|master grade)\b/,
		/\b(?:rg|real grade)\b/,
		/\b(?:hg|high grade)\b/,
		/\b(?:hguc|high grade universal century)\b/,
		/\b(?:sd|super deformed)\b/,
		/\b(?:eg|entry grade)\b/,
		/\b(?:re|revive)\b/,
		/\b(?:mb|metal build)\b/,
		/\b(?:fix|full action)\b/,
	];

	for (const pattern of gradePatterns) {
		const match = itemName.match(pattern);
		if (match) {
			return match[0].toUpperCase();
		}
	}

	// Check brand for grade information
	for (const brand of item.brands) {
		const brandName = getBrandNameById(brand.id).toLowerCase();
		if (brandName.includes("pg") || brandName.includes("perfect grade")) return "PG";
		if (brandName.includes("mg") || brandName.includes("master grade")) return "MG";
		if (brandName.includes("rg") || brandName.includes("real grade")) return "RG";
		if (brandName.includes("hg") || brandName.includes("high grade")) return "HG";
		if (brandName.includes("sd") || brandName.includes("super deformed")) return "SD";
		if (brandName.includes("eg") || brandName.includes("entry grade")) return "EG";
	}

	return "";
}

// Enrich item with resolved relationship names
function enrichItemWithRelationships(item: Item): EnrichedItem {
	const enrichedItem: EnrichedItem = { ...item };

	// Resolve series (use first one)
	if (item.series.length > 0) {
		enrichedItem.firstSeriesId = item.series[0].id;
		enrichedItem.seriesName = getSeriesNameById(item.series[0].id);
	}

	// Resolve brand (use first one)
	if (item.brands.length > 0) {
		enrichedItem.firstBrandId = item.brands[0].id;
		enrichedItem.brandName = getBrandNameById(item.brands[0].id);
	}

	// Resolve category (use first one)
	if (item.categories.length > 0) {
		enrichedItem.firstCategoryId = item.categories[0].id;
		enrichedItem.categoryName = getCategoryNameById(item.categories[0].id);
	}

	// Use primary scale from item data (first scale in array)
	if (item.scales.length > 0) {
		enrichedItem.scaleName = item.scales[0];
	}

	// Extract grade
	const grade = extractGradeFromItem(item);
	if (grade) {
		enrichedItem.gradeName = grade;
	}

	return enrichedItem;
}

// Export synchronous functions that return pre-validated data with enriched properties
export function getAllItems(): EnrichedItem[] {
	_allItemsCache ??= itemsList.map((item) => enrichItemWithRelationships(item)).toSorted(sortByName);
	return _allItemsCache;
}

export function getAllBrands(): Brand[] {
	_allBrandsCache ??= brandsList.toSorted(sortByName);
	return _allBrandsCache;
}

export function getAllCategories(): Category[] {
	_allCategoriesCache ??= categoriesList.toSorted(sortByName);
	return _allCategoriesCache;
}

export function getAllSeries(): Series[] {
	_allSeriesCache ??= seriesList.toSorted(sortByName);
	return _allSeriesCache;
}

export function getAllManuals(): Manual[] {
	_allManualsCache ??= manualsList.toSorted(sortByName);
	return _allManualsCache;
}

// Get specific node by ID
export function getItemById(id: string): EnrichedItem | null {
	const item = itemsData[id] as Item | undefined;
	return item ? enrichItemWithRelationships(item) : null;
}

export function getBrandById(id: string): Brand | null {
	return brandsData[id] ?? null;
}

export function getCategoryById(id: string): Category | null {
	return categoriesData[id] ?? null;
}

export function getSeriesById(id: string): Series | null {
	return seriesData[id] ?? null;
}

export function getManualById(id: string): Manual | null {
	return manualsData[id] ?? null;
}

// Get items by category (using itemIds array on category)
export function getItemsByCategory(categoryId: string): EnrichedItem[] {
	const category = categoriesData[categoryId] as Category | undefined;
	if (!category) return [];

	return category.itemIds
		.map((itemId) => itemsData[itemId] as Item | undefined)
		.filter((item): item is Item => item !== undefined)
		.map((item) => enrichItemWithRelationships(item))
		.toSorted(sortByName);
}

// Get items by brand (using itemIds array on brand)
export function getItemsByBrand(brandId: string): EnrichedItem[] {
	const brand = brandsData[brandId] as Brand | undefined;
	if (!brand) return [];

	return brand.itemIds
		.map((itemId) => itemsData[itemId] as Item | undefined)
		.filter((item): item is Item => item !== undefined)
		.map((item) => enrichItemWithRelationships(item))
		.toSorted(sortByName);
}

// Get items by series (using itemIds array on series)
export function getItemsBySeries(seriesId: string): EnrichedItem[] {
	const series = seriesData[seriesId] as Series | undefined;
	if (!series) return [];

	return series.itemIds
		.map((itemId) => itemsData[itemId] as Item | undefined)
		.filter((item): item is Item => item !== undefined)
		.map((item) => enrichItemWithRelationships(item))
		.toSorted(sortByName);
}

// Get all unique grades from items
export function getAllGrades(): string[] {
	const grades = new Set<string>();

	for (const item of itemsList) {
		const grade = extractGradeFromItem(item);
		if (grade) {
			grades.add(grade);
		}
	}

	return [...grades].toSorted((a, b) => a.localeCompare(b));
}

// Get all nodes combined
export function getAllNodes(): GraphNode[] {
	return [...itemsList, ...brandsList, ...categoriesList, ...seriesList, ...manualsList];
}

// Get node by any type
export function getNodeByIdAny(id: string): GraphNode | undefined {
	return (itemsData[id] as GraphNode | undefined)
		?? (brandsData[id] as GraphNode | undefined)
		?? (categoriesData[id] as GraphNode | undefined)
		?? (seriesData[id] as GraphNode | undefined)
		?? (manualsData[id] as GraphNode | undefined);
}

// Validate that required data is available
export function validateGraphData(): boolean {
	return itemsList.length > 0 && brandsList.length > 0 && categoriesList.length > 0 && seriesList.length > 0;
}

// Export static data for backward compatibility
export function getStaticData() {
	return {
		items: itemsList,
		brands: brandsList,
		categories: categoriesList,
		series: seriesList,
		manuals: manualsList,
	};
}

// Export graphData as a getter for backward compatibility
export const graphData = {
	get items() {
		return itemsList;
	},
	get brands() {
		return brandsList;
	},
	get categories() {
		return categoriesList;
	},
	get series() {
		return seriesList;
	},
	get manuals() {
		return manualsList;
	},
};

// Grade data type from per-grade JSON files
export interface GradeData {
	id: string;
	type: "grade";
	name: string;
	parent: string | null;
	children: string[];
	itemIds: string[];
	itemCount: number;
}

// Scale data type from per-scale JSON files
export interface ScaleData {
	id: string;
	type: "scale";
	name: string;
	itemIds: string[];
	itemCount: number;
}

// Grades index type
export interface GradesIndex {
	grades: Array<{
		id: string;
		name: string;
		parent: string | null;
		itemCount: number;
	}>;
	hierarchy: Record<string, { parent: string | null; children: string[] }>;
}

export {type Item} from "@hobby-ninja/data/items";
export {type Brand} from "@hobby-ninja/data/brands";
export {type Series} from "@hobby-ninja/data/series";
export {type Category} from "@hobby-ninja/data/categories";
export {type Manual} from "@hobby-ninja/data/manuals";