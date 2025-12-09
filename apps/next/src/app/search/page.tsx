"use client";

import {
	Title,
	Text,
	Badge,
	Group,
	Stack,
	Card,
	SimpleGrid,
	Container,
	Grid,
	Image,
	Box,
	TextInput,
	Select,
	MultiSelect,
	Slider,
	RangeSlider,
	Button,
	Divider,
	Collapse,
	Accordion,
	Switch,
	NumberInput,
	ScrollArea,
	Skeleton,
} from "@mantine/core";
import {
	IconSearch,
	IconFilter,
	IconX,
	IconChevronRight,
	IconAdjustmentsHorizontal,
} from "@tabler/icons-react";
import React from "react";

import { useSearch } from "@/hooks/use-search";
import { useUrlState } from "@/hooks/use-url-state";
import { getAllItems, getAllBrands, getAllCategories, getAllSeries } from "@/lib/graph-data";
import { getNodeDisplayName, isItemNode, type ItemNode } from "@/lib/schemas";
import type { ShareableFilters } from "@/lib/url-compression";
import {
	itemCard,
	itemCardImage,
	itemCardContent,
	itemCardTitle,
	itemCardSubtitle,
	itemCardMetadata,
	itemCardBadge,
} from "@/styles/components.css";
import {
	FILTER,
	UI,
	PAGINATION,
	TYPOGRAPHY,
	TIMING,
} from "@/lib/constants";

// Constants from centralized config
const {
	MIN_YEAR,
	MAX_YEAR,
	MIN_PRICE,
	MAX_PRICE,
	PRICE_STEP,
	YEAR_MARK_1990,
	YEAR_MARK_2000,
	YEAR_MARK_2010,
	YEAR_MARK_2020,
	PRICE_MARK_20_PERCENT,
	PRICE_MARK_50_PERCENT,
} = FILTER;
const {
	SKELETON_COUNT,
	STICKY_TOP_POSITION,
	SELECT_WIDTH,
	THUMBNAIL_WIDTH,
	THUMBNAIL_HEIGHT,
} = UI;
const {
	ITEMS_PER_PAGE: DEFAULT_GRID_COLS,
	MOBILE_GRID_COLS,
	SMALL_SCREEN_GRID_COLS,
} = PAGINATION;
const MD_BREAKPOINT = "md";
const SM_BREAKPOINT = "sm";
const LG_BREAKPOINT = "lg";

// Static data fetching
const getSearchData = async () => {
	try {
		const [items, brands, categories, series] = await Promise.all([
			getAllItems(),
			getAllBrands(),
			getAllCategories(),
			getAllSeries(),
		]);

		return {
			items: items.filter(isItemNode),
			brands: brands.map(brand => ({ value: brand.id, label: getNodeDisplayName(brand) })),
			categories: categories.map(cat => ({ value: cat.id, label: getNodeDisplayName(cat) })),
			series: series.map(s => ({ value: s.id, label: getNodeDisplayName(s) })),
			grades: ["HG", "RG", "MG", "PG", "EG", "RE", "Mega Size", "SD", "BB", "HR", "ME", "Other"],
			scales: ["1/144", "1/100", "1/60", "1/48", "1/72", "1/550", "1/1000", "1/2000", "1/12", "1/24", "Other"],
		};
	} catch (error) {
		console.error("Failed to load search data:", error);
		return {
			items: [],
			brands: [],
			categories: [],
			series: [],
			grades: [],
			scales: [],
		};
	}
};


