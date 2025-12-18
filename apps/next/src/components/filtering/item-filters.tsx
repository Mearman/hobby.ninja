"use client";

import {
	getBrandById,
	getCategoryById,
	getGradeById,
	getNodeDisplayName,
	getNodeReleaseDateSortable,
	getSeriesById,
	isItem,
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
	Switch,
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
import { useState, useMemo } from "react";

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

	const startYear = Number.parseInt(minDate.slice(0, 4));
	const endYear = Number.parseInt(maxDate.slice(0, 4));

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
			label: year.toString(),
		});
	}

	return marks;
}

// Generate all year snap points for snapping functionality
function generateYearSnapPoints(minDate: string, maxDate: string): number[] {
	const snapPoints: number[] = [];

	const startYear = Number.parseInt(minDate.slice(0, 4));
	const endYear = Number.parseInt(maxDate.slice(0, 4));

	// Add all years as snap points
	for (let year = startYear; year <= endYear; year++) {
		// Create a date for January 1st of each year (actual year boundary)
		const yearStartDate = `${year}0101`; // January 1st of each year
		snapPoints.push(dateToNumber(yearStartDate));
	}

	return snapPoints;
}

// Snap value to nearest year within a threshold
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const SECONDS_IN_MINUTE = 60;
const MS_IN_SECOND = 1000;
const YEAR_THRESHOLD_DAYS = 45;

