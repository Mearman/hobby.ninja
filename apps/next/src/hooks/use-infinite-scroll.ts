"use client";

import { useState, useCallback, useRef, useEffect } from "react";

import { PAGINATION } from "@/lib/constants";

const MAX_CACHED_ITEMS = 1000;
const LOADING_DELAY = 0; // Instant item rendering - images load lazily in background
const INTERSECTION_DEBOUNCE = 50; // Faster trigger for smoother scrolling

export interface InfiniteScrollOptions<T> {
	items: T[];
	itemsPerPage?: number;
	threshold?: number;
	rootMargin?: string;
	hasMore?: boolean;
	onLoadMore?: (page: number, loadedItems: T[]) => void;
	maxCachedItems?: number;
	preservePageParam?: boolean;
	autoLoad?: boolean;
}

export interface InfiniteScrollReturn<T> {
	visibleItems: T[];
	loadedItems: T[];
	hasMore: boolean;
	isLoading: boolean;
	loadMore: () => void;
	reset: () => void;
	itemCount: number;
	lastItemRef: (node: HTMLElement | null) => void;
}

// Get initial page from URL for position restoration (safe for SSR)
function getInitialPageFromUrl(): number {
	// Safe SSR check - globalThis.location is undefined during SSR
	const location = globalThis.location as Location | undefined;
	if (!location) return 1;
	const urlParams = new URLSearchParams(location.search);
	const pageParam = urlParams.get("page");
	if (!pageParam) return 1;
	const page = Number.parseInt(pageParam, 10);
	return Number.isNaN(page) || page < 1 ? 1 : page;
}

