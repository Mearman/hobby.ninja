import { getNodeDisplayName } from "@hobby-ninja/data";
import {
	categoriesList,
	type Category,
} from "@hobby-ninja/data/categories";
import {
	Anchor,
	Box,
	Breadcrumbs,
	Card,
	Container,
	Group,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	IconApps,
	IconChartBar,
	IconClock,
	IconFlame,
	IconHome,
	IconStar,
	IconTag,
	IconTrendingUp,
} from "@tabler/icons-react";
import Link from "next/link";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { categoryCard, categoryIcon } from "@/styles/components.css";

interface CategoryWithCount extends Category {
	itemCount: number;
	popularity?: number;
	description?: string;
	lastUpdated?: Date;
	featured?: boolean;
}

interface CategoryStats {
	totalItems: number;
	totalCategories: number;
	avgItemsPerCategory: number;
	mostPopular: CategoryWithCount;
	recentlyUpdated: CategoryWithCount[];
}

// Enhanced Category Icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
	gunpla: <IconApps size={32} />,
	"30-minutes-label": <IconClock size={32} />,
	"character-plastic-model": <IconStar size={32} />,
	"overall-top": <IconTrendingUp size={32} />,
	"product-list": <IconTag size={32} />,
	default: <IconTag size={32} />,
};

// Category Colors
const CATEGORY_COLORS: Record<string, string> = {
	gunpla: "#ff6b6b",
	"30-minutes-label": "#4ecdc4",
	"character-plastic-model": "#45b7d1",
	"overall-top": "#f7b731",
	"product-list": "#5f27cd",
	default: "#748ffc",
};

const FEATURED_CATEGORIES = new Set(["gunpla", "character-plastic-model", "30-minutes-label"]);

