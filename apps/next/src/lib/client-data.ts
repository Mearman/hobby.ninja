/**
 * Client-side data fetcher for search and filtering
 *
 * This module fetches JSON data at runtime instead of bundling it into JavaScript.
 * This prevents the 18MB items.json from being included in the client bundle.
 *
 * The data files are served from /data/ (copied to public/data/ during build).
 * Service worker caches these files for offline support.
 *
 * For server components, use server-graph-data.ts instead.
 */

import type { ItemNode, BrandNode, CategoryNode, SeriesNode } from "./schemas";

// Cache for loaded data
let itemsCache: ItemNode[] | null = null;
let brandsCache: BrandNode[] | null = null;
let categoriesCache: CategoryNode[] | null = null;
let seriesCache: SeriesNode[] | null = null;

interface GraphDataFile<T> {
	nodes: T[];
	edges: Record<string, Record<string, never>>;
}

async function fetchData<T>(filename: string): Promise<T[]> {
	try {
		// Data files are in /data/ (from public/data/)
		// Service worker caches these for offline support
		const response = await fetch(`/data/${filename}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch ${filename}: ${response.status}`);
		}
		const data: GraphDataFile<T> = await response.json();
		return data.nodes;
	} catch (error) {
		console.error(`Error fetching ${filename}:`, error);
		return [];
	}
}

/**
 * Get all items (fetched at runtime, not bundled)
 */
export async function getClientItems(): Promise<ItemNode[]> {
	if (itemsCache) return itemsCache;
	itemsCache = await fetchData<ItemNode>("items.json");
	return itemsCache;
}

/**
 * Get all brands (fetched at runtime, not bundled)
 */
export async function getClientBrands(): Promise<BrandNode[]> {
	if (brandsCache) return brandsCache;
	brandsCache = await fetchData<BrandNode>("brands.json");
	return brandsCache;
}

/**
 * Get all categories (fetched at runtime, not bundled)
 */
export async function getClientCategories(): Promise<CategoryNode[]> {
	if (categoriesCache) return categoriesCache;
	categoriesCache = await fetchData<CategoryNode>("categories.json");
	return categoriesCache;
}

/**
 * Get all series (fetched at runtime, not bundled)
 */
export async function getClientSeries(): Promise<SeriesNode[]> {
	if (seriesCache) return seriesCache;
	seriesCache = await fetchData<SeriesNode>("series.json");
	return seriesCache;
}

/**
 * Preload all data (useful for search initialization)
 */
export async function preloadClientData(): Promise<void> {
	await Promise.all([
		getClientItems(),
		getClientBrands(),
		getClientCategories(),
		getClientSeries(),
	]);
}

/**
 * Get an item by ID
 */
export async function getClientItemById(id: string): Promise<ItemNode | undefined> {
	const items = await getClientItems();
	return items.find(item => item.id === id);
}

/**
 * Clear caches (useful for testing or forcing refresh)
 */
export function clearClientDataCache(): void {
	itemsCache = null;
	brandsCache = null;
	categoriesCache = null;
	seriesCache = null;
}
