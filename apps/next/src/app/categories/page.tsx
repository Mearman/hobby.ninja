"use client";

import { Badge } from "@/components/ui/badge";
import {
	Anchor,
	Avatar,
	Box,
	Breadcrumbs,
	Button,
	Card,
	Container,
	Divider,
	Group,
	Grid,
	Pagination,
	Progress,
	RingProgress,
	ScrollArea,
	SimpleGrid,
	Stack,
	Switch,
	Text,
	TextInput,
	Title,
	Tooltip,
} from "@mantine/core";
import {
	IconApps,
	IconArrowUp,
	IconBookmark,
	IconCategory,
	IconChartBar,
	IconClock,
	IconCompare,
	IconFilter,
	IconFire,
	IconFolder,
	IconGrid3x3,
	IconHeart,
	IconHome,
	IconList,
	IconRefresh,
	IconSearch,
	IconStar,
	IconTag,
	IconTrendingUp,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { getAllCategories, getAllItems, getStaticData } from "@/lib/graph-data";
import { getNodeDisplayName } from "@/lib/schemas";
import { categoryCard, categoryIcon } from "@/styles/components.css";

// Define types locally to avoid circular imports
interface Category {
	id: string;
	type: string;
	name: string | { ja: string; en?: string };
	url?: string;
}

interface Item {
	id: string;
	type: string;
	name: string | { ja: string; en?: string };
	category?: string;
}

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
	"product-list": <IconGrid3x3 size={32} />,
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

const ITEMS_PER_PAGE = 24;
const FEATURED_CATEGORIES = ["gunpla", "character-plastic-model", "30-minutes-label"];

// Enhanced Category Card Component
function EnhancedCategoryCard({
	category,
	viewMode = "grid",
	onCompare
}: {
	category: CategoryWithCount;
	viewMode?: "grid" | "list";
	onCompare?: (category: CategoryWithCount) => void;
}) {
	const color = CATEGORY_COLORS[category.id] ?? CATEGORY_COLORS.default;
	const icon = CATEGORY_ICONS[category.id] ?? CATEGORY_ICONS.default;

	return (
		<Card
			component={Link}
			href={`/category/${category.id}`}
			p={viewMode === "grid" ? "lg" : "md"}
			radius="md"
			className={categoryCard}
			withBorder={true}
			h="100%"
			pos="relative"
		>
			{category.featured && (
				<Badge
					pos="absolute"
					top={10}
					right={10}
					color="yellow"
					variant="filled"
					size="xs"
				>
					<IconStar size={10} style={{ marginRight: 4 }} />
					Featured
				</Badge>
			)}

			<Stack align="center" gap="md">
				<Group gap="sm">
					<div
						className={categoryIcon}
						style={{
							backgroundColor: `${color}20`,
							borderColor: color,
							color: color
						}}
					>
						{icon}
					</div>
					{category.popularity && (
						<RingProgress
							size={40}
							roundCaps
							thickness={4}
							sections={[
								{ value: category.popularity, color: 'yellow' }
							]}
							label={
								<Text size="xs" ta="center">
									{Math.round(category.popularity)}%
								</Text>
							}
						/>
					)}
				</Group>

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

				<Stack gap={8}>
					<Group gap={8}>
						<Badge
							variant="light"
							size="sm"
							color={color}
							style={{ flex: 1 }}
						>
							{category.itemCount} items
						</Badge>
						{category.popularity && category.popularity > 70 && (
							<Badge variant="outline" size="sm" color="yellow">
								<IconFire size={10} style={{ marginRight: 2 }} />
								Popular
							</Badge>
						)}
					</Group>

					{onCompare && (
						<Button
							size="compact-xs"
							variant="outline"
							leftSection={<IconCompare size={10} />}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onCompare(category);
							}}
							fullWidth
						>
							Compare
						</Button>
					)}
				</Stack>
			</Stack>
		</Card>
	);
}

