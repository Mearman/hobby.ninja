"use client";

import {
	Anchor,
	Badge,
	Box,
	Breadcrumbs,
	Button,
	Card,
	Container,
	Grid,
	Group,
	Pagination,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	IconFolder,
	IconHome,
	IconX,
} from "@tabler/icons-react";
import { useState, useEffect, useMemo, useCallback } from "react";

import { ItemFilters } from "@/components/filtering/item-filters";
import { FutureReleasesToggle } from "@/components/ui/future-releases-toggle";
import { ViewRenderer } from "@/components/view/view-renderers";
import { ViewSwitcher, useViewMode } from "@/components/view/view-switcher";
import { useFilteredItems } from "@/hooks/use-filtered-items";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { PAGINATION } from "@/lib/constants";
import { getNodeDisplayName, isFutureRelease, isItem, type Category, type Item } from "@hobby-ninja/data";

interface CategoryPageClientProps {
	initialCategory: Category;
	initialItems: Item[];
	_initialCategories: Category[];
	categoryId: string;
}

// Statistics interface
interface CategoryStats {
	totalItems: number;
	avgPrice?: number;
	priceRange?: { min: number; max: number };
	newestItem?: string;
	oldestItem?: string;
}

// Main client component
export function CategoryPageClient({
	initialCategory,
	initialItems,
	_initialCategories,
	categoryId,
}: CategoryPageClientProps) {
	const [page, setPage] = useState(1);
	const { viewMode, setViewMode } = useViewMode();
	const { preferences, isLoaded } = useUserPreferences();

	// Calculate future release count for display
	const futureCount = useMemo(
		() => initialItems.filter((item) => isFutureRelease(item)).length,
		[initialItems],
	);

	// Filter out future releases if preference is enabled
	const visibleItems = useMemo(() => {
		if (!isLoaded) return initialItems;
		if (!preferences.hideFutureReleases) return initialItems;
		return initialItems.filter((item) => !isFutureRelease(item));
	}, [initialItems, preferences.hideFutureReleases, isLoaded]);

	// Use the shared filtering hook
	const {
		filteredItems,
		filterState,
		updateFilter,
		updateSearch,
		toggleFilterValue,
		clearFilters,
		hasActiveFilters,
		activeFilterCount,
		availableOptions,
	} = useFilteredItems(visibleItems);

	// Reset page when filters change - synchronous setState is intentional here
	/* eslint-disable react-hooks/set-state-in-effect */
	useEffect(() => {
		setPage(1);
	}, [filterState]);
	/* eslint-enable react-hooks/set-state-in-effect */

	// Calculate category statistics (price-related only, filter options come from hook)
	const categoryStats = useMemo((): CategoryStats => {
		const validItems: Item[] = initialItems.filter((item): item is Item => isItem(item));
		const prices: number[] = [];
		let newestItem = "";
		let oldestItem = "";
		let newestDate = "";
		let oldestDate = "";

		for (const item of validItems) {
			// Collect price data
			if (item.price?.amount) {
				prices.push(item.price.amount);
			}

			// Track newest/oldest items by release date
			const itemDate = item.releaseDate?.ja ?? item.created ?? "";
			if (!oldestDate || itemDate < oldestDate) {
				oldestDate = itemDate;
				oldestItem = getNodeDisplayName(item);
			}
			if (!newestDate || itemDate > newestDate) {
				newestDate = itemDate;
				newestItem = getNodeDisplayName(item);
			}
		}

		const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : undefined;
		const priceRange = prices.length > 0 ? {
			min: Math.min(...prices),
			max: Math.max(...prices),
		} : undefined;

		return {
			totalItems: validItems.length,
			avgPrice,
			priceRange,
			newestItem,
			oldestItem,
		};
	}, [initialItems]);

	// Pagination calculations
	const total = filteredItems.length;
	const totalPages = Math.ceil(total / PAGINATION.ITEMS_PER_PAGE);
	const startIndex = (page - 1) * PAGINATION.ITEMS_PER_PAGE;
	const paginatedItems = filteredItems.slice(startIndex, startIndex + PAGINATION.ITEMS_PER_PAGE);

	// Handle page change
	const handlePageChange = useCallback((newPage: number) => {
		setPage(newPage);
	}, []);

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
					<Anchor href={`/category/${categoryId}`} size="sm" fw={500}>
						{getNodeDisplayName(initialCategory)}
					</Anchor>
				</Breadcrumbs>

				{/* Category Header with Statistics */}
				<Card p="lg" radius="md" withBorder={true}>
					<Group justify="space-between" align="flex-start">
						<Box flex={1}>
							<Group align="center" gap="sm" mb="md">
								<IconFolder size={28} color="var(--mantine-color-blue-6)" />
								<Title order={1}>
									{getNodeDisplayName(initialCategory)}
								</Title>
								<Badge size="lg" variant="light" color="blue">
									Category
								</Badge>
							</Group>

							<Text size="lg" c="dimmed" mb="md">
								{categoryStats.totalItems.toLocaleString()} items in this category
							</Text>

							{/* Category Statistics Grid */}
							<Grid>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Brands</Text>
										<Text size="lg" fw={600}>{availableOptions.brands.length}</Text>
									</Box>
								</Grid.Col>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Grades</Text>
										<Text size="lg" fw={600}>{availableOptions.grades.length}</Text>
									</Box>
								</Grid.Col>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Scales</Text>
										<Text size="lg" fw={600}>{availableOptions.scales.length}</Text>
									</Box>
								</Grid.Col>
								<Grid.Col span={{ base: 6, md: 3 }}>
									<Box>
										<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Series</Text>
										<Text size="lg" fw={600}>{availableOptions.series.length}</Text>
									</Box>
								</Grid.Col>
							</Grid>

							{categoryStats.avgPrice && (
								<Text size="sm" c="dimmed" mt="md">
									Average price: ¥{categoryStats.avgPrice.toLocaleString()}
									{categoryStats.priceRange && (
										` (Range: ¥${categoryStats.priceRange.min.toLocaleString()} - ¥${categoryStats.priceRange.max.toLocaleString()})`
									)}
								</Text>
							)}
						</Box>
					</Group>
				</Card>

				{/* Shared Filters Component */}
				<ItemFilters
					filterState={filterState}
					availableOptions={availableOptions}
					onFilterChange={updateFilter}
					onSearchChange={updateSearch}
					onToggleFilterValue={toggleFilterValue}
					onClearFilters={clearFilters}
					hasActiveFilters={hasActiveFilters}
					activeFilterCount={activeFilterCount}
					title="Filter Items"
					subtitle={`Filtering ${categoryStats.totalItems} items in ${getNodeDisplayName(initialCategory)}`}
				/>

				{/* Results Header */}
				<Box>
					<Group justify="space-between" align="center" mb="md" wrap="wrap">
						<Box>
							<Text size="sm" c="dimmed">
								Showing {Math.min((page - 1) * PAGINATION.ITEMS_PER_PAGE + 1, total)}-{Math.min(page * PAGINATION.ITEMS_PER_PAGE, total)} of {total.toLocaleString()} items
							</Text>
							{total !== categoryStats.totalItems && (
								<Text size="xs" c="blue">
									Filtered from {categoryStats.totalItems.toLocaleString()} total items
								</Text>
							)}
						</Box>

						<Group gap="md">
							{futureCount > 0 && <FutureReleasesToggle futureCount={futureCount} />}
							<ViewSwitcher
								value={viewMode}
								onChange={setViewMode}
								size="sm"
							/>
						</Group>
					</Group>

					{/* Results Display */}
					{paginatedItems.length > 0 ? (
						<ViewRenderer
							viewMode={viewMode}
							items={paginatedItems}
						/>
					) : (
						// Empty State
						<Card p="xl" radius="md" withBorder={true} ta="center">
							<Stack gap="md" align="center">
								<IconFolder
									size={64}
									color="var(--mantine-color-gray-4)"
								/>
								<Title order={3}>
									{hasActiveFilters ? "No items match your filters" : "No items in this category"}
								</Title>
								<Text c="dimmed" size="lg">
									{hasActiveFilters
										? "Try adjusting your search terms or clearing some filters to find what you're looking for."
										: "This category appears to be empty or items are still being added."
									}
								</Text>
								{hasActiveFilters && (
									<Button
										variant="light"
										onClick={clearFilters}
										leftSection={<IconX size={16} />}
									>
										Clear All Filters
									</Button>
								)}
							</Stack>
						</Card>
					)}
				</Box>

				{/* Pagination */}
				{totalPages > 1 && (
					<Box>
						<Pagination
							total={totalPages}
							value={page}
							onChange={handlePageChange}
							siblings={1}
							boundaries={2}
							size="md"
							withEdges={true}
						/>
						<Text ta="center" size="sm" c="dimmed" mt="sm">
							Page {page} of {totalPages}
						</Text>
					</Box>
				)}

				{/* Quick Access Stats */}
				{/* Using || intentionally - empty strings should be falsy */}
				{/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
				{(categoryStats.newestItem || categoryStats.oldestItem) && (
					<Card p="md" radius="md" withBorder={true} bg="gray.0">
						<Group justify="space-between">
							{categoryStats.newestItem && (
								<Box>
									<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Newest Item</Text>
									<Text size="sm" truncate={true} maw={200}>{categoryStats.newestItem}</Text>
								</Box>
							)}
							{categoryStats.oldestItem && (
								<Box>
									<Text size="xs" c="dimmed" tt="uppercase" fw={500}>Oldest Item</Text>
									<Text size="sm" truncate={true} maw={200}>{categoryStats.oldestItem}</Text>
								</Box>
							)}
						</Group>
					</Card>
				)}
			</Stack>
		</Container>
	);
}
