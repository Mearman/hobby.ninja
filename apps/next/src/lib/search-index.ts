import { getNodePrimaryGrade, getNodeAllGrades } from "@hobby-ninja/data";
import { brandsList, type Brand } from "@hobby-ninja/data/brands";
import { categoriesList, type Category } from "@hobby-ninja/data/categories";
import { getItemById } from "@hobby-ninja/data/items";
import { searchRecords } from "@hobby-ninja/data/search";
import { seriesList, type Series } from "@hobby-ninja/data/series";
import Fuse, { type IFuseOptions, type FuseResult } from "fuse.js";

import { PAGINATION, FILTER } from "./constants";


// Helper function to extract string from localized text
function getLocalizedString(text: string | { ja: string; en?: string } | undefined): string {
	if (!text) return "";
	if (typeof text === "string") return text;
	return text.ja;
}

export interface SearchableItem {
  id: string;
  name: string;
  japaneseName?: string;
  description?: string;
  brand?: string;
  category?: string;
  series?: string;
  grade?: string;
  scale?: string;
  price?: number;
  releaseYear?: number;
  type: "item" | "brand" | "category" | "series";
  // originalData is only available for brand/category/series (not items to save memory)
  originalData?: Brand | Category | Series;
}

export interface SearchOptions {
  query?: string;
  category?: string;
  brands?: string[];
  grades?: string[];
  scales?: string[];
  series?: string[];
  priceRange?: { min: number; max: number };
  includeTypes?: Array<"item" | "brand" | "category" | "series">;
  limit?: number;
  threshold?: number;
}

export interface SearchResult {
  item: SearchableItem;
  score: number;
  matches?: FuseResult<SearchableItem>["matches"] | undefined;
}

export class SearchIndex {
	private itemFuse: Fuse<SearchableItem>;
	private allItems: SearchableItem[];
	private categories: Set<string>;
	private brands: Set<string>;
	private grades: Set<string>;
	private scales: Set<string>;
	private series: Set<string>;
	private baseFuseOptions: IFuseOptions<SearchableItem>;

	constructor() {
		this.categories = new Set();
		this.brands = new Set();
		this.grades = new Set();
		this.scales = new Set();
		this.series = new Set();

		// Configure Fuse.js options for optimal performance and relevance
		this.baseFuseOptions = {
			keys: [
				{ name: "name", weight: 0.4 },
				{ name: "japaneseName", weight: 0.3 },
				{ name: "description", weight: 0.1 },
				{ name: "brand", weight: 0.1 },
				{ name: "category", weight: FILTER.FUZZY_THRESHOLD },
				{ name: "series", weight: FILTER.FUZZY_THRESHOLD },
			],
			threshold: 0.3,
			includeScore: true,
			includeMatches: true,
			minMatchCharLength: 2,
			ignoreLocation: true,
			shouldSort: true,
			findAllMatches: false,
			distance: FILTER.FUZZY_SEARCH_DISTANCE,
		};

		// Initialize data synchronously from imports
		this.allItems = this.buildSearchableItems();
		this.itemFuse = new Fuse(this.allItems, this.baseFuseOptions);
	}

