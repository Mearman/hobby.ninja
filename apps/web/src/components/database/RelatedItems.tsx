import {
	Card,
	Grid,
	Image,
	Title,
	Text,
	Badge,
	Group,
	Stack,
	Button,
	ActionIcon,
	Tooltip,
	Alert,
	Skeleton,
	SimpleGrid,
	Box,
	Anchor,
	ThemeIcon,
	Progress,
	Divider,
	Tabs,
	ScrollArea,
} from "@mantine/core";
import {
	IconArrowRight,
	IconRefresh,
	IconInfoCircle,
	IconExternalLink,
	IconClock,
	IconSearch,
	IconScale,
	IconStar,
	IconTrendingUp,
	IconNetwork,
	IconComponents,
	IconCalendar,
} from "@tabler/icons-react";
import React, { useState, useEffect, useMemo } from "react";

import { dataService, type UnifiedItem, type ManualItem, type CatalogItem } from "../../services/dataService";

import { ItemCard } from "./ItemCard";

// Types for related items
interface RelatedItem {
  id: string;
  type: "unified" | "manual" | "catalog";
  name: string;
  grade?: string;
  scale?: string;
  series?: string;
  thumbnail?: string;
  relationType: "series" | "grade" | "scale" | "similarity" | "accessory" | "variant";
  score: number; // 0-1, higher is more related
  reason: string;
}

