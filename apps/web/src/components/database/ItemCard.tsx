/**
 * Item Card Component
 *
 * Individual item display card for the database grid.
 * Features multilingual support, lazy loading, and accessibility.
 */

import {
	Card,
	Image,
	Text,
	Badge,
	Group,
	ActionIcon,
	Tooltip,
	Skeleton,
	Box,
	Flex,
	Stack,
	useMantineTheme,
	rem,
} from "@mantine/core";
import { useHover } from "@mantine/hooks";
import {
	IconCheck,
	IconHeart,
	IconShare,
	IconEye,
	IconStar,
	IconPhotoOff,
	IconLink,
} from "@tabler/icons-react";
import React, { useState, useRef, useCallback } from "react";

import type { UnifiedItem, ManualItem, CatalogItem } from "../../services/dataService";

interface ItemCardProps {
  /** Item data from any source */
  item: UnifiedItem | ManualItem | CatalogItem;
  /** Item type for source identification */
  itemType: "unified" | "manual" | "catalog";
  /** Whether to show compact view */
  compact?: boolean;
  /** Selection state for bulk actions */
  selected?: boolean;
  /** Selection toggle callback */
  onSelect?: (itemId: string, selected: boolean) => void;
  /** View mode (grid or list) */
  viewMode?: "grid" | "list";
  /** Custom click handler */
  onClick?: (item: UnifiedItem | ManualItem | CatalogItem) => void;
  /** Loading state */
  loading?: boolean;
}

