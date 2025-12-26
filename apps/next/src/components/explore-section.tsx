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

function ItemCard({ item }: { item: Item }): React.ReactElement {
	const [hasImageError, setHasImageError] = useState(false);
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
					}}
				>
					{hasValidImage ? (
						<img
							src={resolveCdnUrl(images[0])}
							alt={displayName}
							onError={() => { setHasImageError(true); }}
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
							}}
						/>
					) : (
						<Text
							size="lg"
							fw={600}
							c="dimmed"
							ta="center"
							p="md"
							style={{ wordBreak: "break-word" }}
						>
							{displayName}
						</Text>
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
				if (!filters.categories.some((id) => itemCategoryIds.has(id))) {
					return false;
				}
			}

			// Check series (OR within type)
			if (filters.series.length > 0) {
				const itemSeriesIds = new Set(item.series.map((s) => s.id));
				if (!filters.series.some((id) => itemSeriesIds.has(id))) {
					return false;
				}
			}

			// Check brands (OR within type)
			if (filters.brands.length > 0) {
				const itemBrandIds = new Set(item.brands.map((b) => b.id));
				if (!filters.brands.some((id) => itemBrandIds.has(id))) {
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
							<ItemCard item={item} />
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
