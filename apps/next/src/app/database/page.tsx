"use client";

import { Box, Card, Container, Group, Image, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { IconBox, IconFolder, IconSearch, IconTag, IconTrendingUp } from "@tabler/icons-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";


import { PAGINATION, TYPOGRAPHY, UI } from "@/lib/constants";
import { getAllBrands, getAllCategories, getAllItems, getAllSeries } from "@/lib/graph-data";
import { BaseEdge, BrandNode, CategoryNode, getNodeDisplayName, isBaseEdge, SeriesNode } from "@/lib/schemas";
import {
	actionCard,
	brandLogo,
	categoryCard,
	categoryIcon,
	databaseStatCard,
	databaseStatIcon,
	searchCard,
	seriesCard,
	seriesImage,
	statCard,
} from "@/styles/components.css";

// Type-safe CSS class accessor for category-specific styling
const getCategoryStyle = (_categoryId: string): string => {
	// Return empty string - category-specific classes should be handled differently
	return "";
};

// Type for database stats
interface DatabaseStats {
	totalItems: number;
	totalBrands: number;
	totalCategories: number;
	totalSeries: number;
	brands: Array<BrandNode & { itemCount: number }>;
	categories: Array<CategoryNode & { itemCount: number }>;
	series: Array<SeriesNode & { itemCount: number }>;
}

// Initial loading state
const initialStats: DatabaseStats = {
	totalItems: 0,
	totalBrands: 0,
	totalCategories: 0,
	totalSeries: 0,
	brands: [],
	categories: [],
	series: [],
};

// Client-side data fetching function
const loadDatabaseStats = async (): Promise<DatabaseStats> => {
	try {
		// Load data as a single result to avoid destructuring type inference issues
		const allData = await Promise.all([
			getAllItems(),
			getAllBrands(),
			getAllCategories(),
			getAllSeries(),
		]);

		// Extract individual arrays with explicit typing
		const items = allData[0];
		const brands = allData[1];
		const categories = allData[2];
		const series = allData[3];

		// Add itemCount to brands, categories, and series based on the loaded data
		const brandsWithCounts: Array<BrandNode & { itemCount: number }> = brands.map(brand => {
			const itemCount = items.filter(item => {
				if (!item.edges?.outbound) return false;
				return item.edges.outbound.some((edge): edge is BaseEdge =>
					isBaseEdge(edge) && edge.target === brand.id,
				);
			}).length;

			return {
				...brand,
				itemCount,
			};
		});

		const categoriesWithCounts: Array<CategoryNode & { itemCount: number }> = categories.map(category => {
			const itemCount = items.filter(item => {
				if (!item.edges?.outbound) return false;
				return item.edges.outbound.some((edge): edge is BaseEdge =>
					isBaseEdge(edge) && edge.target === category.id,
				);
			}).length;

			return {
				...category,
				itemCount,
			};
		});

		const seriesWithCounts: Array<SeriesNode & { itemCount: number }> = series.map(seriesItem => {
			const itemCount = items.filter(item => {
				if (!item.edges?.outbound) return false;
				return item.edges.outbound.some((edge): edge is BaseEdge =>
					isBaseEdge(edge) && edge.target === seriesItem.id,
				);
			}).length;

			return {
				...seriesItem,
				itemCount,
			};
		});

		return {
			totalItems: items.length,
			totalBrands: brands.length,
			totalCategories: categories.length,
			totalSeries: series.length,
			brands: brandsWithCounts
				.sort((a, b) => b.itemCount - a.itemCount)
				.slice(0, PAGINATION.CATEGORY_PREVIEW_COUNT),
			categories: categoriesWithCounts
				.sort((a, b) => b.itemCount - a.itemCount)
				.slice(0, PAGINATION.CATEGORY_PREVIEW_COUNT),
			series: seriesWithCounts
				.sort((a, b) => b.itemCount - a.itemCount)
				.slice(0, PAGINATION.CATEGORY_PREVIEW_COUNT),
		};
	} catch (error: unknown) {
		// Failed to load database stats, returning initial stats
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("Failed to load database stats:", errorMessage);
		return initialStats;
	}
};

// Component for database statistics
function DatabaseStats({ stats }: { stats: DatabaseStats }) {
	return (
		<SimpleGrid
			cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
			spacing={{ base: "sm", md: "lg" }}
		>
			<Card p="lg" radius="md" className={statCard}>
				<Group>
					<div className={databaseStatIcon}>
						<IconBox size={UI.ICON_SIZE_XL} />
					</div>
					<div>
						<Text size="xs" color="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
              Total Items
						</Text>
						<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
							{stats.totalItems.toLocaleString()}
						</Text>
					</div>
				</Group>
			</Card>

			<Card p="lg" radius="md" className={databaseStatCard}>
				<Group>
					<div className={databaseStatIcon}>
						<IconFolder size={UI.ICON_SIZE_XL} />
					</div>
					<div>
						<Text size="xs" color="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
              Brands
						</Text>
						<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
							{stats.totalBrands}
						</Text>
					</div>
				</Group>
			</Card>

			<Card p="lg" radius="md" className={databaseStatCard}>
				<Group>
					<div className={databaseStatIcon}>
						<IconTag size={UI.ICON_SIZE_XL} />
					</div>
					<div>
						<Text size="xs" color="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
              Categories
						</Text>
						<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
							{stats.totalCategories}
						</Text>
					</div>
				</Group>
			</Card>

			<Card p="lg" radius="md" className={databaseStatCard}>
				<Group>
					<div className={databaseStatIcon}>
						<IconTrendingUp size={UI.ICON_SIZE_XL} />
					</div>
					<div>
						<Text size="xs" color="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
              Series
						</Text>
						<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
							{stats.totalSeries}
						</Text>
					</div>
				</Group>
			</Card>
		</SimpleGrid>
	);
}

// Component for brand grid
function BrandsGrid({ brands }: { brands: DatabaseStats["brands"] }) {
	if (brands.length === 0) return null;

	return (
		<Box>
			<Title order={2} mb="lg">
        Popular Brands
			</Title>
			<SimpleGrid
				cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
				spacing="md"
			>
				{brands.map((brand) => (
					<Card
						key={brand.id}
						component={Link}
						href={`/brand/${brand.id}`}
						p="md"
						radius="md"
						className={categoryCard}
						withBorder={true}
					>
						<Stack align="center" gap={UI.SKELETON_HEIGHT_SMALL}>
							<Box w={60} h={60} className={brandLogo}>
								<Image
									src={`https://via.placeholder.com/60x60/ffffff/666666?text=${encodeURIComponent(getNodeDisplayName(brand))}`}
									alt={getNodeDisplayName(brand)}
									fit="contain"
									radius="sm"
									fallbackSrc="https://via.placeholder.com/60x60/f5f5f5/999999?text=Logo"
								/>
							</Box>
							<Text size="sm" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL} ta="center" lineClamp={2}>
								{getNodeDisplayName(brand)}
							</Text>
							{/* Badge  variant="light" size="xs">
								{brand.itemCount || 0} items
							</Badge */}
						</Stack>
					</Card>
				))}
			</SimpleGrid>

			<Box mt="md" ta="center">
				<Text
					component={Link}
					href="/brands"
					size="sm"
					c="blue"
					td="underline"
				>
          View all brands →
				</Text>
			</Box>
		</Box>
	);
}

