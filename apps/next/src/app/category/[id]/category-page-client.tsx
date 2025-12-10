"use client";

import {
	ActionIcon,
	Anchor,
	Badge,
	Box,
	Breadcrumbs,
	Button,
	Card,
	Container,
	Divider,
	Flex,
	Grid,
	Group,
	LoadingOverlay,
	Pagination,
	Progress,
	Select,
	Skeleton,
	Stack,
	Text,
	TextInput,
	Title,
 Tooltip,
} from "@mantine/core";
import {
	IconAdjustmentsHorizontal,
	IconFilter,
	IconFolder,
	IconHome,
	IconList,
	IconRefresh,
	IconSearch,
	IconTable,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useState, useEffect, useMemo, useCallback } from "react";

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
		grade: params.get("grade") ?? "",
		scale: params.get("scale") ?? "",
		series: params.get("series") ?? "",
		view: params.get("view") as ViewMode ?? "grid",
	};
};

interface CategoryPageClientProps {
	initialCategory: CategoryNode;
	initialItems: ItemNode[];
	_initialCategories: CategoryNode[];
	categoryId: string;
}


// Filter state interface
interface FilterState {
	search: string;
	brand: string;
	grade: string;
	scale: string;
	series: string;
	sortBy: string;
}

// Statistics interface
interface CategoryStats {
	totalItems: number;
	brands: string[];
	grades: string[];
	scales: string[];
	series: string[];
	avgPrice?: number;
	priceRange?: { min: number; max: number };
	newestItem?: string;
	oldestItem?: string;
}

