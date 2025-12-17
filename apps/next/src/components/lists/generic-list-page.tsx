"use client";

import {
	Container,
	Group,
	Text,
	Title,
	Stack,
	SimpleGrid,
	Card,
	Table,
	Box,
} from "@mantine/core";
import { IconBox } from "@tabler/icons-react";

import type {
	GenericListPageProps,
} from "./types";

import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { useViewMode , ViewSwitcher } from "@/components/view/view-switcher";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";

export function GenericListPage<T, TFilterState = Record<string, unknown>, TAvailableOptions = Record<string, unknown>>({
	items,
	totalItems,
	config,
	headerContent,
	subtitle,
	breadcrumbs,
	stats,
	pageTitle,
	hiddenFilters,
}: GenericListPageProps<T, TFilterState, TAvailableOptions>) {
	const { preferences } = useUserPreferences();
	const { viewMode, setViewMode } = useViewMode();

	// Apply filtering using the config's filter hook
	const { filteredItems, filterState, updateFilter, hasActiveFilters, availableOptions, filterCounts } =
		config.filters.hook(items);

	// Apply infinite scroll if enabled
	const { visibleItems, isLoading, hasMore, lastItemRef } = useInfiniteScroll({
		items: filteredItems,
		itemsPerPage: preferences.infiniteScrollPageSize,
		preservePageParam: true,
		autoLoad: config.infiniteScroll ? preferences.autoLoadInfiniteScroll : false,
	});

	// Handle filter changes
	const handleFilterChange = (updates: Partial<TFilterState>) => {
		updateFilter(updates);
	};

	const FilterComponent = config.filters.component;

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Header */}
				{breadcrumbs}

				{/* Page Title and Stats */}
				<Group justify="space-between" wrap="wrap">
					<div>
						<Title order={1}>{pageTitle}</Title>
						{subtitle && (
							<Text size="lg" c="dimmed" mt="xs">
								{subtitle}
							</Text>
						)}
					</div>
					{stats}
				</Group>

				{headerContent}

				{/* Filters */}
				<Card p="lg" radius="md" withBorder={true}>
					<FilterComponent
						filterState={filterState}
						availableOptions={availableOptions}
						filterCounts={filterCounts}
						onFilterChange={handleFilterChange}
						items={items}
						hiddenFilters={hiddenFilters}
					/>
				</Card>

				{/* List Header with View Switcher */}
				<Group justify="space-between" wrap="wrap">
					<Group gap="xs">
						<IconBox size={24} />
						<Text size="lg" fw={600}>
							{config.entityType === "items" && "Items"}
							{config.entityType === "manuals" && "Manuals"}
							{config.entityType === "database" && "Database"}
						</Text>
						<Text size="sm" c="dimmed">
							({filteredItems.length.toLocaleString()} of {totalItems.toLocaleString()})
						</Text>
					</Group>

					{config.views.enabled.length > 1 && (
						<ViewSwitcher
							value={viewMode}
							onChange={setViewMode}
							size="sm"
						/>
					)}
				</Group>

				{/* Items Display */}
				{visibleItems.length > 0 ? (
					<>
						{viewMode === "grid" && (
							<SimpleGrid
								cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
								spacing="md"
							>
								{visibleItems.map((item, index) => {
									const isLast = index === visibleItems.length - 1;
									return (
										<div
											key={String(item[config.itemIdField])}
											ref={isLast ? lastItemRef : undefined}
										>
											<config.card item={item} viewMode={viewMode} />
										</div>
									);
								})}
							</SimpleGrid>
						)}

						{viewMode === "list" && (
							<Stack gap="xs">
								{visibleItems.map((item, index) => {
									const isLast = index === visibleItems.length - 1;
									return (
										<div
											key={String(item[config.itemIdField])}
											ref={isLast ? lastItemRef : undefined}
										>
											<config.card item={item} viewMode={viewMode} />
										</div>
									);
								})}
							</Stack>
						)}

						{viewMode === "table" && (
							<Box>
								<Table striped={true} highlightOnHover={true}>
									<Table.Thead>
										<Table.Tr>
											<Table.Th>Name</Table.Th>
											<Table.Th>Released</Table.Th>
											<Table.Th>Series</Table.Th>
											<Table.Th>Grade</Table.Th>
											<Table.Th>Scale</Table.Th>
											<Table.Th>Brand</Table.Th>
										</Table.Tr>
									</Table.Thead>
									<Table.Tbody>
										{visibleItems.map((item, index) => {
											const isLast = index === visibleItems.length - 1;
											return (
												<div
													key={String(item[config.itemIdField])}
													ref={isLast ? lastItemRef : undefined}
													style={{ display: "contents" }}
												>
													<config.card item={item} viewMode={viewMode} />
												</div>
											);
										})}
									</Table.Tbody>
								</Table>
							</Box>
						)}


						{/* Infinite Scroll Loader */}
						{config.infiniteScroll && viewMode !== "table" && (
							<InfiniteScrollLoader
								isLoading={isLoading}
								hasMore={hasMore}
								autoLoad={preferences.autoLoadInfiniteScroll}
							/>
						)}
					</>
				) : (
					<Stack align="center" py="xl" gap="md">
						<IconBox size={64} style={{ color: "var(--mantine-color-gray-4)" }} />
						<Text size="lg" fw={500}>
							{hasActiveFilters
								? "No items match your filters"
								: "No items found"}
						</Text>
						<Text c="dimmed" ta="center">
							{hasActiveFilters
								? "Try adjusting your filters to see more items."
								: "The collection appears to be empty."}
						</Text>
					</Stack>
				)}
			</Stack>
		</Container>
	);
}