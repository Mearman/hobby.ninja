import { getNodeDisplayName, getNodePrimaryGrade, type Node ,
	getSeriesById,
	getSeriesIds,
	getItemById,
	resolveCdnUrl,
	type Series,
	type Item,
} from "@hobby-ninja/data";
import {
	Badge,
	Box,
	Card,
	Container,
	Group,
	Image,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	IconChevronRight,
	IconClock,
	IconCurrencyYen,
} from "@tabler/icons-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SeriesItemsClient } from "./series-items-client";



interface SeriesPageProps {
	params: Promise<{ id: string }>;
}

// Generate static params for all series using lightweight IDs file
export function generateStaticParams() {
	const seriesIds = getSeriesIds();
	console.log(`Generating static params for ${seriesIds.length} series`);
	return seriesIds.map(id => ({ id }));
}

// Generate metadata for series page
export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
	const { id } = await params;
	const series = getSeriesById(id);

	if (!series) {
		return {
			title: "Series Not Found",
		};
	}

	const displayName = getNodeDisplayName(series);

	return {
		title: `${displayName} - Series - hobby.ninja`,
		description: series.description ?? `Browse all items from the ${displayName} series`,
	};
}

// Breadcrumbs component
function SeriesBreadcrumbs({ series }: { series: Node }) {
	const breadcrumbItems = [
		{ title: "Home", href: "/" },
		{ title: "Database", href: "/database" },
		{ title: "Series", href: "/series" },
		{ title: getNodeDisplayName(series), href: "" },
	];

	return (
		<Group gap={8} mb="md">
			{breadcrumbItems.map((crumb, index) => (
				<Group key={index} gap={4}>
					{index > 0 && <IconChevronRight size={16} color="var(--mantine-color-gray-5)" />}
					{index < breadcrumbItems.length - 1 ? (
						<Link href={crumb.href} style={{ textDecoration: "none" }}>
							<Text size="sm" c="dimmed">
								{crumb.title}
							</Text>
						</Link>
					) : (
						<Text size="sm" fw={500} c="var(--mantine-color-dark-2)">
							{crumb.title}
						</Text>
					)}
				</Group>
			))}
		</Group>
	);
}

