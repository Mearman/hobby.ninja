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
	Group,
	Image,
	Menu,
	MultiSelect,
	Pagination,
	Radio,
	ScrollArea,
	Select,
	SegmentedControl,
	SimpleGrid,
	Stack,
	Switch,
	Text,
	TextInput,
	Title,
	Tooltip,
	UnstyledButton,
} from "@mantine/core";
import {
	IconAdjustmentsHorizontal,
	IconArrowBarToLeft,
	IconArrowBarToRight,
	IconChevronDown,
	IconComparison,
	IconDownload,
	IconGrid3x3,
	IconHome,
	IconList,
	IconPlus,
	IconSearch,
	IconSortAscending,
	IconSortDescending,
	IconStar,
	IconStarFilled,
	IconTags,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useEffect, useState, useMemo } from "react";

import { getAllBrands, getAllItems, getStaticData } from "@/lib/graph-data";
import { brandLogo, categoryCard } from "@/styles/components.css";

// Types
interface Brand {
	id: string;
	type: string;
	name: string | { ja: string; en?: string };
	country?: string;
	founded?: string | number;
	website?: string;
	description?: string;
	url?: string;
	metadata?: Record<string, unknown>;
}

interface Item {
	id: string;
	type: string;
	name: string | { ja: string; en?: string };
	brand?: string;
	price?: {
		amount: number;
		currency: string;
	};
	releaseDate?: {
		ja: string;
		year?: number;
	};
	grade?: string;
	scale?: string;
	category?: string;
	series?: string;
	tags?: string[];
}

interface BrandWithStats extends Brand {
	itemCount: number;
	averagePrice?: number;
	minPrice?: number;
	maxPrice?: number;
	priceCurrency?: string;
	grades: string[];
	scales: string[];
	categories: string[];
	series: string[];
	isFeatured?: boolean;
}

type BrandComparison = Record<string, BrandWithStats>;

const ITEMS_PER_PAGE = 24;

// Helper functions
const getDisplayName = (brand: Brand | BrandWithStats): string => {
	if (typeof brand.name === "string") return brand.name;
	const nameObj = brand.name as { ja: string; en?: string };
	return nameObj.en ?? nameObj.ja ?? brand.id;
};

const getCountryFlag = (country?: string): string => {
	if (!country) return "";
	const flags: Record<string, string> = {
		japan: "🇯🇵",
		china: "🇨🇳",
		korea: "🇰🇷",
		usa: "🇺🇸",
		taiwan: "🇹🇼",
	};
	return flags[country.toLowerCase()] || "";
};

