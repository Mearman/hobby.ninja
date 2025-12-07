/**
 * Item Grid Component
 *
 * Virtual scrolling grid for displaying large datasets efficiently.
 * Features responsive layout, infinite scroll, and multiple view modes.
 */

import {
	Box,
	Group,
	Stack,
	Text,
	ActionIcon,
	Tooltip,
	SegmentedControl,
	Select,
	Pagination,
	Center,
	Loader,
	Button,
	Container,
	Flex,
	Badge,
	useMantineTheme, rem } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
	IconGridDots,
	IconList,
	IconAdjustmentsHorizontal,
	IconRefresh,
	IconFilter,
} from "@tabler/icons-react";
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";

import type { UnifiedItem, ManualItem, DatabaseCatalogItem } from "../../services/dataService";

import ItemCard from "./ItemCard";


type ItemData = UnifiedItem | ManualItem | DatabaseCatalogItem;
type ItemType = "unified" | "manual" | "catalog";
type ViewMode = "grid" | "list";
type SortField = "name" | "releaseDate" | "grade" | "relevance";
type SortDirection = "asc" | "desc";

interface ItemGridProps {
  /** Array of items to display */
  items: ItemData[];
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string | null;
  /** Current page number */
  page?: number;
  /** Total number of items */
  total?: number;
  /** Items per page */
  limit?: number;
  /** Selected item IDs */
  selectedItems?: Set<string>;
  /** Selection change handler */
  onSelectionChange?: (selectedItems: Set<string>) => void;
  /** Page change handler */
  onPageChange?: (page: number) => void;
  /** Load more handler for infinite scroll */
  onLoadMore?: () => void;
  /** Sort change handler */
  onSortChange?: (field: SortField, direction: SortDirection) => void;
  /** View mode change handler */
  onViewModeChange?: (mode: ViewMode) => void;
  /** Refresh handler */
  onRefresh?: () => void;
  /** Item click handler */
  onItemClick?: (item: ItemData) => void;
  /** Compact mode */
  compact?: boolean;
  /** Show filters button */
  showFilters?: boolean;
  /** Filters button click handler */
  onFiltersClick?: () => void;
  /** Enable infinite scroll */
  infiniteScroll?: boolean;
  /** Current search query */
  searchQuery?: string;
}

const SORT_OPTIONS = [
	{ value: "relevance", label: "Relevance" },
	{ value: "name", label: "Name" },
	{ value: "releaseDate", label: "Release Date" },
	{ value: "grade", label: "Grade" },
];

