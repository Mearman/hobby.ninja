"use client";

import Image from "next/image";
import React from "react";

// Custom image loader that adds proper headers for bandai-hobby.net images
const customImageLoader = ({ src, width, quality }: { src: string; width: number; quality?: number }) => {
	// Data URIs should be returned as-is - don't append query parameters
	if (src.startsWith("data:")) {
		return src;
	}

	// For bandai-hobby.net images, we need to handle them specially due to hotlink protection
	if (src.includes("bandai-hobby.net")) {
		// Return the original URL - Next.js will handle it with proper browser headers
		// The key is that when rendered in a browser context, it will have the right User-Agent
		return src;
	}

	// For other images, use default Next.js loader behavior
	const DEFAULT_QUALITY = 75;
	return `${src}?w=${width}&q=${quality ?? DEFAULT_QUALITY}`;
};

interface CustomImageProps {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	fit?: "contain" | "cover" | "fill" | "none" | "scale-down";
	fallbackSrc?: string;
	className?: string;
	priority?: boolean;
	onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
	onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
	style?: React.CSSProperties;
}

// Custom Image component that uses our loader
export function CustomImage({
	src,
	alt,
	width,
	height,
	fit = "cover",
	fallbackSrc,
	className,
	priority = false,
	onError,
	onLoad,
	style,
	...props
}: CustomImageProps) {
	const [imgSrc, setImgSrc] = React.useState(src);
	const [hasError, setHasError] = React.useState(false);
	const prevSrcRef = React.useRef(src);

	const handleError = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
		if (!hasError && fallbackSrc) {
			setHasError(true);
			setImgSrc(fallbackSrc);
		}
		onError?.(e);
	}, [hasError, fallbackSrc, onError]);

	const handleLoad = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
		if (hasError) {
			setHasError(false);
		}
		onLoad?.(e);
	}, [hasError, onLoad]);

	// Reset state when src prop changes (skip initial mount)
	React.useEffect(() => {
		if (prevSrcRef.current !== src) {
			setImgSrc(src);
			setHasError(false);
			prevSrcRef.current = src;
		}
	}, [src]);

	const objectFit = fit === "contain" ? "contain" : fit === "cover" ? "cover" : "none";

	const DEFAULT_IMAGE_WIDTH = 280;
	const DEFAULT_IMAGE_HEIGHT = 200;

	return (
		<Image
			{...props}
			src={imgSrc}
			alt={alt}
			width={width ?? DEFAULT_IMAGE_WIDTH} // Default width to prevent Next.js errors
			height={height ?? DEFAULT_IMAGE_HEIGHT} // Default height to prevent Next.js errors
			loader={customImageLoader}
			className={className}
			priority={priority}
			onError={handleError}
			onLoad={handleLoad}
			style={{
				objectFit,
				width: width ? "auto" : "100%",
				height: height ? "auto" : "100%",
				...style,
			}}
			unoptimized={src.startsWith("data:") || src.includes("bandai-hobby.net")} // Skip optimization for data URIs and external images
		/>
	);
}