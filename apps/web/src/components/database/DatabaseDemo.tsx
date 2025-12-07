/**
 * Database Demo Component
 *
 * Demonstrates the usage of ItemCard and ItemGrid components
 * with the actual data service.
 */

import {
	Stack,
	Title,
	TextInput,
	Group,
	Button,
	Container,
	Text,
	Divider,
	Alert,
} from "@mantine/core";
import { IconSearch, IconRefresh, IconAlertCircle } from "@tabler/icons-react";
import React, { useState, useEffect, useCallback } from "react";


import { dataService } from "../../services/dataService";
import type { UnifiedItem, ManualItem, DatabaseCatalogItem, FilterOptions } from "../../services/dataService";

import { ItemGrid } from "./ItemGrid";

type ItemData = UnifiedItem | ManualItem | DatabaseCatalogItem;

export function DatabaseDemo() {
	const [items, setItems] = useState<ItemData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [infiniteScroll, setInfiniteScroll] = useState(false);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [sortBy, setSortBy] = useState("relevance");

	// Load initial data
	const loadData = useCallback(async (query = "", isNew = false) => {
		setLoading(true);
		setError(null);

		try {
			const filters: FilterOptions = {
				query,
				sort: {
					field: sortBy as any,
					direction: "desc",
				},
			};

			if (query) {
				// Use search for queries
				const result = await dataService.searchItems(query, filters);
				setItems(result.items.map(item => item.data));
				setTotal(result.total);
			} else {
				// Use pagination for browsing
				const result = await dataService.getItemsByPage(isNew ? 1 : page, 50);
				setItems(result.items);
				setTotal(result.pagination.total);
			}
		} catch (error_) {
			setError(error_ instanceof Error ? error_.message : "Failed to load data");
		} finally {
			setLoading(false);
		}
	}, [page, sortBy]);

	// Initial load
	useEffect(() => {
		loadData();
	}, []);

	// Handle search
	const handleSearch = useCallback(() => {
		setPage(1);
		loadData(searchQuery, true);
	}, [searchQuery, loadData]);

	// Handle refresh
	const handleRefresh = useCallback(() => {
		loadData(searchQuery);
	}, [searchQuery, loadData]);

	// Handle page change
	const handlePageChange = useCallback((newPage: number) => {
		setPage(newPage);
	}, []);

	// Handle sort change
	const handleSortChange = useCallback((field: any, direction: any) => {
		setSortBy(field);
		loadData(searchQuery, true);
	}, [searchQuery, loadData]);

	// Handle view mode change
	const handleViewModeChange = useCallback((mode: "grid" | "list") => {
		setViewMode(mode);
	}, []);

	// Handle item click
	const handleItemClick = useCallback((item: ItemData) => {
		console.log("Item clicked:", item);
		// In a real app, this would navigate to item details
	}, []);

	// Handle filters click
	const handleFiltersClick = useCallback(() => {
		console.log("Filters clicked");
		// In a real app, this would open a filters modal
	}, []);

	return (
		<Container size="xl" py="md">
			<Stack gap="md">
				{/* Header */}
				<Group justify="space-between">
					<Title order={1}>Gundpla Database</Title>
					<Group>
						<Button
							variant={infiniteScroll ? "filled" : "light"}
							size="sm"
							onClick={() => setInfiniteScroll(!infiniteScroll)}
						>
							{infiniteScroll ? "Infinite Scroll" : "Pagination"}
						</Button>
					</Group>
				</Group>

				{/* Search Bar */}
				<Group>
					<TextInput
						placeholder="Search models by name, series, grade..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						leftSection={<IconSearch size={16} />}
						style={{ flex: 1 }}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
					/>
					<Button onClick={handleSearch} disabled={loading}>
            Search
					</Button>
					<Button
						variant="light"
						onClick={handleRefresh}
						disabled={loading}
						leftSection={<IconRefresh size={16} />}
					>
            Refresh
					</Button>
				</Group>

				{/* Status Info */}
				<Group>
					<Text size="sm" c="dimmed">
						{total > 0 && `Showing ${items.length} of ${total} items`}
						{searchQuery && ` for "${searchQuery}"`}
					</Text>
					{selectedItems.size > 0 && (
						<Text size="sm" c="blue">
							{selectedItems.size} selected
						</Text>
					)}
				</Group>

				<Divider />

				{/* Error Alert */}
				{error && (
					<Alert
						icon={<IconAlertCircle size={16} />}
						title="Error"
						color="red"
						withCloseButton={true}
						onClose={() => setError(null)}
					>
						{error}
					</Alert>
				)}

				{/* Item Grid */}
				<ItemGrid
					items={items}
					loading={loading}
					error={error}
					page={page}
					total={total}
					selectedItems={selectedItems}
					onSelectionChange={setSelectedItems}
					onPageChange={handlePageChange}
					onSortChange={handleSortChange}
					onViewModeChange={handleViewModeChange}
					onRefresh={handleRefresh}
					onItemClick={handleItemClick}
					onFiltersClick={handleFiltersClick}
					infiniteScroll={infiniteScroll}
					searchQuery={searchQuery}
					showFilters={true}
					compact={viewMode === "grid"}
				/>
			</Stack>
		</Container>
	);
}

export default DatabaseDemo;