"use client";

import { getNodeDisplayName, getNodeReleaseDateSortable, type Item, type Manual } from "@hobby-ninja/data";
import {
	getBrandById,
	getCategoryById,
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
	SimpleGrid,
	Stack,
	Text,
	TextInput,
	UnstyledButton,
} from "@mantine/core";
import {
	IconBox,
	IconChevronDown,
	IconChevronUp,
	IconFileText,
	IconFilter,
	IconSearch,
	IconSortAscending,
	IconSortDescending,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { ViewSwitcher, useViewMode } from "@/components/view/view-switcher";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";

interface DatabaseClientProps {
	items: Item[];
	manuals: Manual[];
	totalItems: number;
	totalManuals: number;
}

// Constants for duplicate CSS variable strings
const MANTINE_COLOR_BLUE_0 = "var(--mantine-color-blue-0)";
const MANTINE_COLOR_BLUE_6 = "var(--mantine-color-blue-6)";
const MANTINE_COLOR_DIMMED = "var(--mantine-color-dimmed)";
const TABLE_CELL_PADDING = "0.75rem 1rem";

// Type for combined database entries
type DatabaseEntry =
	| ({ type: "item" } & Item)
	| ({ type: "manual" } & Manual);

// Filter state
interface DatabaseFilterState {
	search: string;
	type: "all" | "items" | "manuals";
	brands: string[];
	grades: string[];
	scales: string[];
	series: string[];
	categories: string[];
	languages: string[];
	sortField: string;
	sortDirection: "asc" | "desc";
}

// Helper function to get item display name for manuals
const getItemDisplayName = (manual: Manual): string | null => {
	if (!manual.itemName) return null;
	if (typeof manual.itemName === "string") return manual.itemName;
	const en = manual.itemName.en;
	const ja = manual.itemName.ja;
	if (en && en.length > 0) return en;
	if (ja && ja.length > 0) return ja;
	return null;
};

// Helper functions for formatting
const formatBrandName = (id: string): string => {
	const brand = getBrandById(id);
	return brand ? getNodeDisplayName(brand) : id;
};

const formatSeriesName = (id: string): string => {
	const series = getSeriesById(id);
	return series ? getNodeDisplayName(series) : id;
};

const formatCategoryName = (id: string): string => {
	const category = getCategoryById(id);
	return category ? getNodeDisplayName(category) : id;
};

// Helper to get first brand from brandIds
const getFirstBrand = (item: Item): string => {
	return item.brandIds.length > 0 ? item.brandIds[0] : "";
};

// Helper to get first category from categoryIds
const getFirstCategory = (item: Item): string => {
	return item.categoryIds.length > 0 ? item.categoryIds[0] : "";
};

// Helper to get first series from seriesIds
const getFirstSeries = (item: Item): string => {
	return item.seriesIds.length > 0 ? item.seriesIds[0] : "";
};

// Helper to get release year string from DatabaseEntry (handles both Item and Manual)
const getEntryReleaseYear = (entry: DatabaseEntry): string => {
	if (entry.type === "item") {
		// Use the existing function for items
		const sortableDate = getNodeReleaseDateSortable(entry);
		// Extract 4-digit year from YYYYMMDD format or return empty string
		return sortableDate.length >= 4 ? sortableDate.slice(0, 4) : "";
	}

	// For manuals, check if releaseDate has a year property and it's a valid number
	if (entry.releaseDate && typeof entry.releaseDate === "object" && "year" in entry.releaseDate && entry.releaseDate.year !== null && entry.releaseDate.year !== undefined) {
		return entry.releaseDate.year.toString();
	}

	return "";
};


// Custom Filters Component for Database
function DatabaseFilters({
	filterState,
	availableOptions,
	onFilterChange,
	onSearchChange,
	onToggleFilterValue,
	onClearFilters,
	hasActiveFilters,
	activeFilterCount,
}: {
	filterState: DatabaseFilterState;
	availableOptions: {
		brands: string[];
		grades: string[];
		scales: string[];
		series: string[];
		categories: string[];
		languages: string[];
	};
	onFilterChange: (updates: Partial<DatabaseFilterState>) => void;
	onSearchChange: (value: string) => void;
	onToggleFilterValue: (field: string, value: string) => void;
	onClearFilters: () => void;
	hasActiveFilters: boolean;
	activeFilterCount: number;
}) {
	const [expanded, setExpanded] = useState(false);

	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Group justify="space-between" mb="md">
				<Group gap="md">
					<IconFilter size={16} />
					<Text size="sm" fw={500}>Filter</Text>
					{activeFilterCount > 0 && (
						<Badge size="xs" variant="filled" color="blue">
							{activeFilterCount}
						</Badge>
					)}
				</Group>
				<Group gap="xs">
					{hasActiveFilters && (
						<Button
							variant="outline"
							size="xs"
							onClick={onClearFilters}
							leftSection={<IconX size={12} />}
						>
							Clear All
						</Button>
					)}
					<UnstyledButton
						onClick={() => { setExpanded(!expanded); }}
						style={{ display: "flex", alignItems: "center", gap: 4 }}
					>
						<Text size="xs" c="blue">
							{expanded ? "Hide Filters" : "Show Filters"}
						</Text>
						{expanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
					</UnstyledButton>
				</Group>
			</Group>

			{/* Always visible filters */}
			<Group gap="lg" align="flex-end" mb="md">
				<div style={{ flex: 1 }}>
					<Text size="xs" c="dimmed" mb="xs">Search</Text>
					<TextInput
						placeholder="Search by name, brand, category..."
						value={filterState.search}
						onChange={(e) => { onSearchChange(e.target.value); }}
						leftSection={<IconSearch size={14} />}
					/>
				</div>
				<div>
					<Text size="xs" c="dimmed" mb="xs">Type</Text>
					<Group gap="xs">
						{[
							{ value: "all", label: "All" },
							{ value: "items", label: "Products" },
							{ value: "manuals", label: "Manuals" },
						].map(({ value, label }) => (
							<Badge
								key={value}
								variant={filterState.type === value ? "filled" : "outline"}
								style={{ cursor: "pointer" }}
								onClick={() => { onFilterChange({ type: value as "all" | "items" | "manuals" }); }}
							>
								{label}
							</Badge>
						))}
					</Group>
				</div>
			</Group>

			{/* Expandable detailed filters */}
			<Collapse in={expanded}>
				<Divider my="md" />

				{/* Sort Options */}
				<Group gap="md" mb="lg">
					<Select
						label="Sort By"
						data={[
							{ value: "name", label: "Name" },
							{ value: "date", label: "Date" },
							{ value: "price", label: "Price" },
						]}
						value={filterState.sortField}
						onChange={(value) => { onFilterChange({ sortField: value ?? "name" }); }}
						leftSection={<IconSortAscending size={14} />}
					/>
					<ActionIcon
						variant={filterState.sortDirection === "asc" ? "filled" : "outline"}
						onClick={() => { onFilterChange({
							sortDirection: filterState.sortDirection === "asc" ? "desc" : "asc",
						}); }}
					>
						{filterState.sortDirection === "asc" ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />}
					</ActionIcon>
				</Group>

				{/* Filter Sections */}
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "md" }}>
					{/* Type filter info */}
					<Box mb="md">
						<Text size="xs" c="blue">
							{filterState.type === "all"
								? "Showing items without manuals plus all manuals"
								: filterState.type === "items"
									? "Showing all products"
									: "Showing all manuals"}
						</Text>
					</Box>

					{/* Item filters - only show when type is items or all */}
					{(filterState.type === "items" || filterState.type === "all") && (
						<>
							{availableOptions.brands.length > 0 && (
								<FilterSection
									label="Brands"
									field="brands"
									options={availableOptions.brands.slice(0, 10)}
									selectedValues={filterState.brands}
									onToggle={onToggleFilterValue}
									formatValue={formatBrandName}
								/>
							)}

							{availableOptions.categories.length > 0 && (
								<FilterSection
									label="Categories"
									field="categories"
									options={availableOptions.categories.slice(0, 10)}
									selectedValues={filterState.categories}
									onToggle={onToggleFilterValue}
									formatValue={formatCategoryName}
								/>
							)}

							{availableOptions.grades.length > 0 && (
								<FilterSection
									label="Grades"
									field="grades"
									options={availableOptions.grades}
									selectedValues={filterState.grades}
									onToggle={onToggleFilterValue}
								/>
							)}

							{availableOptions.scales.length > 0 && (
								<FilterSection
									label="Scales"
									field="scales"
									options={availableOptions.scales.slice(0, 10)}
									selectedValues={filterState.scales}
									onToggle={onToggleFilterValue}
								/>
							)}

							{availableOptions.series.length > 0 && (
								<FilterSection
									label="Series"
									field="series"
									options={availableOptions.series.slice(0, 10)}
									selectedValues={filterState.series}
									onToggle={onToggleFilterValue}
									formatValue={formatSeriesName}
								/>
							)}
						</>
					)}

					{/* Manual filters - only show when type is manuals or all */}
					{(filterState.type === "manuals" || filterState.type === "all") && (
						availableOptions.languages.length > 0 && (
							<FilterSection
								label="Languages"
								field="languages"
								options={availableOptions.languages}
								selectedValues={filterState.languages}
								onToggle={onToggleFilterValue}
								color="green"
							/>
						)
					)}
				</div>
			</Collapse>
		</Card>
	);
}

