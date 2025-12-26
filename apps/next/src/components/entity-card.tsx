"use client";

import { resolveCdnUrl } from "@hobby-ninja/data";
import { Box, Card, Text } from "@mantine/core";
import Link from "next/link";
import { useState } from "react";

import { ImageWithFallback } from "@/components/image-with-fallback";

interface EntityCardProps {
	id: string;
	name?: string | { ja: string; en?: string };
	itemIds?: string[];
	image?: string;
	type: "category" | "brand" | "series";
}

const TYPE_TO_PATH: Record<EntityCardProps["type"], string> = {
	category: "categories",
	brand: "brands",
	series: "series",
};

export function EntityCard({ id, name, itemIds, image, type }: EntityCardProps): React.ReactElement {
	const [isHovered, setIsHovered] = useState(false);
	const displayName = typeof name === "string" ? name : (name?.en ?? name?.ja ?? type);
	const itemCount = itemIds?.length ?? 0;

	return (
		<Link href={`/${TYPE_TO_PATH[type]}/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				shadow="sm"
				padding={0}
				radius="md"
				withBorder={true}
				h="100%"
				style={{ cursor: "pointer" }}
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
						<Text size="xl" fw={600} c="dimmed" ta="center" p="md">
							{displayName}
						</Text>
					)}

					{/* Hover overlay */}
					<Box
						style={{
							position: "absolute",
							inset: 0,
							background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
							display: "flex",
							flexDirection: "column",
							justifyContent: "flex-end",
							padding: "var(--mantine-spacing-sm)",
							opacity: isHovered ? 1 : 0,
							transition: "opacity 0.2s ease-in-out",
						}}
					>
						<Text size="sm" fw={600} c="white" lineClamp={1}>
							{displayName}
						</Text>
						<Text size="xs" c="gray.3">
							{itemCount.toLocaleString()} items
						</Text>
					</Box>
				</Box>
			</Card>
		</Link>
	);
}
