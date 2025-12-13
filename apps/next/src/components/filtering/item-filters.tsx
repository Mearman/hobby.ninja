"use client";

import {
	ActionIcon,
	Badge,
	Box,
	Card,
	Chip,
	Collapse,
	Divider,
	Group,
	Select,
	Stack,
	Text,
	TextInput,
	Button,
} from "@mantine/core";
import {
	IconChevronDown,
	IconChevronUp,
	IconFilter,
	IconSearch,
	IconSortAscending,
	IconSortDescending,
	IconX,
} from "@tabler/icons-react";
import { useState } from "react";

import { FilterState } from "@/hooks/use-filtered-items";

type ArrayFilterField = "brands" | "grades" | "scales" | "series" | "categories";

interface ItemFiltersProps {
	filterState: FilterState;
	availableOptions: {
		brands: string[];
		grades: string[];
		scales: string[];
		series: string[];
		categories: string[];
	};
	onFilterChange: (updates: Partial<FilterState>) => void;
	onSearchChange: (value: string) => void;
	onToggleFilterValue: (field: ArrayFilterField, value: string) => void;
	onClearFilters: () => void;
	hasActiveFilters?: boolean;
	activeFilterCount?: number;
	title?: string;
	subtitle?: string;
}

interface FilterSectionProps {
	label: string;
	field: ArrayFilterField;
	options: string[];
	selectedValues: string[];
	onToggle: (field: ArrayFilterField, value: string) => void;
	formatValue?: (value: string) => string;
	color?: string;
}

