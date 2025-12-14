"use client";

import {
	getBrandById,
	getCategoryById,
	getGradeById,
	getNodeDisplayName,
	getSeriesById,
} from "@hobby-ninja/data";
import {
	ActionIcon,
	Badge,
	Box,
	Button,
	Card,
	Chip,
	Collapse,
	Divider,
	Group,
	Select,
	Stack,
	Text,
	TextInput,
	UnstyledButton,
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
import { getGradeImage } from "@/lib/image-lookup";

// Helper functions to format entity IDs to display names
function formatBrandName(id: string): string {
	const brand = getBrandById(id);
	return brand ? getNodeDisplayName(brand) : id;
}

function formatSeriesName(id: string): string {
	const series = getSeriesById(id);
	return series ? getNodeDisplayName(series) : id;
}

function formatCategoryName(id: string): string {
	const category = getCategoryById(id);
	return category ? getNodeDisplayName(category) : id;
}

function formatGradeName(id: string): string {
	const grade = getGradeById(id);
	return grade ? getNodeDisplayName(grade) : id;
}

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

	if (options.length === 0) return null;

	return (
		<Box>
			{/* Accordion Header */}
			<UnstyledButton
				onClick={() => { setExpanded(!expanded); }}
				style={{ width: "100%" }}
			>
				<Group justify="space-between" mb={expanded ? "xs" : 0}>
					<Group gap="xs">
						{expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
						<Text size="sm" fw={500}>
							{label}
						</Text>
						<Text size="xs" c="dimmed">
							({options.length})
						</Text>
					</Group>
					{selectedValues.length > 0 && (
						<Badge size="xs" variant="filled" color={color}>
							{selectedValues.length} selected
						</Badge>
					)}
				</Group>
			</UnstyledButton>

			{/* Collapsed: Show selected values only */}
			{!expanded && selectedValues.length > 0 && (
				<Group gap="xs" wrap="wrap" mt="xs">
					{selectedValues.map((value) => (
						<Chip
							key={value}
							checked={true}
							onChange={() => { onToggle(field, value); }}
							size="xs"
							variant="filled"
							color={color}
						>
							{formatValue(value)}
						</Chip>
					))}
				</Group>
			)}

			{/* Expanded: Show all options */}
			<Collapse in={expanded}>
				<Group gap="xs" wrap="wrap" mt="xs">
					{options.map((value) => (
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
				</Group>
			</Collapse>
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
								formatValue={formatCategoryName}
								color="grape"
							/>

							<FilterSection
								label="Brands"
								field="brands"
								options={availableOptions.brands}
								selectedValues={filterState.brands}
								onToggle={onToggleFilterValue}
								formatValue={formatBrandName}
								color="blue"
							/>

							<FilterSection
								label="Series"
								field="series"
								options={availableOptions.series}
								selectedValues={filterState.series}
								onToggle={onToggleFilterValue}
								formatValue={formatSeriesName}
								color="violet"
							/>

							<FilterSection
								label="Grades"
								field="grades"
								options={availableOptions.grades}
								selectedValues={filterState.grades}
								onToggle={onToggleFilterValue}
								formatValue={formatGradeName}
								color="teal"
							/>

							<FilterSection
								label="Scales"
								field="scales"
								options={availableOptions.scales}
								selectedValues={filterState.scales}
								onToggle={onToggleFilterValue}
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
								{formatBrandName(brand)}
							</Badge>
						))}
						{filterState.grades.map(grade => (
							<Badge
								key={`grade-${grade}`}
								size="sm"
								variant="light"
								color="teal"
								leftSection={
									getGradeImage(grade) ? (
										<img src={getGradeImage(grade)} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
									) : null
								}
								rightSection={
									<ActionIcon size="xs" variant="transparent" onClick={() => { onToggleFilterValue("grades", grade); }}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								{formatGradeName(grade)}
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
								{scale}
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
								{formatSeriesName(s)}
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
								{formatCategoryName(cat)}
							</Badge>
						))}
					</Group>
				)}
			</Stack>
		</Card>
	);
}
