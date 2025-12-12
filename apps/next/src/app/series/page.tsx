import {
	Anchor,
	Badge,
	Box,
	Breadcrumbs,
	Card,
	Container,
	Divider,
	Group,
	Image,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	IconCalendar,
	IconClock,
	IconFolder,
	IconHome,
	IconStar,
} from "@tabler/icons-react";
import Link from "next/link";
import React from "react";

import { getAllItems, getAllSeries } from "@/lib/graph-data";
import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";
import { BaseNode, getNodeDisplayName, isBaseNode } from "@/lib/schemas";
import { seriesCard, seriesImage } from "@/styles/components.css";

// Define types locally to avoid circular imports
interface SeriesWithStats extends BaseNode {
	image?: string;
	itemCount: number;
	firstYear?: number;
	lastYear?: number;
	averagePrice?: number;
	popularGrades?: string[];
	description?: string;
	franchise?: string;
}

// Enhanced series card component
function SeriesCard({ series }: { series: SeriesWithStats }) {
	// Check for image at root level (new) or in metadata (legacy)
	const coverImage = series.image ?? (series.metadata?.coverImage as string | undefined);
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
							src={coverImage ?? createPlaceholderSvg(getNodeDisplayName(series).slice(0, 20), 200, 120)}
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

// Featured series section
function FeaturedSeries({ series }: { series: SeriesWithStats[] }) {
	if (series.length === 0) return null;

	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Group mb="md">
				<IconStar color="var(--mantine-color-yellow-6)" />
				<Title order={3}>Featured Series</Title>
			</Group>
			<SimpleGrid
				cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
				spacing="md"
			>
				{series.map((seriesItem) => (
					<SeriesCard key={seriesItem.id} series={seriesItem} />
				))}
			</SimpleGrid>
		</Card>
	);
}

// Series era timeline
function SeriesTimeline({ series }: { series: SeriesWithStats[] }) {
	const groups = new Map<string, SeriesWithStats[]>();

	for (const s of series) {
		let era = "Unknown Era";
		if (s.firstYear) {
			if (s.firstYear < 1980) era = "Classic Era (< 1980)";
			else if (s.firstYear < 1990) era = "80s Era (1980-1989)";
			else if (s.firstYear < 2000) era = "90s Era (1990-1999)";
			else if (s.firstYear < 2010) era = "2000s Era (2000-2009)";
			else if (s.firstYear < 2020) era = "2010s Era (2010-2019)";
			else era = "2020s Era (2020+)";
		}

		if (!groups.has(era)) groups.set(era, []);
		groups.get(era)!.push(s);
	}

	const eraGroups = [...groups.entries()].toSorted((a, b) => {
		const aYear = a[1][0]?.firstYear ?? 9999;
		const bYear = b[1][0]?.firstYear ?? 9999;
		return bYear - aYear;
	});

	if (eraGroups.length === 0) return null;

	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Group mb="md">
				<IconClock />
				<Title order={3}>Series Timeline</Title>
			</Group>
			<Stack gap="lg">
				{eraGroups.map(([era, eraSeries]) => (
					<Box key={era}>
						<Group mb="sm">
							<Divider w="100%" />
							<Text size="lg" fw={600}>{era}</Text>
							<Badge variant="light">{eraSeries.length} series</Badge>
						</Group>
						<SimpleGrid
							cols={{ base: 2, sm: 3, md: 4, lg: 5 }}
							spacing="sm"
						>
							{eraSeries.slice(0, 5).map((seriesItem) => (
								<Anchor
									key={seriesItem.id}
									href={`/series/${seriesItem.id}`}
									size="sm"
									lineClamp={1}
								>
									{getNodeDisplayName(seriesItem)}
								</Anchor>
							))}
						</SimpleGrid>
						{eraSeries.length > 5 && (
							<Text size="xs" c="dimmed" mt="xs">
								+{eraSeries.length - 5} more series
							</Text>
						)}
					</Box>
				))}
			</Stack>
		</Card>
	);
}