function snapToNearestYear(value: number, snapPoints: number[], thresholdMs: number = YEAR_THRESHOLD_DAYS * HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MS_IN_SECOND): number {
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
	if (items.length === 0) {
		const today = new Date();
		const todayStr = today.getFullYear().toString() +
			(today.getMonth() + 1).toString().padStart(2, "0") +
			today.getDate().toString().padStart(2, "0");
		return { minDate: todayStr, maxDate: todayStr };
	}

	// Extract valid dates from items
	const dates: string[] = [];
	for (const item of items) {
		const date = getNodeReleaseDateSortable(item);
		 
		if (date.length === 8) {
			dates.push(date);
		}
	}

	if (dates.length === 0) {
		const today = new Date();
		const todayStr = today.getFullYear().toString() +
			(today.getMonth() + 1).toString().padStart(2, "0") +
			today.getDate().toString().padStart(2, "0");
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

// Shared style for filter chips - using brand image aspect ratio (300x170)
const FILTER_IMAGE_WIDTH = 300;
const FILTER_IMAGE_HEIGHT = 170;
const FILTER_CHIP_WIDTH = 100;
const FILTER_CHIP_HEIGHT = Math.round(FILTER_CHIP_WIDTH * (FILTER_IMAGE_HEIGHT / FILTER_IMAGE_WIDTH));

// Drop shadow for images that may have transparency (PNG/SVG) - makes white logos visible on white background
const TRANSPARENT_IMAGE_FILTER = "drop-shadow(0 0 1px rgba(0,0,0,0.7)) drop-shadow(0 0 2px rgba(0,0,0,0.5))";

// Check if image might have transparency based on file extension
const mightHaveTransparency = (src: string) => /\.(png|svg)$/i.test(src);

const getFilterImageStyle = (src: string): React.CSSProperties => ({
	display: "block",
	width: "100%",
	height: "100%",
	objectFit: "contain",
	margin: 0,
	padding: 0,
	filter: mightHaveTransparency(src) ? TRANSPARENT_IMAGE_FILTER : undefined,
});

// Background color for filter buttons
const FILTER_BUTTON_BG_UNSELECTED = "white";

// Text colors for count displays
const COUNT_PRIMARY_COLOR_SELECTED = "rgba(255,255,255,0.7)";
const COUNT_PRIMARY_COLOR_UNSELECTED = "rgba(0,0,0,0.8)";
const COUNT_SECONDARY_COLOR_SELECTED = "white";
const COUNT_SECONDARY_COLOR_UNSELECTED = "black";

// Common black color constant for unselected text
const UNSELECTED_TEXT_COLOR = "black";

// Base style for all filter button containers - using correct aspect ratio
const FILTER_BUTTON_BASE_STYLE: React.CSSProperties = {
	width: FILTER_CHIP_WIDTH,
	height: "100%", // Fill grid cell height for equal-height rows
	borderRadius: 8,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "flex-start", // Content wrapper handles centering
	position: "relative",
	cursor: "pointer",
	padding: 0,
	margin: 0,
	transition: "all 0.2s ease",
	overflow: "hidden",
};

// Grid container for filter chips - ensures equal height per row
const FILTER_CHIP_GRID_STYLE: React.CSSProperties = {
	display: "grid",
	gridTemplateColumns: `repeat(auto-fill, ${FILTER_CHIP_WIDTH}px)`,
	gap: "var(--mantine-spacing-xs)",
	alignItems: "stretch",
	marginTop: "var(--mantine-spacing-xs)",
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
	filterCounts?: {
		brands?: Record<string, number>;
		grades?: Record<string, number>;
		scales?: Record<string, number>;
		series?: Record<string, number>;
		categories?: Record<string, number>;
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
	hiddenFilters?: string[];
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
	filterCounts?: Record<string, number>;
	totalCounts?: Record<string, number>;
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
	filterCounts = {},
	totalCounts = {},
}: FilterSectionProps) {
	const [expanded, setExpanded] = useState(false);

	
	// Return early if no options and no children
	if (options.length === 0 && !children) return null;

	// Check if a value has an image available
	const hasImage = (value: string) => displayMode === "icon" && Boolean(getImage?.(value));

	// Helper to render chip content based on display mode
	const renderChipContent = (value: string, isSelected: boolean) => {
		const imageSrc = getImage?.(value);
		const currentCount = filterCounts[value] || 0;
		const totalCount = totalCounts[value] || 0;

		
		// Only show icon if in icon mode AND image exists
		if (displayMode === "icon" && imageSrc) {
			return (
				<div style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					flex: 1,
					width: "100%",
					height: "100%",
				}}>
					{/* Image container - centers image in remaining space */}
					<div style={{
						flex: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}>
						<Image
							src={imageSrc}
							alt={formatValue(value)}
							width={FILTER_CHIP_WIDTH}
							height={FILTER_CHIP_HEIGHT}
							style={getFilterImageStyle(imageSrc)}
						/>
					</div>
					{/* Count display below chip */}
					<div
						style={{
							background: isSelected ? COUNT_PRIMARY_COLOR_UNSELECTED : "rgba(255,255,255,0.9)",
							borderRadius: 3,
							padding: "1px 4px",
							display: "flex",
							alignItems: "center",
							width: "100%",
						}}
					>
						<div
							style={{
								color: isSelected ? COUNT_SECONDARY_COLOR_SELECTED : COUNT_SECONDARY_COLOR_UNSELECTED,
								fontSize: "11px",
								fontWeight: 600,
								lineHeight: 1.2,
								flex: 1,
								textAlign: "center",
							}}
						>
							{currentCount}
						</div>
						<div
							style={{
								color: isSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
								fontSize: "11px",
								fontWeight: 600,
								lineHeight: 1.2,
								flex: "none",
							}}
						>
							/
						</div>
						<div
							style={{
								color: isSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
								fontSize: "11px",
								fontWeight: 600,
								lineHeight: 1.2,
								flex: 1,
								textAlign: "center",
							}}
						>
							{totalCount}
						</div>
					</div>
				</div>
			);
		}

		return (
			<div style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				flex: 1,
				width: "100%",
				height: "100%",
			}}>
				{/* Text container - centers text in remaining space */}
				<div style={{
					flex: 1,
					width: FILTER_CHIP_WIDTH,
					minHeight: FILTER_CHIP_HEIGHT,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "4px 2px",
				}}>
					<Text
						size="xs"
						fw={900}
						ta="center"
						style={{
							color: isSelected ? "white" : UNSELECTED_TEXT_COLOR,
							fontFamily: "Inter, system-ui, -apple-system, sans-serif",
							fontVariantNumeric: "tabular-nums",
							textTransform: "uppercase",
							letterSpacing: -0.5,
							wordBreak: "break-word",
							hyphens: "auto",
						}}
					>
						{formatValue(value)}
					</Text>
				</div>
				{/* Count display below chip */}
				<div
					style={{
						background: isSelected ? COUNT_PRIMARY_COLOR_UNSELECTED : "rgba(255,255,255,0.9)",
						borderRadius: 3,
						padding: "1px 4px",
						display: "flex",
						alignItems: "center",
						width: "100%",
					}}
				>
					<div
						style={{
							color: isSelected ? COUNT_SECONDARY_COLOR_SELECTED : COUNT_SECONDARY_COLOR_UNSELECTED,
							fontSize: "11px",
							fontWeight: 600,
							lineHeight: 1.2,
							flex: 1,
							textAlign: "center",
						}}
					>
						{currentCount}
					</div>
					<div
						style={{
							color: isSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
							fontSize: "11px",
							fontWeight: 600,
							lineHeight: 1.2,
							flex: "none",
						}}
					>
						/
					</div>
					<div
						style={{
							color: isSelected ? COUNT_PRIMARY_COLOR_SELECTED : COUNT_PRIMARY_COLOR_UNSELECTED,
							fontSize: "11px",
							fontWeight: 600,
							lineHeight: 1.2,
							flex: 1,
							textAlign: "center",
						}}
					>
						{totalCount}
					</div>
				</div>
			</div>
		);
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
				<Box style={FILTER_CHIP_GRID_STYLE}>
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
										{renderChipContent(value, isSelected)}
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
										opacity: hasAnySelection && !isSelected ? 0.7 : 1,
									}}
								>
									{renderChipContent(value, isSelected)}
								</UnstyledButton>
							</Tooltip>
						);
					})}
				</Box>
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
				<Box style={FILTER_CHIP_GRID_STYLE}>
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
										{renderChipContent(value, true)}
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
									{renderChipContent(value, true)}
								</UnstyledButton>
							</Tooltip>
						);
					})}
				</Box>
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
	filterCounts = {},
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
	hiddenFilters = [],
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

	// Calculate total counts for each filter option (all items regardless of current filters)
	const totalCounts = useMemo(() => {
		if (!items) {
			return {
				brands: {},
				grades: {},
				scales: {},
				series: {},
				categories: {},
			};
		}

		const validItems: Item[] = items.filter((item): item is Item => isItem(item));
		const brandCounts: Record<string, number> = {};
		const gradeCounts: Record<string, number> = {};
		const scaleCounts: Record<string, number> = {};
		const seriesCounts: Record<string, number> = {};
		const categoryCounts: Record<string, number> = {};

		// Initialize counts with available options
		for (const brand of availableOptions.brands) { brandCounts[brand] = 0; }
		for (const grade of availableOptions.grades) { gradeCounts[grade] = 0; }
		for (const scale of availableOptions.scales) { scaleCounts[scale] = 0; }
		for (const series of availableOptions.series) { seriesCounts[series] = 0; }
		for (const category of availableOptions.categories) { categoryCounts[category] = 0; }

		// Count all items for each filter option
		for (const item of validItems) {
			// Brand counts
			for (const brandId of item.brandIds) {
				if (brandId in brandCounts) {
					brandCounts[brandId]++;
				}
			}
			// Handle "Other" brands
			if (item.brandIds.length === 0 && "Other" in brandCounts) {
				brandCounts.Other++;
			}

			// Grade counts
			for (const rootGrade of Object.keys(item.grades)) {
				if (rootGrade in gradeCounts) {
					gradeCounts[rootGrade]++;
				}
			}
			for (const specificGrades of Object.values(item.grades)) {
				for (const specific of specificGrades) {
					if (specific in gradeCounts) {
						gradeCounts[specific]++;
					}
				}
			}
			// Handle "Other" grades
			if (Object.keys(item.grades).length === 0 && "Other" in gradeCounts) {
				gradeCounts.Other++;
			}

			// Scale counts
			if (item.scale && item.scale in scaleCounts) {
				scaleCounts[item.scale]++;
			}
			// Handle "Other" scales
			if (!item.scale && "Other" in scaleCounts) {
				scaleCounts.Other++;
			}

			// Series counts
			for (const seriesId of item.seriesIds) {
				if (seriesId in seriesCounts) {
					seriesCounts[seriesId]++;
				}
			}
			// Handle "Other" series
			if (item.seriesIds.length === 0 && "Other" in seriesCounts) {
				seriesCounts.Other++;
			}

			// Category counts
			for (const categoryId of item.categoryIds) {
				if (categoryId in categoryCounts) {
					categoryCounts[categoryId]++;
				}
			}
		}

		return {
			brands: brandCounts,
			grades: gradeCounts,
			scales: scaleCounts,
			series: seriesCounts,
			categories: categoryCounts,
		};
	}, [items, availableOptions]);

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
							{!hiddenFilters.includes("categories") && (
								<FilterSection
									label="Categories"
									field="categories"
									options={availableOptions.categories}
									selectedValues={filterState.categories}
									onToggle={onToggleFilterValue}
									formatValue={formatCategoryName}
									color="grape"
									displayMode={displayMode}
									filterCounts={filterCounts.categories}
									totalCounts={totalCounts.categories}
									headerAction={createFilterActions(
										filterState.categories.length,
										availableOptions.categories.length,
										selectAllCategories,
										clearCategories,
										"grape",
									)}
								/>
							)}

							<FilterSection
								label="Brands"
								field="brands"
								options={availableOptions.brands}
								selectedValues={filterState.brands}
								onToggle={onToggleFilterValue}
								formatValue={formatBrandName}
								getImage={(id) => getBrandById(id)?.image}
								color="blue"
								displayMode={displayMode}
								filterCounts={filterCounts.brands}
								totalCounts={totalCounts.brands}
								headerAction={createFilterActions(
									filterState.brands.length,
									availableOptions.brands.length,
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
								filterCounts={filterCounts.series}
								totalCounts={totalCounts.series}
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
								filterCounts={filterCounts.grades}
								totalCounts={totalCounts.grades}
							/>

							<FilterSection
								label="Scales"
								field="scales"
								options={availableOptions.scales}
								selectedValues={filterState.scales}
								onToggle={onToggleFilterValue}
								color="orange"
								displayMode={displayMode}
								filterCounts={filterCounts.scales}
								totalCounts={totalCounts.scales}
								headerAction={createFilterActions(
									filterState.scales.length,
									availableOptions.scales.length,
									selectAllScales,
									clearScales,
									"orange",
								)}
							 />

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
										const { minDate, maxDate } = getDateRangeFromItems(items ?? []);

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
													step={86_400_000} // 1 day in milliseconds
													value={sliderValue ?? [
														filterState.dateRange?.[0] ? dateToNumber(filterState.dateRange[0]) : dateToNumber(defaultStartDate),
														filterState.dateRange?.[1] ? dateToNumber(filterState.dateRange[1]) : dateToNumber(defaultEndDate),
													]}
													onChange={(values) => {
														// Apply snapping to both values
														const snappedValues = [
															snapToNearestYear(values[0], yearSnapPoints),
															snapToNearestYear(values[1], yearSnapPoints),
														];

														// Only update if values actually changed to avoid infinite loops
														if (snappedValues[0] !== values[0] || snappedValues[1] !== values[1]) {
															setSliderValue([snappedValues[0], snappedValues[1]]);
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
															snapToNearestYear(values[1], yearSnapPoints),
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
													marks={generateYearMarks(minDate, maxDate)}
													styles={{
														track: { height: 6 },
														trackContainer: { height: 6 },
														bar: { height: 6 },
														thumb: { borderWidth: 2, width: 20, height: 20 },
														// Complete tooltip removal
														label: { display: "none" },
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
													<Switch
														size="sm"
														checked={filterState.showNoDate}
														onChange={(event) => {
															onFilterChange({ showNoDate: event.currentTarget.checked });
														}}
														label="Show items with no date"
														color="gray"
													/>
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
											<Image src={brandImage} alt={formatBrandName(brand)} width={40} height={40} style={getFilterImageStyle(brandImage)} />
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
											<Image src={gradeImage} alt={formatGradeName(grade)} width={40} height={40} style={getFilterImageStyle(gradeImage)} />
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
								Showing items with no date
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
											<Image src={seriesImage} alt={formatSeriesName(s)} width={40} height={40} style={getFilterImageStyle(seriesImage)} />
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
						{!hiddenFilters.includes("categories") && filterState.categories.map(cat => (
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
