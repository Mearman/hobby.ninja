"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PAGINATION } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-misused-promises */

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

const MAX_CACHED_ITEMS = 1000; // eslint-disable-line @typescript-eslint/no-magic-numbers
const INTERSECTION_THRESHOLD = 0.1; // eslint-disable-line @typescript-eslint/no-magic-numbers

export function useInfiniteScroll<T>({
	items,
	itemsPerPage = PAGINATION.ITEMS_PER_PAGE,
	threshold = INTERSECTION_THRESHOLD,
	rootMargin = "200px",
	hasMore: externalHasMore,
	onLoadMore,
	maxCachedItems = MAX_CACHED_ITEMS,
	preservePageParam = false,
	autoLoad = true,
}: InfiniteScrollOptions<T>): InfiniteScrollReturn<T> {
	const [loadedCount, setLoadedCount] = useState(itemsPerPage);
	const [isLoading, setIsLoading] = useState(false);
	const observerRef = useRef<IntersectionObserver | null>(null);

	// Calculate items to show
	const loadedItems = items.slice(0, loadedCount);
	const visibleItems = loadedItems;

	// Determine if there's more to load
	const hasMoreToLoad = externalHasMore ?? (loadedCount < items.length && loadedCount < maxCachedItems);
	const hasMore = hasMoreToLoad;

	// Load more items
	const loadMore = useCallback(async () => {
		if (!hasMoreToLoad || isLoading || loadedCount >= maxCachedItems) return;

		setIsLoading(true);

		try {
			// Brief loading delay for UX
			await new Promise(resolve => setTimeout(resolve, 300));

			setLoadedCount(prev => {
				const newCount = Math.min(prev + itemsPerPage, items.length, maxCachedItems);

				// Call external onLoadMore if provided
				if (onLoadMore) {
					const currentPage = Math.ceil(newCount / itemsPerPage);
					const newlyLoadedItems = items.slice(0, newCount);
					onLoadMore(currentPage, newlyLoadedItems);
				}

				return newCount;
			});
		} finally {
			setIsLoading(false);
		}
	}, [hasMoreToLoad, isLoading, loadedCount, maxCachedItems, itemsPerPage, items, onLoadMore]);

	// Intersection observer callback
	const lastItemRef = useCallback((node: HTMLElement | null) => {
		if (isLoading || !autoLoad) return;
		if (observerRef.current) observerRef.current.disconnect();
		if (!node) return;

		observerRef.current = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore) {
					loadMore();
				}
			},
			{
				threshold,
				rootMargin,
			},
		);
		observerRef.current.observe(node);
	}, [isLoading, autoLoad, hasMore, loadMore, threshold, rootMargin]);

	// Reset scroll state
	const reset = useCallback((): void => {
		setLoadedCount(itemsPerPage);
		setIsLoading(false);
		if (observerRef.current) {
			observerRef.current.disconnect();
		}
	}, [itemsPerPage]);

	// Update loaded count when items change (for filter/search)
	useEffect(() => {
		setLoadedCount(Math.min(loadedCount, itemsPerPage));
	}, [items, itemsPerPage, loadedCount]);

	// URL synchronization for page parameter
	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!preservePageParam || typeof window === "undefined") return;

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

	// Cleanup observer on unmount
	useEffect(() => {
		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, []);

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
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Failed to load more items"));
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