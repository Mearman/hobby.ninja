import React, { useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import { ItemNode } from './schemas';
import { getAllItems } from './graph-data';

// Define search result type
export interface SearchResult {
  item: ItemNode;
  score: number;
}

// Fuse.js configuration
const fuseOptions: Fuse.IFuseOptions<ItemNode> = {
  keys: [
    { name: 'name', weight: 0.4 },
    { name: 'brand', weight: 0.2 },
    { name: 'series', weight: 0.2 },
    { name: 'category', weight: 0.1 },
    { name: 'description', weight: 0.05 },
    { name: 'grade', weight: 0.03 },
    { name: 'scale', weight: 0.02 },
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
      // Load data for static export
      this.data = await getAllItems();
      this.fuse = new Fuse(this.data, fuseOptions);
    } catch (error) {
      console.error('Failed to initialize search:', error);
      // Fallback to empty data
      this.data = [];
      this.fuse = new Fuse([], fuseOptions);
    }
  }

  search(query: string, options?: SearchOptions): SearchResult[] {
    if (!this.fuse || !query.trim()) {
      return [];
    }

    const searchOptions: Fuse.IFuseOptions<ItemNode> = {
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
  getSuggestions(query: string, limit: number = 5): string[] {
    if (query.length < 2 || !this.fuse) return [];

    const results = this.search(query, { limit: limit * 2 });
    const suggestions = new Set<string>();

    results.forEach(result => {
      // Add name suggestions
      if (result.item.name?.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(result.item.name);
      }

      // Add brand suggestions
      if (result.item.brand && result.item.brand.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(result.item.brand);
      }

      // Add series suggestions
      if (result.item.series && result.item.series.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(result.item.series);
      }

      // Add grade suggestions
      if (result.item.grade && result.item.grade.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(result.item.grade);
      }
    });

    return Array.from(suggestions)
      .filter(suggestion => suggestion !== query)
      .slice(0, limit);
  }

  // Advanced search with filters
  advancedSearch(query: string, filters: SearchFilters): SearchResult[] {
    let results = this.search(query);

    // Apply filters
    if (filters.brands?.length) {
      results = results.filter(result =>
        filters.brands!.includes(result.item.brand || '')
      );
    }

    if (filters.categories?.length) {
      results = results.filter(result =>
        filters.categories!.includes(result.item.category || '')
      );
    }

    if (filters.series?.length) {
      results = results.filter(result =>
        filters.series!.includes(result.item.series || '')
      );
    }

    if (filters.grades?.length) {
      results = results.filter(result =>
        filters.grades!.includes(result.item.grade || '')
      );
    }

    if (filters.scales?.length) {
      results = results.filter(result =>
        filters.scales!.includes(result.item.scale || '')
      );
    }

    if (filters.minPrice !== undefined) {
      results = results.filter(result =>
        (result.item.price || 0) >= filters.minPrice!
      );
    }

    if (filters.maxPrice !== undefined) {
      results = results.filter(result =>
        (result.item.price || 0) <= filters.maxPrice!
      );
    }

    if (filters.minYear !== undefined) {
      results = results.filter(result =>
        (result.item.year || 0) >= filters.minYear!
      );
    }

    if (filters.maxYear !== undefined) {
      results = results.filter(result =>
        (result.item.year || 0) <= filters.maxYear!
      );
    }

    return results;
  }

  // Get statistics
  getStats(): SearchStats {
    return {
      totalItems: this.data.length,
      brands: [...new Set(this.data.map(item => item.brand).filter(Boolean))],
      categories: [...new Set(this.data.map(item => item.category).filter(Boolean))],
      series: [...new Set(this.data.map(item => item.series).filter(Boolean))],
      grades: [...new Set(this.data.map(item => item.grade).filter(Boolean))],
      scales: [...new Set(this.data.map(item => item.scale).filter(Boolean))],
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