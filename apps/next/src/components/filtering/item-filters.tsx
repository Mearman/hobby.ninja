"use client";

import {
	ActionIcon,
	Badge,
	Box,
	Card,
	Container,
	Divider,
	Group,
	Select,
	TextInput,
	Tooltip,
	Text,
	Button,
	Stack,
} from "@mantine/core";
import {
	IconAdjustmentsHorizontal,
	IconFilter,
	IconX,
	IconSearch,
} from "@tabler/icons-react";
import { FilterState } from "@/hooks/use-filtered-items";

interface ItemFiltersProps {
	filterState: FilterState;
	availableOptions: {
		brands: string[];
		grades: string[];
		scales: string[];
		series: string[];
	};
	onFilterChange: (updates: Partial<FilterState>) => void;
	onSearchChange: (value: string) => void;
	onClearFilters: () => void;
	showAdvancedFilters?: boolean;
	onToggleAdvancedFilters?: () => void;
	hasActiveFilters?: boolean;
	activeFilterCount?: number;
	title?: string;
	subtitle?: string;
}

export function ItemFilters({
	filterState,
	availableOptions,
	onFilterChange,
	onSearchChange,
	onClearFilters,
	showAdvancedFilters = false,
	onToggleAdvancedFilters,
	hasActiveFilters = false,
	activeFilterCount = 0,
	title = "Filters",
	subtitle,
}: ItemFiltersProps) {
	return (
		<Card p="lg" radius="md" withBorder>
			<Stack gap="md">
				{/* Title */}
				{title && <Text size="lg" fw={600}>{title}</Text>}
				{subtitle && <Text size="sm" c="dimmed">{subtitle}</Text>}

				{/* Search Bar */}
				<TextInput
					leftSection={<IconSearch size={16} />}
					placeholder="Search by name, brand, series, grade, or scale..."
					value={filterState.search}
					onChange={(e) => onSearchChange(e.target.value)}
					size="md"
				/>

				{/* Quick Filters Row */}
				<Group>
					<Select
						leftSection={<IconFilter size={16} />}
						placeholder="All Brands"
						data={[
							{ value: "", label: "All Brands" },
							...availableOptions.brands.map(brand => ({ value: brand, label: brand })),
						]}
						value={filterState.brand}
						onChange={(value) => onFilterChange({ brand: value ?? "" })}
						clearable
						searchable
						size="sm"
						style={{ flex: 1 }}
					/>
					<Select
						placeholder="All Grades"
						data={[
							{ value: "", label: "All Grades" },
							...availableOptions.grades.map(grade => ({ value: grade, label: grade })),
						]}
						value={filterState.grade}
						onChange={(value) => onFilterChange({ grade: value ?? "" })}
						clearable
						searchable
						size="sm"
						style={{ flex: 1 }}
					/>
					<Select
						placeholder="All Scales"
						data={[
							{ value: "", label: "All Scales" },
							...availableOptions.scales.map(scale => ({ value: `1/${scale}`, label: `1/${scale}` })),
						]}
						value={filterState.scale}
						onChange={(value) => onFilterChange({ scale: value ?? "" })}
						clearable
						searchable
						size="sm"
						style={{ flex: 1 }}
					/>
					<Select
						placeholder="Sort by"
						data={[
							{ value: "date-desc", label: "Latest First" },
							{ value: "date-asc", label: "Oldest First" },
							{ value: "name-asc", label: "Name (A-Z)" },
							{ value: "name-desc", label: "Name (Z-A)" },
							{ value: "price-asc", label: "Price (Low to High)" },
							{ value: "price-desc", label: "Price (High to Low)" },
							{ value: "brand-asc", label: "Brand (A-Z)" },
							{ value: "grade-asc", label: "Grade (A-Z)" },
							{ value: "scale-asc", label: "Scale (A-Z)" },
							{ value: "series-asc", label: "Series (A-Z)" },
						]}
						value={filterState.sortBy}
						onChange={(value) => onFilterChange({ sortBy: value ?? "date-desc" })}
						size="sm"
					/>
				</Group>

				{/* Advanced Filters Toggle */}
				{availableOptions.series.length > 0 && (
					<Group justify="space-between" align="center">
						<Button
							variant="subtle"
							size="xs"
							onClick={onToggleAdvancedFilters}
							leftSection={<IconAdjustmentsHorizontal size={14} />}
						>
							{showAdvancedFilters ? "Hide" : "Show"} Advanced Filters
						</Button>

						{hasActiveFilters && (
							<Button
								variant="light"
								color="red"
								size="xs"
								onClick={onClearFilters}
								leftSection={<IconX size={14} />}
							>
								Clear All Filters ({activeFilterCount})
							</Button>
						)}
					</Group>
				)}

				{/* Advanced Filters */}
				{showAdvancedFilters && availableOptions.series.length > 0 && (
					<>
						<Divider />
						<Box>
							<Select
								placeholder="Filter by Series"
								data={[
									{ value: "", label: "All Series" },
									...availableOptions.series.map(series => ({ value: series, label: series })),
								]}
								value={filterState.series}
								onChange={(value) => onFilterChange({ series: value ?? "" })}
								clearable
								searchable
								size="sm"
								leftSection={<IconFilter size={14} />}
							/>
						</Box>
					</>
				)}

				{/* Active Filters Display */}
				{hasActiveFilters && (
					<Group gap="xs" wrap="wrap" mt="sm">
						{filterState.search && (
							<Badge
								size="sm"
								variant="light"
								color="blue"
								rightSection={
									<ActionIcon size="xs" onClick={() => onFilterChange({ search: "" })}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								Search: "{filterState.search}"
							</Badge>
						)}
						{filterState.brand && (
							<Badge
								size="sm"
								variant="light"
								rightSection={
									<ActionIcon size="xs" onClick={() => onFilterChange({ brand: "" })}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								Brand: {filterState.brand}
							</Badge>
						)}
						{filterState.grade && (
							<Badge
								size="sm"
								variant="light"
								rightSection={
									<ActionIcon size="xs" onClick={() => onFilterChange({ grade: "" })}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								Grade: {filterState.grade}
							</Badge>
						)}
						{filterState.scale && (
							<Badge
								size="sm"
								variant="light"
								rightSection={
									<ActionIcon size="xs" onClick={() => onFilterChange({ scale: "" })}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								Scale: 1/{filterState.scale}
							</Badge>
						)}
						{filterState.series && (
							<Badge
								size="sm"
								variant="light"
								rightSection={
									<ActionIcon size="xs" onClick={() => onFilterChange({ series: "" })}>
										<IconX size={10} />
									</ActionIcon>
								}
							>
								Series: {filterState.series}
							</Badge>
						)}
					</Group>
				)}
			</Stack>
		</Card>
	);
}