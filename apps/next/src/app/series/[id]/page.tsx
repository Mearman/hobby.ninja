"use client";

import {
	Anchor,
	Badge,
	Box,
	Breadcrumbs,
	Card,
	Container,
	Flex,
	Grid,
	Group,
	Image,
	Pagination,
	ScrollArea,
	SimpleGrid,
	Stack,
	Tabs,
	Text,
	Title,
} from "@mantine/core";
import {
	IconCalendar,
	IconClock,
	IconHome,
	IconList,
	IconPhoto,
	IconPriceTag,
	IconScale,
	IconTag,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useEffect, useState, useMemo } from "react";

import { getAllItems, getAllSeries, getSeriesById } from "@/lib/graph-data";
import { BaseNode, getNodeDisplayName, isBaseNode } from "@/lib/schemas";
import { itemCard, itemImage } from "@/styles/components.css";

// Define types locally
interface ItemWithDetails extends BaseNode {
	brand?: string;
	category?: string;
	series?: string;
	grade?: string;
	scale?: string;
	price?: { amount: number; currency: string };
	releaseDate?: { ja: string; year?: number; month?: number; day?: number };
	images?: any[];
}

interface SeriesWithDetails extends BaseNode {
	description?: string;
	franchise?: string;
	parentId?: string;
}

interface ItemFilters {
	sortBy: "name" | "grade" | "scale" | "price" | "year";
	sortOrder: "asc" | "desc";
	gradeFilter?: string;
	scaleFilter?: string;
	brandFilter?: string;
	categoryFilter?: string;
	viewMode: "grid" | "list";
}

const ITEMS_PER_PAGE = 24;