// Item card component
function ItemCard({ item }: { item: ItemNode }) {
	if (!isItemNode(item)) return null;

	return (
		<Card
			component="a"
			href={`/item/${item.id}`}
			p={0}
			radius="md"
			className={itemCard}
			withBorder={true}
		>
			<Box className={itemCardImage}>
				<Image
					src={`https://via.placeholder.com/${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(item))}`}
					alt={getNodeDisplayName(item)}
					fit="cover"
					height={THUMBNAIL_HEIGHT}
					fallbackSrc={`https://via.placeholder.com/${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}/e0e0e0/999999?text=No+Image`}
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

// Search form component
function SearchForm({
	filters,
	onFiltersChange,
	searchData,
}: {
  filters: ShareableFilters;
  onFiltersChange: (filters: Partial<ShareableFilters>) => void;
  searchData: Awaited<ReturnType<typeof getSearchData>>;
}) {
	// Convert priceRange to [number, number] format for the slider
	const priceRangeValue: [number, number] = [
		filters.priceRange?.min ?? MIN_PRICE,
		filters.priceRange?.max ?? MAX_PRICE,
	];

	// Convert dateRange to [number, number] format for the slider
	const dateRangeValue: [number, number] = filters.dateRange
		? [parseInt(filters.dateRange.start.slice(0,4)), parseInt(filters.dateRange.end.slice(0,4))]
		: [MIN_YEAR, MAX_YEAR];

	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Group justify="space-between" mb="md">
				<Group>
					<IconAdjustmentsHorizontal size={UI.ICON_SIZE_LG} />
					<Text fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>Advanced Search</Text>
				</Group>
				<Button
					variant="subtle"
					size="sm"
					leftSection={<IconX size={UI.ICON_SIZE_SM} />}
					onClick={() => {
						onFiltersChange({
							search: "",
							brands: [],
							categories: [],
							series: [],
							grades: [],
							scales: [],
							priceRange: { min: MIN_PRICE, max: MAX_PRICE },
							sort: { field: "relevance", direction: "desc" },
						});
					}}
				>
          Clear All
				</Button>
			</Group>

			<Accordion defaultValue={["basics", "filters"]} multiple={true}>
				{/* Basic Search */}
				<Accordion.Item value="basics">
					<Accordion.Control>Basic Search</Accordion.Control>
					<Accordion.Panel>
						<Stack gap="md">
							<TextInput
								label="Search Query"
								placeholder="Search by name, brand, series, grade..."
								value={filters.search ?? ""}
								onChange={(e) => { onFiltersChange({ search: e.target.value }); }}
								leftSection={<IconSearch size={UI.ICON_SIZE_MD} />}
							/>

							<Select
								label="Sort By"
								data={[
									{ value: "relevance", label: "Relevance" },
									{ value: "name", label: "Name" },
									{ value: "date", label: "Date Added" },
									{ value: "price", label: "Price" },
									{ value: "year", label: "Release Year" },
								]}
								value={filters.sort?.field ?? "relevance"}
								onChange={(value) => {
									onFiltersChange({
										sort: {
											field: value as "relevance" | "name" | "date" | "price" | "year",
											direction: filters.sort?.direction ?? "desc"
										}
									});
								}}
							/>

							<Group>
								<Switch
									label="Sort Order"
									checked={filters.sort?.direction === "desc"}
									onChange={(e) => {
										onFiltersChange({
											sort: {
												field: filters.sort?.field ?? "relevance",
												direction: e.target.checked ? "desc" : "asc"
											}
										});
									}}
								/>
								<Text size="sm" c="dimmed">
									{filters.sort?.direction === "desc" ? "Descending" : "Ascending"}
								</Text>
							</Group>
						</Stack>
					</Accordion.Panel>
				</Accordion.Item>

				{/* Category & Brand Filters */}
				<Accordion.Item value="filters">
					<Accordion.Control>Category & Brand</Accordion.Control>
					<Accordion.Panel>
						<Stack gap="md">
							<MultiSelect
								label="Categories"
								placeholder="Select categories"
								data={searchData.categories}
								value={filters.categories ?? []}
								onChange={(value) => { onFiltersChange({ categories: value }); }}
								searchable={true}
								clearable={true}
							/>

							<MultiSelect
								label="Brands"
								placeholder="Select brands"
								data={searchData.brands}
								value={filters.brands ?? []}
								onChange={(value) => { onFiltersChange({ brands: value }); }}
								searchable={true}
								clearable={true}
							/>

							<MultiSelect
								label="Series"
								placeholder="Select series"
								data={searchData.series}
								value={filters.series ?? []}
								onChange={(value) => { onFiltersChange({ series: value }); }}
								searchable={true}
								clearable={true}
							/>
						</Stack>
					</Accordion.Panel>
				</Accordion.Item>

				{/* Specifications */}
				<Accordion.Item value="specs">
					<Accordion.Control>Specifications</Accordion.Control>
					<Accordion.Panel>
						<Stack gap="md">
							<MultiSelect
								label="Grades"
								placeholder="Select grades"
								data={searchData.grades.map(grade => ({ value: grade, label: grade }))}
								value={filters.grades ?? []}
								onChange={(value) => { onFiltersChange({ grades: value }); }}
								searchable={true}
								clearable={true}
							/>

							<MultiSelect
								label="Scales"
								placeholder="Select scales"
								data={searchData.scales.map(scale => ({ value: scale, label: scale }))}
								value={filters.scales ?? []}
								onChange={(value) => { onFiltersChange({ scales: value }); }}
								searchable={true}
								clearable={true}
							/>
						</Stack>
					</Accordion.Panel>
				</Accordion.Item>

				{/* Price & Year */}
				<Accordion.Item value="range">
					<Accordion.Control>Price & Release Year</Accordion.Control>
					<Accordion.Panel>
						<Stack gap="md">
							<div>
								<Group justify="space-between" mb="xs">
									<Text size="sm">Release Year</Text>
									<Text size="sm" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
										{/* Extract year range from dateRange if available */}
										{filters.dateRange
											? `${new Date(filters.dateRange.start).getFullYear()} - ${new Date(filters.dateRange.end).getFullYear()}`
											: `${MIN_YEAR} - ${MAX_YEAR}`
										}
									</Text>
								</Group>
								<RangeSlider
									min={MIN_YEAR}
									max={MAX_YEAR}
									value={dateRangeValue}
									onChange={(value) => {
										const [startYear, endYear] = value;
										onFiltersChange({
											dateRange: {
												start: `${startYear}-01-01`,
												end: `${endYear}-12-31`
											}
										});
									}}
									marks={[
										{ value: MIN_YEAR, label: MIN_YEAR.toString() },
										{ value: YEAR_MARK_1990, label: YEAR_MARK_1990.toString() },
										{ value: YEAR_MARK_2000, label: YEAR_MARK_2000.toString() },
										{ value: YEAR_MARK_2010, label: YEAR_MARK_2010.toString() },
										{ value: YEAR_MARK_2020, label: YEAR_MARK_2020.toString() },
										{ value: MAX_YEAR, label: MAX_YEAR.toString() },
									]}
								/>
							</div>

							<div>
								<Group justify="space-between" mb="xs">
									<Text size="sm">Price Range (¥)</Text>
									<Text size="sm" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
										¥{priceRangeValue[0].toLocaleString()} - ¥{priceRangeValue[1].toLocaleString()}
									</Text>
								</Group>
								<RangeSlider
									min={MIN_PRICE}
									max={MAX_PRICE}
									step={PRICE_STEP}
									value={priceRangeValue}
									onChange={(value) => {
										const [minPrice, maxPrice] = value;
										onFiltersChange({
											priceRange: { min: minPrice, max: maxPrice }
										});
									}}
									marks={[
										{ value: MIN_PRICE, label: "¥0" },
										{ value: PRICE_MARK_20_PERCENT, label: "¥10k" },
										{ value: PRICE_MARK_50_PERCENT, label: "¥25k" },
										{ value: MAX_PRICE, label: "¥50k" },
									]}
								/>
							</div>
						</Stack>
					</Accordion.Panel>
				</Accordion.Item>

			</Accordion>
		</Card>
	);
}

// Main search page
export default async function SearchPage() {
	const searchData = await getSearchData();

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
            Advanced Search
					</Title>
					<Text size="lg" color="dimmed">
            Search through our comprehensive database of hobby items
					</Text>
				</Box>

				<Grid>
					{/* Search Form */}
					<Grid.Col span={{ base: 12, lg: 4 }}>
						<div style={{ position: "sticky", top: STICKY_TOP_POSITION }}>
							<SearchFormWrapper searchData={searchData} />
						</div>
					</Grid.Col>

					{/* Results */}
					<Grid.Col span={{ base: 12, lg: 8 }}>
						<SearchResultsWrapper searchData={searchData} />
					</Grid.Col>
				</Grid>
			</Stack>
		</Container>
	);
}