// Filter Section Component
function FilterSection({
	label,
	field,
	options,
	selectedValues,
	onToggle,
	formatValue = (v) => v,
	color = "blue",
}: {
	label: string;
	field: string;
	options: string[];
	selectedValues: string[];
	onToggle: (field: string, value: string) => void;
	formatValue?: (value: string) => string;
	color?: string;
}) {
	const [expanded, setExpanded] = useState(false);

	if (options.length === 0) return null;

	return (
		<Box>
			<Group justify="space-between" mb="xs">
				<Text size="xs" fw={500}>{label}</Text>
				{selectedValues.length > 0 && (
					<Text size="xs" c="dimmed">
						{selectedValues.length} selected
					</Text>
				)}
			</Group>
			<Box>
				{!expanded && selectedValues.length > 0 ? (
					<Box>
						{selectedValues.slice(0, 3).map((value) => (
							<Group gap={4} key={value} style={{ marginBottom: 4 }}>
								<Badge size="xs" color={color}>
									{formatValue(value)}
								</Badge>
								<ActionIcon
									size="xs"
									variant="transparent"
									color={color}
									onClick={() => { onToggle(field, value); }}
								>
									<IconX size={10} />
								</ActionIcon>
							</Group>
						))}
						{selectedValues.length > 3 && (
							<Chip size="xs" variant="outline" style={{ marginBottom: 4 }}>
								+{selectedValues.length - 3} more
							</Chip>
						)}
					</Box>
				) : (
					<Box style={{ maxHeight: expanded ? "200px" : "100px", overflow: "hidden" }}>
						{options.map((value) => (
							<Chip
								key={value}
								size="xs"
								variant={selectedValues.includes(value) ? "filled" : "outline"}
								color={color}
								onClick={() => { onToggle(field, value); }}
								style={{ marginBottom: 4, cursor: "pointer" }}
							>
								{formatValue(value)}
							</Chip>
						))}
					</Box>
				)}
				{options.length > (expanded ? 10 : 5) && (
					<UnstyledButton
						onClick={() => { setExpanded(!expanded); }}
						style={{ display: "flex", alignItems: "center", gap: 4 }}
					>
						<Text size="xs" c="blue">
							{expanded ? "Show Less" : `Show All (${options.length})`}
						</Text>
						{expanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
					</UnstyledButton>
				)}
			</Box>
		</Box>
	);
}

// Grid View Card Component
function GridViewCard({ entry }: { entry: DatabaseEntry }) {
	if (entry.type === "item") {
		const priceAmount = entry.price?.amount;
		const brand = getFirstBrand(entry);
		const category = getFirstCategory(entry);

		return (
			<Card
				component={Link}
				href={`/item/${entry.id}`}
				p={0}
				radius="md"
				withBorder={true}
				style={{ textDecoration: "none", color: "inherit" }}
			>
				<div style={{ padding: "1rem" }}>
					<Text size="sm" fw="bold" lineClamp={2} mb="xs">
						{getNodeDisplayName(entry)}
					</Text>

					{brand && (
						<Text size="xs" c="blue" mb="xs">
							{brand}
						</Text>
					)}

					{category && (
						<Text size="xs" c="orange" mb="xs">
							{category}
						</Text>
					)}

					<div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "xs" }}>
						{entry.grade && (
							<Badge size="xs" variant="light" color="grape">
								{entry.grade}
							</Badge>
						)}
						{entry.scale && (
							<Badge size="xs" variant="light" color="cyan">
								{entry.scale}
							</Badge>
						)}
					</div>

					{priceAmount !== undefined && (
						<Text size="sm" fw="bold" c="green">
							¥{priceAmount.toLocaleString()}
						</Text>
					)}
				</div>
			</Card>
		);
	} else {
		const itemName = getItemDisplayName(entry);

		return (
			<Card
				component={Link}
				href={`/manual/${entry.id}`}
				p={0}
				radius="md"
				withBorder={true}
				style={{
					textDecoration: "none",
					color: "inherit",
					backgroundColor: MANTINE_COLOR_BLUE_0,
				}}
			>
				<div style={{ padding: "1rem" }}>
					<Group gap="xs" mb="xs">
						<IconFileText size={14} color="var(--mantine-color-blue-6)" />
						<Text size="sm" fw="bold" lineClamp={2}>
							{getNodeDisplayName(entry)}
						</Text>
					</Group>

					{itemName && (
						<Text size="xs" c="dimmed" mb="xs">
							Item: {itemName}
						</Text>
					)}

					<div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
						{entry.releaseDate && (
							<Badge size="xs" variant="light" color="blue">
								{getEntryReleaseYear(entry)}
							</Badge>
						)}
						{entry.language && (
							<Badge size="xs" variant="light">
								{entry.language.toUpperCase()}
							</Badge>
						)}
					</div>
				</div>
			</Card>
		);
	}
}

