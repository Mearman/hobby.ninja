"use client";

import {
	Anchor,
	Box,
	Breadcrumbs,
	Card,
	Container,
	Group,
	Image,
	Pagination,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import {
	IconFolder,
	IconHome,
	IconSearch,
	IconTrendingUp,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";


import { getAllItems, getAllSeries } from "@/lib/graph-data";
import { BaseNode, getNodeDisplayName, isBaseNode } from "@/lib/schemas";
import { seriesCard, seriesImage } from "@/styles/components.css";

// Define types locally to avoid circular imports
interface SeriesWithCount extends BaseNode {
	itemCount: number;
}

const ITEMS_PER_PAGE = 24;

// Series card component
function SeriesCard({ series }: { series: SeriesWithCount }) {
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
				<Box h={100} className={seriesImage}>
					<Image
						src={`https://via.placeholder.com/200x100/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(series))}`}
						alt={getNodeDisplayName(series)}
						fit="cover"
						radius="sm"
						fallbackSrc="https://via.placeholder.com/200x100/e0e0e0/999999?text=Series"
					/>
				</Box>
				<div>
					<Text size="md" fw={600} lineClamp={2}>
						{getNodeDisplayName(series)}
					</Text>
					{/* Badge variant="light" size="sm" mt={4}>
						{series.itemCount} items
					</Badge */}
				</div>
			</Stack>
		</Card>
	);
}

export default function SeriesPage() {
	const [series, setSeries] = useState<SeriesWithCount[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);

	// Load data
	useEffect(() => {
		const loadData = async () => {
			try {
				const [seriesData, itemsData] = await Promise.all([getAllSeries(), getAllItems()]);

				// Type guard to filter valid series and items
				const validSeries = seriesData.filter(isBaseNode);
				const validItems = itemsData.filter(isBaseNode);

				// Count items per series
				const seriesCounts = new Map<string, number>();
				for (const item of validItems) {
					if (item.type === "item" && "series" in item && typeof item.series === "string") {
						seriesCounts.set(item.series, (seriesCounts.get(item.series) ?? 0) + 1);
					}
				}

				// Attach item counts to series
				const seriesWithCounts: SeriesWithCount[] = validSeries.map(seriesItem => ({
					...seriesItem,
					itemCount: seriesCounts.get(seriesItem.id) ?? 0,
				}));

				setSeries(seriesWithCounts);
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

		setSearchQuery(queryParam ?? "");
		setPage(pageParam ? Number.parseInt(pageParam, 10) : 1);
	}, []);

	// Update URL when params change
	const updateUrl = (newPage?: number, newQuery?: string) => {
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

		globalThis.history.pushState({}, "", url.toString());
	};

	// Filter series based on search
	const filteredSeries = React.useMemo(() => {
		if (!searchQuery) return series;

		const query = searchQuery.toLowerCase();
		return series.filter(seriesItem =>
			getNodeDisplayName(seriesItem).toLowerCase().includes(query),
		);
	}, [series, searchQuery]);

	const total = filteredSeries.length;
	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
	const startIndex = (page - 1) * ITEMS_PER_PAGE;
	const paginatedSeries = filteredSeries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

	const handleClearSearch = () => {
		setSearchQuery("");
		setPage(1);
		updateUrl(1, "");
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
					<Anchor href="/series" size="sm">
						Series
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						All Series
					</Title>
					<Text size="lg" c="dimmed">
						{loading ? "Loading..." : `Browse ${total.toLocaleString()} series in our database`}
					</Text>
				</Box>

				{/* Search */}
				<Card p="lg" radius="md" withBorder={true}>
					<TextInput
						leftSection={<IconSearch size={16} />}
						placeholder="Search series..."
						value={searchQuery}
						onChange={(e) => { handleSearchChange(e.target.value); }}
					/>
				</Card>

				{/* Results */}
				<Box>
					<Group justify="space-between" mb="md">
						<Text size="sm" c="dimmed">
							Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)}-{Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()} series
						</Text>
						{searchQuery && (
							<Anchor size="sm" onClick={handleClearSearch}>
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
							cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
							spacing="md"
						>
							{paginatedSeries.map((seriesItem) => (
								<SeriesCard key={seriesItem.id} series={seriesItem} />
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
									? "Try adjusting your search terms"
									: "There are no series in the database yet."
								}
							</Text>
							{searchQuery && (
								<Anchor onClick={handleClearSearch}>
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
					/>
				)}
			</Stack>
		</Container>
	);
}