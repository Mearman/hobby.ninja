import {
	Card,
	Image,
	Title,
	Text,
	Badge,
	Group,
	Stack,
	Button,
	ActionIcon,
	Alert,
	Skeleton,
	SimpleGrid,
	Box,
	ThemeIcon,
	Progress,
	Divider,
	Tabs,
	ScrollArea,
} from "@mantine/core";
import {
	IconRefresh,
	IconInfoCircle,
	IconSearch,
	IconScale,
	IconStar,
	IconNetwork,
	IconComponents,
	IconCalendar,
} from "@tabler/icons-react";
import React, { useState, useEffect, useMemo } from "react";

import { dataService, type UnifiedItem, type ManualItem, type CatalogItem } from "../../services/dataService";

// Constants
const DEFAULT_MAX_ITEMS = 12;
const MAX_ITEMS_PER_CATEGORY = 8;
const VARIANT_ITEMS_LIMIT = 6;
const SIMILARITY_MIN_WORD_LENGTH = 3;
const VARIANT_NAME_COMPARE_LENGTH = 10;
const HIGH_SCORE_THRESHOLD = 0.7;
const MEDIUM_SCORE_THRESHOLD = 0.5;
const SCORE_MULTIPLIER = 100;
const TWO_YEARS_BACK = 2;
const TAB_LIST_MIN_LENGTH = 2;
const CARD_HEIGHT = 120;
const BADGE_POSITION = 8;
const SCROLL_AREA_MAX_HEIGHT = 600;

// Types for related items
interface RelatedItem {
  id: string;
  type: "unified" | "manual" | "catalog";
  name: string;
  grade?: string;
  scale?: string;
  series?: string;
  thumbnail?: string;
  relationType: "series" | "grade" | "scale" | "similarity" | "accessory" | "variant" | "recent";
  score: number; // 0-1, higher is more related
  reason: string;
}

// Type for items with type discriminator
type TypedItem = (UnifiedItem | ManualItem | CatalogItem) & {
  type: "unified" | "manual" | "catalog";
};

// Type guard for UnifiedItem - simplified since we can't guarantee type compatibility
function isUnifiedItem(item: TypedItem): boolean {
	return item.type === "unified";
}

// Helper to safely get item properties
const getItemProperties = (item: TypedItem): Record<string, unknown> | undefined => {
	return "properties" in item ? item.properties as Record<string, unknown> : undefined;
};

// Helper to safely access properties from unknown record
const getPropertySafely = <T = unknown>(props: Record<string, unknown> | undefined, key: string): T | undefined => {
	return props?.[key] as T | undefined;
};

// Type for series information
type SeriesInfo = string | { ja?: string; en?: string };

// Type for release date
type ReleaseDate = { year: number; month?: number; day?: number } | undefined;

// Helper function to safely access name
const getSafeName = (item: TypedItem): string => {
	if ("name" in item && item.name) {
		if (typeof item.name === "string") {
			return item.name;
		} else if (item.name.ja || item.name.en) {
			return item.name.ja || item.name.en || "Unknown";
		}
	}
	return "Unknown";
};

// Helper function to safely access series
const getSafeSeries = (series: SeriesInfo | undefined): string | undefined => {
	if (!series) return undefined;
	if (typeof series === "string") return series;
	return series.ja ?? series.en;
};

interface RelationType {
  id: RelatedItem["relationType"] | "all";
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  count?: number;
}

interface RelatedItemsProps {
  currentItem: UnifiedItem | ManualItem | CatalogItem;
  onItemClick?: (itemId: string) => void;
  maxItems?: number;
  showControls?: boolean;
}