function FilterSection({
	label,
	field,
	options,
	selectedValues,
	onToggle,
	formatValue = (v) => v,
	color = "blue",
}: FilterSectionProps) {
	const [expanded, setExpanded] = useState(false);
	const displayLimit = 8;
	const hasMore = options.length > displayLimit;
	const visibleOptions = expanded ? options : options.slice(0, displayLimit);

	if (options.length === 0) return null;

	return (
		<Box>
			<Group justify="space-between" mb="xs">
				<Text size="sm" fw={500} c="dimmed">
					{label} ({options.length})
				</Text>
				{selectedValues.length > 0 && (
					<Badge size="xs" variant="filled" color={color}>
						{selectedValues.length} selected
					</Badge>
				)}
			</Group>
			<Group gap="xs" wrap="wrap">
				{visibleOptions.map((value) => (
					<Chip
						key={value}
						checked={selectedValues.includes(value)}
						onChange={() => { onToggle(field, value); }}
						size="xs"
						variant="outline"
						color={color}
					>
						{formatValue(value)}
					</Chip>
				))}
				{hasMore && (
					<Button
						variant="subtle"
						size="compact-xs"
						onClick={() => { setExpanded(!expanded); }}
						rightSection={expanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
					>
						{expanded ? "Show less" : `+${options.length - displayLimit} more`}
					</Button>
				)}
			</Group>
		</Box>
	);
}

export function ItemFilters({
	filterState,
	availableOptions,
	onFilterChange,
	onSearchChange,
	onToggleFilterValue,
	onClearFilters,
	hasActiveFilters = false,
	activeFilterCount = 0,
	title = "Filters",
	subtitle,
}: ItemFiltersProps) {
	const [filtersExpanded, setFiltersExpanded] = useState(true);

	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Stack gap="md">
				{/* Header */}
				<Group justify="space-between" align="center">
					<Group gap="xs">
						<IconFilter size={20} />
						{title && <Text size="lg" fw={600}>{title}</Text>}
						{activeFilterCount > 0 && (
							<Badge size="sm" variant="filled" color="blue">
								{activeFilterCount}
							</Badge>
						)}
					</Group>
					<Group gap="xs">
						{hasActiveFilters && (
							<Button
								variant="light"
								color="red"
								size="xs"
								onClick={onClearFilters}
								leftSection={<IconX size={14} />}
							>
								Clear All
							</Button>
						)}
						<ActionIcon
							variant="subtle"
							onClick={() => { setFiltersExpanded(!filtersExpanded); }}
						>
							{filtersExpanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
						</ActionIcon>
					</Group>
				</Group>
				{subtitle && <Text size="sm" c="dimmed">{subtitle}</Text>}

				<Collapse in={filtersExpanded}>
					<Stack gap="md">
						{/* Search and Sort Row */}
						<Group align="flex-end">
							<TextInput
								leftSection={<IconSearch size={16} />}
								placeholder="Search by name..."
								value={filterState.search}
								onChange={(e) => { onSearchChange(e.target.value); }}
								size="sm"
								style={{ flex: 1 }}
							/>
							<Select
								placeholder="Sort by"
								data={[
									{ value: "date", label: "Date" },
									{ value: "name", label: "Name" },
									{ value: "price", label: "Price" },
									{ value: "brand", label: "Brand" },
									{ value: "grade", label: "Grade" },
									{ value: "scale", label: "Scale" },
									{ value: "series", label: "Series" },
								]}
								value={filterState.sortField}
								onChange={(value) => { onFilterChange({ sortField: value ?? "date" }); }}
								size="sm"
								w={120}
							/>
							<ActionIcon
								variant={filterState.sortDirection === "asc" ? "filled" : "light"}
								onClick={() => { onFilterChange({
									sortDirection: filterState.sortDirection === "asc" ? "desc" : "asc",
								}); }}
								size="lg"
								title={`Sort ${filterState.sortDirection === "asc" ? "Descending" : "Ascending"}`}
							>
								{filterState.sortDirection === "asc" ? (
									<IconSortAscending size={18} />
								) : (
									<IconSortDescending size={18} />
								)}
							</ActionIcon>
						</Group>

						<Divider />

						{/* Filter Sections */}
						<Stack gap="lg">
							<FilterSection
								label="Categories"
								field="categories"
								options={availableOptions.categories}
								selectedValues={filterState.categories}
								onToggle={onToggleFilterValue}
								color="grape"
							/>

							<FilterSection
								label="Brands"
								field="brands"
								options={availableOptions.brands}
								selectedValues={filterState.brands}
								onToggle={onToggleFilterValue}
								color="blue"
							/>

							<FilterSection
								label="Series"
								field="series"
								options={availableOptions.series}
								selectedValues={filterState.series}
								onToggle={onToggleFilterValue}
								color="violet"
							/>

							<FilterSection
								label="Grades"
								field="grades"
								options={availableOptions.grades}
								selectedValues={filterState.grades}
								onToggle={onToggleFilterValue}
								color="teal"
							/>

							<FilterSection
								label="Scales"
								field="scales"
								options={availableOptions.scales}
								selectedValues={filterState.scales}
								onToggle={onToggleFilterValue}
								formatValue={(v) => `1/${v}`}
								color="orange"
							/>
						</Stack>
					</Stack>
				</Collapse>

				{/* Active Filters Summary (shown when collapsed) */}
				{!filtersExpanded && hasActiveFilters && (
					<Group gap="xs" wrap="wrap">
						{filterState.search && (
							<Badge
								size="sm"
								variant="light"
								color="blue"
								rightSection={
									<ActionIcon size="xs" variant="transparent" onClick={() => { onSearchChange(""); }}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								Search: &quot;{filterState.search}&quot;
							</Badge>
						)}
						{filterState.brands.map(brand => (
							<Badge
								key={`brand-${brand}`}
								size="sm"
								variant="light"
								color="blue"
								rightSection={
									<ActionIcon size="xs" variant="transparent" onClick={() => { onToggleFilterValue("brands", brand); }}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								{brand}
							</Badge>
						))}
						{filterState.grades.map(grade => (
							<Badge
								key={`grade-${grade}`}
								size="sm"
								variant="light"
								color="teal"
								rightSection={
									<ActionIcon size="xs" variant="transparent" onClick={() => { onToggleFilterValue("grades", grade); }}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								{grade}
							</Badge>
						))}
						{filterState.scales.map(scale => (
							<Badge
								key={`scale-${scale}`}
								size="sm"
								variant="light"
								color="orange"
								rightSection={
									<ActionIcon size="xs" variant="transparent" onClick={() => { onToggleFilterValue("scales", scale); }}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								1/{scale}
							</Badge>
						))}
						{filterState.series.map(s => (
							<Badge
								key={`series-${s}`}
								size="sm"
								variant="light"
								color="violet"
								rightSection={
									<ActionIcon size="xs" variant="transparent" onClick={() => { onToggleFilterValue("series", s); }}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								{s}
							</Badge>
						))}
						{filterState.categories.map(cat => (
							<Badge
								key={`category-${cat}`}
								size="sm"
								variant="light"
								color="grape"
								rightSection={
									<ActionIcon size="xs" variant="transparent" onClick={() => { onToggleFilterValue("categories", cat); }}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								{cat}
							</Badge>
						))}
					</Group>
				)}
			</Stack>
		</Card>
	);
}
