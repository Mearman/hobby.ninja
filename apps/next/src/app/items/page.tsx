"use client";

import {
	Anchor,
	ActionIcon,
	Badge,
	Box,
	Breadcrumbs,
	Button,
	Card,
	Checkbox,
	Container,
	Divider,
	Drawer,
	Grid,
	Group,
	Menu,
	MultiSelect,
	NumberInput,
	Pagination,
	RangeSlider,
	ScrollArea,
	Select,
	SimpleGrid,
	Stack,
	Text,
	Title,
	Tooltip,
} from "@mantine/core";
import {
	IconAdjustmentsHorizontal,
	IconBox,
	IconFilter,
	IconHome,
	IconLoader,
	IconRefresh,
	IconSearch,
	IconX,
	IconChevronDown,
} from "@tabler/icons-react";
import React, { useEffect, useState, useMemo, useCallback } from "react";

import { PAGINATION } from "@/lib/constants";
import { getAllBrands, getAllCategories, getAllItems, getAllSeries, getAllGrades, getAllScales } from "@/lib/graph-data";
import { BaseNode, getNodeDisplayName, isItemNode, isBrandNode, isCategoryNode, isSeriesNode, ItemNode } from "@/lib/schemas";
import { ViewSwitcher, useViewMode } from "@/components/view/view-switcher";
import { ViewRenderer } from "@/components/view/view-renderers";
import { SearchAutocomplete } from "@/components/search/search-autocomplete";
import { SavedSearches, type SavedSearch } from "@/components/search/saved-searches";
import { ItemSelector, SelectableItemCard } from "@/components/items/item-selector";
import { LoadingSkeletons, StatsSkeleton } from "@/components/ui/skeleton-cards";

// Constants
const DEFAULT_ITEMS_PER_PAGE = 48;
const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96, 192];
const MAX_PRICE = 100_000;
const MIN_YEAR = 1980;
const MAX_YEAR = new Date().getFullYear();

// Enhanced sort options
const SORT_OPTIONS = [
	{ value: "date-desc", label: "Latest First" },
	{ value: "date-asc", label: "Oldest First" },
	{ value: "name-asc", label: "Name (A-Z)" },
	{ value: "name-desc", label: "Name (Z-A)" },
	{ value: "price-asc", label: "Price (Low to High)" },
	{ value: "price-desc", label: "Price (High to Low)" },
	{ value: "series-asc", label: "Series (A-Z)" },
	{ value: "brand-asc", label: "Brand (A-Z)" },
];

interface SearchState {
	query: string;
	brand: string;
	category: string;
	series: string;
	grade: string;
	scale: string;
	sortBy: string;
	itemsPerPage: number;
	priceRange: [number, number];
	yearRange: [number, number];
}