	/**
	 * Build searchable items from imported data
	 */
	private buildSearchableItems(): SearchableItem[] {
		console.time("SearchIndex initialization");
		const searchableItems: SearchableItem[] = [];

		try {
			// Process items from search records
			for (const record of searchRecords) {
				if (!record.name) continue;

				// Get full item data for grade, scale, price, releaseYear
				const fullItem = getItemById(record.id);

				const searchableItem: SearchableItem = {
					id: record.id,
					name: getLocalizedString(record.name),
					japaneseName: getLocalizedString(record.nameJa),
					brand: record.brand,
					category: record.category,
					series: record.series,
					grade: fullItem ? getNodePrimaryGrade(fullItem) ?? undefined : undefined,
					scale: fullItem?.scales[0],
					price: fullItem?.price?.amount ?? undefined,
					releaseYear: fullItem?.releaseDate?.year ?? undefined,
					type: "item",
					// No originalData for items - use getItemById() if full data needed
				};

				searchableItems.push(searchableItem);

				// Build filter sets
				if (record.category) this.categories.add(record.category);
				if (record.brand) this.brands.add(record.brand);
				// Collect all grades (root and specific) from hierarchical structure
				if (fullItem) {
					for (const grade of getNodeAllGrades(fullItem)) {
						this.grades.add(grade);
					}
				}
				if (fullItem) {
					for (const scale of fullItem.scales) {
						this.scales.add(scale);
					}
				}
				if (record.series) this.series.add(record.series);
			}

			// Add brands
			for (const brand of brandsList) {
				if (!brand.name) continue;

				searchableItems.push({
					id: brand.id,
					name: getLocalizedString(brand.name),
					description: brand.description,
					type: "brand",
					originalData: brand,
				});

				this.brands.add(getLocalizedString(brand.name));
			}

			// Add categories
			for (const category of categoriesList) {
				if (!category.name) continue;

				searchableItems.push({
					id: category.id,
					name: getLocalizedString(category.name),
					description: category.description,
					type: "category",
					originalData: category,
				});

				this.categories.add(getLocalizedString(category.name));
			}

			// Add series
			for (const series of seriesList) {
				if (!series.name) continue;

				searchableItems.push({
					id: series.id,
					name: getLocalizedString(series.name),
					description: series.description,
					type: "series",
					originalData: series,
				});

				this.series.add(getLocalizedString(series.name));
			}

			console.log(`Search index initialized with ${searchableItems.length} items`);
			console.log(`Categories: ${this.categories.size}, Brands: ${this.brands.size}, Grades: ${this.grades.size}, Scales: ${this.scales.size}, Series: ${this.series.size}`);

			return searchableItems;
		} catch (error) {
			console.error("Failed to initialize search index:", error);
			throw error;
		} finally {
			console.timeEnd("SearchIndex initialization");
		}
	}


	/**
   * Perform search with filters
   */
	search(options: SearchOptions): SearchResult[] {
		const {
			query,
			category,
			brands,
			grades,
			scales,
			series,
			priceRange,
			includeTypes = ["item"],
			limit = PAGINATION.DEFAULT_SEARCH_LIMIT,
			threshold = 0.3,
		} = options;

		// First apply type and category filters
		const filteredItems = this.allItems.filter(item => {
			// Filter by type
			if (!includeTypes.includes(item.type)) return false;

			// Filter by category
			if (category && item.category !== category) return false;

			// Filter by brands
			if (brands?.length && (!item.brand || !brands.includes(item.brand))) return false;

			// Filter by grades
			if (grades?.length && (!item.grade || !grades.includes(item.grade))) return false;

			// Filter by scales
			if (scales?.length && (!item.scale || !scales.includes(item.scale))) return false;

			// Filter by series
			if (series?.length && (!item.series || !series.includes(item.series))) return false;

			// Filter by price range
			if (priceRange) {
				if (!item.price) return false;
				if (priceRange.min > 0 && item.price < priceRange.min) return false;
				if (priceRange.max < Infinity && item.price > priceRange.max) return false;
			}

			return true;
		});

		// If no query, return filtered items sorted by relevance (name)
		if (!query?.trim()) {
			const results = filteredItems
				.map(item => ({ item, score: 0 }) satisfies SearchResult)
				.toSorted((a, b) => a.item.name.localeCompare(b.item.name))
				.slice(0, limit);

			return results;
		}

		// Apply text search with Fuse
		const fuseOptions: IFuseOptions<SearchableItem> = {
			...this.baseFuseOptions,
			threshold: threshold,
		};

		const tempFuse = new Fuse(filteredItems, fuseOptions);
		const fuseResults = tempFuse.search(query.trim());

		return fuseResults
			.map(result => ({
				item: result.item,
				score: result.score ?? 0,
				matches: result.matches,
			}))
			.slice(0, limit);
	}