// Enhanced Brand Card Component
function BrandCard({ brand, view = "grid", onCompareToggle, isComparing }: {
	brand: BrandWithStats;
	view?: "grid" | "list";
	onCompareToggle?: (brand: BrandWithStats) => void;
	isComparing?: boolean;
}) {
	const cardContent = (
		<Stack gap={view === "grid" ? "md" : "xs"}>
			<Group justify="space-between" align="flex-start">
				<Group gap="sm">
					<Box w={view === "grid" ? 80 : 60} h={view === "grid" ? 80 : 60}>
						<Image
							src={`https://via.placeholder.com/${view === "grid" ? 80 : 60}x${view === "grid" ? 80 : 60}/ffffff/666666?text=${encodeURIComponent(getDisplayName(brand).slice(0, 3))}`}
							alt={getDisplayName(brand)}
							fit="contain"
							radius="sm"
							fallbackSrc={`https://via.placeholder.com/${view === "grid" ? 80 : 60}x${view === "grid" ? 80 : 60}/f5f5f5/999999?text=${getDisplayName(brand).slice(0, 2)}`}
						/>
					</Box>
					<Stack gap="xs" flex={1}>
						<Text size={view === "grid" ? "md" : "lg"} fw={600} lineClamp={2}>
							{getDisplayName(brand)}
						</Text>
						<Group gap="xs">
							{brand.country && (
								<Text size="xs" c="dimmed">
									{getCountryFlag(brand.country)} {brand.country}
								</Text>
							)}
							{brand.founded && (
								<Text size="xs" c="dimmed">
									Est. {typeof brand.founded === "number" ? brand.founded : brand.founded}
								</Text>
							)}
						</Group>
					</Stack>
				</Group>

				{onCompareToggle && (
					<Tooltip label={isComparing ? "Remove from comparison" : "Add to comparison"}>
						<ActionIcon
							variant={isComparing ? "filled" : "light"}
							color={isComparing ? "blue" : "gray"}
							onClick={(e) => {
								e.preventDefault();
								onCompareToggle(brand);
							}}
						>
							<IconComparison size={14} />
						</ActionIcon>
					</Tooltip>
				)}
			</Group>

			{brand.description && view === "list" && (
				<Text size="sm" c="dimmed" lineClamp={2}>
					{brand.description}
				</Text>
			)}

			<Group gap="xs" wrap="wrap">
				<Badge variant="light" size="sm">
					{brand.itemCount} items
				</Badge>
				{brand.averagePrice && (
					<Badge variant="light" color="green" size="sm">
						{brand.priceCurrency === "JPY" ? "¥" : brand.priceCurrency || "$"}{brand.averagePrice.toFixed(0)} avg
					</Badge>
				)}
				{brand.isFeatured && (
					<Badge variant="light" color="yellow" size="sm">
						<IconStarFilled size={10} />
					</Badge>
				)}
			</Group>

			{view === "list" && brand.grades.length > 0 && (
				<Group gap="xs" wrap="wrap">
					{brand.grades.slice(0, 3).map((grade) => (
						<Badge key={grade} variant="outline" size="xs">
							{grade}
						</Badge>
					))}
					{brand.grades.length > 3 && (
						<Badge variant="outline" size="xs">
							+{brand.grades.length - 3} more
						</Badge>
					)}
				</Group>
			)}

			<Group justify="space-between" align="center">
				<Anchor
					component={Link}
					href={`/search?brand=${encodeURIComponent(brand.id)}`}
					size="sm"
					fw={500}
				>
					View all items
				</Anchor>
				{brand.website && (
					<Anchor
						href={brand.website}
						target="_blank"
						rel="noopener noreferrer"
						size="xs"
						c="dimmed"
					>
						Website
					</Anchor>
				)}
			</Group>
		</Stack>
	);

	return (
		<Card
			component={Link}
			href={`/search?brand=${encodeURIComponent(brand.id)}`}
			p={view === "grid" ? "md" : "sm"}
			radius="md"
			className={categoryCard}
			withBorder={true}
			style={{ textDecoration: "none", color: "inherit" }}
		>
			{cardContent}
		</Card>
	);
}

// Alphabet Navigation Component
function AlphabetNavigation({
	letters,
	selectedLetter,
	onLetterSelect,
}: {
	letters: string[];
	selectedLetter: string | null;
	onLetterSelect: (letter: string | null) => void;
}) {
	return (
		<Card p="sm" radius="md" withBorder={true}>
			<ScrollArea>
				<Group gap="xs">
					<UnstyledButton
						p="xs"
						radius="sm"
						bg={selectedLetter === null ? "blue" : "transparent"}
						c={selectedLetter === null ? "white" : "gray"}
						onClick={() => { onLetterSelect(null); }}
					>
						<Text size="sm" fw={500}>All</Text>
					</UnstyledButton>
					{letters.map((letter) => (
						<UnstyledButton
							key={letter}
							p="xs"
							radius="sm"
							bg={selectedLetter === letter ? "blue" : "transparent"}
							c={selectedLetter === letter ? "white" : "gray"}
							onClick={() => { onLetterSelect(letter); }}
						>
							<Text size="sm" fw={500}>{letter}</Text>
						</UnstyledButton>
					))}
				</Group>
			</ScrollArea>
		</Card>
	);
}

// Featured Brands Component
function FeaturedBrands({ brands }: { brands: BrandWithStats[] }) {
	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Group gap="sm" mb="md">
				<IconStarFilled size={20} color="var(--mantine-color-yellow-6)" />
				<Title order={3}>Featured Brands</Title>
			</Group>
			<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
				{brands.map((brand) => (
					<Card key={brand.id} p="sm" radius="md" withBorder={true} bg="var(--mantine-color-blue-0)">
						<BrandCard brand={brand} view="grid" />
					</Card>
				))}
			</SimpleGrid>
		</Card>
	);
}

