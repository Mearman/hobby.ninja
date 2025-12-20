import {
	seriesList,
	getItemById,
	getNodeDisplayName,
	getNodePrimaryGrade,
	resolveCdnUrl,
	type Series,
	type Item,
} from "@hobby-ninja/data";
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
	IconHome,
	IconStar,
} from "@tabler/icons-react";
import Link from "next/link";

import { SeriesClient } from "./series-client";

import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";
import { seriesCard, seriesImage } from "@/styles/components.css";


// Define types locally to avoid circular imports
interface SeriesWithStats extends Series {
	itemCount: number;
	firstYear?: number;
	lastYear?: number;
	averagePrice?: number;
	popularGrades?: string[];
}

// Featured series card component (for featured section)
function FeaturedSeriesCard({ series }: { series: SeriesWithStats }) {
	const coverImage = series.image ? resolveCdnUrl(series.image) : undefined;
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
						<Group justify="space-between" mt="xs">
							<Badge variant="light" color="blue" size="sm">
								{series.itemCount} items
							</Badge>
							<Group gap={4}>
								<IconCalendar size={12} />
								<Text size="xs" c="dimmed">{yearSpan}</Text>
							</Group>
						</Group>
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
					<FeaturedSeriesCard key={seriesItem.id} series={seriesItem} />
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
	// Calculate statistics for each series based on its items
	const seriesWithStats: SeriesWithStats[] = seriesList.map(series => {
		// Get all items for this series using itemIds array
		const items = series.itemIds
			.map(itemId => getItemById(itemId))
			.filter((item): item is Item => item !== undefined);

		let firstYear: number | undefined;
		let lastYear: number | undefined;
		let totalPrice = 0;
		let priceCount = 0;
		const grades = new Set<string>();

		// Calculate statistics from items
		for (const item of items) {
			// Track years
			const year = item.releaseDate?.year;
			if (year && year > 0) {
				if (firstYear === undefined || year < firstYear) {
					firstYear = year;
				}
				if (lastYear === undefined || year > lastYear) {
					lastYear = year;
				}
			}

			// Track prices
			const price = item.price?.amount;
			if (price !== undefined) {
				totalPrice += price;
				priceCount++;
			}

			// Track grades
			const grade = getNodePrimaryGrade(item);
			if (grade) {
				grades.add(grade);
			}
		}

		return {
			...series,
			itemCount: items.length,
			firstYear,
			lastYear,
			averagePrice: priceCount > 0 ? totalPrice / priceCount : undefined,
			popularGrades: [...grades].slice(0, 3),
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
					<Text size="sm" c="dimmed">
						Series
					</Text>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Series Explorer
					</Title>
					<Text size="lg" c="dimmed">
						Explore {total.toLocaleString()} series across {availableFranchises.length} franchises with search and infinite scroll.
					</Text>
				</Box>

				{/* Featured Series */}
				{featuredSeries.length > 0 && (
					<FeaturedSeries series={featuredSeries} />
				)}

				{/* Series Timeline */}
				<SeriesTimeline series={allSeries.slice(0, 50)} />

				{/* All Series with Infinite Scroll */}
				<Box>
					<Title order={2} mb="md">
						All Series
					</Title>
					<SeriesClient series={allSeries} totalSeries={total} />
				</Box>
			</Stack>
		</Container>
	);
}
