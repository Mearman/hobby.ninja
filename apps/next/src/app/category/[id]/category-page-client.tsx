"use client";

import {
	Anchor,
	Box,
	Breadcrumbs,
	Button,
	Card,
	Container,
	Grid,
	Group,
	Pagination,
	Select,
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
import { getNodeDisplayName, isItemNode, CategoryNode, ItemNode } from "@/lib/schemas";
import { ViewSwitcher, useViewMode, type ViewMode } from "@/components/view/view-switcher";
import { ViewRenderer } from "@/components/view/view-renderers";

// Client-side URL parameter helper
const getUrlParams = () => {
	// This is a client-side only component, so window should be available
	const params = new URLSearchParams(globalThis.location.search);
	return {
		page: params.get("page") ?? "1",
		q: params.get("q") ?? "",
		sort: params.get("sort") ?? "",
		brand: params.get("brand") ?? "",
		view: params.get("view") as ViewMode ?? "grid",
	};
};

interface CategoryPageClientProps {
	initialCategory: CategoryNode;
	initialItems: ItemNode[];
	_initialCategories: CategoryNode[];
	categoryId: string;
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
	const [sortBy, setSortBy] = useState("date-desc");
	const [brandFilter, setBrandFilter] = useState("");
	const [page, setPage] = useState(1);
	const { viewMode, setViewMode } = useViewMode();

	// Initialize state from URL parameters
	useEffect(() => {
		const urlParams = getUrlParams();
		setSearchQuery(urlParams.q);
		setSortBy(urlParams.sort ?? "date-desc");
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
		setSortBy("date-desc");
		setBrandFilter("");
		setPage(1);
		updateUrl({ page: 1, q: "", sort: "date-desc", brand: "" });
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
						<Group gap="md">
							<ViewSwitcher
								value={viewMode}
								onChange={setViewMode}
								size="sm"
							/>
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
					</Group>

					<ViewRenderer
						viewMode={viewMode}
						items={paginatedItems}
					/>
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