export function ItemGrid({
	items,
	loading = false,
	error = null,
	page = 1,
	total = 0,
	limit = 50,
	selectedItems = new Set(),
	onSelectionChange,
	onPageChange,
	onLoadMore,
	onSortChange,
	onViewModeChange,
	onRefresh,
	onItemClick,
	compact = false,
	showFilters = true,
	onFiltersClick,
	infiniteScroll = false,
	searchQuery,
}: ItemGridProps) {
	const theme = useMantineTheme();
	const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
	const isTablet = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);

	const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? "list" : "grid");
	const [sortField, setSortField] = useState<SortField>("relevance");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [isRefreshing, setIsRefreshing] = useState(false);

	const parentRef = useRef<HTMLDivElement>(null);
	const loadMoreRef = useRef<HTMLDivElement>(null);

	// Calculate responsive columns
	const getColumnCount = useCallback(() => {
		if (viewMode === "list") return 1;
		if (isMobile) return 2;
		if (isTablet) return 3;
		if (compact) return 4;
		return 5;
	}, [viewMode, isMobile, isTablet, compact]);

	// Determine item type
	const getItemType = useCallback((item: ItemData): ItemType => {
		if ("sources" in item) return "unified";
		if ("content" in item) return "manual";
		if ("description" in item) return "catalog";
		return "catalog";
	}, []);

	// Get unique item ID
	const getItemId = useCallback((item: ItemData): string => {
		return item.id || (item as any).title || "unknown";
	}, []);

	// Handle selection toggle
	const handleSelectionToggle = useCallback((itemId: string, selected: boolean) => {
		if (!onSelectionChange) return;

		const newSelection = new Set(selectedItems);
		if (selected) {
			newSelection.add(itemId);
		} else {
			newSelection.delete(itemId);
		}
		onSelectionChange(newSelection);
	}, [selectedItems, onSelectionChange]);

	// Handle select all
	const handleSelectAll = useCallback(() => {
		if (!onSelectionChange) return;

		const allIds = new Set(items.map(getItemId));
		onSelectionChange(allIds);
	}, [items, getItemId, onSelectionChange]);

	// Handle clear selection
	const handleClearSelection = useCallback(() => {
		if (!onSelectionChange) return;
		onSelectionChange(new Set());
	}, [onSelectionChange]);

	// Handle sort change
	const handleSortChange = useCallback((field: SortField) => {
		const newDirection = field === sortField && sortDirection === "asc" ? "desc" : "asc";
		setSortField(field);
		setSortDirection(newDirection);
		onSortChange?.(field, newDirection);
	}, [sortField, sortDirection, onSortChange]);

	// Handle view mode change
	const handleViewModeChange = useCallback((mode: ViewMode) => {
		setViewMode(mode);
		onViewModeChange?.(mode);
	}, [onViewModeChange]);

	// Handle refresh
	const handleRefresh = useCallback(async () => {
		if (!onRefresh || isRefreshing) return;

		setIsRefreshing(true);
		try {
			await onRefresh();
		} finally {
			setIsRefreshing(false);
		}
	}, [onRefresh, isRefreshing]);

	// Sort items
	const sortedItems = useMemo(() => {
		if (items.length === 0) return [];

		const sorted = [...items].sort((a, b) => {
			let comparison = 0;

			switch (sortField) {
				case "name": {
					const getName = (item: ItemData) => {
						if ("name" in item) {
							const name = item.name as { en?: string; ja?: string } | string;
							return typeof name === "string" ? name : name.en || name.ja || "";
						}
						return (item as any).title || "";
					};

					comparison = getName(a).localeCompare(getName(b));
					break;
				}

				case "releaseDate": {
					const getYear = (item: ItemData) => {
						if ("releaseDate" in item && item.releaseDate) {
							const date = item.releaseDate as any;
							return date.year || 0;
						}
						return 0;
					};

					comparison = getYear(a) - getYear(b);
					break;
				}

				case "grade": {
					const getGrade = (item: ItemData) => {
						if ("grade" in item) {
							return item.grade || "";
						}
						return "";
					};

					comparison = getGrade(a).localeCompare(getGrade(b));
					break;
				}

				case "relevance":
				default: {
					// For now, maintain original order (could be enhanced with actual relevance scoring)
					comparison = 0;
					break;
				}
			}

			return sortDirection === "desc" ? -comparison : comparison;
		});

		return sorted;
	}, [items, sortField, sortDirection]);

	// Setup virtualizer
	const virtualizer = useWindowVirtualizer({
		count: sortedItems.length,
		estimateSize: () => viewMode === "list" ? 120 : (compact ? 180 : 280),
		overscan: 5,
		scrollMargin: parentRef.current?.offsetTop ?? 0,
	});

	// Setup infinite scroll intersection observer
	useEffect(() => {
		if (!infiniteScroll || !onLoadMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				if (entry.isIntersecting && !loading && items.length < total) {
					onLoadMore();
				}
			},
			{ threshold: 0.1 },
		);

		if (loadMoreRef.current) {
			observer.observe(loadMoreRef.current);
		}

		return () => { observer.disconnect(); };
	}, [infiniteScroll, onLoadMore, loading, items.length, total]);

	// Calculate grid styles
	const gridStyles = useMemo(() => {
		const columnCount = getColumnCount();

		if (viewMode === "list") {
			return {
				display: "flex",
				flexDirection: "column" as const,
				gap: theme.spacing.sm,
			};
		}

		return {
			display: "grid",
			gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
			gap: theme.spacing.sm,
		};
	}, [getColumnCount, viewMode, theme]);

	// Render single item
	const renderItem = useCallback((item: ItemData, index: number) => {
		const itemId = getItemId(item);
		const itemType = getItemType(item);
		const isSelected = selectedItems.has(itemId);

		return (
			<ItemCard
				key={`${itemId}-${index}`}
				item={item}
				itemType={itemType}
				compact={compact}
				selected={isSelected}
				onSelect={onSelectionChange ? handleSelectionToggle : undefined}
				viewMode={viewMode}
				onClick={onItemClick}
				loading={loading}
			/>
		);
	}, [
		getItemId,
		getItemType,
		selectedItems,
		compact,
		viewMode,
		loading,
		onSelectionChange,
		handleSelectionToggle,
		onItemClick,
	]);

	// Render error state
	if (error) {
		return (
			<Container size="sm" py="xl">
				<Stack align="center" gap="md">
					<Text c="red" size="lg" fw={500}>
            Error loading items
					</Text>
					<Text c="dimmed">
						{error}
					</Text>
					<Button onClick={handleRefresh} loading={isRefreshing}>
            Try Again
					</Button>
				</Stack>
			</Container>
		);
	}

	// Render empty state
	if (!loading && items.length === 0) {
		return (
			<Container size="sm" py="xl">
				<Stack align="center" gap="md">
					<Text size="lg" fw={500} c="dimmed">
            No items found
					</Text>
					{searchQuery && (
						<Text c="dimmed">
              Try adjusting your search query or filters
						</Text>
					)}
					<Button onClick={handleRefresh} loading={isRefreshing}>
            Refresh
					</Button>
				</Stack>
			</Container>
		);
	}

	return (
		<Stack gap="md">
			{/* Controls */}
			<Group justify="space-between" wrap="nowrap">
				<Group gap="sm">
					{/* View Mode Toggle */}
					<SegmentedControl
						data={[
							{ label: <IconGridDots size={16} />, value: "grid" },
							{ label: <IconList size={16} />, value: "list" },
						]}
						value={viewMode}
						onChange={(value) => { handleViewModeChange(value as ViewMode); }}
						size="sm"
					/>

					{/* Sort Control */}
					<Select
						data={SORT_OPTIONS}
						value={sortField}
						onChange={(value) => value && handleSortChange(value as SortField)}
						size="sm"
						w={120}
						rightSection={
							<ActionIcon
								size="xs"
								variant="subtle"
								onClick={() => { handleSortChange(sortField); }}
							>
								{sortDirection === "asc" ? "↑" : "↓"}
							</ActionIcon>
						}
					/>

					{/* Filters Button */}
					{showFilters && (
						<Tooltip label="Filters">
							<ActionIcon
								variant="light"
								size="sm"
								onClick={onFiltersClick}
							>
								<IconFilter size={14} />
							</ActionIcon>
						</Tooltip>
					)}
				</Group>

				<Group gap="sm">
					{/* Selection Controls */}
					{selectedItems.size > 0 && (
						<Badge size="sm" color="blue">
							{selectedItems.size} selected
						</Badge>
					)}

					{onSelectionChange && (
						<Group gap="xs">
							<Button
								size="xs"
								variant="light"
								onClick={handleSelectAll}
								disabled={items.length === 0}
							>
                Select All
							</Button>
							<Button
								size="xs"
								variant="light"
								onClick={handleClearSelection}
								disabled={selectedItems.size === 0}
							>
                Clear
							</Button>
						</Group>
					)}

					{/* Refresh */}
					<Tooltip label="Refresh">
						<ActionIcon
							variant="light"
							size="sm"
							onClick={handleRefresh}
							loading={isRefreshing}
						>
							<IconRefresh size={14} />
						</ActionIcon>
					</Tooltip>
				</Group>
			</Group>

			{/* Results Summary */}
			{total > 0 && (
				<Text size="sm" c="dimmed">
          Showing {items.length} of {total} items
					{searchQuery && ` for "${searchQuery}"`}
				</Text>
			)}

			{/* Virtual Scrolling Grid */}
			<Box
				ref={parentRef}
				style={{
					height: viewMode === "list" ? "auto" : "70vh",
					overflow: "auto",
				}}
			>
				{viewMode === "list" ? (
				// Simple list rendering (no virtualization needed for list view)
					<div style={gridStyles}>
						{sortedItems.map((item, index) => renderItem(item, index))}
					</div>
				) : (
				// Virtualized grid
					<div
						style={{
							height: `${virtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative",
							...gridStyles,
						}}
					>
						{virtualizer.getVirtualItems().map((virtualItem) => {
							const item = sortedItems[virtualItem.index];
							if (!item) return null;

							return (
								<div
									key={virtualItem.key}
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										height: `${virtualItem.size}px`,
										transform: `translateY(${virtualItem.start}px)`,
									}}
								>
									<div style={gridStyles}>
										{renderItem(item, virtualItem.index)}
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Load More Trigger */}
				{infiniteScroll && (
					<div ref={loadMoreRef} style={{ height: "1px" }} />
				)}
			</Box>

			{/* Loading State */}
			{loading && (
				<Center py="md">
					<Loader size="sm" />
				</Center>
			)}

			{/* Pagination (for non-infinite scroll) */}
			{!infiniteScroll && total > limit && onPageChange && (
				<Group justify="center">
					<Pagination
						total={Math.ceil(total / limit)}
						value={page}
						onChange={onPageChange}
						size="sm"
					/>
				</Group>
			)}
		</Stack>
	);
}

export default ItemGrid;