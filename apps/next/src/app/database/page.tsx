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

// UTF-8 safe Base64 encoding function
const utf8ToBase64 = (str: string): string => {
	try {
		// Use TextEncoder for proper UTF-8 encoding
		const encoder = new TextEncoder();
		const uint8Array = encoder.encode(str);
		// Convert binary string to base64
		let binary = '';
		for (let i = 0; i < uint8Array.length; i++) {
			binary += String.fromCharCode(uint8Array[i]);
		}
		return btoa(binary);
	} catch (error) {
		// Fallback to URL-encoding for problematic characters
		return btoa(unescape(encodeURIComponent(str)));
	}
};

// Generate SVG placeholder for brands
const generateBrandPlaceholder = (brandName: string): string => {
	const colors = [
		"#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57",
		"#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
	];
	const colorIndex = brandName.length % colors.length;
	const bgColor = colors[colorIndex];

	// Escape SVG text content to handle special characters
	const escapedName = brandName.slice(0, 8)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.toUpperCase();

	const svg = `
		<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
			<rect width="60" height="60" fill="${bgColor}"/>
			<text x="30" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8" font-weight="bold">
				${escapedName}
			</text>
		</svg>
	`;
	return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
};

// Generate SVG placeholder for series
const generateSeriesPlaceholder = (seriesName: string): string => {
	const gradients = [
		["#667eea", "#764ba2"], ["#f093fb", "#f5576c"], ["#4facfe", "#00f2fe"],
		["#43e97b", "#38f9d7"], ["#fa709a", "#fee140"], ["#30cfd0", "#330867"]
	];
	const gradientIndex = seriesName.length % gradients.length;
	const [color1, color2] = gradients[gradientIndex];

	// Escape SVG text content to handle special characters
	const escapedName = seriesName.slice(0, 12)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.toUpperCase();

	const gradientId = `grad${Math.abs(seriesName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0))}`;

	const svg = `
		<svg width="160" height="80" viewBox="0 0 160 80" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
					<stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
				</linearGradient>
			</defs>
			<rect width="160" height="80" fill="url(#${gradientId})"/>
			<text x="80" y="45" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
				${escapedName}
			</text>
		</svg>
	`;
	return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
};

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
				{brands.map((brand) => {
					const displayName = getNodeDisplayName(brand);
					return (
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
										src={generateBrandPlaceholder(displayName)}
										alt={displayName}
										fit="contain"
										radius="sm"
										fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KCTxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0iI0Y1RjVGNSIvPgoJPHRleHQgeD0iMzAiIHk9IjM1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iOCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg=="
									/>
								</Box>
								<Text size="sm" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL} ta="center" lineClamp={2}>
									{displayName}
								</Text>
								{/* Badge  variant="light" size="xs">
									{brand.itemCount || 0} items
								</Badge */}
							</Stack>
						</Card>
					);
				})}
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
				{series.map((seriesItem) => {
					const displayName = getNodeDisplayName(seriesItem);
					return (
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
										src={generateSeriesPlaceholder(displayName)}
										alt={displayName}
										fit="cover"
										radius="sm"
										fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTYwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgoJPHJlY3Qgd2lkdGg9IjE2MCIgaGVpZ2h0PSI4MCIgZmlsbD0iI0Y1RjVGNSIvPgoJPHRleHQgeD0iODAiIHk9IjQ1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4="
									/>
								</Box>
								<div>
									<Text size="sm" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL} lineClamp={2}>
										{displayName}
									</Text>
									{/* Badge  variant="light" size="xs" mt={4}>
										{seriesItem.itemCount || 0} items
									</Badge */}
								</div>
							</Stack>
						</Card>
					);
				})}
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