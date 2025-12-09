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
	IconPhotoOff,
	IconLink,
} from "@tabler/icons-react";
import React, { useState, useRef, useCallback } from "react";

import {
	ZERO,
	ONE,
	TWO,
	THREE,
	FOUR,
	SIX,
	THIRTY,
	COMPACT_HEIGHT,
	THUMBNAIL_HEIGHT,
	SKELETON_HEIGHT,
	CONFIDENCE_THRESHOLD_HIGH,
	CONFIDENCE_THRESHOLD_MEDIUM,
	ICON_SIZE_XS,
	ICON_SIZE_SM,
	SELECTED_INDICATOR_SIZE,
	OVERLAY_OFFSET,
	REM_SIZE,
	SKELETON_SMALL_HEIGHT,
	SKELETON_LARGE_HEIGHT,
	PERCENTAGE_WIDTH_LARGE,
	PERCENTAGE_WIDTH_SMALL,
	FONT_WEIGHT_NORMAL,
} from "../../constants/index.js";
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
		const name = item.properties.name;
		if (!name) {
			return item.id;
		}
		if (typeof name === "string") {
			return name;
		}
		// Type guard for localized name object
		if (typeof name === "object" && name !== null) {
			const localizedName = name as { ja?: string; en?: string };
			return localizedName.en ?? localizedName.ja ?? "Unknown";
		}
		return "Unknown";
	}, [item.properties.name, item.id]);

	// Extract series information
	const getSeries = useCallback(() => {
		if (item.properties.series) {
			const series = item.properties.series;
			if (typeof series === "string") {
				return series;
			}
			// Type guard for localized series object
			if (typeof series === "object" && series !== null) {
				const localizedSeries = series as { ja?: string; en?: string };
				return localizedSeries.en ?? localizedSeries.ja;
			}
		}
		return null;
	}, [item]);

	// Extract grade and scale
	const getGrade = useCallback(() => {
		if (itemType === "unified") {
			const unifiedItem = item as UnifiedItem;
			return unifiedItem.properties.grade;
		}
		if (itemType === "manual") {
			const manualItem = item as ManualItem;
			if ("grade" in manualItem.properties && "code" in manualItem.properties.grade) {
				return manualItem.properties.grade.code;
			}
		}
		// Catalog items don't have grade
		return undefined;
	}, [item, itemType]);

	const getScale = useCallback(() => {
		return item.properties.scale;
	}, [item]);

	// Extract release date
	const getReleaseDate = useCallback(() => {
		const date = item.properties.releaseDate;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (date) {
			const year = date.year;
			const month = date.month;
			const day = date.day;
			return month && day ? `${year}-${month.toString().padStart(TWO, "ZERO")}-${day.toString().padStart(TWO, "ZERO")}` : year.toString();
		}
		return null;
	}, [item]);

	// Get unique item ID - moved before getImageSrc to fix circular dependency
	const getItemId = useCallback((itemData: UnifiedItem | ManualItem | CatalogItem): string => {
		return itemData.id ?? "unknown";
	}, []);

	// Get image source
	const getImageSrc = useCallback(() => {
		// For unified items, prioritize catalog images
		if (itemType === "unified") {
			const properties = item.properties as UnifiedItem["properties"];
			if (properties.sources.catalog) {
				// Try to get catalog image
				const itemId = getItemId(item);
				return `/data/bandai/items/${itemId}/image.jpg`;
			}
			if (properties.sources.manual) {
				// Try manual image
				const itemId = getItemId(item);
				return `/data/bandai/manuals/${itemId}/image.jpg`;
			}
		}

		// For catalog items - note: catalog items don't have images property in the schema
		if (itemType === "catalog") {
			// Catalog items don't have images property in schema, fall back to placeholder
			return null;
		}

		// For manual items, use product image or thumbnail image
		if (itemType === "manual") {
			const properties = item.properties as ManualItem["properties"];
			if (properties.productImage) {
				return properties.productImage;
			}
			if (properties.thumbnailImage) {
				return properties.thumbnailImage;
			}
		}

		return null;
	}, [item, itemType, getItemId]);

	// Get source confidence for unified items
	const getMatchConfidence = useCallback(() => {
		if (itemType === "unified") {
			const properties = item.properties as UnifiedItem["properties"];
			if (properties.matchStage !== undefined) {
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
				hasCatalog: Boolean(properties.sources.catalog),
				hasManual: Boolean(properties.sources.manual),
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
	}, [onSelect, selected, item, getItemId]);

	const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		setIsFavorite(!isFavorite);
	}, [isFavorite]);

	const handleShare = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		void (async () => {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, unicorn/prefer-ternary
			if (typeof navigator !== "undefined" && "share" in navigator && navigator.share) {
				await navigator.share({
					title: getDisplayName(),
					text: `Check out this model: ${getDisplayName() ?? "unknown model"}`,
					url: globalThis.location.href,
				});
			} else {
				await navigator.clipboard.writeText(globalThis.location.href);
			}
		})();
	}, [getDisplayName]);

	// Render confidence badge
	const renderConfidenceBadge = () => {
		const confidence = getMatchConfidence();
		if (!confidence) return null;

		let color = "gray";
		let label = "Unknown";

		if (confidence >= CONFIDENCE_THRESHOLD_HIGH) {
			color = "green";
			label = "High";
		} else if (confidence >= CONFIDENCE_THRESHOLD_MEDIUM) {
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
			<Group gap={FOUR}>
				{hasCatalog && (
					<Tooltip label="Catalog data available">
						<Badge size="xs" color="blue" variant="light" leftSection={<IconLink size={ICON_SIZE_XS} />}>
              Cat
						</Badge>
					</Tooltip>
				)}
				{hasManual && (
					<Tooltip label="Manual data available">
						<Badge size="xs" color="orange" variant="light" leftSection={<IconLink size={ICON_SIZE_XS} />}>
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
				h={compact ? COMPACT_HEIGHT : "HUNDRED%"}
			>
				<Stack gap="xs">
					<Skeleton height={compact ? THUMBNAIL_HEIGHT : SKELETON_HEIGHT} radius="md" />
					<Skeleton height={SKELETON_SMALL_HEIGHT} width={`${PERCENTAGE_WIDTH_LARGE}%`} radius="sm" />
					<Skeleton height={SKELETON_LARGE_HEIGHT} width="40%" radius="sm" />
					<Group gap="xs">
						<Skeleton height={SKELETON_SMALL_HEIGHT} width={PERCENTAGE_WIDTH_SMALL} radius="sm" />
						<Skeleton height={SKELETON_SMALL_HEIGHT} width={THIRTY} radius="sm" />
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

	const isListMode = viewMode === "list";
	const cardHeight = isListMode ? "auto" : (compact ? COMPACT_HEIGHT : "HUNDRED%");

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
				border: selected ? `2px solid ${theme.colors.blue[SIX]}` : undefined,
			}}
			onClick={handleCardClick}
			tabIndex={ZERO}
			role="button"
			aria-label={`View details for ${displayName ?? "unknown item"}`}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleCardClick();
				}
			}}
		>
			<Stack gap={compact ? "xs" : "sm"}>
				{/* Image Section */}
				<Box pos="relative" h={isListMode ? THUMBNAIL_HEIGHT : (compact ? THUMBNAIL_HEIGHT : SKELETON_HEIGHT)}>
					{!imageSrc || imageError ? (
						<Flex
							align="center"
							justify="center"
							h="100%"
							bg="gray.1"
							style={{
								border: `1px dashed ${theme.colors.gray[THREE]}`,
								borderRadius: theme.radius.md,
							}}
						>
							<IconPhotoOff size={rem(REM_SIZE)} color={theme.colors.gray[FOUR]} />
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
							top={ZERO}
							left={ZERO}
							right={ZERO}
							bottom={ZERO}
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
							top={OVERLAY_OFFSET}
							right={OVERLAY_OFFSET}
							gap={FOUR}
							style={{ zIndex: TWO }}
						>
							{renderConfidenceBadge()}
						</Group>
					)}

					{/* Selection indicator */}
					{selected && (
						<Box
							pos="absolute"
							top={OVERLAY_OFFSET}
							left={OVERLAY_OFFSET}
							w={SELECTED_INDICATOR_SIZE}
							h={SELECTED_INDICATOR_SIZE}
							bg="blue.6"
							style={{
								borderRadius: "50%",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "white",
								fontSize: `${ICON_SIZE_SM}px`,
								fontWeight: "bold",
							}}
						>
							<IconCheck size={ICON_SIZE_SM} />
						</Box>
					)}
				</Box>

				{/* Content Section */}
				<Stack gap="xs" style={{ flex: ONE }}>
					{/* Title */}
					<Text
						size={compact ? "sm" : "md"}
						fw={FONT_WEIGHT_NORMAL}
						lineClamp={isListMode ? ONE : TWO}
						style={{
							fontFamily: theme.fontFamily,
							minHeight: compact ? "ONE.2em" : "TWO.4em",
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
							lineClamp={ONE}
							style={{ minHeight: "1em" }}
						>
							{series}
						</Text>
					)}

					{/* Source indicators */}
					<Group justify="space-between" align="center">
						{renderSourceIndicators()}
						<Group gap={FOUR}>
							{renderConfidenceBadge()}
						</Group>
					</Group>
				</Stack>

				{/* Action buttons */}
				{hovered && (
					<Group
						pos={isListMode ? "static" : "absolute"}
						bottom={isListMode ? "auto" : OVERLAY_OFFSET}
						right={isListMode ? "auto" : OVERLAY_OFFSET}
						gap={FOUR}
						style={{
							...(isListMode ? {} : { zIndex: TWO }),
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
									<IconEye size={ICON_SIZE_SM} />
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
								<IconHeart size={ICON_SIZE_SM} />
							</ActionIcon>
						</Tooltip>

						<Tooltip label="Share">
							<ActionIcon
								size="sm"
								variant="light"
								onClick={handleShare}
							>
								<IconShare size={ICON_SIZE_SM} />
							</ActionIcon>
						</Tooltip>
					</Group>
				)}
			</Stack>
		</Card>
	);
}

