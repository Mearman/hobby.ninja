"use client";

import {
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
	Image,
	Pagination,
	Radio,
	ScrollArea,
	Select,
	SimpleGrid,
	Stack,
	Switch,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import {
	IconCalendar,
	IconClock,
	IconFolder,
	IconGrid,
	IconHash,
	IconHome,
	IconList,
	IconSearch,
	IconSortAscending,
	IconSortDescending,
	IconStar,
	IconTrendingUp,
	IconAdjustmentsHorizontal,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useEffect, useState, useMemo } from "react";

import { getAllItems, getAllSeries } from "@/lib/graph-data";
import { BaseNode, getNodeDisplayName, isBaseNode } from "@/lib/schemas";
import { seriesCard, seriesImage } from "@/styles/components.css";

// Define types locally to avoid circular imports
interface SeriesWithStats extends BaseNode {
	itemCount: number;
	firstYear?: number;
	lastYear?: number;
	averagePrice?: number;
	popularGrades?: string[];
	description?: string;
	franchise?: string;
}

interface SeriesFilters {
	sortBy: "name" | "itemCount" | "year" | "popularity";
	sortOrder: "asc" | "desc";
	viewMode: "grid" | "list";
	yearFilter?: string;
	franchiseFilter?: string;
	minItems?: number;
	showFeaturedOnly: boolean;
}

const ITEMS_PER_PAGE = 24;

// Enhanced series card component
function SeriesCard({ series, viewMode }: { series: SeriesWithStats; viewMode: "grid" | "list" }) {
	const coverImage = series.metadata?.coverImage as string;
	const franchise = series.franchise || "Standalone";
	const yearSpan = series.firstYear && series.lastYear
		? series.firstYear === series.lastYear
			? series.firstYear.toString()
			: `${series.firstYear}-${series.lastYear}`
		: "Unknown";

	if (viewMode === "list") {
		return (
			<Card
				component={Link}
				href={`/series/${series.id}`}
				p="md"
				radius="md"
				withBorder={true}
				className={seriesCard}
			>
				<Flex gap="md" align="center">
					<Box w={80} h={80} className={seriesImage}>
						<Image
							src={coverImage || `https://via.placeholder.com/200x100/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(series))}`}
							alt={getNodeDisplayName(series)}
							fit="cover"
							radius="sm"
							fallbackSrc="https://via.placeholder.com/200x100/e0e0e0/999999?text=Series"
						/>
					</Box>
					<Box flex={1}>
						<Group justify="space-between" mb="xs">
							<Title order={4}>{getNodeDisplayName(series)}</Title>
							<Group gap="xs">
								<Badge variant="light" color="blue" size="sm">
									{series.itemCount} items
								</Badge>
								{franchise !== "Standalone" && (
									<Badge variant="outline" size="sm">
										{franchise}
									</Badge>
								)}
							</Group>
						</Group>
						{series.description && (
							<Text size="sm" c="dimmed" lineClamp={2} mb="xs">
								{series.description}
							</Text>
						)}
						<Group gap="md">
							<Group gap={4}>
								<IconCalendar size={14} />
								<Text size="xs" c="dimmed">{yearSpan}</Text>
							</Group>
							{series.averagePrice && (
								<Group gap={4}>
									<Text size="xs" c="dimmed">¥{series.averagePrice.toLocaleString()}</Text>
								</Group>
							)}
							{series.popularGrades && series.popularGrades.length > 0 && (
								<Group gap={4}>
									{series.popularGrades.slice(0, 3).map(grade => (
										<Badge key={grade} variant="light" size="xs">
											{grade}
										</Badge>
									))}
								</Group>
							)}
						</Group>
					</Box>
				</Flex>
			</Card>
		);
	}

	return (
		<Card
			component={Link}
			href={`/series/${series.id}`}
			p="md"
			radius="md"
			className={seriesCard}
			withBorder={true}
		>
			<Stack gap="md">
				<Box h={120} className={seriesImage}>
					<Image
						src={coverImage || `https://via.placeholder.com/200x120/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(series))}`}
						alt={getNodeDisplayName(series)}
						fit="cover"
						radius="sm"
						fallbackSrc="https://via.placeholder.com/200x120/e0e0e0/999999?text=Series"
					/>
				</Box>
				<div>
					<Text size="sm" fw={600} lineClamp={2} mb="xs">
						{getNodeDisplayName(series)}
					</Text>
					{series.description && (
						<Text size="xs" c="dimmed" lineClamp={2} mb="xs">
							{series.description}
						</Text>
					)}
					<Group justify="space-between" mt="xs">
						<Badge variant="light" color="blue" size="sm">
							{series.itemCount} items
						</Badge>
						<Group gap={4}>
							<IconCalendar size={12} />
							<Text size="xs" c="dimmed">{yearSpan}</Text>
						</Group>
					</Group>
					{franchise !== "Standalone" && (
						<Badge variant="outline" size="xs" mt="xs">
							{franchise}
						</Badge>
					)}
				</div>
			</Stack>
		</Card>
	);
}

// Featured series section
function FeaturedSeries({ series }: { series: SeriesWithStats[] }) {
	if (series.length === 0) return null;

	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Group mb="md">
				<IconStar color="var(--mantine-color-yellow-6)" />
				<Title order={3}>Featured Series</Title>
			</Group>
			<SimpleGrid
				cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
				spacing="md"
			>
				{series.map((seriesItem) => (
					<SeriesCard key={seriesItem.id} series={seriesItem} viewMode="grid" />
				))}
			</SimpleGrid>
		</Card>
	);
}

