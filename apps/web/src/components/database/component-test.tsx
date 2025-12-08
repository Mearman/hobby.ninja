/**
 * Component Test for ItemCard and ItemGrid
 */

import { Title, Divider, Switch, Group, Text, Container, Stack } from "@mantine/core";
import React, { useState } from "react";

import type { UnifiedItem, ManualItem, CatalogItem } from "../../services/dataService";

import { ItemCard } from "./item-card";
import { ItemGrid } from "./item-grid";
import { getMockItems } from "./test-data";

// Constants
const MOCK_ITEMS_COUNT = 25;
const ITEMS_SLICE_COUNT = 4;

type ItemData = UnifiedItem | ManualItem | CatalogItem;

// Helper functions moved to outer scope
const getItemType = (item: ItemData): "unified" | "manual" | "catalog" => {
	if ("sources" in item) return "unified";
	if ("content" in item) return "manual";
	if ("description" in item) return "catalog";
	return "catalog";
};

const handleItemClick = (item: ItemData) => {
	// eslint-disable-next-line no-console
	console.log("Item clicked:", item);
};

const handleSortChange = (field: string, _direction: string) => {
	// eslint-disable-next-line no-console
	console.log("Sort:", field, _direction);
};

const handleRefresh = () => {
	// eslint-disable-next-line no-console
	console.log("Refresh");
};

const handleFiltersClick = () => {
	// eslint-disable-next-line no-console
	console.log("Filters");
};

export function ComponentTest() {
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

	// Get test data
	const mockItems = getMockItems(MOCK_ITEMS_COUNT);

	// Handle item selection
	const handleSelectionChange = (newSelection: Set<string>) => {
		setSelectedItems(newSelection);
	};

	
	return (
		<Container size="xl" py="md">
			<Stack gap="md">
				<Title order={1}>Database Components Test</Title>
				<Text c="dimmed">
          This page tests the ItemCard and ItemGrid components with mock data.
				</Text>

				<Divider />

				{/* Controls */}
				<Group>
					<Switch
						label="View Mode"
						checked={viewMode === "grid"}
						onChange={(e) => { setViewMode(e.target.checked ? "grid" : "list"); }}
					/>
					<Text size="sm" c="dimmed">
						{selectedItems.size} items selected
					</Text>
				</Group>

				{/* Item Grid Test */}
				<ItemGrid
					items={mockItems}
					loading={false}
					error={null}
					total={mockItems.length}
					selectedItems={selectedItems}
					onSelectionChange={handleSelectionChange}
					onSortChange={handleSortChange}
					onViewModeChange={setViewMode}
					onItemClick={handleItemClick}
					onRefresh={handleRefresh}
					onFiltersClick={handleFiltersClick}
					compact={viewMode === "grid"}
					showFilters={true}
					infiniteScroll={false}
				/>

				<Divider />

				{/* Individual Item Cards Test */}
				<Title order={3}>Individual Item Cards</Title>
				<Group>
					{mockItems.slice(0, ITEMS_SLICE_COUNT).map((item, index) => (
						<div key={index} style={{ flex: "1 1 300px" }}>
							<ItemCard
								item={item}
								itemType={getItemType(item)}
								compact={false}
								selected={selectedItems.has(item.id ?? "")}
								onSelect={(id, selected) => {
									const newSelection = new Set(selectedItems);
									if (selected) {
										newSelection.add(id);
									} else {
										newSelection.delete(id);
									}
									handleSelectionChange(newSelection);
								}}
								viewMode="grid"
								onClick={handleItemClick}
							/>
						</div>
					))}
				</Group>
			</Stack>
		</Container>
	);
}