// Brand Statistics Component
function BrandStatistics({ brands }: { brands: BrandWithStats[] }) {
	const stats = useMemo(() => {
		const totalItems = brands.reduce((sum, brand) => sum + brand.itemCount, 0);
		const avgItemsPerBrand = totalItems / brands.length;
		const topCountries = brands.reduce<Record<string, number>>((acc, brand) => {
			if (brand.country) {
				acc[brand.country] = (acc[brand.country] || 0) + 1;
			}
			return acc;
		}, {});

		const sortedCountries = Object.entries(topCountries)
			.sort(([,a], [,b]) => b - a)
			.slice(0, 5);

		return {
			totalBrands: brands.length,
			totalItems,
			avgItemsPerBrand,
			topCountries: sortedCountries,
		};
	}, [brands]);

	return (
		<SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Total Brands</Text>
				<Text size="xl" fw={700} mt="sm">{stats.totalBrands.toLocaleString()}</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Total Items</Text>
				<Text size="xl" fw={700} mt="sm">{stats.totalItems.toLocaleString()}</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Avg Items/Brand</Text>
				<Text size="xl" fw={700} mt="sm">{stats.avgItemsPerBrand.toFixed(1)}</Text>
			</Card>
			<Card p="lg" radius="md" withBorder={true}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={700}>Top Country</Text>
				<Text size="xl" fw={700} mt="sm">
					{stats.topCountries[0] ? `${getCountryFlag(stats.topCountries[0][0])} ${stats.topCountries[0][0]}` : "N/A"}
				</Text>
			</Card>
		</SimpleGrid>
	);
}

// Brand Comparison Component
function BrandComparisonPanel({
	comparison,
	onRemove,
	onClear,
}: {
	comparison: BrandComparison;
	onRemove: (brandId: string) => void;
	onClear: () => void;
}) {
	const brands = Object.values(comparison);

	if (brands.length === 0) return null;

	return (
		<Card p="lg" radius="md" withBorder={true} bg="var(--mantine-color-blue-0)">
			<Group justify="space-between" mb="md">
				<Group gap="sm">
					<IconComparison size={20} />
					<Title order={3}>Brand Comparison ({brands.length})</Title>
				</Group>
				<Button variant="light" size="sm" onClick={onClear}>
					Clear All
				</Button>
			</Group>

			<SimpleGrid cols={{ base: 1, sm: brands.length }} spacing="md">
				{brands.map((brand) => (
					<Card key={brand.id} p="md" radius="md" withBorder={true}>
						<Group justify="space-between" align="flex-start" mb="sm">
							<Text size="md" fw={600}>{getDisplayName(brand)}</Text>
							<ActionIcon
								variant="light"
								color="red"
								size="sm"
								onClick={() => { onRemove(brand.id); }}
							>
								<IconX size={14} />
							</ActionIcon>
						</Group>

						<Stack gap="xs" size="sm">
							<Text size="sm"><strong>Items:</strong> {brand.itemCount}</Text>
							{brand.averagePrice && (
								<Text size="sm">
									<strong>Avg Price:</strong> {brand.priceCurrency === "JPY" ? "¥" : brand.priceCurrency || "$"}{brand.averagePrice.toFixed(0)}
								</Text>
							)}
							{brand.country && (
								<Text size="sm"><strong>Country:</strong> {getCountryFlag(brand.country)} {brand.country}</Text>
							)}
							{brand.grades.length > 0 && (
								<Box>
									<Text size="sm" mb="xs"><strong>Grades:</strong></Text>
									<Group gap="xs" wrap="wrap">
										{brand.grades.map((grade) => (
											<Badge key={grade} variant="light" size="xs">
												{grade}
											</Badge>
										))}
									</Group>
								</Box>
							)}
						</Stack>
					</Card>
				))}
			</SimpleGrid>
		</Card>
	);
}

