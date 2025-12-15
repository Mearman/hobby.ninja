"use client";

import {
	getBrandById,
	getCategoryById,
	getGradeById,
	getNodeDisplayName,
	getNodeReleaseDateSortable,
	getSeriesById,
	Item,
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



// Helper function to format date string from YYYYMMDD to YYYY/MM/DD
function formatDisplayDate(dateStr: string): string {
	if (dateStr.length !== 8) return dateStr;
	const year = dateStr.slice(0, 4);
	const month = dateStr.slice(4, 6);
	const day = dateStr.slice(6, 8);
	return `${year}/${month}/${day}`;
}

// Generate year marks for the slider (every 5 years)
function generateYearMarks(minDate: string, maxDate: string): Array<{ value: number; label: string }> {
	const marks: Array<{ value: number; label: string }> = [];

	const startYear = parseInt(minDate.slice(0, 4));
	const endYear = parseInt(maxDate.slice(0, 4));

	// Add 5-year interval marks between the range
	for (let year = startYear; year <= endYear; year += 5) {
		// Skip start year - we don't want to show it as a mark
		if (year === startYear) continue;

		// Don't add marks beyond the end year
		if (year > endYear) break;

		// For the end year, only add if it's exactly on a 5-year interval
		if (year === endYear && endYear % 5 !== 0) break;

		// Create a date for January 1st of each year (actual year boundary)
		const yearStartDate = `${year}0101`; // January 1st of each year
		marks.push({
			value: dateToNumber(yearStartDate),
			label: year.toString()
		});
	}

	return marks;
}

// Generate all year snap points for snapping functionality
function generateYearSnapPoints(minDate: string, maxDate: string): number[] {
	const snapPoints: number[] = [];

	const startYear = parseInt(minDate.slice(0, 4));
	const endYear = parseInt(maxDate.slice(0, 4));

	// Add all years as snap points
	for (let year = startYear; year <= endYear; year++) {
		// Create a date for January 1st of each year (actual year boundary)
		const yearStartDate = `${year}0101`; // January 1st of each year
		snapPoints.push(dateToNumber(yearStartDate));
	}

	return snapPoints;
}

// Snap value to nearest year within a threshold
function snapToNearestYear(value: number, snapPoints: number[], thresholdMs: number = 45 * 24 * 60 * 60 * 1000): number {
	// Find the nearest snap point
	let nearestSnap = snapPoints[0];
	let minDistance = Math.abs(value - nearestSnap);

	for (const snapPoint of snapPoints) {
		const distance = Math.abs(value - snapPoint);
		if (distance < minDistance) {
			minDistance = distance;
			nearestSnap = snapPoint;
		}
	}

	// Only snap if within threshold (45 days = ~1.5 months)
	if (minDistance <= thresholdMs) {
		return nearestSnap;
	}

	return value;
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

// Helper function to convert YYYYMMDD to numeric value for slider (days since epoch)
function dateToNumber(dateStr: string): number {
	if (dateStr.length !== 8) return 0;
	const year = Number.parseInt(dateStr.slice(0, 4), 10);
	const month = Number.parseInt(dateStr.slice(4, 6), 10);
	const day = Number.parseInt(dateStr.slice(6, 8), 10);
	// Create Date object (months are 0-indexed)
	const date = new Date(year, month - 1, day);
	return date.getTime();
}

// Helper function to convert numeric slider value back to YYYYMMDD
function numberToDate(timestamp: number): string {
	const date = new Date(timestamp);
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${year}${month}${day}`;
}

// Helper function to fix date for UI display
function fixDateForUI(dateStr: string, isEndDate: boolean): string {
	const year = dateStr.slice(0, 4);
	const month = dateStr.slice(4, 6);
	const day = dateStr.slice(6, 8);

	if (day === "00") {
		// If no day specified, use first day for start date, last day for end date
		if (isEndDate) {
			// Get last day of the month
			const lastDay = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10), 0).getDate();
			return `${year}${month}${lastDay.toString().padStart(2, "0")}`;
		} else {
			// Use first day of month
			return `${year}${month}01`;
		}
	}

	return dateStr;
}

// Helper function to get date range from items
function getDateRangeFromItems(items: Item[]): { minDate: string; maxDate: string } {
	if (!items.length) {
		const today = new Date();
		const todayStr = today.getFullYear().toString() +
			(today.getMonth() + 1).toString().padStart(2, '0') +
			today.getDate().toString().padStart(2, '0');
		return { minDate: todayStr, maxDate: todayStr };
	}

	// Extract valid dates from items
	const dates: string[] = [];
	for (const item of items) {
		const date = getNodeReleaseDateSortable(item);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (date && date.length === 8) {
			dates.push(date);
		}
	}

	if (dates.length === 0) {
		const today = new Date();
		const todayStr = today.getFullYear().toString() +
			(today.getMonth() + 1).toString().padStart(2, '0') +
			today.getDate().toString().padStart(2, '0');
		return { minDate: todayStr, maxDate: todayStr };
	}

	// Find min and max dates - use first date as initial value since we know dates.length > 0
	const [firstDate, ...remainingDates] = dates;
	let minDate = firstDate;
	let maxDate = firstDate;

	for (const date of remainingDates) {
		if (date < minDate) minDate = date;
		if (date > maxDate) maxDate = date;
	}

	// Fix dates for UI display
	const fixedMinDate = fixDateForUI(minDate, false); // Start date = first day
	const fixedMaxDate = fixDateForUI(maxDate, true);  // End date = last day

	return { minDate: fixedMinDate, maxDate: fixedMaxDate };
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
	items?: Item[];
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

		// Store non-null assertions for use within this function
		const safeField = field;
		const safeOnToggle = onToggle;

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
										onClick={() => { safeOnToggle(safeField, value); }}
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
									onClick={() => { safeOnToggle(safeField, value); }}
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
			{!expanded && selectedValues.length > 0 && field && onToggle && (
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
	items,
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

	// Local state for immediate slider visual feedback (debounced filtering)
	const [sliderValue, setSliderValue] = useState<[number, number] | null>(null);
	// Local state for date input values that sync with slider during drag
	const [dateInputValues, setDateInputValues] = useState<[string, string] | null>(null);
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
									{(() => {
										const { minDate, maxDate } = getDateRangeFromItems(items || []);

										// Set default values if no date range is currently selected
										const defaultStartDate = filterState.dateRange?.[0] ?? minDate;
										const defaultEndDate = filterState.dateRange?.[1] ?? maxDate;
										const yearSnapPoints = generateYearSnapPoints(minDate, maxDate);

										return (
											<>
												<RangeSlider
															size="sm"
															min={dateToNumber(minDate)}
															max={dateToNumber(maxDate)}
															step={86400000} // 1 day in milliseconds
															value={sliderValue || [
																filterState.dateRange?.[0] ? dateToNumber(filterState.dateRange[0]) : dateToNumber(defaultStartDate),
																filterState.dateRange?.[1] ? dateToNumber(filterState.dateRange[1]) : dateToNumber(defaultEndDate),
															]}
															onChange={(values) => {
																// Apply snapping to both values
																const snappedValues = [
																	snapToNearestYear(values[0], yearSnapPoints),
																	snapToNearestYear(values[1], yearSnapPoints)
																];

																// Only update if values actually changed to avoid infinite loops
																if (snappedValues[0] !== values[0] || snappedValues[1] !== values[1]) {
																	setSliderValue(snappedValues);
																	// Update date input values in real-time
																	const [startTimestamp, endTimestamp] = snappedValues;
																	const startDate = numberToDate(startTimestamp);
																	const endDate = numberToDate(endTimestamp);
																	setDateInputValues([startDate, endDate]);
																} else {
																	// Still update local state and input values even without snapping
																	setSliderValue(values);
																	const [startTimestamp, endTimestamp] = values;
																	const startDate = numberToDate(startTimestamp);
																	const endDate = numberToDate(endTimestamp);
																	setDateInputValues([startDate, endDate]);
																}
															}}
															onChangeEnd={(values) => {
																// Apply final snapping on release
																const snappedValues = [
																	snapToNearestYear(values[0], yearSnapPoints),
																	snapToNearestYear(values[1], yearSnapPoints)
																];

																// Clear local state and trigger actual filtering
																setSliderValue(null);
																setDateInputValues(null);
																const [startTimestamp, endTimestamp] = snappedValues;
																const startDate = numberToDate(startTimestamp);
																const endDate = numberToDate(endTimestamp);
																onFilterChange({ dateRange: [startDate, endDate] });
															}}
													label={false}
													showLabelOnHover={false}
													tooltipProps={{
														opened: false,
														disabled: true
													}}
													marks={generateYearMarks(minDate, maxDate)}
													styles={{
														track: { height: 6 },
														trackContainer: { height: 6 },
														bar: { height: 6 },
														thumb: { borderWidth: 2, width: 20, height: 20 },
														dragged: { transform: "scale(1.05)" },
														// Complete tooltip removal
														label: { display: "none" },
														tooltip: { display: "none !important" },
													}}
												/>
												<Group gap="sm" mt="md">
													<TextInput
														size="xs"
														type="date"
														placeholder="Start date"
														value={formatForDateInput(dateInputValues?.[0] ?? defaultStartDate)}
														onChange={(e) => {
															const dateValue = e.target.value;
															if (dateValue) {
																// Clear local slider states when user manually types
																setSliderValue(null);
																setDateInputValues(null);
																const formatted = parseDateInput(dateValue);
																const currentRange = filterState.dateRange ?? [minDate, maxDate];
																onFilterChange({ dateRange: [formatted, currentRange[1]] });
															}
														}}
														style={{ flex: 1 }}
														min={formatForDateInput(minDate)}
														max={formatForDateInput(maxDate)}
													/>
													<Text size="xs" c="dimmed">to</Text>
													<TextInput
														size="xs"
														type="date"
														placeholder="End date"
														value={formatForDateInput(dateInputValues?.[1] ?? defaultEndDate)}
														onChange={(e) => {
															const dateValue = e.target.value;
															if (dateValue) {
																// Clear local slider states when user manually types
																setSliderValue(null);
																setDateInputValues(null);
																const formatted = parseDateInput(dateValue);
																const currentRange = filterState.dateRange ?? [minDate, maxDate];
																onFilterChange({ dateRange: [currentRange[0], formatted] });
															}
														}}
														style={{ flex: 1 }}
														min={formatForDateInput(defaultStartDate)}
														max={formatForDateInput(maxDate)}
													/>
												</Group>
												<Group gap="sm" mt="xs">
													<Badge
														size="sm"
														variant={filterState.showNoDate ? "filled" : "light"}
														color="gray"
														onClick={() => {
															onFilterChange({ showNoDate: !filterState.showNoDate });
														}}
														rightSection={
															filterState.showNoDate ? (
																<ActionIcon size="xs" variant="transparent" onClick={(e) => {
																	e.stopPropagation();
																	onFilterChange({ showNoDate: false });
																}}>
																	<IconX size={10} />
																</ActionIcon>
															) : null
														}
													>
														Other (no date)
													</Badge>
												</Group>
											</>
										);
									})()}
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
						{/* Other (no date) Badge */}
						{filterState.showNoDate ? (
							<Badge
								key="no-date"
								size="sm"
								variant="light"
								color="gray"
								rightSection={
									<ActionIcon
										size="xs"
										variant="transparent"
										onClick={() => { onFilterChange({ showNoDate: false }); }}
									>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								Other (no date)
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
