"use client";

import {
	Box,
	Container,
	Grid,
	Stack,
	Text,
	Title,
	Button,
	Card,
	Pagination,
	Badge,
	Group,
	Divider,
	Alert,
	Skeleton,
	SimpleGrid,
	ScrollArea,
	ActionIcon,
	Tooltip,
	Avatar,
	Progress,
	Center,
} from "@mantine/core";
import {
	IconSearch,
	IconFilter,
	IconX,
	IconClock,
	IconTrendingUp,
	IconHeart,
	IconBulb,
	IconRefresh,
	IconAdjustmentsHorizontal,
	IconGridDots,
	IconList,
	IconTable,
	IconExternalLink,
} from "@tabler/icons-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";

import { FuseSearch } from "@/components/search/fuse-search";
import { AdvancedSearch } from "@/components/search/advanced-search";
import { ViewSwitcher, ViewMode, useViewMode } from "@/components/view/view-switcher";
import type { SearchResult, SearchFilters, SearchStats } from "@/lib/fuse-search";
import { useSearch, getNodeDisplayName } from "@/lib/fuse-search";

interface SearchState {
	query: string;
	results: SearchResult[];
	filters: SearchFilters;
	isLoading: boolean;
	totalResults: number;
	currentPage: number;
	resultsPerPage: number;
}

interface SavedSearch {
	id: string;
	name: string;
	query: string;
	filters: SearchFilters;
	createdAt: string;
}