export default function BrandsPage() {
	const [brands, setBrands] = useState<BrandWithStats[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);
	const [view, setView] = useState<"grid" | "list">("grid");
	const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
	const [sortBy, setSortBy] = useState<"name" | "items" | "country">("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [showFilters, setShowFilters] = useState(false);
	const [comparison, setComparison] = useState<BrandComparison>({});

	// Load and process data
	useEffect(() => {
		const loadData = async () => {
			try {
				const [brandsData, itemsData] = await Promise.all([getAllBrands(), getAllItems()]);

				// Process brands with statistics
				const brandStats = new Map<string, {
					count: number;
					prices: number[];
					grades: Set<string>;
					scales: Set<string>;
					categories: Set<string>;
					series: Set<string>;
				}>();

				// Initialize stats map
				for (const brand of (brandsData as Brand[])) {
					brandStats.set(brand.id, {
						count: 0,
						prices: [],
						grades: new Set(),
						scales: new Set(),
						categories: new Set(),
						series: new Set(),
					});
				}

				// Collect statistics from items
				for (const item of (itemsData as Item[])) {
					if (item.type === "item" && item.brand) {
						const stats = brandStats.get(item.brand);
						if (stats) {
							stats.count++;
							if (item.price?.amount) {
								stats.prices.push(item.price.amount);
							}
							if (item.grade) stats.grades.add(item.grade);
							if (item.scale) stats.scales.add(item.scale);
							if (item.category) stats.categories.add(item.category);
							if (item.series) stats.series.add(item.series);
						}
					}
				}

				// Create brands with statistics
				const brandsWithStats = (brandsData as Brand[]).map(brand => {
					const stats = brandStats.get(brand.id) || {
						count: 0,
						prices: [],
						grades: new Set(),
						scales: new Set(),
						categories: new Set(),
						series: new Set(),
					};

					const prices = stats.prices.length > 0 ? stats.prices : [0];
					const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
					const minPrice = Math.min(...prices);
					const maxPrice = Math.max(...prices);

					// Determine if featured (top 20% by item count)
					const allCounts = [...brandStats.values()].map(s => s.count);
					const threshold = allCounts.sort((a, b) => b - a)[Math.floor(allCounts.length * 0.2)] || 0;

					return {
						...brand,
						itemCount: stats.count,
						averagePrice: averagePrice > 0 ? averagePrice : undefined,
						minPrice: minPrice > 0 ? minPrice : undefined,
						maxPrice: maxPrice > 0 ? maxPrice : undefined,
						priceCurrency: stats.prices.length > 0 ? "JPY" : undefined,
						grades: [...stats.grades],
						scales: [...stats.scales],
						categories: [...stats.categories],
						series: [...stats.series],
						isFeatured: stats.count >= threshold,
					};
				});

				setBrands(brandsWithStats);
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error("Failed to load brands:", errorMessage);
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
		const viewParam = url.searchParams.get("view");

		setSearchQuery(queryParam ?? "");
		setPage(pageParam ? Number.parseInt(pageParam, 10) : 1);
		if (viewParam === "list" || viewParam === "grid") {
			setView(viewParam);
		}
	}, []);

	// Update URL when params change
	const updateUrl = React.useCallback((newPage?: number, newQuery?: string, newView?: "grid" | "list") => {
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
		if (newView !== undefined) {
			url.searchParams.set("view", newView);
		}

		globalThis.history.pushState({}, "", url.toString());
	}, []);

	// Get available filter options
	const availableCountries = useMemo(() => {
		const countries = new Set<string>();
		for (const brand of brands) brand.country && countries.add(brand.country);
		return [...countries].sort();
	}, [brands]);

	const availableCategories = useMemo(() => {
		const categories = new Set<string>();
		for (const brand of brands) for (const cat of brand.categories) categories.add(cat);
		return [...categories].sort();
	}, [brands]);

	// Get alphabet letters
	const alphabetLetters = useMemo(() => {
		const letters = new Set<string>();
		for (const brand of brands) {
			const firstLetter = getDisplayName(brand).charAt(0).toUpperCase();
			if (/[A-Z]/.test(firstLetter)) {
				letters.add(firstLetter);
			}
		}
		return [...letters].sort();
	}, [brands]);

	// Filter and sort brands
	const filteredBrands = useMemo(() => {
		const filtered = brands.filter(brand => {
			// Search query
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				const name = getDisplayName(brand).toLowerCase();
				if (!name.includes(query) && brand.country?.toLowerCase().includes(query) === false) {
					return false;
				}
			}

			// Letter filter
			if (selectedLetter) {
				const firstLetter = getDisplayName(brand).charAt(0).toUpperCase();
				if (firstLetter !== selectedLetter) return false;
			}

			// Country filter
			if (selectedCountries.length > 0 && !brand.country) {
				return false;
			}
			if (selectedCountries.length > 0 && brand.country && !selectedCountries.includes(brand.country)) {
				return false;
			}

			// Category filter
			if (selectedCategories.length > 0) {
				const hasCategory = selectedCategories.some(cat => brand.categories.includes(cat));
				if (!hasCategory) return false;
			}

			return true;
		});

		// Sort
		filtered.sort((a, b) => {
			let aValue: string | number;
			let bValue: string | number;

			switch (sortBy) {
				case "items": {
					aValue = a.itemCount;
					bValue = b.itemCount;
					break;
				}
				case "country": {
					aValue = a.country || "";
					bValue = b.country || "";
					break;
				}
				default: {
					aValue = getDisplayName(a);
					bValue = getDisplayName(b);
				}
			}

			if (typeof aValue === "number" && typeof bValue === "number") {
				return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
			}

			const comparison = String(aValue).localeCompare(String(bValue));
			return sortOrder === "asc" ? comparison : -comparison;
		});

		return filtered;
	}, [brands, searchQuery, selectedLetter, selectedCountries, selectedCategories, sortBy, sortOrder]);

	// Get featured brands
	const featuredBrands = useMemo(() => {
		return brands.filter(brand => brand.isFeatured).slice(0, 8);
	}, [brands]);

	const total = filteredBrands.length;
	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
	const startIndex = (page - 1) * ITEMS_PER_PAGE;
	const paginatedBrands = filteredBrands.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	// Event handlers
	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		setPage(1);
		updateUrl(1, value, view);
	};

	const handleViewChange = (newView: "grid" | "list") => {
		setView(newView);
		updateUrl(page, searchQuery, newView);
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
		updateUrl(newPage, searchQuery, view);
	};

	const handleClearSearch = () => {
		setSearchQuery("");
		setPage(1);
		updateUrl(1, "", view);
	};

	const handleCompareToggle = (brand: BrandWithStats) => {
		setComparison(prev => {
			const newComparison = { ...prev };
			if (newComparison[brand.id]) {
				delete newComparison[brand.id];
			} else {
				newComparison[brand.id] = brand;
			}
			return newComparison;
		});
	};

	const handleCompareRemove = (brandId: string) => {
		setComparison(prev => {
			const newComparison = { ...prev };
			delete newComparison[brandId];
			return newComparison;
		});
	};

	const handleCompareClear = () => {
		setComparison({});
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
					<Anchor href="/brands" size="sm">
						Brands
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Brand Directory
					</Title>
					<Text size="lg" c="dimmed">
						{loading ? "Loading..." : `Explore ${total.toLocaleString()} manufacturers and brands in our database`}
					</Text>
				</Box>

				{/* Statistics */}
				{!loading && <BrandStatistics brands={brands} />}

				{/* Featured Brands */}
				{!loading && featuredBrands.length > 0 && <FeaturedBrands brands={featuredBrands} />}

				{/* Search and Filters */}
				<Card p="lg" radius="md" withBorder={true}>
					<Stack gap="md">
						<Group justify="space-between" align="center">
							<TextInput
								leftSection={<IconSearch size={16} />}
								placeholder="Search brands by name or country..."
								value={searchQuery}
								onChange={(e) => { handleSearchChange(e.target.value); }}
								style={{ flex: 1 }}
								rightSection={searchQuery && (
									<ActionIcon onClick={handleClearSearch} variant="transparent">
										<IconX size={14} />
									</ActionIcon>
								)}
							/>
							<Group gap="sm">
								<SegmentedControl
									value={view}
									onChange={handleViewChange}
									data={[
										{ label: <IconGrid3x3 size={16} />, value: "grid" },
										{ label: <IconList size={16} />, value: "list" },
									]}
									withItemsBorders={false}
								/>
								<Button
									variant={showFilters ? "filled" : "light"}
									leftSection={<IconAdjustmentsHorizontal size={14} />}
									onClick={() => { setShowFilters(!showFilters); }}
								>
									Filters
								</Button>
							</Group>
						</Group>

						{showFilters && (
							<>
								<Divider />
								<SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
									<Box>
										<Text size="sm" fw={600} mb="xs">Sort By</Text>
										<Select
											value={sortBy}
											onChange={(value: "name" | "items" | "country") => { setSortBy(value || "name"); }}
											data={[
												{ value: "name", label: "Name" },
												{ value: "items", label: "Item Count" },
												{ value: "country", label: "Country" },
											]}
											rightSection={
												<ActionIcon
													variant="transparent"
													onClick={() => { setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}
												>
													{sortOrder === "asc" ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />}
												</ActionIcon>
											}
										/>
									</Box>

									<Box>
										<Text size="sm" fw={600} mb="xs">Country</Text>
										<MultiSelect
											value={selectedCountries}
											onChange={setSelectedCountries}
											data={availableCountries.map(country => ({
												value: country,
												label: `${getCountryFlag(country)} ${country}`,
											}))}
											placeholder="Select countries..."
											clearable={true}
										/>
									</Box>

									<Box>
										<Text size="sm" fw={600} mb="xs">Categories</Text>
										<MultiSelect
											value={selectedCategories}
											onChange={setSelectedCategories}
											data={availableCategories}
											placeholder="Select categories..."
											clearable={true}
										/>
									</Box>
								</SimpleGrid>
							</>
						)}
					</Stack>
				</Card>

				{/* Alphabet Navigation */}
				{alphabetLetters.length > 0 && (
					<AlphabetNavigation
						letters={alphabetLetters}
						selectedLetter={selectedLetter}
						onLetterSelect={setSelectedLetter}
					/>
				)}

				{/* Brand Comparison */}
				{Object.keys(comparison).length > 0 && (
					<BrandComparisonPanel
						comparison={comparison}
						onRemove={handleCompareRemove}
						onClear={handleCompareClear}
					/>
				)}

				{/* Results Header */}
				<Group justify="space-between" align="center">
					<Text size="sm" c="dimmed">
						Showing {total === 0 ? 0 : Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)}-{Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()} brands
					</Text>
					<Group gap="sm">
						{(searchQuery || selectedLetter || selectedCountries.length > 0 || selectedCategories.length > 0) && (
							<Button variant="light" size="sm" onClick={() => {
								setSearchQuery("");
								setSelectedLetter(null);
								setSelectedCountries([]);
								setSelectedCategories([]);
								setPage(1);
								updateUrl(1, "", view);
							}}>
								Clear All Filters
							</Button>
						)}
					</Group>
				</Group>

				{/* Results */}
				{loading ? (
					<Box ta="center" py="xl">
						<Text c="dimmed">Loading brands...</Text>
					</Box>
				) : paginatedBrands.length > 0 ? (
					<SimpleGrid
						cols={view === "grid" ? { base: 2, sm: 3, md: 4, lg: 5 } : 1}
						spacing="md"
					>
						{paginatedBrands.map((brand) => (
							<BrandCard
								key={brand.id}
								brand={brand}
								view={view}
								onCompareToggle={handleCompareToggle}
								isComparing={Boolean(comparison[brand.id])}
							/>
						))}
					</SimpleGrid>
				) : (
					<Box ta="center" py="xl">
						<IconSearch size={64} color="var(--mantine-color-gray-4)" />
						<Title order={3} mt="md" mb="sm">
							No brands found
						</Title>
						<Text c="dimmed" mb="lg">
							Try adjusting your search terms or filters
						</Text>
						<Button onClick={() => {
							setSearchQuery("");
							setSelectedLetter(null);
							setSelectedCountries([]);
							setSelectedCategories([]);
							setPage(1);
							updateUrl(1, "", view);
						}}>
							Clear Filters
						</Button>
					</Box>
				)}

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