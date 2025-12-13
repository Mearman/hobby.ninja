"use client";

import { Group, Stack, Text } from "@mantine/core";
import { IconList } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";

import { ItemFilters } from "@/components/filtering/item-filters";
import { FutureReleasesToggle } from "@/components/ui/future-releases-toggle";
import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { ViewRenderer } from "@/components/view/view-renderers";
import { ViewSwitcher, useViewMode } from "@/components/view/view-switcher";
import { useFilteredItems } from "@/hooks/use-filtered-items";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { type Item, isFutureRelease } from "@hobby-ninja/data";

interface ItemsClientProps {
	items: Item[];
	totalItems: number;
}

export function ItemsClient({ items, totalItems }: ItemsClientProps) {
	const { preferences, isLoaded } = useUserPreferences();
	const { viewMode, setViewMode } = useViewMode();

	// Calculate future release count for display
	const futureCount = useMemo(
		() => items.filter((item) => isFutureRelease(item)).length,
		[items],
	);

	// Filter out future releases if preference is enabled
	const visibleItems = useMemo(() => {
		if (!isLoaded) return items; // Show all during SSR/hydration
		if (!preferences.hideFutureReleases) return items;
		return items.filter((item) => !isFutureRelease(item));
	}, [items, preferences.hideFutureReleases, isLoaded]);

	// Apply filtering and sorting to items
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

	const { visibleItems: paginatedItems, isLoading, hasMore, lastItemRef, reset } = useInfiniteScroll({
		items: filteredItems,
		itemsPerPage: preferences.infiniteScrollPageSize,
		preservePageParam: true,
		autoLoad: preferences.autoLoadInfiniteScroll,
	});

	// Reset infinite scroll when filters change
	useEffect(() => {
		reset();
	}, [filterState, reset]);

	return (
		<Stack gap="md">
			{/* Filters */}
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
				subtitle={`Browse ${totalItems.toLocaleString()} items in our database`}
			/>

			{/* Items Header with View Switcher and Future Releases Toggle */}
			<Group justify="space-between" wrap="wrap">
				<Group gap="xs">
					<IconList size={24} />
					<Text size="lg" fw={600}>
						Items
					</Text>
					{filteredItems.length !== totalItems && (
						<Text size="sm" c="dimmed">
							({filteredItems.length.toLocaleString()} of {totalItems.toLocaleString()})
						</Text>
					)}
				</Group>
				<Group gap="md">
					{futureCount > 0 && <FutureReleasesToggle futureCount={futureCount} />}
					<ViewSwitcher
						value={viewMode}
						onChange={setViewMode}
						size="sm"
					/>
				</Group>
			</Group>

			{/* Items Display */}
			{paginatedItems.length > 0 ? (
				<>
					<ViewRenderer
						viewMode={viewMode}
						items={paginatedItems}
					/>

					{/* Infinite Scroll Loader */}
					<div ref={lastItemRef}>
						<InfiniteScrollLoader
							isLoading={isLoading}
							hasMore={hasMore}
							autoLoad={preferences.autoLoadInfiniteScroll}
						/>
					</div>
				</>
			) : (
				<Stack align="center" py="xl" gap="md">
					<IconList size={64} style={{ color: "var(--mantine-color-gray-4)" }} />
					<Text size="lg" fw={500}>
						{hasActiveFilters ? "No items match your filters" : "No items found"}
					</Text>
					<Text c="dimmed" ta="center">
						{hasActiveFilters
							? "Try adjusting your filters to see more items."
							: "No items are currently available."
						}
					</Text>
				</Stack>
			)}
		</Stack>
	);
}
