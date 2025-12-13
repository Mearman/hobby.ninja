import { useCallback, useMemo } from "react";

import {
	search as dataSearch,
	searchRecords,
	getSearchInstance,
	type SearchRecord,
} from "@hobby-ninja/data/search";
import { getItemById } from "@hobby-ninja/data/items";

// Re-export SearchRecord as SearchIndexItem for compatibility
export type SearchIndexItem = SearchRecord;

// Define search result type
export interface SearchResult {
	item: SearchRecord;
	score: number;
}

// Helper function to extract text from name
function extractText(name: string | undefined): string {
	return name ?? "";
}

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

class SearchService {
	private initialized = false;

	initialize() {
		// Pre-built index is already loaded via import
		// Just mark as initialized
		this.initialized = true;
	}

	search(query: string, options?: SearchOptions): SearchResult[] {
		if (!query.trim()) {
			return [];
		}

		const results = dataSearch(query, options?.limit ?? 50);

		return results.map(result => ({
			item: result.item,
			score: result.score ?? 0,
		}));
	}

	// Get suggestions based on current query
	getSuggestions(query: string, limit = 5): string[] {
		if (query.length < 2) return [];

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
		}

		return [...suggestions]
			.filter(suggestion => suggestion !== query)
			.slice(0, limit);
	}

	// Advanced search with filters
	advancedSearch(query: string, filters: SearchFilters): SearchResult[] {
		let results = this.search(query, { limit: 200 });

		// Apply filters using search record fields
		if (filters.brands?.length) {
			results = results.filter(result =>
				filters.brands!.includes(result.item.brand ?? ""),
			);
		}

		if (filters.categories?.length) {
			results = results.filter(result =>
				filters.categories!.includes(result.item.category ?? ""),
			);
		}

		if (filters.series?.length) {
			results = results.filter(result =>
				filters.series!.includes(result.item.series ?? ""),
			);
		}

		// For grade/scale/price/year filters, look up full item data
		if (filters.grades?.length || filters.scales?.length ||
			filters.minPrice !== undefined || filters.maxPrice !== undefined ||
			filters.minYear !== undefined || filters.maxYear !== undefined) {
			results = results.filter(result => {
				const item = getItemById(result.item.id);
				if (!item) return false;

				if (filters.grades?.length) {
					// Item has grade as a direct string field
					if (!item.grade || !filters.grades.includes(item.grade)) return false;
				}

				if (filters.scales?.length) {
					if (!filters.scales.includes(item.scale ?? "")) return false;
				}

				if (filters.minPrice !== undefined) {
					if ((item.price?.amount ?? 0) < filters.minPrice) return false;
				}

				if (filters.maxPrice !== undefined) {
					if ((item.price?.amount ?? 0) > filters.maxPrice) return false;
				}

				if (filters.minYear !== undefined) {
					if ((item.releaseDate?.year ?? 0) < filters.minYear) return false;
				}

				if (filters.maxYear !== undefined) {
					if ((item.releaseDate?.year ?? 0) > filters.maxYear) return false;
				}

				return true;
			});
		}

		return results;
	}

	// Get statistics
	getStats(): SearchStats {
		const brands = new Set<string>();
		const categories = new Set<string>();
		const series = new Set<string>();
		const grades = new Set<string>();
		const scales = new Set<string>();

		for (const record of searchRecords) {
			if (record.brand) brands.add(record.brand);
			if (record.category) categories.add(record.category);
			if (record.series) series.add(record.series);
		}

		// For grades and scales, we need to look at full item data
		// This is expensive but only done once for stats
		for (const record of searchRecords) {
			const item = getItemById(record.id);
			if (item) {
				if (item.scale) scales.add(item.scale);
				if (item.grade) grades.add(item.grade);
			}
		}

		return {
			totalItems: searchRecords.length,
			brands: [...brands],
			categories: [...categories],
			series: [...series],
			grades: [...grades],
			scales: [...scales],
		};
	}
}

// Export singleton instance
export const searchService = new SearchService();

// Export hook for React components
export function useSearch() {
	const search = useCallback((query: string, options?: SearchOptions) => searchService.search(query, options), []);
	const getSuggestions = useCallback((query: string, limit?: number) => searchService.getSuggestions(query, limit), []);
	const advancedSearch = useCallback((query: string, filters: SearchFilters) => searchService.advancedSearch(query, filters), []);
	const getStats = useCallback((): SearchStats => searchService.getStats(), []);

	return useMemo(() => ({
		isInitialized: true,
		search,
		getSuggestions,
		advancedSearch,
		getStats,
	}), [search, getSuggestions, advancedSearch, getStats]);
}

// Re-export for compatibility
export { searchRecords, getSearchInstance };