const RELATION_TYPES: RelationType[] = [
	{
		id: "series",
		label: "Same Series",
		icon: <IconNetwork size={16} />,
		description: "Items from the same anime series",
		color: "blue",
	},
	{
		id: "grade",
		label: "Same Grade",
		icon: <IconScale size={16} />,
		description: "Items with the same grade level",
		color: "green",
	},
	{
		id: "scale",
		label: "Same Scale",
		icon: <IconScale size={16} />,
		description: "Items with the same scale ratio",
		color: "orange",
	},
	{
		id: "similarity",
		label: "Similar Items",
		icon: <IconStar size={16} />,
		description: "Items with similar characteristics",
		color: "purple",
	},
	{
		id: "variant",
		label: "Variants",
		icon: <IconComponents size={16} />,
		description: "Different versions or color schemes",
		color: "red",
	},
	{
		id: "recent",
		label: "Recent Releases",
		icon: <IconCalendar size={16} />,
		description: "Recently released items",
		color: "cyan",
	},
];

export const RelatedItems: React.FC<RelatedItemsProps> = ({
	currentItem,
	onItemClick,
	maxItems = DEFAULT_MAX_ITEMS,
	showControls = true,
}) => {
	const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<string>("all");
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Extract current item properties
	const currentItemProps = useMemo(() => {
		const extractName = (item: typeof currentItem): string => {
			if ("name" in item && typeof item.name === "object" && item.name !== null) {
				const nameObj = item.name as { ja?: string; en?: string };
				return nameObj.ja ?? nameObj.en ?? "Unknown";
			}
			if ("name" in item && typeof item.name === "string") {
				return item.name;
			}
			if ("title" in item && typeof item.title === "string") {
				return item.title;
			}
			return "Unknown";
		};

		const extractGrade = (item: typeof currentItem): string | undefined => {
			if ("grade" in item && item.grade) {
				return typeof item.grade === "string" ? item.grade : String(item.grade);
			}
			if (item.properties && "grade" in item.properties) {
				const grade = item.properties.grade;
				return typeof grade === "string" ? grade : String(grade);
			}
			return undefined;
		};

		const extractScale = (item: typeof currentItem): string | undefined => {
			if ("scale" in item && item.scale) {
				return typeof item.scale === "string" ? item.scale : String(item.scale);
			}
			if (item.properties && "scale" in item.properties) {
				const scale = item.properties.scale;
				return typeof scale === "string" ? scale : String(scale);
			}
			return undefined;
		};

		const extractSeries = (item: typeof currentItem): string | undefined => {
			if ("series" in item) {
				return getSafeSeries(item.series as SeriesInfo | undefined);
			}
			if (item.properties && "series" in item.properties) {
				return getSafeSeries(item.properties.series as SeriesInfo | undefined);
			}
			return undefined;
		};

		const extractReleaseDate = (item: typeof currentItem): ReleaseDate => {
			if ("releaseDate" in item) {
				return item.releaseDate as ReleaseDate;
			}
			if (item.properties && "releaseDate" in item.properties) {
				return item.properties.releaseDate as ReleaseDate;
			}
			return undefined;
		};

		const baseProps = {
			id: currentItem.id,
			name: extractName(currentItem),
			grade: extractGrade(currentItem),
			scale: extractScale(currentItem),
			series: extractSeries(currentItem),
			releaseDate: extractReleaseDate(currentItem),
		};

		// For unified items, extract additional source data
		if ("sources" in currentItem) {
			const unified = currentItem as UnifiedItem;
			return {
				...baseProps,
				matchMethod: unified.properties?.matchMethod,
				matchStage: unified.properties?.matchStage,
				hasManual: Boolean(unified.properties?.sources?.manual),
				hasCatalog: Boolean(unified.properties?.sources?.catalog),
			};
		}

		return baseProps;
	}, [currentItem]);

	// Load related items
	useEffect(() => {
		loadRelatedItems();
	}, [currentItem]);

	const loadRelatedItems = async () => {
		setLoading(true);
		setError(null);

		try {
			const items: RelatedItem[] = [];

			// Load items from different sources
			const [unifiedItems] = await Promise.all([
				dataService.getUnifiedItems(),
			]);
			const manualItems: ManualItem[] = [];
			const catalogItems: CatalogItem[] = [];

			// Get all available items
			const allItems: TypedItem[] = [
				...unifiedItems.map((item: UnifiedItem) => ({ ...item, type: "unified" as const })),
				...manualItems.map((item: ManualItem) => ({ ...item, type: "manual" as const })),
				...catalogItems.map((item: CatalogItem) => ({ ...item, type: "catalog" as const })),
			];

			// Filter out current item
			const filteredItems = allItems.filter(item => item.id !== currentItem.id);

			// Find related items by different criteria
			const relations = [
				...findSeriesRelated(filteredItems),
				...findGradeRelated(filteredItems),
				...findScaleRelated(filteredItems),
				...findSimilarItems(filteredItems),
				...findVariants(filteredItems),
				...findRecentReleases(filteredItems),
			];

			// Remove duplicates and sort by score
			const uniqueRelations = relations.reduce<RelatedItem[]>((acc, current) => {
				const existing = acc.find(item => item.id === current.id);
				if (!existing || current.score > existing.score) {
					return [...acc.filter(item => item.id !== current.id), current];
				}
				return acc;
			}, []);

			// Sort by score and limit results
			const sortedRelations = uniqueRelations
				.sort((a, b) => b.score - a.score)
				.slice(0, maxItems);

			setRelatedItems(sortedRelations);
		} catch (error_) {
			console.error("Failed to load related items:", error_);
			setError(error_ instanceof Error ? error_.message : "Failed to load related items");
		} finally {
			setLoading(false);
		}
	};

	// Find items from the same series
	const findSeriesRelated = (items: TypedItem[]): RelatedItem[] => {
		if (!currentItemProps.series) return [];

		const currentSeriesStr = getSafeSeries(currentItemProps.series) ?? "";

		return items
			.filter(item => {
				// Ensure item has valid ID
				if (!item.id) return false;

				let itemSeriesStr = "";
				if ("series" in item) {
					itemSeriesStr = getSafeSeries(item.series as SeriesInfo | undefined) ?? "";
				} else {
					const itemProps = getItemProperties(item);
					itemSeriesStr = getSafeSeries(getPropertySafely<SeriesInfo>(itemProps, 'series')) ?? "";
				}

				return itemSeriesStr && currentSeriesStr && (
					itemSeriesStr.toLowerCase() === currentSeriesStr.toLowerCase() ||
          itemSeriesStr.includes(currentSeriesStr) ||
          currentSeriesStr.includes(itemSeriesStr)
				);
			})
			.slice(0, MAX_ITEMS_PER_CATEGORY)
			.map(item => {
				let grade: string | undefined;
				let scale: string | undefined;
				let series: string | undefined;

				if ("grade" in item) {
					grade = item.grade as string | undefined;
				} else {
					const itemProps = getItemProperties(item);
					grade = getPropertySafely<string>(itemProps, 'grade');
				}

				if ("scale" in item) {
					scale = item.scale as string | undefined;
				} else {
					const itemProps = getItemProperties(item);
					scale = getPropertySafely<string>(itemProps, 'scale');
				}

				if ("series" in item) {
					series = getSafeSeries(item.series as SeriesInfo | undefined);
				} else {
					const itemProps = getItemProperties(item);
					series = getSafeSeries(getPropertySafely<SeriesInfo>(itemProps, 'series'));
				}

				return {
					id: item.id!,
					type: item.type,
					name: getSafeName(item),
					grade,
					scale,
					series,
					thumbnail: getThumbnail(item),
					relationType: "series" as const,
					score: 0.8,
					reason: `Same series: ${currentSeriesStr}`,
				} as RelatedItem;
			});
	};

	// Find items with the same grade
	const findGradeRelated = (items: TypedItem[]): RelatedItem[] => {
		if (!currentItemProps.grade) return [];

		return items
			.filter(item => {
				if (!item.id) return false;
				let itemGrade: string | undefined;

				if ("grade" in item) {
					itemGrade = item.grade as string | undefined;
				} else {
					const itemProps = getItemProperties(item);
					itemGrade = getPropertySafely<string>(itemProps, 'grade');
				}

				return itemGrade && itemGrade === currentItemProps.grade;
			})
			.slice(0, MAX_ITEMS_PER_CATEGORY)
			.map(item => {
				let grade: string | undefined;
				let scale: string | undefined;
				let series: string | undefined;

				if ("grade" in item) {
					grade = item.grade as string | undefined;
				} else {
					const itemProps = getItemProperties(item);
					grade = getPropertySafely<string>(itemProps, 'grade');
				}

				if ("scale" in item) {
					scale = item.scale as string | undefined;
				} else {
					const itemProps = getItemProperties(item);
					scale = getPropertySafely<string>(itemProps, 'scale');
				}

				if ("series" in item) {
					series = getSafeSeries(item.series as SeriesInfo | undefined);
				} else {
					const itemProps = getItemProperties(item);
					series = getSafeSeries(getPropertySafely<SeriesInfo>(itemProps, 'series'));
				}

				return {
					id: item.id!,
					type: item.type,
					name: getSafeName(item),
					grade,
					scale,
					series,
					thumbnail: getThumbnail(item),
					relationType: "grade" as const,
					score: 0.7,
					reason: `Same grade: ${currentItemProps.grade}`,
				} as RelatedItem;
			});
	};

	// Helper to extract item properties safely
	const extractItemProperties = (item: TypedItem) => {
		let grade: string | undefined;
		let scale: string | undefined;
		let series: string | undefined;

		if ("grade" in item) {
			grade = item.grade as string | undefined;
		} else {
			const itemProps = getItemProperties(item);
			grade = getPropertySafely<string>(itemProps, 'grade');
		}

		if ("scale" in item) {
			scale = item.scale as string | undefined;
		} else {
			const itemProps = getItemProperties(item);
			scale = getPropertySafely<string>(itemProps, 'scale');
		}

		if ("series" in item) {
			series = getSafeSeries(item.series as SeriesInfo | undefined);
		} else {
			const itemProps = getItemProperties(item);
			series = getSafeSeries(getPropertySafely<SeriesInfo>(itemProps, 'series'));
		}

		return { grade, scale, series };
	};

	// Find items with the same scale
	const findScaleRelated = (items: TypedItem[]): RelatedItem[] => {
		if (!currentItemProps.scale) return [];

		return items
			.filter(item => {
				if (!item.id) return false;
				let itemScale: string | undefined;

				if ("scale" in item) {
					itemScale = item.scale as string | undefined;
				} else {
					const itemProps = getItemProperties(item);
					itemScale = getPropertySafely<string>(itemProps, 'scale');
				}

				return itemScale && itemScale === currentItemProps.scale;
			})
			.slice(0, MAX_ITEMS_PER_CATEGORY)
			.map(item => {
				const { grade, scale, series } = extractItemProperties(item);
				return {
					id: item.id!,
					type: item.type,
					name: getSafeName(item),
					grade,
					scale,
					series,
					thumbnail: getThumbnail(item),
					relationType: "scale" as const,
					score: 0.6,
					reason: `Same scale: ${currentItemProps.scale}`,
				} as RelatedItem;
			});
	};

	// Find similar items based on name characteristics
	const findSimilarItems = (items: TypedItem[]): RelatedItem[] => {
		const currentName = currentItemProps.name.toLowerCase();

		return items
			.filter(item => {
				if (!item.id) return false;
				const itemName = getSafeName(item).toLowerCase();

				// Simple similarity check - items with similar words in names
				const currentWords = currentName.split(/\s+/);
				const itemWords = itemName.split(/\s+/);

				return currentWords.some((word: string) =>
					word.length > SIMILARITY_MIN_WORD_LENGTH && itemWords.some((itemWord: string) =>
						itemWord.includes(word) || word.includes(itemWord),
					),
				);
			})
			.slice(0, MAX_ITEMS_PER_CATEGORY)
			.map(item => {
				const { grade, scale, series } = extractItemProperties(item);
				return {
					id: item.id!,
					type: item.type,
					name: getSafeName(item),
					grade,
					scale,
					series,
					thumbnail: getThumbnail(item),
					relationType: "similarity" as const,
					score: 0.5,
					reason: "Similar characteristics",
				} as RelatedItem;
			});
	};

	// Find variants (this would need more sophisticated logic)
	const findVariants = (items: TypedItem[]): RelatedItem[] => {
		// Simple variant detection - similar names with different qualifiers
		const currentName = currentItemProps.name.toLowerCase();

		return items
			.filter(item => {
				if (!item.id) return false;
				const itemName = getSafeName(item).toLowerCase();

				// Check for variant indicators
				const variantPatterns = [
					/ver\./i, /version/i, /type/i, /custom/i, /clear/i,
					/metallic/i, /chrome/i, /special/i, /limited/i,
				];

				return (itemName.includes(currentName.slice(0, VARIANT_NAME_COMPARE_LENGTH)) || currentName.includes(itemName.slice(0, VARIANT_NAME_COMPARE_LENGTH))) &&
               (variantPatterns.some(pattern => pattern.test(itemName)) ||
                variantPatterns.some(pattern => pattern.test(currentName)));
			})
			.slice(0, VARIANT_ITEMS_LIMIT)
			.map(item => {
				const { grade, scale, series } = extractItemProperties(item);
				return {
					id: item.id!,
					type: item.type,
					name: getSafeName(item),
					grade,
					scale,
					series,
					thumbnail: getThumbnail(item),
					relationType: "variant" as const,
					score: 0.9,
					reason: "Variant or special edition",
				} as RelatedItem;
			});
	};

	// Find recent releases
	const findRecentReleases = (items: TypedItem[]): RelatedItem[] => {
		const currentYear = new Date().getFullYear();
		const twoYearsAgo = currentYear - TWO_YEARS_BACK;

		const getReleaseYear = (item: TypedItem): number => {
			let itemReleaseDate: ReleaseDate | undefined;

			if ("releaseDate" in item) {
				itemReleaseDate = item.releaseDate as ReleaseDate;
			} else {
				const itemProps = getItemProperties(item);
				itemReleaseDate = getPropertySafely<ReleaseDate>(itemProps, 'releaseDate');
			}

			return itemReleaseDate?.year ?? 0;
		};

		return items
			.filter(item => {
				if (!item.id) return false;
				const releaseYear = getReleaseYear(item);
				return releaseYear >= twoYearsAgo;
			})
			.sort((a, b): number => {
				const yearA = getReleaseYear(a);
				const yearB = getReleaseYear(b);
				return yearB - yearA;
			})
			.slice(0, MAX_ITEMS_PER_CATEGORY)
			.map(item => {
				const { grade, scale, series } = extractItemProperties(item);
				const releaseYear = getReleaseYear(item);
				return {
					id: item.id!,
					type: item.type,
					name: getSafeName(item),
					grade,
					scale,
					series,
					thumbnail: getThumbnail(item),
					relationType: "recent" as const,
					score: 0.4,
					reason: `Recent release (${releaseYear})`,
				} as RelatedItem;
			});
	};

	// Get thumbnail for item
	const getThumbnail = (item: TypedItem): string | undefined => {
		// Try different sources for thumbnails
		if (isUnifiedItem(item) && item.properties) {
			const props = item.properties as { sources?: { catalog?: { id: string }; manual?: { id: string } } };
			if (props.sources?.catalog) {
				return `/data/images/catalog/${props.sources.catalog.id}/thumb.jpg`;
			}
			if (props.sources?.manual) {
				return `/data/images/manual/${props.sources.manual.id}/thumb.jpg`;
			}
		}

		if ("images" in item && Array.isArray(item.images) && item.images.length > 0) {
			const firstImage = item.images[0];
			return typeof firstImage === "string" ? firstImage : undefined;
		}

		if ("assets" in item && item.assets) {
			const assets = item.assets as { thumbnails?: Array<{ src?: string }> };
			if (assets.thumbnails && assets.thumbnails.length > 0 && assets.thumbnails[0]?.src) {
				return assets.thumbnails[0].src;
			}
		}

		return undefined;
	};

	// Filter items by relation type
	const filteredItems = useMemo(() => {
		if (activeTab === "all") return relatedItems;
		return relatedItems.filter(item => item.relationType === activeTab);
	}, [relatedItems, activeTab]);

	// Refresh related items
	const handleRefresh = async () => {
		setRefreshing(true);
		await loadRelatedItems();
		setRefreshing(false);
	};

	// Handle item click
	const handleItemClick = (itemId: string) => {
		onItemClick?.(itemId);
	};

	if (loading) {
		return (
			<Card withBorder={true}>
				<Card.Section withBorder={true} inheritPadding={true} py="xs">
					<Group justify="space-between">
						<Title order={4}>Related Items</Title>
						{showControls && (
							<ActionIcon variant="subtle" loading={refreshing}>
								<IconRefresh size={16} />
							</ActionIcon>
						)}
					</Group>
				</Card.Section>
				<Card.Section p="md">
					<SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
						{Array.from({ length: 8 }).map((_, idx) => (
							<Card key={idx} withBorder={true} p="sm">
								<Skeleton height={120} mb="sm" />
								<Skeleton height={16} mb="xs" />
								<Skeleton height={12} width="60%" />
							</Card>
						))}
					</SimpleGrid>
				</Card.Section>
			</Card>
		);
	}

	if (error) {
		return (
			<Alert icon={<IconInfoCircle size={16} />} color="red" title="Error">
				{error}
			</Alert>
		);
	}

	if (relatedItems.length === 0) {
		return (
			<Card withBorder={true}>
				<Card.Section withBorder={true} inheritPadding={true} py="xs">
					<Group justify="space-between">
						<Title order={4}>Related Items</Title>
						{showControls && (
							<ActionIcon variant="subtle" onClick={handleRefresh} loading={refreshing}>
								<IconRefresh size={16} />
							</ActionIcon>
						)}
					</Group>
				</Card.Section>
				<Card.Section p="md">
					<Stack align="center" gap="sm">
						<ThemeIcon size="xl" variant="light" color="gray">
							<IconSearch size={24} />
						</ThemeIcon>
						<Text c="dimmed" ta="center">
              No related items found for this product
						</Text>
						<Button variant="outline" size="sm" onClick={handleRefresh} loading={refreshing}>
              Try Again
						</Button>
					</Stack>
				</Card.Section>
			</Card>
		);
	}

	// Get available relation types from items
	const availableTabs = useMemo(() => {
		const relationTypeSet = new Set(relatedItems.map(item => item.relationType));
		const filteredRelationTypes = RELATION_TYPES.filter(type =>
			relationTypeSet.has(type.id as RelatedItem["relationType"]),
		);

		return [
			{ id: "all", label: "All", count: relatedItems.length },
			...filteredRelationTypes.map(type => ({
				...type,
				count: relatedItems.filter(item => item.relationType === type.id).length,
			})),
		];
	}, [relatedItems]);

	return (
		<Card withBorder={true}>
			<Card.Section withBorder={true} inheritPadding={true} py="xs">
				<Group justify="space-between">
					<Title order={4}>Related Items</Title>
					{showControls && (
						<ActionIcon variant="subtle" onClick={handleRefresh} loading={refreshing}>
							<IconRefresh size={16} />
						</ActionIcon>
					)}
				</Group>
			</Card.Section>

			<Card.Section p="md">
				{/* Tabs for filtering */}
				{availableTabs.length > TAB_LIST_MIN_LENGTH && (
					<Tabs value={activeTab} onChange={(value) => { setActiveTab(value ?? "all"); }} mb="md">
						<Tabs.List>
							{availableTabs.map(tab => (
								<Tabs.Tab
									key={tab.id}
									value={tab.id}
									leftSection={"icon" in tab ? tab.icon : undefined}
									rightSection={
										<Badge size="xs" variant="light">
											{tab.count}
										</Badge>
									}
								>
									{tab.label}
								</Tabs.Tab>
							))}
						</Tabs.List>
					</Tabs>
				)}

				{/* Related items grid */}
				<ScrollArea.Autosize mah={SCROLL_AREA_MAX_HEIGHT} offsetScrollbars={true}>
					<SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
						{filteredItems.map((item) => (
							<Card
								key={item.id}
								withBorder={true}
								shadow="sm"
								style={{
									cursor: "pointer",
									transition: "all 0.2s ease",
								}}
								onClick={() => { handleItemClick(item.id); }}
								onMouseEnter={(e) => {
									e.currentTarget.style.transform = "translateY(-2px)";
									e.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.transform = "translateY(0)";
									e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
								}}
							>
								<Stack gap="xs">
									{/* Thumbnail */}
									<Box h={CARD_HEIGHT} pos="relative">
										{item.thumbnail ? (
											<Image
												src={item.thumbnail}
												alt={item.name}
												h={CARD_HEIGHT}
												fit="cover"
												radius="sm"
											/>
										) : (
											<Box
												h={CARD_HEIGHT}
												bg="var(--mantine-color-gray-0)"
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													borderRadius: "var(--mantine-radius-sm)",
												}}
											>
												<ThemeIcon color="gray" variant="light" size="lg">
													<IconSearch size={20} />
												</ThemeIcon>
											</Box>
										)}

										{/* Relation badge */}
										<Badge
											pos="absolute"
											top={BADGE_POSITION}
											right={BADGE_POSITION}
											size="xs"
											variant="light"
											color={RELATION_TYPES.find(t => t.id === item.relationType)?.color ?? "gray"}
										>
											{item.relationType}
										</Badge>

										{/* Score indicator */}
										{item.score > HIGH_SCORE_THRESHOLD && (
											<Badge
												pos="absolute"
												top={BADGE_POSITION}
												left={BADGE_POSITION}
												size="xs"
												color="green"
												variant="filled"
											>
												<IconStar size={10} />
											</Badge>
										)}
									</Box>

									{/* Item info */}
									<Stack gap={2}>
										<Text size="sm" fw={500} lineClamp={2}>
											{item.name}
										</Text>

										<Group gap="xs" wrap="nowrap">
											{item.grade && (
												<Badge size="xs" variant="light" color="blue">
													{item.grade}
												</Badge>
											)}
											{item.scale && (
												<Badge size="xs" variant="light" color="orange">
													{item.scale}
												</Badge>
											)}
										</Group>

										{item.series && (
											<Text size="xs" c="dimmed" truncate={true}>
												{item.series}
											</Text>
										)}

										{/* Relation reason */}
										<Group gap="xs" wrap="nowrap">
											<ThemeIcon size="xs" variant="light" color="gray">
												<IconInfoCircle size={10} />
											</ThemeIcon>
											<Text size="xs" c="dimmed" truncate={true}>
												{item.reason}
											</Text>
										</Group>

										{/* Match quality */}
										<Progress
											value={item.score * SCORE_MULTIPLIER}
											size="xs"
											color={item.score > HIGH_SCORE_THRESHOLD ? "green" : (item.score > MEDIUM_SCORE_THRESHOLD ? "yellow" : "gray")}
										/>
									</Stack>
								</Stack>
							</Card>
						))}
					</SimpleGrid>
				</ScrollArea.Autosize>

				{/* Show more button */}
				{filteredItems.length > 0 && (
					<Divider my="md" />
				)}

				<Group justify="center" mt="md">
					<Text size="sm" c="dimmed">
            Showing {filteredItems.length} of {relatedItems.length} related items
					</Text>
				</Group>
			</Card.Section>
		</Card>
	);
};