// Client-side wrapper for search form
function SearchFormWrapper({ searchData }: { searchData: Awaited<ReturnType<typeof getSearchData>> }) {
	const { filters, setFilters } = useSearch();
	const { setState } = useUrlState<Record<string, any>>({}, { debounceMs: TIMING.DEBOUNCE_DEFAULT });

	const handleFiltersChange = (newFilters: Partial<ShareableFilters>) => {
		const updatedFilters = { ...filters, ...newFilters };
		setFilters(updatedFilters);
		setState({
			q: newFilters.search || undefined,
			brands: newFilters.brands?.length ? newFilters.brands : undefined,
			categories: newFilters.categories?.length ? newFilters.categories : undefined,
		});
	};

	return (
		<SearchForm
			filters={filters}
			onFiltersChange={handleFiltersChange}
			searchData={searchData}
		/>
	);
}

// Client-side wrapper for search results
function SearchResultsWrapper({ searchData }: { searchData: Awaited<ReturnType<typeof getSearchData>> }) {
	const { isLoading, results, search, filters, setFilters } = useSearch();

	// Perform search when component mounts or filters change
	React.useEffect(() => {
		if (filters.search || (filters.brands && filters.brands.length > 0) || (filters.categories && filters.categories.length > 0)) {
			search({
				query: filters.search,
				brands: filters.brands ?? [],
				category: filters.categories?.[0], // Take first category or undefined
				series: filters.series ?? [],
				grades: filters.grades ?? [],
				scales: filters.scales ?? [],
			});
		}
	}, [filters, search]);

	return (
		<Box>
			{/* Results Header */}
			<Group justify="space-between" mb="lg">
				<Box>
					<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
            Search Results
					</Text>
					<Text size="sm" color="dimmed">
						{isLoading
							? "Searching..."
							: results.length > 0
								? `Found ${results.length} items`
								: "No items found"
						}
					</Text>
				</Box>

				{results.length > 0 && (
					<Select
						w={SELECT_WIDTH}
						data={[
							{ value: "relevance", label: "Relevance" },
							{ value: "name", label: "Name" },
							{ value: "date", label: "Date" },
							{ value: "price", label: "Price" },
						]}
						value={filters.sort?.field ?? "relevance"}
						onChange={(value) => setFilters({
							sort: {
								field: value as "relevance" | "name" | "date" | "price",
								direction: filters.sort?.direction ?? "desc"
							}
						})}
					/>
				)}
			</Group>

			{/* Loading State */}
			{isLoading && (
				<div>
					<SimpleGrid
						cols={{
							base: MOBILE_GRID_COLS,
							sm: SMALL_SCREEN_GRID_COLS,
							md: DEFAULT_GRID_COLS
						}}
						spacing={{ base: "sm", md: "md" }}
					>
						{Array.from({length: SKELETON_COUNT}).map((_, index) => (
							<Card key={index} p={0} radius="md" withBorder={true}>
								<Skeleton height={THUMBNAIL_HEIGHT} />
								<Box p="md">
									<Skeleton height={UI.SKELETON_HEIGHT_LARGE} mb="xs" />
									<Skeleton height={UI.SKELETON_HEIGHT_MEDIUM} mb="md" width="60%" />
									<Group gap="xs">
										<Skeleton width={UI.SKELETON_HEIGHT_XXL} height={UI.SKELETON_HEIGHT_LARGE} radius="sm" />
										<Skeleton width={UI.SKELETON_HEIGHT_XXXL} height={UI.SKELETON_HEIGHT_LARGE} radius="sm" />
									</Group>
								</Box>
							</Card>
						))}
					</SimpleGrid>
				</div>
			)}

			{/* Results Grid */}
			{!isLoading && results.length > 0 && (
				<SimpleGrid
					cols={{
						base: MOBILE_GRID_COLS,
						sm: SMALL_SCREEN_GRID_COLS,
						lg: DEFAULT_GRID_COLS
					}}
					spacing={{ base: "sm", md: "md" }}
				>
					{results.map((result) => (
						<ItemCard key={result.item.id} item={result.item.originalData as ItemNode} />
					))}
				</SimpleGrid>
			)}

			{/* No Results */}
			{!isLoading && results.length === 0 && filters.search && (
				<Box ta="center" py="xl">
					<IconSearch size={UI.ICON_SIZE_XXL * 2} color="var(--mantine-color-gray-4)" />
					<Title order={3} mt="md" mb="sm">
            No results found
					</Title>
					<Text color="dimmed" mb="lg">
            Try adjusting your search terms or filters
					</Text>
					<Button variant="light" onClick={() => setFilters({ search: "" })}>
            Clear Search
					</Button>
				</Box>
			)}

			{/* Initial State */}
			{!isLoading && results.length === 0 && !filters.search && (
				<Box ta="center" py="xl">
					<IconSearch size={UI.ICON_SIZE_XXL * 2} color="var(--mantine-color-gray-4)" />
					<Title order={3} mt="md" mb="sm">
            Start Searching
					</Title>
					<Text color="dimmed">
            Use the filters on the left to search for items
					</Text>
				</Box>
			)}
		</Box>
	);
}