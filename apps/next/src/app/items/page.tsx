"use client";

import { Badge } from "@/components/ui/badge";

import {
	Anchor,
	// Badge removed,
	Box,
	Breadcrumbs,
	Button,
	Card,
	Container,
	Grid,
	Group,
	Image,
	Pagination,
	Select,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import {
	IconBox,
	IconFilter,
	IconHome,
	IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useEffect, useState, useMemo } from "react";


import { PAGINATION } from "@/lib/constants";
import { getAllBrands, getAllCategories, getAllItems, getAllSeries } from "@/lib/graph-data";
import { BaseNode, getNodeDisplayName, isItemNode, isBrandNode, isCategoryNode, isSeriesNode, ItemNode } from "@/lib/schemas";
import {
	itemCard,
	itemCardBadge,
	itemCardImage,
	itemCardContent,
	itemCardMetadata,
	itemCardSubtitle,
	itemCardTitle,
} from "@/styles/components.css";

const ITEMS_PER_PAGE = 48;

// Item card component
function ItemCard({ item }: { item: ItemNode }) {
	if (!isItemNode(item)) return null;

	return (
		<Card
			component={Link}
			href={`/item/${item.id}`}
			p={0}
			radius="md"
			className={itemCard}
			withBorder={true}
		>
			<Box className={itemCardImage}>
				<Image
					src={`https://via.placeholder.com/280x200/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(item))}`}
					alt={getNodeDisplayName(item)}
					fit="cover"
					height={200}
					fallbackSrc="https://via.placeholder.com/280x200/e0e0e0/999999?text=No+Image"
				/>
			</Box>
			<Box className={itemCardContent}>
				<Text className={itemCardTitle} lineClamp={2}>
					{getNodeDisplayName(item)}
				</Text>
				{item.series && (
					<Text className={itemCardSubtitle} lineClamp={1}>
						{item.series}
					</Text>
				)}
				<Box className={itemCardMetadata}>
					{item.grade && (
						<Badge className={itemCardBadge} variant="light">
							{item.grade}
						</Badge>
					)}
					{item.scale && (
						<Badge className={itemCardBadge} variant="light">
							{item.scale}
						</Badge>
					)}
					{item.brand && (
						<Badge className={itemCardBadge} variant="outline">
							{item.brand}
						</Badge>
					)}
				</Box>
			</Box>
		</Card>
	);
}

export default function ItemsPage() {
	const [items, setItems] = useState<ItemNode[]>([]);
	const [brands, setBrands] = useState<string[]>([]);
	const [categories, setCategories] = useState<string[]>([]);
	const [series, setSeries] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);
	const [sortBy, setSortBy] = useState("date-desc");
	const [brandFilter, setBrandFilter] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("");
	const [seriesFilter, setSeriesFilter] = useState("");

	// Load data
	useEffect(() => {
		const loadData = async () => {
			try {
				const [itemsData, brandsData, categoriesData, seriesData] = await Promise.all([
					getAllItems(),
					getAllBrands(),
					getAllCategories(),
					getAllSeries(),
				]);

				const filteredItems = itemsData.filter(isItemNode);
				setItems(filteredItems);

				// Type-check brand, category, and series data
				const validBrands = brandsData.filter(isBrandNode);
				const validCategories = categoriesData.filter(isCategoryNode);
				const validSeries = seriesData.filter(isSeriesNode);

				setBrands(validBrands.map(b => getNodeDisplayName(b)));
				setCategories(validCategories.map(c => getNodeDisplayName(c)));
				setSeries(validSeries.map(s => getNodeDisplayName(s)));
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error("Failed to load items:", errorMessage);
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
		const sortParam = url.searchParams.get("sort");
		const brandParam = url.searchParams.get("brand");
		const categoryParam = url.searchParams.get("category");
		const seriesParam = url.searchParams.get("series");

		setSearchQuery(queryParam || "");
		setPage(pageParam ? Number.parseInt(pageParam, 10) : 1);
		setSortBy(sortParam || "date-desc");
		setBrandFilter(brandParam || "");
		setCategoryFilter(categoryParam || "");
		setSeriesFilter(seriesParam || "");
	}, []);

	// Update URL when params change
	const updateUrl = (updates: {
		page?: number;
		search?: string;
		sort?: string;
		brand?: string;
		category?: string;
		series?: string;
	}) => {
		const url = new URL(globalThis.location.href);

		if (updates.page !== undefined) {
			url.searchParams.set("page", updates.page.toString());
		}
		if (updates.search !== undefined) {
			if (updates.search) {
				url.searchParams.set("q", updates.search);
			} else {
				url.searchParams.delete("q");
			}
			url.searchParams.delete("page");
		}
		if (updates.sort !== undefined) {
			url.searchParams.set("sort", updates.sort);
		}
		if (updates.brand !== undefined) {
			if (updates.brand) {
				url.searchParams.set("brand", updates.brand);
			} else {
				url.searchParams.delete("brand");
			}
		}
		if (updates.category !== undefined) {
			if (updates.category) {
				url.searchParams.set("category", updates.category);
			} else {
				url.searchParams.delete("category");
			}
		}
		if (updates.series !== undefined) {
			if (updates.series) {
				url.searchParams.set("series", updates.series);
			} else {
				url.searchParams.delete("series");
			}
		}

		globalThis.history.pushState({}, "", url.toString());
	};

	// Filter and sort items
	const filteredItems = useMemo(() => {
		let filtered = items.filter(isItemNode);

		// Apply search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(item => {
				const name = getNodeDisplayName(item).toLowerCase();
				const brand = item.brand?.toLowerCase() ?? "";
				const series = item.series?.toLowerCase() ?? "";
				const grade = item.grade?.toLowerCase() ?? "";
				return name.includes(query) || brand.includes(query) || series.includes(query) || grade.includes(query);
			});
		}

		// Apply other filters
		if (brandFilter) {
			filtered = filtered.filter(item => item.brand === brandFilter);
		}
		if (categoryFilter) {
			filtered = filtered.filter(item => item.category === categoryFilter);
		}
		if (seriesFilter) {
			filtered = filtered.filter(item => item.series === seriesFilter);
		}

		// Apply sorting
		switch (sortBy) {
			case "name-asc": {
				filtered.sort((a, b) => getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)));
				break;
			}
			case "name-desc": {
				filtered.sort((a, b) => getNodeDisplayName(b).localeCompare(getNodeDisplayName(a)));
				break;
			}
			case "date-asc": {
				filtered.sort((a, b) => (a.created ?? "").localeCompare(b.created ?? ""));
				break;
			}
			case "date-desc": {
				filtered.sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""));
				break;
			}
			default: {
				break;
			}
		}

		return filtered;
	}, [items, searchQuery, brandFilter, categoryFilter, seriesFilter, sortBy]);

	const total = filteredItems.length;
	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
	const startIndex = (page - 1) * ITEMS_PER_PAGE;
	const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	// Event handlers
	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		setPage(1);
		updateUrl({ search: value });
	};

	const handleSortChange = (value: string | null) => {
		setSortBy(value ?? "");
		updateUrl({ sort: value ?? "" });
	};

	const handleBrandChange = (value: string | null) => {
		setBrandFilter(value ?? "");
		setPage(1);
		updateUrl({ brand: value ?? "" });
	};

	const handleCategoryChange = (value: string | null) => {
		setCategoryFilter(value ?? "");
		setPage(1);
		updateUrl({ category: value ?? "" });
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
		updateUrl({ page: newPage });
	};

	const handleClearFilters = () => {
		setSearchQuery("");
		setBrandFilter("");
		setCategoryFilter("");
		setSeriesFilter("");
		setPage(1);
		setSortBy("date-desc");
		updateUrl({ search: "", brand: "", category: "", series: "", sort: "date-desc" });
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
					<Anchor href="/items" size="sm">
						All Items
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						All Items
					</Title>
					<Text size="lg" c="dimmed">
						{loading ? "Loading..." : `Browse ${total.toLocaleString()} items in our database`}
					</Text>
				</Box>

				{/* Search and Filters */}
				<Card p="lg" radius="md" withBorder={true}>
					<Grid>
						<Grid.Col span={{ base: 12, md: 6 }}>
							<TextInput
								leftSection={<IconSearch size={16} />}
								placeholder="Search items..."
								value={searchQuery}
								onChange={(e) => { handleSearchChange(e.target.value); }}
							/>
						</Grid.Col>
						<Grid.Col span={{ base: 6, md: 2 }}>
							<Select
								leftSection={<IconFilter size={16} />}
								placeholder="Brand"
								data={[
									{ value: "", label: "All Brands" },
									...brands.map(brand => ({ value: brand, label: brand })),
								]}
								value={brandFilter}
								onChange={handleBrandChange}
								clearable={true}
							/>
						</Grid.Col>
						<Grid.Col span={{ base: 6, md: 2 }}>
							<Select
								placeholder="Category"
								data={[
									{ value: "", label: "All Categories" },
									...categories.map(category => ({ value: category, label: category })),
								]}
								value={categoryFilter}
								onChange={handleCategoryChange}
								clearable={true}
							/>
						</Grid.Col>
						<Grid.Col span={{ base: 6, md: 2 }}>
							<Select
								placeholder="Sort by"
								data={[
									{ value: "date-desc", label: "Latest First" },
									{ value: "date-asc", label: "Oldest First" },
									{ value: "name-asc", label: "Name (A-Z)" },
									{ value: "name-desc", label: "Name (Z-A)" },
								]}
								value={sortBy}
								onChange={handleSortChange}
							/>
						</Grid.Col>
					</Grid>
				</Card>

				{/* Results */}
				<Box>
					<Group justify="space-between" mb="md">
						<Text size="sm" c="dimmed">
							Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)}-{Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()} items
						</Text>
						{(searchQuery || brandFilter || categoryFilter || seriesFilter) && (
							<Button variant="light" size="sm" onClick={handleClearFilters}>
								Clear Filters
							</Button>
						)}
					</Group>

					{loading ? (
						<Text ta="center" c="dimmed">
							Loading items...
						</Text>
					) : paginatedItems.length > 0 ? (
						<SimpleGrid
							cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
							spacing="md"
						>
							{paginatedItems.map((item) => (
								<ItemCard key={item.id} item={item} />
							))}
						</SimpleGrid>
					) : (
						<Box ta="center" py="xl">
							<IconBox size={64} color="var(--mantine-color-gray-4)" />
							<Title order={3} mt="md" mb="sm">
								{searchQuery || brandFilter || categoryFilter || seriesFilter
									? "No items found"
									: "No items available"}
							</Title>
							<Text c="dimmed" mb="lg">
								{searchQuery || brandFilter || categoryFilter || seriesFilter
									? "Try adjusting your search or filters"
									: "There are no items in the database yet."
								}
							</Text>
							{(searchQuery || brandFilter || categoryFilter || seriesFilter) && (
								<Button variant="light" onClick={handleClearFilters}>
									Clear Filters
								</Button>
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
					/>
				)}
			</Stack>
		</Container>
	);
}