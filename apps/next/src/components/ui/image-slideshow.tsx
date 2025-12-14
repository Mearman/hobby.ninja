"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Box } from "@mantine/core";

import { CustomImage } from "./custom-image";

interface ImageSlideshowProps {
	/** Array of image URLs to cycle through */
	images: string[];
	/** Alt text for the images */
	alt: string;
	/** Height of the image container */
	height: number;
	/** Placeholder image to show when no images available */
	placeholderSrc: string;
	/** Fallback image when an image fails to load */
	fallbackSrc: string;
	/** Interval between image transitions in milliseconds */
	interval?: number;
	/** Image fit mode */
	fit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

/**
 * Image component that cycles through multiple images on hover.
 * Shows the first image by default, then automatically transitions
 * through all images while hovered.
 */
export function ImageSlideshow({
	images,
	alt,
	height,
	placeholderSrc,
	fallbackSrc,
	interval = 1200,
	fit = "cover",
}: ImageSlideshowProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isHovering, setIsHovering] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const hasMultipleImages = images.length > 1;
	const currentImage = images[currentIndex] ?? placeholderSrc;

	const startSlideshow = useCallback(() => {
		if (!hasMultipleImages) return;

		intervalRef.current = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % images.length);
		}, interval);
	}, [hasMultipleImages, images.length, interval]);

	const stopSlideshow = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		setCurrentIndex(0);
	}, []);

	const handleMouseEnter = useCallback(() => {
		setIsHovering(true);
		startSlideshow();
	}, [startSlideshow]);

	const handleMouseLeave = useCallback(() => {
		setIsHovering(false);
		stopSlideshow();
	}, [stopSlideshow]);

	// Cleanup interval on unmount
	useEffect(() => {
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	return (
		<Box
			pos="relative"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			style={{ overflow: "hidden" }}
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

			{/* Image count badge - show when multiple images and not hovering */}
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
