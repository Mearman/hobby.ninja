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
	IconWorld,
} from "@tabler/icons-react";
import Link from "next/link";

import { getBrandById, getItemsByBrand } from "@/lib/server-graph-data";
// Import lightweight static params for generateStaticParams
import staticParams from "@/data/static-params.json";
import { getNodeDisplayName, type BaseNode, type ItemNode } from "@/lib/schemas";
import { itemCard } from "@/styles/components.css";

interface BrandPageProps {
	params: Promise<{ id: string }>;
}

// Generate static params for all brands using lightweight IDs file
export function generateStaticParams() {
	console.log(`Generating static params for ${staticParams.brandIds.length} brands`);
	return staticParams.brandIds.map(id => ({ id }));
}

// Generate metadata for brand page
export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
	const { id } = await params;
	const brand = getBrandById(id);

	if (!brand) {
		return {
			title: "Brand Not Found",
		};
	}

	const displayName = getNodeDisplayName(brand);

	return {
		title: `${displayName} - Brands - hobby.ninja`,
		description: brand.description || `Browse all items from ${displayName}`,
	};
}

// Breadcrumbs component
function BrandBreadcrumbs({ brand }: { brand: BaseNode }) {
	const breadcrumbItems = [
		{ title: "Home", href: "/" },
		{ title: "Database", href: "/database" },
		{ title: "Brands", href: "/brands" },
		{ title: getNodeDisplayName(brand), href: "" },
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
							{item.scale && (
								<Badge variant="light" color="green" size="xs">
									1/{item.scale}
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

export default async function BrandDetailPage({ params }: BrandPageProps) {
	const { id } = await params;

	// Fetch data at build time
	let brand;
	let brandItems;
	try {
		brand = getBrandById(id);
		brandItems = getItemsByBrand(id);
	} catch (error) {
		console.error("Error fetching brand:", error);
		throw new Error(`Failed to load brand: ${id}`);
	}

	if (!brand) {
		notFound();
	}

	// Calculate statistics
	const gradeDistribution = new Map<string, number>();
	const scaleDistribution = new Map<string, number>();
	let totalPrice = 0;
	let priceCount = 0;
	let minYear = 9999;
	let maxYear = 0;

	for (const item of brandItems) {
		if (item.grade) {
			gradeDistribution.set(item.grade, (gradeDistribution.get(item.grade) || 0) + 1);
		}
		if (item.scale) {
			scaleDistribution.set(item.scale, (scaleDistribution.get(item.scale) || 0) + 1);
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
		totalItems: brandItems.length,
		gradeDistribution: Array.from(gradeDistribution.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5),
		scaleDistribution: Array.from(scaleDistribution.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5),
		yearRange: minYear < 9999 && maxYear > 0 ? { first: minYear, last: maxYear } : null,
		averagePrice: priceCount > 0 ? totalPrice / priceCount : null,
	};

	const displayName = getNodeDisplayName(brand);
	const brandDescription = brand.description as string | undefined;
	const brandCountry = (brand as { country?: string }).country;
	const brandFounded = (brand as { founded?: string | number }).founded;
	const brandWebsite = (brand as { website?: string }).website;
	const coverImage = brand.metadata?.coverImage;

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Breadcrumbs */}
				<BrandBreadcrumbs brand={brand} />

				{/* Brand Header */}
				<Card p="lg" radius="md" withBorder={true}>
					<SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
						<Stack gap="md">
							<Title order={1}>{displayName}</Title>
							{brandDescription && (
								<Text size="lg" c="dimmed" lineClamp={3}>
									{brandDescription}
								</Text>
							)}
							<Group gap="xs">
								{brandCountry && (
									<Badge variant="light" size="lg">
										<Group gap={4}>
											<IconWorld size={14} />
											{brandCountry}
										</Group>
									</Badge>
								)}
								{brandFounded && (
									<Badge variant="light" color="blue" size="lg">
										<Group gap={4}>
											<IconClock size={14} />
											Founded {brandFounded}
										</Group>
									</Badge>
								)}
								<Badge variant="outline" size="lg">
									{stats.totalItems} items
								</Badge>
							</Group>
							{brandWebsite && (
								<Text size="sm" c="dimmed">
									<a
										href={brandWebsite}
										target="_blank"
										rel="noopener noreferrer"
										style={{ color: "inherit", textDecoration: "underline" }}
									>
										{brandWebsite}
									</a>
								</Text>
							)}
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
							<Group justify="space-between">
								<Title order={2}>
									<Group gap="xs">
										<IconList size={24} />
										Items ({stats.totalItems})
									</Group>
								</Title>
							</Group>

							{brandItems.length > 0 ? (
								<SimpleGrid
									cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }}
									spacing="md"
								>
									{brandItems.slice(0, 24).map((item) => (
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
										No items are currently available for this brand.
									</Text>
								</Box>
							)}

							{brandItems.length > 24 && (
								<Text ta="center" c="dimmed" size="sm">
									Showing 24 of {brandItems.length} items
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
