import Fuse from "fuse.js";
import type { FuseResult, IFuseOptions } from "fuse.js";
import { useCallback, useMemo } from "react";

import { getClientItems } from "./client-data";
import { ItemNode, getNodeDisplayName, getNodeReleaseYear } from "./schemas";

// Define search result type
export interface SearchResult {
  item: ItemNode;
  score: number;
}

// Helper function to extract text from localized name
function extractText(name: string | { ja: string; en?: string } | undefined): string {
	if (!name) return "";
	if (typeof name === "string") return name;
	return name.en || name.ja;
}

// Fuse.js configuration
const fuseOptions: IFuseOptions<ItemNode> = {
	keys: [
		{ name: "name", weight: 0.4 },
		{ name: "brand", weight: 0.2 },
		{ name: "series", weight: 0.2 },
		{ name: "category", weight: 0.1 },
		{ name: "description", weight: 0.05 },
		{ name: "grade", weight: 0.03 },
		{ name: "scale", weight: 0.02 },
	],
	threshold: 0.4,
	includeScore: true,
	minMatchCharLength: 2,
};

class SearchService {
	private fuse: Fuse<ItemNode> | null = null;
	private data: ItemNode[] = [];

	async initialize() {
		try {
			// Load data via fetch (not bundled in JS)
			// Service worker caches this for offline support
			this.data = await getClientItems();
			this.fuse = new Fuse(this.data, fuseOptions);
		} catch (error) {
			console.error("Failed to initialize search:", error);
			// Fallback to empty data
			this.data = [];
			this.fuse = new Fuse([], fuseOptions);
		}
	}

	search(query: string, options?: SearchOptions): SearchResult[] {
		if (!this.fuse || !query.trim()) {
			return [];
		}

		const searchOptions: IFuseOptions<ItemNode> = {
			...fuseOptions,
			...(options?.threshold && { threshold: options.threshold }),
			...(options?.keys && { keys: options.keys }),
		};

		// Create temporary Fuse instance for custom options
		const fuse = options?.keys || options?.threshold
			? new Fuse(this.data, searchOptions)
			: this.fuse;

		const results = fuse.search(query);

		return results
			.slice(0, options?.limit || 50)
			.map(result => ({
				item: result.item,
				score: result.score || 0,
			}));
	}

	// Get suggestions based on current query
	getSuggestions(query: string, limit = 5): string[] {
		if (query.length < 2 || !this.fuse) return [];

		const results = this.search(query, { limit: limit * 2 });
		const suggestions = new Set<string>();
		const queryLower = query.toLowerCase();

		for (const result of results) {
			// Add name suggestions
			const itemName = extractText(result.item.name);
			if (itemName.toLowerCase().includes(queryLower)) {
				suggestions.add(itemName);
			}

			// Add brand suggestions
			const brand = result.item.brand;
			if (brand?.toLowerCase().includes(queryLower)) {
				suggestions.add(brand);
			}

			// Add series suggestions
			const series = result.item.series;
			if (series?.toLowerCase().includes(queryLower)) {
				suggestions.add(series);
			}

			// Add grade suggestions
			const grade = result.item.grade;
			if (grade?.toLowerCase().includes(queryLower)) {
				suggestions.add(grade);
			}
		}

		return [...suggestions]
			.filter(suggestion => suggestion !== query)
			.slice(0, limit);
	}

	// Advanced search with filters
	advancedSearch(query: string, filters: SearchFilters): SearchResult[] {
		let results = this.search(query);

		// Apply filters
		if (filters.brands?.length) {
			results = results.filter(result =>
        filters.brands!.includes(result.item.brand || ""),
			);
		}

		if (filters.categories?.length) {
			results = results.filter(result =>
        filters.categories!.includes(result.item.category || ""),
			);
		}

		if (filters.series?.length) {
			results = results.filter(result =>
        filters.series!.includes(result.item.series || ""),
			);
		}

		if (filters.grades?.length) {
			results = results.filter(result =>
        filters.grades!.includes(result.item.grade || ""),
			);
		}

		if (filters.scales?.length) {
			results = results.filter(result =>
        filters.scales!.includes(result.item.scale || ""),
			);
		}

		if (filters.minPrice !== undefined) {
			results = results.filter(result =>
				(result.item.price?.amount || 0) >= filters.minPrice!,
			);
		}

		if (filters.maxPrice !== undefined) {
			results = results.filter(result =>
				(result.item.price?.amount || 0) <= filters.maxPrice!,
			);
		}

		if (filters.minYear !== undefined) {
			results = results.filter(result =>
				(getNodeReleaseYear(result.item) || 0) >= filters.minYear!,
			);
		}

		if (filters.maxYear !== undefined) {
			results = results.filter(result =>
				(getNodeReleaseYear(result.item) || 0) <= filters.maxYear!,
			);
		}

		return results;
	}

	// Get statistics
	getStats(): SearchStats {
		return {
			totalItems: this.data.length,
			brands: [...new Set(this.data.map(item => item.brand).filter((brand): brand is string => Boolean(brand)))],
			categories: [...new Set(this.data.map(item => item.category).filter((category): category is string => Boolean(category)))],
			series: [...new Set(this.data.map(item => item.series).filter((series): series is string => Boolean(series)))],
			grades: [...new Set(this.data.map(item => item.grade).filter((grade): grade is string => Boolean(grade)))],
			scales: [...new Set(this.data.map(item => item.scale).filter((scale): scale is string => Boolean(scale)))],
		};
	}
}

// Export singleton instance
export const searchService = new SearchService();

// Search options interface
export interface SearchOptions {
  limit?: number;
  threshold?: number;
  keys?: string[];
}

// Advanced search filters interface
export interface SearchFilters {
  brands?: string[];
  categories?: string[];
  series?: string[];
  grades?: string[];
  scales?: string[];
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
}

// Search stats interface
export interface SearchStats {
  totalItems: number;
  brands: string[];
  categories: string[];
  series: string[];
  grades: string[];
  scales: string[];
}

// Export hook for React components
export function useSearch() {
	const search = useCallback((query: string, options?: SearchOptions) => searchService.search(query, options), []);
	const getSuggestions = useCallback((query: string, limit?: number) => searchService.getSuggestions(query, limit), []);
	const advancedSearch = useCallback((query: string, filters: SearchFilters) => searchService.advancedSearch(query, filters), []);
	const getStats = useCallback((): SearchStats => searchService.getStats(), []);

	return useMemo(() => ({
		isInitialized: true, // This is handled by SearchProvider
		search,
		getSuggestions,
		advancedSearch,
		getStats,
	}), [search, getSuggestions, advancedSearch, getStats]);
}