interface RelationType {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
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
	maxItems = 12,
	showControls = true,
}) => {
	const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<string>("all");
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Extract current item properties
	const currentItemProps = useMemo(() => {
		const baseProps = {
			id: currentItem.id,
			name: "name" in currentItem
				? (typeof currentItem.name === "object" && currentItem.name !== null
					? (currentItem.name.ja || currentItem.name.en)
					: currentItem.name)
				: "Unknown",
			grade: ("grade" in currentItem && currentItem.grade) ||
              (currentItem.$type === "unified_item" && currentItem.properties?.grade) ||
              (currentItem.$type === "manual_item" && currentItem.properties?.grade),
			scale: ("scale" in currentItem && currentItem.scale) ||
              (currentItem.$type === "catalog_item" && currentItem.properties?.scale) ||
              (currentItem.$type === "unified_item" && currentItem.properties?.scale) ||
              (currentItem.$type === "manual_item" && currentItem.properties?.scale),
			series: (("series" in currentItem && typeof currentItem.series === "object" && currentItem.series !== null)
				? ((currentItem.series as { ja?: string; en?: string }).ja || (currentItem.series as { ja?: string; en?: string }).en)
				: (currentItem.properties?.series && typeof currentItem.properties.series === "object"
					? ((currentItem.properties.series as { ja?: string; en?: string }).ja || (currentItem.properties.series as { ja?: string; en?: string }).en)
					: currentItem.properties?.series)),
			releaseDate: ("releaseDate" in currentItem ? currentItem.releaseDate : currentItem.properties?.releaseDate),
		};

		// For unified items, extract additional source data
		if (currentItem.$type === "unified_item") {
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
			const allItems = [
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
	const findSeriesRelated = (items: any[]): RelatedItem[] => {
		if (!currentItemProps.series) return [];

		const currentSeriesStr = typeof currentItemProps.series === "string"
			? currentItemProps.series
			: (currentItemProps.series.ja || currentItemProps.series.en || "");

		return items
			.filter(item => {
				const itemSeriesRaw = "series" in item
					? (item.series?.ja || item.series?.en)
					: ("metadata" in item ? item.metadata?.product?.series : undefined);

				const itemSeriesStr = typeof itemSeriesRaw === "string"
					? itemSeriesRaw
					: (itemSeriesRaw?.ja || itemSeriesRaw?.en || "");

				return itemSeriesStr && currentSeriesStr && (
					itemSeriesStr.toLowerCase() === currentSeriesStr.toLowerCase() ||
          itemSeriesStr.includes(currentSeriesStr) ||
          currentSeriesStr.includes(itemSeriesStr)
				);
			})
			.slice(0, 8)
			.map(item => ({
				id: item.id,
				type: item.type,
				name: "name" in item ? (item.name.ja || item.name.en || item.name) : item.title,
				grade: ("grade" in item && item.grade) || ("metadata" in item && item.metadata?.product?.grade),
				scale: ("scale" in item && item.scale) || ("metadata" in item && item.metadata?.product?.scale),
				series: ("series" in item && (item.series?.ja || item.series?.en)) ||
                ("metadata" in item && item.metadata?.product?.series),
				thumbnail: getThumbnail(item),
				relationType: "series" as const,
				score: 0.8,
				reason: `Same series: ${currentItemProps.series}`,
			}));
	};

	// Find items with the same grade
	const findGradeRelated = (items: any[]): RelatedItem[] => {
		if (!currentItemProps.grade) return [];

		return items
			.filter(item => {
				const itemGrade = "grade" in item ? item.grade :
					("metadata" in item ? item.metadata?.product?.grade : undefined);
				return itemGrade && itemGrade === currentItemProps.grade;
			})
			.slice(0, 8)
			.map(item => ({
				id: item.id,
				type: item.type,
				name: "name" in item ? (item.name.ja || item.name.en || item.name) : item.title,
				grade: ("grade" in item && item.grade) || ("metadata" in item && item.metadata?.product?.grade),
				scale: ("scale" in item && item.scale) || ("metadata" in item && item.metadata?.product?.scale),
				series: ("series" in item && (item.series?.ja || item.series?.en)) ||
                ("metadata" in item && item.metadata?.product?.series),
				thumbnail: getThumbnail(item),
				relationType: "grade" as const,
				score: 0.7,
				reason: `Same grade: ${currentItemProps.grade}`,
			}));
	};

	// Find items with the same scale
	const findScaleRelated = (items: any[]): RelatedItem[] => {
		if (!currentItemProps.scale) return [];

		return items
			.filter(item => {
				const itemScale = "scale" in item ? item.scale :
					("metadata" in item ? item.metadata?.product?.scale : undefined);
				return itemScale && itemScale === currentItemProps.scale;
			})
			.slice(0, 8)
			.map(item => ({
				id: item.id,
				type: item.type,
				name: "name" in item ? (item.name.ja || item.name.en || item.name) : item.title,
				grade: ("grade" in item && item.grade) || ("metadata" in item && item.metadata?.product?.grade),
				scale: ("scale" in item && item.scale) || ("metadata" in item && item.metadata?.product?.scale),
				series: ("series" in item && (item.series?.ja || item.series?.en)) ||
                ("metadata" in item && item.metadata?.product?.series),
				thumbnail: getThumbnail(item),
				relationType: "scale" as const,
				score: 0.6,
				reason: `Same scale: ${currentItemProps.scale}`,
			}));
	};

	// Find similar items based on name characteristics
	const findSimilarItems = (items: any[]): RelatedItem[] => {
		const currentName = (currentItemProps.name || "").toLowerCase();

		return items
			.filter(item => {
				const itemName = "name" in item
					? (item.name.ja || item.name.en || item.name).toLowerCase()
					: item.title.toLowerCase();

				// Simple similarity check - items with similar words in names
				const currentWords = currentName.split(/\s+/);
				const itemWords = itemName.split(/\s+/);

				return currentWords.some((word: string) =>
					word.length > 2 && itemWords.some((itemWord: string) =>
						itemWord.includes(word) || word.includes(itemWord),
					),
				);
			})
			.slice(0, 8)
			.map(item => ({
				id: item.id,
				type: item.type,
				name: "name" in item ? (item.name.ja || item.name.en || item.name) : item.title,
				grade: ("grade" in item && item.grade) || ("metadata" in item && item.metadata?.product?.grade),
				scale: ("scale" in item && item.scale) || ("metadata" in item && item.metadata?.product?.scale),
				series: ("series" in item && (item.series?.ja || item.series?.en)) ||
                ("metadata" in item && item.metadata?.product?.series),
				thumbnail: getThumbnail(item),
				relationType: "similarity" as const,
				score: 0.5,
				reason: "Similar characteristics",
			}));
	};

	// Find variants (this would need more sophisticated logic)
	const findVariants = (items: any[]): RelatedItem[] => {
		// Simple variant detection - similar names with different qualifiers
		const currentName = (currentItemProps.name || "").toLowerCase();

		return items
			.filter(item => {
				const itemName = "name" in item
					? (item.name.ja || item.name.en || item.name).toLowerCase()
					: item.title.toLowerCase();

				// Check for variant indicators
				const variantPatterns = [
					/ver\./i, /version/i, /type/i, /custom/i, /clear/i,
					/metallic/i, /chrome/i, /special/i, /limited/i,
				];

				return (itemName.includes(currentName.slice(0, 10)) || currentName.includes(itemName.slice(0, 10))) &&
               (variantPatterns.some(pattern => pattern.test(itemName)) ||
                variantPatterns.some(pattern => pattern.test(currentName)));
			})
			.slice(0, 6)
			.map(item => ({
				id: item.id,
				type: item.type,
				name: "name" in item ? (item.name.ja || item.name.en || item.name) : item.title,
				grade: ("grade" in item && item.grade) || ("metadata" in item && item.metadata?.product?.grade),
				scale: ("scale" in item && item.scale) || ("metadata" in item && item.metadata?.product?.scale),
				series: ("series" in item && (item.series?.ja || item.series?.en)) ||
                ("metadata" in item && item.metadata?.product?.series),
				thumbnail: getThumbnail(item),
				relationType: "variant" as const,
				score: 0.9,
				reason: "Variant or special edition",
			}));
	};

	// Find recent releases
	const findRecentReleases = (items: any[]): RelatedItem[] => {
		const currentYear = new Date().getFullYear();
		const twoYearsAgo = currentYear - 2;

		return items
			.filter(item => {
				const releaseYear = "releaseDate" in item ? item.releaseDate?.year :
					("metadata" in item ? item.metadata?.product?.releaseDate?.year : undefined);
				return releaseYear && releaseYear >= twoYearsAgo;
			})
			.sort((a, b) => {
				const yearA = "releaseDate" in a ? a.releaseDate?.year :
					("metadata" in a ? a.metadata?.product?.releaseDate?.year : 0);
				const yearB = "releaseDate" in b ? b.releaseDate?.year :
					("metadata" in b ? b.metadata?.product?.releaseDate?.year : 0);
				return (yearB || 0) - (yearA || 0);
			})
			.slice(0, 8)
			.map(item => ({
				id: item.id,
				type: item.type,
				name: "name" in item ? (item.name.ja || item.name.en || item.name) : item.title,
				grade: ("grade" in item && item.grade) || ("metadata" in item && item.metadata?.product?.grade),
				scale: ("scale" in item && item.scale) || ("metadata" in item && item.metadata?.product?.scale),
				series: ("series" in item && (item.series?.ja || item.series?.en)) ||
                ("metadata" in item && item.metadata?.product?.series),
				thumbnail: getThumbnail(item),
				relationType: "similarity" as const,
				score: 0.4,
				reason: `Recent release (${("releaseDate" in item ? item.releaseDate?.year :
					("metadata" in item ? item.metadata?.product?.releaseDate?.year : 0))})`,
			}));
	};

	// Get thumbnail for item
	const getThumbnail = (item: any): string | undefined => {
		// Try different sources for thumbnails
		if ("sources" in item) {
			const unified = item as UnifiedItem;
			if (unified.properties?.sources?.catalog) {
				return `/data/images/catalog/${unified.properties.sources.catalog.id}/thumb.jpg`;
			}
			if (unified.properties?.sources?.manual) {
				return `/data/images/manual/${unified.properties.sources.manual.id}/thumb.jpg`;
			}
		}

		if ("images" in item && Array.isArray(item.images) && item.images.length > 0) {
			return item.images[0];
		}

		if ("assets" in item && item.assets?.thumbnails?.length > 0) {
			return item.assets.thumbnails[0].src;
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
		const tabs = new Set(relatedItems.map(item => item.relationType));
		return [
			{ id: "all", label: "All", count: relatedItems.length },
			...RELATION_TYPES.filter(type => tabs.has(type.id as any)).map(type => ({
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
				{availableTabs.length > 2 && (
					<Tabs value={activeTab} onChange={(value) => { setActiveTab(value || "all"); }} mb="md">
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
				<ScrollArea.Autosize mah={600} offsetScrollbars={true}>
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
									<Box h={120} pos="relative">
										{item.thumbnail ? (
											<Image
												src={item.thumbnail}
												alt={item.name}
												h={120}
												fit="cover"
												radius="sm"
											/>
										) : (
											<Box
												h={120}
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
											top={8}
											right={8}
											size="xs"
											variant="light"
											color={RELATION_TYPES.find(t => t.id === item.relationType)?.color || "gray"}
										>
											{item.relationType}
										</Badge>

										{/* Score indicator */}
										{item.score > 0.7 && (
											<Badge
												pos="absolute"
												top={8}
												left={8}
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
											value={item.score * 100}
											size="xs"
											color={item.score > 0.7 ? "green" : (item.score > 0.5 ? "yellow" : "gray")}
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