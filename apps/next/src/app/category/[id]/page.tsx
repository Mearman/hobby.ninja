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
	Breadcrumbs,
	Anchor,
	Pagination,
	TextInput,
	Select,
	Button,
	Skeleton,
} from "@mantine/core";
import {
	IconSearch,
	IconFilter,
	IconHome,
	IconFolder,
} from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";

import { getAllCategories, getAllItems } from "@/lib/graph-data";
import { generateCategoryParams } from "@/lib/data-loader";
import { getNodeDisplayName, isItemNode, CategoryNode, ItemNode } from "@/lib/schemas";
import { PAGINATION } from "@/lib/constants";
import {
	itemCard,
	itemCardImage,
	itemCardContent,
	itemCardTitle,
	itemCardSubtitle,
	itemCardMetadata,
	itemCardBadge,
} from "@/styles/components.css";

// Static data fetching
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; q?: string; sort?: string; brand?: string }>;
}



const getCategory = async (categoryId: string): Promise<CategoryNode | null> => {
	try {
		const categories = await getAllCategories();
		return categories.find(cat => cat.id === categoryId) ?? null;
	} catch {
		// Proper error handling without console logging
		return null;
	}
};

const getCategoryItems = async (
	categoryId: string,
	page = 1,
	limit = PAGINATION.ITEMS_PER_PAGE,
	searchQuery?: string,
	sortBy?: string,
	brandFilter?: string,
): Promise<{
	items: ItemNode[];
	total: number;
	category: CategoryNode | null;
}> => {
	try {
		const [items, category] = await Promise.all([
			getAllItems(),
			getCategory(categoryId),
		]);

		if (!category) {
			return { items: [], total: 0, category: null };
		}

		// Filter items by category
		let filteredItems = items.filter(item =>
			isItemNode(item) && item.category === categoryId,
		);

		// Apply search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filteredItems = filteredItems.filter(item => {
				if (!isItemNode(item)) return false;
				const name = getNodeDisplayName(item).toLowerCase();
				const brand = item.brand?.toLowerCase() ?? "";
				const series = item.series?.toLowerCase() ?? "";
				const grade = item.grade?.toLowerCase() ?? "";
				return name.includes(query) || brand.includes(query) || series.includes(query) || grade.includes(query);
			});
		}

		// Apply brand filter
		if (brandFilter) {
			filteredItems = filteredItems.filter(item =>
				isItemNode(item) && item.brand === brandFilter,
			);
		}

		// Apply sorting
		if (sortBy) {
			switch (sortBy) {
				case "name-asc": {
					filteredItems.sort((a, b) => getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)));
					break;
				}
				case "name-desc": {
					filteredItems.sort((a, b) => getNodeDisplayName(b).localeCompare(getNodeDisplayName(a)));
					break;
				}
				case "date-asc": {
					filteredItems.sort((a, b) => (a.created ?? "").localeCompare(b.created ?? ""));
					break;
				}
				case "date-desc": {
					filteredItems.sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""));
					break;
				}
				default: {
					// Default: keep original order
					break;
				}
			}
		}

		const total = filteredItems.length;
		const startIndex = (page - 1) * limit;
		const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);

		return {
			items: paginatedItems.filter(isItemNode),
			total,
			category,
		};
	} catch {
		// Proper error handling without console logging
		return { items: [], total: 0, category: null };
	}
};

const getAvailableBrands = async (categoryId: string): Promise<string[]> => {
	try {
		const items = await getAllItems();
		const brands = new Set<string>();

		for (const item of items.filter(item => isItemNode(item) && item.category === categoryId)) {
			if (item.brand && isItemNode(item)) {
				brands.add(item.brand);
			}
		}

		return [...brands].sort();
	} catch {
		// Proper error handling without console logging
		return [];
	}
};

