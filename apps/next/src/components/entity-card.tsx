"use client";

import { resolveCdnUrl } from "@hobby-ninja/data";
import { Box, Card, Text, UnstyledButton } from "@mantine/core";
import Link from "next/link";

import { FittedText, ImageWithFallback } from "@/components/image-with-fallback";

interface EntityCardProps {
	id: string;
	name?: string | { ja: string; en?: string };
	itemIds?: string[];
	image?: string;
	type: "category" | "brand" | "series" | "grade" | "scale" | "year";
	asFilter?: boolean;
	isSelected?: boolean;
	onToggle?: () => void;
}

const TYPE_TO_PATH: Record<EntityCardProps["type"], string> = {
	category: "categories",
	brand: "brands",
	series: "series",
	grade: "grades",
	scale: "scales",
	year: "years",
};

const INNER_BORDER_RADIUS = "calc(var(--mantine-radius-md) - 2px)";

export function EntityCard({ id, name, itemIds, image, type, asFilter, isSelected, onToggle }: EntityCardProps): React.ReactElement {
	const displayName = typeof name === "string" ? name : (name?.en ?? name?.ja ?? type);
	const itemCount = itemIds?.length ?? 0;

	const cardContent = (
		<Card
			shadow="sm"
			padding={0}
			radius="md"
			withBorder={false}
			h="100%"
			style={{
				cursor: "pointer",
				border: isSelected ? "2px solid var(--mantine-color-blue-5)" : "2px solid transparent",
				borderRadius: "var(--mantine-radius-md)",
			}}
		>
			<Box
				style={{
					aspectRatio: "300 / 170",
					borderTopLeftRadius: INNER_BORDER_RADIUS,
					borderTopRightRadius: INNER_BORDER_RADIUS,
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
			</Box>

			{/* Item count section */}
			<Box
				style={{
					backgroundColor: isSelected ? "var(--mantine-color-blue-0)" : "var(--mantine-color-gray-0)",
					padding: "4px 8px",
					borderBottomLeftRadius: INNER_BORDER_RADIUS,
					borderBottomRightRadius: INNER_BORDER_RADIUS,
				}}
			>
				<Text size="xs" c="dimmed" ta="center">
					{itemCount.toLocaleString()}
				</Text>
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