// Category List View Component
function CategoryListItem({ category, onCompare }: { category: CategoryWithCount; onCompare?: (category: CategoryWithCount) => void }) {
	const color = CATEGORY_COLORS[category.id] ?? CATEGORY_COLORS.default;
	const icon = CATEGORY_ICONS[category.id] ?? CATEGORY_ICONS.default;

	return (
		<Card component={Link} href={`/category/${category.id}`} withBorder={true} p="md">
			<Group justify="space-between" align="center">
				<Group gap="md">
					<Avatar size="lg" color={color}>
						{icon}
					</Avatar>
					<Box>
						<Group gap="sm" align="center">
							<Text size="md" fw={600}>
								{getNodeDisplayName(category)}
							</Text>
							{category.featured && (
								<Badge color="yellow" variant="filled" size="xs">
									<IconStar size={8} />
								</Badge>
							)}
							{category.popularity && category.popularity > 70 && (
								<Badge color="orange" variant="light" size="xs">
									<IconFire size={8} />
								</Badge>
							)}
						</Group>
						{category.description && (
							<Text size="sm" c="dimmed" lineClamp={1}>
								{category.description}
							</Text>
						)}
						<Text size="xs" c="dimmed">
							ID: {category.id}
						</Text>
					</Box>
				</Group>

				<Group gap="lg" align="center">
					<Group gap="sm">
						<Badge variant="light" color={color}>
							{category.itemCount} items
						</Badge>
						{category.popularity && (
							<Tooltip label={`Popularity: ${Math.round(category.popularity)}%`}>
								<Progress
									size="xs"
									value={category.popularity}
									color="yellow"
									w={60}
								/>
							</Tooltip>
						)}
					</Group>

					{onCompare && (
						<Button
							size="compact-sm"
							variant="outline"
							leftSection={<IconCompare size={12} />}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onCompare(category);
							}}
						>
							Compare
						</Button>
					)}
				</Group>
			</Group>
		</Card>
	);
}

// Featured Categories Section
function FeaturedCategories({ categories, onCategoryClick }: {
	categories: CategoryWithCount[];
	onCategoryClick: (category: CategoryWithCount) => void;
}) {
	const featured = categories.filter(cat => cat.featured);

	if (featured.length === 0) return null;

	return (
		<Box mb="xl">
			<Title order={2} mb="md">
				<IconFire size={24} style={{ marginRight: 8, color: 'var(--mantine-color-yellow-6)' }} />
				Featured Categories
			</Title>
			<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
				{featured.map((category) => (
					<Card
						key={category.id}
						component={Link}
						href={`/category/${category.id}`}
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
				))}
			</SimpleGrid>
		</Box>
	);
}