export function ItemCard({
	item,
	itemType,
	compact = false,
	selected = false,
	onSelect,
	viewMode = "grid",
	onClick,
	loading = false,
}: ItemCardProps) {
	const theme = useMantineTheme();
	const { hovered, ref: hoverRef } = useHover();
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);
	const [isFavorite, setIsFavorite] = useState(false);
	const imgRef = useRef<HTMLImageElement>(null);

	// Extract display name with fallbacks
	const getDisplayName = useCallback(() => {
		if (item.properties?.name) {
			const name = item.properties.name as { ja?: string; en?: string } | string;
			if (typeof name === "string") {
				return name;
			}
			return name.en || name.ja || "Unknown";
		}
		return item.id;
	}, [item]);

	// Extract series information
	const getSeries = useCallback(() => {
		if (item.properties?.series) {
			const series = item.properties.series as { ja?: string; en?: string } | string;
			if (typeof series === "string") {
				return series;
			}
			return series.en || series.ja;
		}
		return null;
	}, [item]);

	// Extract grade and scale
	const getGrade = useCallback(() => {
		if (itemType === "unified") {
			const properties = item.properties as UnifiedItem["properties"];
			return properties?.grade;
		}
		if (itemType === "manual") {
			const properties = item.properties as ManualItem["properties"];
			if (properties?.grade && "code" in properties.grade) {
				return properties.grade.code;
			}
		}
		// Catalog items don't have grade
		return undefined;
	}, [item, itemType]);

	const getScale = useCallback(() => {
		return item.properties?.scale as string;
	}, [item]);

	// Extract release date
	const getReleaseDate = useCallback(() => {
		if (item.properties?.releaseDate) {
			const date = item.properties.releaseDate;
			if (date && typeof date === "object") {
				if ("ja" in date && date.ja) {
					return date.ja;
				}
				if ("year" in date) {
					const year = date.year;
					const month = date.month;
					const day = date.day;
					if (month && day) {
						return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
					}
					return year.toString();
				}
			}
		}
		return null;
	}, [item]);

	// Get image source
	const getImageSrc = useCallback(() => {
		// For unified items, prioritize catalog images
		if (itemType === "unified") {
			const properties = item.properties as UnifiedItem["properties"];
			if (properties?.sources?.catalog) {
				// Try to get catalog image
				return `/data/bandai/items/${item.id}/image.jpg`;
			}
			if (properties?.sources?.manual) {
				// Try manual image
				return `/data/bandai/manuals/${item.id}/image.jpg`;
			}
		}

		// For catalog items - note: catalog items don't have images property in the schema
		if (itemType === "catalog") {
			const properties = item.properties as CatalogItem["properties"];
			// Catalog items don't have images property in schema, fall back to placeholder
			return null;
		}

		// For manual items, use product image or thumbnail image
		if (itemType === "manual") {
			const properties = item.properties as ManualItem["properties"];
			if (properties?.productImage) {
				return properties.productImage;
			}
			if (properties?.thumbnailImage) {
				return properties.thumbnailImage;
			}
		}

		return null;
	}, [item, itemType]);

	// Get source confidence for unified items
	const getMatchConfidence = useCallback(() => {
		if (itemType === "unified") {
			const properties = item.properties as UnifiedItem["properties"];
			if (properties?.matchStage !== undefined) {
				return properties.matchStage;
			}
		}
		return null;
	}, [item, itemType]);

	// Get source indicators
	const getSourceIndicators = useCallback(() => {
		if (itemType === "unified") {
			const properties = item.properties as UnifiedItem["properties"];
			return {
				hasCatalog: Boolean(properties?.sources?.catalog),
				hasManual: Boolean(properties?.sources?.manual),
			};
		}
		return {
			hasCatalog: itemType === "catalog",
			hasManual: itemType === "manual",
		};
	}, [item, itemType]);

	// Image loading handlers
	const handleImageLoad = useCallback(() => {
		setImageLoaded(true);
		setImageError(false);
	}, []);

	const handleImageError = useCallback(() => {
		setImageError(true);
		setImageLoaded(false);
	}, []);

	// Action handlers
	const handleCardClick = useCallback(() => {
		if (onClick && !loading) {
			onClick(item);
		}
	}, [onClick, item, loading]);

	const handleSelectToggle = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		if (onSelect) {
			onSelect(getItemId(item), !selected);
		}
	}, [onSelect, selected, item]);

	const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		setIsFavorite(!isFavorite);
	}, [isFavorite]);

	const handleShare = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		if (navigator.share) {
			navigator.share({
				title: getDisplayName(),
				text: `Check out this model: ${getDisplayName()}`,
				url: globalThis.location.href,
			});
		} else {
			// Fallback: copy to clipboard
			navigator.clipboard.writeText(globalThis.location.href);
		}
	}, [getDisplayName]);

	// Get unique item ID
	const getItemId = useCallback((itemData: any): string => {
		return itemData.id || itemData.title || "unknown";
	}, []);

	// Render confidence badge
	const renderConfidenceBadge = () => {
		const confidence = getMatchConfidence();
		if (!confidence) return null;

		let color = "gray";
		let label = "Unknown";

		if (confidence >= 4) {
			color = "green";
			label = "High";
		} else if (confidence >= 2) {
			color = "yellow";
			label = "Medium";
		} else {
			color = "red";
			label = "Low";
		}

		return (
			<Badge size="xs" color={color} variant="light">
				{label}
			</Badge>
		);
	};

	// Render source indicators
	const renderSourceIndicators = () => {
		const { hasCatalog, hasManual } = getSourceIndicators();

		return (
			<Group gap={4}>
				{hasCatalog && (
					<Tooltip label="Catalog data available">
						<Badge size="xs" color="blue" variant="light" leftSection={<IconLink size={10} />}>
              Cat
						</Badge>
					</Tooltip>
				)}
				{hasManual && (
					<Tooltip label="Manual data available">
						<Badge size="xs" color="orange" variant="light" leftSection={<IconLink size={10} />}>
              Man
						</Badge>
					</Tooltip>
				)}
			</Group>
		);
	};

	// Render skeleton loader
	if (loading) {
		return (
			<Card
				shadow="sm"
				padding="sm"
				radius="md"
				withBorder={true}
				h={compact ? 140 : "100%"}
			>
				<Stack gap="xs">
					<Skeleton height={compact ? 80 : 200} radius="md" />
					<Skeleton height={16} width="70%" radius="sm" />
					<Skeleton height={12} width="40%" radius="sm" />
					<Group gap="xs">
						<Skeleton height={16} width={40} radius="sm" />
						<Skeleton height={16} width={30} radius="sm" />
					</Group>
				</Stack>
			</Card>
		);
	}

	const displayName = getDisplayName();
	const series = getSeries();
	const grade = getGrade();
	const scale = getScale();
	const releaseDate = getReleaseDate();
	const imageSrc = getImageSrc();
	const { hasCatalog, hasManual } = getSourceIndicators();

	const isListMode = viewMode === "list";
	const cardHeight = isListMode ? "auto" : (compact ? 140 : "100%");

	return (
		<Card
			ref={hoverRef}
			shadow={hovered ? "md" : "sm"}
			padding={compact ? "xs" : "sm"}
			radius="md"
			withBorder={true}
			h={cardHeight}
			style={{
				cursor: onClick ? "pointer" : "default",
				transition: "all 0.2s ease",
				border: selected ? `2px solid ${theme.colors.blue[6]}` : undefined,
			}}
			onClick={handleCardClick}
			tabIndex={0}
			role="button"
			aria-label={`View details for ${displayName}`}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleCardClick();
				}
			}}
		>
			<Stack gap={compact ? "xs" : "sm"}>
				{/* Image Section */}
				<Box pos="relative" h={isListMode ? 80 : (compact ? 80 : 200)}>
					{!imageSrc || imageError ? (
						<Flex
							align="center"
							justify="center"
							h="100%"
							bg="gray.1"
							style={{
								border: `1px dashed ${theme.colors.gray[3]}`,
								borderRadius: theme.radius.md,
							}}
						>
							<IconPhotoOff size={rem(32)} color={theme.colors.gray[4]} />
						</Flex>
					) : (
						<Image
							ref={imgRef}
							src={imageSrc}
							alt={displayName}
							height="100%"
							fit="cover"
							radius="md"
							onLoad={handleImageLoad}
							onError={handleImageError}
							style={{
								display: imageLoaded ? "block" : "none",
							}}
							loading="lazy"
						/>
					)}

					{!imageLoaded && imageSrc && !imageError && (
						<Flex
							align="center"
							justify="center"
							h="100%"
							pos="absolute"
							top={0}
							left={0}
							right={0}
							bottom={0}
							bg="gray.1"
							style={{ borderRadius: theme.radius.md }}
						>
							<Skeleton height="100%" width="100%" radius="md" />
						</Flex>
					)}

					{/* Overlay badges */}
					{hovered && (
						<Group
							pos="absolute"
							top={8}
							right={8}
							gap={4}
							style={{ zIndex: 2 }}
						>
							{renderConfidenceBadge()}
						</Group>
					)}

					{/* Selection indicator */}
					{selected && (
						<Box
							pos="absolute"
							top={8}
							left={8}
							w={20}
							h={20}
							bg="blue.6"
							style={{
								borderRadius: "50%",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "white",
								fontSize: "12px",
								fontWeight: "bold",
							}}
						>
							<IconCheck size={12} />
						</Box>
					)}
				</Box>

				{/* Content Section */}
				<Stack gap="xs" style={{ flex: 1 }}>
					{/* Title */}
					<Text
						size={compact ? "sm" : "md"}
						fw={500}
						lineClamp={isListMode ? 1 : 2}
						style={{
							fontFamily: theme.fontFamily,
							minHeight: compact ? "1.2em" : "2.4em",
						}}
					>
						{displayName}
					</Text>

					{/* Metadata */}
					<Group gap="xs" wrap="nowrap">
						{grade && (
							<Badge size="xs" color="red" variant="light">
								{grade}
							</Badge>
						)}
						{scale && (
							<Badge size="xs" color="blue" variant="light">
								{scale}
							</Badge>
						)}
						{releaseDate && (
							<Text size="xs" c="dimmed">
								{releaseDate}
							</Text>
						)}
					</Group>

					{/* Series */}
					{series && (
						<Text
							size="xs"
							c="dimmed"
							lineClamp={1}
							style={{ minHeight: "1em" }}
						>
							{series}
						</Text>
					)}

					{/* Source indicators */}
					<Group justify="space-between" align="center">
						{renderSourceIndicators()}
						<Group gap={4}>
							{renderConfidenceBadge()}
						</Group>
					</Group>
				</Stack>

				{/* Action buttons */}
				{hovered && (
					<Group
						pos={isListMode ? "static" : "absolute"}
						bottom={isListMode ? "auto" : 8}
						right={isListMode ? "auto" : 8}
						gap={4}
						style={{
							...(isListMode ? {} : { zIndex: 2 }),
						}}
					>
						{onSelect && (
							<Tooltip label={selected ? "Deselect" : "Select"}>
								<ActionIcon
									size="sm"
									variant={selected ? "filled" : "light"}
									color="blue"
									onClick={handleSelectToggle}
								>
									<IconEye size={12} />
								</ActionIcon>
							</Tooltip>
						)}

						<Tooltip label={isFavorite ? "Remove from favorites" : "Add to favorites"}>
							<ActionIcon
								size="sm"
								variant={isFavorite ? "filled" : "light"}
								color={isFavorite ? "red" : "gray"}
								onClick={handleFavoriteToggle}
							>
								<IconHeart size={12} />
							</ActionIcon>
						</Tooltip>

						<Tooltip label="Share">
							<ActionIcon
								size="sm"
								variant="light"
								onClick={handleShare}
							>
								<IconShare size={12} />
							</ActionIcon>
						</Tooltip>
					</Group>
				)}
			</Stack>
		</Card>
	);
}

export default ItemCard;