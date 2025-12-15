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
	Collapse,
	Divider,
	Group,
	RangeSlider,
	Select,
	Stack,
	Text,
	TextInput,
	Tooltip,
	UnstyledButton,
} from "@mantine/core";
import {
	IconChevronDown,
	IconChevronUp,
	IconChecks,
	IconFilter,
	IconSearch,
	IconSortAscending,
	IconSortDescending,
	IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";

import { HierarchicalGradeFilter } from "@/components/filtering/hierarchical-grade-filter";
import { FilterState } from "@/hooks/use-filtered-items";
import { useUserPreferences } from "@/hooks/use-user-preferences";


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

// Constants for scale handling
const FALLBACK_MAX_SCALE = 100_000;

// Helper functions for scale range slider
// Convert scale string (e.g., "1/144") to numeric denominator
function scaleToNumber(scale: string): number {
	const match = /1\/(\d+)/.exec(scale);
	return match ? Number.parseInt(match[1], 10) : 1;
}

// Generate scale marks for logarithmic slider from available scale data
function getScaleMarks(availableScales: string[]) {
	const scaleNumbers = availableScales
		.map(scale => scaleToNumber(scale))
		.toSorted((a, b) => a - b);

	if (scaleNumbers.length === 0) return [];

	// Use the actual scale values for marks
	return scaleNumbers.map(scale => ({
		value: scale,
		label: `1/${scale.toLocaleString()}`,
	}));
}

// Snap logarithmic value to nearest actual scale from data
function snapToNearestScale(logValue: number, availableScales: string[]): number {
	const scaleNumbers = availableScales
		.map(scale => scaleToNumber(scale))
		.toSorted((a, b) => a - b);

	if (scaleNumbers.length === 0) return logValue;

	// Convert actual scales to logarithmic space for comparison
	const logScales = scaleNumbers.map(scale => Math.log10(scale));

	let nearestLogScale = logScales[0];
	let minDistance = Math.abs(logScales[0] - logValue);

	for (const logScale of logScales) {
		const distance = Math.abs(logScale - logValue);
		if (distance < minDistance) {
			minDistance = distance;
			nearestLogScale = logScale;
		}
	}

	return nearestLogScale;
}

// Helper function to format date string from YYYYMMDD to YYYY/MM/DD
function formatDisplayDate(dateStr: string): string {
	if (dateStr.length !== 8) return dateStr;
	const year = dateStr.slice(0, 4);
	const month = dateStr.slice(4, 6);
	const day = dateStr.slice(6, 8);
	return `${year}/${month}/${day}`;
}

// Helper function to format YYYYMMDD to YYYY-MM-DD for date input
function formatForDateInput(dateStr: string): string {
	if (dateStr.length !== 8) return "";
	const year = dateStr.slice(0, 4);
	const month = dateStr.slice(4, 6);
	const day = dateStr.slice(6, 8);
	return `${year}-${month}-${day}`;
}

// Helper function to parse YYYY-MM-DD to YYYYMMDD
function parseDateInput(dateStr: string): string {
	return dateStr.replaceAll("-", "");
}

type ArrayFilterField = "brands" | "grades" | "scales" | "series" | "categories";

// Shared style for filter images - match aspect ratio of reference images (300x170 ≈ 1.76:1)
const FILTER_IMAGE_HEIGHT = 56;
const FILTER_IMAGE_WIDTH = 99; // 56 * (300/170) to match reference image aspect ratio

// Drop shadow for images that may have transparency (PNG/SVG) - makes white logos visible on white background
const TRANSPARENT_IMAGE_FILTER = "drop-shadow(0 0 1px rgba(0,0,0,0.7)) drop-shadow(0 0 2px rgba(0,0,0,0.5))";

// Check if image might have transparency based on file extension
const mightHaveTransparency = (src: string) => /\.(png|svg)$/i.test(src);

const getFilterImageStyle = (src: string): React.CSSProperties => ({
	maxHeight: "100%",
	maxWidth: "100%",
	objectFit: "contain",
	filter: mightHaveTransparency(src) ? TRANSPARENT_IMAGE_FILTER : undefined,
});

// Background color for filter buttons
const FILTER_BUTTON_BG_UNSELECTED = "white";

// Base style for all filter button containers - consistent sizing with aspect ratio matching reference images
const FILTER_BUTTON_BASE_STYLE: React.CSSProperties = {
	height: FILTER_IMAGE_HEIGHT,
	width: FILTER_IMAGE_WIDTH,
	borderRadius: 8,
	overflow: "hidden",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
};

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
	onToggleGradeFamily: (rootGradeId: string) => void;
	onClearFilters: () => void;
	hasActiveFilters?: boolean;
	activeFilterCount?: number;
	title?: string;
	subtitle?: string;
}