// Prepare series data with statistics
function prepareSeriesData(): SeriesWithStats[] {
	const seriesData = getAllSeries();
	const itemsData = getAllItems();

	const validSeries = seriesData.filter((node) => isBaseNode(node));
	const validItems = itemsData.filter((node) => isBaseNode(node));

	// Count items per series and gather statistics
	const seriesStats = new Map<string, {
		count: number;
		firstYear: number;
		lastYear: number;
		totalPrice: number;
		priceCount: number;
		grades: Set<string>;
		items: BaseNode[];
	}>();

	for (const item of validItems) {
		if ("series" in item && typeof item.series === "string") {
			if (!seriesStats.has(item.series)) {
				seriesStats.set(item.series, {
					count: 0,
					firstYear: 9999,
					lastYear: 0,
					totalPrice: 0,
					priceCount: 0,
					grades: new Set(),
					items: [],
				});
			}

			const stats = seriesStats.get(item.series)!;
			stats.count++;
			stats.items.push(item);

			// Track years
			const year = item.releaseDate?.year;
			if (year) {
				stats.firstYear = Math.min(stats.firstYear, year);
				stats.lastYear = Math.max(stats.lastYear, year);
			}

			// Track prices
			const price = item.price?.amount;
			if (price) {
				stats.totalPrice += price;
				stats.priceCount++;
			}

			// Track grades
			if (item.grade) {
				stats.grades.add(item.grade);
			}
		}
	}

	// Attach statistics to series
	const seriesWithStats: SeriesWithStats[] = validSeries.map(seriesItem => {
		const stats = seriesStats.get(seriesItem.id);
		return {
			...seriesItem,
			itemCount: stats?.count ?? 0,
			firstYear: stats?.firstYear && stats.firstYear !== 9999 ? stats.firstYear : undefined,
			lastYear: stats?.lastYear && stats.lastYear !== 0 ? stats.lastYear : undefined,
			averagePrice: stats && stats.priceCount > 0 ? stats.totalPrice / stats.priceCount : undefined,
			popularGrades: stats ? [...stats.grades].slice(0, 3) : [],
			franchise: seriesItem.franchise,
			description: seriesItem.description,
		};
	});

	// Sort by name
	return seriesWithStats.toSorted((a, b) => getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)));
}

export default function SeriesPage() {
	// Load and process data synchronously
	const allSeries = prepareSeriesData();

	// Get featured series (top by item count)
	const featuredSeries = allSeries
		.filter(s => s.itemCount >= 5)
		.toSorted((a, b) => b.itemCount - a.itemCount)
		.slice(0, 8);

	// Get available franchises
	const franchises = new Set<string>();
	for (const s of allSeries) s.franchise && franchises.add(s.franchise);
	const availableFranchises = [...franchises].toSorted();

	const total = allSeries.length;

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Breadcrumbs */}
				<Breadcrumbs>
					<Anchor href="/" size="sm">
						<Group gap={4}>
							<IconHome size={14} />
							Home
						</Group>
					</Anchor>
					<Anchor href="/database" size="sm">
						Database
					</Anchor>
					<Anchor href="/series" size="sm">
						Series
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Series Explorer
					</Title>
					<Text size="lg" c="dimmed">
						Explore {total.toLocaleString()} series across {availableFranchises.length} franchises
					</Text>
				</Box>

				{/* Featured Series */}
				{featuredSeries.length > 0 && (
					<FeaturedSeries series={featuredSeries} />
				)}

				{/* Series Timeline */}
				<SeriesTimeline series={allSeries.slice(0, 50)} />

				{/* All Series */}
				<Box>
					<Group justify="space-between" mb="md">
						<Title order={2}>All Series</Title>
						<Text size="sm" c="dimmed">
							{total.toLocaleString()} series
						</Text>
					</Group>

					{allSeries.length > 0 ? (
						<SimpleGrid
							cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
							spacing="md"
						>
							{allSeries.map((seriesItem) => (
								<SeriesCard
									key={seriesItem.id}
									series={seriesItem}
								/>
							))}
						</SimpleGrid>
					) : (
						<Box ta="center" py="xl">
							<IconFolder size={64} color="var(--mantine-color-gray-4)" />
							<Title order={3} mt="md" mb="sm">
								No series available
							</Title>
							<Text c="dimmed" mb="lg">
								There are no series in the database yet.
							</Text>
						</Box>
					)}
				</Box>
			</Stack>
		</Container>
	);
}