"use client";

import { Group } from "@mantine/core";
import { IconList } from "@tabler/icons-react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { ViewSwitcher, useViewMode } from "@/components/view/view-switcher";
import { ViewRenderer } from "@/components/view/view-renderers";
import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { type ItemNode } from "@/lib/schemas";

interface SeriesItemsClientProps {
	items: ItemNode[];
	seriesName: string;
	totalItems: number;
}

export function SeriesItemsClient({ items, seriesName, totalItems }: SeriesItemsClientProps) {
	const { preferences } = useUserPreferences();
	const { viewMode, setViewMode } = useViewMode();

	const { visibleItems, isLoading, hasMore, lastItemRef } = useInfiniteScroll({
		items,
		itemsPerPage: preferences.infiniteScrollPageSize,
		preservePageParam: true,
		autoLoad: preferences.autoLoadInfiniteScroll,
	});

	return (
		<>
			{/* Items Header with View Switcher */}
			<Group justify="space-between">
				<h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
					<IconList size={24} />
					Items ({totalItems})
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
						No items found
					</h3>
					<p style={{ color: "var(--mantine-color-gray-6)" }}>
						No items are currently available for this series.
					</p>
				</div>
			)}
		</>
	);
}