"use client";

import type { Item, Manual } from "@hobby-ninja/data";
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

import type { FilterProps } from "./types";

import type { DatabaseFilterState } from "@/hooks/use-database-filter";

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

type DatabaseArrayFilterField = "brands" | "grades" | "scales" | "series" | "categories" | "languages";

interface FilterSectionProps {
	label: string;
	field: DatabaseArrayFilterField;
	options: string[];
	selectedValues: string[];
	onToggle: (field: DatabaseArrayFilterField, value: string) => void;
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
				onClick={() => {
					setExpanded(!expanded);
				}}
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
							onChange={() => {
								onToggle(field, value);
							}}
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
							onChange={() => {
								onToggle(field, value);
							}}
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

export interface DatabaseAvailableOptions {
	brands: string[];
	categories: string[];
	grades: string[];
	scales: string[];
	series: string[];
	languages: string[];
}

export function DatabaseFilters({
	filterState,
	availableOptions,
	onFilterChange,
}: FilterProps<Item | Manual, DatabaseFilterState, DatabaseAvailableOptions>) {
	const [filtersExpanded, setFiltersExpanded] = useState(true);
	const currentFilterState = filterState;

	const handleSearchChange = (value: string) => {
		onFilterChange({ search: value });
	};

	const handleTypeChange = (type: "all" | "items" | "manuals") => {
		onFilterChange({ type });
	};

	const handleToggleFilterValue = (field: DatabaseArrayFilterField, value: string) => {
		const currentValues = currentFilterState[field];
		const newValues = currentValues.includes(value)
			? currentValues.filter((v) => v !== value)
			: [...currentValues, value];
		onFilterChange({ [field]: newValues });
	};

	const clearAllFilters = () => {
		onFilterChange({
			search: "",
			type: "all",
			brands: [],
			grades: [],
			scales: [],
			series: [],
			categories: [],
			languages: [],
			sortField: "name",
			sortDirection: "asc",
		});
	};

	// Count active filters
	const activeFiltersCount = [
		currentFilterState.search.trim(),
		currentFilterState.type === "all" ? 0 : 1,
		...currentFilterState.brands,
		...currentFilterState.grades,
		...currentFilterState.scales,
		...currentFilterState.series,
		...currentFilterState.categories,
		...currentFilterState.languages,
	].filter(Boolean).length;

	const hasActiveFilters = activeFiltersCount > 0;

	// Format available options
	const formattedOptions = {
		brands: availableOptions.brands,
		grades: availableOptions.grades,
		scales: availableOptions.scales,
		series: availableOptions.series,
		categories: availableOptions.categories,
		languages: availableOptions.languages,
	};

	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Stack gap="md">
				{/* Header */}
				<Group justify="space-between" align="center">
					<Group gap="xs">
						<IconFilter size={20} />
						<Text size="lg" fw={600}>
							Filter Database
						</Text>
						{activeFiltersCount > 0 && (
							<Badge size="sm" variant="filled" color="blue">
								{activeFiltersCount}
							</Badge>
						)}
					</Group>
					<Group gap="xs">
						{hasActiveFilters && (
							<Button
								variant="light"
								color="red"
								size="xs"
								onClick={clearAllFilters}
								leftSection={<IconX size={14} />}
							>
								Clear All
							</Button>
						)}
						<ActionIcon
							variant="subtle"
							onClick={() => {
								setFiltersExpanded(!filtersExpanded);
							}}
						>
							{filtersExpanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
						</ActionIcon>
					</Group>
				</Group>

				<Collapse in={filtersExpanded}>
					<Stack gap="md">
						{/* Type Selector */}
						<Box>
							<Text size="sm" fw={500} mb="xs">
								Show
							</Text>
							<Group gap="xs">
								{[
									{ value: "all" as const, label: "All" },
									{ value: "items" as const, label: "Products" },
									{ value: "manuals" as const, label: "Manuals" },
								].map(({ value, label }) => (
									<Chip
										key={value}
										checked={currentFilterState.type === value}
										onChange={() => {
											handleTypeChange(value);
										}}
										size="sm"
										variant="filled"
										color="grape"
									>
										{label}
									</Chip>
								))}
							</Group>
						</Box>

						{/* Search and Sort Row */}
						<Group align="flex-end">
							<TextInput
								leftSection={<IconSearch size={16} />}
								placeholder="Search by name..."
								value={currentFilterState.search}
								onChange={(e) => {
									handleSearchChange(e.target.value);
								}}
								size="sm"
								style={{ flex: 1 }}
							/>
							<Select
								placeholder="Sort by"
								data={[
									{ value: "name", label: "Name" },
									{ value: "date", label: "Date" },
									{ value: "brand", label: "Brand" },
								]}
								value={currentFilterState.sortField}
								onChange={(value) => {
									if (value === "name" || value === "date" || value === "brand") {
										onFilterChange({ sortField: value });
									}
								}}
								size="sm"
								w={120}
							/>
							<ActionIcon
								variant={currentFilterState.sortDirection === "asc" ? "filled" : "light"}
								onClick={() => {
									onFilterChange({
										sortDirection: currentFilterState.sortDirection === "asc" ? "desc" : "asc",
									});
								}}
								size="lg"
								title={`Sort ${currentFilterState.sortDirection === "asc" ? "Descending" : "Ascending"}`}
							>
								{currentFilterState.sortDirection === "asc" ? (
									<IconSortAscending size={18} />
								) : (
									<IconSortDescending size={18} />
								)}
							</ActionIcon>
						</Group>

						<Divider />

						{/* Filter Sections - conditional based on type */}
						<Stack gap="lg">
							{/* Show item filters for items or all */}
							{(currentFilterState.type === "items" || currentFilterState.type === "all") && (
								<>
									<FilterSection
										label="Categories"
										field="categories"
										options={formattedOptions.categories}
										selectedValues={currentFilterState.categories}
										onToggle={handleToggleFilterValue}
										formatValue={formatCategoryName}
										color="grape"
									/>

									<FilterSection
										label="Brands"
										field="brands"
										options={formattedOptions.brands}
										selectedValues={currentFilterState.brands}
										onToggle={handleToggleFilterValue}
										formatValue={formatBrandName}
										color="blue"
									/>

									<FilterSection
										label="Series"
										field="series"
										options={formattedOptions.series}
										selectedValues={currentFilterState.series}
										onToggle={handleToggleFilterValue}
										formatValue={formatSeriesName}
										color="violet"
									/>

									<FilterSection
										label="Grades"
										field="grades"
										options={formattedOptions.grades}
										selectedValues={currentFilterState.grades}
										onToggle={handleToggleFilterValue}
										formatValue={formatGradeName}
										color="teal"
									/>

									<FilterSection
										label="Scales"
										field="scales"
										options={formattedOptions.scales}
										selectedValues={currentFilterState.scales}
										onToggle={handleToggleFilterValue}
										color="orange"
									/>
								</>
							)}

							{/* Show manual filters for manuals or all */}
							{(currentFilterState.type === "manuals" || currentFilterState.type === "all") && (
								<FilterSection
									label="Languages"
									field="languages"
									options={formattedOptions.languages}
									selectedValues={currentFilterState.languages}
									onToggle={handleToggleFilterValue}
									color="cyan"
								/>
							)}
						</Stack>
					</Stack>
				</Collapse>
			</Stack>
		</Card>
	);
}