// Recently Updated Categories
function RecentlyUpdatedCategories({ categories }: { categories: CategoryWithCount[] }) {
	const recentlyUpdated = categories
		.filter(cat => cat.lastUpdated)
		.sort((a, b) => (b.lastUpdated?.getTime() ?? 0) - (a.lastUpdated?.getTime() ?? 0))
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

// Category Comparison Panel
function ComparisonPanel({
	comparingCategories,
	onRemove,
	onClear
}: {
	comparingCategories: CategoryWithCount[];
	onRemove: (id: string) => void;
	onClear: () => void;
}) {
	if (comparingCategories.length === 0) return null;

	return (
		<Card p="lg" radius="md" withBorder={true} mb="xl">
			<Group justify="space-between" mb="md">
				<Group gap="sm">
					<IconCompare size={20} />
					<Title order={4}>Comparing ({comparingCategories.length})</Title>
				</Group>
				<Button size="compact-sm" variant="outline" onClick={onClear}>
					Clear All
				</Button>
			</Group>

			<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
				{comparingCategories.map((category) => (
					<Card key={category.id} p="md" withBorder={true}>
						<Group justify="space-between" align="start">
							<Box>
								<Text size="sm" fw={600} mb="xs">
									{getNodeDisplayName(category)}
								</Text>
								<Badge variant="light" size="sm">
									{category.itemCount} items
								</Badge>
							</Box>
							<Button
								size="compact-xs"
								variant="subtle"
								color="red"
								onClick={() => onRemove(category.id)}
							>
								Remove
							</Button>
						</Group>
					</Card>
				))}
			</SimpleGrid>
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
					<Text size="xl" fw={600} c="grape" truncate>
						{getNodeDisplayName(stats.mostPopular)}
					</Text>
					<Text size="sm" c="dimmed">Most Popular</Text>
				</Box>
			</SimpleGrid>
		</Card>
	);
}

export default function CategoriesPage() {
	const [categories, setCategories] = useState<CategoryWithCount[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [comparingCategories, setComparingCategories] = useState<CategoryWithCount[]>([]);
	const [sortBy, setSortBy] = useState<"name" | "count" | "popularity">("name");
	const [showStats, setShowStats] = useState(true);

	// Load data
	useEffect(() => {
		const loadData = async () => {
			try {
				const [categoriesData, itemsData] = await Promise.all([getAllCategories(), getAllItems()]);
				const staticData = getStaticData();

				// Count items per category using edges data
				const categoryCounts = new Map<string, number>();

				// Process edges to count items per category
				for (const [edgeKey] of Object.entries(staticData.edges)) {
					if (edgeKey.includes(":BELONGS_TO_CATEGORY:category:")) {
						const categoryId = edgeKey.split(":").pop() || "";
						if (categoryId) {
							categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
						}
					}
				}

				// Attach item counts and additional metadata to categories
				const categoriesWithCounts = (categoriesData as Category[]).map(category => {
					const itemCount = categoryCounts.get(category.id) ?? 0;
					const totalCount = categoriesData.length;

					// Generate additional metadata
					return {
						...category,
						itemCount,
						popularity: Math.max(10, Math.min(100, (itemCount / Math.max(1, totalCount * 0.1)) * 100)),
						description: getCategoryDescription(category.id),
						lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
						featured: FEATURED_CATEGORIES.includes(category.id),
					};
				});

				setCategories(categoriesWithCounts);
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error("Failed to load categories:", errorMessage);
			} finally {
				setLoading(false);
			}
		};

		void loadData();
	}, []);

	// Handle URL params
	useEffect(() => {
		const url = new URL(globalThis.location.href);
		const pageParam = url.searchParams.get("page");
		const queryParam = url.searchParams.get("q");
		const viewParam = url.searchParams.get("view");
		const sortParam = url.searchParams.get("sort");

		setSearchQuery(queryParam ?? "");
		setPage(pageParam ? Number.parseInt(pageParam, 10) : 1);
		setViewMode((viewParam as "grid" | "list") ?? "grid");
		setSortBy((sortParam as "name" | "count" | "popularity") ?? "name");
	}, []);

	// Update URL when params change
	const updateUrl = React.useCallback((newPage?: number, newQuery?: string, newView?: string, newSort?: string) => {
		const url = new URL(globalThis.location.href);

		if (newPage !== undefined) {
			url.searchParams.set("page", newPage.toString());
		}
		if (newQuery !== undefined) {
			if (newQuery) {
				url.searchParams.set("q", newQuery);
			} else {
				url.searchParams.delete("q");
			}
			url.searchParams.delete("page");
		}
		if (newView !== undefined) {
			url.searchParams.set("view", newView);
		}
		if (newSort !== undefined) {
			url.searchParams.set("sort", newSort);
		}

		globalThis.history.pushState({}, "", url.toString());
	}, []);

	// Calculate statistics
	const stats = useMemo(() => {
		if (categories.length === 0) return {
			totalItems: 0,
			totalCategories: 0,
			avgItemsPerCategory: 0,
			mostPopular: {} as CategoryWithCount,
			recentlyUpdated: [],
		};

		const totalItems = categories.reduce((sum, cat) => sum + cat.itemCount, 0);
		const avgItemsPerCategory = totalItems / categories.length;
		const mostPopular = categories.reduce((max, cat) =>
			cat.itemCount > max.itemCount ? cat : max, categories[0]);
		const recentlyUpdated = [...categories]
			.filter(cat => cat.lastUpdated)
			.sort((a, b) => (b.lastUpdated?.getTime() ?? 0) - (a.lastUpdated?.getTime() ?? 0))
			.slice(0, 5);

		return {
			totalItems,
			totalCategories: categories.length,
			avgItemsPerCategory,
			mostPopular,
			recentlyUpdated,
		};
	}, [categories]);

	// Filter and sort categories
	const filteredCategories = useMemo(() => {
		let filtered = categories;

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(category =>
				getNodeDisplayName(category).toLowerCase().includes(query) ||
				category.description?.toLowerCase().includes(query) ||
				category.id.toLowerCase().includes(query)
			);
		}

		// Sort categories
		filtered = [...filtered].sort((a, b) => {
			switch (sortBy) {
				case "count":
					return b.itemCount - a.itemCount;
				case "popularity":
					return (b.popularity ?? 0) - (a.popularity ?? 0);
				case "name":
				default:
					return getNodeDisplayName(a).localeCompare(getNodeDisplayName(b));
			}
		});

		return filtered;
	}, [categories, searchQuery, sortBy]);

	const total = filteredCategories.length;
	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
	const startIndex = (page - 1) * ITEMS_PER_PAGE;
	const paginatedCategories = filteredCategories.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	// Event handlers
	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		setPage(1);
		updateUrl(1, value, undefined, sortBy);
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
		updateUrl(newPage, undefined, undefined, sortBy);
	};

	const handleClearSearch = () => {
		setSearchQuery("");
		setPage(1);
		updateUrl(1, "", undefined, sortBy);
	};

	const handleViewModeChange = (mode: "grid" | "list") => {
		setViewMode(mode);
		updateUrl(undefined, undefined, mode, sortBy);
	};

	const handleSortChange = (sort: "name" | "count" | "popularity") => {
		setSortBy(sort);
		setPage(1);
		updateUrl(1, undefined, viewMode, sort);
	};

	const handleCompare = (category: CategoryWithCount) => {
		if (!comparingCategories.find(c => c.id === category.id)) {
			setComparingCategories([...comparingCategories, category]);
		}
	};

	const handleRemoveCompare = (id: string) => {
		setComparingCategories(comparingCategories.filter(c => c.id !== id));
	};

	const handleClearCompare = () => {
		setComparingCategories([]);
	};

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
						<Category size={36} style={{ marginRight: 12, verticalAlign: 'middle' }} />
						Category Explorer
					</Title>
					<Text size="lg" c="dimmed">
						{loading ? "Loading..." : `Explore ${total.toLocaleString()} categories in our comprehensive database`}
					</Text>
				</Box>

				{/* Search and Filters */}
				<Card p="lg" radius="md" withBorder={true}>
					<Stack gap="md">
						<TextInput
							leftSection={<IconSearch size={16} />}
							placeholder="Search categories by name, description, or ID..."
							value={searchQuery}
							onChange={(e) => { handleSearchChange(e.target.value); }}
							size="md"
						/>

						<Group justify="space-between">
							<Group gap="sm">
								<Button
									variant={viewMode === "grid" ? "filled" : "outline"}
									size="compact-sm"
									leftSection={<IconGrid3x3 size={14} />}
									onClick={() => handleViewModeChange("grid")}
								>
									Grid
								</Button>
								<Button
									variant={viewMode === "list" ? "filled" : "outline"}
									size="compact-sm"
									leftSection={<IconList size={14} />}
									onClick={() => handleViewModeChange("list")}
								>
									List
								</Button>

								<Divider orientation="vertical" />

								<Button
									variant={sortBy === "name" ? "filled" : "outline"}
									size="compact-sm"
									onClick={() => handleSortChange("name")}
								>
									Name
								</Button>
								<Button
									variant={sortBy === "count" ? "filled" : "outline"}
									size="compact-sm"
									onClick={() => handleSortChange("count")}
								>
									Items
								</Button>
								<Button
									variant={sortBy === "popularity" ? "filled" : "outline"}
									size="compact-sm"
									onClick={() => handleSortChange("popularity")}
								>
									Popular
								</Button>
							</Group>

							<Group gap="sm">
								<Switch
									label="Show Stats"
									checked={showStats}
									onChange={(e) => setShowStats(e.currentTarget.checked)}
									size="sm"
								/>
								{searchQuery && (
									<Anchor size="sm" onClick={handleClearSearch}>
										Clear Search
									</Anchor>
								)}
							</Group>
						</Group>
					</Stack>
				</Card>

				{/* Statistics Panel */}
				{showStats && !loading && <CategoryStatistics stats={stats} />}

				{/* Featured Categories */}
				{!loading && (
					<FeaturedCategories
						categories={categories}
						onCategoryClick={(cat) => console.log("Clicked:", cat)}
					/>
				)}

				{/* Comparison Panel */}
				<ComparisonPanel
					comparingCategories={comparingCategories}
					onRemove={handleRemoveCompare}
					onClear={handleClearCompare}
				/>

				{/* Results */}
				<Box>
					<Group justify="space-between" mb="md">
						<Text size="sm" c="dimmed">
							Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)}-{Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()} categories
							{searchQuery && ` matching "${searchQuery}"`}
						</Text>
					</Group>

					{loading ? (
						<Text ta="center" c="dimmed" py="xl">
							Loading categories...
						</Text>
					) : paginatedCategories.length > 0 ? (
						<>
							{viewMode === "grid" ? (
								<SimpleGrid
									cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
									spacing="md"
								>
									{paginatedCategories.map((category) => (
										<EnhancedCategoryCard
											key={category.id}
											category={category}
											viewMode="grid"
											onCompare={handleCompare}
										/>
									))}
								</SimpleGrid>
							) : (
								<Stack gap="sm">
									{paginatedCategories.map((category) => (
										<CategoryListItem
											key={category.id}
											category={category}
											onCompare={handleCompare}
										/>
									))}
								</Stack>
							)}
						</>
					) : (
						<Box ta="center" py="xl">
							<IconFolder size={64} color="var(--mantine-color-gray-4)" />
							<Title order={3} mt="md" mb="sm">
								{searchQuery ? "No categories found" : "No categories available"}
							</Title>
							<Text c="dimmed" mb="lg">
								{searchQuery
									? "Try adjusting your search terms or filters"
									: "There are no categories in the database yet."
								}
							</Text>
							{searchQuery && (
								<Anchor onClick={handleClearSearch}>
									Clear Search
								</Anchor>
							)}
						</Box>
					)}
				</Box>

				{/* Pagination */}
				{!loading && totalPages > 1 && (
					<Pagination
						total={totalPages}
						value={page}
						onChange={handlePageChange}
						siblings={1}
						boundaries={2}
						size="md"
					/>
				)}

				{/* Recently Updated */}
				{!loading && <RecentlyUpdatedCategories categories={categories} />}
			</Stack>
		</Container>
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

	return descriptions[categoryId] ?? `Browse items in the ${categoryId.replace(/-/g, ' ')} category`;
}