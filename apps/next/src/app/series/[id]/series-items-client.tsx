"use client";

import { Group, Stack } from "@mantine/core";
import { useEffect } from "react";
import { IconList } from "@tabler/icons-react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useFilteredItems } from "@/hooks/use-filtered-items";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { ViewSwitcher, useViewMode } from "@/components/view/view-switcher";
import { ViewRenderer } from "@/components/view/view-renderers";
import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { ItemFilters } from "@/components/filtering/item-filters";
import { type ItemNode } from "@/lib/schemas";

interface SeriesItemsClientProps {
	items: ItemNode[];
	seriesName: string;
	totalItems: number;
}

export function SeriesItemsClient({ items, seriesName, totalItems }: SeriesItemsClientProps) {
	const { preferences } = useUserPreferences();
	const { viewMode, setViewMode } = useViewMode();

	// Apply filtering and sorting to items
	const {
		filteredItems,
		filterState,
		updateFilter,
		updateSearch,
		clearFilters,
		hasActiveFilters,
		activeFilterCount,
		availableOptions,
	} = useFilteredItems(items);

	const { visibleItems, isLoading, hasMore, lastItemRef, reset } = useInfiniteScroll({
		items: filteredItems as ItemNode[],
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
				onClearFilters={clearFilters}
				hasActiveFilters={hasActiveFilters}
				activeFilterCount={activeFilterCount}
				title="Filter Items"
				subtitle={`Filtering ${totalItems} items in ${seriesName}`}
			/>

			{/* Items Header with View Switcher */}
			<Group justify="space-between">
				<h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
					<IconList size={24} />
					Items {filteredItems.length !== totalItems && `(${filteredItems.length} of ${totalItems})`}
				</h2>
				<ViewSwitcher
					value={viewMode}
					onChange={setViewMode}
					size="sm"
				/>
			</Group>

			{/* Items Display */}
			{visibleItems.length > 0 ? (
				<>
					<ViewRenderer
						viewMode={viewMode}
						items={visibleItems}
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
				<div style={{ textAlign: "center", padding: "48px" }}>
					<IconList size={64} style={{ color: "var(--mantine-color-gray-4)" }} />
					<h3 style={{ marginTop: "16px", marginBottom: "8px" }}>
						{hasActiveFilters ? "No items match your filters" : "No items found"}
					</h3>
					<p style={{ color: "var(--mantine-color-gray-6)" }}>
						{hasActiveFilters
							? "Try adjusting your filters to see more items."
							: "No items are currently available for this series."
						}
					</p>
				</div>
			)}
		</Stack>
	);
}