// List View Component
function ListViewRow({ entry }: { entry: DatabaseEntry }) {
	if (entry.type === "item") {
		const priceAmount = entry.price?.amount;
		const brand = getFirstBrand(entry);
		const category = getFirstCategory(entry);

		return (
			<Card
				component={Link}
				href={`/item/${entry.id}`}
				p="md"
				radius="md"
				withBorder={true}
				style={{
					textDecoration: "none",
					color: "inherit",
					marginBottom: "0.5rem",
				}}
			>
				<Group justify="space-between" align="center">
					<div style={{ flex: 1 }}>
						<Text size="sm" fw="bold" mb="xs">
							{getNodeDisplayName(entry)}
						</Text>
						<Text size="xs" c="dimmed">
							{brand && <span>{brand}</span>}
							{brand && category && <span> • </span>}
							{category && <span>{category}</span>}
							{entry.grade && <span> • {entry.grade}</span>}
							{entry.scale && <span> • {entry.scale}</span>}
						</Text>
					</div>
					{priceAmount !== undefined && (
						<Text size="sm" fw="bold" c="green">
							¥{priceAmount.toLocaleString()}
						</Text>
					)}
				</Group>
			</Card>
		);
	} else {
		const itemName = getItemDisplayName(entry);

		return (
			<Card
				component={Link}
				href={`/manual/${entry.id}`}
				p="md"
				radius="md"
				withBorder={true}
				style={{
					textDecoration: "none",
					color: "inherit",
					backgroundColor: MANTINE_COLOR_BLUE_0,
					marginBottom: "0.5rem",
				}}
			>
				<Group justify="space-between" align="center">
					<div style={{ flex: 1 }}>
						<Group gap="xs" mb="xs">
							<IconFileText size={14} color="var(--mantine-color-blue-6)" />
							<Text size="sm" fw="bold">
								{getNodeDisplayName(entry)}
							</Text>
						</Group>
						{itemName && (
							<Text size="xs" c="dimmed">
								Item: {itemName}
							</Text>
						)}
					</div>
					<Group gap="md">
						{entry.releaseDate && (
							<Badge size="xs" variant="light" color="blue">
								{getEntryReleaseYear(entry)}
							</Badge>
						)}
						{entry.language && (
							<Badge size="xs" variant="light">
								{entry.language.toUpperCase()}
							</Badge>
						)}
					</Group>
				</Group>
			</Card>
		);
	}
}

