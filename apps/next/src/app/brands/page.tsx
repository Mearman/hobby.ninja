import { resolveCdnUrl } from "@hobby-ninja/data";
import {
	Anchor,
	Badge,
	Box,
	Breadcrumbs,
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
	IconHome,
	IconStarFilled,
} from "@tabler/icons-react";
import Link from "next/link";

import { BrandsClient } from "./brands-client";

import { getAllBrands, getAllItems } from "@/lib/graph-data";
import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";
import { categoryCard } from "@/styles/components.css";


// Types
interface Brand {
	id: string;
	type: string;
	name: string | { ja: string; en?: string };
	image?: string;
	country?: string;
	founded?: string | number;
	website?: string;
	description?: string;
	url?: string;
	metadata?: Record<string, unknown>;
}

interface Item {
	id: string;
	type: string;
	name: string | { ja: string; en?: string };
	brand?: string;
	price?: {
		amount: number;
		currency: string;
	};
	releaseDate?: {
		ja: string;
		year?: number;
	};
	grade?: string;
	scale?: string;
	category?: string;
	series?: string;
	tags?: string[];
}

interface BrandWithStats extends Brand {
	itemCount: number;
	averagePrice?: number;
	minPrice?: number;
	maxPrice?: number;
	priceCurrency?: string;
	grades: string[];
	scales: string[];
	categories: string[];
	series: string[];
	isFeatured?: boolean;
}

// Helper functions
const getDisplayName = (brand: Brand | BrandWithStats): string => {
	if (typeof brand.name === "string") return brand.name;
	const nameObj = brand.name as { ja: string; en?: string };
	return nameObj.en ?? nameObj.ja;
};

const getCountryFlag = (country?: string): string => {
	if (!country) return "";
	/* eslint-disable no-emoji/no-emoji -- Country flags are intentional UI elements */
	const flags: Record<string, string> = {
		japan: "🇯🇵",
		china: "🇨🇳",
		korea: "🇰🇷",
		usa: "🇺🇸",
		taiwan: "🇹🇼",
	};
	/* eslint-enable no-emoji/no-emoji */
	return flags[country.toLowerCase()] ?? "";
};

// Process brands with statistics from items
function processBrandsWithStats(brandsData: Brand[], itemsData: Item[]): BrandWithStats[] {
	// Process brands with statistics
	const brandStats = new Map<string, {
		count: number;
		prices: number[];
		grades: Set<string>;
		scales: Set<string>;
		categories: Set<string>;
		series: Set<string>;
	}>();

	// Initialize stats map
	for (const brand of brandsData) {
		brandStats.set(brand.id, {
			count: 0,
			prices: [],
			grades: new Set(),
			scales: new Set(),
			categories: new Set(),
			series: new Set(),
		});
	}

	// Collect statistics from items
	for (const item of itemsData) {
		if (item.type === "item" && item.brand) {
			const stats = brandStats.get(item.brand);
			if (stats) {
				stats.count++;
				if (item.price?.amount) {
					stats.prices.push(item.price.amount);
				}
				if (item.grade) stats.grades.add(item.grade);
				if (item.scale) stats.scales.add(item.scale);
				if (item.category) stats.categories.add(item.category);
				if (item.series) stats.series.add(item.series);
			}
		}
	}

	// Create brands with statistics
	const brandsWithStats = brandsData.map(brand => {
		const stats = brandStats.get(brand.id) ?? {
			count: 0,
			prices: [],
			grades: new Set<string>(),
			scales: new Set<string>(),
			categories: new Set<string>(),
			series: new Set<string>(),
		};

		const prices = stats.prices.length > 0 ? stats.prices : [0];
		let priceSum = 0;
		for (const p of prices) {
			priceSum += p;
		}
		const averagePrice = priceSum / prices.length;
		const minPrice = Math.min(...prices);
		const maxPrice = Math.max(...prices);

		// Determine if featured (top 20% by item count)
		const allCounts = [...brandStats.values()].map(s => s.count);
		const threshold = allCounts.toSorted((a, b) => b - a)[Math.floor(allCounts.length * 0.2)] ?? 0;

		return {
			...brand,
			itemCount: stats.count,
			averagePrice: averagePrice > 0 ? averagePrice : undefined,
			minPrice: minPrice > 0 ? minPrice : undefined,
			maxPrice: maxPrice > 0 ? maxPrice : undefined,
			priceCurrency: stats.prices.length > 0 ? "JPY" : undefined,
			grades: [...stats.grades],
			scales: [...stats.scales],
			categories: [...stats.categories],
			series: [...stats.series],
			isFeatured: stats.count >= threshold,
		};
	});

	// Sort by name
	brandsWithStats.sort((a, b) => {
		const nameA = getDisplayName(a);
		const nameB = getDisplayName(b);
		return nameA.localeCompare(nameB);
	});

	return brandsWithStats;
}

