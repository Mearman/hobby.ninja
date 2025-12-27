"use client";

import { getNodeDisplayName, getNodeImages, getNodePrimaryGrade, itemHasGrade, resolveCdnUrl, type Item } from "@hobby-ninja/data";
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

// First page of images load eagerly to avoid lazy loading issues for visible items
// Native loading="lazy" can fail for images already in viewport at render time
const EAGER_LOAD_COUNT = 24;

function ItemCard({ item, index }: { item: Item; index: number }): React.ReactElement {
	const [hasImageError, setHasImageError] = useState(false);
	// First batch loads eagerly for fastest initial paint
	// Subsequent batches still use eager loading since native lazy doesn't work reliably
	// for dynamically-added images near the viewport
	const isFirstBatch = index < EAGER_LOAD_COUNT;
	const [imageLoaded, setImageLoaded] = useState(isFirstBatch);
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
							loading="eager"
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

/** P-Bandai child brand IDs - "pb" filter matches any of these */
const PBANDAI_CHILD_IDS = ["pb_gunpla", "pb_hg", "pb_mg", "pb_rg", "pb_pg", "pb_bb", "pb_others", "pb_charapla"];

export interface FilterState {
	categories: string[];
	series: string[];
	brands: string[];
	grades: string[];
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
			filters.brands.length > 0 ||
			filters.grades.length > 0;

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
			// Special handling: "pb" filter matches any pb_* brand
			if (filters.brands.length > 0) {
				const itemBrandIds = new Set(item.brands.map((b) => b.id));
				const hasOther = filters.brands.includes(OTHER_FILTER_ID);
				const hasNoBrands = item.brands.length === 0;

				// Check if "pb" is selected and item has any P-Bandai brand
				const pbSelected = filters.brands.includes("pb");
				const hasPbandaiBrand = pbSelected && PBANDAI_CHILD_IDS.some((id) => itemBrandIds.has(id));

				// Check other selected brands (excluding "pb" and OTHER_FILTER_ID)
				const matchesBrand = filters.brands.some((id) =>
					id !== OTHER_FILTER_ID && id !== "pb" && itemBrandIds.has(id),
				);

				if (!matchesBrand && !hasPbandaiBrand && !(hasOther && hasNoBrands)) {
					return false;
				}
			}

			// Check grades (OR within type)
			if (filters.grades.length > 0) {
				const hasOther = filters.grades.includes(OTHER_FILTER_ID);
				const hasNoGrade = Object.keys(item.grades).length === 0;

				if (hasNoGrade) {
					if (!hasOther) return false;
				} else {
					// Check if item has any of the selected grades (root or specific variant)
					const matchesGrade = filters.grades.some((selectedGradeId) => {
						if (selectedGradeId === OTHER_FILTER_ID) return false;
						return itemHasGrade(item, selectedGradeId);
					});
					if (!matchesGrade) return false;
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
		filters.brands.length > 0 ||
		filters.grades.length > 0
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
