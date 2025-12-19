"use client";

import { getNodeDisplayName, type Series, resolveImageUrl } from "@hobby-ninja/data";
import {
	Badge,
	Box,
	Card,
	Group,
	Image,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import {
	IconCalendar,
	IconFolder,
	IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";
import { seriesCard, seriesImage } from "@/styles/components.css";

interface SeriesWithStats extends Series {
	itemCount: number;
	firstYear?: number;
	lastYear?: number;
	averagePrice?: number;
	popularGrades?: string[];
}

interface SeriesClientProps {
	series: SeriesWithStats[];
	totalSeries: number;
}

// Series Card Component
function SeriesCard({ series }: { series: SeriesWithStats }) {
	const coverImage = series.image;
	const franchise = series.franchise ?? "Standalone";
	const yearSpan = series.firstYear && series.lastYear
		? series.firstYear === series.lastYear
			? series.firstYear.toString()
			: `${series.firstYear}-${series.lastYear}`
		: "Unknown";

	return (
		<Link href={`/series/${series.id}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				p="md"
				radius="md"
				className={seriesCard}
				withBorder={true}
			>
				<Stack gap="md">
					<Box h={120} className={seriesImage}>
						<Image
							src={coverImage ? resolveImageUrl(coverImage) : createPlaceholderSvg(getNodeDisplayName(series).slice(0, 20), 200, 120)}
							alt={getNodeDisplayName(series)}
							fit="cover"
							radius="sm"
							fallbackSrc={createErrorPlaceholderSvg(200, 120)}
						/>
					</Box>
					<div>
						<Text size="sm" fw={600} lineClamp={2} mb="xs">
							{getNodeDisplayName(series)}
						</Text>
						{series.description && (
							<Text size="xs" c="dimmed" lineClamp={2} mb="xs">
								{series.description}
							</Text>
						)}
						<Group justify="space-between" mt="xs">
							<Badge variant="light" color="blue" size="sm">
								{series.itemCount} items
							</Badge>
							<Group gap={4}>
								<IconCalendar size={12} />
								<Text size="xs" c="dimmed">{yearSpan}</Text>
							</Group>
						</Group>
						{franchise !== "Standalone" && (
							<Badge variant="outline" size="xs" mt="xs">
								{franchise}
							</Badge>
						)}
					</div>
				</Stack>
			</Card>
		</Link>
	);
}

export function SeriesClient({ series, totalSeries }: SeriesClientProps) {
	const { preferences } = useUserPreferences();
	const [search, setSearch] = useState("");

	// Filter series by search
	const filteredSeries = useMemo(() => {
		if (!search.trim()) return series;
		const query = search.toLowerCase();
		return series.filter((s) => {
			const name = getNodeDisplayName(s).toLowerCase();
			const description = s.description?.toLowerCase() ?? "";
			const franchise = s.franchise?.toLowerCase() ?? "";
			return name.includes(query) || description.includes(query) || franchise.includes(query);
		});
	}, [series, search]);

	const { visibleItems: paginatedSeries, isLoading, hasMore, lastItemRef } = useInfiniteScroll({
		items: filteredSeries,
		itemsPerPage: preferences.infiniteScrollPageSize,
		preservePageParam: true,
		autoLoad: preferences.autoLoadInfiniteScroll,
	});

	// Note: useInfiniteScroll automatically resets when items array reference changes

	return (
		<Stack gap="md">
			{/* Search */}
			<TextInput
				leftSection={<IconSearch size={16} />}
				placeholder="Search series..."
				value={search}
				onChange={(e) => { setSearch(e.target.value); }}
				size="md"
			/>

			{/* Results count */}
			<Group justify="space-between">
				<Text size="sm" c="dimmed">
					{filteredSeries.length === totalSeries
						? `${totalSeries.toLocaleString()} series`
						: `${filteredSeries.length.toLocaleString()} of ${totalSeries.toLocaleString()} series`
					}
				</Text>
			</Group>

			{/* Series Grid */}
			{paginatedSeries.length > 0 ? (
				<>
					<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="md">
						{paginatedSeries.map((seriesItem) => (
							<SeriesCard key={seriesItem.id} series={seriesItem} />
						))}
					</SimpleGrid>

					{/* Infinite Scroll Loader */}
					<div ref={lastItemRef}>
						<InfiniteScrollLoader
							isLoading={isLoading}
							hasMore={hasMore}
							autoLoad={preferences.autoLoadInfiniteScroll}
						/>
					</div>
				</>
			) : (
				<Stack align="center" py="xl" gap="md">
					<IconFolder size={64} style={{ color: "var(--mantine-color-gray-4)" }} />
					<Text size="lg" fw={500}>
						{search ? "No series match your search" : "No series found"}
					</Text>
					<Text c="dimmed" ta="center">
						{search
							? "Try a different search term."
							: "No series are currently available."
						}
					</Text>
				</Stack>
			)}
		</Stack>
	);
}