// Enhanced Category Card Component
function EnhancedCategoryCard({
	category,
}: {
	category: CategoryWithCount;
}) {
	const color = CATEGORY_COLORS[category.id] ?? CATEGORY_COLORS.default;
	const icon = CATEGORY_ICONS[category.id] ?? CATEGORY_ICONS.default;

	return (
		<Link href={`/category/${category.id}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				p="lg"
				radius="md"
				className={categoryCard}
				withBorder={true}
				h="100%"
				pos="relative"
			>
				{category.featured && (
					<Box pos="absolute" top={10} right={10}>
						<Badge color="yellow" variant="filled" size="xs">
							<IconStar size={10} style={{ marginRight: 4 }} />
						Featured
						</Badge>
					</Box>
				)}

				<Stack align="center" gap="md">
					<div
						className={categoryIcon}
						style={{
							backgroundColor: `${color}20`,
							borderColor: color,
							color: color,
						}}
					>
						{icon}
					</div>

					<Stack align="center" gap={4}>
						<Text size="lg" fw={600} ta="center" lineClamp={2}>
							{getNodeDisplayName(category)}
						</Text>
						{category.description && (
							<Text size="sm" c="dimmed" ta="center" lineClamp={2}>
								{category.description}
							</Text>
						)}
					</Stack>

					<Badge variant="light" size="sm" color={color}>
						{category.itemCount} items
					</Badge>
				</Stack>
			</Card>
		</Link>
	);
}

// Featured Categories Section
function FeaturedCategories({ categories }: {
	categories: CategoryWithCount[];
}) {
	const featured = categories.filter(cat => cat.featured);

	if (featured.length === 0) return null;

	return (
		<Box mb="xl">
			<Title order={2} mb="md">
				<IconFlame size={24} style={{ marginRight: 8, color: "var(--mantine-color-yellow-6)" }} />
				Featured Categories
			</Title>
			<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
				{featured.map((category) => (
					<Link key={category.id} href={`/category/${category.id}`} style={{ textDecoration: "none", color: "inherit" }}>
						<Card
							p="lg"
							radius="md"
							withBorder={true}
							style={{
								background: `linear-gradient(135deg, ${CATEGORY_COLORS[category.id] ?? CATEGORY_COLORS.default}10 0%, transparent 100%)`,
								borderColor: CATEGORY_COLORS[category.id] ?? CATEGORY_COLORS.default,
							}}
						>
							<Group gap="md">
								<div
									className={categoryIcon}
									style={{
										backgroundColor: `${CATEGORY_COLORS[category.id] ?? CATEGORY_COLORS.default}20`,
										borderColor: CATEGORY_COLORS[category.id] ?? CATEGORY_COLORS.default,
									}}
								>
									{CATEGORY_ICONS[category.id] ?? CATEGORY_ICONS.default}
								</div>
								<Box style={{ flex: 1 }}>
									<Text fw={600} mb="xs">
										{getNodeDisplayName(category)}
									</Text>
									<Badge variant="light" size="sm" color={CATEGORY_COLORS[category.id]}>
										{category.itemCount} items
									</Badge>
								</Box>
							</Group>
						</Card>
					</Link>
				))}
			</SimpleGrid>
		</Box>
	);
}

// Recently Updated Categories
function RecentlyUpdatedCategories({ categories }: { categories: CategoryWithCount[] }) {
	const recentlyUpdated = categories
		.filter(cat => cat.lastUpdated)
		.toSorted((a, b) => (b.lastUpdated?.getTime() ?? 0) - (a.lastUpdated?.getTime() ?? 0))
		.slice(0, 5);

	if (recentlyUpdated.length === 0) return null;

	return (
		<Card p="lg" radius="md" withBorder={true} mb="xl">
			<Group gap="sm" mb="md">
				<IconClock size={20} color="var(--mantine-color-blue-6)" />
				<Title order={4}>Recently Updated</Title>
			</Group>
			<Stack gap="xs">
				{recentlyUpdated.map((category) => (
					<Group key={category.id} justify="space-between">
						<Anchor href={`/category/${category.id}`} size="sm">
							{getNodeDisplayName(category)}
						</Anchor>
						<Group gap="sm">
							<Text size="xs" c="dimmed">
								{category.lastUpdated?.toLocaleDateString()}
							</Text>
							<Badge variant="light" size="xs">
								{category.itemCount} items
							</Badge>
						</Group>
					</Group>
				))}
			</Stack>
		</Card>
	);
}

// Category Statistics Panel
function CategoryStatistics({ stats }: { stats: CategoryStats }) {
	return (
		<Card p="lg" radius="md" withBorder={true} mb="xl">
			<Title order={4} mb="md">
				<IconChartBar size={20} style={{ marginRight: 8 }} />
				Category Statistics
			</Title>
			<SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
				<Box ta="center">
					<Text size="2xl" fw={700} c="blue">
						{stats.totalCategories}
					</Text>
					<Text size="sm" c="dimmed">Total Categories</Text>
				</Box>
				<Box ta="center">
					<Text size="2xl" fw={700} c="green">
						{stats.totalItems}
					</Text>
					<Text size="sm" c="dimmed">Total Items</Text>
				</Box>
				<Box ta="center">
					<Text size="2xl" fw={700} c="orange">
						{Math.round(stats.avgItemsPerCategory)}
					</Text>
					<Text size="sm" c="dimmed">Avg Items/Category</Text>
				</Box>
				<Box ta="center">
					<Text size="xl" fw={600} c="grape" truncate={true}>
						{getNodeDisplayName(stats.mostPopular)}
					</Text>
					<Text size="sm" c="dimmed">Most Popular</Text>
				</Box>
			</SimpleGrid>
		</Card>
	);
}

// Helper function to generate category descriptions
function getCategoryDescription(categoryId: string): string {
	const descriptions: Record<string, string> = {
		gunpla: "Gundam plastic model kits - the iconic mecha models from the Gundam franchise",
		"30-minutes-label": "Easy-to-assemble model kits designed for beginners and quick builds",
		"character-plastic-model": "Detailed plastic models featuring popular anime and game characters",
		"overall-top": "Featured and popular items across all categories",
		"product-list": "Complete catalog of all available products and models",
	};

	return descriptions[categoryId] ?? `Browse items in the ${categoryId.replaceAll("-", " ")} category`;
}

// Server Component - Data loaded at build time
export default function CategoriesPage() {
	// Load data synchronously at build time
	const categoriesData = categoriesList;
	// Threshold for popularity calculation (10% of total categories)
	const POPULARITY_THRESHOLD = 0.1;

	// Attach item counts and additional metadata to categories
	const categoriesWithCounts = categoriesData.map(category => {
		// Count items using the itemIds array on each category
		const itemCount = category.itemIds.length;
		const totalCount = categoriesData.length;

		// Generate additional metadata
		return {
			...category,
			itemCount,
			popularity: Math.max(10, Math.min(100, (itemCount / Math.max(1, totalCount * POPULARITY_THRESHOLD)) * 100)),
			description: getCategoryDescription(category.id),
			lastUpdated: undefined,
			featured: FEATURED_CATEGORIES.has(category.id),
		};
	});

	// Sort categories by name
	const categories = categoriesWithCounts.toSorted((a, b) =>
		getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)),
	);

	// Calculate statistics
	let totalItems = 0;
	for (const cat of categories) {
		totalItems += cat.itemCount;
	}

	const avgItemsPerCategory = categories.length > 0 ? totalItems / categories.length : 0;
	let mostPopular = categories[0] ?? ({} as CategoryWithCount);
	for (const cat of categories) {
		if (cat.itemCount > mostPopular.itemCount) {
			mostPopular = cat;
		}
	}

	// Empty recentlyUpdated since we don't have real lastUpdated data
	const recentlyUpdated: CategoryWithCount[] = [];

	const stats: CategoryStats = {
		totalItems,
		totalCategories: categories.length,
		avgItemsPerCategory,
		mostPopular,
		recentlyUpdated,
	};

	const total = categories.length;

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
					<Anchor href="/categories" size="sm">
						Categories
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						<IconApps size={36} style={{ marginRight: 12, verticalAlign: "middle" }} />
						Category Explorer
					</Title>
					<Text size="lg" c="dimmed">
						Explore {total.toLocaleString()} categories in our database
					</Text>
				</Box>

				{/* Statistics Panel */}
				<CategoryStatistics stats={stats} />

				{/* Featured Categories */}
				<FeaturedCategories categories={categories} />

				{/* All Categories */}
				<Box>
					<Title order={3} mb="md">
						All Categories
					</Title>
					<SimpleGrid
						cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
						spacing="md"
					>
						{categories.map((category) => (
							<EnhancedCategoryCard
								key={category.id}
								category={category}
							/>
						))}
					</SimpleGrid>
				</Box>

				{/* Recently Updated */}
				<RecentlyUpdatedCategories categories={categories} />
			</Stack>
		</Container>
	);
}