// Table View Component
function TableView({ entries }: { entries: DatabaseEntry[] }) {
	return (
		<div style={{
			border: "1px solid var(--mantine-color-gray-3)",
			borderRadius: "0.5rem",
			overflow: "hidden",
		}}>
			<table style={{ width: "100%", borderCollapse: "collapse" }}>
				<thead style={{ backgroundColor: "var(--mantine-color-gray-0)" }}>
					<tr>
						<th style={{ padding: TABLE_CELL_PADDING, textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
							Name
						</th>
						<th style={{ padding: TABLE_CELL_PADDING, textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
							Type
						</th>
						<th style={{ padding: TABLE_CELL_PADDING, textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
							Brand/Year
						</th>
						<th style={{ padding: TABLE_CELL_PADDING, textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
							Category/Language
						</th>
						<th style={{ padding: TABLE_CELL_PADDING, textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
							Grade/Scale
						</th>
						<th style={{ padding: TABLE_CELL_PADDING, textAlign: "right", fontSize: "0.875rem", fontWeight: "600" }}>
							Price
						</th>
					</tr>
				</thead>
				<tbody>
					{entries.map((entry) => {
						if (entry.type === "item") {
							const priceAmount = entry.price?.amount;
							const brand = getFirstBrand(entry);
							const category = getFirstCategory(entry);

							return (
								<tr key={entry.id} style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
									<td style={{ padding: TABLE_CELL_PADDING }}>
										<Link
											href={`/item/${entry.id}`}
											style={{
												color: MANTINE_COLOR_BLUE_6,
												textDecoration: "none",
												fontWeight: "500",
											}}
										>
											{getNodeDisplayName(entry)}
										</Link>
									</td>
									<td style={{ padding: TABLE_CELL_PADDING }}>
										<Badge size="xs" variant="light" color="blue">Product</Badge>
									</td>
									<td style={{ padding: TABLE_CELL_PADDING, color: MANTINE_COLOR_BLUE_6 }}>
										{brand || "-"}
									</td>
									<td style={{ padding: TABLE_CELL_PADDING, color: "var(--mantine-color-orange-6)" }}>
										{category || "-"}
									</td>
									<td style={{ padding: TABLE_CELL_PADDING }}>
										<div style={{ display: "flex", gap: "4px" }}>
											{entry.grade && <Badge size="xs">{entry.grade}</Badge>}
											{entry.scale && <Badge size="xs">{entry.scale}</Badge>}
										</div>
									</td>
									<td style={{ padding: TABLE_CELL_PADDING, textAlign: "right" }}>
										{priceAmount === undefined ? "-" : `¥${priceAmount.toLocaleString()}`}
									</td>
								</tr>
							);
						} else {
							return (
								<tr key={entry.id} style={{
									borderBottom: "1px solid var(--mantine-color-gray-2)",
									backgroundColor: MANTINE_COLOR_BLUE_0,
								}}>
									<td style={{ padding: TABLE_CELL_PADDING }}>
										<Link
											href={`/manual/${entry.id}`}
											style={{
												color: MANTINE_COLOR_BLUE_6,
												textDecoration: "none",
												fontWeight: "500",
												display: "flex",
												alignItems: "center",
												gap: "6px",
											}}
										>
											<IconFileText size={14} />
											{getNodeDisplayName(entry)}
										</Link>
									</td>
									<td style={{ padding: TABLE_CELL_PADDING }}>
										<Badge size="xs" variant="light" color="green">Manual</Badge>
									</td>
									<td style={{ padding: TABLE_CELL_PADDING }}>
										{getEntryReleaseYear(entry) || "-"}
									</td>
									<td style={{ padding: TABLE_CELL_PADDING }}>
										{entry.language ? entry.language.toUpperCase() : "-"}
									</td>
									<td style={{ padding: TABLE_CELL_PADDING }}>-</td>
									<td style={{ padding: TABLE_CELL_PADDING, textAlign: "right" }}>-</td>
								</tr>
							);
						}
					})}
				</tbody>
			</table>
		</div>
	);
}

export function DatabaseClient({ items, manuals, totalItems, totalManuals }: DatabaseClientProps) {
	const { preferences } = useUserPreferences();
	const { viewMode, setViewMode } = useViewMode();

	// Client-side state for filtering
	const [filters, setFilters] = useState<DatabaseFilterState>({
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

	const updateFilter = (updates: Partial<DatabaseFilterState>) => {
		setFilters((prev) => ({ ...prev, ...updates }));
	};

	// Combine items and manuals
	const allEntries = useMemo(() => {
		const entries: DatabaseEntry[] = [];

		// Add items
		for (const item of items) {
			entries.push({ type: "item", ...item });
		}

		// Add manuals
		for (const manual of manuals) {
			entries.push({ type: "manual", ...manual });
		}

		return entries;
	}, [items, manuals]);

	// Filter entries
	const filteredEntries = useMemo(() => {
		let filtered = allEntries;

		// Type filter
		if (filters.type === "items") {
			filtered = filtered.filter(entry => entry.type === "item");
		} else if (filters.type === "manuals") {
			filtered = filtered.filter(entry => entry.type === "manual");
		}

		// Search filter
		if (filters.search.trim()) {
			const query = filters.search.toLowerCase();
			filtered = filtered.filter(entry => {
				const name = getNodeDisplayName(entry).toLowerCase();
				if (name.includes(query)) return true;

				if (entry.type === "item") {
					const brand = getFirstBrand(entry);
					const category = getFirstCategory(entry);
					return (
						brand.toLowerCase().includes(query) ||
						category.toLowerCase().includes(query) ||
						(entry.grade?.toLowerCase().includes(query) ?? false) ||
						(entry.scale?.toLowerCase().includes(query) ?? false)
					);
				} else {
					const itemName = getItemDisplayName(entry);
					return (itemName?.toLowerCase().includes(query) ?? false);
				}
			});
		}

		// Brand filter (only for items)
		if (filters.brands.length > 0) {
			filtered = filtered.filter(entry =>
				entry.type === "item" && getFirstBrand(entry) && filters.brands.includes(getFirstBrand(entry)),
			);
		}

		// Category filter (only for items)
		if (filters.categories.length > 0) {
			filtered = filtered.filter(entry =>
				entry.type === "item" && getFirstCategory(entry) && filters.categories.includes(getFirstCategory(entry)),
			);
		}

		// Grade filter (only for items)
		if (filters.grades.length > 0) {
			filtered = filtered.filter(entry =>
				entry.type === "item" && entry.grade && filters.grades.includes(entry.grade),
			);
		}

		// Scale filter (only for items)
		if (filters.scales.length > 0) {
			filtered = filtered.filter(entry =>
				entry.type === "item" && entry.scale && filters.scales.includes(entry.scale),
			);
		}

		// Series filter (only for items)
		if (filters.series.length > 0) {
			filtered = filtered.filter(entry =>
				entry.type === "item" && getFirstSeries(entry) && filters.series.includes(getFirstSeries(entry)),
			);
		}

		// Language filter (only for manuals)
		if (filters.languages.length > 0) {
			filtered = filtered.filter(entry =>
				entry.type === "manual" && entry.language && filters.languages.includes(entry.language),
			);
		}

		// If both items and manuals are showing, remove items that have manuals
		if (filters.type === "all") {
			const manualItemIds = new Set(
				manuals
					.map(manual => manual.itemId)
					.filter((itemId): itemId is string => itemId != null),
			);
			filtered = filtered.filter(entry =>
				!(entry.type === "item" && manualItemIds.has(entry.id)),
			);
		}

		// Sort entries
		return filtered.toSorted((a, b) => {
			// Type sorting: items first when "all", otherwise by name
			if (filters.type === "all" && a.type !== b.type) {
				return a.type === "item" ? -1 : 1;
			}

			let aValue: string;
			let bValue: string;

			switch (filters.sortField) {
				case "name": {
					aValue = getNodeDisplayName(a);
					bValue = getNodeDisplayName(b);
					break;
				}
				case "brand": {
					aValue = a.type === "item" ? getFirstBrand(a) : getItemDisplayName(a) ?? "";
					bValue = b.type === "item" ? getFirstBrand(b) : getItemDisplayName(b) ?? "";
					break;
				}
				case "date": {
					aValue = getEntryReleaseYear(a);
					bValue = getEntryReleaseYear(b);
					break;
				}
				default: {
					aValue = getNodeDisplayName(a);
					bValue = getNodeDisplayName(b);
				}
			}

			const comparison = aValue.localeCompare(bValue);
			return filters.sortDirection === "desc" ? -comparison : comparison;
		});
	}, [allEntries, filters, manuals]);

	const { visibleItems: paginatedEntries, isLoading, hasMore, lastItemRef } = useInfiniteScroll({
		items: filteredEntries,
		itemsPerPage: preferences.infiniteScrollPageSize,
		preservePageParam: true,
		autoLoad: preferences.autoLoadInfiniteScroll,
	});

	return (
		<Stack gap="xl">
			{/* Database Stats */}
			<div style={{
				padding: "1.5rem",
				border: "1px solid var(--mantine-color-gray-3)",
				borderRadius: "0.5rem",
				background: "white",
			}}>
				<div style={{ display: "flex", justifyContent: "center", gap: "3rem" }}>
					<div style={{ textAlign: "center" }}>
						<div style={{ fontSize: "2rem", fontWeight: "bold", color: MANTINE_COLOR_BLUE_6 }}>
							{totalItems.toLocaleString()}
						</div>
						<div style={{ fontSize: "0.875rem", color: MANTINE_COLOR_DIMMED }}>
							<Link href="/items" style={{ color: "inherit", textDecoration: "none" }}>Items</Link>
						</div>
					</div>
					<div style={{ textAlign: "center" }}>
						<div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--mantine-color-green-6)" }}>
							{totalManuals.toLocaleString()}
						</div>
						<div style={{ fontSize: "0.875rem", color: MANTINE_COLOR_DIMMED }}>
							<Link href="/manuals" style={{ color: "inherit", textDecoration: "none" }}>Manuals</Link>
						</div>
					</div>
				</div>
				<div style={{ textAlign: "center", marginTop: "1rem" }}>
					<Text size="sm" c="dimmed">
						Click on Items or Manuals above to browse them separately
					</Text>
				</div>
			</div>

			{/* Custom Filters */}
			<DatabaseFilters
				filterState={filters}
				availableOptions={{
					brands: [...new Set(items
						.filter(item => getFirstBrand(item))
						.map(item => getFirstBrand(item)),
					)].toSorted(),
					categories: [...new Set(items
						.filter(item => getFirstCategory(item))
						.map(item => getFirstCategory(item)),
					)].toSorted(),
					grades: [...new Set(items
						.map(item => item.grade)
						.filter((grade): grade is string => grade != null),
					)].toSorted(),
					scales: [...new Set(items
						.map(item => item.scale)
						.filter((scale): scale is string => scale != null),
					)].toSorted(),
					series: [...new Set(items
						.filter(item => getFirstSeries(item))
						.map(item => getFirstSeries(item)),
					)].toSorted(),
					languages: [...new Set(manuals
						.map(manual => manual.language)
						.filter((language): language is string => language != null),
					)].toSorted(),
				}}
				onFilterChange={updateFilter}
				onSearchChange={(search) => { updateFilter({ search }); }}
				onToggleFilterValue={(field, value) => {
					const currentValues = filters[field as keyof DatabaseFilterState] as string[];
					const newValues = currentValues.includes(value)
						? currentValues.filter(v => v !== value)
						: [...currentValues, value];
					updateFilter({ [field]: newValues } as Partial<DatabaseFilterState>);
				}}
				onClearFilters={() => {
					updateFilter({
						brands: [],
						categories: [],
						grades: [],
						scales: [],
						series: [],
						languages: [],
					});
				}}
				hasActiveFilters={
					filters.brands.length > 0 ||
					filters.categories.length > 0 ||
					filters.grades.length > 0 ||
					filters.scales.length > 0 ||
					filters.series.length > 0 ||
					filters.languages.length > 0
				}
				activeFilterCount={
					filters.brands.length +
					filters.categories.length +
					filters.grades.length +
					filters.scales.length +
					filters.series.length +
					filters.languages.length
				}
			/>

			{/* Header with View Switcher */}
			<Group justify="space-between" wrap="wrap">
				<Group gap="xs">
					<IconBox size={24} />
					<Text size="lg" fw={600}>
						{filters.type === "all" ? "All Items & Manuals" : filters.type === "items" ? "Products" : "Manuals"}
					</Text>
					<Text size="sm" c="dimmed">
						({filteredEntries.length.toLocaleString()} of {(totalItems + totalManuals).toLocaleString()})
					</Text>
				</Group>
				<ViewSwitcher
					value={viewMode}
					onChange={setViewMode}
					size="sm"
				/>
			</Group>

			{/* Entries Display */}
			{paginatedEntries.length > 0 ? (
				<>
					{viewMode === "grid" && (
						<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
							{paginatedEntries.map((entry, index) => {
								const isLast = index === paginatedEntries.length - 1;
								return (
									<div key={`${entry.type}-${entry.id}`} ref={isLast ? lastItemRef : undefined}>
										<GridViewCard entry={entry} />
									</div>
								);
							})}
						</SimpleGrid>
					)}

					{viewMode === "list" && (
						<Stack gap="xs">
							{paginatedEntries.map((entry, index) => {
								const isLast = index === paginatedEntries.length - 1;
								return (
									<div key={`${entry.type}-${entry.id}`} ref={isLast ? lastItemRef : undefined}>
										<ListViewRow entry={entry} />
									</div>
								);
							})}
						</Stack>
					)}

					{viewMode === "table" && (
						<div ref={lastItemRef}>
							<TableView entries={paginatedEntries} />
						</div>
					)}

					{/* Infinite Scroll Loader */}
					{viewMode !== "table" && (
						<InfiniteScrollLoader
							isLoading={isLoading}
							hasMore={hasMore}
							autoLoad={preferences.autoLoadInfiniteScroll}
						/>
					)}
				</>
			) : (
				<Stack align="center" py="xl" gap="md">
					<IconBox size={64} style={{ color: "var(--mantine-color-gray-4)" }} />
					<Text size="lg" fw={500}>
						{filters.search.trim() || filters.type !== "all" || filters.brands.length > 0 || filters.categories.length > 0 || filters.grades.length > 0 || filters.scales.length > 0 || filters.series.length > 0 || filters.languages.length > 0
							? "No items or manuals match your filters"
							: "No items or manuals found"}
					</Text>
					<Text c="dimmed" ta="center">
						{filters.search.trim() || filters.type !== "all" || filters.brands.length > 0 || filters.categories.length > 0 || filters.grades.length > 0 || filters.scales.length > 0 || filters.series.length > 0 || filters.languages.length > 0
							? "Try adjusting your filters to see more items."
							: "The database appears to be empty."}
					</Text>
				</Stack>
			)}
		</Stack>
	);
}