export default function ItemsPage() {
	// Data states
	const [items, setItems] = useState<ItemNode[]>([]);
	const [brands, setBrands] = useState<string[]>([]);
	const [categories, setCategories] = useState<string[]>([]);
	const [series, setSeries] = useState<string[]>([]);
	const [grades, setGrades] = useState<string[]>([]);
	const [scales, setScales] = useState<string[]>([]);

	// UI states
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchLoading, setSearchLoading] = useState(false);
	const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
	const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

	// Selection states
	const [selectedItems, setSelectedItems] = useState<string[]>([]);
	const [selectAllMode, setSelectAllMode] = useState(false);

	// Search state
	const [searchState, setSearchState] = useState<SearchState>({
		query: "",
		brand: "",
		category: "",
		series: "",
		grade: "",
		scale: "",
		sortBy: "date-desc",
		itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
		priceRange: [0, MAX_PRICE],
		yearRange: [MIN_YEAR, MAX_YEAR],
	});

	const [page, setPage] = useState(1);
	const { viewMode, setViewMode } = useViewMode();

	// Load data
	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true);
				setError(null);

				const [itemsData, brandsData, categoriesData, seriesData, gradesData, scalesData] = await Promise.all([
					getAllItems(),
					getAllBrands(),
					getAllCategories(),
					getAllSeries(),
					getAllGrades(),
					getAllScales(),
				]);

				const filteredItems = itemsData.filter(isItemNode);
				setItems(filteredItems);

				// Type-check and extract data
				setBrands(brandsData.filter(isBrandNode).map(b => getNodeDisplayName(b)));
				setCategories(categoriesData.filter(isCategoryNode).map(c => getNodeDisplayName(c)));
				setSeries(seriesData.filter(isSeriesNode).map(s => getNodeDisplayName(s)));
				setGrades(gradesData.map(g => getNodeDisplayName(g)));
				setScales(scalesData.map(s => getNodeDisplayName(s)));

			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error("Failed to load items:", errorMessage);
				setError(errorMessage);
			} finally {
				setLoading(false);
			}
		};

		void loadData();
	}, []);

	// Initialize from URL params
	useEffect(() => {
		if (typeof window === "undefined") return;

		try {
			const url = new URL(window.location.href);
			const params = new URLSearchParams(url.search);

			setSearchState(prev => ({
				...prev,
				query: params.get("q") || "",
				brand: params.get("brand") || "",
				category: params.get("category") || "",
				series: params.get("series") || "",
				grade: params.get("grade") || "",
				scale: params.get("scale") || "",
				sortBy: params.get("sort") || "date-desc",
				itemsPerPage: Number.parseInt(params.get("itemsPerPage") || String(DEFAULT_ITEMS_PER_PAGE), 10),
				priceRange: [
					Number.parseInt(params.get("minPrice") || "0", 10),
					Number.parseInt(params.get("maxPrice") || String(MAX_PRICE), 10),
				],
				yearRange: [
					Number.parseInt(params.get("minYear") || String(MIN_YEAR), 10),
					Number.parseInt(params.get("maxYear") || String(MAX_YEAR), 10),
				],
			}));

			setPage(Number.parseInt(params.get("page") || "1", 10));
		} catch (error) {
			console.error("Failed to parse URL params:", error);
		}
	}, []);

	// Update URL when search state changes
	const updateUrl = useCallback((updates: Partial<SearchState> & { page?: number }) => {
		if (typeof window === "undefined") return;

		try {
			const url = new URL(window.location.href);
			const params = new URLSearchParams(url.search);

			// Update params based on what changed
			Object.entries(updates).forEach(([key, value]) => {
				if (key === "page") {
					if (value && value !== 1) {
						params.set("page", String(value));
					} else {
						params.delete("page");
					}
				} else if (key === "query") {
					if (value) {
						params.set("q", String(value));
					} else {
						params.delete("q");
					}
					params.delete("page"); // Reset page when search changes
				} else if (key === "priceRange") {
					const [min, max] = value as [number, number];
					params.set("minPrice", String(min));
					params.set("maxPrice", String(max));
				} else if (key === "yearRange") {
					const [min, max] = value as [number, number];
					params.set("minYear", String(min));
					params.set("maxYear", String(max));
				} else if (value && key !== "query") {
					params.set(key, String(value));
				} else if (key !== "query") {
					params.delete(key);
				}
			});

			// Update URL without page reload
			const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
			window.history.replaceState({}, "", newUrl);
		} catch (error) {
			console.error("Failed to update URL:", error);
		}
	}, []);

	// Filter and sort items
	const filteredItems = useMemo(() => {
		let filtered = items.filter(isItemNode);

		// Apply search filter
		if (searchState.query) {
			const query = searchState.query.toLowerCase();
			filtered = filtered.filter(item => {
				const name = getNodeDisplayName(item).toLowerCase();
				const brand = item.brand?.toLowerCase() ?? "";
				const series = item.series?.toLowerCase() ?? "";
				const grade = item.grade?.toLowerCase() ?? "";
				const scale = item.scale?.toLowerCase() ?? "";
				return name.includes(query) || brand.includes(query) || series.includes(query) || grade.includes(query) || scale.includes(query);
			});
		}

		// Apply filters
		if (searchState.brand) {
			filtered = filtered.filter(item => item.brand === searchState.brand);
		}
		if (searchState.category) {
			filtered = filtered.filter(item => item.category === searchState.category);
		}
		if (searchState.series) {
			filtered = filtered.filter(item => item.series === searchState.series);
		}
		if (searchState.grade) {
			filtered = filtered.filter(item => item.grade === searchState.grade);
		}
		if (searchState.scale) {
			filtered = filtered.filter(item => item.scale === searchState.scale);
		}

		// Apply price filter
		if (searchState.priceRange[0] > 0 || searchState.priceRange[1] < MAX_PRICE) {
			filtered = filtered.filter(item => {
				const price = item.price ?? 0;
				return price >= searchState.priceRange[0] && price <= searchState.priceRange[1];
			});
		}

		// Apply year filter
		if (searchState.yearRange[0] > MIN_YEAR || searchState.yearRange[1] < MAX_YEAR) {
			filtered = filtered.filter(item => {
				if (!item.releaseDate) return true;
				const year = Number.parseInt(item.releaseDate.split("-")[0] || "0", 10);
				return year >= searchState.yearRange[0] && year <= searchState.yearRange[1];
			});
		}

		// Apply sorting
		switch (searchState.sortBy) {
			case "name-asc":
				filtered.sort((a, b) => getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)));
				break;
			case "name-desc":
				filtered.sort((a, b) => getNodeDisplayName(b).localeCompare(getNodeDisplayName(a)));
				break;
			case "date-asc":
				filtered.sort((a, b) => (a.created ?? "").localeCompare(b.created ?? ""));
				break;
			case "date-desc":
				filtered.sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""));
				break;
			case "price-asc":
				filtered.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
				break;
			case "price-desc":
				filtered.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
				break;
			case "series-asc":
				filtered.sort((a, b) => (a.series ?? "").localeCompare(b.series ?? ""));
				break;
			case "brand-asc":
				filtered.sort((a, b) => (a.brand ?? "").localeCompare(b.brand ?? ""));
				break;
		}

		return filtered;
	}, [items, searchState]);

	const total = filteredItems.length;
	const totalPages = Math.ceil(total / searchState.itemsPerPage);
	const startIndex = (page - 1) * searchState.itemsPerPage;
	const paginatedItems = filteredItems.slice(startIndex, startIndex + searchState.itemsPerPage);

	// Event handlers
	const handleSearchChange = useCallback((value: string) => {
		setSearchState(prev => ({ ...prev, query: value }));
		setPage(1);
		updateUrl({ query: value, page: 1 });
	}, [updateUrl]);

	const handleSearch = useCallback((query: string) => {
		setSearchLoading(true);
		// Simulate search delay for better UX
		setTimeout(() => {
			setSearchLoading(false);
		}, 300);
	}, []);

	const handleFilterChange = useCallback((key: keyof SearchState, value: any) => {
		setSearchState(prev => ({ ...prev, [key]: value }));
		setPage(1);
		updateUrl({ [key]: value, page: 1 });
	}, [updateUrl]);

	const handlePageChange = useCallback((newPage: number) => {
		setPage(newPage);
		updateUrl({ page: newPage });
	}, [updateUrl]);

	const handleItemsPerPageChange = useCallback((value: number | null) => {
		const newItemsPerPage = value ?? DEFAULT_ITEMS_PER_PAGE;
		setSearchState(prev => ({ ...prev, itemsPerPage: newItemsPerPage }));
		setPage(1);
		updateUrl({ itemsPerPage: newItemsPerPage, page: 1 });
	}, [updateUrl]);

	const handleClearFilters = useCallback(() => {
		const clearedState: SearchState = {
			query: "",
			brand: "",
			category: "",
			series: "",
			grade: "",
			scale: "",
			sortBy: "date-desc",
			itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
			priceRange: [0, MAX_PRICE],
			yearRange: [MIN_YEAR, MAX_YEAR],
		};
		setSearchState(clearedState);
		setPage(1);
		setSelectedItems([]);
		updateUrl(clearedState);
		updateUrl({ page: 1 });
	}, [updateUrl]);

	const handleRetry = useCallback(() => {
		window.location.reload();
	}, []);

	const handleLoadSavedSearch = useCallback((search: SavedSearch) => {
		setSearchState(prev => ({
			...prev,
			query: search.query,
			brand: search.brand,
			category: search.category,
			series: search.series,
			sortBy: search.sortBy,
			itemsPerPage: search.itemsPerPage,
		}));
		setPage(1);
		updateUrl(search);
	}, [updateUrl]);

	const handleItemSelectionToggle = useCallback((itemId: string) => {
		setSelectedItems(prev => {
			if (prev.includes(itemId)) {
				return prev.filter(id => id !== itemId);
			} else {
				return [...prev, itemId];
			}
		});
	}, []);

	const handleBulkSelect = useCallback(() => {
		if (selectAllMode) {
			setSelectedItems([]);
		} else {
			setSelectedItems(paginatedItems.slice(0, 20).map(item => item.id));
		}
		setSelectAllMode(!selectAllMode);
	}, [selectAllMode, paginatedItems]);

	// Check if any filters are active
	const hasActiveFilters = searchState.query ||
		searchState.brand ||
		searchState.category ||
		searchState.series ||
		searchState.grade ||
		searchState.scale ||
		searchState.priceRange[0] > 0 ||
		searchState.priceRange[1] < MAX_PRICE ||
		searchState.yearRange[0] > MIN_YEAR ||
		searchState.yearRange[1] < MAX_YEAR;

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
					<Group justify="space-between" align="flex-start">
						<Box>
							<Title order={1} mb="sm">
								All Items
							</Title>
							{loading ? (
								<StatsSkeleton />
							) : (
								<Text size="lg" c="dimmed">
									Browse {total.toLocaleString()} items in our database
								</Text>
							)}
						</Box>

						<Group gap="sm">
							<SavedSearches
								currentSearch={searchState}
								onLoadSearch={handleLoadSavedSearch}
							/>
						</Group>
					</Group>
				</Box>

				{/* Search and Filters - Desktop */}
				<Card p="lg" radius="md" withBorder visibleFrom="md">
					<Stack gap="md">
						{/* Search Bar */}
						<SearchAutocomplete
							value={searchState.query}
							onChange={handleSearchChange}
							onSearch={handleSearch}
							placeholder="Search items, brands, series..."
							disabled={loading}
						/>

						{/* Basic Filters */}
						<Grid>
							<Grid.Col span={{ base: 12, md: 3 }}>
								<Select
									leftSection={<IconFilter size={16} />}
									placeholder="Brand"
									data={[
										{ value: "", label: "All Brands" },
										...brands.map(brand => ({ value: brand, label: brand })),
									]}
									value={searchState.brand}
									onChange={(value) => handleFilterChange("brand", value ?? "")}
									clearable
									disabled={loading}
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 6, md: 2 }}>
								<Select
									placeholder="Category"
									data={[
										{ value: "", label: "All Categories" },
										...categories.map(category => ({ value: category, label: category })),
									]}
									value={searchState.category}
									onChange={(value) => handleFilterChange("category", value ?? "")}
									clearable
									disabled={loading}
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 6, md: 2 }}>
								<Select
									placeholder="Series"
									data={[
										{ value: "", label: "All Series" },
										...series.map(serie => ({ value: serie, label: serie })),
									]}
									value={searchState.series}
									onChange={(value) => handleFilterChange("series", value ?? "")}
									clearable
									disabled={loading}
									searchable
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 6, md: 2 }}>
								<Select
									placeholder="Grade"
									data={[
										{ value: "", label: "All Grades" },
										...grades.map(grade => ({ value: grade, label: grade })),
									]}
									value={searchState.grade}
									onChange={(value) => handleFilterChange("grade", value ?? "")}
									clearable
									disabled={loading}
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 6, md: 3 }}>
								<Select
									placeholder="Sort by"
									data={SORT_OPTIONS}
									value={searchState.sortBy}
									onChange={(value) => handleFilterChange("sortBy", value ?? "")}
									disabled={loading}
								/>
							</Grid.Col>
						</Grid>

						{/* Filter Actions */}
						<Group justify="space-between">
							<Group gap="xs">
								{hasActiveFilters && (
									<Button variant="light" size="sm" onClick={handleClearFilters}>
										Clear Filters
									</Button>
								)}
								<Button
									variant="subtle"
									size="sm"
									leftSection={<IconAdjustmentsHorizontal size={14} />}
									onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
								>
									{advancedFiltersOpen ? "Hide" : "Show"} Advanced Filters
								</Button>
							</Group>
						</Group>

						{/* Advanced Filters */}
						{advancedFiltersOpen && (
							<>
								<Divider />
								<Grid>
									<Grid.Col span={{ base: 12, md: 3 }}>
										<Select
											placeholder="Scale"
											data={[
												{ value: "", label: "All Scales" },
												...scales.map(scale => ({ value: scale, label: scale })),
											]}
											value={searchState.scale}
											onChange={(value) => handleFilterChange("scale", value ?? "")}
											clearable
											disabled={loading}
										/>
									</Grid.Col>
									<Grid.Col span={{ base: 12, md: 4 }}>
										<Stack gap="xs">
											<Text size="sm">Price Range</Text>
											<RangeSlider
												min={0}
												max={MAX_PRICE}
												step={1000}
												value={searchState.priceRange}
												onChange={(value) => handleFilterChange("priceRange", value as [number, number])}
												disabled={loading}
												marks={[
													{ value: 0, label: "¥0" },
													{ value: 25_000, label: "¥25k" },
													{ value: 50_000, label: "¥50k" },
													{ value: MAX_PRICE, label: "¥100k+" },
												]}
											/>
										</Stack>
									</Grid.Col>
									<Grid.Col span={{ base: 12, md: 4 }}>
										<Stack gap="xs">
											<Text size="sm">Release Year</Text>
											<RangeSlider
												min={MIN_YEAR}
												max={MAX_YEAR}
												value={searchState.yearRange}
												onChange={(value) => handleFilterChange("yearRange", value as [number, number])}
												disabled={loading}
												marks={[
													{ value: 1990, label: "1990" },
													{ value: 2000, label: "2000" },
													{ value: 2010, label: "2010" },
													{ value: 2020, label: "2020" },
													{ value: MAX_YEAR, label: MAX_YEAR.toString() },
												]}
											/>
										</Stack>
									</Grid.Col>
								</Grid>
							</>
						)}
					</Stack>
				</Card>

				{/* Mobile Filters */}
				<Group justify="space-between" hiddenFrom="md">
					<Button
						variant="light"
						leftSection={<IconFilter size={16} />}
						onClick={() => setMobileFiltersOpen(true)}
						fullWidth
					>
						Filters & Search
					</Button>
				</Group>

				<Drawer
					opened={mobileFiltersOpen}
					onClose={() => setMobileFiltersOpen(false)}
					title="Filters"
					size="sm"
					position="right"
				>
					<ScrollArea.Autosize mah="calc(100vh - 100px)">
						<Stack gap="md">
							<SearchAutocomplete
								value={searchState.query}
								onChange={handleSearchChange}
								onSearch={handleSearch}
								placeholder="Search items..."
								size="sm"
							/>

							<Select
								label="Brand"
								data={[
									{ value: "", label: "All Brands" },
									...brands.map(brand => ({ value: brand, label: brand })),
								]}
								value={searchState.brand}
								onChange={(value) => handleFilterChange("brand", value ?? "")}
								clearable
								size="sm"
							/>

							<Select
								label="Category"
								data={[
									{ value: "", label: "All Categories" },
									...categories.map(category => ({ value: category, label: category })),
								]}
								value={searchState.category}
								onChange={(value) => handleFilterChange("category", value ?? "")}
								clearable
								size="sm"
							/>

							<Select
								label="Series"
								data={[
									{ value: "", label: "All Series" },
									...series.map(serie => ({ value: serie, label: serie })),
								]}
								value={searchState.series}
								onChange={(value) => handleFilterChange("series", value ?? "")}
								clearable
								size="sm"
								searchable
							/>

							<Select
								label="Grade"
								data={[
									{ value: "", label: "All Grades" },
									...grades.map(grade => ({ value: grade, label: grade })),
								]}
								value={searchState.grade}
								onChange={(value) => handleFilterChange("grade", value ?? "")}
								clearable
								size="sm"
							/>

							<Select
								label="Scale"
								data={[
									{ value: "", label: "All Scales" },
									...scales.map(scale => ({ value: scale, label: scale })),
								]}
								value={searchState.scale}
								onChange={(value) => handleFilterChange("scale", value ?? "")}
								clearable
								size="sm"
							/>

							<Select
								label="Sort by"
								data={SORT_OPTIONS}
								value={searchState.sortBy}
								onChange={(value) => handleFilterChange("sortBy", value ?? "")}
								size="sm"
							/>

							<Stack gap="xs">
								<Text size="sm">Price Range</Text>
								<RangeSlider
									min={0}
									max={MAX_PRICE}
									step={1000}
									value={searchState.priceRange}
									onChange={(value) => handleFilterChange("priceRange", value as [number, number])}
									marks={[
										{ value: 0, label: "¥0" },
										{ value: 25_000, label: "¥25k" },
										{ value: 50_000, label: "¥50k" },
										{ value: MAX_PRICE, label: "¥100k+" },
									]}
								/>
							</Stack>

							<Stack gap="xs">
								<Text size="sm">Release Year</Text>
								<RangeSlider
									min={MIN_YEAR}
									max={MAX_YEAR}
									value={searchState.yearRange}
									onChange={(value) => handleFilterChange("yearRange", value as [number, number])}
									marks={[
										{ value: 1990, label: "1990" },
										{ value: 2000, label: "2000" },
										{ value: 2010, label: "2010" },
										{ value: 2020, label: "2020" },
										{ value: MAX_YEAR, label: MAX_YEAR.toString() },
									]}
								/>
							</Stack>

							<Button
								onClick={() => setMobileFiltersOpen(false)}
								fullWidth
								mt="md"
							>
								Apply Filters
							</Button>
						</Stack>
					</ScrollArea.Autosize>
				</Drawer>

				{/* Item Selection Controls */}
				<ItemSelector
					items={paginatedItems}
					selectedItems={selectedItems}
					onSelectionChange={setSelectedItems}
					maxSelection={10}
				/>

				{/* Results Section */}
				<Box>
					<Group justify="space-between" mb="md">
						<Group gap="sm">
							{loading ? (
								<StatsSkeleton />
							) : (
								<Text size="sm" c="dimmed">
									Showing {Math.min(startIndex + 1, total)}-{Math.min(startIndex + searchState.itemsPerPage, total)} of {total.toLocaleString()} items
								</Text>
							)}

							{!loading && (
								<Select
									value={String(searchState.itemsPerPage)}
									onChange={(value) => handleItemsPerPageChange(value ? Number.parseInt(value, 10) : null)}
									data={ITEMS_PER_PAGE_OPTIONS.map(count => ({
										value: String(count),
										label: `${count} per page`
									}))}
									size="xs"
									w={120}
								/>
							)}
						</Group>

						<Group gap="md">
							{/* Select All Checkbox */}
							<Checkbox
								label="Select all on page"
								checked={selectAllMode}
								onChange={handleBulkSelect}
								size="sm"
								indeterminate={selectedItems.length > 0 && selectedItems.length < paginatedItems.length}
							/>

							<ViewSwitcher
								value={viewMode}
								onChange={setViewMode}
								size="sm"
							/>

							{hasActiveFilters && (
								<Button variant="light" size="sm" onClick={handleClearFilters}>
									Clear Filters
								</Button>
							)}

							{error && (
								<Button
									variant="light"
									color="red"
									size="sm"
									leftSection={<IconRefresh size={14} />}
									onClick={handleRetry}
								>
									Retry
								</Button>
							)}
						</Group>
					</Group>

					{/* Results */}
					{loading ? (
						<LoadingSkeletons viewMode={viewMode} itemsPerPage={searchState.itemsPerPage} />
					) : error ? (
						<Card p="xl" radius="md" withBorder ta="center">
							<IconX size={48} color="var(--mantine-color-red-5)" />
							<Title order={3} mt="md" mb="sm">
								Failed to load items
							</Title>
							<Text c="dimmed" mb="md">
								{error}
							</Text>
							<Button onClick={handleRetry} leftSection={<IconRefresh size={16} />}>
								Try Again
							</Button>
						</Card>
					) : paginatedItems.length === 0 ? (
						<Card p="xl" radius="md" withBorder ta="center">
							<IconBox size={48} color="var(--mantine-color-gray-4)" />
							<Title order={3} mt="md" mb="sm">
								No items found
							</Title>
							<Text c="dimmed" mb="md">
								Try adjusting your search or filters to find what you're looking for.
							</Text>
							{hasActiveFilters && (
								<Button variant="light" onClick={handleClearFilters}>
									Clear Filters
								</Button>
							)}
						</Card>
					) : (
						<Box>
							{viewMode === "table" ? (
								// Enhanced table view with selection
								<Card p="md" radius="md" withBorder>
									<ViewRenderer viewMode={viewMode} items={paginatedItems} />
								</Card>
							) : (
								// Grid and list views with selection
								<>
									{viewMode === "grid" ? (
										// Grid view
										<div style={{ position: "relative" }}>
											<SimpleGrid
												cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
												spacing="md"
											>
												{paginatedItems.map((item) => (
													<div key={item.id} style={{ position: "relative" }}>
														<SelectableItemCard
															item={item}
															isSelected={selectedItems.includes(item.id)}
															onToggleSelection={() => handleItemSelectionToggle(item.id)}
															viewMode={viewMode}
														/>
													</div>
												))}
											</SimpleGrid>
										</div>
									) : (
										// List view
										<Stack gap="md">
											{paginatedItems.map((item) => (
												<div key={item.id} style={{ position: "relative" }}>
													<SelectableItemCard
														item={item}
														isSelected={selectedItems.includes(item.id)}
														onToggleSelection={() => handleItemSelectionToggle(item.id)}
														viewMode={viewMode}
													/>
												</div>
											))}
										</Stack>
									)}
								</>
							)}
						</Box>
					)}
				</Box>

				{/* Pagination */}
				{!loading && !error && totalPages > 1 && (
					<Group justify="center">
						<Pagination
							total={totalPages}
							value={page}
							onChange={handlePageChange}
							siblings={1}
							boundaries={2}
							size="md"
						/>
					</Group>
				)}
			</Stack>
		</Container>
	);
}