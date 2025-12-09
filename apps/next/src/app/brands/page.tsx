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
	Image,
	Box,
	Breadcrumbs,
	Anchor,
	Pagination,
	TextInput,
} from "@mantine/core";
import {
	IconSearch,
	IconHome,
	IconFolder,
	IconBox,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { getAllBrands, getAllItems } from "@/lib/graph-data";
import { getNodeDisplayName, BrandNode, ItemNode, isItemNode } from "@/lib/schemas";
import { PAGINATION } from "@/lib/constants";
import * as styles from "@/styles/components.css";

const ITEMS_PER_PAGE = 24;

// Brand card component
function BrandCard({ brand }: { brand: BrandNode & { itemCount: number } }) {
	return (
		<Card
			component={Link}
			href={`/brand/${brand.id}`}
			p="md"
			radius="md"
			className={styles.categoryCard}
			withBorder={true}
		>
			<Stack align="center" gap="md">
				<Box w={80} h={80} className={styles.brandLogo}>
					<Image
						src={`https://via.placeholder.com/80x80/ffffff/666666?text=${encodeURIComponent(getNodeDisplayName(brand))}`}
						alt={getNodeDisplayName(brand)}
						fit="contain"
						radius="sm"
						fallbackSrc="https://via.placeholder.com/80x80/f5f5f5/999999?text=Logo"
					/>
				</Box>
				<Text size="md" fw={600} ta="center" lineClamp={2}>
					{getNodeDisplayName(brand)}
				</Text>
				<Badge variant="light" size="sm">
					{brand.itemCount} items
				</Badge>
			</Stack>
		</Card>
	);
}

export default function BrandsPage() {
	const [brands, setBrands] = useState<(BrandNode & { itemCount: number })[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);

	// Load data
	useEffect(() => {
		const loadData = async () => {
			try {
				const [brandsData, itemsData] = await Promise.all([getAllBrands(), getAllItems()]);

				// Count items per brand
				const brandCounts = new Map<string, number>();
				itemsData.forEach(item => {
					if (isItemNode(item) && item.brand) {
						brandCounts.set(item.brand, (brandCounts.get(item.brand) || 0) + 1);
					}
				});

				// Attach item counts to brands
				const brandsWithCounts = brandsData.map(brand => ({
					...brand,
					itemCount: brandCounts.get(brand.id) || 0,
				}));

				setBrands(brandsWithCounts);
			} catch (error) {
				console.error("Failed to load brands:", error);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	// Handle URL params
	useEffect(() => {
		const url = new URL(window.location.href);
		const pageParam = url.searchParams.get("page");
		const queryParam = url.searchParams.get("q");

		setSearchQuery(queryParam || "");
		setPage(pageParam ? Number.parseInt(pageParam, 10) : 1);
	}, []);

	// Update URL when params change
	const updateUrl = (newPage?: number, newQuery?: string) => {
		const url = new URL(window.location.href);

		if (newPage !== undefined) {
			url.searchParams.set("page", newPage.toString());
		}
		if (newQuery !== undefined) {
			if (newQuery) {
				url.searchParams.set("q", newQuery);
			} else {
				url.searchParams.delete("q");
			}
			// Reset page when search changes
			url.searchParams.delete("page");
		}

		window.history.pushState({}, "", url.toString());
	};

	// Filter brands based on search
	const filteredBrands = React.useMemo(() => {
		if (!searchQuery) return brands;

		const query = searchQuery.toLowerCase();
		return brands.filter(brand =>
			getNodeDisplayName(brand).toLowerCase().includes(query)
		);
	}, [brands, searchQuery]);

	const total = filteredBrands.length;
	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
	const startIndex = (page - 1) * ITEMS_PER_PAGE;
	const paginatedBrands = filteredBrands.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
					<Anchor href="/brands" size="sm">
						Brands
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						All Brands
					</Title>
					<Text size="lg" c="dimmed">
						{loading ? "Loading..." : `Browse ${total.toLocaleString()} brands in our database`}
					</Text>
				</Box>

				{/* Search */}
				<Card p="lg" radius="md" withBorder={true}>
					<TextInput
						leftSection={<IconSearch size={16} />}
						placeholder="Search brands..."
						value={searchQuery}
						onChange={(e) => handleSearchChange(e.target.value)}
					/>
				</Card>

				{/* Results */}
				<Box>
					<Group justify="space-between" mb="md">
						<Text size="sm" c="dimmed">
							Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)}-{Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()} brands
						</Text>
						{searchQuery && (
							<Anchor size="sm" onClick={handleClearSearch}>
								Clear Search
							</Anchor>
						)}
					</Group>

					{loading ? (
						<Text ta="center" c="dimmed">
							Loading brands...
						</Text>
					) : paginatedBrands.length > 0 ? (
						<SimpleGrid
							cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
							spacing="md"
						>
							{paginatedBrands.map((brand) => (
								<BrandCard key={brand.id} brand={brand} />
							))}
						</SimpleGrid>
					) : (
						<Box ta="center" py="xl">
							<IconFolder size={64} color="var(--mantine-color-gray-4)" />
							<Title order={3} mt="md" mb="sm">
								{searchQuery ? "No brands found" : "No brands available"}
							</Title>
							<Text c="dimmed" mb="lg">
								{searchQuery
									? "Try adjusting your search terms"
									: "There are no brands in the database yet."
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