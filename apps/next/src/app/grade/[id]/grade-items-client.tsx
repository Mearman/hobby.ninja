"use client";

import { Group, Stack } from "@mantine/core";
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
import { isFutureRelease, type ItemNode } from "@/lib/schemas";

interface GradeItemsClientProps {
	items: ItemNode[];
	gradeName: string;
	totalItems: number;
}

export function GradeItemsClient({ items, gradeName, totalItems }: GradeItemsClientProps) {
	const { preferences, isLoaded } = useUserPreferences();
	const { viewMode, setViewMode } = useViewMode();

	// Calculate future release count for display
	const futureCount = useMemo(
		() => items.filter((item) => isFutureRelease(item)).length,
		[items],
	);

	// Filter out future releases if preference is enabled
	const visibleItems = useMemo(() => {
		if (!isLoaded) return items;
		if (!preferences.hideFutureReleases) return items;
		return items.filter((item) => !isFutureRelease(item));
	}, [items, preferences.hideFutureReleases, isLoaded]);

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
				onClearFilters={clearFilters}
				hasActiveFilters={hasActiveFilters}
				activeFilterCount={activeFilterCount}
				title="Filter Items"
				subtitle={`Filtering ${totalItems} items in ${gradeName}`}
			/>

			{/* Items Header with View Switcher and Future Releases Toggle */}
			<Group justify="space-between" wrap="wrap">
				<h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
					<IconList size={24} />
					Items {filteredItems.length !== totalItems && `(${filteredItems.length} of ${totalItems})`}
				</h2>
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
				<div style={{ textAlign: "center", padding: "48px" }}>
					<IconList size={64} style={{ color: "var(--mantine-color-gray-4)" }} />
					<h3 style={{ marginTop: "16px", marginBottom: "8px" }}>
						{hasActiveFilters ? "No items match your filters" : "No items found"}
					</h3>
					<p style={{ color: "var(--mantine-color-gray-6)" }}>
						{hasActiveFilters
							? "Try adjusting your filters to see more items."
							: "No items are currently available for this grade."
						}
					</p>
				</div>
			)}
		</Stack>
	);
}
