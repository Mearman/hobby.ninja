import { Metadata } from "next";
import { notFound } from "next/navigation";
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
	IconList,
	IconPhoto,
	IconRuler,
} from "@tabler/icons-react";
import Link from "next/link";

import { getScaleById, getItemsByScale } from "@/lib/server-graph-data";
// Import lightweight static params for generateStaticParams
import staticParams from "@/data/static-params.json";
import { getNodeDisplayName, type BaseNode, type ItemNode } from "@/lib/schemas";
import { itemCard } from "@/styles/components.css";

interface ScalePageProps {
	params: Promise<{ id: string }>;
}

// Generate static params for all scales using lightweight IDs file
export function generateStaticParams() {
	console.log(`Generating static params for ${staticParams.scaleIds.length} scales`);
	return staticParams.scaleIds.map(id => ({ id }));
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

// Item card component (server component - no hooks)
function ItemCard({ item }: { item: ItemNode & { series?: string; grade?: string; scale?: string; brand?: string } }) {
	const rawImage = item.images?.[0];
	// Handle union type: string | { url: string } | unknown
	const primaryImage = typeof rawImage === "string"
		? rawImage
		: (rawImage && typeof rawImage === "object" && "url" in rawImage)
			? (rawImage as { url: string }).url
			: undefined;
	const name = getNodeDisplayName(item);

	return (
		<Link href={`/item/${item.id}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				p="md"
				radius="md"
				withBorder={true}
				className={itemCard}
			>
				<Stack gap="md">
					<Box h={160} style={{ overflow: "hidden", borderRadius: "var(--mantine-radius-sm)" }}>
						<Image
							src={primaryImage || `https://via.placeholder.com/200x200/f5f5f5/666666?text=${encodeURIComponent(name)}`}
							alt={name}
							fit="cover"
							radius="sm"
							fallbackSrc="https://via.placeholder.com/200x200/e0e0e0/999999?text=Item"
						/>
					</Box>
					<div>
						<Text size="sm" fw={600} lineClamp={2} mb="xs">
							{name}
						</Text>
						<Group gap="xs" mb="xs">
							{item.grade && (
								<Badge variant="light" color="blue" size="xs">
									{item.grade}
								</Badge>
							)}
							{item.series && (
								<Badge variant="light" color="violet" size="xs">
									{item.series}
								</Badge>
							)}
						</Group>
						<Group justify="space-between">
							{item.price && (
								<Text size="xs" c="dimmed">
									¥{item.price.amount.toLocaleString()}
								</Text>
							)}
							{item.releaseDate?.year && (
								<Text size="xs" c="dimmed">
									{item.releaseDate.year}
								</Text>
							)}
						</Group>
					</div>
				</Stack>
			</Card>
		</Link>
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
		if (item.grade) {
			gradeDistribution.set(item.grade, (gradeDistribution.get(item.grade) || 0) + 1);
		}
		if (item.series) {
			seriesDistribution.set(item.series, (seriesDistribution.get(item.series) || 0) + 1);
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
		gradeDistribution: Array.from(gradeDistribution.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5),
		seriesDistribution: Array.from(seriesDistribution.entries())
			.sort((a, b) => b[1] - a[1])
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

				{/* Content Sections */}
				<Stack gap="md">
					{/* Items Section */}
					<Card p="lg" radius="md" withBorder={true}>
						<Stack gap="md">
							<Group justify="space-between">
								<Title order={2}>
									<Group gap="xs">
										<IconList size={24} />
										Items ({stats.totalItems})
									</Group>
								</Title>
							</Group>

							{scaleItems.length > 0 ? (
								<SimpleGrid
									cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }}
									spacing="md"
								>
									{scaleItems.slice(0, 24).map((item) => (
										<ItemCard key={item.id} item={item} />
									))}
								</SimpleGrid>
							) : (
								<Box ta="center" py="xl">
									<IconPhoto size={64} color="var(--mantine-color-gray-4)" />
									<Title order={3} mt="md" mb="sm">
										No items found
									</Title>
									<Text c="dimmed">
										No items are currently available at this scale.
									</Text>
								</Box>
							)}

							{scaleItems.length > 24 && (
								<Text ta="center" c="dimmed" size="sm">
									Showing 24 of {scaleItems.length} items
								</Text>
							)}
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
					{(stats.averagePrice || stats.yearRange) && (
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
