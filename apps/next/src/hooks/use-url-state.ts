"use client";

import { debounce } from "lodash-es";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

import { TIMING } from "@/lib/constants";
import UrlCompression, { type ShareableFilters } from "@/lib/url-compression";

interface UrlStateOptions {
  debounceMs?: number;
  syncToUrl?: boolean;
  persistAcrossSessions?: boolean;
}

interface UseUrlStateReturn<T> {
  state: T;
  setState: (state: T | ((prev: T) => T)) => void;
  resetState: () => void;
  shareUrl: () => string;
  isValidUrl: boolean;
}

/**
 * Hook for managing URL state with compression and sharing capabilities
 */
export function useUrlState<T extends Record<string, unknown>>(
	defaultState: T,
	options: UrlStateOptions = {},
): UseUrlStateReturn<T> {
	const {
		debounceMs = TIMING.DEBOUNCE_DEFAULT,
		syncToUrl = true,
		persistAcrossSessions = false,
	} = options;

	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	// Initialize state from URL or default
	const [state, setStateInternal] = useState<T>(() => {
		try {
			// Try to get state from URL parameters
			const urlState: Partial<T> = {};

			// Check for compressed data in special URL format
			const pathnameMatch = /\/database\/share\/(.+)$/.exec(pathname);
			if (pathnameMatch) {
				try {
					return UrlCompression.decompress<ShareableFilters>(pathnameMatch[1]) as unknown as T;
				} catch (error) {
					console.warn("Failed to decompress URL state:", error);
				}
			}

			// Parse regular URL parameters
			for (const [key, value] of searchParams.entries()) {
				try {
					// Try to parse as JSON first (for arrays/objects)
					const parsed = JSON.parse(decodeURIComponent(value));
					urlState[key as keyof T] = parsed;
				} catch {
					// Fallback to string value
					urlState[key as keyof T] = decodeURIComponent(value) as any;
				}
			}

			// Merge with default state
			return { ...defaultState, ...urlState };
		} catch (error) {
			console.error("Error parsing URL state:", error);
			return defaultState;
		}
	});

	// Create debounced function to update URL
	const updateUrl = useCallback(
		debounce((newState: T) => {
			if (!syncToUrl) return;

			try {
				const params = new URLSearchParams();

				// Add state parameters to URL
				for (const [key, value] of Object.entries(newState)) {
					if (value === undefined || value === null) continue;

					if (typeof value === "object") {
						params.set(key, encodeURIComponent(JSON.stringify(value)));
					} else {
						params.set(key, encodeURIComponent(String(value)));
					}
				}

				// Build new URL
				const queryString = params.toString();
				const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

				// Update URL without triggering navigation
				router.replace(newUrl, { scroll: false });

				// Persist to localStorage if enabled
				if (persistAcrossSessions) {
					localStorage.setItem(`url-state-${pathname}`, JSON.stringify(newState));
				}
			} catch (error) {
				console.error("Error updating URL state:", error);
			}
		}, debounceMs),
		[pathname, router, syncToUrl, persistAcrossSessions, debounceMs],
	);

	// Update state and sync to URL
	const setState = useCallback((newState: T | ((prev: T) => T)) => {
		setStateInternal(prev => {
			const updatedState = typeof newState === "function"
				? (newState as (prev: T) => T)(prev)
				: newState;

			updateUrl(updatedState);
			return updatedState;
		});
	}, [updateUrl]);

	// Reset state to defaults
	const resetState = useCallback(() => {
		setState(defaultState);
	}, [setState, defaultState]);

	// Create shareable URL
	const shareUrl = useCallback(() => {
		try {
			return UrlCompression.createFiltersUrl(state as ShareableFilters);
		} catch (error) {
			console.error("Error creating share URL:", error);
			// Fallback to regular URL with parameters
			const params = new URLSearchParams();
			for (const [key, value] of Object.entries(state)) {
				if (value !== undefined && value !== null) {
					if (typeof value === "object") {
						params.set(key, JSON.stringify(value));
					} else {
						params.set(key, String(value));
					}
				}
			}
			return `${globalThis.location.origin}${pathname}?${params.toString()}`;
		}
	}, [state, pathname]);

	// Validate current URL
	const isValidUrl = useCallback(() => {
		try {
			const pathnameMatch = /\/database\/share\/(.+)$/.exec(pathname);
			if (pathnameMatch) {
				// Test if we can decompress the data
				UrlCompression.decompress<ShareableFilters>(pathnameMatch[1]);
				return true;
			}
			return true; // Regular URLs are always valid
		} catch {
			return false;
		}
	}, [pathname]);

	// Load persisted state from localStorage
	useEffect(() => {
		if (persistAcrossSessions && !searchParams.toString()) {
			try {
				const persisted = localStorage.getItem(`url-state-${pathname}`);
				if (persisted) {
					const parsedState = JSON.parse(persisted);
					setState({ ...defaultState, ...parsedState });
				}
			} catch (error) {
				console.warn("Failed to load persisted state:", error);
			}
		}
	}, [persistAcrossSessions, pathname, searchParams, setState, defaultState]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			updateUrl.cancel();
		};
	}, [updateUrl]);

	return {
		state,
		setState,
		resetState,
		shareUrl,
		isValidUrl: isValidUrl(),
	};
}

/**
 * Simplified hook for managing filter state
 */
export function useFiltersState(defaultFilters: ShareableFilters) {
	return useUrlState<ShareableFilters>(defaultFilters, {
		debounceMs: TIMING.DEBOUNCE_LONG,
		syncToUrl: true,
		persistAcrossSessions: true,
	});
}

/**
 * Hook for managing view preferences (grid/list, sort, etc.)
 */
export function useViewState(defaultView: {
  view: "grid" | "list";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  itemsPerPage?: number;
}) {
	return useUrlState(defaultView, {
		debounceMs: TIMING.DEBOUNCE_SHORT,
		syncToUrl: true,
		persistAcrossSessions: true,
	});
}

/**
 * Hook for managing search state with suggestions
 */
export function useSearchState(defaultQuery = "") {
	return useUrlState<{ query: string; suggestions?: string[] }>(
		{ query: defaultQuery },
		{
			debounceMs: TIMING.DEBOUNCE_DEFAULT,
			syncToUrl: true,
			persistAcrossSessions: false, // Don't persist search queries
		},
	);
}

/**
 * Hook for managing multi-select filters
 */
export function useMultiSelectFilter(
	name: string,
	options: string[] = [],
	defaultValue: string[] = [],
) {
	const { state, setState } = useUrlState<Record<string, string[]>>(
		{ [name]: defaultValue },
		{ debounceMs: TIMING.DEBOUNCE_MEDIUM },
	);

	const selected = state[name] || defaultValue;
	const isSelected = (value: string) => selected.includes(value);

	const toggle = (value: string) => {
		setState({
			...state,
			[name]: isSelected(value)
				? selected.filter(item => item !== value)
				: [...selected, value],
		});
	};

	const setAll = (values: string[]) => {
		setState({
			...state,
			[name]: values,
		});
	};

	const clear = () => {
		setState({
			...state,
			[name]: [],
		});
	};

	return {
		selected,
		isSelected,
		toggle,
		setAll,
		clear,
		count: selected.length,
	};
}

export default useUrlState;