// Component for category grid
function CategoriesGrid({ categories }: { categories: DatabaseStats["categories"] }) {
	if (categories.length === 0) return null;

	return (
		<Box>
			<Title order={2} mb="lg">
        Browse Categories
			</Title>
			<SimpleGrid
				cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
				spacing={{ base: "sm", md: "md" }}
			>
				{categories.map((category) => (
					<Card
						key={category.id}
						component={Link}
						href={`/category/${category.id}`}
						p="lg"
						radius="md"
						className={categoryCard}
						withBorder={true}
					>
						<Stack align="center" gap={UI.SKELETON_HEIGHT_SMALL}>
							<div className={`${categoryIcon} ${getCategoryStyle(category.id)}`}>
								<IconFolder size={UI.ICON_SIZE_XXL} />
							</div>
							<Text size="md" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL} ta="center" lineClamp={1}>
								{getNodeDisplayName(category)}
							</Text>
							{/* Badge  variant="light" size="xs">
								{category.itemCount || 0} items
							</Badge */}
						</Stack>
					</Card>
				))}
			</SimpleGrid>

			<Box mt="md" ta="center">
				<Text
					component={Link}
					href="/categories"
					size="sm"
					c="blue"
					td="underline"
				>
          View all categories →
				</Text>
			</Box>
		</Box>
	);
}

