"use client";

import { Box, Text } from "@mantine/core";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";

interface ImageWithFallbackProps {
	src: string;
	alt: string;
	fallbackText: string;
	maxFontSize?: number;
}

const FONT_SIZES_PX = [20, 18, 16, 14, 12];

interface FittedTextProps {
	text: string;
	/** Maximum font size in pixels (default: 20) */
	maxFontSize?: number;
}

/** Text that auto-scales to fit its container */
export function FittedText({ text, maxFontSize = 20 }: FittedTextProps): React.ReactElement {
	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLDivElement>(null);

	// Use useLayoutEffect to measure and set font size directly on DOM
	useLayoutEffect(() => {
		const container = containerRef.current;
		const textEl = textRef.current;
		if (!container || !textEl) return;

		// Filter font sizes to only those <= maxFontSize
		const availableSizes = FONT_SIZES_PX.filter(size => size <= maxFontSize);

		// Find the largest font size that fits by measuring at each size
		for (const size of availableSizes) {
			textEl.style.fontSize = `${size}px`;
			if (textEl.scrollHeight <= container.clientHeight) {
				break;
			}
		}
	}, [text, maxFontSize]);

	return (
		<Box
			ref={containerRef}
			style={{
				position: "absolute",
				inset: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "4px",
				overflow: "hidden",
			}}
		>
			<Text
				ref={textRef}
				size="xl"
				fw={600}
				c="dimmed"
				ta="center"
				style={{ wordBreak: "break-word" }}
			>
				{text}
			</Text>
		</Box>
	);
}

/**
 * Image component that gracefully falls back to text when the image fails to load.
 * Uses next/image with fill mode for automatic sizing within aspect-ratio containers.
 * Used for entity cards (categories, brands, series) where some images may be missing.
 */
export function ImageWithFallback({
	src,
	alt,
	fallbackText,
	maxFontSize = 20,
}: ImageWithFallbackProps): React.ReactElement {
	const [hasError, setHasError] = useState(false);

	if (hasError) {
		return <FittedText text={fallbackText} maxFontSize={maxFontSize} />;
	}

	return (
		<Image
			src={src}
			alt={alt}
			fill={true}
			style={{ objectFit: "contain" }}
			onError={() => { setHasError(true); }}
		/>
	);
}
