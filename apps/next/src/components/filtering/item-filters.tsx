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
	Tooltip,
	UnstyledButton,
} from "@mantine/core";
import {
	IconChevronDown,
	IconChevronUp,
	IconFilter,
	IconPhoto,
	IconSearch,
	IconSortAscending,
	IconSortDescending,
	IconTextSize,
	IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";

import { FilterState } from "@/hooks/use-filtered-items";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { getBrandImage, getGradeImage, getSeriesImage } from "@/lib/image-lookup";

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

// Shared style for filter images - larger size for better visibility
const FILTER_IMAGE_SIZE = 48;
const FILTER_IMAGE_STYLE = {
	objectFit: "cover" as const,
	borderRadius: 8,
	boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
	display: "block",
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
	getImage?: (value: string) => string | undefined;
	color?: string;
	displayMode: "icon" | "text";
	headerAction?: React.ReactNode;
}

function FilterSection({
	label,
	field,
	options,
	selectedValues,
	onToggle,
	formatValue = (v) => v,
	getImage,
	color = "blue",
	displayMode,
	headerAction,
}: FilterSectionProps) {
	const [expanded, setExpanded] = useState(false);

	if (options.length === 0) return null;

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
					width={FILTER_IMAGE_SIZE}
					height={FILTER_IMAGE_SIZE}
					style={FILTER_IMAGE_STYLE}
				/>
			);
		}
		return formatValue(value);
	};

	// Determine chip size based on display mode and whether it has an image
	const getChipSize = (value: string) => hasImage(value) ? "xl" : "xs";

	// Custom styles for image chips - minimal padding so image fills the chip
	const getChipStyles = (value: string) => {
		if (hasImage(value)) {
			return {
				label: {
					padding: 2,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				},
				iconWrapper: {
					display: "none",
				},
			};
		}
		return;
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
						<Text size="xs" c="dimmed">
							({options.length})
						</Text>
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
						const chip = (
							<Chip
								key={value}
								checked={true}
								onChange={() => { onToggle(field, value); }}
								size={getChipSize(value)}
								variant="filled"
								color={color}
								styles={getChipStyles(value)}
							>
								{renderChipContent(value)}
							</Chip>
						);
						return hasImage(value) ? (
							<Tooltip key={value} label={formatValue(value)} position="top" withArrow={true}>
								{chip}
							</Tooltip>
						) : chip;
					})}
				</Group>
			)}

			{/* Expanded: Show all options */}
			<Collapse in={expanded}>
				<Group gap="xs" wrap="wrap" mt="xs">
					{options.map((value) => {
						const chip = (
							<Chip
								key={value}
								checked={selectedValues.includes(value)}
								onChange={() => { onToggle(field, value); }}
								size={getChipSize(value)}
								variant="outline"
								color={color}
								styles={getChipStyles(value)}
							>
								{renderChipContent(value)}
							</Chip>
						);
						return hasImage(value) ? (
							<Tooltip key={value} label={formatValue(value)} position="top" withArrow={true}>
								{chip}
							</Tooltip>
						) : chip;
					})}
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
	const { preferences, updatePreference } = useUserPreferences();
	const displayMode = preferences.filterDisplayMode;

	const toggleDisplayMode = () => {
		updatePreference("filterDisplayMode", displayMode === "icon" ? "text" : "icon");
	};

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
							/>

							<FilterSection
								label="Brands"
								field="brands"
								options={availableOptions.brands}
								selectedValues={filterState.brands}
								onToggle={onToggleFilterValue}
								formatValue={formatBrandName}
								getImage={getBrandImage}
								color="blue"
								displayMode={displayMode}
							/>

							<FilterSection
								label="Series"
								field="series"
								options={availableOptions.series}
								selectedValues={filterState.series}
								onToggle={onToggleFilterValue}
								formatValue={formatSeriesName}
								getImage={getSeriesImage}
								color="violet"
								displayMode={displayMode}
							/>

							<FilterSection
								label="Grades"
								field="grades"
								options={availableOptions.grades}
								selectedValues={filterState.grades}
								onToggle={onToggleFilterValue}
								formatValue={formatGradeName}
								getImage={getGradeImage}
								color="teal"
								displayMode={displayMode}
								headerAction={
									<ActionIcon
										variant={displayMode === "icon" ? "filled" : "light"}
										size="sm"
										onClick={(e) => { e.stopPropagation(); toggleDisplayMode(); }}
										title={displayMode === "icon" ? "Switch to text labels" : "Switch to icons"}
									>
										{displayMode === "icon" ? <IconPhoto size={16} /> : <IconTextSize size={16} />}
									</ActionIcon>
								}
							/>

							<FilterSection
								label="Scales"
								field="scales"
								options={availableOptions.scales}
								selectedValues={filterState.scales}
								onToggle={onToggleFilterValue}
								color="orange"
								displayMode={displayMode}
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
						{filterState.brands.map(brand => {
							const brandImage = getBrandImage(brand);
							const badge = (
								<Badge
									key={`brand-${brand}`}
									size={brandImage ? "xl" : "sm"}
									variant="light"
									color="blue"
									styles={brandImage ? { root: { paddingLeft: 4, paddingRight: 8 } } : undefined}
									leftSection={
										brandImage ? (
											<Image src={brandImage} alt={formatBrandName(brand)} width={FILTER_IMAGE_SIZE} height={FILTER_IMAGE_SIZE} style={FILTER_IMAGE_STYLE} />
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
							const gradeImage = getGradeImage(grade);
							const badge = (
								<Badge
									key={`grade-${grade}`}
									size={gradeImage ? "xl" : "sm"}
									variant="light"
									color="teal"
									styles={gradeImage ? { root: { paddingLeft: 4, paddingRight: 8 } } : undefined}
									leftSection={
										gradeImage ? (
											<Image src={gradeImage} alt={formatGradeName(grade)} width={FILTER_IMAGE_SIZE} height={FILTER_IMAGE_SIZE} style={FILTER_IMAGE_STYLE} />
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
						{filterState.series.map(s => {
							const seriesImage = getSeriesImage(s);
							const badge = (
								<Badge
									key={`series-${s}`}
									size={seriesImage ? "xl" : "sm"}
									variant="light"
									color="violet"
									styles={seriesImage ? { root: { paddingLeft: 4, paddingRight: 8 } } : undefined}
									leftSection={
										seriesImage ? (
											<Image src={seriesImage} alt={formatSeriesName(s)} width={FILTER_IMAGE_SIZE} height={FILTER_IMAGE_SIZE} style={FILTER_IMAGE_STYLE} />
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
