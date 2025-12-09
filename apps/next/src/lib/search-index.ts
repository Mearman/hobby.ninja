import Fuse, { type IFuseOptions } from "fuse.js";

import { getAllItems, getAllBrands, getAllCategories, getAllSeries } from "@/lib/graph-data";
import { PAGINATION, FILTER } from "./constants";
import {
	ItemNodeSchema,
	BrandNodeSchema,
	CategoryNodeSchema,
	SeriesNodeSchema,
	LocalizedDescriptionSchema,
	ManualSchema,
	type ItemNode,
	type BrandNode,
	type CategoryNode,
	type SeriesNode,
} from "@/lib/schemas";

// Helper function to extract string from localized text
function getLocalizedString(text: string | { ja: string; en?: string } | undefined): string {
	if (!text) return "";
	if (typeof text === "string") return text;
	return text.ja ?? text.en ?? "";
}

// Helper function to extract string from localized description array using Zod validation
function getLocalizedDescription(desc: unknown): string {
	// Use Zod to validate the description structure
	const descResult = LocalizedDescriptionSchema.safeParse(desc);
	if (!descResult.success) return "";

	const validatedDesc = descResult.data;
	return validatedDesc.map(d => d.ja ?? d.en).join(" ");
}

// Helper function to extract manual identifier using Zod validation
function getManualId(manuals: unknown): string | undefined {
	// Use Zod to validate the manuals structure
	const manualsResult = ItemNodeSchema.shape.manuals.safeParse(manuals);
	if (!manualsResult.success || !manualsResult.data || manualsResult.data.length === 0) return undefined;

	const validatedManuals = manualsResult.data;
	const manual = validatedManuals[0];
	if (typeof manual === "string") return manual;

	// Use Zod to validate the individual manual structure
	const manualResult = ManualSchema.safeParse(manual);
	if (!manualResult.success) return undefined;

	const validatedManual = manualResult.data;
	if (typeof validatedManual === "string") return validatedManual;
	return validatedManual.id;
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
  releaseDate?: string;
  manual?: string;
  type: "item" | "brand" | "category" | "series";
  originalData: ItemNode | BrandNode | CategoryNode | SeriesNode;
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
  matches?: readonly any[] | undefined;
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
		this.allItems = [];
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

		this.itemFuse = new Fuse([], this.baseFuseOptions);
	}

	/**
   * Initialize the search index with all data
   */
	async initialize(): Promise<void> {
		console.time("SearchIndex initialization");

		try {
			// Load all data in parallel
			const [items, brands, categories, seriesData] = await Promise.all([
				getAllItems(),
				getAllBrands(),
				getAllCategories(),
				getAllSeries(),
			]);

			// Process items
			const searchableItems: SearchableItem[] = [];

			// Add items with Zod validation
			for (const item of items) {
				// Validate with Zod schema
				const validationResult = ItemNodeSchema.safeParse(item);
				if (!validationResult.success) {
					console.warn(`Invalid item data for item ${item?.id}:`, validationResult.error);
					continue;
				}

				const validatedItem = validationResult.data;
				if (!validatedItem?.name) continue;

				const searchableItem: SearchableItem = {
					id: validatedItem.id,
					name: getLocalizedString(validatedItem.name),
					japaneseName: getLocalizedString(validatedItem.name),
					description: getLocalizedDescription(validatedItem.description),
					brand: validatedItem.brand,
					category: validatedItem.category,
					series: validatedItem.series,
					grade: validatedItem.grade,
					scale: validatedItem.scale,
					price: validatedItem.price?.amount,
					releaseDate: validatedItem.releaseDate?.ja,
					manual: getManualId(validatedItem.manuals),
					type: "item",
					originalData: validatedItem,
				};

				searchableItems.push(searchableItem);

				// Build filter sets
				if (validatedItem.category) this.categories.add(validatedItem.category);
				if (validatedItem.brand) this.brands.add(validatedItem.brand);
				if (validatedItem.grade) this.grades.add(validatedItem.grade);
				if (validatedItem.scale) this.scales.add(validatedItem.scale);
				if (validatedItem.series) this.series.add(validatedItem.series);
			}

			// Add brands with Zod validation
			for (const brand of brands) {
				const validationResult = BrandNodeSchema.safeParse(brand);
				if (!validationResult.success) {
					console.warn(`Invalid brand data for brand ${brand?.id}:`, validationResult.error);
					continue;
				}

				const validatedBrand = validationResult.data;
				if (!validatedBrand?.name) continue;

				searchableItems.push({
					id: validatedBrand.id,
					name: getLocalizedString(validatedBrand.name),
					description: validatedBrand.description,
					type: "brand",
					originalData: validatedBrand,
				});

				this.brands.add(getLocalizedString(validatedBrand.name));
			}

			// Add categories with Zod validation
			for (const category of categories) {
				const validationResult = CategoryNodeSchema.safeParse(category);
				if (!validationResult.success) {
					console.warn(`Invalid category data for category ${category?.id}:`, validationResult.error);
					continue;
				}

				const validatedCategory = validationResult.data;
				if (!validatedCategory?.name) continue;

				searchableItems.push({
					id: validatedCategory.id,
					name: getLocalizedString(validatedCategory.name),
					description: validatedCategory.description,
					type: "category",
					originalData: validatedCategory,
				});

				this.categories.add(getLocalizedString(validatedCategory.name));
			}

			// Add series with Zod validation
			for (const series of seriesData) {
				const validationResult = SeriesNodeSchema.safeParse(series);
				if (!validationResult.success) {
					console.warn(`Invalid series data for series ${series?.id}:`, validationResult.error);
					continue;
				}

				const validatedSeries = validationResult.data;
				if (!validatedSeries?.name) continue;

				searchableItems.push({
					id: validatedSeries.id,
					name: getLocalizedString(validatedSeries.name),
					description: validatedSeries.description,
					type: "series",
					originalData: validatedSeries,
				});
				this.series.add(getLocalizedString(validatedSeries.name));
			}

			this.allItems = searchableItems;
			this.itemFuse.setCollection(searchableItems);

			console.log(`Search index initialized with ${searchableItems.length} items`);
			console.log(`Categories: ${this.categories.size}, Brands: ${this.brands.size}, Grades: ${this.grades.size}, Scales: ${this.scales.size}, Series: ${this.series.size}`);
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
				.map(item => ({ item, score: 0 } as SearchResult))
				.sort((a, b) => a.item.name.localeCompare(b.item.name))
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
		if (!query?.trim() || query.length < 2) return [];

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
			categories: [...this.categories].sort(),
			brands: [...this.brands].sort(),
			grades: [...this.grades].sort(),
			scales: [...this.scales].sort(),
			series: [...this.series].sort(),
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
		const shuffled = [...pool].sort(() => Math.random() - 0.5);
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
	if (!searchIndexInstance) {
		searchIndexInstance = new SearchIndex();
	}
	return searchIndexInstance;
}

export async function initializeSearchIndex(): Promise<SearchIndex> {
	const index = getSearchIndex();
	await index.initialize();
	return index;
}

export default SearchIndex;