// Brand Card Component
function BrandCard({ brand }: { brand: BrandWithStats }) {
	return (
		<Link href={`/brands/${encodeURIComponent(brand.id)}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				p="md"
				radius="md"
				className={categoryCard}
				withBorder={true}
			>
				<Stack gap="md">
					<Group justify="space-between" align="flex-start">
						<Group gap="sm">
							<Box w={80} h={80}>
								<Image
									src={brand.image ? resolveCdnUrl(brand.image) : createPlaceholderSvg(getDisplayName(brand).slice(0, 3), 80, 80)}
									alt={getDisplayName(brand)}
									fit="contain"
									radius="sm"
									fallbackSrc={createErrorPlaceholderSvg(80, 80)}
								/>
							</Box>
							<Stack gap="xs" flex={1}>
								<Text size="md" fw={600} lineClamp={2}>
									{getDisplayName(brand)}
								</Text>
								<Group gap="xs">
									{brand.country && (
										<Text size="xs" c="dimmed">
											{getCountryFlag(brand.country)} {brand.country}
										</Text>
									)}
									{brand.founded && (
										<Text size="xs" c="dimmed">
										Est. {typeof brand.founded === "number" ? brand.founded : brand.founded}
										</Text>
									)}
								</Group>
							</Stack>
						</Group>
					</Group>

					<Group gap="xs" wrap="wrap">
						<Badge variant="light" size="sm">
							{brand.itemCount} items
						</Badge>
						{brand.averagePrice && (
							<Badge variant="light" color="green" size="sm">
								{brand.priceCurrency === "JPY" ? "¥" : brand.priceCurrency ?? "$"}{brand.averagePrice.toFixed(0)} avg
							</Badge>
						)}
						{brand.isFeatured && (
							<Badge variant="light" color="yellow" size="sm">
								<IconStarFilled size={10} />
							</Badge>
						)}
					</Group>

					<Group justify="space-between" align="center">
						<Text size="sm" fw={500} c="blue">
						View all items
						</Text>
						{brand.website && (
							<Text size="xs" c="dimmed">
							Has website
							</Text>
						)}
					</Group>
				</Stack>
			</Card>
		</Link>
	);
}

// Featured Brands Component
function FeaturedBrands({ brands }: { brands: BrandWithStats[] }) {
	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Group gap="sm" mb="md">
				<IconStarFilled size={20} color="var(--mantine-color-yellow-6)" />
				<Title order={3}>Featured Brands</Title>
			</Group>
			<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
				{brands.map((brand) => (
					<Card key={brand.id} p="sm" radius="md" withBorder={true} bg="var(--mantine-color-blue-0)">
						<BrandCard brand={brand} />
					</Card>
				))}
			</SimpleGrid>
		</Card>
	);
}

// Brand Statistics Component
function BrandStatistics({ brands }: { brands: BrandWithStats[] }) {
	let totalItems = 0;
	for (const brand of brands) {
		totalItems += brand.itemCount;
	}
	const avgItemsPerBrand = totalItems / brands.length;
	const topCountries: Record<string, number> = {};
	for (const brand of brands) {
		if (brand.country) {
			topCountries[brand.country] = (topCountries[brand.country] ?? 0) + 1;
		}
	}

	const sortedCountries = Object.entries(topCountries)
		.toSorted(([,a], [,b]) => b - a)
		.slice(0, 5);

	const stats = {
		totalBrands: brands.length,
		totalItems,
		avgItemsPerBrand,
		topCountries: sortedCountries,
	};

	return (
		<SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Total Brands</Text>
				<Text size="xl" fw={700} mt="sm">{stats.totalBrands.toLocaleString()}</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Total Items</Text>
				<Text size="xl" fw={700} mt="sm">{stats.totalItems.toLocaleString()}</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Avg Items/Brand</Text>
				<Text size="xl" fw={700} mt="sm">{stats.avgItemsPerBrand.toFixed(1)}</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Top Country</Text>
				<Text size="xl" fw={700} mt="sm">
					{stats.topCountries[0] ? `${getCountryFlag(stats.topCountries[0][0])} ${stats.topCountries[0][0]}` : "N/A"}
				</Text>
			</Card>
		</SimpleGrid>
	);
}

export default function BrandsPage() {
	// Load data synchronously
	const brandsData = getAllBrands() as Brand[];
	const itemsData = getAllItems() as Item[];

	// Process brands with statistics
	const brands = processBrandsWithStats(brandsData, itemsData);

	// Get featured brands (top 8)
	const featuredBrands = brands.filter(brand => brand.isFeatured).slice(0, 8);

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
					<Anchor href="/brands" size="sm">
						Brands
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Brand Directory
					</Title>
					<Text size="lg" c="dimmed">
						Explore {brands.length.toLocaleString()} manufacturers and brands in our database
					</Text>
				</Box>

				{/* Statistics */}
				<BrandStatistics brands={brands} />

				{/* Featured Brands */}
				{featuredBrands.length > 0 && <FeaturedBrands brands={featuredBrands} />}

				{/* All Brands with Infinite Scroll */}
				<Box>
					<Title order={2} mb="md">
						All Brands
					</Title>
					<BrandsClient brands={brands} totalBrands={brands.length} />
				</Box>
			</Stack>
		</Container>
	);
}
