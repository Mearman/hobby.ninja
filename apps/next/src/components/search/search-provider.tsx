"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { searchService } from '@/lib/fuse-search';

interface SearchContextType {
  isInitialized: boolean;
  error: string | null;
}

const SearchContext = createContext<SearchContextType>({
  isInitialized: false,
  error: null,
});

export function useSearchProvider() {
  return useContext(SearchContext);
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSearch = async () => {
      try {
        setError(null);
        await searchService.initialize();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize search:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize search');
      }
    };

    initializeSearch();
  }, []);

  return (
    <SearchContext.Provider value={{ isInitialized, error }}>
      {children}
    </SearchContext.Provider>
  );
}