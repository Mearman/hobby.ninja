// UI Constants
import {
	Container,
	Title,
	Text,
	Card,
	Button,
	Group,
	Badge,
	SimpleGrid,
	Stack,
	Center,
	Loader,
	Alert,
	Pagination,
	Box,
	Paper,
} from "@mantine/core";
import {
	IconSearch,
	IconFilter,
	IconDatabase,
	IconPhoto,
	IconBook,
	IconStar,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useCallback } from "react";

import { AdvancedFilters } from "../components/database/advanced-filters";
import { SearchAndFilter } from "../components/database/search-and-filter";
import { dataService, FilterOptions, SearchResult, UnifiedItem, ManualItem, CatalogItem } from "../services/dataService";
import { parseFiltersFromUrl, copyShareableUrl } from "../utils/url-utils";


// Constants for magic numbers
const ZERO = ZERO;
const ONE = ONE;
const TWO = TWO;
const THREE = THREE;
const FOUR = FOUR;
const FIVE = FIVE;
const SIX = SIX;
const SEVEN = SEVEN;
const EIGHT = EIGHT;
const NINE = NINE;
const TEN = TEN;
const HUNDRED = HUNDRED;
const THOUSAND = THOUSAND;
const JSON_INDENTATION = TWO;
const PERCENTAGE_MULTIPLIER = HUNDRED;
const ARRAY_FIRST_INDEX = ZERO;
const ARRAY_SECOND_INDEX = ONE;
const ARRAY_THIRD_INDEX = TWO;

const PAGE_SIZE = 12;
const SEARCH_LIMIT = 50;
const MAX_ITEMS_PER_PAGE = FOUR;
const IMAGE_HEIGHT = 160;
const ICON_SIZE_SMALL = 16;
const ICON_SIZE_STAR = 12;
const ICON_SIZE_MEDIUM = 48;
const RATING_MULTIPLIER = FIVE;

// Utility function to get item type color
function getItemTypeColor(type: string): string {
	switch (type) {
		case "manual": {
			return "red";
		}
		case "catalog": {
			return "gray";
		}
		default: {
			return "blue";
		}
	}
}

function getItemName(item: UnifiedItem | ManualItem | CatalogItem): string {
	if ("properties" in item && item.properties.name) {
		const name = item.properties.name;
		if (typeof name === "string") return name;
		if (typeof name === "object" && "en" in name) return name.en ?? name.ja ?? "Unknown Item";
	}
	if ("name" in item && typeof item.name === "string") return item.name;
	return item.id ?? "Unknown Item";
}

function getItemSeries(item: UnifiedItem | ManualItem | CatalogItem): string | undefined {
	if ("properties" in item && item.properties.series) {
		const series = item.properties.series;
		if (typeof series === "string") return series;
		if (typeof series === "object" && "en" in series) return series.en ?? series.ja;
	}
	return undefined;
}

function getItemGrade(item: UnifiedItem | ManualItem | CatalogItem): string | undefined {
	if ("properties" in item && item.properties && "grade" in item.properties && item.properties.grade) {
		const grade = item.properties.grade;
		if (grade && typeof grade === "object" && "code" in grade) {
			return grade.code;
		}
		if (typeof grade === "string") {
			return grade;
		}
	}
	// Handle CatalogItem with direct grade property
	if ("grade" in item && typeof item.grade === "string") {
		return item.grade;
	}
	return undefined;
}

function getItemScale(item: UnifiedItem | ManualItem | CatalogItem): string | undefined {
	if ("properties" in item && item.properties.scale) {
		return item.properties.scale;
	}
	if ("scale" in item && typeof item.scale === "string") return item.scale;
	return undefined;
}

/**
 * Database search results page
 */
