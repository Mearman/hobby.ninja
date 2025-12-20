"use client";

import { getCdnUrls, type CdnUrls } from "@hobby-ninja/data";
import { useCallback, useMemo, useState } from "react";

/**
 * Hook for CDN URL fallback behavior
 *
 * Provides a URL that automatically falls back from primary CDN (R2) to
 * fallback CDN (GitHub raw) when the primary fails to load.
 *
 * @param assetPath - Relative asset path (e.g., "/images/items/xxx.jpg")
 * @returns Object with current URL and error handler
 *
 * @example
 * ```tsx
 * function MyImage({ imagePath }) {
 *   const { url, onError, isFallback } = useCdnFallback(imagePath);
 *   return <img src={url} onError={onError} />;
 * }
 * ```
 */
export function useCdnFallback(assetPath: string) {
	const [useFallback, setUseFallback] = useState(false);

	const urls: CdnUrls = useMemo(() => getCdnUrls(assetPath), [assetPath]);

	const currentUrl = useFallback ? urls.fallback : urls.primary;

	const handleError = useCallback(() => {
		if (!useFallback && urls.hasFallback) {
			setUseFallback(true);
		}
	}, [useFallback, urls.hasFallback]);

	// Reset fallback state when asset path changes
	const resetFallback = useCallback(() => {
		setUseFallback(false);
	}, []);

	return {
		/** Current URL to use (primary or fallback) */
		url: currentUrl,
		/** Error handler to trigger fallback */
		onError: handleError,
		/** Whether currently using fallback URL */
		isFallback: useFallback,
		/** Whether a fallback is available */
		hasFallback: urls.hasFallback,
		/** Reset to primary URL */
		reset: resetFallback,
		/** All available URLs */
		urls,
	};
}

/**
 * Hook for multiple CDN URLs with fallback behavior
 *
 * Tracks fallback state for an array of asset paths, useful for galleries
 * where each image may need independent fallback handling.
 *
 * @param assetPaths - Array of relative asset paths
 * @returns Object with URL getter and error handler factory
 */
export function useCdnFallbackArray(assetPaths: string[]) {
	const [fallbackSet, setFallbackSet] = useState<Set<number>>(new Set());

	const urlsArray: CdnUrls[] = useMemo(
		() => assetPaths.map(path => getCdnUrls(path)),
		[assetPaths],
	);

	const getUrl = useCallback((index: number): string => {
		const urls = urlsArray[index];
		return fallbackSet.has(index) ? urls.fallback : urls.primary;
	}, [urlsArray, fallbackSet]);

	const handleError = useCallback((index: number) => () => {
		const urls = urlsArray[index];
		if (urls.hasFallback && !fallbackSet.has(index)) {
			setFallbackSet(prev => new Set(prev).add(index));
		}
	}, [urlsArray, fallbackSet]);

	const isFallback = useCallback((index: number): boolean => {
		return fallbackSet.has(index);
	}, [fallbackSet]);

	const reset = useCallback(() => {
		setFallbackSet(new Set());
	}, []);

	return {
		/** Get current URL for index */
		getUrl,
		/** Get error handler for index */
		handleError,
		/** Check if index is using fallback */
		isFallback,
		/** Reset all to primary URLs */
		reset,
		/** Count of items using fallback */
		fallbackCount: fallbackSet.size,
	};
}
