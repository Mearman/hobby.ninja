"use client";

import type { CdnUrls } from "@hobby-ninja/data";
import { getCdnUrls } from "@hobby-ninja/data";
import React, { useCallback, useMemo, useReducer } from "react";

import { CustomImage } from "./custom-image";

interface CdnImageProps {
	/** Relative asset path (e.g., "images/items/xxx.jpg") */
	assetPath: string;
	alt: string;
	width?: number;
	height?: number;
	fit?: "contain" | "cover" | "fill" | "none" | "scale-down";
	/** Final fallback if both CDN sources fail (e.g., placeholder SVG) */
	placeholderSrc?: string;
	className?: string;
	priority?: boolean;
	style?: React.CSSProperties;
}

/**
 * Image component with automatic CDN fallback behavior
 *
 * Tries to load from primary CDN (R2 if configured, otherwise GitHub),
 * falls back to GitHub raw on error, then to placeholder if provided.
 *
 * @example
 * ```tsx
 * <CdnImage
 *   assetPath="images/items/12345.jpg"
 *   alt="Item image"
 *   width={200}
 *   height={150}
 *   placeholderSrc={placeholderDataUri}
 * />
 * ```
 */
export function CdnImage({
	assetPath,
	alt,
	width,
	height,
	fit = "cover",
	placeholderSrc,
	className,
	priority = false,
	style,
}: CdnImageProps) {
	// Track which paths have triggered fallback using a reducer
	// This resets when the component remounts with a new assetPath via key
	const [fallbackPaths, addFallbackPath] = useReducer(
		(state: Set<string>, path: string) => new Set(state).add(path),
		new Set<string>(),
	);

	const useFallback = fallbackPaths.has(assetPath);

	const urls: CdnUrls = useMemo(() => getCdnUrls(assetPath), [assetPath]);

	// Current URL based on fallback state
	const currentUrl = useFallback ? urls.fallback : urls.primary;

	const handleError = useCallback(() => {
		// Only switch to fallback if we haven't already and fallback is different
		if (urls.hasFallback) {
			addFallbackPath(assetPath);
		}
	}, [assetPath, urls.hasFallback]);

	// If no asset path, show placeholder directly
	if (!assetPath) {
		return placeholderSrc ? (
			<CustomImage
				src={placeholderSrc}
				alt={alt}
				width={width}
				height={height}
				fit={fit}
				className={className}
				priority={priority}
				style={style}
			/>
		) : null;
	}

	return (
		<CustomImage
			src={currentUrl}
			alt={alt}
			width={width}
			height={height}
			fit={fit}
			fallbackSrc={placeholderSrc}
			className={className}
			priority={priority}
			onError={handleError}
			style={style}
		/>
	);
}
