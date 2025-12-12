"use client";

import { useState, useCallback } from "react";
import { Carousel } from "@mantine/carousel";
import type { EmblaCarouselType } from "embla-carousel";
import { Image, Box, SimpleGrid } from "@mantine/core";
import Autoplay from "embla-carousel-autoplay";

interface ItemImageGalleryProps {
	images: string[];
	displayName: string;
}

export function ItemImageGallery({ images, displayName }: ItemImageGalleryProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [embla, setEmbla] = useState<EmblaCarouselType | null>(null);

	const handleThumbnailClick = useCallback((index: number) => {
		if (embla) {
			embla.scrollTo(index);
		}
	}, [embla]);

	const handleSelect = useCallback(() => {
		if (embla) {
			setSelectedIndex(embla.selectedScrollSnap());
		}
	}, [embla]);

	if (images.length === 0) {
		return null;
	}

	return (
		<Box>
			{/* Main Carousel */}
			<Carousel
				height={400}
				getEmblaApi={setEmbla}
				onSlideChange={handleSelect}
				withIndicators={images.length > 1}
				withControls={images.length > 1}
				plugins={[
					Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
				]}
				emblaOptions={{ loop: true }}
				styles={{
					control: {
						backgroundColor: "var(--mantine-color-white)",
						border: "1px solid var(--mantine-color-gray-3)",
					},
					indicator: {
						backgroundColor: "var(--mantine-color-gray-4)",
						"&[data-active]": {
							backgroundColor: "var(--mantine-color-blue-6)",
						},
					},
				}}
			>
				{images.map((img, index) => (
					<Carousel.Slide key={index}>
						<Image
							src={img}
							alt={`${displayName} ${index + 1}`}
							height={400}
							fit="contain"
						/>
					</Carousel.Slide>
				))}
			</Carousel>

			{/* Thumbnail Grid */}
			{images.length > 1 && (
				<SimpleGrid cols={{ base: 4, sm: 5, md: 6 }} spacing="xs" mt="md">
					{images.map((img, index) => (
						<Box
							key={index}
							onClick={() => handleThumbnailClick(index)}
							style={{
								cursor: "pointer",
								border: selectedIndex === index
									? "2px solid var(--mantine-color-blue-6)"
									: "1px solid var(--mantine-color-gray-3)",
								borderRadius: 4,
								overflow: "hidden",
								opacity: selectedIndex === index ? 1 : 0.7,
								transition: "all 0.2s ease",
							}}
						>
							<Image
								src={img}
								alt={`${displayName} thumbnail ${index + 1}`}
								height={60}
								fit="contain"
							/>
						</Box>
					))}
				</SimpleGrid>
			)}
		</Box>
	);
}
