"use client";

import { Badge } from "@/components/ui/badge";

import {
	Anchor,
	// Badge removed,
	Box,
	Breadcrumbs,
	Card,
	Container,
	Group,
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
	IconTag,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";


import { getAllCategories, getAllItems } from "@/lib/graph-data";
import { getNodeDisplayName } from "@/lib/schemas";
import { categoryCard, categoryIcon } from "@/styles/components.css";

// Define types locally to avoid circular imports
interface Category {
	id: string;
	type: string;
	name: string | { ja: string; en?: string };
}

interface Item {
	id: string;
	type: string;
	name: string | { ja: string; en?: string };
	category?: string;
}

interface CategoryWithCount extends Category {
	itemCount: number;
}

const ITEMS_PER_PAGE = 24;

// Category card component
function CategoryCard({ category }: { category: CategoryWithCount }): JSX.Element {
	return (
		<Card
			component={Link}
			href={`/category/${category.id}`}
			p="lg"
			radius="md"
			className={categoryCard}
			withBorder={true}
		>
			<Stack align="center" gap="md">
				<div className={categoryIcon}>
					<IconTag size={32} />
				</div>
				<Text size="lg" fw={600} ta="center" lineClamp={2}>
					{getNodeDisplayName(category)}
				</Text>
				<Badge variant="light" size="sm">
					{category.itemCount} items
				</Badge>
			</Stack>
		</Card>
	);
}

export default function CategoriesPage() {
	const [categories, setCategories] = useState<CategoryWithCount[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);

	// Load data
	useEffect(() => {
		const loadData = async () => {
			try {
				const [categoriesData, itemsData] = await Promise.all([getAllCategories(), getAllItems()]);

				// Count items per category
				const categoryCounts = new Map<string, number>();
				for (const item of itemsData as Item[]) {
					if (item.type === "item" && item.category) {
						categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
					}
				}

				// Attach item counts to categories
				const categoriesWithCounts = (categoriesData as Category[]).map(category => ({
					...category,
					itemCount: categoryCounts.get(category.id) ?? 0,
				}));

				setCategories(categoriesWithCounts);
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				// eslint-disable-next-line no-console
				console.error("Failed to load categories:", errorMessage);
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
	const updateUrl = React.useCallback((newPage?: number, newQuery?: string) => {
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
	}, []);

	// Filter categories based on search
	const filteredCategories = React.useMemo(() => {
		if (!searchQuery) return categories;

		const query = searchQuery.toLowerCase();
		return categories.filter(category =>
			getNodeDisplayName(category).toLowerCase().includes(query),
		);
	}, [categories, searchQuery]);

	const total = filteredCategories.length;
	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
	const startIndex = (page - 1) * ITEMS_PER_PAGE;
	const paginatedCategories = filteredCategories.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
					<Anchor href="/categories" size="sm">
						Categories
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						All Categories
					</Title>
					<Text size="lg" c="dimmed">
						{loading ? "Loading..." : `Browse ${total.toLocaleString()} categories in our database`}
					</Text>
				</Box>

				{/* Search */}
				<Card p="lg" radius="md" withBorder={true}>
					<TextInput
						leftSection={<IconSearch size={16} />}
						placeholder="Search categories..."
						value={searchQuery}
						onChange={(e) => { handleSearchChange(e.target.value); }}
					/>
				</Card>

				{/* Results */}
				<Box>
					<Group justify="space-between" mb="md">
						<Text size="sm" c="dimmed">
							Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)}-{Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()} categories
						</Text>
						{searchQuery && (
							<Anchor size="sm" onClick={handleClearSearch}>
								Clear Search
							</Anchor>
						)}
					</Group>

					{loading ? (
						<Text ta="center" c="dimmed">
							Loading categories...
						</Text>
					) : paginatedCategories.length > 0 ? (
						<SimpleGrid
							cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
							spacing="md"
						>
							{paginatedCategories.map((category) => (
								<CategoryCard key={category.id} category={category} />
							))}
						</SimpleGrid>
					) : (
						<Box ta="center" py="xl">
							<IconFolder size={64} color="var(--mantine-color-gray-4)" />
							<Title order={3} mt="md" mb="sm">
								{searchQuery ? "No categories found" : "No categories available"}
							</Title>
							<Text c="dimmed" mb="lg">
								{searchQuery
									? "Try adjusting your search terms"
									: "There are no categories in the database yet."
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