// Component for series grid
function SeriesGrid({ series }: { series: DatabaseStats["series"] }) {
	if (series.length === 0) return null;

	return (
		<Box>
			<Title order={2} mb="lg">
        Popular Series
			</Title>
			<SimpleGrid
				cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
				spacing="md"
			>
				{series.map((seriesItem) => (
					<Card
						key={seriesItem.id}
						component={Link}
						href={`/series/${seriesItem.id}`}
						p="md"
						radius="md"
						className={seriesCard}
						withBorder={true}
					>
						<Stack gap={UI.SKELETON_HEIGHT_SMALL}>
							<Box h={80} className={seriesImage}>
								<Image
									src={`https://via.placeholder.com/160x80/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(seriesItem))}`}
									alt={getNodeDisplayName(seriesItem)}
									fit="cover"
									radius="sm"
									fallbackSrc="https://via.placeholder.com/160x80/e0e0e0/999999?text=Series"
								/>
							</Box>
							<div>
								<Text size="sm" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL} lineClamp={2}>
									{getNodeDisplayName(seriesItem)}
								</Text>
								{/* Badge  variant="light" size="xs" mt={4}>
									{seriesItem.itemCount || 0} items
								</Badge */}
							</div>
						</Stack>
					</Card>
				))}
			</SimpleGrid>

			<Box mt="md" ta="center">
				<Text
					component={Link}
					href="/series"
					size="sm"
					c="blue"
					td="underline"
				>
          View all series →
				</Text>
			</Box>
		</Box>
	);
}

// Main page component
export default function DatabasePage() {
	const [stats, setStats] = useState<DatabaseStats>(initialStats);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadData = async () => {
			try {
				const databaseStats = await loadDatabaseStats();
				setStats(databaseStats);
			} catch (error: unknown) {
				// Failed to load database stats, keeping initial values
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error("Failed to load database stats:", errorMessage);
			} finally {
				setLoading(false);
			}
		};

		void loadData();
	}, []);

	if (loading) {
		return (
			<Container size="xl" py="xl">
				<Stack gap="xl">
					{/* Header */}
					<Box>
						<Title order={1} mb="sm">
							Hobby Database
						</Title>
						<Text size="lg" color="dimmed">
							Browse our comprehensive collection of hobby items, including Gundam models, figures, and accessories
						</Text>
					</Box>

					{/* Loading skeleton */}
					<SimpleGrid
						cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
						spacing={{ base: "sm", md: "lg" }}
					>
						{[1, 2, 3, 4].map((i) => (
							<Card key={i} p="lg" radius="md">
								<Group>
									<Skeleton height={48} width={48} radius="md" />
									<div>
										<Skeleton height={16} width={80} mb={4} />
										<Skeleton height={24} width={40} />
									</div>
								</Group>
							</Card>
						))}
					</SimpleGrid>
				</Stack>
			</Container>
		);
	}

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
            Hobby Database
					</Title>
					<Text size="lg" color="dimmed">
            Browse our comprehensive collection of hobby items, including Gundam models, figures, and accessories
					</Text>
				</Box>

				{/* Quick Search */}
				<Card p="lg" radius="md" withBorder={true}>
					<Card
						component={Link}
						href="/search"
						p="md"
						radius="md"
						className={searchCard}
					>
						<Group>
							<IconSearch size={UI.ICON_SIZE_LG} />
							<Text>Search the database...</Text>
						</Group>
					</Card>
				</Card>

				{/* Statistics */}
				<DatabaseStats stats={stats} />

				{/* Categories Grid */}
				<CategoriesGrid categories={stats.categories} />

				{/* Brands Grid */}
				<BrandsGrid brands={stats.brands} />

				{/* Series Grid */}
				<SeriesGrid series={stats.series} />

				{/* Quick Actions */}
				<Card p="lg" radius="md" withBorder={true}>
					<Title order={3} mb="md">
            Quick Actions
					</Title>
					<SimpleGrid
						cols={{ base: 1, sm: 3 }}
						spacing={{ base: "sm", md: "md" }}
					>
						<Card
							component={Link}
							href="/items"
							p="md"
							radius="md"
							className={actionCard}
							withBorder={true}
						>
							<Group>
								<IconBox size={UI.ICON_SIZE_LG} />
								<Text fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>Browse All Items</Text>
							</Group>
						</Card>

						<Card
							component={Link}
							href="/collection"
							p="md"
							radius="md"
							className={actionCard}
							withBorder={true}
						>
							<Group>
								<IconFolder size={UI.ICON_SIZE_LG} />
								<Text fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>My Collection</Text>
							</Group>
						</Card>

						<Card
							component={Link}
							href="/import"
							p="md"
							radius="md"
							className={actionCard}
							withBorder={true}
						>
							<Group>
								<IconTrendingUp size={UI.ICON_SIZE_LG} />
								<Text fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>Import Data</Text>
							</Group>
						</Card>
					</SimpleGrid>
				</Card>
			</Stack>
		</Container>
	);
}