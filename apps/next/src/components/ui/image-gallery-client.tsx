"use client";

import React, { useState, useCallback } from "react";
import {
	Box,
	Image,
	Group,
	ThemeIcon,
	Stack,
	Skeleton,
	ActionIcon,
	Tooltip,
	Text,
	Badge,
} from "@mantine/core";
import {
	IconPhoto,
	IconMaximize,
	IconChevronLeft,
	IconChevronRight,
} from "@tabler/icons-react";
import { CustomImage } from "./custom-image";
import { Badge as CustomBadge } from "./badge";

interface ImageGalleryClientProps {
	images: string[];
	itemName: string;
	className?: string;
}

export function ImageGalleryClient({ images, itemName, className }: ImageGalleryClientProps) {
	const [selectedImage, setSelectedImage] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

	const handleImageLoad = useCallback((index: number) => {
		setLoadedImages((prev) => new Set(prev).add(index));
		if (index === selectedImage) {
			setIsLoading(false);
		}
	}, [selectedImage]);

	const handleImageError = useCallback((index: number) => {
		// Handle image loading errors - could show fallback
		console.error(`Failed to load image ${index + 1}`);
	}, []);

	const goToPrevious = () => {
		setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
		setIsLoading(true);
	};

	const goToNext = () => {
		setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
		setIsLoading(true);
	};

	const selectImage = (index: number) => {
		setSelectedImage(index);
		setIsLoading(!loadedImages.has(index));
	};

	if (images.length === 0) {
		return (
			<Box
				className={className}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "400px",
					flexDirection: "column",
					gap: "sm",
					border: "1px solid var(--mantine-color-gray-3)",
					borderRadius: "8px",
				}}
			>
				<ThemeIcon size={64} radius="xl" color="gray" variant="light">
					<IconPhoto size={32} />
				</ThemeIcon>
				<Box ta="center">
					<Text c="dimmed" size="lg" mb="xs">
						No images available
					</Text>
					<Text size="sm" c="dimmed">
						This item doesn't have any product images
					</Text>
				</Box>
			</Box>
		);
	}

	const mainImage = images[selectedImage];

	return (
		<Box className={className}>
			{/* Main image container */}
			<Box
				style={{
					position: "relative",
					borderRadius: "8px",
					overflow: "hidden",
					border: "1px solid var(--mantine-color-gray-3)",
				}}
			>
				{/* Loading skeleton */}
				{isLoading && (
					<Box
						pos="absolute"
						top={0}
						left={0}
						right={0}
						bottom={0}
						style={{
							zIndex: 2,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							background: "var(--mantine-color-gray-0)",
						}}
					>
						<Skeleton height={400} width="100%" />
					</Box>
				)}

				{/* Main image */}
				<CustomImage
					src={mainImage}
					alt={`${itemName} - Image ${selectedImage + 1}`}
					width={800}
					height={400}
					fit="contain"
					style={{
						width: "100%",
						height: "400px",
						background: "var(--mantine-color-gray-0)",
					}}
					onLoad={() => handleImageLoad(selectedImage)}
					onError={() => handleImageError(selectedImage)}
					priority={selectedImage === 0}
				/>

				{/* Navigation buttons for desktop */}
				{images.length > 1 && (
					<>
						<ActionIcon
							pos="absolute"
							left="md"
							top="50%"
							style={{
								transform: "translateY(-50%)",
								zIndex: 3,
							}}
							variant="white"
							size="lg"
							radius="xl"
							onClick={goToPrevious}
							display={{ base: "none", sm: "flex" }}
						>
							<IconChevronLeft size={20} />
						</ActionIcon>
						<ActionIcon
							pos="absolute"
							right="md"
							top="50%"
							style={{
								transform: "translateY(-50%)",
								zIndex: 3,
							}}
							variant="white"
							size="lg"
							radius="xl"
							onClick={goToNext}
							display={{ base: "none", sm: "flex" }}
						>
							<IconChevronRight size={20} />
						</ActionIcon>
					</>
				)}

				{/* Image counter */}
				{images.length > 1 && (
					<Box
						pos="absolute"
						bottom="md"
						right="md"
						style={{ zIndex: 3 }}
					>
						<Badge size="sm" variant="filled">
							{selectedImage + 1} / {images.length}
						</Badge>
					</Box>
				)}

				{/* Fullscreen button (placeholder for future lightbox) */}
				<Tooltip label="Fullscreen view">
					<ActionIcon
						pos="absolute"
						bottom="md"
						left="md"
						variant="white"
						size="md"
						radius="xl"
						style={{ zIndex: 3 }}
					>
						<IconMaximize size={16} />
					</ActionIcon>
				</Tooltip>
			</Box>

			{/* Mobile navigation dots */}
			{images.length > 1 && (
				<Group justify="center" mt="sm" display={{ base: "flex", sm: "none" }}>
					{images.map((_, index) => (
						<Box
							key={index}
							w={8}
							h={8}
							style={{
								borderRadius: "50%",
								background: selectedImage === index ? "var(--mantine-color-blue-6)" : "var(--mantine-color-gray-6)",
								cursor: "pointer",
								transition: "all 0.2s ease",
								opacity: selectedImage === index ? 1 : 0.5,
							}}
							onClick={() => selectImage(index)}
						/>
					))}
				</Group>
			)}

			{/* Thumbnail gallery */}
			{images.length > 1 && (
				<Box mt="md" display={{ base: "none", sm: "block" }}>
					<Group gap="sm" wrap="nowrap">
						{images.map((image, index) => (
							<Box
								key={index}
								style={{
									position: "relative",
									cursor: "pointer",
									borderRadius: "4px",
									overflow: "hidden",
									border: selectedImage === index ? "2px solid var(--mantine-color-blue-6)" : "2px solid transparent",
									flex: "0 0 80px",
									height: "60px",
								}}
								onClick={() => selectImage(index)}
							>
								<CustomImage
									src={image}
									alt={`${itemName} - Thumbnail ${index + 1}`}
									width={80}
									height={60}
									fit="cover"
									style={{
										width: "100%",
										height: "100%",
										opacity: selectedImage === index ? 1 : 0.7,
										transition: "opacity 0.2s",
									}}
								/>
								{!loadedImages.has(index) && (
									<Box
										pos="absolute"
										top={0}
										left={0}
										right={0}
										bottom={0}
										bg="gray.0"
									>
										<Skeleton height="100%" width="100%" />
									</Box>
								)}
							</Box>
						))}
					</Group>
				</Box>
			)}
		</Box>
	);
}