interface FilterSectionProps {
	label: string;
	field?: ArrayFilterField;
	options?: string[];
	selectedValues?: string[];
	onToggle?: (field: ArrayFilterField, value: string) => void;
	formatValue?: (value: string) => string;
	getImage?: (value: string) => string | undefined;
	color?: string;
	displayMode?: "icon" | "text";
	headerAction?: React.ReactNode;
	children?: React.ReactNode;
}

function FilterSection({
	label,
	field,
	options = [],
	selectedValues = [],
	onToggle,
	formatValue = (v) => v,
	getImage,
	color = "blue",
	displayMode,
	headerAction,
	children,
}: FilterSectionProps) {
	const [expanded, setExpanded] = useState(false);

	// Return early if no options and no children
	if (options.length === 0 && !children) return null;

	// Check if a value has an image available
	const hasImage = (value: string) => displayMode === "icon" && Boolean(getImage?.(value));

	// Helper to render chip content based on display mode
	const renderChipContent = (value: string) => {
		const imageSrc = getImage?.(value);
		// Only show icon if in icon mode AND image exists
		if (displayMode === "icon" && imageSrc) {
			return (
				<Image
					src={imageSrc}
					alt={formatValue(value)}
					width={120}
					height={FILTER_IMAGE_HEIGHT}
					style={getFilterImageStyle(imageSrc)}
				/>
			);
		}
		return formatValue(value);
	};

	// Render filter options content
	const renderFilterOptions = () => {
		if (!field || !onToggle || options.length === 0) return null;

		return (
			<>
				{/* Show all options when expanded */}
				<Group gap="xs" wrap="wrap" mt="xs">
					{options.map((value) => {
						const isSelected = selectedValues.includes(value);
						const hasAnySelection = selectedValues.length > 0;
						if (hasImage(value)) {
							return (
								<Tooltip key={value} label={formatValue(value)} position="top" withArrow={true}>
									<UnstyledButton
										onClick={() => { onToggle(field, value); }}
										style={{
											...FILTER_BUTTON_BASE_STYLE,
											border: `2px solid var(--mantine-color-${color}-${isSelected ? "filled" : "outline"})`,
											background: isSelected ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
											opacity: hasAnySelection && !isSelected ? 0.7 : 1,
										}}
									>
										{renderChipContent(value)}
									</UnstyledButton>
								</Tooltip>
							);
						}
						return (
							<Tooltip key={value} label={formatValue(value)} position="top" withArrow={true}>
								<UnstyledButton
									onClick={() => { onToggle(field, value); }}
									style={{
										...FILTER_BUTTON_BASE_STYLE,
										border: `2px solid var(--mantine-color-${color}-${isSelected ? "filled" : "outline"})`,
										background: isSelected ? `var(--mantine-color-${color}-filled)` : FILTER_BUTTON_BG_UNSELECTED,
										color: isSelected ? "white" : `var(--mantine-color-${color}-filled)`,
										opacity: hasAnySelection && !isSelected ? 0.7 : 1,
									}}
								>
									<Text size="xs" fw={500} lineClamp={2} ta="center">
										{formatValue(value)}
									</Text>
								</UnstyledButton>
							</Tooltip>
						);
					})}
				</Group>
			</>
		);
	};

	return (
		<Box>
			{/* Accordion Header */}
			<Group justify="space-between" mb={expanded ? "xs" : 0}>
				<UnstyledButton
					onClick={() => { setExpanded(!expanded); }}
					style={{ flex: 1 }}
				>
					<Group gap="xs">
						{expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
						<Text size="sm" fw={500}>
							{label}
						</Text>
						{options.length > 0 && (
							<Text size="xs" c="dimmed">
								({options.length})
							</Text>
						)}
						{selectedValues.length > 0 && (
							<Badge size="xs" variant="filled" color={color}>
								{selectedValues.length} selected
							</Badge>
						)}
					</Group>
				</UnstyledButton>
				{headerAction}
			</Group>

			{/* Collapsed: Show selected values only */}
			{!expanded && selectedValues.length > 0 && (
				<Group gap="xs" wrap="wrap" mt="xs">
					{selectedValues.map((value) => {
						if (hasImage(value)) {
							return (
								<Tooltip key={value} label={formatValue(value)} position="top" withArrow={true}>
									<UnstyledButton
										onClick={() => { onToggle(field, value); }}
										style={{
											...FILTER_BUTTON_BASE_STYLE,
											border: `2px solid var(--mantine-color-${color}-filled)`,
											background: `var(--mantine-color-${color}-filled)`,
										}}
									>
										{renderChipContent(value)}
									</UnstyledButton>
								</Tooltip>
							);
						}
						return (
							<Tooltip key={value} label={formatValue(value)} position="top" withArrow={true}>
								<UnstyledButton
									onClick={() => { onToggle(field, value); }}
									style={{
										...FILTER_BUTTON_BASE_STYLE,
										border: `2px solid var(--mantine-color-${color}-filled)`,
										background: `var(--mantine-color-${color}-filled)`,
										color: "white",
									}}
								>
									<Text size="xs" fw={500} lineClamp={2} ta="center">
										{formatValue(value)}
									</Text>
								</UnstyledButton>
							</Tooltip>
						);
					})}
				</Group>
			)}

			{/* Content when expanded */}
			{expanded && (
				<Box mt="xs">
					{/* Show filter options */}
					{renderFilterOptions()}

					{/* Show custom content with divider if both exist */}
					{children && (
						<>
							{field && options.length > 0 && <Divider my="sm" />}
							{children}
						</>
					)}
				</Box>
			)}
		</Box>
	);
}

export function ItemFilters({
	filterState,
	availableOptions,
	onFilterChange,
	onSearchChange,
	onToggleFilterValue,
	onToggleGradeFamily,
	onClearFilters,
	hasActiveFilters = false,
	activeFilterCount = 0,
	title = "Filters",
	subtitle,
}: ItemFiltersProps) {
	const [filtersExpanded, setFiltersExpanded] = useState(true);
	const { preferences, updatePreference } = useUserPreferences();
	const displayMode = preferences.filterDisplayMode;

	const toggleDisplayMode = () => {
		updatePreference("filterDisplayMode", displayMode === "icon" ? "text" : "icon");
	};

	// Filter out brands that are actually grades to avoid duplication
	const getFilteredBrands = () => {
		if (!preferences.hideGradeBrands) {
			return availableOptions.brands;
		}
		return availableOptions.brands.filter(brandId => {
			const brand = getBrandById(brandId);
			// Filter out if the brand is marked as a grade
			return !brand?.isGrade;
		});
	};

	// Get filtered brands before using them
	const filteredBrands = getFilteredBrands();

	// Bulk operations for filter sections
	const selectAllGrades = () => {
		onFilterChange({ grades: availableOptions.grades });
	};

	const clearGrades = () => {
		onFilterChange({ grades: [] });
	};

	const selectAllBrands = () => {
		onFilterChange({ brands: filteredBrands });
	};

	const clearBrands = () => {
		onFilterChange({ brands: [] });
	};

	const selectAllSeries = () => {
		onFilterChange({ series: availableOptions.series });
	};

	const clearSeries = () => {
		onFilterChange({ series: [] });
	};

	const selectAllCategories = () => {
		onFilterChange({ categories: availableOptions.categories });
	};

	const clearCategories = () => {
		onFilterChange({ categories: [] });
	};

	const selectAllScales = () => {
		onFilterChange({ scales: availableOptions.scales });
	};

	const clearScales = () => {
		onFilterChange({ scales: [] });
	};

	// Helper function to create select all and clear buttons for filter sections
	const createFilterActions = (selectedCount: number, totalCount: number, onSelectAll: () => void, onClear: () => void, color: string) => (
		<Group gap="xs">
			{selectedCount < totalCount && (
				<Tooltip label="Select all">
					<ActionIcon
						variant="light"
						size="sm"
						color={color}
						onClick={(e) => { e.stopPropagation(); onSelectAll(); }}
						title="Select all"
					>
						<IconChecks size={14} />
					</ActionIcon>
				</Tooltip>
			)}
			{selectedCount > 0 && (
				<Tooltip label="Clear selection">
					<ActionIcon
						variant="light"
						size="sm"
						color="red"
						onClick={(e) => { e.stopPropagation(); onClear(); }}
						title="Clear selection"
					>
						<IconX size={14} />
					</ActionIcon>
				</Tooltip>
			)}
		</Group>
	);

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
								displayMode={displayMode}
								headerAction={createFilterActions(
									filterState.categories.length,
									availableOptions.categories.length,
									selectAllCategories,
									clearCategories,
									"grape",
								)}
							/>

							<FilterSection
								label="Brands"
								field="brands"
								options={filteredBrands}
								selectedValues={filterState.brands}
								onToggle={onToggleFilterValue}
								formatValue={formatBrandName}
								getImage={(id) => getBrandById(id)?.image}
								color="blue"
								displayMode={displayMode}
								headerAction={createFilterActions(
									filterState.brands.length,
									filteredBrands.length,
									selectAllBrands,
									clearBrands,
									"blue",
								)}
							/>

							<FilterSection
								label="Series"
								field="series"
								options={availableOptions.series}
								selectedValues={filterState.series}
								onToggle={onToggleFilterValue}
								formatValue={formatSeriesName}
								getImage={(id) => getSeriesById(id)?.image}
								color="violet"
								displayMode={displayMode}
								headerAction={createFilterActions(
									filterState.series.length,
									availableOptions.series.length,
									selectAllSeries,
									clearSeries,
									"violet",
								)}
							/>

							<HierarchicalGradeFilter
								availableGrades={availableOptions.grades}
								selectedGrades={filterState.grades}
								onToggle={(gradeId) => { onToggleFilterValue("grades", gradeId); }}
								onToggleFamily={onToggleGradeFamily}
								displayMode={displayMode}
								onDisplayModeToggle={toggleDisplayMode}
								color="teal"
								onSelectAll={selectAllGrades}
								onClearSection={clearGrades}
							/>

							<FilterSection
								label="Scales"
								field="scales"
								options={availableOptions.scales}
								selectedValues={filterState.scales}
								onToggle={onToggleFilterValue}
								color="orange"
								displayMode={displayMode}
								headerAction={createFilterActions(
									filterState.scales.length,
									availableOptions.scales.length,
									selectAllScales,
									clearScales,
									"orange",
								)}
							>

								{/* Scale Range Slider - now inside the accordion */}
								{(() => {
									// Calculate min/max from available scales
									const scaleNumbers = availableOptions.scales.map(scale => scaleToNumber(scale));
									const minScale = scaleNumbers.length > 0 ? Math.min(...scaleNumbers) : 1;
									const maxScale = scaleNumbers.length > 0 ? Math.max(...scaleNumbers) : FALLBACK_MAX_SCALE;

									// Use active range or default to full range
									const currentRange = filterState.scaleRange ?? [minScale, maxScale];

									return (
										<>
											<Group justify="space-between" mb="xs">
												<Text size="sm" fw={500}>Scale Range</Text>
												{filterState.scaleRange && (filterState.scaleRange[0] !== minScale || filterState.scaleRange[1] !== maxScale) ? (
													<Button
														size="compact-xs"
														variant="subtle"
														onClick={() => { onFilterChange({ scaleRange: null }); }}
													>
														Clear
													</Button>
												) : null}
											</Group>
											<RangeSlider
												size="sm"
												min={Math.log10(minScale)}
												max={Math.log10(maxScale)}
												value={currentRange.map(v => Math.log10(v)) as [number, number]}
												onChange={(logValue) => {
													const snappedLogRange = [
														snapToNearestScale(logValue[0], availableOptions.scales),
														snapToNearestScale(logValue[1], availableOptions.scales),
													];
													const actualRange = [
														Math.round(Math.pow(10, snappedLogRange[0])),
														Math.round(Math.pow(10, snappedLogRange[1])),
													];
													onFilterChange({ scaleRange: actualRange as [number, number] });
												}}
												marks={getScaleMarks(availableOptions.scales).map(mark => ({
													value: Math.log10(mark.value),
													label: mark.label,
												}))}
												label={(logValue) => `1/${Math.round(Math.pow(10, logValue)).toLocaleString()}`}
												styles={{
													label: { fontSize: "10px" },
													markLabel: { fontSize: "9px" },
												}}
											/>
											<Text size="xs" c="dimmed" mt="xs">
												Showing scales from 1/{currentRange[1].toLocaleString()} to 1/{currentRange[0].toLocaleString()}
											</Text>
										</>
									);
								})()}
							</FilterSection>

							<FilterSection
								label="Date Range"
								color="blue"
								headerAction={filterState.dateRange ? (
									<Button
										size="compact-xs"
										variant="subtle"
										onClick={() => { onFilterChange({ dateRange: null }); }}
									>
										Clear
									</Button>
								) : (
									<Box />
								)}
							>
								<Stack gap="sm">
									<Group gap="sm">
										<TextInput
											size="xs"
											type="date"
											placeholder="Start date"
											value={filterState.dateRange?.[0] ? formatForDateInput(filterState.dateRange[0]) : ""}
											onChange={(e) => {
												const dateValue = e.target.value;
												if (dateValue) {
													const formatted = parseDateInput(dateValue);
													const currentRange = filterState.dateRange ?? ["", ""];
													onFilterChange({ dateRange: [formatted, currentRange[1]] });
												}
											}}
											style={{ flex: 1 }}
											max={new Date().toISOString().split("T")[0]}
										/>
										<Text size="xs" c="dimmed">to</Text>
										<TextInput
											size="xs"
											type="date"
											placeholder="End date"
											value={filterState.dateRange?.[1] ? formatForDateInput(filterState.dateRange[1]) : ""}
											onChange={(e) => {
												const dateValue = e.target.value;
												if (dateValue) {
													const formatted = parseDateInput(dateValue);
													const currentRange = filterState.dateRange ?? ["", ""];
													onFilterChange({ dateRange: [currentRange[0], formatted] });
												}
											}}
											style={{ flex: 1 }}
											max={new Date().toISOString().split("T")[0]}
											min={filterState.dateRange?.[0] ? formatForDateInput(filterState.dateRange[0]) : undefined}
										/>
									</Group>
									{filterState.dateRange?.[0] && filterState.dateRange[1] ? (
										<Text size="xs" c="dimmed" mt="xs">
											Showing items from {formatDisplayDate(filterState.dateRange[0])} to {formatDisplayDate(filterState.dateRange[1])}
										</Text>
									) : null}
								</Stack>
							</FilterSection>
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
						{filterState.brands.map(brand => {
							const brandData = getBrandById(brand);
							const brandImage = brandData?.image;
							const badge = (
								<Badge
									key={`brand-${brand}`}
									size={brandImage ? "lg" : "sm"}
									variant="light"
									color="blue"
									styles={brandImage ? { root: { paddingLeft: 4, paddingRight: 6 } } : undefined}
									leftSection={
										brandImage ? (
											<Image src={brandImage} alt={formatBrandName(brand)} width={FILTER_IMAGE_HEIGHT} height={FILTER_IMAGE_HEIGHT} style={getFilterImageStyle(brandImage)} />
										) : null
									}
									rightSection={
										<ActionIcon size="xs" variant="transparent" onClick={() => { onToggleFilterValue("brands", brand); }}>
											<IconX size={12} />
										</ActionIcon>
									}
								>
									{brandImage ? null : formatBrandName(brand)}
								</Badge>
							);
							return brandImage ? (
								<Tooltip key={`brand-${brand}`} label={formatBrandName(brand)} position="top" withArrow={true}>
									{badge}
								</Tooltip>
							) : badge;
						})}
						{filterState.grades.map(grade => {
							const gradeData = getGradeById(grade);
							const gradeImage = gradeData?.image;
							const badge = (
								<Badge
									key={`grade-${grade}`}
									size={gradeImage ? "lg" : "sm"}
									variant="light"
									color="teal"
									styles={gradeImage ? { root: { paddingLeft: 4, paddingRight: 6 } } : undefined}
									leftSection={
										gradeImage ? (
											<Image src={gradeImage} alt={formatGradeName(grade)} width={FILTER_IMAGE_HEIGHT} height={FILTER_IMAGE_HEIGHT} style={getFilterImageStyle(gradeImage)} />
										) : null
									}
									rightSection={
										<ActionIcon size="xs" variant="transparent" onClick={() => { onToggleFilterValue("grades", grade); }}>
											<IconX size={12} />
										</ActionIcon>
									}
								>
									{gradeImage ? null : formatGradeName(grade)}
								</Badge>
							);
							return gradeImage ? (
								<Tooltip key={`grade-${grade}`} label={formatGradeName(grade)} position="top" withArrow={true}>
									{badge}
								</Tooltip>
							) : badge;
						})}
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
						{/* Scale Range Badge */}
						{filterState.scaleRange && (() => {
							// Calculate min/max from available scales
							const scaleNumbers = availableOptions.scales.map(scale => scaleToNumber(scale));
							const minScale = scaleNumbers.length > 0 ? Math.min(...scaleNumbers) : 1;
							const maxScale = scaleNumbers.length > 0 ? Math.max(...scaleNumbers) : FALLBACK_MAX_SCALE;

							return filterState.scaleRange[0] !== minScale || filterState.scaleRange[1] !== maxScale ? (
								<Badge
									key="scale-range"
									size="sm"
									variant="light"
									color="orange"
									rightSection={
										<ActionIcon
											size="xs"
											variant="transparent"
											onClick={() => { onFilterChange({ scaleRange: null }); }}
										>
											<IconX size={10} />
										</ActionIcon>
									}
								>
									Range: 1/{filterState.scaleRange[1].toLocaleString()} - 1/{filterState.scaleRange[0].toLocaleString()}
								</Badge>
							) : null;
						})()}
						{/* Date Range Badge */}
						{filterState.dateRange?.[0] && filterState.dateRange[1] ? (
							<Badge
								key="date-range"
								size="sm"
								variant="light"
								color="blue"
								rightSection={
									<ActionIcon
										size="xs"
										variant="transparent"
										onClick={() => { onFilterChange({ dateRange: null }); }}
									>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								{formatDisplayDate(filterState.dateRange[0])} - {formatDisplayDate(filterState.dateRange[1])}
							</Badge>
						) : null}
						{filterState.series.map(s => {
							const seriesData = getSeriesById(s);
							const seriesImage = seriesData?.image;
							const badge = (
								<Badge
									key={`series-${s}`}
									size={seriesImage ? "lg" : "sm"}
									variant="light"
									color="violet"
									styles={seriesImage ? { root: { paddingLeft: 4, paddingRight: 6 } } : undefined}
									leftSection={
										seriesImage ? (
											<Image src={seriesImage} alt={formatSeriesName(s)} width={FILTER_IMAGE_HEIGHT} height={FILTER_IMAGE_HEIGHT} style={getFilterImageStyle(seriesImage)} />
										) : null
									}
									rightSection={
										<ActionIcon size="xs" variant="transparent" onClick={() => { onToggleFilterValue("series", s); }}>
											<IconX size={12} />
										</ActionIcon>
									}
								>
									{seriesImage ? null : formatSeriesName(s)}
								</Badge>
							);
							return seriesImage ? (
								<Tooltip key={`series-${s}`} label={formatSeriesName(s)} position="top" withArrow={true}>
									{badge}
								</Tooltip>
							) : badge;
						})}
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
