/**
 * Component Test for ItemCard and ItemGrid
 */

import { Title, Divider, Switch, Group, Text, Container, Stack } from "@mantine/core";
import React, { useState } from "react";

import type { UnifiedItem, ManualItem, DatabaseCatalogItem } from "../../services/dataService";

import { ItemCard } from "./ItemCard";
import { ItemGrid } from "./ItemGrid";
import { getMockItems } from "./test-data";


type ItemData = UnifiedItem | ManualItem | DatabaseCatalogItem;

export function ComponentTest() {
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

	// Get test data
	const mockItems = getMockItems(25);

	// Get item type
	const getItemType = (item: ItemData): "unified" | "manual" | "catalog" => {
		if ("sources" in item) return "unified";
		if ("content" in item) return "manual";
		if ("description" in item) return "catalog";
		return "catalog";
	};

	// Handle item selection
	const handleSelectionChange = (newSelection: Set<string>) => {
		setSelectedItems(newSelection);
	};

	// Handle item click
	const handleItemClick = (item: ItemData) => {
		console.log("Item clicked:", item);
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
						onChange={(e) => setViewMode(e.target.checked ? "grid" : "list")}
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
					onSortChange={(field, direction) => console.log("Sort:", field, direction)}
					onViewModeChange={setViewMode}
					onItemClick={handleItemClick}
					onRefresh={() => console.log("Refresh")}
					onFiltersClick={() => console.log("Filters")}
					compact={viewMode === "grid"}
					showFilters={true}
					viewMode={viewMode}
					infiniteScroll={false}
				/>

				<Divider />

				{/* Individual Item Cards Test */}
				<Title order={3}>Individual Item Cards</Title>
				<Group>
					{mockItems.slice(0, 4).map((item, index) => (
						<div key={index} style={{ flex: "1 1 300px" }}>
							<ItemCard
								item={item}
								itemType={getItemType(item)}
								compact={false}
								selected={selectedItems.has(item.id)}
								onSelect={handleSelectionChange ? (id, selected) => {
									const newSelection = new Set(selectedItems);
									if (selected) {
										newSelection.add(id);
									} else {
										newSelection.delete(id);
									}
									handleSelectionChange(newSelection);
								} : undefined}
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

export default ComponentTest;