"use client";

import { getNodeDisplayName, getNodeImages, getNodePrimaryGrade, resolveCdnUrl, type Item } from "@hobby-ninja/data";
import { Box, Card, SimpleGrid, Stack, Text } from "@mantine/core";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

function formatPrice(price?: { amount: number; currency: string }): string {
	if (!price) return "";
	return new Intl.NumberFormat("ja-JP", {
		style: "currency",
		currency: price.currency || "JPY",
	}).format(price.amount);
}

// First 12 images load eagerly (above the fold), rest lazy load
const EAGER_LOAD_COUNT = 12;

function ItemCard({ item, index }: { item: Item; index: number }): React.ReactElement {
	const [hasImageError, setHasImageError] = useState(false);
	const shouldLazyLoad = index >= EAGER_LOAD_COUNT;
	// Eager images start as "loaded" so they show immediately
	const [imageLoaded, setImageLoaded] = useState(!shouldLazyLoad);
	const images = getNodeImages(item);
	const displayName = getNodeDisplayName(item);
	const hasValidImage = !hasImageError && images.length > 0;

	return (
		<Link href={`/items/${item.id}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				shadow="sm"
				padding={0}
				radius="md"
				withBorder={true}
				h="100%"
				style={{ cursor: "pointer", overflow: "hidden" }}
				className="item-card-hover"
			>
				<Box
					bg="gray.1"
					style={{
						aspectRatio: "1 / 1",
						background: "linear-gradient(135deg, var(--mantine-color-gray-1) 0%, var(--mantine-color-gray-2) 100%)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						position: "relative",
					}}
				>
					{/* Always show placeholder text until image loads */}
					{(!imageLoaded || !hasValidImage) && (
						<Text
							size="lg"
							fw={600}
							c="dimmed"
							ta="center"
							p="md"
							style={{
								wordBreak: "break-word",
								position: hasValidImage ? "absolute" : "static",
								zIndex: 0,
							}}
						>
							{displayName}
						</Text>
					)}
					{hasValidImage && (
						<img
							src={resolveCdnUrl(images[0])}
							alt={displayName}
							loading={shouldLazyLoad ? "lazy" : "eager"}
							decoding="async"
							onLoad={() => { setImageLoaded(true); }}
							onError={() => { setHasImageError(true); }}
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
								position: "absolute",
								top: 0,
								left: 0,
								opacity: imageLoaded ? 1 : 0,
								transition: "opacity 0.2s ease-in-out",
								zIndex: 1,
							}}
						/>
					)}
				</Box>

				<Stack gap={4} p="sm">
					<Text size="sm" fw={600} lineClamp={2}>
						{displayName}
					</Text>

					<Badge size="xs" variant="light" color="blue">
						{getNodePrimaryGrade(item) ?? "N/A"}
					</Badge>

					{item.price && (
						<Text size="sm" fw={700} c="blue.6">
							{formatPrice(item.price)}
						</Text>
					)}
				</Stack>
			</Card>
		</Link>
	);
}

// Convert release date to comparable number (YYYYMMDD)
function releaseDateToNumber(releaseDate?: { year?: number | null; month?: number | null; day?: number | null }): number {
	if (!releaseDate?.year) return 0;
	const year = releaseDate.year;
	const month = releaseDate.month ?? 1;
	const day = releaseDate.day ?? 1;
	return year * 10_000 + month * 100 + day;
}

/** Special ID for filtering items with no category/series/brand */
export const OTHER_FILTER_ID = "__other__";

export interface FilterState {
	categories: string[];
	series: string[];
	brands: string[];
}

interface ExploreSectionProps {
	items: Item[];
	filters?: FilterState;
	totalCount?: number;
}

export function ExploreSection({ items, filters, totalCount }: ExploreSectionProps): React.ReactElement {
	// Filter items based on selected filters
	const filteredItems = useMemo(() => {
		if (!filters) return items;

		const hasActiveFilters =
			filters.categories.length > 0 ||
			filters.series.length > 0 ||
			filters.brands.length > 0;

		if (!hasActiveFilters) return items;

		return items.filter((item) => {
			// Check categories (OR within type)
			if (filters.categories.length > 0) {
				const itemCategoryIds = new Set(item.categories.map((c) => c.id));
				const hasOther = filters.categories.includes(OTHER_FILTER_ID);
				const hasNoCategories = item.categories.length === 0;
				const matchesCategory = filters.categories.some((id) => id !== OTHER_FILTER_ID && itemCategoryIds.has(id));
				if (!matchesCategory && !(hasOther && hasNoCategories)) {
					return false;
				}
			}

			// Check series (OR within type)
			if (filters.series.length > 0) {
				const itemSeriesIds = new Set(item.series.map((s) => s.id));
				const hasOther = filters.series.includes(OTHER_FILTER_ID);
				const hasNoSeries = item.series.length === 0;
				const matchesSeries = filters.series.some((id) => id !== OTHER_FILTER_ID && itemSeriesIds.has(id));
				if (!matchesSeries && !(hasOther && hasNoSeries)) {
					return false;
				}
			}

			// Check brands (OR within type)
			if (filters.brands.length > 0) {
				const itemBrandIds = new Set(item.brands.map((b) => b.id));
				const hasOther = filters.brands.includes(OTHER_FILTER_ID);
				const hasNoBrands = item.brands.length === 0;
				const matchesBrand = filters.brands.some((id) => id !== OTHER_FILTER_ID && itemBrandIds.has(id));
				if (!matchesBrand && !(hasOther && hasNoBrands)) {
					return false;
				}
			}

			return true;
		});
	}, [items, filters]);

	// Sort items by release date (newest first)
	const sortedItems = useMemo(
		() => [...filteredItems].toSorted((a, b) => releaseDateToNumber(b.releaseDate) - releaseDateToNumber(a.releaseDate)),
		[filteredItems],
	);

	const { visibleItems, isLoading, hasMore, loadMore, lastItemRef } = useInfiniteScroll({
		items: sortedItems,
		itemsPerPage: 24,
		autoLoad: true,
		rootMargin: "600px", // Load next batch well before reaching the bottom
	});

	const hasActiveFilters = filters && (
		filters.categories.length > 0 ||
		filters.series.length > 0 ||
		filters.brands.length > 0
	);

	return (
		<>
			{hasActiveFilters && (
				<Text size="sm" c="dimmed" mb="md">
					Showing {filteredItems.length.toLocaleString()} of {(totalCount ?? items.length).toLocaleString()} items
				</Text>
			)}
			<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
				{visibleItems.map((item, index) => {
					const isLast = index === visibleItems.length - 1;
					return (
						<Box key={item.id} ref={isLast ? lastItemRef : undefined}>
							<ItemCard item={item} index={index} />
						</Box>
					);
				})}
			</SimpleGrid>

			<InfiniteScrollLoader
				isLoading={isLoading}
				hasMore={hasMore}
				onLoadMore={loadMore}
				autoLoad={true}
			/>
		</>
	);
}
