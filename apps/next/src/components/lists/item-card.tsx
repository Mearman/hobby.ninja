"use client";

import { type Item, getNodeDisplayName, getNodeImages, getNodePrimaryGrade, getNodeReleaseDate, isItem, resolveCdnUrl } from "@hobby-ninja/data";
import {
	Badge,
	Box,
	Card,
	Group,
	Table,
	Text,
	Title,
} from "@mantine/core";

import type { ViewMode } from "./types";

import { CustomImage } from "@/components/ui/custom-image";
import { EntityList } from "@/components/ui/entity-list";
import { ImageScrubber } from "@/components/ui/image-scrubber";
import { RelationshipBadge } from "@/components/ui/relationship-badge";
import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";
import { itemHasManual } from "@/lib/relationship-utils";
import {
	itemCard,
	itemCardBadge,
	itemCardImage,
	itemCardContent,
	itemCardMetadata,
	itemCardSubtitle,
	itemCardTitle,
} from "@/styles/components.css";

interface ItemCardProps {
	item: Item;
	viewMode: ViewMode;
}

/**
 * Item card component that adapts its rendering based on the view mode.
 * Supports grid, list, and table views with consistent styling.
 */
export function ItemCard({ item, viewMode }: ItemCardProps) {
	if (!isItem(item)) return null;

	const primaryImage = item.displayImage ? resolveCdnUrl(item.displayImage) : null;
	const allImages = getNodeImages(item).map(img => resolveCdnUrl(img));
	// Use all images if available, otherwise fall back to displayImage
	const images = allImages.length > 0 ? allImages : (primaryImage ? [primaryImage] : []);
	const placeholderSrc = createPlaceholderSvg(getNodeDisplayName(item));
	const errorPlaceholderSrc = createErrorPlaceholderSvg();
	const releaseDate = getNodeReleaseDate(item);

	// Grid view: compact card with image on top
	if (viewMode === "grid") {
		return (
			<Card
				component="a"
				href={`/items/${item.id}`}
				p={0}
				radius="md"
				className={itemCard}
				withBorder={true}
			>
				<Box className={itemCardImage} style={{ position: "relative" }}>
					<ImageScrubber
						images={images}
						alt={getNodeDisplayName(item)}
						height={200}
						placeholderSrc={placeholderSrc}
						fallbackSrc={errorPlaceholderSrc}
					/>
					{itemHasManual(item) && (
						<div style={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
							<RelationshipBadge type="manual" viewMode="grid" />
						</div>
					)}
				</Box>
				<Box className={itemCardContent}>
					<Text className={itemCardTitle} lineClamp={2}>
						{getNodeDisplayName(item)}
					</Text>
					{item.series.length > 0 && (
						<Text className={itemCardSubtitle} lineClamp={1}>
							<EntityList ids={item.series.map(s => s.id)} entityType="series" mode="text" size="xs" emptyText="" />
						</Text>
					)}
					<Box className={itemCardMetadata}>
						{releaseDate && (
							<Badge className={itemCardBadge} variant="light" color="gray">
								{releaseDate}
							</Badge>
						)}
						{getNodePrimaryGrade(item) && (
							<Badge className={itemCardBadge} variant="light">
								{getNodePrimaryGrade(item)}
							</Badge>
						)}
						{item.scale && (
							<Badge className={itemCardBadge} variant="light">
								{item.scale}
							</Badge>
						)}
						<EntityList ids={item.brands.map(b => b.id)} entityType="brand" size="xs" clickable={false} />
					</Box>
				</Box>
			</Card>
		);
	}

	// List view: horizontal card with more details
	if (viewMode === "list") {
		return (
			<Card
				component="a"
				href={`/items/${item.id}`}
				p="md"
				radius="md"
				withBorder={true}
				style={{ textDecoration: "none", color: "inherit" }}
			>
				<Group gap="md" align="flex-start">
					<Box w={80} style={{ flexShrink: 0 }}>
						<CustomImage
							src={primaryImage ?? placeholderSrc}
							alt={getNodeDisplayName(item)}
							fit="cover"
							height={80}
							fallbackSrc={errorPlaceholderSrc}
						/>
					</Box>
					<Box flex={1}>
						<Title order={4} mb="xs">
							{getNodeDisplayName(item)}
						</Title>
						{item.series.length > 0 && (
							<Box mb="sm">
								<EntityList ids={item.series.map(s => s.id)} entityType="series" mode="text" size="sm" emptyText="" />
							</Box>
						)}
						<Group gap="xs">
							{releaseDate && (
								<Badge variant="light" size="sm" color="gray">
									{releaseDate}
								</Badge>
							)}
							{getNodePrimaryGrade(item) && (
								<Badge variant="light" size="sm">
									{getNodePrimaryGrade(item)}
								</Badge>
							)}
							{item.scale && (
								<Badge variant="light" size="sm">
									{item.scale}
								</Badge>
							)}
							{itemHasManual(item) && (
								<RelationshipBadge type="manual" viewMode="list" />
							)}
							<EntityList ids={item.brands.map(b => b.id)} entityType="brand" size="sm" clickable={false} />
						</Group>
					</Box>
				</Group>
			</Card>
		);
	}

	// Table view: table row with structured data
	// Note: In table mode, this returns a Table.Tr instead of a Card
	return (
		<Table.Tr>
			<Table.Td>
				<Box
					component="a"
					href={`/items/${item.id}`}
					style={{ textDecoration: "none", color: "inherit", display: "block" }}
				>
					<Group gap="sm" align="center">
						<Box w={40} h={40}>
							<CustomImage
								src={primaryImage ?? placeholderSrc}
								alt={getNodeDisplayName(item)}
								fit="cover"
								height={40}
								fallbackSrc={errorPlaceholderSrc}
							/>
						</Box>
						<Text size="sm" fw={500}>
							{getNodeDisplayName(item)}
						</Text>
						{itemHasManual(item) && (
							<RelationshipBadge type="manual" viewMode="table" />
						)}
					</Group>
				</Box>
			</Table.Td>
			<Table.Td c="dimmed">{releaseDate ?? "-"}</Table.Td>
			<Table.Td><EntityList ids={item.series.map(s => s.id)} entityType="series" size="sm" /></Table.Td>
			<Table.Td>{getNodePrimaryGrade(item) ?? "-"}</Table.Td>
			<Table.Td>{item.scale ?? "-"}</Table.Td>
			<Table.Td>
				<EntityList ids={item.brands.map(b => b.id)} entityType="brand" size="sm" />
			</Table.Td>
		</Table.Tr>
	);
}
