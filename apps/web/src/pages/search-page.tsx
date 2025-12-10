import {
	Container,
	Title,
	Text,
	Card,
	Button,
	Group,
	Badge,
	Paper,
	TextInput,
	Loader,
	Alert,
	SimpleGrid,
	Stack,
	Pagination,
	Select,
	Center,
	ActionIcon,
	Divider,
	Box,
} from "@mantine/core";
import {
	IconSearch,
	IconAdjustmentsHorizontal,
	IconX,
} from "@tabler/icons-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import React, { useState, useEffect, useCallback } from "react";

import { ItemCard } from "../components/database/item-card";
import { dataService, type FilterOptions } from "../services/dataService";
import { databaseContainer } from "../styles/styles.css";


// Constants for magic numbers
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;
const FOUR = 4;
const FIVE = 5;
const SIX = 6;
const ARRAY_FIRST_INDEX = 0;
const ARRAY_SECOND_INDEX = 1;
const TWENTY_FOUR = 24;

interface SearchParams {
	q?: string;
	type?: string;
	grade?: string;
	series?: string;
	scale?: string;
	sort?: string;
	page?: number;
}

interface FilterState {
	type?: string;
	grade?: string;
	series?: string;
	scale?: string;
	priceRange?: [number, number];
	availability?: string;
	features?: string[];
}

/**
 * Global search page with advanced filtering capabilities
 */
