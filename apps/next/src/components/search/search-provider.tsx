"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import { searchService } from "@/lib/fuse-search";

interface SearchContextType {
  isInitialized: boolean;
  error: string | null;
}

const SearchContext = createContext<SearchContextType>({
	isInitialized: false,
	error: null,
});

export function useSearchProvider(): SearchContextType {
	const context = useContext(SearchContext);
	if (!context) {
		throw new Error("useSearchProvider must be used within a SearchProvider");
	}
	return context;
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
			} catch (error_) {
				console.error("Failed to initialize search:", error_);
				setError(error_ instanceof Error ? error_.message : "Failed to initialize search");
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