export default function SearchPage() {
	// View mode management
	const { viewMode, setViewMode } = useViewMode("grid");

	// Search state
	const [searchState, setSearchState] = useState<SearchState>({
		query: "",
		results: [],
		filters: {},
		isLoading: false,
		totalResults: 0,
		currentPage: 1,
		resultsPerPage: viewMode === "table" ? 20 : 12,
	});

	// UI state
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
	const [popularSearches] = useState<string[]>([
		"RX-78-2 Gundam",
		"Strike Freedom",
		"MG 1/100",
		"Bandai",
		"Mobile Suit Gundam",
		"Perfect Grade",
		"Hi-Resolution",
		"Unicorn Gundam",
	]);

	const { isInitialized, search, advancedSearch, getStats } = useSearch();
	const [stats, setStats] = useState<SearchStats | null>(null);

	// Update results per page based on view mode
	useEffect(() => {
		setSearchState(prev => ({
			...prev,
			resultsPerPage: viewMode === "table" ? 20 : 12,
			currentPage: 1,
		}));
	}, [viewMode]);

	// Load search stats and saved searches
	useEffect(() => {
		if (isInitialized) {
			try {
				setStats(getStats());
			} catch (error) {
				console.error("Failed to load search stats:", error);
			}
		}

		// Load saved searches from localStorage
		const saved = localStorage.getItem("saved-searches");
		if (saved) {
			try {
				setSavedSearches(JSON.parse(saved));
			} catch (error) {
				console.error("Failed to parse saved searches:", error);
			}
		}

		// Load recent searches from localStorage
		const recent = localStorage.getItem("recent-searches");
		if (recent) {
			try {
				setRecentSearches(JSON.parse(recent));
			} catch (error) {
				console.error("Failed to parse recent searches:", error);
			}
		}
	}, [isInitialized, getStats]);

	// Handle search from FuseSearch component
	const handleQuickSearch = useCallback((result: SearchResult) => {
		// Navigate to item detail page
		globalThis.location.href = `/item/${result.item.id}`;
	}, []);

	// Handle advanced search
	const handleAdvancedSearch = useCallback((results: SearchResult[], query = "", filters = {}) => {
		setSearchState(prev => ({
			...prev,
			results,
			query,
			filters,
			totalResults: results.length,
			currentPage: 1,
			isLoading: false,
		}));

		// Save to recent searches if query exists
		if (query.trim()) {
			const updatedRecent = [query.trim(), ...recentSearches.filter(s => s !== query.trim())].slice(0, 10);
			setRecentSearches(updatedRecent);
			localStorage.setItem("recent-searches", JSON.stringify(updatedRecent));
		}
	}, [recentSearches]);

	// Handle result click
	const handleResultClick = useCallback((result: SearchResult) => {
		globalThis.location.href = `/item/${result.item.id}`;
	}, []);

	// Handle pagination
	const handlePageChange = useCallback((page: number) => {
		setSearchState(prev => ({ ...prev, currentPage: page }));
		// Scroll to top
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

	// Clear all filters
	const handleClearAll = useCallback(() => {
		setSearchState({
			query: "",
			results: [],
			filters: {},
			isLoading: false,
			totalResults: 0,
			currentPage: 1,
			resultsPerPage: viewMode === "table" ? 20 : 12,
		});
	}, [viewMode]);

	// Save current search
	const handleSaveSearch = useCallback(() => {
		if (!searchState.query.trim()) return;

		const savedSearch: SavedSearch = {
			id: Date.now().toString(),
			name: searchState.query.trim(),
			query: searchState.query.trim(),
			filters: searchState.filters,
			createdAt: new Date().toISOString(),
		};

		const updated = [...savedSearches, savedSearch];
		setSavedSearches(updated);
		localStorage.setItem("saved-searches", JSON.stringify(updated));
	}, [searchState, savedSearches]);

	// Load saved search
	const handleLoadSavedSearch = useCallback((saved: SavedSearch) => {
		const results = advancedSearch(saved.query, saved.filters);
		handleAdvancedSearch(results, saved.query, saved.filters);
	}, [advancedSearch, handleAdvancedSearch]);

	// Delete saved search
	const handleDeleteSavedSearch = useCallback((id: string) => {
		const updated = savedSearches.filter(s => s.id !== id);
		setSavedSearches(updated);
		localStorage.setItem("saved-searches", JSON.stringify(updated));
	}, [savedSearches]);

	// Format price for display
	const formatPrice = useCallback((price?: { amount: number; currency: string }) => {
		if (!price) return "N/A";
		return new Intl.NumberFormat("ja-JP", {
			style: "currency",
			currency: price.currency || "JPY",
		}).format(price.amount);
	}, []);

	// Get current page results
	const paginatedResults = useMemo(() => {
		const start = (searchState.currentPage - 1) * searchState.resultsPerPage;
		const end = start + searchState.resultsPerPage;
		return searchState.results.slice(start, end);
	}, [searchState.results, searchState.currentPage, searchState.resultsPerPage]);

	// Render result based on view mode
	const renderResult = useCallback((result: SearchResult) => {
		const item = result.item;
		const displayName = getNodeDisplayName(item);
		const matchPercentage = Math.round((1 - result.score) * 100);

		if (viewMode === "grid") {
			return (
				<Card
					key={item.id}
					p="md"
					radius="md"
					withBorder
					h="100%"
					style={{ cursor: "pointer" }}
					onClick={() => handleResultClick(result)}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = "translateY(-2px)";
						e.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = "translateY(0)";
						e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
					}}
					styles={{
						root: {
							transition: "all 0.2s ease",
						},
					}}
				>
					<Stack gap="sm">
						{/* Placeholder for image */}
						<Box
							h={120}
							bg="gray.1"
							style={{ borderRadius: "var(--mantine-radius-sm)" }}
						>
							<Text ta="center" c="dimmed" size="sm" mt="xl">
								No Image
							</Text>
						</Box>

						<Box flex={1}>
							<Text size="sm" fw={500} lineClamp={2} mb="xs">
								{displayName}
							</Text>
							{item.series && (
								<Text size="xs" c="dimmed" lineClamp={1} mb="xs">
									{item.series}
								</Text>
							)}
							<Group gap="xs" wrap="wrap" mb="xs">
								{item.grade && (
									<Badge size="xs" variant="light">
										{item.grade}
									</Badge>
								)}
								{item.scale && (
									<Badge size="xs" variant="outline">
										{item.scale}
									</Badge>
								)}
							</Group>
							<Group justify="space-between" align="center">
								<Text size="sm" fw={500} c="blue">
									{formatPrice(item.price)}
								</Text>
								{matchPercentage >= 80 && (
									<Badge size="xs" color="green" variant="light">
										{matchPercentage}% match
									</Badge>
								)}
							</Group>
						</Box>
					</Stack>
				</Card>
			);
		}

		if (viewMode === "list") {
			return (
				<Card
					key={item.id}
					p="md"
					radius="md"
					withBorder
					mb="sm"
					style={{ cursor: "pointer" }}
					onClick={() => handleResultClick(result)}
				>
					<Group justify="space-between" align="start">
						<Group flex={1} gap="md" align="start">
							{/* Placeholder for image */}
							<Avatar size={60} radius="sm" bg="gray.1">
								<Text c="dimmed" size="xs">
									No Img
								</Text>
							</Avatar>
							<Box flex={1}>
								<Text size="sm" fw={500} mb="xs">
									{displayName}
								</Text>
								{item.series && (
									<Text size="xs" c="dimmed" mb="xs">
										{item.series}
									</Text>
								)}
								<Group gap="xs" wrap="wrap">
									{item.brand && (
										<Badge size="xs" variant="outline" color="gray">
											{item.brand}
										</Badge>
									)}
									{item.grade && (
										<Badge size="xs" variant="light">
											{item.grade}
										</Badge>
									)}
									{item.scale && (
										<Badge size="xs" variant="outline">
											{item.scale}
										</Badge>
									)}
								</Group>
							</Box>
						</Group>
						<Group align="end">
							<Text ta="right">
								<Text size="sm" fw={500} c="blue">
									{formatPrice(item.price)}
								</Text>
								{matchPercentage >= 80 && (
									<Text size="xs" c="green">
										{matchPercentage}% match
									</Text>
								)}
							</Text>
						</Group>
					</Group>
				</Card>
			);
		}

		// Table view
		return null; // Will be rendered in table format
	}, [viewMode, handleResultClick, formatPrice]);

	// Render table view
	const renderTableView = useCallback(() => {
		return (
			<Card withBorder p={0}>
				<ScrollArea.Autosize mah={600}>
					<Box miw={800}>
						{/* Table header */}
						<Group p="md" bg="gray.0" justify="space-between" fw={500} gap="xl">
							<Text size="sm" flex={3}>Name</Text>
							<Text size="sm" flex={1}>Brand</Text>
							<Text size="sm" flex={1}>Grade</Text>
							<Text size="sm" flex={1}>Scale</Text>
							<Text size="sm" flex={1}>Price</Text>
							<Text size="sm" flex={1}>Match</Text>
						</Group>
						<Divider />

						{/* Table rows */}
						{paginatedResults.map((result, index) => {
							const item = result.item;
							const matchPercentage = Math.round((1 - result.score) * 100);

							return (
								<Box key={item.id}>
									<Group
										p="md"
										justify="space-between"
										gap="xl"
										style={{
											cursor: "pointer",
											backgroundColor: index % 2 === 0 ? "transparent" : "var(--mantine-color-gray-0)"
										}}
										onClick={() => handleResultClick(result)}
									>
										<Text size="sm" flex={3} fw={500} lineClamp={1}>
											{getNodeDisplayName(item)}
										</Text>
										<Text size="sm" flex={1} c="dimmed">
											{item.brand || "N/A"}
										</Text>
										<Text size="sm" flex={1}>
											{item.grade || "N/A"}
										</Text>
										<Text size="sm" flex={1}>
											{item.scale || "N/A"}
										</Text>
										<Text size="sm" flex={1} fw={500} c="blue">
											{formatPrice(item.price)}
										</Text>
										<Text size="sm" flex={1}>
											{matchPercentage >= 80 ? (
												<Badge size="xs" color="green" variant="light">
													{matchPercentage}%
												</Badge>
											) : (
												<Text size="xs" c="dimmed">
													{matchPercentage}%
												</Text>
											)}
										</Text>
									</Group>
									{index < paginatedResults.length - 1 && <Divider />}
								</Box>
							);
						})}
					</Box>
				</ScrollArea.Autosize>
			</Card>
		);
	}, [paginatedResults, handleResultClick, formatPrice]);

	if (!isInitialized) {
		return (
			<Container size="xl" py="xl">
				<Stack gap="xl">
					<Skeleton height={40} width={300} />
					<Skeleton height={200} radius="md" />
					<SimpleGrid cols={3} spacing="md">
						{[...Array(6)].map((_, i) => (
							<Skeleton key={i} height={250} radius="md" />
						))}
					</SimpleGrid>
				</Stack>
			</Container>
		);
	}

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Advanced Search
					</Title>
					<Text size="lg" c="dimmed">
						Search through our comprehensive database with instant results
					</Text>
				</Box>

				<Grid>
					{/* Sidebar */}
					<Grid.Col span={{ base: 12, lg: 3 }}>
						<Stack gap="lg">
							{/* Quick Search */}
							<FuseSearch
								onResultClick={handleQuickSearch}
								placeholder="Quick search..."
								maxResults={5}
								showFilters={false}
							/>

							{/* Advanced Search Toggle */}
							<Button
								variant={showAdvancedFilters ? "filled" : "light"}
								leftSection={<IconAdjustmentsHorizontal size={16} />}
								onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
								w="100%"
							>
								Advanced Filters
							</Button>

							{/* Advanced Search */}
							{showAdvancedFilters && (
								<AdvancedSearch
									onSearch={(results) => {
										const query = ""; // Will be extracted from the component
										const filters = {}; // Will be extracted from the component
										handleAdvancedSearch(results, query, filters);
									}}
									loading={searchState.isLoading}
								/>
							)}

							{/* Database Stats */}
							{stats && (
								<Card withBorder p="md">
									<Text size="sm" fw={500} mb="sm">
										Database Statistics
									</Text>
									<Stack gap="xs">
										<Group justify="space-between">
											<Text size="xs" c="dimmed">Items</Text>
											<Text size="xs" fw={500}>{stats.totalItems.toLocaleString()}</Text>
										</Group>
										<Group justify="space-between">
											<Text size="xs" c="dimmed">Brands</Text>
											<Text size="xs" fw={500}>{stats.brands.length}</Text>
										</Group>
										<Group justify="space-between">
											<Text size="xs" c="dimmed">Series</Text>
											<Text size="xs" fw={500}>{stats.series.length}</Text>
										</Group>
										<Group justify="space-between">
											<Text size="xs" c="dimmed">Grades</Text>
											<Text size="xs" fw={500}>{stats.grades.length}</Text>
										</Group>
									</Stack>
								</Card>
							)}

							{/* Recent Searches */}
							{recentSearches.length > 0 && (
								<Card withBorder p="md">
									<Group justify="space-between" mb="sm">
										<Text size="sm" fw={500}>
											<IconClock size={14} style={{ marginRight: 4 }} />
											Recent Searches
										</Text>
										<ActionIcon
											size="xs"
											variant="subtle"
											onClick={() => {
												setRecentSearches([]);
												localStorage.removeItem("recent-searches");
											}}
										>
											<IconX size={10} />
										</ActionIcon>
									</Group>
									<Stack gap="xs">
										{recentSearches.slice(0, 5).map((search, index) => (
											<Button
												key={index}
												variant="subtle"
												size="xs"
												justify="start"
												onClick={() => {
													const results = search(search);
													handleAdvancedSearch(results, search, {});
												}}
												w="100%"
											>
												{search}
											</Button>
										))}
									</Stack>
								</Card>
							)}

							{/* Saved Searches */}
							{savedSearches.length > 0 && (
								<Card withBorder p="md">
									<Group justify="space-between" mb="sm">
										<Text size="sm" fw={500}>
											<IconHeart size={14} style={{ marginRight: 4 }} />
											Saved Searches
										</Text>
									</Group>
									<Stack gap="xs">
										{savedSearches.slice(0, 3).map((saved) => (
											<Group key={saved.id} justify="space-between" gap="xs">
												<Button
													variant="subtle"
													size="xs"
													justify="start"
													onClick={() => handleLoadSavedSearch(saved)}
													flex={1}
												>
													{saved.name}
												</Button>
												<ActionIcon
													size="xs"
													variant="subtle"
													color="red"
													onClick={() => handleDeleteSavedSearch(saved.id)}
												>
													<IconX size={10} />
												</ActionIcon>
											</Group>
										))}
									</Stack>
								</Card>
							)}

							{/* Popular Searches */}
							<Card withBorder p="md">
								<Text size="sm" fw={500} mb="sm">
									<IconTrendingUp size={14} style={{ marginRight: 4 }} />
									Popular Searches
								</Text>
								<Stack gap="xs">
									{popularSearches.map((search, index) => (
										<Button
											key={index}
											variant="subtle"
											size="xs"
											justify="start"
											onClick={() => {
												const results = search(search);
												handleAdvancedSearch(results, search, {});
											}}
											w="100%"
										>
											{search}
										</Button>
									))}
								</Stack>
							</Card>

							{/* Search Tips */}
							<Card withBorder p="md">
								<Text size="sm" fw={500} mb="sm">
									<IconBulb size={14} style={{ marginRight: 4 }} />
									Search Tips
								</Text>
								<Stack gap="xs">
									<Text size="xs" c="dimmed">
										• Use specific model numbers like "RX-78-2"
									</Text>
									<Text size="xs" c="dimmed">
										• Search by grade: "PG", "MG", "RG"
									</Text>
									<Text size="xs" c="dimmed">
										• Combine terms: "Gundam MG 1/100"
									</Text>
									<Text size="xs" c="dimmed">
										• Filter by price range and year
									</Text>
								</Stack>
							</Card>
						</Stack>
					</Grid.Col>

					{/* Main Content */}
					<Grid.Col span={{ base: 12, lg: 9 }}>
						<Stack gap="lg">
							{/* Search Header */}
							{searchState.query && (
								<Card withBorder p="md">
									<Group justify="space-between" align="center">
										<Box>
											<Text size="lg" fw={500}>
												Search Results
											</Text>
											<Text size="sm" c="dimmed">
												{searchState.totalResults.toLocaleString()} results found for "{searchState.query}"
											</Text>
										</Box>
										<Group gap="sm">
											<Tooltip label="Save current search">
												<ActionIcon
													variant="light"
													onClick={handleSaveSearch}
													disabled={!searchState.query.trim()}
												>
													<IconHeart size={16} />
												</ActionIcon>
											</Tooltip>
											<Tooltip label="Clear all">
												<ActionIcon variant="light" onClick={handleClearAll}>
													<IconRefresh size={16} />
												</ActionIcon>
											</Tooltip>
											<ViewSwitcher value={viewMode} onChange={setViewMode} />
										</Group>
									</Group>

									{/* Active Filters */}
									{(searchState.query.trim() ||
										Object.values(searchState.filters).some(val =>
											Array.isArray(val) ? val.length > 0 : val !== undefined
										)) && (
										<>
											<Divider my="sm" />
											<Group gap="xs" wrap="wrap">
												{searchState.query.trim() && (
													<Badge size="sm" variant="light" color="blue">
														"{searchState.query}"
													</Badge>
												)}
												{Object.entries(searchState.filters).map(([key, value]) => {
													if (Array.isArray(value) && value.length > 0) {
														return value.map((val) => (
															<Badge key={`${key}-${val}`} size="sm" variant="light">
																{val}
															</Badge>
														));
													}
													return null;
												})}
											</Group>
										</>
									)}
								</Card>
							)}

							{/* Results */}
							{searchState.results.length > 0 ? (
								<>
									{viewMode === "table" ? (
										renderTableView()
									) : (
										<SimpleGrid
											cols={viewMode === "grid" ? { base: 1, sm: 2, md: 3, lg: 3, xl: 4 } : 1}
											spacing="md"
										>
											{paginatedResults.map(renderResult)}
										</SimpleGrid>
									)}

									{/* Pagination */}
									{searchState.totalResults > searchState.resultsPerPage && (
										<Center>
											<Pagination
												total={Math.ceil(searchState.totalResults / searchState.resultsPerPage)}
												value={searchState.currentPage}
												onChange={handlePageChange}
												size="sm"
											/>
										</Center>
									)}
								</>
							) : searchState.query ? (
								/* No Results State */
								<Card withBorder p="xl">
									<Stack align="center" gap="md">
										<IconSearch size={64} color="var(--mantine-color-gray-4)" />
										<Title order={3} c="dimmed">
											No results found
										</Title>
										<Text size="lg" c="dimmed" ta="center">
											We couldn't find any results for "{searchState.query}"
										</Text>
										<Stack gap="xs" ta="center" mt="md">
											<Text size="sm" fw={500}>Try these suggestions:</Text>
											<Text size="sm" c="dimmed">
												• Check your spelling for typos
											</Text>
											<Text size="sm" c="dimmed">
												• Try more general terms like "Gundam" or "MG"
											</Text>
											<Text size="sm" c="dimmed">
												• Use different keywords or model numbers
											</Text>
											<Text size="sm" c="dimmed">
												• Browse popular searches below
											</Text>
										</Stack>
										<Group gap="sm" mt="md">
											<Button variant="light" onClick={handleClearAll}>
												Clear Search
											</Button>
											<Button
												variant="outline"
												leftSection={<IconAdjustmentsHorizontal size={16} />}
												onClick={() => setShowAdvancedFilters(true)}
											>
												Use Advanced Filters
											</Button>
										</Group>
									</Stack>
								</Card>
							) : (
								/* Empty State */
								<Card withBorder p="xl" h={400}>
									<Stack align="center" justify="center" h="100%" gap="md">
										<IconSearch size={64} color="var(--mantine-color-gray-4)" />
										<Title order={3} c="dimmed">
											Start searching
										</Title>
										<Text size="lg" c="dimmed" ta="center">
											Enter a search term or use advanced filters to find Gundam models
										</Text>
									</Stack>
								</Card>
							)}
						</Stack>
					</Grid.Col>
				</Grid>
			</Stack>
		</Container>
	);
}