// Series era timeline
function SeriesTimeline({ series }: { series: SeriesWithStats[] }) {
	const eraGroups = useMemo(() => {
		const groups = new Map<string, SeriesWithStats[]>();

		series.forEach(s => {
			let era = "Unknown Era";
			if (s.firstYear) {
				if (s.firstYear < 1980) era = "Classic Era (< 1980)";
				else if (s.firstYear < 1990) era = "80s Era (1980-1989)";
				else if (s.firstYear < 2000) era = "90s Era (1990-1999)";
				else if (s.firstYear < 2010) era = "2000s Era (2000-2009)";
				else if (s.firstYear < 2020) era = "2010s Era (2010-2019)";
				else era = "2020s Era (2020+)";
			}

			if (!groups.has(era)) groups.set(era, []);
			groups.get(era)!.push(s);
		});

		return Array.from(groups.entries()).sort((a, b) => {
			const aYear = a[1][0]?.firstYear || 9999;
			const bYear = b[1][0]?.firstYear || 9999;
			return bYear - aYear;
		});
	}, [series]);

	if (eraGroups.length === 0) return null;

	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Group mb="md">
				<IconClock />
				<Title order={3}>Series Timeline</Title>
			</Group>
			<Stack gap="lg">
				{eraGroups.map(([era, eraSeries]) => (
					<Box key={era}>
						<Group mb="sm">
							<Divider w="100%" />
							<Text size="lg" fw={600}>{era}</Text>
							<Badge variant="light">{eraSeries.length} series</Badge>
						</Group>
						<SimpleGrid
							cols={{ base: 2, sm: 3, md: 4, lg: 5 }}
							spacing="sm"
						>
							{eraSeries.slice(0, 5).map((seriesItem) => (
								<Anchor
									key={seriesItem.id}
									href={`/series/${seriesItem.id}`}
									size="sm"
									lineClamp={1}
								>
									{getNodeDisplayName(seriesItem)}
								</Anchor>
							))}
						</SimpleGrid>
						{eraSeries.length > 5 && (
							<Text size="xs" c="dimmed" mt="xs">
								+{eraSeries.length - 5} more series
							</Text>
						)}
					</Box>
				))}
			</Stack>
		</Card>
	);
}

