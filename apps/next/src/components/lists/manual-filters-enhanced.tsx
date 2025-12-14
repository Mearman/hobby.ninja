"use client";

import type { Manual } from "@hobby-ninja/data";
import { TextInput, Select, Group, Stack, Card, Divider, Text, Button } from "@mantine/core";
import { IconSearch, IconCalendar } from "@tabler/icons-react";
import { useState } from "react";

import type { FilterProps } from "./types";

import { DateRangeFilter, type DateRangeValue } from "@/components/filters/date-range-filter";

export interface ManualFilterState {
	search: string;
	dateRange: DateRangeValue;
	sortField: "name" | "date" | "pages" | "language";
	sortDirection: "asc" | "desc";
}

export function ManualFiltersEnhanced({
	filterState,
	_availableOptions,
	onFilterChange,
	items,
}: FilterProps<Manual>) {
	const [showAdvanced, setShowAdvanced] = useState(false);
	const currentFilterState = filterState as ManualFilterState;

	const handleSearchChange = (search: string) => {
		onFilterChange({ ...currentFilterState, search });
	};

	const handleDateRangeChange = (dateRange: DateRangeValue) => {
		onFilterChange({ ...currentFilterState, dateRange });
	};

	const handleSortChange = (value: string | null) => {
		if (!value) return;
		const [field, direction] = value.split("-");
		onFilterChange({
			...currentFilterState,
			sortField: field as ManualFilterState["sortField"],
			sortDirection: direction as "asc" | "desc",
		});
	};

	const clearAllFilters = () => {
		onFilterChange({
			search: "",
			dateRange: { start: null, end: new Date() },
			sortField: "name" as const,
			sortDirection: "asc" as const,
		});
	};

	// Calculate current sort value
	const currentSortValue = `${currentFilterState.sortField}-${currentFilterState.sortDirection}`;

	// Count active filters
	const dateRange = currentFilterState.dateRange;
	const activeFiltersCount = [
		currentFilterState.search.trim(),
		dateRange.start,
		dateRange.end &&
			new Date(dateRange.end).toDateString() !== new Date().toDateString(),
	].filter(Boolean).length;

	return (
		<Card p="md" radius="md" withBorder={true}>
			<Stack gap="md">
				{/* Basic Search */}
				<TextInput
					leftSection={<IconSearch size={16} />}
					placeholder="Search manuals by name or item name..."
					value={currentFilterState.search}
					onChange={(e) => { handleSearchChange(e.target.value); }}
					size="md"
				/>

				{/* Sort Options */}
				<Select
					leftSection={<IconCalendar size={16} />}
					value={currentSortValue}
					onChange={handleSortChange}
					data={[
						{ value: "name-asc", label: "Name (A-Z)" },
						{ value: "name-desc", label: "Name (Z-A)" },
						{ value: "date-desc", label: "Newest First" },
						{ value: "date-asc", label: "Oldest First" },
						{ value: "pages-desc", label: "Most Pages" },
						{ value: "pages-asc", label: "Fewest Pages" },
						{ value: "language-asc", label: "Language (A-Z)" },
					]}
					size="md"
					label="Sort by"
				/>

				{/* Advanced Filters Toggle */}
				<Group justify="space-between" align="center">
					<Button
						variant="subtle"
						size="sm"
						onClick={() => { setShowAdvanced(!showAdvanced); }}
						rightSection={<IconCalendar size={14} />}
					>
						{showAdvanced ? "Hide" : "Show"} Advanced Filters
						{activeFiltersCount > 0 && (
							<Text size="xs" c="blue" ml="xs">
								({activeFiltersCount} active)
							</Text>
						)}
					</Button>

					{activeFiltersCount > 0 && (
						<Button
							variant="outline"
							size="sm"
							onClick={clearAllFilters}
						>
							Clear All
						</Button>
					)}
				</Group>

				{/* Advanced Filters */}
				{showAdvanced && (
					<>
						<Divider />
						<DateRangeFilter
							value={currentFilterState.dateRange}
							onChange={handleDateRangeChange}
							label="Release Date Range"
							placeholder={{
								start: "From date",
								end: "To date",
							}}
							size="sm"
						/>
					</>
				)}

				{/* Results Summary */}
				<Text size="xs" c="dimmed" ta="right">
					{items?.length ?? 0} total manuals
				</Text>
			</Stack>
		</Card>
	);
}