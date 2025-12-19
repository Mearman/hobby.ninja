"use client";

import { Box } from "@mantine/core";
import React, { useState, useRef, useCallback } from "react";

import { CustomImage } from "./custom-image";

interface ImageScrubberProps {
	/** Array of image URLs to scrub through */
	images: string[];
	/** Alt text for the images */
	alt: string;
	/** Height of the image container */
	height: number;
	/** Placeholder image to show when no images available */
	placeholderSrc: string;
	/** Fallback image when an image fails to load */
	fallbackSrc: string;
	/** Image fit mode */
	fit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

/**
 * Image component that displays different images based on cursor horizontal position.
 * Shows the first image by default, then allows users to scrub through images
 * by moving their cursor horizontally across the element while hovering.
 */
export function ImageScrubber({
	images,
	alt,
	height,
	placeholderSrc,
	fallbackSrc,
	fit = "cover",
}: ImageScrubberProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isHovering, setIsHovering] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const hasMultipleImages = images.length > 1;
	const currentImage = images[currentIndex] ?? placeholderSrc;

	const getImageIndexFromCursorX = useCallback((clientX: number) => {
		if (!containerRef.current || !hasMultipleImages) return 0;

		const rect = containerRef.current.getBoundingClientRect();
		const relativeX = clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, relativeX / rect.width));

		// Map the percentage to an image index
		const index = Math.floor(percentage * images.length);
		return Math.min(index, images.length - 1);
	}, [hasMultipleImages, images.length]);

	const handleMouseEnter = useCallback(() => {
		setIsHovering(true);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setIsHovering(false);
		setCurrentIndex(0);
	}, []);

	const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		if (!hasMultipleImages) return;

		const newIndex = getImageIndexFromCursorX(event.clientX);
		setCurrentIndex(newIndex);
	}, [hasMultipleImages, getImageIndexFromCursorX]);

	return (
		<Box
			ref={containerRef}
			pos="relative"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onMouseMove={handleMouseMove}
			style={{
				overflow: "hidden",
				cursor: hasMultipleImages ? "ew-resize" : "default",
			}}
		>
			<CustomImage
				src={currentImage}
				alt={alt}
				fit={fit}
				height={height}
				fallbackSrc={fallbackSrc}
			/>

			{/* Image indicators - only show when hovering and multiple images */}
			{hasMultipleImages && isHovering && (
				<Box
					pos="absolute"
					bottom={8}
					left="50%"
					style={{
						transform: "translateX(-50%)",
						display: "flex",
						gap: 4,
						zIndex: 10,
					}}
				>
					{images.map((_, index) => (
						<Box
							key={index}
							w={6}
							h={6}
							style={{
								borderRadius: "50%",
								backgroundColor:
									index === currentIndex
										? "rgba(255, 255, 255, 0.95)"
										: "rgba(255, 255, 255, 0.4)",
								transition: "background-color 200ms ease",
								boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
							}}
						/>
					))}
				</Box>
			)}

			{/* Image count badge - show when multiple images and not hovering to indicate interaction */}
			{hasMultipleImages && !isHovering && (
				<Box
					pos="absolute"
					bottom={8}
					right={8}
					px={6}
					py={2}
					style={{
						backgroundColor: "rgba(0, 0, 0, 0.6)",
						borderRadius: 4,
						fontSize: 11,
						fontWeight: 500,
						color: "white",
						zIndex: 10,
					}}
				>
					{images.length} images
				</Box>
			)}
		</Box>
	);
}