export default function SeriesPage() {
	const [series, setSeries] = useState<SeriesWithStats[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);
	const [filters, setFilters] = useState<SeriesFilters>({
		sortBy: "name",
		sortOrder: "asc",
		viewMode: "grid",
		showFeaturedOnly: false,
	});

	// Load data
	useEffect(() => {
		const loadData = async () => {
			try {
				const [seriesData, itemsData] = await Promise.all([getAllSeries(), getAllItems()]);

				const validSeries = seriesData.filter(isBaseNode);
				const validItems = itemsData.filter(isBaseNode);

				// Count items per series and gather statistics
				const seriesStats = new Map<string, {
					count: number;
					firstYear: number;
					lastYear: number;
					totalPrice: number;
					priceCount: number;
					grades: Set<string>;
					items: any[];
				}>();

				for (const item of validItems) {
					if (item.type === "item" && "series" in item && typeof item.series === "string") {
						if (!seriesStats.has(item.series)) {
							seriesStats.set(item.series, {
								count: 0,
								firstYear: 9999,
								lastYear: 0,
								totalPrice: 0,
								priceCount: 0,
								grades: new Set(),
								items: [],
							});
						}

						const stats = seriesStats.get(item.series)!;
						stats.count++;
						stats.items.push(item);

						// Track years
						const year = item.releaseDate?.year;
						if (year) {
							stats.firstYear = Math.min(stats.firstYear, year);
							stats.lastYear = Math.max(stats.lastYear, year);
						}

						// Track prices
						const price = item.price?.amount;
						if (price) {
							stats.totalPrice += price;
							stats.priceCount++;
						}

						// Track grades
						if (item.grade) {
							stats.grades.add(item.grade);
						}
					}
				}

				// Attach statistics to series
				const seriesWithStats: SeriesWithStats[] = validSeries.map(seriesItem => {
					const stats = seriesStats.get(seriesItem.id);
					return {
						...seriesItem,
						itemCount: stats?.count ?? 0,
						firstYear: stats?.firstYear && stats.firstYear !== 9999 ? stats.firstYear : undefined,
						lastYear: stats?.lastYear && stats.lastYear !== 0 ? stats.lastYear : undefined,
						averagePrice: stats && stats.priceCount > 0 ? stats.totalPrice / stats.priceCount : undefined,
						popularGrades: stats ? Array.from(stats.grades).slice(0, 3) : [],
						franchise: seriesItem.franchise,
						description: seriesItem.description,
					};
				});

				setSeries(seriesWithStats);
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error("Failed to load series:", errorMessage);
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
		const viewParam = url.searchParams.get("view");

		setSearchQuery(queryParam ?? "");
		setPage(pageParam ? Number.parseInt(pageParam, 10) : 1);
		setFilters(prev => ({
			...prev,
			sortBy: (sortParam as any) || "name",
			viewMode: (viewParam as any) || "grid",
		}));
	}, []);

	// Update URL when params change
	const updateUrl = (newPage?: number, newQuery?: string, newSort?: string, newView?: string) => {
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
		if (newSort !== undefined) {
			url.searchParams.set("sort", newSort);
		}
		if (newView !== undefined) {
			url.searchParams.set("view", newView);
		}

		globalThis.history.pushState({}, "", url.toString());
	};

	// Filter and sort series
	const processedSeries = useMemo(() => {
		let filtered = [...series];

		// Apply search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(seriesItem =>
				getNodeDisplayName(seriesItem).toLowerCase().includes(query) ||
				seriesItem.description?.toLowerCase().includes(query) ||
				seriesItem.franchise?.toLowerCase().includes(query)
			);
		}

		// Apply year filter
		if (filters.yearFilter) {
			const year = Number.parseInt(filters.yearFilter, 10);
			if (!Number.isNaN(year)) {
				filtered = filtered.filter(s =>
					s.firstYear && s.firstYear <= year && (!s.lastYear || s.lastYear >= year)
				);
			}
		}

		// Apply franchise filter
		if (filters.franchiseFilter && filters.franchiseFilter !== "all") {
			filtered = filtered.filter(s => s.franchise === filters.franchiseFilter);
		}

		// Apply minimum items filter
		if (filters.minItems) {
			filtered = filtered.filter(s => s.itemCount >= filters.minItems);
		}

		// Apply featured only filter
		if (filters.showFeaturedOnly) {
			filtered = filtered.filter(s => s.itemCount >= 10);
		}

		// Apply sorting
		filtered.sort((a, b) => {
			let comparison = 0;
			switch (filters.sortBy) {
				case "name":
					comparison = getNodeDisplayName(a).localeCompare(getNodeDisplayName(b));
					break;
				case "itemCount":
					comparison = a.itemCount - b.itemCount;
					break;
				case "year":
					comparison = (a.firstYear || 0) - (b.firstYear || 0);
					break;
				case "popularity":
					comparison = a.itemCount - b.itemCount;
					break;
			}
			return filters.sortOrder === "desc" ? -comparison : comparison;
		});

		return filtered;
	}, [series, searchQuery, filters]);

	// Get featured series (top by item count)
	const featuredSeries = useMemo(() => {
		return processedSeries
			.filter(s => s.itemCount >= 5)
			.sort((a, b) => b.itemCount - a.itemCount)
			.slice(0, 8);
	}, [processedSeries]);

	// Get available franchises
	const availableFranchises = useMemo(() => {
		const franchises = new Set<string>();
		series.forEach(s => s.franchise && franchises.add(s.franchise));
		return Array.from(franchises).sort();
	}, [series]);

	// Get available years
	const availableYears = useMemo(() => {
		const years = new Set<number>();
		series.forEach(s => {
			if (s.firstYear) years.add(s.firstYear);
			if (s.lastYear) years.add(s.lastYear);
		});
		return Array.from(years).sort().reverse();
	}, [series]);

	const total = processedSeries.length;
	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
	const startIndex = (page - 1) * ITEMS_PER_PAGE;
	const paginatedSeries = processedSeries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	// Event handlers
	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		setPage(1);
		updateUrl(1, value);
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
		updateUrl(newPage);
	};

	const handleSortChange = (value: string) => {
		const sortBy = value as SeriesFilters["sortBy"];
		setFilters(prev => ({ ...prev, sortBy }));
		updateUrl(undefined, undefined, sortBy);
	};

	const handleSortOrderToggle = () => {
		const sortOrder = filters.sortOrder === "asc" ? "desc" : "asc";
		setFilters(prev => ({ ...prev, sortOrder }));
	};

	const handleViewModeChange = (value: string) => {
		const viewMode = value as SeriesFilters["viewMode"];
		setFilters(prev => ({ ...prev, viewMode }));
		updateUrl(undefined, undefined, undefined, viewMode);
	};

	const handleClearFilters = () => {
		setSearchQuery("");
		setPage(1);
		setFilters({
			sortBy: "name",
			sortOrder: "asc",
			viewMode: filters.viewMode,
			showFeaturedOnly: false,
		});
		updateUrl(1, "");
	};

	const activeFiltersCount = [
		searchQuery,
		filters.yearFilter,
		filters.franchiseFilter && filters.franchiseFilter !== "all",
		filters.minItems,
		filters.showFeaturedOnly,
	].filter(Boolean).length;

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
					<Anchor href="/series" size="sm">
						Series
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Series Explorer
					</Title>
					<Text size="lg" c="dimmed">
						{loading ? "Loading..." : `Explore ${total.toLocaleString()} series across ${availableFranchises.length} franchises`}
					</Text>
				</Box>

				{/* Featured Series */}
				{!loading && !searchQuery && page === 1 && featuredSeries.length > 0 && (
					<FeaturedSeries series={featuredSeries} />
				)}

				{/* Search and Filters */}
				<Card p="lg" radius="md" withBorder={true}>
					<Stack gap="md">
						<Group justify="space-between" align="center">
							<TextInput
								leftSection={<IconSearch size={16} />}
								placeholder="Search series, franchises, or descriptions..."
								value={searchQuery}
								onChange={(e) => { handleSearchChange(e.target.value); }}
								style={{ flex: 1 }}
							/>
							<Group gap="xs">
								<Radio.Group
									value={filters.viewMode}
									onChange={handleViewModeChange}
								>
									<Group gap="xs">
										<Radio value="grid" label={<IconGrid size={16} />} />
										<Radio value="list" label={<IconList size={16} />} />
									</Group>
								</Radio.Group>
							</Group>
						</Group>

						<Grid>
							<Grid.Col span={{ base: 12, md: 3 }}>
								<Select
									leftSection={<IconSortAscending size={16} />}
									placeholder="Sort by"
									data={[
										{ value: "name", label: "Name" },
										{ value: "itemCount", label: "Items Count" },
										{ value: "year", label: "First Year" },
										{ value: "popularity", label: "Popularity" },
									]}
									value={filters.sortBy}
									onChange={handleSortChange}
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 12, md: 3 }}>
								<Select
									leftSection={<IconCalendar size={16} />}
									placeholder="Filter by year"
									clearable
									data={[
										{ value: "", label: "All Years" },
										...availableYears.map(year => ({
											value: year.toString(),
											label: year.toString(),
										})),
									]}
									value={filters.yearFilter || ""}
									onChange={(value) => setFilters(prev => ({ ...prev, yearFilter: value || undefined }))}
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 12, md: 3 }}>
								<Select
									leftSection={<IconHash size={16} />}
									placeholder="Filter by franchise"
									clearable
									data={[
										{ value: "all", label: "All Franchises" },
										...availableFranchises.map(franchise => ({
											value: franchise,
											label: franchise,
										})),
									]}
									value={filters.franchiseFilter || "all"}
									onChange={(value) => setFilters(prev => ({ ...prev, franchiseFilter: value || undefined }))}
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 12, md: 3 }}>
								<Group gap="xs">
									<Switch
										label="Featured only"
										size="sm"
										checked={filters.showFeaturedOnly}
										onChange={(e) => setFilters(prev => ({
											...prev,
											showFeaturedOnly: e.currentTarget.checked
										}))}
									/>
								</Group>
							</Grid.Col>
						</Grid>

						{activeFiltersCount > 0 && (
							<Group>
								<Button
									variant="light"
									size="xs"
									onClick={handleClearFilters}
								>
									Clear {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""}
								</Button>
								<Button
									variant="subtle"
									size="xs"
									leftSection={
										filters.sortOrder === "asc" ?
											<IconSortAscending size={14} /> :
											<IconSortDescending size={14} />
									}
									onClick={handleSortOrderToggle}
								>
									{filters.sortOrder === "asc" ? "Ascending" : "Descending"}
								</Button>
							</Group>
						)}
					</Stack>
				</Card>

				{/* Series Timeline */}
				{!loading && !searchQuery && page === 1 && (
					<SeriesTimeline series={processedSeries.slice(0, 50)} />
				)}

				{/* Results */}
				<Box>
					<Group justify="space-between" mb="md">
						<Text size="sm" c="dimmed">
							Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)}-{Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()} series
						</Text>
						{searchQuery && (
							<Anchor size="sm" onClick={() => handleSearchChange("")}>
								Clear Search
							</Anchor>
						)}
					</Group>

					{loading ? (
						<Text ta="center" c="dimmed">
							Loading series...
						</Text>
					) : paginatedSeries.length > 0 ? (
						<SimpleGrid
							cols={
								filters.viewMode === "grid"
									? { base: 1, sm: 2, md: 3, lg: 4, xl: 5 }
									: { base: 1 }
							}
							spacing="md"
						>
							{paginatedSeries.map((seriesItem) => (
								<SeriesCard
									key={seriesItem.id}
									series={seriesItem}
									viewMode={filters.viewMode}
								/>
							))}
						</SimpleGrid>
					) : (
						<Box ta="center" py="xl">
							<IconFolder size={64} color="var(--mantine-color-gray-4)" />
							<Title order={3} mt="md" mb="sm">
								{searchQuery ? "No series found" : "No series available"}
							</Title>
							<Text c="dimmed" mb="lg">
								{searchQuery
									? "Try adjusting your search terms or filters"
									: "There are no series in the database yet."
								}
							</Text>
							{searchQuery && (
								<Anchor onClick={() => handleSearchChange("")}>
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
						size="lg"
					/>
				)}
			</Stack>
		</Container>
	);
}