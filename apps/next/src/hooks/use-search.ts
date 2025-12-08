'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebouncedValue, useDebouncedState } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { SearchOptions, SearchResult, SearchableItem } from '@/lib/search-index';
import { getSearchIndex, initializeSearchIndex } from '@/lib/search-index';
import { ShareableFilters } from '@/lib/url-compression';

interface UseSearchOptions extends SearchOptions {
  enableSuggestions?: boolean;
  suggestionLimit?: number;
  showNotifications?: boolean;
}

interface UseSearchReturn {
  // State
  query: string;
  results: SearchResult[];
  suggestions: string[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Filters
  filters: ShareableFilters;
  setFilters: (filters: Partial<ShareableFilters>) => void;
  resetFilters: () => void;

  // Actions
  search: (options?: Partial<SearchOptions>) => Promise<void>;
  clearSearch: () => void;
  getSuggestions: (input: string) => Promise<string[]>;

  // Stats
  totalResults: number;
  searchTime: number;

  // Popular searches and random items
  popularSearches: string[];
  getRandomItems: (category?: string, count?: number) => Promise<SearchResult[]>;
}

const DEFAULT_FILTERS: ShareableFilters = {
  brands: [],
  categories: [],
  grades: [],
  scales: [],
  series: [],
  status: [],
  availability: [],
  sort: { field: 'name', direction: 'asc' },
  page: 1,
  view: 'grid',
};

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    enableSuggestions = true,
    suggestionLimit = 10,
    showNotifications = true,
    ...searchOptions
  } = options;

  // State
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebouncedValue(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);

  // Filters with debounced state
  const [filters, setFilters] = useDebouncedState<ShareableFilters>(
    DEFAULT_FILTERS,
    200
  );

  // Search index instance
  const searchIndex = useMemo(() => getSearchIndex(), []);

  // Initialize search index
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        await initializeSearchIndex();
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize search';
        setError(errorMessage);
        if (showNotifications) {
          notifications.show({
            title: 'Search Error',
            message: errorMessage,
            color: 'red',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [showNotifications]);

  // Search function
  const search = useCallback(async (searchOptionsOverride?: Partial<SearchOptions>) => {
    if (!isInitialized) return;

    setIsLoading(true);
    setError(null);

    try {
      const startTime = performance.now();

      const options: SearchOptions = {
        query: debouncedQuery,
        ...filters,
        ...searchOptions,
        ...searchOptionsOverride,
      };

      // Combine query filters with current filters
      if (searchOptionsOverride?.query) {
        options.query = searchOptionsOverride.query;
      }

      const searchResults = searchIndex.search(options);

      const endTime = performance.now();
      setSearchTime(endTime - startTime);

      setResults(searchResults);

      // Update URL if there's a query or filters
      if (options.query || Object.keys(filters).some(key =>
        Array.isArray(filters[key as keyof ShareableFilters])
          ? (filters[key as keyof ShareableFilters] as any[]).length > 0
          : filters[key as keyof ShareableFilters]
      )) {
        const url = new URL(window.location.href);

        if (options.query) {
          url.searchParams.set('q', options.query);
        } else {
          url.searchParams.delete('q');
        }

        // Add filter parameters
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            url.searchParams.set(key, value.join(','));
          } else if (value && typeof value !== 'object') {
            url.searchParams.set(key, String(value));
          }
        });

        window.history.replaceState({}, '', url.toString());
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setResults([]);
      if (showNotifications) {
        notifications.show({
          title: 'Search Error',
          message: errorMessage,
          color: 'red',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, filters, isInitialized, searchIndex, showNotifications]);

  // Auto-search when query or filters change
  useEffect(() => {
    if (isInitialized) {
      search();
    }
  }, [debouncedQuery, filters, search, isInitialized]);

  // Get suggestions
  const getSuggestions = useCallback(async (input: string): Promise<string[]> => {
    if (!enableSuggestions || !isInitialized || input.length < 2) {
      return [];
    }

    try {
      const searchSuggestions = searchIndex.getSuggestions(input, suggestionLimit);
      setSuggestions(searchSuggestions);
      return searchSuggestions;
    } catch (err) {
      console.error('Failed to get suggestions:', err);
      return [];
    }
  }, [enableSuggestions, isInitialized, searchIndex, suggestionLimit]);

  // Update suggestions when query changes
  useEffect(() => {
    if (enableSuggestions && isInitialized) {
      getSuggestions(query);
    } else {
      setSuggestions([]);
    }
  }, [query, enableSuggestions, isInitialized, getSuggestions]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setFilters(DEFAULT_FILTERS);
    setError(null);
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ShareableFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, [setFilters]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, [setFilters]);

  // Get popular searches
  const popularSearches = useMemo(() => {
    if (!isInitialized) return [];
    return searchIndex.getPopularSearches();
  }, [isInitialized, searchIndex]);

  // Get random items
  const getRandomItems = useCallback(async (category?: string, count = 12) => {
    if (!isInitialized) return [];
    return searchIndex.getRandomItems(count, category);
  }, [isInitialized, searchIndex]);

  // Calculate total results
  const totalResults = results.length;

  return {
    // State
    query,
    results,
    suggestions,
    isLoading,
    isInitialized,
    error,

    // Filters
    filters,
    setFilters: updateFilters,
    resetFilters,

    // Actions
    search,
    clearSearch,
    getSuggestions,

    // Stats
    totalResults,
    searchTime,

    // Popular searches and random items
    popularSearches,
    getRandomItems,
  };
}

/**
 * Hook for searching within a specific category
 */
export function useCategorySearch(
  category: string,
  options?: Omit<UseSearchOptions, 'category'>
) {
  return useSearch({
    ...options,
    category,
  });
}

/**
 * Hook for quick search with minimal state
 */
export function useQuickSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery] = useDebouncedValue(query, 200);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const searchIndex = useMemo(() => getSearchIndex(), []);

  // Initialize
  useEffect(() => {
    initializeSearchIndex()
      .then(() => setIsInitialized(true))
      .catch(console.error);
  }, []);

  // Search
  useEffect(() => {
    if (!isInitialized || !debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = searchIndex.search({
        query: debouncedQuery,
        limit: 5,
        includeTypes: ['item'],
        threshold: 0.4,
      });
      setResults(searchResults);
    } catch (err) {
      console.error('Quick search failed:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, isInitialized, searchIndex]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isInitialized,
    clearSearch: () => {
      setQuery('');
      setResults([]);
    },
  };
}

export default useSearch;