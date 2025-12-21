"use client";

import { getNextFallbackUrl, getInitialUrl, type CdnUrls } from "@hobby-ninja/data";
import { useState, useCallback } from "react";

interface FallbackImageProps {
	urls: CdnUrls;
	alt: string;
	style?: React.CSSProperties;
	className?: string;
}

/**
 * Image component with automatic fallback chain support.
 * Tries: external source → primary CDN → GitHub raw
 */
export function FallbackImage({ urls, alt, style, className }: FallbackImageProps) {
	const [currentUrl, setCurrentUrl] = useState(() => getInitialUrl(urls));
	const [hasError, setHasError] = useState(false);

	const handleError = useCallback(() => {
		const nextUrl = getNextFallbackUrl(urls, currentUrl);
		if (nextUrl) {
			console.log(`[Image] Fallback: ${currentUrl.slice(0, 50)}... → ${nextUrl.slice(0, 50)}...`);
			setCurrentUrl(nextUrl);
		} else {
			console.warn(`[Image] All fallbacks exhausted for ${alt}`);
			setHasError(true);
		}
	}, [urls, currentUrl, alt]);

	if (hasError) {
		// Return placeholder or null when all fallbacks fail
		return null;
	}

	return (
		<img
			src={currentUrl}
			alt={alt}
			style={style}
			className={className}
			onError={handleError}
		/>
	);
}