// Enhanced item card component
function ItemCard({ item, viewMode }: { item: ItemWithDetails; viewMode: "grid" | "list" }) {
	const primaryImage = item.images?.[0];
	const name = getNodeDisplayName(item);

	if (viewMode === "list") {
		return (
			<Card
				component={Link}
				href={`/item/${item.id}`}
				p="md"
				radius="md"
				withBorder={true}
				className={itemCard}
			>
				<Flex gap="md" align="center">
					<Box w={80} h={80} className={itemImage}>
						<Image
							src={primaryImage?.url || `https://via.placeholder.com/200x200/f5f5f5/666666?text=${encodeURIComponent(name)}`}
							alt={name}
							fit="cover"
							radius="sm"
							fallbackSrc="https://via.placeholder.com/200x200/e0e0e0/999999?text=Item"
						/>
					</Box>
					<Box flex={1}>
						<Title order={5} mb="xs">{name}</Title>
						<Group gap="xs" mb="xs">
							{item.grade && (
								<Badge variant="light" color="blue" size="xs">
									{item.grade}
								</Badge>
							)}
							{item.scale && (
								<Badge variant="light" color="green" size="xs">
									1/{item.scale}
								</Badge>
							)}
							{item.brand && (
								<Badge variant="outline" size="xs">
									{item.brand}
								</Badge>
							)}
						</Group>
						<Group gap="md">
							{item.price && (
								<Group gap={4}>
									<IconPriceTag size={12} />
									<Text size="xs" c="dimmed">
										¥{item.price.amount.toLocaleString()}
									</Text>
								</Group>
							)}
							{item.releaseDate?.year && (
								<Group gap={4}>
									<IconCalendar size={12} />
									<Text size="xs" c="dimmed">
										{item.releaseDate.year}
									</Text>
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
			href={`/item/${item.id}`}
			p="md"
			radius="md"
			withBorder={true}
			className={itemCard}
		>
			<Stack gap="md">
				<Box h={160} className={itemImage}>
					<Image
						src={primaryImage?.url || `https://via.placeholder.com/200x200/f5f5f5/666666?text=${encodeURIComponent(name)}`}
						alt={name}
						fit="cover"
						radius="sm"
						fallbackSrc="https://via.placeholder.com/200x200/e0e0e0/999999?text=Item"
					/>
				</Box>
				<div>
					<Text size="sm" fw={600} lineClamp={2} mb="xs">
						{name}
					</Text>
					<Group gap="xs" mb="xs">
						{item.grade && (
							<Badge variant="light" color="blue" size="xs">
								{item.grade}
							</Badge>
						)}
						{item.scale && (
							<Badge variant="light" color="green" size="xs">
								1/{item.scale}
							</Badge>
						)}
					</Group>
					<Group justify="space-between">
						{item.price && (
							<Text size="xs" c="dimmed">
								¥{item.price.amount.toLocaleString()}
							</Text>
						)}
						{item.releaseDate?.year && (
							<Text size="xs" c="dimmed">
								{item.releaseDate.year}
							</Text>
						)}
					</Group>
				</div>
			</Stack>
		</Card>
	);
}

export default function SeriesDetailPage({ params }: { params: { id: string } }) {
	const [series, setSeries] = useState<SeriesWithDetails | null>(null);
	const [items, setItems] = useState<ItemWithDetails[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [activeTab, setActiveTab] = useState<string | null>("items");
	const [filters, setFilters] = useState<ItemFilters>({
		sortBy: "name",
		sortOrder: "asc",
		viewMode: "grid",
	});

	// Load data
	useEffect(() => {
		const loadData = async () => {
			try {
				const [seriesData, itemsData] = await Promise.all([
					getSeriesById(params.id),
					getAllItems(),
				]);

				if (!seriesData) {
					setLoading(false);
					return;
				}

				const validItems = itemsData.filter(isBaseNode);
				const seriesItems = validItems
					.filter(item => item.type === "item" && "series" in item && item.series === params.id)
					.map(item => ({
						...item,
						brand: item.brand,
						category: item.category,
						series: item.series,
						grade: item.grade,
						scale: item.scale,
						price: item.price as any,
						releaseDate: item.releaseDate as any,
						images: item.images as any[],
					}));

				setSeries(seriesData);
				setItems(seriesItems);
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error("Failed to load series details:", errorMessage);
			} finally {
				setLoading(false);
			}
		};

		void loadData();
	}, [params.id]);

	// Handle URL params
	useEffect(() => {
		const url = new URL(globalThis.location.href);
		const pageParam = url.searchParams.get("page");
		const tabParam = url.searchParams.get("tab");
		const viewParam = url.searchParams.get("view");

		setPage(pageParam ? Number.parseInt(pageParam, 10) : 1);
		setActiveTab(tabParam || "items");
		if (viewParam) {
			setFilters(prev => ({ ...prev, viewMode: viewParam as "grid" | "list" }));
		}
	}, [params.id]);

	// Update URL when params change
	const updateUrl = (newPage?: number, newTab?: string, newView?: string) => {
		const url = new URL(globalThis.location.href);

		if (newPage !== undefined) {
			url.searchParams.set("page", newPage.toString());
		}
		if (newTab !== undefined) {
			if (newTab) {
				url.searchParams.set("tab", newTab);
			} else {
				url.searchParams.delete("tab");
			}
			url.searchParams.delete("page");
		}
		if (newView !== undefined) {
			url.searchParams.set("view", newView);
		}

		globalThis.history.pushState({}, "", url.toString());
	};

	// Filter and sort items
	const processedItems = useMemo(() => {
		let filtered = [...items];

		// Apply filters
		if (filters.gradeFilter) {
			filtered = filtered.filter(item => item.grade === filters.gradeFilter);
		}
		if (filters.scaleFilter) {
			filtered = filtered.filter(item => item.scale === filters.scaleFilter);
		}
		if (filters.brandFilter) {
			filtered = filtered.filter(item => item.brand === filters.brandFilter);
		}
		if (filters.categoryFilter) {
			filtered = filtered.filter(item => item.category === filters.categoryFilter);
		}

		// Apply sorting
		filtered.sort((a, b) => {
			let comparison = 0;
			switch (filters.sortBy) {
				case "name":
					comparison = getNodeDisplayName(a).localeCompare(getNodeDisplayName(b));
					break;
				case "grade":
					comparison = (a.grade || "").localeCompare(b.grade || "");
					break;
				case "scale":
					comparison = (a.scale || "").localeCompare(b.scale || "");
					break;
				case "price":
					comparison = (a.price?.amount || 0) - (b.price?.amount || 0);
					break;
				case "year":
					comparison = (a.releaseDate?.year || 0) - (b.releaseDate?.year || 0);
					break;
			}
			return filters.sortOrder === "desc" ? -comparison : comparison;
		});

		return filtered;
	}, [items, filters]);

	// Get unique values for filters
	const uniqueGrades = useMemo(() => {
		const grades = new Set(items.map(item => item.grade).filter(Boolean));
		return Array.from(grades).sort();
	}, [items]);

	const uniqueScales = useMemo(() => {
		const scales = new Set(items.map(item => item.scale).filter(Boolean));
		return Array.from(scales).sort();
	}, [items]);

	const uniqueBrands = useMemo(() => {
		const brands = new Set(items.map(item => item.brand).filter(Boolean));
		return Array.from(brands).sort();
	}, [items]);

	const uniqueCategories = useMemo(() => {
		const categories = new Set(items.map(item => item.category).filter(Boolean));
		return Array.from(categories).sort();
	}, [items]);

	// Calculate statistics
	const stats = useMemo(() => {
		const gradeDistribution = new Map<string, number>();
		const scaleDistribution = new Map<string, number>();
		const yearDistribution = new Map<number, number>();
		let totalPrice = 0;
		let priceCount = 0;

		items.forEach(item => {
			if (item.grade) {
				gradeDistribution.set(item.grade, (gradeDistribution.get(item.grade) || 0) + 1);
			}
			if (item.scale) {
				scaleDistribution.set(item.scale, (scaleDistribution.get(item.scale) || 0) + 1);
			}
			if (item.releaseDate?.year) {
				yearDistribution.set(item.releaseDate.year, (yearDistribution.get(item.releaseDate.year) || 0) + 1);
			}
			if (item.price?.amount) {
				totalPrice += item.price.amount;
				priceCount++;
			}
		});

		return {
			totalItems: items.length,
			gradeDistribution: Array.from(gradeDistribution.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5),
			scaleDistribution: Array.from(scaleDistribution.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5),
			yearRange: items.length > 0 ? {
				first: Math.min(...items.map(item => item.releaseDate?.year || 9999)),
				last: Math.max(...items.map(item => item.releaseDate?.year || 0)),
			} : null,
			averagePrice: priceCount > 0 ? totalPrice / priceCount : null,
		};
	}, [items]);

	const total = processedItems.length;
	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
	const startIndex = (page - 1) * ITEMS_PER_PAGE;
	const paginatedItems = processedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	// Event handlers
	const handlePageChange = (newPage: number) => {
		setPage(newPage);
		updateUrl(newPage);
	};

	const handleTabChange = (value: string | null) => {
		setActiveTab(value);
		setPage(1);
		updateUrl(undefined, value || undefined);
	};

	const handleViewModeChange = (value: string) => {
		setFilters(prev => ({ ...prev, viewMode: value as "grid" | "list" }));
		updateUrl(undefined, undefined, value);
	};

	const handleSortChange = (value: string) => {
		setFilters(prev => ({ ...prev, sortBy: value as ItemFilters["sortBy"] }));
	};

	const handleFilterChange = (filterType: string, value: string) => {
		setFilters(prev => ({ ...prev, [filterType]: value }));
		setPage(1);
	};

	if (loading) {
		return (
			<Container size="xl" py="xl">
				<Text ta="center" c="dimmed">
					Loading series details...
				</Text>
			</Container>
		);
	}

	if (!series) {
		return (
			<Container size="xl" py="xl">
				<Box ta="center" py="xl">
					<Title order={2} mb="sm">Series Not Found</Title>
					<Text c="dimmed" mb="lg">
						The series you're looking for doesn't exist or has been removed.
					</Text>
					<Anchor href="/series">
						Browse All Series
					</Anchor>
				</Box>
			</Container>
		);
	}

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
					<Text size="sm">{getNodeDisplayName(series)}</Text>
				</Breadcrumbs>

				{/* Series Header */}
				<Card p="lg" radius="md" withBorder={true}>
					<Grid>
						<Grid.Col span={{ base: 12, md: 8 }}>
							<Stack gap="md">
								<Title order={1}>{getNodeDisplayName(series)}</Title>
								{series.description && (
									<Text size="lg" c="dimmed" lineClamp={3}>
										{series.description}
									</Text>
								)}
								<Group gap="xs">
									{series.franchise && (
										<Badge variant="light" size="lg">
											{series.franchise}
										</Badge>
									)}
									<Badge variant="outline" size="lg">
										{stats.totalItems} items
									</Badge>
									{stats.yearRange && (
										<Badge variant="light" color="blue" size="lg">
											{stats.yearRange.first} - {stats.yearRange.last}
										</Badge>
									)}
								</Group>
							</Stack>
						</Grid.Col>
						<Grid.Col span={{ base: 12, md: 4 }}>
							{series.metadata?.coverImage && (
								<Image
									src={series.metadata.coverImage as string}
									alt={getNodeDisplayName(series)}
									height={200}
									radius="md"
									fit="cover"
								/>
							)}
						</Grid.Col>
					</Grid>
				</Card>

				{/* Tabs */}
				<Tabs value={activeTab} onChange={handleTabChange}>
					<Tabs.List>
						<Tabs.Tab value="items" leftSection={<IconList size={16} />}>
							Items ({stats.totalItems})
						</Tabs.Tab>
						<Tabs.Tab value="stats" leftSection={<IconPriceTag size={16} />}>
							Statistics
						</Tabs.Tab>
						<Tabs.Tab value="timeline" leftSection={<IconClock size={16} />}>
							Timeline
						</Tabs.Tab>
					</Tabs.List>

					<Tabs.Panel value="items" pt="lg">
						<Card p="lg" radius="md" withBorder={true}>
							<Stack gap="md">
								<Grid>
									<Grid.Col span={{ base: 6, md: 2 }}>
										<TextInput
											label="Sort by"
											data={[
												{ value: "name", label: "Name" },
												{ value: "grade", label: "Grade" },
												{ value: "scale", label: "Scale" },
												{ value: "price", label: "Price" },
												{ value: "year", label: "Year" },
											]}
											value={filters.sortBy}
											onChange={(e) => handleSortChange(e.target.value)}
										/>
									</Grid.Col>
									<Grid.Col span={{ base: 6, md: 2 }}>
										<TextInput
											label="Grade"
											placeholder="All grades"
											data={[
												{ value: "", label: "All grades" },
												...uniqueGrades.map(grade => ({
													value: grade,
													label: grade,
												})),
											]}
											value={filters.gradeFilter || ""}
											onChange={(e) => handleFilterChange("gradeFilter", e.target.value)}
										/>
									</Grid.Col>
									<Grid.Col span={{ base: 6, md: 2 }}>
										<TextInput
											label="Scale"
											placeholder="All scales"
											data={[
												{ value: "", label: "All scales" },
												...uniqueScales.map(scale => ({
													value: scale,
													label: `1/${scale}`,
												})),
											]}
											value={filters.scaleFilter || ""}
											onChange={(e) => handleFilterChange("scaleFilter", e.target.value)}
										/>
									</Grid.Col>
								</Grid>

								<Group justify="flex-end">
									<Radio.Group
										value={filters.viewMode}
										onChange={handleViewModeChange}
									>
										<Group gap="xs">
											<Radio value="grid" label="Grid" />
											<Radio value="list" label="List" />
										</Group>
									</Radio.Group>
								</Group>

								{paginatedItems.length > 0 ? (
									<>
										<SimpleGrid
											cols={
												filters.viewMode === "grid"
													? { base: 2, sm: 3, md: 4, lg: 5, xl: 6 }
													: { base: 1 }
											}
											spacing="md"
										>
											{paginatedItems.map((item) => (
												<ItemCard
													key={item.id}
													item={item}
													viewMode={filters.viewMode}
												/>
											))}
										</SimpleGrid>
										{totalPages > 1 && (
											<Pagination
												total={totalPages}
												value={page}
												onChange={handlePageChange}
												siblings={1}
												boundaries={2}
											/>
										)}
									</>
								) : (
									<Box ta="center" py="xl">
										<IconPhoto size={64} color="var(--mantine-color-gray-4)" />
										<Title order={3} mt="md" mb="sm">
											No items found
										</Title>
										<Text c="dimmed">
											Try adjusting your filters to see more items.
										</Text>
									</Box>
								)}
							</Stack>
						</Card>
					</Tabs.Panel>

					<Tabs.Panel value="stats" pt="lg">
						<Grid>
							<Grid.Col span={{ base: 12, md: 6 }}>
								<Card p="lg" radius="md" withBorder={true}>
									<Title order={3} mb="md">Top Grades</Title>
									<Stack gap="sm">
										{stats.gradeDistribution.map(([grade, count]) => (
											<Group key={grade} justify="space-between">
												<Badge variant="light">{grade}</Badge>
												<Text size="sm">{count} items</Text>
											</Group>
										))}
									</Stack>
								</Card>
							</Grid.Col>
							<Grid.Col span={{ base: 12, md: 6 }}>
								<Card p="lg" radius="md" withBorder={true}>
									<Title order={3} mb="md">Top Scales</Title>
									<Stack gap="sm">
										{stats.scaleDistribution.map(([scale, count]) => (
											<Group key={scale} justify="space-between">
												<Badge variant="light" color="green">1/{scale}</Badge>
												<Text size="sm">{count} items</Text>
											</Group>
										))}
									</Stack>
								</Card>
							</Grid.Col>
							{stats.averagePrice && (
								<Grid.Col span={{ base: 12 }}>
									<Card p="lg" radius="md" withBorder={true}>
										<Title order={3} mb="md">Price Information</Title>
										<Text size="lg">
											Average Price: ¥{stats.averagePrice.toLocaleString()}
										</Text>
									</Card>
								</Grid.Col>
							)}
						</Grid>
					</Tabs.Panel>

					<Tabs.Panel value="timeline" pt="lg">
						<Card p="lg" radius="md" withBorder={true}>
							<Title order={3} mb="md">Release Timeline</Title>
							{stats.yearRange ? (
								<Text>
									This series ran from {stats.yearRange.first} to {stats.yearRange.last}
								</Text>
							) : (
								<Text c="dimmed">No year information available</Text>
							)}
						</Card>
					</Tabs.Panel>
				</Tabs>
			</Stack>
		</Container>
	);
}