"use client";

import { Carousel } from "@mantine/carousel";
import { Image, Box, SimpleGrid, ActionIcon, Group, Modal, Text } from "@mantine/core";
import { IconPlayerPlay, IconPlayerPause, IconX, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { EmblaCarouselType } from "embla-carousel";
import Autoplay from "embla-carousel-autoplay";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";

import { useUserPreferences, type UserPreferences } from "../../../hooks/use-user-preferences";

// UI Constants
const THUMBNAIL_OPACITY_SELECTED = 1;
const THUMBNAIL_OPACITY_UNSELECTED = 0.7;
const FULLSCREEN_THUMBNAIL_OPACITY_UNSELECTED = 0.6;

interface ItemImageGalleryProps {
	images: string[];
	displayName: string;
}

export function ItemImageGallery({ images, displayName }: ItemImageGalleryProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [embla, setEmbla] = useState<EmblaCarouselType | null>(null);
	const [fullscreenOpen, setFullscreenOpen] = useState(false);
	const userPrefs = useUserPreferences();
	const preferences: UserPreferences = userPrefs.preferences;
	const { updatePreference, isLoaded } = userPrefs;
	const autoplayRef = useRef(Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }));

	// Memoize plugins array to prevent recreation on every render
	// Only include autoplay if we have multiple images (slideshow makes no sense for single image)
	const plugins = useMemo(() => {
		if (!isLoaded || images.length <= 1) return [];
		return preferences.slideshowEnabled ? [autoplayRef.current] : [];
	}, [preferences.slideshowEnabled, isLoaded, images.length]);

	// Handle autoplay state changes
	useEffect(() => {
		// Only control autoplay if we have multiple images and carousel is ready
		if (!embla || !isLoaded || images.length <= 1) return;

		// Access autoplay plugin through embla's plugins API
		// Cast to partial type - module augmentation claims autoplay always exists, but at runtime
		// it's only present when the Autoplay plugin is loaded (depends on slideshowEnabled)
		const emblaPlugins = embla.plugins() as Partial<{ autoplay: { play: () => void; stop: () => void } }>;
		const autoplay = emblaPlugins.autoplay;
		if (!autoplay) return;

		if (preferences.slideshowEnabled) {
			autoplay.play();
		} else {
			autoplay.stop();
		}
	}, [embla, preferences.slideshowEnabled, isLoaded, images.length]);

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

	const handleImageClick = useCallback(() => {
		setFullscreenOpen(true);
	}, []);

	const handleFullscreenPrev = useCallback(() => {
		setSelectedIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
	}, [images.length]);

	const handleFullscreenNext = useCallback(() => {
		setSelectedIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
	}, [images.length]);

	const toggleSlideshow = useCallback(() => {
		updatePreference("slideshowEnabled", !preferences.slideshowEnabled);
	}, [updatePreference, preferences.slideshowEnabled]);

	// Sync carousel with fullscreen navigation
	useEffect(() => {
		if (embla && !fullscreenOpen) {
			embla.scrollTo(selectedIndex);
		}
	}, [embla, selectedIndex, fullscreenOpen]);

	// Handle keyboard navigation in fullscreen
	useEffect(() => {
		if (!fullscreenOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case "ArrowLeft": {
					handleFullscreenPrev();
			
					break;
				}
				case "ArrowRight": {
					handleFullscreenNext();
			
					break;
				}
				case "Escape": {
					setFullscreenOpen(false);
			
					break;
				}
			// No default
			}
		};

		globalThis.addEventListener("keydown", handleKeyDown);
		return () => { globalThis.removeEventListener("keydown", handleKeyDown); };
	}, [fullscreenOpen, handleFullscreenPrev, handleFullscreenNext]);

	if (images.length === 0) {
		return null;
	}

	return (
		<Box>
			{/* Controls Row */}
			{images.length > 1 && (
				<Group justify="flex-end" mb="xs">
					<ActionIcon
						variant="light"
						onClick={toggleSlideshow}
						title={preferences.slideshowEnabled ? "Pause slideshow" : "Play slideshow"}
						aria-label={preferences.slideshowEnabled ? "Pause slideshow" : "Play slideshow"}
					>
						{preferences.slideshowEnabled ? (
							<IconPlayerPause size={16} />
						) : (
							<IconPlayerPlay size={16} />
						)}
					</ActionIcon>
				</Group>
			)}

			{/* Main Carousel */}
			<Carousel
				height={400}
				getEmblaApi={setEmbla}
				onSlideChange={handleSelect}
				withIndicators={images.length > 1}
				withControls={images.length > 1}
				plugins={plugins}
				emblaOptions={{ loop: true }}
				styles={{
					control: {
						backgroundColor: "var(--mantine-color-white)",
						border: "1px solid var(--mantine-color-gray-3)",
					},
				}}
			>
				{images.map((img, index) => (
					<Carousel.Slide key={index}>
						<Box
							onClick={handleImageClick}
							style={{ cursor: "pointer", height: "100%" }}
						>
							<Image
								src={img}
								alt={`${displayName} ${index + 1}`}
								height={400}
								fit="contain"
							/>
						</Box>
					</Carousel.Slide>
				))}
			</Carousel>

			{/* Thumbnail Grid */}
			{images.length > 1 && (
				<SimpleGrid cols={{ base: 4, sm: 5, md: 6 }} spacing="xs" mt="md">
					{images.map((img, index) => (
						<Box
							key={index}
							onClick={() => { handleThumbnailClick(index); }}
							style={{
								cursor: "pointer",
								border: selectedIndex === index
									? "2px solid var(--mantine-color-blue-6)"
									: "1px solid var(--mantine-color-gray-3)",
								borderRadius: 4,
								overflow: "hidden",
								opacity: selectedIndex === index ? THUMBNAIL_OPACITY_SELECTED : THUMBNAIL_OPACITY_UNSELECTED,
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

			{/* Fullscreen Modal */}
			<Modal
				opened={fullscreenOpen}
				onClose={() => { setFullscreenOpen(false); }}
				fullScreen={true}
				withCloseButton={false}
				styles={{
					body: {
						padding: 0,
						height: "100%",
						display: "flex",
						flexDirection: "column",
						backgroundColor: "var(--mantine-color-dark-9)",
					},
					content: {
						backgroundColor: "var(--mantine-color-dark-9)",
					},
				}}
			>
				{/* Fullscreen Header */}
				<Group
					justify="space-between"
					p="md"
					style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
				>
					<Text c="white" fw={500}>
						{displayName} ({selectedIndex + 1} / {images.length})
					</Text>
					<ActionIcon
						variant="subtle"
						color="white"
						onClick={() => { setFullscreenOpen(false); }}
						aria-label="Close fullscreen"
					>
						<IconX size={24} />
					</ActionIcon>
				</Group>

				{/* Fullscreen Image */}
				<Box
					style={{
						flex: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						position: "relative",
						overflow: "hidden",
					}}
				>
					{/* Previous Button */}
					{images.length > 1 && (
						<ActionIcon
							variant="filled"
							color="dark"
							size="xl"
							onClick={handleFullscreenPrev}
							style={{
								position: "absolute",
								left: 16,
								zIndex: 10,
							}}
							aria-label="Previous image"
						>
							<IconChevronLeft size={32} />
						</ActionIcon>
					)}

					<Image
						src={images[selectedIndex]}
						alt={`${displayName} ${selectedIndex + 1}`}
						fit="contain"
						style={{ maxHeight: "calc(100vh - 100px)", maxWidth: "100%" }}
					/>

					{/* Next Button */}
					{images.length > 1 && (
						<ActionIcon
							variant="filled"
							color="dark"
							size="xl"
							onClick={handleFullscreenNext}
							style={{
								position: "absolute",
								right: 16,
								zIndex: 10,
							}}
							aria-label="Next image"
						>
							<IconChevronRight size={32} />
						</ActionIcon>
					)}
				</Box>

				{/* Fullscreen Thumbnails */}
				{images.length > 1 && (
					<Group justify="center" p="md" gap="xs" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
						{images.map((img, index) => (
							<Box
								key={index}
								onClick={() => { setSelectedIndex(index); }}
								style={{
									cursor: "pointer",
									border: selectedIndex === index
										? "2px solid var(--mantine-color-blue-6)"
										: "1px solid var(--mantine-color-gray-6)",
									borderRadius: 4,
									overflow: "hidden",
									opacity: selectedIndex === index ? THUMBNAIL_OPACITY_SELECTED : FULLSCREEN_THUMBNAIL_OPACITY_UNSELECTED,
									transition: "all 0.2s ease",
								}}
							>
								<Image
									src={img}
									alt={`${displayName} thumbnail ${index + 1}`}
									height={50}
									width={50}
									fit="cover"
								/>
							</Box>
						))}
					</Group>
				)}
			</Modal>
		</Box>
	);
}