// Main client component
export function CategoryPageClient({
	initialCategory,
	initialItems,
	_initialCategories,
	categoryId,
}: CategoryPageClientProps) {
	// State management
	const [filters, setFilters] = useState<FilterState>({
		search: "",
		brand: "",
		grade: "",
		scale: "",
		series: "",
		sortBy: "date-desc",
	});
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
	const { viewMode, setViewMode } = useViewMode();

	// Initialize state from URL parameters
	useEffect(() => {
		const urlParams = getUrlParams();
		setFilters({
			search: urlParams.q,
			brand: urlParams.brand,
			grade: urlParams.grade ?? "",
			scale: urlParams.scale ?? "",
			series: urlParams.series ?? "",
			sortBy: urlParams.sort ?? "date-desc",
		});
		setPage(Number(urlParams.page));
	}, []);

	// Calculate category statistics
	const categoryStats = useMemo((): CategoryStats => {
		const validItems = initialItems.filter(isItemNode);
		const brands = new Set<string>();
		const grades = new Set<string>();
		const scales = new Set<string>();
		const series = new Set<string>();
		const prices: number[] = [];
		let newestItem = "";
		let oldestItem = "";
		let newestDate = "";
		let oldestDate = "";

		validItems.forEach(item => {
			// Collect filter options
			if (item.brand) brands.add(item.brand);
			if (item.grade) grades.add(item.grade);
			if (item.scale) scales.add(item.scale);
			if (item.series) series.add(item.series);

			// Collect price data
			if (item.price?.amount) {
				prices.push(item.price.amount);
			}

			// Track newest/oldest items
			const itemDate = item.created ?? "";
			if (!oldestDate || itemDate < oldestDate) {
				oldestDate = itemDate;
				oldestItem = getNodeDisplayName(item);
			}
			if (!newestDate || itemDate > newestDate) {
				newestDate = itemDate;
				newestItem = getNodeDisplayName(item);
			}
		});

		const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : undefined;
		const priceRange = prices.length > 0 ? {
			min: Math.min(...prices),
			max: Math.max(...prices),
		} : undefined;

		return {
			totalItems: validItems.length,
			brands: Array.from(brands).sort(),
			grades: Array.from(grades).sort(),
			scales: Array.from(scales).sort(),
			series: Array.from(series).sort(),
			avgPrice,
			priceRange,
			newestItem,
			oldestItem,
		};
	}, [initialItems]);

	// Filter and process items
	const processedItems = useMemo(() => {
		setLoading(true);
		// Items are already filtered by category on the server
		let filteredItems = initialItems.filter(item => isItemNode(item));

		// Apply search filter
		if (filters.search) {
			const query = filters.search.toLowerCase();
			filteredItems = filteredItems.filter(item => {
				if (!isItemNode(item)) return false;
				const name = getNodeDisplayName(item).toLowerCase();
				const brand = item.brand?.toLowerCase() ?? "";
				const series = item.series?.toLowerCase() ?? "";
				const grade = item.grade?.toLowerCase() ?? "";
				const scale = item.scale?.toLowerCase() ?? "";
				return (
					name.includes(query) ||
					brand.includes(query) ||
					series.includes(query) ||
					grade.includes(query) ||
					scale.includes(query)
				);
			});
		}

		// Apply filters
		if (filters.brand) {
			filteredItems = filteredItems.filter(item =>
				isItemNode(item) && item.brand === filters.brand,
			);
		}
		if (filters.grade) {
			filteredItems = filteredItems.filter(item =>
				isItemNode(item) && item.grade === filters.grade,
			);
		}
		if (filters.scale) {
			filteredItems = filteredItems.filter(item =>
				isItemNode(item) && item.scale === filters.scale,
			);
		}
		if (filters.series) {
			filteredItems = filteredItems.filter(item =>
				isItemNode(item) && item.series === filters.series,
			);
		}

		// Apply sorting
		if (filters.sortBy) {
			switch (filters.sortBy) {
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
				case "price-asc": {
					filteredItems.sort((a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0));
					break;
				}
				case "price-desc": {
					filteredItems.sort((a, b) => (b.price?.amount ?? 0) - (a.price?.amount ?? 0));
					break;
				}
				case "brand-asc": {
					filteredItems.sort((a, b) => (a.brand ?? "").localeCompare(b.brand ?? ""));
					break;
				}
				case "grade-asc": {
					filteredItems.sort((a, b) => (a.grade ?? "").localeCompare(b.grade ?? ""));
					break;
				}
				default: {
					// Default: keep original order
					break;
				}
			}
		}

		setLoading(false);
		return filteredItems;
	}, [initialItems, filters]);

	// Pagination calculations
	const total = processedItems.length;
	const totalPages = Math.ceil(total / PAGINATION.ITEMS_PER_PAGE);
	const startIndex = (page - 1) * PAGINATION.ITEMS_PER_PAGE;
	const paginatedItems = processedItems.slice(startIndex, startIndex + PAGINATION.ITEMS_PER_PAGE);

	// Update URL when parameters change
	const updateUrl = useCallback((newParams: Partial<FilterState & { page: number }>) => {
		const url = new URL(globalThis.location.href);

		// Update search params
		for (const [key, value] of Object.entries(newParams)) {
			if (value !== undefined && value !== "") {
				url.searchParams.set(key, value.toString());
			} else {
				url.searchParams.delete(key);
			}
		}

		globalThis.history.pushState({}, "", url.toString());
	}, []);

	// Handle filter changes
	const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
		setFilters(prev => ({ ...prev, ...newFilters }));
		setPage(1);
		updateUrl({ ...newFilters, page: 1 });
	}, [updateUrl]);

	const handleSearchChange = useCallback((value: string) => {
		handleFilterChange({ search: value });
	}, [handleFilterChange]);

	const handleBrandChange = useCallback((value: string | null) => {
		handleFilterChange({ brand: value ?? "" });
	}, [handleFilterChange]);

	const handleGradeChange = useCallback((value: string | null) => {
		handleFilterChange({ grade: value ?? "" });
	}, [handleFilterChange]);

	const handleScaleChange = useCallback((value: string | null) => {
		handleFilterChange({ scale: value ?? "" });
	}, [handleFilterChange]);

	const handleSeriesChange = useCallback((value: string | null) => {
		handleFilterChange({ series: value ?? "" });
	}, [handleFilterChange]);

	const handleSortChange = useCallback((value: string | null) => {
		handleFilterChange({ sortBy: value ?? "date-desc" });
	}, [handleFilterChange]);

	const handlePageChange = useCallback((newPage: number) => {
		setPage(newPage);
		updateUrl({ page: newPage });
	}, [updateUrl]);

	const handleClearFilters = useCallback(() => {
		const clearedFilters: FilterState = {
			search: "",
			brand: "",
			grade: "",
			scale: "",
			series: "",
			sortBy: "date-desc",
		};
		setFilters(clearedFilters);
		setPage(1);
		updateUrl({ ...clearedFilters, page: 1 });
		setShowAdvancedFilters(false);
	}, [updateUrl]);

	const hasActiveFilters = Object.values(filters).some(value =>
		value !== "" && value !== "date-desc"
	);

	const activeFilterCount = Object.values(filters).filter(value =>
		value !== "" && value !== "date-desc"
	).length;

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Enhanced Breadcrumbs */}
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
					<Anchor href={`/category/${categoryId}`} size="sm" fw={500}>
						{getNodeDisplayName(initialCategory)}
					</Anchor>
				</Breadcrumbs>

				{/* Enhanced Category Header with Statistics */}
				<Card p="lg" radius="md" withBorder>
					<Group justify="space-between" align="flex-start">
						<Box flex={1}>
							<Group align="center" gap="sm" mb="md">
								<IconFolder size={28} color="var(--mantine-color-blue-6)" />
								<Title order={1}>
									{getNodeDisplayName(initialCategory)}
								</Title>
								<Badge size="lg" variant="light" color="blue">
									Category
								</Badge>
							</Group>

							<Text size="lg" c="dimmed" mb="md">
								{categoryStats.totalItems.toLocaleString()} items in this category
							</Text>

							{/* Category Statistics Grid */}
							<Grid>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Brands</Text>
										<Text size="lg" fw={600}>{categoryStats.brands.length}</Text>
									</Box>
								</Grid.Col>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Grades</Text>
										<Text size="lg" fw={600}>{categoryStats.grades.length}</Text>
									</Box>
								</Grid.Col>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Scales</Text>
										<Text size="lg" fw={600}>{categoryStats.scales.length}</Text>
									</Box>
								</Grid.Col>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Series</Text>
										<Text size="lg" fw={600}>{categoryStats.series.length}</Text>
									</Box>
								</Grid.Col>
							</Grid>

							{categoryStats.avgPrice && (
								<Text size="sm" c="dimmed" mt="md">
									Average price: ¥{categoryStats.avgPrice.toLocaleString()}
									{categoryStats.priceRange && (
										` (Range: ¥${categoryStats.priceRange.min.toLocaleString()} - ¥${categoryStats.priceRange.max.toLocaleString()})`
									)}
								</Text>
							)}
						</Box>
					</Group>
				</Card>

				{/* Enhanced Search and Filters */}
				<Card p="lg" radius="md" withBorder>
					<Stack gap="md">
						{/* Search Bar */}
						<TextInput
							leftSection={<IconSearch size={16} />}
							placeholder={`Search ${getNodeDisplayName(initialCategory)} by name, brand, series, grade, or scale...`}
							value={filters.search}
							onChange={(e) => handleSearchChange(e.target.value)}
							size="md"
						/>

						{/* Quick Filters Row */}
						<Grid>
							<Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
								<Select
									leftSection={<IconFilter size={16} />}
									placeholder="All Brands"
									data={[
										{ value: "", label: "All Brands" },
										...categoryStats.brands.map(brand => ({ value: brand, label: brand })),
									]}
									value={filters.brand}
									onChange={handleBrandChange}
									clearable
									searchable
									size="sm"
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
								<Select
									placeholder="All Grades"
									data={[
										{ value: "", label: "All Grades" },
										...categoryStats.grades.map(grade => ({ value: grade, label: grade })),
									]}
									value={filters.grade}
									onChange={handleGradeChange}
									clearable
									searchable
									size="sm"
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
								<Select
									placeholder="All Scales"
									data={[
										{ value: "", label: "All Scales" },
										...categoryStats.scales.map(scale => ({ value: scale, label: scale })),
									]}
									value={filters.scale}
									onChange={handleScaleChange}
									clearable
									searchable
									size="sm"
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
								<Select
									placeholder="Sort by"
									data={[
										{ value: "date-desc", label: "Latest First" },
										{ value: "date-asc", label: "Oldest First" },
										{ value: "name-asc", label: "Name (A-Z)" },
										{ value: "name-desc", label: "Name (Z-A)" },
										{ value: "price-asc", label: "Price (Low to High)" },
										{ value: "price-desc", label: "Price (High to Low)" },
										{ value: "brand-asc", label: "Brand (A-Z)" },
										{ value: "grade-asc", label: "Grade (A-Z)" },
									]}
									value={filters.sortBy}
									onChange={handleSortChange}
									size="sm"
								/>
							</Grid.Col>
						</Grid>

						{/* Advanced Filters Toggle */}
						{categoryStats.series.length > 0 && (
							<Group justify="space-between" align="center">
								<Button
									variant="subtle"
									size="xs"
									onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
									leftSection={<IconAdjustmentsHorizontal size={14} />}
								>
									{showAdvancedFilters ? "Hide" : "Show"} Advanced Filters
								</Button>

								{hasActiveFilters && (
									<Button
										variant="light"
										color="red"
										size="xs"
										onClick={handleClearFilters}
										leftSection={<IconX size={14} />}
									>
										Clear All Filters ({activeFilterCount})
									</Button>
								)}
							</Group>
						)}

						{/* Advanced Filters */}
						{showAdvancedFilters && categoryStats.series.length > 0 && (
							<>
								<Divider />
								<Box>
									<Select
										placeholder="Filter by Series"
										data={[
											{ value: "", label: "All Series" },
											...categoryStats.series.map(series => ({ value: series, label: series })),
										]}
										value={filters.series}
										onChange={handleSeriesChange}
										clearable
										searchable
										size="sm"
										leftSection={<IconFilter size={14} />}
									/>
								</Box>
							</>
						)}

						{/* Active Filters Display */}
						{hasActiveFilters && (
							<Flex gap="xs" wrap="wrap" mt="sm">
								{filters.search && (
									<Badge
										size="sm"
										variant="light"
										color="blue"
										rightSection={
											<ActionIcon size="xs" onClick={() => handleFilterChange({ search: "" })}>
												<IconX size={10} />
											</ActionIcon>
										}
									>
										Search: "{filters.search}"
									</Badge>
								)}
								{filters.brand && (
									<Badge
										size="sm"
										variant="light"
										rightSection={
											<ActionIcon size="xs" onClick={() => handleFilterChange({ brand: "" })}>
												<IconX size={10} />
											</ActionIcon>
										}
									>
										Brand: {filters.brand}
									</Badge>
								)}
								{filters.grade && (
									<Badge
										size="sm"
										variant="light"
										rightSection={
											<ActionIcon size="xs" onClick={() => handleFilterChange({ grade: "" })}>
												<IconX size={10} />
											</ActionIcon>
										}
									>
										Grade: {filters.grade}
									</Badge>
								)}
								{filters.scale && (
									<Badge
										size="sm"
										variant="light"
										rightSection={
											<ActionIcon size="xs" onClick={() => handleFilterChange({ scale: "" })}>
												<IconX size={10} />
											</ActionIcon>
										}
									>
										Scale: {filters.scale}
									</Badge>
								)}
								{filters.series && (
									<Badge
										size="sm"
										variant="light"
										rightSection={
											<ActionIcon size="xs" onClick={() => handleFilterChange({ series: "" })}>
												<IconX size={10} />
											</ActionIcon>
										}
									>
										Series: {filters.series}
									</Badge>
								)}
							</Flex>
						)}
					</Stack>
				</Card>

				{/* Results Header */}
				<Box>
					<Group justify="space-between" align="center" mb="md">
						<Box>
							<Text size="sm" c="dimmed">
								Showing {Math.min((page - 1) * PAGINATION.ITEMS_PER_PAGE + 1, total)}-{Math.min(page * PAGINATION.ITEMS_PER_PAGE, total)} of {total.toLocaleString()} items
							</Text>
							{total !== categoryStats.totalItems && (
								<Text size="xs" c="blue">
									Filtered from {categoryStats.totalItems.toLocaleString()} total items
								</Text>
							)}
						</Box>

						<Group gap="md">
							<ViewSwitcher
								value={viewMode}
								onChange={setViewMode}
								size="sm"
							/>
							{total > 0 && (
								<Tooltip label="Refresh results">
									<ActionIcon
										variant="light"
										size="sm"
										onClick={() => window.location.reload()}
									>
										<IconRefresh size={14} />
									</ActionIcon>
								</Tooltip>
							)}
						</Group>
					</Group>

					{/* Loading Overlay */}
					<Box pos="relative">
						<LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

						{/* Results Display */}
						{paginatedItems.length > 0 ? (
							<ViewRenderer
								viewMode={viewMode}
								items={paginatedItems}
							/>
						) : (
							// Enhanced Empty State
							<Card p="xl" radius="md" withBorder ta="center">
								<Stack gap="md" align="center">
									<IconFolder
										size={64}
										color="var(--mantine-color-gray-4)"
									/>
									<Title order={3}>
										{hasActiveFilters ? "No items match your filters" : "No items in this category"}
									</Title>
									<Text c="dimmed" size="lg">
										{hasActiveFilters
											? "Try adjusting your search terms or clearing some filters to find what you're looking for."
											: "This category appears to be empty or items are still being added."
										}
									</Text>
									{hasActiveFilters && (
										<Button
											variant="light"
											onClick={handleClearFilters}
											leftSection={<IconX size={16} />}
										>
											Clear All Filters
										</Button>
									)}
								</Stack>
							</Card>
						)}
					</Box>
				</Box>

				{/* Enhanced Pagination */}
				{totalPages > 1 && (
					<Box>
						<Pagination
							total={totalPages}
							value={page}
							onChange={handlePageChange}
							siblings={1}
							boundaries={2}
							size="md"
							withEdges
						/>
						<Text ta="center" size="sm" c="dimmed" mt="sm">
							Page {page} of {totalPages}
						</Text>
					</Box>
				)}

				{/* Quick Access Stats */}
				{(categoryStats.newestItem || categoryStats.oldestItem) && (
					<Card p="md" radius="md" withBorder bg="gray.0">
						<Group justify="space-between">
							{categoryStats.newestItem && (
								<Box>
									<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Newest Item</Text>
									<Text size="sm" truncate maw={200}>{categoryStats.newestItem}</Text>
								</Box>
							)}
							{categoryStats.oldestItem && (
								<Box>
									<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Oldest Item</Text>
									<Text size="sm" truncate maw={200}>{categoryStats.oldestItem}</Text>
								</Box>
							)}
						</Group>
					</Card>
				)}
			</Stack>
		</Container>
	);
}