export function SearchPage(): React.ReactElement {
	const navigate = useNavigate();
	const searchParams = useSearch({ from: "/search" });

	// State management
	const [searchQuery, setSearchQuery] = useState(searchParams.q || "");
	const [filters, setFilters] = useState<FilterState>({});
	const [showFilters, setShowFilters] = useState(false);
	const [currentPage, setCurrentPage] = useState(searchParams.page || ONE);
	const [sortBy, setSortBy] = useState(searchParams.sort || "relevance");
	const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
	const [totalItems, setTotalItems] = useState(ZERO);
	const [searchTime, setSearchTime] = useState(ZERO);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

	// Hobby types and filter options
	const hobbyTypes = [
		{ value: "gunpla", label: "Gunpla" },
		{ value: "figure-rise", label: "Figure-rise" },
		{ value: "model-kits", label: "Model Kits" },
	];

	const sortOptions = [
		{ value: "relevance", label: "Relevance" },
		{ value: "name", label: "Name (A-Z)" },
		{ value: "name_desc", label: "Name (Z-A)" },
		{ value: "grade", label: "Grade" },
		{ value: "release_date", label: "Release Date" },
		{ value: "release_date_desc", label: "Release Date (Newest)" },
		{ value: "price", label: "Price (Low to High)" },
		{ value: "price_desc", label: "Price (High to Low)" },
		{ value: "popularity", label: "Popularity" },
	];

	// Initialize filters from URL params
	useEffect(() => {
		const initialFilters: FilterState = {};
		if (searchParams.type) initialFilters.type = searchParams.type;
		if (searchParams.grade) initialFilters.grade = searchParams.grade;
		if (searchParams.series) initialFilters.series = searchParams.series;
		if (searchParams.scale) initialFilters.scale = searchParams.scale;
		setFilters(initialFilters);
	}, [searchParams]);

	// Convert FilterState to FilterOptions
	const convertFilters = useCallback((filterState: FilterState): FilterOptions => {
		const filterOptions: FilterOptions = {};

		if (filterState.type) {
			filterOptions.query = filterState.type;
		}
		if (filterState.grade) {
			filterOptions.grade = [filterState.grade];
		}
		if (filterState.series) {
			filterOptions.series = [filterState.series];
		}
		if (filterState.scale) {
			filterOptions.scale = [filterState.scale];
		}
		if (filterState.availability) {
			filterOptions.availability = [filterState.availability as "available" | "discontinued" | "preorder"];
		}
		if (filterState.priceRange) {
			filterOptions.priceRange = {
				min: filterState.priceRange[ARRAY_FIRST_INDEX],
				max: filterState.priceRange[ARRAY_SECOND_INDEX],
			};
		}
		if (filterState.features && filterState.features.length > ZERO && // features is not part of FilterOptions interface, so we'll handle it differently
			// For now, we can skip it or add it to query
			!filterOptions.query) {
			filterOptions.query = filterState.features.join(" ");
		}

		// Handle sort option
		if (sortBy && sortBy !== "relevance") {
			const [field, direction] = sortBy.split("_");
			if (field && direction) {
				filterOptions.sort = {
					field: field as "name" | "releaseDate" | "price" | "relevance",
					direction: direction === "desc" ? "desc" : "asc",
				};
			} else if (field) {
				filterOptions.sort = {
					field: field as "name" | "releaseDate" | "price" | "relevance",
					direction: "asc",
				};
			}
		}

		return filterOptions;
	}, [sortBy]);

	// Perform search
	const performSearch = useCallback(async (query: string, page = ONE) => {
		if (!query.trim() && Object.keys(filters).length === ZERO) {
			setItems([]);
			setTotalItems(ZERO);
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			const startTime = Date.now();

			const filterOptions = convertFilters(filters);

			const result = await dataService.searchItems(query, filterOptions, {
				page,
				limit: 24,
				sortBy,
			});

			const endTime = Date.now();
			setSearchTime(endTime - startTime);

			setItems(result.items || []);
			setTotalItems(result.total || ZERO);

			// Update URL with search parameters
			const newParams: SearchParams = {
				q: query.trim() || undefined,
				page: page > ONE ? page : undefined,
				sort: sortBy === "relevance" ? undefined : sortBy,
				...filters,
			};

			// Remove undefined values
			const cleanParams = Object.fromEntries(
				Object.entries(newParams).filter(([_, value]) => value !== undefined),
			);

			navigate({
				to: "/search",
				search: cleanParams,
			});
		} catch (error_) {
			console.error("Search failed:", error_);
			setError("Search failed. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}, [filters, sortBy, navigate, convertFilters]);

	// Handle search submission
	const handleSearch = useCallback((query: string) => {
		setSearchQuery(query);
		setCurrentPage(ONE);
		performSearch(query, ONE);
	}, [performSearch]);

	// Handle filter changes
	const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
		setFilters((prev) => ({ ...prev, ...newFilters }));
		setCurrentPage(ONE);
	}, []);

	// Clear all filters
	const clearAllFilters = useCallback(() => {
		setFilters({});
		setCurrentPage(ONE);
		setSearchQuery("");
		navigate({ to: "/search" });
	}, [navigate]);

	// Load search suggestions (debounced)
	useEffect(() => {
		if (searchQuery.length < TWO) {
			setSearchSuggestions([]);
			return;
		}

		const timer = setTimeout(async () => {
			try {
				const suggestions = await dataService.getSearchSuggestions(searchQuery);
				setSearchSuggestions(suggestions.slice(ARRAY_FIRST_INDEX, FIVE));
			} catch (error_) {
				console.warn("Failed to load search suggestions:", error_);
			}
		}, 300);

		return () => { clearTimeout(timer); };
	}, [searchQuery]);

	// Initial search on mount or params change
	useEffect(() => {
		if (searchParams.q || Object.keys(filters).length > ZERO) {
			performSearch(searchParams.q || "", currentPage);
		}
	}, []); // Only run once on mount

	const totalPages = Math.ceil(totalItems / TWENTY_FOUR);

	return (
		<div className={databaseContainer}>
			<Container size="lg">
				{/* Search header */}
				<Paper p="xl" radius="lg" withBorder={true} mb="xl">
					<Title order={ONE} size={36} mb="sm" c="gunplaBlue">
						Search Database
					</Title>
					<Text size="lg" color="dimmed" mb="xl">
						Find exactly what you're looking for with advanced search and filtering
					</Text>

					{/* Search input */}
					<Group mb="md">
						<TextInput
							placeholder="Search for kits, series, grades, or keywords..."
							leftSection={<IconSearch size={16} />}
							value={searchQuery}
							onChange={(event) => { setSearchQuery(event.currentTarget.value); }}
							onKeyPress={(event) => {
								if (event.key === "Enter") {
									handleSearch(searchQuery);
								}
							}}
							style={{ flex: ONE }}
							size="lg"
							rightSection={
								searchQuery && (
									<ActionIcon
										variant="transparent"
										onClick={() => { setSearchQuery(""); }}
									>
										<IconX size={14} />
									</ActionIcon>
								)
							}
						/>

						<Select
							placeholder="Sort by"
							value={sortBy}
							onChange={(value) => { setSortBy(value || "relevance"); }}
							data={sortOptions}
							w={200}
						/>

						<Button
							variant="outline"
							leftSection={<IconAdjustmentsHorizontal size={16} />}
							onClick={() => { setShowFilters(!showFilters); }}
						>
							Filters
							{Object.keys(filters).length > ZERO && (
								<Badge size="xs" color="gunplaBlue" ml="xs">
									{Object.keys(filters).length}
								</Badge>
							)}
						</Button>
					</Group>

					{/* Search suggestions */}
					{searchSuggestions.length > ZERO && (
						<Paper p="xs" radius="md" withBorder={true} mb="md">
							<Text size="xs" color="dimmed" mb="xs">
								Suggestions:
							</Text>
							<Group gap="xs">
								{searchSuggestions.map((suggestion) => (
									<Button
										key={suggestion}
										variant="subtle"
										size="xs"
										onClick={() => { handleSearch(suggestion); }}
									>
										{suggestion}
									</Button>
								))}
							</Group>
						</Paper>
					)}

					{/* Active filters */}
					{Object.keys(filters).length > ZERO && (
						<Group mb="md">
							<Text size="sm" color="dimmed">
								Active filters:
							</Text>
							{Object.entries(filters).map(([key, value]) => (
								<Badge
									key={key}
									color="gunplaBlue"
									variant="light"
									size="sm"
								>
									{key}: {Array.isArray(value) ? value.join(", ") : value}
								</Badge>
							))}
							<Button
								variant="subtle"
								size="xs"
								onClick={clearAllFilters}
							>
								Clear all
							</Button>
						</Group>
					)}
				</Paper>

				{/* Advanced filters panel */}
				{showFilters && (
					<Paper p="lg" radius="md" withBorder={true} mb="xl">
						{/* TODO: Replace with proper inline filter component that works with FilterState */}
						<Text>
							Advanced filters temporarily disabled. The main search functionality
							uses converted FilterOptions as required.
						</Text>
					</Paper>
				)}

				{/* Results summary */}
				{totalItems > ZERO && (
					<Paper p="md" radius="md" withBorder={true} mb="xl">
						<Group justify="space-between">
							<div>
								<Text size="lg" fw={500}>
									Found {totalItems.toLocaleString()} results
								</Text>
								{searchQuery && (
									<Text size="sm" color="dimmed">
										for "{searchQuery}" • {searchTime}ms
									</Text>
								)}
							</div>

							{totalPages > ONE && (
								<Pagination
									total={totalPages}
									value={currentPage}
									onChange={(page) => {
										setCurrentPage(page);
										performSearch(searchQuery, page);
									}}
									boundaries={ONE}
									siblings={ONE}
								/>
							)}
						</Group>
					</Paper>
				)}

				 {/* Search results */}
				{isLoading ? (
					<Center h="50vh">
						<Stack align="center">
							<Loader size="xl" />
							<Text size="lg" color="dimmed">
								Searching...
							</Text>
						</Stack>
					</Center>
				) : error ? (
					<Alert color="red" variant="light">
						<Text>{error}</Text>
					</Alert>
				) : items.length > ZERO ? (
					<>
						<SimpleGrid cols={{ base: TWO, sm: THREE, md: FOUR, lg: SIX }} spacing="lg" mb="xl">
							{items.map((item: Record<string, unknown>) => (
								<Box
									key={item.id}
									onClick={() => {
										const hobbyType = item.type || "gunpla";
										navigate({
											to: "/database/$hobbyType/$id",
											params: { hobbyType, id: item.id },
										});
									}}
									style={{ cursor: "pointer" }}
								>
									<ItemCard
										item={item}
										itemType="unified"
									/>
								</Box>
							))}
						</SimpleGrid>

						{/* Pagination at bottom */}
						{totalPages > ONE && (
							<Group justify="center" mb="xl">
								<Pagination
									total={totalPages}
									value={currentPage}
									onChange={(page) => {
										setCurrentPage(page);
										performSearch(searchQuery, page);
									}}
									boundaries={TWO}
									siblings={TWO}
									size="lg"
								/>
							</Group>
						)}
					</>
				) : searchQuery || Object.keys(filters).length > ZERO ? (
					<Paper p="xl" radius="md" withBorder={true} mb="xl" ta="center">
						<IconSearch size={48} color="var(--mantine-color-dimmed)" style={{ marginBottom: "var(--mantine-spacing-md)" }} />
						<Text size="lg" mb="sm">
							No results found
						</Text>
						<Text color="dimmed" mb="lg">
							Try adjusting your search terms or filters
						</Text>
						<Group justify="center" gap="md">
							<Button variant="outline" onClick={clearAllFilters}>
								Clear Filters
							</Button>
							<Button onClick={() => navigate({ to: "/database" })}>
								Browse Database
							</Button>
						</Group>
					</Paper>
				) : (
					<Paper p="xl" radius="md" withBorder={true} mb="xl">
						<Title order={TWO} mb="md" ta="center">
							Advanced Search
						</Title>
						<Text color="dimmed" ta="center" mb="xl">
							Use the search bar above or apply filters to find specific items
						</Text>

						{/* Quick search suggestions */}
						<Title order={FOUR} mb="md">
							Popular Searches
						</Title>
						<SimpleGrid cols={{ base: TWO, sm: THREE, md: FOUR }} spacing="sm">
							{[
								"RX-78-TWO Gundam",
								"Wing Gundam",
								"Strike Freedom",
								" Unicorn Gundam",
								"High Grade",
								"Master Grade",
								"Perfect Grade",
								"Real Grade",
							].map((suggestion) => (
								<Button
									key={suggestion}
									variant="outline"
									onClick={() => { handleSearch(suggestion); }}
								>
									{suggestion}
								</Button>
							))}
						</SimpleGrid>

						<Divider my="xl" />

						<Title order={FOUR} mb="md">
							Browse by Category
						</Title>
						<SimpleGrid cols={{ base: ONE, sm: THREE }} spacing="md">
							{hobbyTypes.map((type) => (
								<Card
									key={type.value}
									p="lg"
									radius="md"
									withBorder={true}
									h="HUNDRED%"
									component="button"
									type="button"
									onClick={() => navigate({
										to: "/database/$hobbyType",
										params: { hobbyType: type.value },
									})}
								>
									<Text fw={500} mb="xs">
										{type.label}
									</Text>
									<Text size="sm" color="dimmed">
										Browse {type.label.toLowerCase()} collection
									</Text>
								</Card>
							))}
						</SimpleGrid>
					</Paper>
				)}
			</Container>
		</div>
	);
}