	/**
   * Get suggestions for autocomplete
   */
	getSuggestions(query: string, limit: number = PAGINATION.DEFAULT_SUGGESTION_LIMIT): string[] {
		if (!query.trim() || query.length < 2) return [];

		const results = this.search({
			query,
			includeTypes: ["item", "brand", "category", "series"],
			limit,
			threshold: 0.4,
		});

		return results.map(result => result.item.name);
	}

	/**
   * Get popular searches (could be enhanced with analytics)
   */
	getPopularSearches(): string[] {
		// Return some popular categories and brands as suggestions
		return [
			"HG",
			"MG",
			"PG",
			"RG",
			"SD",
			"Gundam",
			" Unicorn",
			" Strike Freedom",
			" Build Fighters",
			"HGUC",
		];
	}

	/**
   * Get filter options
   */
	getFilterOptions() {
		return {
			categories: [...this.categories].toSorted(),
			brands: [...this.brands].toSorted(),
			grades: [...this.grades].toSorted(),
			scales: [...this.scales].toSorted(),
			series: [...this.series].toSorted(),
		};
	}

	/**
   * Get items by category
   */
	getItemsByCategory(category: string, limit = PAGINATION.DEFAULT_SEARCH_LIMIT): SearchResult[] {
		return this.search({ category, limit });
	}

	/**
   * Get items by brand
   */
	getItemsByBrand(brand: string, limit = PAGINATION.DEFAULT_SEARCH_LIMIT): SearchResult[] {
		return this.search({ brands: [brand], limit });
	}

	/**
   * Get related items based on brand, series, or category
   */
	getRelatedItems(itemId: string, limit = PAGINATION.DEFAULT_SUGGESTION_LIMIT): SearchResult[] {
		const targetItem = this.allItems.find(item => item.id === itemId);
		if (!targetItem) return [];

		const filters: SearchOptions = {
			limit,
			threshold: 0.4,
		};

		if (targetItem.brand) {
			filters.brands = [targetItem.brand];
		}

		if (targetItem.series) {
			filters.series = [targetItem.series];
		}

		const results = this.search(filters);

		// Exclude the original item from results
		return results.filter(result => result.item.id !== itemId);
	}

	/**
   * Get random items for discovery
   */
	getRandomItems(count: number = PAGINATION.RANDOM_ITEMS_COUNT, category?: string): SearchResult[] {
		const pool = category ?
			this.allItems.filter(item => item.category === category) :
			this.allItems.filter(item => item.type === "item");

		// Randomly sample items
		const shuffled = [...pool].toSorted(() => Math.random() - 0.5);
		const selected = shuffled.slice(0, count);

		return selected.map(item => ({
			item,
			score: 0,
		}));
	}

	/**
   * Get statistics
   */
	getStats() {
		const itemsByCategory: Record<string, number> = {};
		const itemsByBrand: Record<string, number> = {};

		for (const item of this.allItems
			.filter(item => item.type === "item")) {
			if (item.category) {
				itemsByCategory[item.category] = (itemsByCategory[item.category] ?? 0) + 1;
			}
			if (item.brand) {
				itemsByBrand[item.brand] = (itemsByBrand[item.brand] ?? 0) + 1;
			}
		}

		return {
			totalItems: this.allItems.filter(item => item.type === "item").length,
			totalBrands: this.brands.size,
			totalCategories: this.categories.size,
			totalSeries: this.series.size,
			itemsByCategory,
			itemsByBrand,
		};
	}
}

// Create singleton instance
let searchIndexInstance: SearchIndex | null = null;

export function getSearchIndex(): SearchIndex {
	searchIndexInstance ??= new SearchIndex();
	return searchIndexInstance;
}

// Deprecated: No longer needed as data is loaded synchronously
export function initializeSearchIndex(): SearchIndex {
	return getSearchIndex();
}