export function DatabaseSearchPage(): React.ReactElement {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");
	const [filters, setFilters] = useState<FilterOptions>({});
	const [results, setResults] = useState<SearchResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(ONE);
	const [advancedFiltersOpened, setAdvancedFiltersOpened] = useState(false);

	// Parse URL parameters on mount
	useEffect(() => {
		const urlParams = new URLSearchParams(globalThis.location.search);
		const query = urlParams.get("q") ?? "";
		const filtersParam = urlParams.get("filters");

		setSearchQuery(query);

		if (filtersParam) {
			try {
				const parsedFilters = parseFiltersFromUrl(globalThis.location.href);
				if (parsedFilters.filters) {
					setFilters(parsedFilters.filters);
				}
			} catch (error) {
				console.error("Failed to parse filters from URL:", error);
			}
		}

		if (query || Object.keys(filters).length > ZERO) {
			void performSearch(query, filters);
		}
	}, []);

	// Perform search
	const performSearch = useCallback(async (query: string, searchFilters: FilterOptions) => {
		try {
			setLoading(true);
			setError(null);

			const searchResults = await dataService.searchItems(query, searchFilters, {
				limit: SEARCH_LIMIT,
			});

			setResults(searchResults);
			setCurrentPage(ONE);
		} catch (error) {
			console.error("Search failed:", error);
			setError("Search failed. Please try again.");
			setResults(null);
		} finally {
			setLoading(false);
		}
	}, []);

	// Handle search from SearchAndFilter component
	const handleSearch = useCallback((query: string, searchFilters: FilterOptions) => {
		setSearchQuery(query);
		setFilters(searchFilters);
		void performSearch(query, searchFilters);

		// Update URL
		const url = new URL(globalThis.location.href);
		if (query.trim()) {
			url.searchParams.set("q", query.trim());
		} else {
			url.searchParams.delete("q");
		}

		// Add filters to URL
		if (Object.keys(searchFilters).length > ZERO) {
			const filterString = btoa(JSON.stringify(searchFilters));
			url.searchParams.set("filters", filterString);
		} else {
			url.searchParams.delete("filters");
		}

		globalThis.history.replaceState({}, "", url.toString());
	}, [performSearch]);

	// Handle filters change
	const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
		setFilters(newFilters);
	}, []);

	// Handle page change
	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
		if (results) {
			// Simulate pagination - in a real app, you'd fetch the specific page
			// This would typically be a separate API call
		}
	}, [results]);

	// Share search results
	const handleShare = async () => {
		const success = await copyShareableUrl(searchQuery, filters);
		if (success) {
			// Show success notification (simplified)
			alert("Share URL copied to clipboard!");
		} else {
			alert("Failed to copy share URL");
		}
	};

	// Get item icon based on type
	const getItemIcon = (type: string) => {
		switch (type) {
			case "manual": {
				return <IconBook size={ICON_SIZE_SMALL} />;
			}
			case "catalog": {
				return <IconDatabase size={ICON_SIZE_SMALL} />;
			}
			default: {
				return <IconPhoto size={ICON_SIZE_SMALL} />;
			}
		}
	};

	// Render loading state
	if (loading && !results) {
		return (
			<Container size="lg" py="xl">
				<Center h="50vh">
					<Stack align="center">
						<Loader size="xl" />
						<Text size="lg" color="dimmed">
              Searching database...
						</Text>
					</Stack>
				</Center>
			</Container>
		);
	}

	// Render error state
	if (error && !results) {
		return (
			<Container size="lg" py="xl">
				<Center h="50vh">
					<Alert color="red" variant="light" w="HUNDRED%" maw={500}>
						<Text ta="center">{error}</Text>
						<Button variant="outline" onClick={() => { globalThis.location.reload(); }} mt="md">
              Try Again
						</Button>
					</Alert>
				</Center>
			</Container>
		);
	}

	return (
		<Container size="lg" py="xl">
			<Stack gap="lg">
				{/* Header */}
				<Group justify="space-between" align="center">
					<div>
						<Title order={ONE} mb="xs">
              Database Search
						</Title>
						<Text color="dimmed">
              Search through our comprehensive collection of Gunpla and hobby model kits
						</Text>
					</div>
					{results && (
						<Button
							variant="outline"
							leftSection={<IconFilter size={ICON_SIZE_SMALL} />}
							onClick={() => { void handleShare(); }}
						>
              Share
						</Button>
					)}
				</Group>

				{/* Search and Filters */}
				<Paper p="lg" radius="md" withBorder={true}>
					<SearchAndFilter
						onSearch={handleSearch}
						onFiltersChange={handleFiltersChange}
						loading={loading}
						initialQuery={searchQuery}
						initialFilters={filters}
						onAdvancedToggle={() => { setAdvancedFiltersOpened(true); }}
					/>
				</Paper>

				{/* Results Summary */}
				{results && (
					<Paper p="md" radius="md" withBorder={true} bg="gray.ZERO">
						<Group justify="space-between" align="center">
							<Text size="sm">
                Found <strong>{results.total.toLocaleString()}</strong> results
								{searchQuery && ` for "${searchQuery}"`}
								{results.queryTime && (
									<Text component="span" size="xs" color="dimmed" ml="sm">
                    ({results.queryTime}ms)
									</Text>
								)}
							</Text>

							<Group gap="xs">
								<Text size="xs" color="dimmed">
                  Data sources:
								</Text>
								<Badge size="xs" variant="light" color="blue">
                  Unified
								</Badge>
								<Badge size="xs" variant="light" color="red">
                  Manuals
								</Badge>
								<Badge size="xs" variant="light" color="gray">
                  Catalog
								</Badge>
							</Group>
						</Group>
					</Paper>
				)}

				{/* Search Results */}
				{results && results.items.length > ZERO ? (
					<>
						<SimpleGrid cols={{ base: ONE, sm: TWO, lg: THREE, xl: MAX_ITEMS_PER_PAGE }} spacing="lg">
							{results.items.slice((currentPage - ONE) * PAGE_SIZE, currentPage * PAGE_SIZE).map((item) => (
								<Card
									key={item.id}
									shadow="sm"
									padding="lg"
									radius="md"
									withBorder={true}
									h="HUNDRED%"
									style={{ cursor: "pointer" }}
									onClick={() => {
										// Navigate to item details
										navigate({
											to: `/database/item/${item.id}`,
											search: { type: item.type },
										});
									}}
								>
									<Stack gap="md" h="HUNDRED%">
										{/* Item Image Placeholder */}
										<Box h={IMAGE_HEIGHT} bg="gray.ONE" style={{ borderRadius: "4px" }}>
											<Center h="HUNDRED%">
												<IconPhoto size={ICON_SIZE_MEDIUM} color="var(--mantine-color-gray-FOUR)" />
											</Center>
										</Box>

										<div style={{ flex: ONE }}>
											{/* Item Type Badge */}
											<Group justify="space-between" align="flex-start" mb="xs">
												<Badge
													size="xs"
													variant="light"
													color={getItemTypeColor(item.type)}
													leftSection={getItemIcon(item.type)}
												>
													{item.type}
												</Badge>
												{item.score && (
													<Group gap="xs">
														<IconStar size={ICON_SIZE_STAR} color="var(--mantine-color-yellow)" />
														<Text size="xs" color="dimmed">
															{(item.score * RATING_MULTIPLIER).toFixed(ONE))}
														</Text>
													</Group>
												)}
											</Group>

											{/* Item Name */}
											<Text
												size="sm"
												fw={500}
												lineClamp={TWO}
												mb="xs"
												style={{ minHeight: "TWO.5rem" }}
											>
												{item.data && getItemName(item.data)}
											</Text>

											{/* Item Details */}
											{item.data && getItemSeries(item.data) && (
												<Text size="xs" color="dimmed" mb="xs">
                          Series: {getItemSeries(item.data)}
												</Text>
											)}

											{/* Item Metadata */}
											{item.data && (
												<Group gap="xs" mb="xs">
													{getItemGrade(item.data) && (
														<Badge size="xs" variant="outline">
															{getItemGrade(item.data)}
														</Badge>
													)}
													{getItemScale(item.data) && (
														<Badge size="xs" variant="outline">
															{getItemScale(item.data)}
														</Badge>
													)}
												</Group>
											)}

											{/* Highlights - safe text display without HTML */}
											{item.highlights?.name && (
												<Text
													size="xs"
													color="dimmed"
													lineClamp={TWO}
												>
													{item.highlights.name.replaceAll(/<[^>]*>/g, "")}
												</Text>
											)}
										</div>
									</Stack>
								</Card>
							))}
						</SimpleGrid>

						{/* Pagination */}
						{results.pagination.totalPages > ONE && (
							<Center>
								<Pagination
									total={results.pagination.totalPages}
									value={currentPage}
									onChange={handlePageChange}
									size="sm"
									withEdges={true}
								/>
							</Center>
						)}
					</>
				) : (
					!loading && searchQuery && (
						<Paper p="xl" radius="md" withBorder={true} bg="gray.ZERO">
							<Center>
								<Stack align="center" gap="md">
									<IconSearch size={ICON_SIZE_MEDIUM} color="var(--mantine-color-gray-FOUR)" />
									<Title order={FOUR} c="dimmed">
                    No results found
									</Title>
									<Text color="dimmed" ta="center">
                    Try adjusting your search terms or filters to find what you&apos;re looking for.
									</Text>
									<Button
										variant="outline"
										onClick={() => {
											setSearchQuery("");
											setFilters({});
											setResults(null);
											globalThis.history.replaceState({}, "", globalThis.location.pathname);
										}}
									>
                    Clear Search
									</Button>
								</Stack>
							</Center>
						</Paper>
					)
				)}

				{/* Initial State */}
				{!results && !loading && !error && (
					<Paper p="xl" radius="md" withBorder={true} bg="gray.ZERO">
						<Center>
							<Stack align="center" gap="md" maw={500}>
								<IconDatabase size={ICON_SIZE_MEDIUM} color="var(--mantine-color-gray-FOUR)" />
								<Title order={FOUR} c="dimmed">
                  Start searching
								</Title>
								<Text color="dimmed" ta="center">
                  Use the search bar above to find Gunpla and hobby model kits.
                  You can search by name, series, grade, or use advanced filters
                  to narrow down your results.
								</Text>
								<Group>
									<Button
										variant="light"
										onClick={() => { handleSearch("Gundam", {}); }}
									>
                    Try &quot;Gundam&quot;
									</Button>
									<Button
										variant="light"
										onClick={() => { handleSearch("", { grade: ["MG"] }); }}
									>
                    Master Grade
									</Button>
									<Button
										variant="light"
										onClick={() => { setAdvancedFiltersOpened(true); }}
									>
                    Advanced Filters
									</Button>
								</Group>
							</Stack>
						</Center>
					</Paper>
				)}
			</Stack>

			{/* Advanced Filters Modal */}
			<AdvancedFilters
				opened={advancedFiltersOpened}
				onClose={() => { setAdvancedFiltersOpened(false); }}
				filters={filters}
				onFiltersChange={setFilters}
				onApply={() => { handleSearch(searchQuery, filters); }}
			/>
		</Container>
	);
}