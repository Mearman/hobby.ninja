import {
	getBrandById,
	getBrandIds,
	getItemById,
	getNodeDisplayName,
	getNodePrimaryGrade,
	type Brand,
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
	IconList,
	IconWorld,
} from "@tabler/icons-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// Import lightweight static params for generateStaticParams
import { BrandItemsClient } from "./brand-items-client";


interface BrandPageProps {
	params: Promise<{ id: string }>;
}

// Generate static params for all brands using lightweight IDs file
export function generateStaticParams() {
	const brandIds = getBrandIds();
	console.log(`Generating static params for ${brandIds.length} brands`);
	return brandIds.map(id => ({ id }));
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
		description: brand.description ?? `Browse all items from ${displayName}`,
	};
}

// Breadcrumbs component
function BrandBreadcrumbs({ brand }: { brand: Brand }) {
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

export default async function BrandDetailPage({ params }: BrandPageProps) {
	const { id } = await params;

	// Fetch data at build time
	let brand: Brand | undefined;
	let brandItems: Item[] = [];
	try {
		brand = getBrandById(id);
		if (brand) {
			// Use brand's itemIds array to fetch related items
			brandItems = brand.itemIds
				.map(itemId => getItemById(itemId))
				.filter((item): item is Item => item !== undefined);
		}
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
		const grade = getNodePrimaryGrade(item);
		if (grade) {
			gradeDistribution.set(grade, (gradeDistribution.get(grade) ?? 0) + 1);
		}
		if (item.scale) {
			scaleDistribution.set(item.scale, (scaleDistribution.get(item.scale) ?? 0) + 1);
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
		gradeDistribution: [...gradeDistribution.entries()]
			.toSorted((a, b) => b[1] - a[1])
			.slice(0, 5),
		scaleDistribution: [...scaleDistribution.entries()]
			.toSorted((a, b) => b[1] - a[1])
			.slice(0, 5),
		yearRange: minYear < 9999 && maxYear > 0 ? { first: minYear, last: maxYear } : null,
		averagePrice: priceCount > 0 ? totalPrice / priceCount : null,
	};

	const displayName = getNodeDisplayName(brand);
	const brandDescription = brand.description;
	const brandCountry = brand.country;
	const brandFounded = brand.founded;
	const brandWebsite = brand.website;
	const coverImage = brand.image;

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

							<BrandItemsClient
								items={brandItems}
								brandName={displayName}
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
