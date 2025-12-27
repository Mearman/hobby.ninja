"use client";

import { resolveCdnUrl } from "@hobby-ninja/data";
import { Box, Card, Text, UnstyledButton } from "@mantine/core";
import Link from "next/link";
import { useState } from "react";

import { FittedText, ImageWithFallback } from "@/components/image-with-fallback";

interface EntityCardProps {
	id: string;
	name?: string | { ja: string; en?: string };
	itemIds?: string[];
	image?: string;
	type: "category" | "brand" | "series" | "grade";
	asFilter?: boolean;
	isSelected?: boolean;
	onToggle?: () => void;
}

const TYPE_TO_PATH: Record<EntityCardProps["type"], string> = {
	category: "categories",
	brand: "brands",
	series: "series",
	grade: "grades",
};

export function EntityCard({ id, name, itemIds, image, type, asFilter, isSelected, onToggle }: EntityCardProps): React.ReactElement {
	const [isHovered, setIsHovered] = useState(false);
	const displayName = typeof name === "string" ? name : (name?.en ?? name?.ja ?? type);
	const itemCount = itemIds?.length ?? 0;

	const cardContent = (
		<Card
			shadow="sm"
			padding={0}
			radius="md"
			withBorder={true}
			h="100%"
			style={{
				cursor: "pointer",
				borderColor: isSelected ? "var(--mantine-color-blue-5)" : undefined,
				borderWidth: isSelected ? 2 : undefined,
			}}
			onMouseEnter={() => { setIsHovered(true); }}
			onMouseLeave={() => { setIsHovered(false); }}
		>
			<Box
				style={{
					aspectRatio: "300 / 170",
					borderRadius: "var(--mantine-radius-md)",
					overflow: "hidden",
					backgroundColor: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					position: "relative",
				}}
			>
				{image ? (
					<ImageWithFallback
						src={resolveCdnUrl(image)}
						alt={displayName}
						fallbackText={displayName}
					/>
				) : (
					<FittedText text={displayName} />
				)}

				{/* Selected overlay */}
				{isSelected && (
					<Box
						style={{
							position: "absolute",
							inset: 0,
							background: "rgba(59, 130, 246, 0.15)",
							pointerEvents: "none",
						}}
					/>
				)}

				{/* Hover overlay - only show title when there's an image (FittedText already shows title) */}
				<Box
					style={{
						position: "absolute",
						inset: 0,
						background: image
							? "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)"
							: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)",
						display: "flex",
						flexDirection: "column",
						justifyContent: "flex-end",
						padding: "var(--mantine-spacing-sm)",
						opacity: isHovered ? 1 : 0,
						transition: "opacity 0.2s ease-in-out",
					}}
				>
					{image && (
						<Text size="sm" fw={600} c="white" lineClamp={1}>
							{displayName}
						</Text>
					)}
					<Text size="xs" c={image ? "gray.3" : "white"}>
						{itemCount.toLocaleString()} items
					</Text>
				</Box>
			</Box>
		</Card>
	);

	if (asFilter) {
		return (
			<UnstyledButton onClick={onToggle} w="100%">
				{cardContent}
			</UnstyledButton>
		);
	}

	return (
		<Link href={`/${TYPE_TO_PATH[type]}/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
			{cardContent}
		</Link>
	);
}
