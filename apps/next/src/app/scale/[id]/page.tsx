import {
	getScaleById,
	getItemsByScale,
	getScaleIds,
	getNodePrimaryGrade,
} from "@hobby-ninja/data";
import {
	Badge,
	Card,
	Container,
	Group,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	IconChevronRight,
	IconClock,
	IconCurrencyYen,
	IconRuler,
} from "@tabler/icons-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ScaleItemsClient } from "./scale-items-client";

interface ScalePageProps {
	params: Promise<{ id: string }>;
}

// Generate static params for all scales
export function generateStaticParams() {
	const scaleIds = getScaleIds();
	console.log(`Generating static params for ${scaleIds.length} scales`);
	return scaleIds.map(id => ({ id }));
}

// Generate metadata for scale page
export async function generateMetadata({ params }: ScalePageProps): Promise<Metadata> {
	const { id } = await params;
	const scale = getScaleById(id);

	if (!scale) {
		return {
			title: "Scale Not Found",
		};
	}

	return {
		title: `${scale.name} Scale - hobby.ninja`,
		description: `Browse all ${scale.name} scale items - ${scale.itemCount} items available`,
	};
}

// Breadcrumbs component
function ScaleBreadcrumbs({ scaleName }: { scaleName: string }) {
	const breadcrumbItems = [
		{ title: "Home", href: "/" },
		{ title: "Database", href: "/database" },
		{ title: "Scales", href: "/scales" },
		{ title: scaleName, href: "" },
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

export default async function ScaleDetailPage({ params }: ScalePageProps) {
	const { id } = await params;

	// Fetch data at build time
	let scale;
	let scaleItems;
	try {
		scale = getScaleById(id);
		scaleItems = getItemsByScale(id);
	} catch (error) {
		console.error("Error fetching scale:", error);
		throw new Error(`Failed to load scale: ${id}`);
	}

	if (!scale) {
		notFound();
	}

	// Calculate statistics
	const gradeDistribution = new Map<string, number>();
	const seriesDistribution = new Map<string, number>();
	let totalPrice = 0;
	let priceCount = 0;
	let minYear = 9999;
	let maxYear = 0;

	for (const item of scaleItems) {
		const grade = getNodePrimaryGrade(item);
		if (grade) {
			gradeDistribution.set(grade, (gradeDistribution.get(grade) ?? 0) + 1);
		}
		// Use first series ID from array
		const seriesId = item.seriesIds[0];
		if (seriesId) {
			seriesDistribution.set(seriesId, (seriesDistribution.get(seriesId) ?? 0) + 1);
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
		totalItems: scaleItems.length,
		gradeDistribution: [...gradeDistribution.entries()]
			.toSorted((a, b) => b[1] - a[1])
			.slice(0, 5),
		seriesDistribution: [...seriesDistribution.entries()]
			.toSorted((a, b) => b[1] - a[1])
			.slice(0, 5),
		yearRange: minYear < 9999 && maxYear > 0 ? { first: minYear, last: maxYear } : null,
		averagePrice: priceCount > 0 ? totalPrice / priceCount : null,
	};

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Breadcrumbs */}
				<ScaleBreadcrumbs scaleName={scale.name} />

				{/* Scale Header */}
				<Card p="lg" radius="md" withBorder={true}>
					<Stack gap="md">
						<Group justify="space-between" align="flex-start">
							<div>
								<Title order={1}>
									<Group gap="xs">
										<IconRuler size={36} />
										{scale.name} Scale
									</Group>
								</Title>
								<Text size="lg" c="dimmed" mt="sm">
									Explore {stats.totalItems} items at {scale.name} scale
								</Text>
							</div>
							<Badge variant="outline" size="xl">
								{stats.totalItems} items
							</Badge>
						</Group>
						<Group gap="xs">
							{stats.yearRange && (
								<Badge variant="light" color="blue" size="lg">
									{stats.yearRange.first} - {stats.yearRange.last}
								</Badge>
							)}
							{stats.averagePrice && (
								<Badge variant="light" color="green" size="lg">
									Avg: ¥{Math.round(stats.averagePrice).toLocaleString()}
								</Badge>
							)}
						</Group>
					</Stack>
				</Card>

				{/* Items Section with Client-Side Filtering */}
				<ScaleItemsClient
					items={scaleItems}
					scaleName={scale.name}
					totalItems={stats.totalItems}
				/>

				{/* Statistics Sections */}
				<Stack gap="md">
					{/* Grade/Series Distribution */}
					<SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
						<Card p="lg" radius="md" withBorder={true} h="100%">
							<Title order={3} mb="md">Top Grades</Title>
							<Stack gap="sm">
								{stats.gradeDistribution.length > 0 ? (
									stats.gradeDistribution.map(([grade, count]) => (
										<Group key={grade} justify="space-between">
											<Badge variant="light" color="blue">{grade}</Badge>
											<Text size="sm">{count} items</Text>
										</Group>
									))
								) : (
									<Text c="dimmed">No grade information available</Text>
								)}
							</Stack>
						</Card>

						<Card p="lg" radius="md" withBorder={true} h="100%">
							<Title order={3} mb="md">Top Series</Title>
							<Stack gap="sm">
								{stats.seriesDistribution.length > 0 ? (
									stats.seriesDistribution.map(([series, count]) => (
										<Group key={series} justify="space-between">
											<Badge variant="light" color="violet">{series}</Badge>
											<Text size="sm">{count} items</Text>
										</Group>
									))
								) : (
									<Text c="dimmed">No series information available</Text>
								)}
							</Stack>
						</Card>
					</SimpleGrid>

					{/* Price and Timeline Info */}
					{(stats.averagePrice != null || stats.yearRange != null) && (
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
