/**
 * Client-side data fetcher for search and filtering
 *
 * This module fetches JSON data at runtime instead of bundling it into JavaScript.
 * This prevents the 18MB items.json from being included in the client bundle.
 *
 * The data files are served from /data/ (copied to public/data/ during build).
 * Service worker caches these files for offline support.
 *
 * Available data files:
 * - search-index.json: Lightweight search data (~1.4MB) with id, name, brand, series, category, scale, price, releaseDate
 * - item-ids.json: Array of valid item IDs (~50KB) for validation
 * - items.json: Full item data (~16MB) for item lookups
 * - brands.json, categories.json, series.json, manuals.json: Full data for other node types
 *
 * For server components (pages), import from @hobby-ninja/data instead.
 */

import type { ItemNode, BrandNode, CategoryNode, SeriesNode } from "./schemas";

/**
 * Lightweight search item with only fields needed for Fuse.js search
 */
export interface SearchIndexItem {
	id: string;
	name: { ja: string; en?: string } | string;
	brand?: string;
	category?: string;
	series?: string;
	grade?: string;
	scale?: string;
	price?: { amount: number };
	releaseDate?: { year?: number };
}

/**
 * Get display name from a SearchIndexItem
 */
export function getSearchItemDisplayName(item: SearchIndexItem): string {
	if (typeof item.name === "string") return item.name;
	return item.name.en || item.name.ja;
}

/**
 * Format price from a SearchIndexItem
 */
export function formatSearchItemPrice(price: { amount: number } | undefined): string {
	if (!price) return "";
	return `¥${price.amount.toLocaleString()}`;
}

// Cache for loaded data
let searchIndexCache: SearchIndexItem[] | null = null;
let itemIdsCache: Set<string> | null = null;
let itemCache: Map<string, ItemNode> = new Map();
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
 * Fetch JSON data directly (not wrapped in GraphDataFile structure)
 */
async function fetchRawJson<T>(filename: string): Promise<T | null> {
	try {
		const response = await fetch(`/data/${filename}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch ${filename}: ${response.status}`);
		}
		return await response.json() as T;
	} catch (error) {
		console.error(`Error fetching ${filename}:`, error);
		return null;
	}
}

// ============================================================================
// OPTIMIZED DATA ACCESS (Recommended for new code)
// ============================================================================

/**
 * Get lightweight search index (~2MB instead of 19MB)
 * Contains only fields needed for Fuse.js: id, name, brand, category, series, grade, scale, price, releaseDate
 */
export async function getSearchIndex(): Promise<SearchIndexItem[]> {
	if (searchIndexCache) return searchIndexCache;
	const data = await fetchRawJson<SearchIndexItem[]>("search-index.json");
	searchIndexCache = data || [];
	return searchIndexCache;
}

/**
 * Get set of valid item IDs for validation (~50KB)
 * Use this to check if an item ID exists without loading full data
 */
export async function getItemIds(): Promise<Set<string>> {
	if (itemIdsCache) return itemIdsCache;
	const data = await fetchRawJson<string[]>("item-ids.json");
	itemIdsCache = new Set(data || []);
	return itemIdsCache;
}

/**
 * Check if an item ID is valid
 */
export async function isValidItemId(id: string): Promise<boolean> {
	const ids = await getItemIds();
	return ids.has(id);
}

/**
 * Get a specific item by ID
 * Loads from items.json cache (individual item files no longer exist)
 */
export async function getItemById(id: string): Promise<ItemNode | null> {
	// Check cache first
	if (itemCache.has(id)) {
		return itemCache.get(id)!;
	}

	// Load all items and find the one we need
	const items = await getClientItems();
	const item = items.find(i => i.id === id);
	if (item) {
		itemCache.set(id, item);
	}
	return item ?? null;
}

/**
 * Get multiple items by ID (fetches in parallel)
 */
export async function getItemsByIds(ids: string[]): Promise<Map<string, ItemNode>> {
	const results = new Map<string, ItemNode>();
	const uncachedIds = ids.filter(id => !itemCache.has(id));

	// Return cached items immediately
	for (const id of ids) {
		const cached = itemCache.get(id);
		if (cached) {
			results.set(id, cached);
		}
	}

	// Fetch uncached items in parallel
	if (uncachedIds.length > 0) {
		const fetched = await Promise.all(
			uncachedIds.map(async id => {
				const item = await getItemById(id);
				return { id, item };
			})
		);

		for (const { id, item } of fetched) {
			if (item) {
				results.set(id, item);
			}
		}
	}

	return results;
}

// ============================================================================
// LEGACY DATA ACCESS (kept for backward compatibility)
// ============================================================================

/**
 * Get all items (fetched at runtime, not bundled)
 * @deprecated Use getSearchIndex() for search or getItemById() for specific items
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
	searchIndexCache = null;
	itemIdsCache = null;
	itemCache = new Map();
	itemsCache = null;
	brandsCache = null;
	categoriesCache = null;
	seriesCache = null;
}