export default async function SeriesDetailPage({ params }: SeriesPageProps) {
	const { id } = await params;

	// Fetch data at build time
	let series: Series | undefined;
	let seriesItems: Item[] = [];
	try {
		series = getSeriesById(id);
		// Fetch items using the series itemIds array
		if (series) {
			seriesItems = series.itemIds
				.map(itemId => getItemById(itemId))
				.filter((item): item is Item => item !== undefined);
		}
	} catch (error) {
		console.error("Error fetching series:", error);
		throw new Error(`Failed to load series: ${id}`);
	}

	if (!series) {
		notFound();
	}

	// Calculate statistics
	const gradeDistribution = new Map<string, number>();
	const scaleDistribution = new Map<string, number>();
	let totalPrice = 0;
	let priceCount = 0;
	let minYear = 9999;
	let maxYear = 0;

	for (const item of seriesItems) {
		const grade = getNodePrimaryGrade(item);
		if (grade) {
			gradeDistribution.set(grade, (gradeDistribution.get(grade) ?? 0) + 1);
		}
		for (const scale of item.scales) {
			scaleDistribution.set(scale, (scaleDistribution.get(scale) ?? 0) + 1);
		}
		if (item.releaseDate?.year) {
			minYear = Math.min(minYear, item.releaseDate.year);
			maxYear = Math.max(maxYear, item.releaseDate.year);
		}
		if (item.price?.amount) {
			totalPrice += item.price.amount;
			priceCount++;
		}
	}

	const stats = {
		totalItems: seriesItems.length,
		gradeDistribution: [...gradeDistribution.entries()]
			.toSorted((a, b) => b[1] - a[1])
			.slice(0, 5),
		scaleDistribution: [...scaleDistribution.entries()]
			.toSorted((a, b) => b[1] - a[1])
			.slice(0, 5),
		yearRange: minYear < 9999 && maxYear > 0 ? { first: minYear, last: maxYear } : null,
		averagePrice: priceCount > 0 ? totalPrice / priceCount : null,
	};

	const displayName = getNodeDisplayName(series);
	const seriesDescription = series.description;
	const seriesFranchise = series.franchise;
	const coverImage = series.image ? resolveCdnUrl(series.image) : undefined;

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Breadcrumbs */}
				<SeriesBreadcrumbs series={series} />

				{/* Series Header */}
				<Card p="lg" radius="md" withBorder={true}>
					<SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
						<Stack gap="md">
							<Title order={1}>{displayName}</Title>
							{seriesDescription && (
								<Text size="lg" c="dimmed" lineClamp={3}>
									{seriesDescription}
								</Text>
							)}
							<Group gap="xs">
								{seriesFranchise && (
									<Badge variant="light" size="lg">
										{seriesFranchise}
									</Badge>
								)}
								<Badge variant="outline" size="lg">
									{stats.totalItems} items
								</Badge>
								{stats.yearRange && (
									<Badge variant="light" color="blue" size="lg">
										{stats.yearRange.first} - {stats.yearRange.last}
									</Badge>
								)}
							</Group>
						</Stack>
						<Box>
							{coverImage && typeof coverImage === "string" ? (
								<Image
									src={coverImage}
									alt={displayName}
									height={200}
									radius="md"
									fit="cover"
								/>
							) : null}
						</Box>
					</SimpleGrid>
				</Card>

				{/* Content Sections */}
				<Stack gap="md">
					{/* Items Section */}
					<Card p="lg" radius="md" withBorder={true}>
						<Stack gap="md">
							<SeriesItemsClient
								items={seriesItems}
								seriesName={displayName}
								totalItems={stats.totalItems}
							/>
						</Stack>
					</Card>

					{/* Statistics Section */}
					<SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
						<Card p="lg" radius="md" withBorder={true} h="100%">
							<Title order={3} mb="md">Top Grades</Title>
							<Stack gap="sm">
								{stats.gradeDistribution.length > 0 ? (
									stats.gradeDistribution.map(([grade, count]) => (
										<Group key={grade} justify="space-between">
											<Badge variant="light">{grade}</Badge>
											<Text size="sm">{count} items</Text>
										</Group>
									))
								) : (
									<Text c="dimmed">No grade information available</Text>
								)}
							</Stack>
						</Card>

						<Card p="lg" radius="md" withBorder={true} h="100%">
							<Title order={3} mb="md">Top Scales</Title>
							<Stack gap="sm">
								{stats.scaleDistribution.length > 0 ? (
									stats.scaleDistribution.map(([scale, count]) => (
										<Group key={scale} justify="space-between">
											<Badge variant="light" color="green">1/{scale}</Badge>
											<Text size="sm">{count} items</Text>
										</Group>
									))
								) : (
									<Text c="dimmed">No scale information available</Text>
								)}
							</Stack>
						</Card>
					</SimpleGrid>

					{/* Price and Timeline Info */}
					{(stats.averagePrice !== null || stats.yearRange !== null) && (
						<Card p="lg" radius="md" withBorder={true}>
							<SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
								{stats.averagePrice && (
									<Group gap="xs">
										<IconCurrencyYen size={20} />
										<Text fw={500}>Average Price:</Text>
										<Text>¥{Math.round(stats.averagePrice).toLocaleString()}</Text>
									</Group>
								)}
								{stats.yearRange && (
									<Group gap="xs">
										<IconClock size={20} />
										<Text fw={500}>Release Period:</Text>
										<Text>{stats.yearRange.first} - {stats.yearRange.last}</Text>
									</Group>
								)}
							</SimpleGrid>
						</Card>
					)}
				</Stack>
			</Stack>
		</Container>
	);
}
