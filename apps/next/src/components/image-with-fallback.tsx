"use client";

import { Text } from "@mantine/core";
import Image from "next/image";
import { useState } from "react";

interface ImageWithFallbackProps {
	src: string;
	alt: string;
	fallbackText: string;
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
}: ImageWithFallbackProps): React.ReactElement {
	const [hasError, setHasError] = useState(false);

	if (hasError) {
		return (
			<Text size="xl" fw={600} c="dimmed" ta="center" p="md">
				{fallbackText}
			</Text>
		);
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
