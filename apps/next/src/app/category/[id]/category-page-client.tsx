"use client";

import { Badge } from "@/components/ui/badge";

import {
	Anchor,
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
	IconFilter,
	IconFolder,
	IconHome,
	IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useState, useEffect, useMemo } from "react";


import { PAGINATION } from "@/lib/constants";
import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";
import { getNodeDisplayName, getNodeImages, isItemNode, CategoryNode, ItemNode } from "@/lib/schemas";
import {
	itemCard,
	itemCardBadge,
	itemCardImage,
	itemCardContent,
	itemCardMetadata,
	itemCardSubtitle,
	itemCardTitle,
} from "@/styles/components.css";

// Client-side URL parameter helper
const getUrlParams = () => {
	// This is a client-side only component, so window should be available
	const params = new URLSearchParams(globalThis.location.search);
	return {
		page: params.get("page") ?? "1",
		q: params.get("q") ?? "",
		sort: params.get("sort") ?? "",
		brand: params.get("brand") ?? "",
	};
};

interface CategoryPageClientProps {
	initialCategory: CategoryNode;
	initialItems: ItemNode[];
	_initialCategories: CategoryNode[];
	categoryId: string;
}

// Item card component
function ItemCard({ item }: { item: ItemNode }) {
	if (!isItemNode(item)) return null;

	// Get actual images from the item data
	const itemImages = getNodeImages(item);
	const primaryImage = itemImages.length > 0 ? itemImages[0] : null;

	// Generate local placeholder images
	const placeholderSrc = createPlaceholderSvg(getNodeDisplayName(item));
	const errorPlaceholderSrc = createErrorPlaceholderSvg();

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
					src={primaryImage ?? placeholderSrc}
					alt={getNodeDisplayName(item)}
					fit="cover"
					height={200}
					fallbackSrc={errorPlaceholderSrc}
					// Add error handling for failed image loads
					onError={(e) => {
						// If the primary image fails, use local error placeholder
						e.currentTarget.src = errorPlaceholderSrc;
					}}
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

// Main client component
export function CategoryPageClient({
	initialCategory,
	initialItems,
	_initialCategories,
	categoryId,
}: CategoryPageClientProps) {
	// State management
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("name-asc");
	const [brandFilter, setBrandFilter] = useState("");
	const [page, setPage] = useState(1);

	// Initialize state from URL parameters
	useEffect(() => {
		const urlParams = getUrlParams();
		setSearchQuery(urlParams.q);
		setSortBy(urlParams.sort ?? "name-asc");
		setBrandFilter(urlParams.brand);
		setPage(Number(urlParams.page));
	}, []);

	// Filter and process items
	const processedItems = useMemo(() => {
		// Items are already filtered by category on the server
		let filteredItems = initialItems.filter(item => isItemNode(item));

		// Apply search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filteredItems = filteredItems.filter(item => {
				if (!isItemNode(item)) return false;
				const name = getNodeDisplayName(item).toLowerCase();
				const brand = item.brand?.toLowerCase() ?? "";
				const series = item.series?.toLowerCase() ?? "";
				const grade = item.grade?.toLowerCase() ?? "";
				return name.includes(query) || brand.includes(query) || series.includes(query) || grade.includes(query);
			});
		}

		// Apply brand filter
		if (brandFilter) {
			filteredItems = filteredItems.filter(item =>
				isItemNode(item) && item.brand === brandFilter,
			);
		}

		// Apply sorting
		if (sortBy) {
			switch (sortBy) {
				case "name-asc": {
					filteredItems.sort((a, b) => getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)));
					break;
				}
				case "name-desc": {
					filteredItems.sort((a, b) => getNodeDisplayName(b).localeCompare(getNodeDisplayName(a)));
					break;
				}
				case "date-asc": {
					filteredItems.sort((a, b) => (a.created ?? "").localeCompare(b.created ?? ""));
					break;
				}
				case "date-desc": {
					filteredItems.sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""));
					break;
				}
				default: {
					// Default: keep original order
					break;
				}
			}
		}

		return filteredItems;
	}, [initialItems, searchQuery, brandFilter, sortBy]);

	// Get available brands for the current category
	const availableBrands = useMemo(() => {
		const brands = new Set<string>();
		for (const item of initialItems.filter(item => isItemNode(item))) {
			if (item.brand) {
				brands.add(item.brand);
			}
		}
		return [...brands].sort();
	}, [initialItems]);

	// Pagination calculations
	const total = processedItems.length;
	const totalPages = Math.ceil(total / PAGINATION.ITEMS_PER_PAGE);
	const startIndex = (page - 1) * PAGINATION.ITEMS_PER_PAGE;
	const paginatedItems = processedItems.slice(startIndex, startIndex + PAGINATION.ITEMS_PER_PAGE);

	// Update URL when parameters change
	const updateUrl = (newParams: { page?: number; q?: string; sort?: string; brand?: string }) => {
		const url = new URL(globalThis.location.href);
		for (const [key, value] of Object.entries(newParams)) {
			if (value !== undefined && value !== "") {
				url.searchParams.set(key, value.toString());
			} else {
				url.searchParams.delete(key);
			}
		}
		globalThis.history.pushState({}, "", url.toString());
	};

	// Handle parameter changes
	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		setPage(1);
		updateUrl({ page: 1, q: value });
	};

	const handleSortChange = (value: string) => {
		setSortBy(value);
		setPage(1);
		updateUrl({ page: 1, sort: value });
	};

	const handleBrandChange = (value: string) => {
		setBrandFilter(value);
		setPage(1);
		updateUrl({ page: 1, brand: value });
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
		updateUrl({ page: newPage });
	};

	const handleClearFilters = () => {
		setSearchQuery("");
		setSortBy("name-asc");
		setBrandFilter("");
		setPage(1);
		updateUrl({ page: 1, q: "", sort: "name-asc", brand: "" });
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
					<Anchor href={`/category/${categoryId}`} size="sm">
						{getNodeDisplayName(initialCategory)}
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Group justify="space-between" align="flex-start">
						<Box>
							<Title order={1} mb="sm">
								{getNodeDisplayName(initialCategory)}
							</Title>
							<Text size="lg" c="dimmed">
								{total.toLocaleString()} items in this category
							</Text>
						</Box>
						{/* Badge size="lg" variant="light">
              Category
						</Badge>*/}
					</Group>
				</Box>

				{/* Search and Filters */}
				<Card p="lg" radius="md" withBorder={true}>
					<Grid>
						<Grid.Col span={{ base: 12, md: 6 }}>
							<TextInput
								leftSection={<IconSearch size={16} />}
								placeholder={`Search ${getNodeDisplayName(initialCategory)}...`}
								value={searchQuery}
								onChange={(e) => { handleSearchChange(e.target.value); }}
							/>
						</Grid.Col>
						<Grid.Col span={{ base: 12, md: 3 }}>
							<Select
								leftSection={<IconFilter size={16} />}
								placeholder="Filter by brand"
								data={[
									{ value: "", label: "All Brands" },
									...availableBrands.map(brand => ({ value: brand, label: brand })),
								]}
								value={brandFilter}
								onChange={(value) => { handleBrandChange(value ?? ""); }}
								clearable={true}
							/>
						</Grid.Col>
						<Grid.Col span={{ base: 12, md: 3 }}>
							<Select
								placeholder="Sort by"
								data={[
									{ value: "date-desc", label: "Latest First" },
									{ value: "date-asc", label: "Oldest First" },
									{ value: "name-asc", label: "Name (A-Z)" },
									{ value: "name-desc", label: "Name (Z-A)" },
								]}
								value={sortBy}
								onChange={(value) => { handleSortChange(value ?? "date-desc"); }}
							/>
						</Grid.Col>
					</Grid>
				</Card>

				{/* Results */}
				<Box>
					<Group justify="space-between" mb="md">
						<Text size="sm" c="dimmed">
              Showing {Math.min((page - 1) * PAGINATION.ITEMS_PER_PAGE + 1, total)}-{Math.min(page * PAGINATION.ITEMS_PER_PAGE, total)} of {total.toLocaleString()} items
						</Text>
						{(searchQuery || brandFilter) && (
							<Button
								variant="light"
								size="sm"
								onClick={handleClearFilters}
							>
                Clear Filters
							</Button>
						)}
					</Group>

					{paginatedItems.length > 0 ? (
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
							<IconFolder size={64} color="var(--mantine-color-gray-4)" />
							<Title order={3} mt="md" mb="sm">
                No items found
							</Title>
							<Text c="dimmed" mb="lg">
								{searchQuery || brandFilter
									? "Try adjusting your search or filters"
									: "There are no items in this category yet."
								}
							</Text>
							{(searchQuery || brandFilter) && (
								<Button
									variant="light"
									onClick={handleClearFilters}
								>
                  Clear Filters
								</Button>
							)}
						</Box>
					)}
				</Box>

				{/* Pagination */}
				{totalPages > 1 && (
					<Box>
						<Pagination
							total={totalPages}
							value={page}
							onChange={handlePageChange}
							siblings={1}
							boundaries={2}
						/>
					</Box>
				)}
			</Stack>
		</Container>
	);
}