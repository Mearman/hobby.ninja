"use client";

import { debounce } from "lodash-es";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

import { TIMING } from "@/lib/constants";
import { UrlCompression, type ShareableFilters } from "@/lib/url-compression";

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
				} catch {
					// Failed to decompress URL state
				}
			}

			// Parse regular URL parameters
			const hasUrlParams = searchParams.toString().length > 0;
			if (hasUrlParams) {
				for (const [key, value] of searchParams.entries()) {
					try {
						// Try to parse as JSON first (for arrays/objects)
						const parsed = JSON.parse(decodeURIComponent(value)) as T[keyof T];
						urlState[key as keyof T] = parsed;
					} catch {
						// Fallback to string value
						urlState[key as keyof T] = decodeURIComponent(value) as T[keyof T];
					}
				}
				// Merge with default state
				return { ...defaultState, ...urlState };
			}

			// If no URL params and persistence is enabled, try localStorage
			if (persistAcrossSessions) {
				try {
					const persisted = localStorage.getItem(`url-state-${pathname}`);
					if (persisted) {
						const parsedState = JSON.parse(persisted) as Partial<T>;
						return { ...defaultState, ...parsedState } as T;
					}
				} catch {
					// Failed to load persisted state
				}
			}

			return defaultState;
		} catch {
			// Error parsing URL state
			return defaultState;
		}
	});

	// Create debounced function to update URL
	const [debouncedUpdate] = useState(() =>
		debounce((newState: T, urlSyncEnabled: boolean, shouldPersist: boolean, path: string, routerRef: ReturnType<typeof useRouter>) => {
			if (!urlSyncEnabled) return;

			try {
				const params = new URLSearchParams();

				// Add state parameters to URL
				for (const [key, value] of Object.entries(newState)) {
					if (value === undefined || value === null) continue;

					if (typeof value === "object") {
						params.set(key, encodeURIComponent(JSON.stringify(value)));
					} else {
						const stringValue = typeof value === "string"
							? value
							: typeof value === "number" || typeof value === "boolean"
								? String(value)
								: JSON.stringify(value);
						params.set(key, encodeURIComponent(stringValue));
					}
				}

				// Build new URL
				const queryString = params.toString();
				const newUrl = queryString ? `${path}?${queryString}` : path;

				// Update URL without triggering navigation
				routerRef.replace(newUrl, { scroll: false });

				// Persist to localStorage if enabled
				if (shouldPersist) {
					localStorage.setItem(`url-state-${path}`, JSON.stringify(newState));
				}
			} catch {
				// Error updating URL state
			}
		}, debounceMs),
	);

	const updateUrl = useCallback((newState: T) => {
		debouncedUpdate(newState, syncToUrl, persistAcrossSessions, pathname, router);
	}, [debouncedUpdate, syncToUrl, persistAcrossSessions, pathname, router]);

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
		} catch {
			// Error creating share URL - fallback to regular URL with parameters
			const params = new URLSearchParams();
			for (const [key, value] of Object.entries(state)) {
				if (value !== undefined && value !== null) {
					if (typeof value === "object") {
						params.set(key, JSON.stringify(value));
					} else {
						const stringValue = typeof value === "string"
							? value
							: typeof value === "number" || typeof value === "boolean"
								? String(value)
								: JSON.stringify(value);
						params.set(key, stringValue);
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
				void UrlCompression.decompress<ShareableFilters>(pathnameMatch[1]);
				return true;
			}
			return true; // Regular URLs are always valid
		} catch {
			return false;
		}
	}, [pathname]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			debouncedUpdate.cancel();
		};
	}, [debouncedUpdate]);

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
	_options: string[] = [],
	defaultValue: string[] = [],
) {
	const { state, setState } = useUrlState<Record<string, string[]>>(
		{ [name]: defaultValue },
		{ debounceMs: TIMING.DEBOUNCE_MEDIUM },
	);

	const selected = state[name] ?? defaultValue;
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