// Item card component
function ItemCard({ item }: { item: ItemNode }) {
	if (!isItemNode(item)) return null;

	return (
		<Card
			component={Link}
			href={`/item/${item.id}`}
			p={0}
			radius="md"
			className={itemCard}
			withBorder={true}
		>
			<Box className={itemCardImage}>
				<Image
					src={`https://via.placeholder.com/280x200/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(item))}`}
					alt={getNodeDisplayName(item)}
					fit="cover"
					height={200}
					fallbackSrc="https://via.placeholder.com/280x200/e0e0e0/999999?text=No+Image"
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

// Loading skeleton component
function LoadingGrid() {
	return (
		<SimpleGrid
			cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
			spacing="md"
		>
			{Array.from({length: 12}).map((_, index) => (
				<Card key={index} p={0} radius="md" withBorder={true}>
					<Skeleton height={200} />
					<Box p="md">
						<Skeleton height={20} mb="xs" />
						<Skeleton height={16} mb="md" width="60%" />
						<Group gap="xs">
							<Skeleton width={40} height={20} radius="sm" />
							<Skeleton width={50} height={20} radius="sm" />
						</Group>
					</Box>
				</Card>
			))}
		</SimpleGrid>
	);
}

// Main page component
export default async function CategoryPage({ params, searchParams }: PageProps) {
	const { id } = await params;
	const { page: pageParam, q: searchQuery, sort: sortBy, brand } = await searchParams;

	const page = Number.parseInt(pageParam ?? "1", 10);
	const brandFilter = brand;

	const itemsData = await getCategoryItems(id, page, ITEMS_PER_PAGE, searchQuery, sortBy, brandFilter);
	const availableBrands = await getAvailableBrands(id);

	if (!itemsData.category) {
		notFound();
	}

	const totalPages = Math.ceil(itemsData.total / ITEMS_PER_PAGE);

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
					<Anchor href={`/category/${id}`} size="sm">
						{getNodeDisplayName(itemsData.category)}
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Group justify="space-between" align="flex-start">
						<Box>
							<Title order={1} mb="sm">
								{getNodeDisplayName(itemsData.category)}
							</Title>
							<Text size="lg" c="dimmed">
								{itemsData.total.toLocaleString()} items in this category
							</Text>
						</Box>
						<Badge size="lg" variant="light">
              Category
						</Badge>
					</Group>
				</Box>

				{/* Search and Filters */}
				<Card p="lg" radius="md" withBorder={true}>
					<Grid>
						<Grid.Col span={{ base: 12, md: 6 }}>
							<TextInput
								leftSection={<IconSearch size={16} />}
								placeholder={`Search ${getNodeDisplayName(itemsData.category)}...`}
								value={searchQuery ?? ""}
								onChange={(e) => {
									const url = new URL(globalThis.location.href);
									if (e.target.value) {
										url.searchParams.set("q", e.target.value);
									} else {
										url.searchParams.delete("q");
									}
									url.searchParams.delete("page");
									globalThis.location.href = url.toString();
								}}
							/>
						</Grid.Col>
						<Grid.Col span={{ base: 12, md: 3 }}>
							<Select
								leftSection={<IconFilter size={16} />}
								placeholder="Filter by brand"
								data={[
									{ value: "", label: "All Brands" },
									...availableBrands.map(brand => ({ value: brand, label: brand })),
								]}
								value={brandFilter ?? ""}
								onChange={(value) => {
									const url = new URL(globalThis.location.href);
									if (value) {
										url.searchParams.set("brand", value);
									} else {
										url.searchParams.delete("brand");
									}
									url.searchParams.delete("page");
									globalThis.location.href = url.toString();
								}}
								clearable={true}
							/>
						</Grid.Col>
						<Grid.Col span={{ base: 12, md: 3 }}>
							<Select
								placeholder="Sort by"
								data={[
									{ value: "date-desc", label: "Latest First" },
									{ value: "date-asc", label: "Oldest First" },
									{ value: "name-asc", label: "Name (A-Z)" },
									{ value: "name-desc", label: "Name (Z-A)" },
								]}
								value={sortBy}
								onChange={(value) => {
									const url = new URL(globalThis.location.href);
									url.searchParams.set("sort", value ?? "date-desc");
									globalThis.location.href = url.toString();
								}}
							/>
						</Grid.Col>
					</Grid>
				</Card>

				{/* Results */}
				<Box>
					<Group justify="space-between" mb="md">
						<Text size="sm" c="dimmed">
              Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, itemsData.total)}-{Math.min(page * ITEMS_PER_PAGE, itemsData.total)} of {itemsData.total.toLocaleString()} items
						</Text>
						{(searchQuery ?? brandFilter) && (
							<Button
								variant="light"
								size="sm"
								onClick={() => {
									const url = new URL(globalThis.location.href);
									url.searchParams.delete("q");
									url.searchParams.delete("brand");
									url.searchParams.delete("page");
									globalThis.location.href = url.toString();
								}}
							>
                Clear Filters
							</Button>
						)}
					</Group>

					{itemsData.items.length > 0 ? (
						<SimpleGrid
							cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
							spacing="md"
						>
							{itemsData.items.map((item) => (
								<ItemCard key={item.id} item={item} />
							))}
						</SimpleGrid>
					) : (
						<Box ta="center" py="xl">
							<IconFolder size={64} color="var(--mantine-color-gray-4)" />
							<Title order={3} mt="md" mb="sm">
                No items found
							</Title>
							<Text c="dimmed" mb="lg">
								{searchQuery ?? brandFilter
									? "Try adjusting your search or filters"
									: "There are no items in this category yet."
								}
							</Text>
							{(searchQuery ?? brandFilter) && (
								<Button
									variant="light"
									onClick={() => {
										const url = new URL(globalThis.location.href);
										url.searchParams.delete("q");
										url.searchParams.delete("brand");
										url.searchParams.delete("page");
										globalThis.location.href = url.toString();
									}}
								>
                  Clear Filters
								</Button>
							)}
						</Box>
					)}
				</Box>

				{/* Pagination */}
				{totalPages > 1 && (
					<Box>
						<Pagination
							total={totalPages}
							value={page}
							onChange={(newPage) => {
								const url = new URL(globalThis.location.href);
								url.searchParams.set("page", newPage.toString());
								globalThis.location.href = url.toString();
							}}
							siblings={1}
							boundaries={2}
						/>
					</Box>
				)}
			</Stack>
		</Container>
	);
}

// Generate static params for categories from JSON files
export async function generateStaticParams() {
	return await generateCategoryParams();
}