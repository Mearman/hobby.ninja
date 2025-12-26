"use client";

import { getNodeDisplayName, getNodeImages, getNodePrimaryGrade, resolveCdnUrl, type Item } from "@hobby-ninja/data";
import { Box, Card, Flex, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import Link from "next/link";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { UI } from "@/lib/constants";

function formatPrice(price?: { amount: number; currency: string }): string {
	if (!price) return "";
	return new Intl.NumberFormat("ja-JP", {
		style: "currency",
		currency: price.currency || "JPY",
	}).format(price.amount);
}

function ItemCard({ item }: { item: Item }): React.ReactElement {
	return (
		<Link href={`/items/${item.id}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				shadow="sm"
				padding="md"
				radius="md"
				withBorder={true}
				h="100%"
				style={{ cursor: "pointer" }}
				className="item-card-hover"
			>
				<Stack gap="xs">
					<Box
						h={UI.THUMBNAIL_HEIGHT}
						bg="gray.0"
						style={{
							borderRadius: "var(--mantine-radius-sm)",
							background: "linear-gradient(135deg, var(--mantine-color-gray-0) 0%, var(--mantine-color-gray-1) 100%)",
						}}
					>
						{(() => {
							const images = getNodeImages(item);
							return images.length > 0 ? (
								<img
									src={resolveCdnUrl(images[0])}
									alt={getNodeDisplayName(item)}
									style={{
										width: "100%",
										height: "100%",
										objectFit: "cover",
										borderRadius: "var(--mantine-radius-sm)",
									}}
								/>
							) : (
								<Flex justify="center" align="center" h="100%">
									<IconDatabase size={40} color="var(--mantine-color-gray-4)" />
								</Flex>
							);
						})()}
					</Box>

					<Stack gap={4}>
						<Text size="sm" fw={600} lineClamp={2} c="var(--mantine-color-gray-8)">
							{getNodeDisplayName(item)}
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

interface ExploreSectionProps {
	items: Item[];
}

export function ExploreSection({ items }: ExploreSectionProps): React.ReactElement {
	// Sort items by release date (newest first)
	const sortedItems = useMemo(
		() => [...items].toSorted((a, b) => releaseDateToNumber(b.releaseDate) - releaseDateToNumber(a.releaseDate)),
		[items],
	);

	const { visibleItems, isLoading, hasMore, loadMore, lastItemRef } = useInfiniteScroll({
		items: sortedItems,
		itemsPerPage: 24,
		autoLoad: true,
	});

	return (
		<>
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