export function useInfiniteScroll<T>({
	items,
	itemsPerPage = PAGINATION.ITEMS_PER_PAGE,
	threshold = 0,
	rootMargin = "200px",
	hasMore: externalHasMore,
	onLoadMore,
	maxCachedItems = MAX_CACHED_ITEMS,
	preservePageParam = false,
	autoLoad = true,
}: InfiniteScrollOptions<T>): InfiniteScrollReturn<T> {
	// Lazy initializer for loadedCount - reads from URL on first render if preservePageParam is true
	const [loadedCount, setLoadedCount] = useState(() => {
		if (!preservePageParam) return itemsPerPage;
		const page = getInitialPageFromUrl();
		// Note: items.length may be 0 on first render, so we use page * itemsPerPage
		// The actual visible items will be capped by items.slice() anyway
		return Math.max(itemsPerPage, page * itemsPerPage);
	});
	const [isLoading, setIsLoading] = useState(false);
	const observerRef = useRef<IntersectionObserver | null>(null);
	const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const prevItemsRef = useRef<T[]>(items);
	const isInitialLoadRef = useRef(true);

	// Calculate items to show
	const loadedItems = items.slice(0, loadedCount);
	const visibleItems = loadedItems;

	// Determine if there's more to load
	const hasMoreToLoad = externalHasMore ?? (loadedCount < items.length && loadedCount < maxCachedItems);
	const hasMore = hasMoreToLoad;

	// Store latest values in refs so callbacks always have current values
	const stateRef = useRef({
		items,
		hasMore,
		isLoading,
		autoLoad,
		itemsPerPage,
		maxCachedItems,
		onLoadMore,
	});

	// Update ref in effect to avoid updating during render
	useEffect(() => {
		stateRef.current = { items, hasMore, isLoading, autoLoad, itemsPerPage, maxCachedItems, onLoadMore };
	});

	// Load more items - stable callback that reads from refs
	const loadMore = useCallback(() => {
		const { isLoading: currentIsLoading, itemsPerPage: currentPageSize, maxCachedItems: maxItems, onLoadMore: onLoad, items: currentItems } = stateRef.current;

		if (currentIsLoading) return;

		setIsLoading(true);

		// Brief loading delay for UX
		setTimeout(() => {
			setLoadedCount(prev => {
				const newCount = Math.min(prev + currentPageSize, currentItems.length, maxItems);

				// Call external onLoadMore if provided
				if (onLoad) {
					const currentPage = Math.ceil(newCount / currentPageSize);
					onLoad(currentPage, currentItems.slice(0, newCount));
				}

				return newCount;
			});
			setIsLoading(false);
		}, LOADING_DELAY);
	}, []);

	// Ref callback that creates observer - following the pattern from proven implementations
	// This creates a new observer each time the ref is called, with an inline callback
	// that reads from stateRef to always have current values
	const lastItemRef = useCallback((node: HTMLElement | null) => {
		// Always disconnect existing observer first
		if (observerRef.current) {
			observerRef.current.disconnect();
			observerRef.current = null;
		}

		// Clear any pending load timeout
		if (loadMoreTimeoutRef.current) {
			clearTimeout(loadMoreTimeoutRef.current);
			loadMoreTimeoutRef.current = null;
		}

		// Don't observe if no node or autoLoad is disabled
		if (!node || !stateRef.current.autoLoad) {
			return;
		}

		// Create new observer with inline callback that reads from refs
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry.isIntersecting) return;

				const { hasMore: currentHasMore, isLoading: currentIsLoading, autoLoad: currentAutoLoad } = stateRef.current;

				// Check conditions before loading
				if (!currentHasMore || currentIsLoading || !currentAutoLoad) return;

				// Debounce to prevent multiple rapid triggers
				if (loadMoreTimeoutRef.current) {
					clearTimeout(loadMoreTimeoutRef.current);
				}

				loadMoreTimeoutRef.current = setTimeout(() => {
					// Re-check conditions after debounce
					const state = stateRef.current;
					if (state.hasMore && !state.isLoading && state.autoLoad) {
						loadMore();
					}
				}, INTERSECTION_DEBOUNCE);
			},
			{ threshold, rootMargin },
		);

		observer.observe(node);
		observerRef.current = observer;
	}, [loadMore, threshold, rootMargin]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
			if (loadMoreTimeoutRef.current) {
				clearTimeout(loadMoreTimeoutRef.current);
			}
		};
	}, []);

	// Reset scroll state - does NOT disconnect observer, just resets count
	const reset = useCallback(() => {
		setLoadedCount(itemsPerPage);
		setIsLoading(false);
	}, [itemsPerPage]);

	// Reset loaded count when items array reference changes (filter/search)
	// Skip reset on initial load to preserve URL-restored state
	/* eslint-disable react-hooks/set-state-in-effect -- Reset on filter change is intentional */
	useEffect(() => {
		if (prevItemsRef.current !== items) {
			prevItemsRef.current = items;
			// Don't reset on initial items load if we have URL-restored state
			if (isInitialLoadRef.current) {
				isInitialLoadRef.current = false;
			} else {
				setLoadedCount(itemsPerPage);
			}
		}
	}, [items, itemsPerPage]);
	/* eslint-enable react-hooks/set-state-in-effect */

	// URL synchronization for page parameter
	useEffect(() => {
		if (!preservePageParam) return;

		const currentPage = Math.ceil(loadedCount / itemsPerPage);
		const urlParams = new URLSearchParams(globalThis.location.search);

		if (currentPage > 1) {
			urlParams.set("page", currentPage.toString());
		} else {
			urlParams.delete("page");
		}

		const newUrl = `${globalThis.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""}`;
		globalThis.history.replaceState({}, "", newUrl);
	}, [loadedCount, itemsPerPage, preservePageParam]);

	// Handle browser back/forward navigation
	useEffect(() => {
		if (!preservePageParam) return;

		const handlePopState = () => {
			const page = getInitialPageFromUrl();
			const newLoadedCount = Math.max(itemsPerPage, page * itemsPerPage);
			setLoadedCount(newLoadedCount);
		};

		globalThis.addEventListener("popstate", handlePopState);
		return () => {
			globalThis.removeEventListener("popstate", handlePopState);
		};
	}, [preservePageParam, itemsPerPage]);

	return {
		visibleItems,
		loadedItems,
		hasMore,
		isLoading,
		loadMore,
		reset,
		itemCount: loadedCount,
		lastItemRef,
	};
}

// Utility hook for server-side infinite scroll with fetch
export function useInfiniteScrollWithFetch<T>({
	fetchItems,
	itemsPerPage = PAGINATION.ITEMS_PER_PAGE,
	initialItems = [],
}: {
	fetchItems: (page: number, loadedItems: T[]) => Promise<T[]>;
	itemsPerPage?: number;
	initialItems?: T[];
}) {
	const [items, setItems] = useState<T[]>(initialItems);
	const [isLoading, setIsLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [page, setPage] = useState(1);

	const loadMore = useCallback(async () => {
		if (isLoading || !hasMore) return;

		setIsLoading(true);
		setError(null);

		try {
			const newItems = await fetchItems(page, items);

			if (newItems.length === 0 || newItems.length < itemsPerPage) {
				setHasMore(false);
			}

			setItems(prev => [...prev, ...newItems]);
			setPage(prev => prev + 1);
		} catch (error_) {
			setError(error_ instanceof Error ? error_ : new Error("Failed to load more items"));
		} finally {
			setIsLoading(false);
		}
	}, [fetchItems, page, items, isLoading, hasMore, itemsPerPage]);

	const reset = useCallback(() => {
		setItems(initialItems);
		setPage(1);
		setHasMore(true);
		setIsLoading(false);
		setError(null);
	}, [initialItems]);

	return {
		items,
		isLoading,
		hasMore,
		error,
		loadMore,
		reset,
	};
}
