"use client";

import type { Brand, Category, GradeData, ScaleData, Series } from "@hobby-ninja/data";
import { getGradeFamilyIds, getGradesHierarchy, resolveCdnUrl } from "@hobby-ninja/data";
import {
	Badge,
	Box,
	Button,
	Collapse,
	Divider,
	Group,
	Stack,
	Switch,
	Text,
	TextInput,
	UnstyledButton,
} from "@mantine/core";
import {
	IconBook,
	IconChevronDown,
	IconChevronUp,
	IconSearch,
	IconWorld,
	IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import type { YearData } from "@/components/homepage-client";
import { FittedText, ImageWithFallback } from "@/components/image-with-fallback";
import { OTHER_FILTER_ID, useFilters } from "@/contexts/filter-context";

// ============================================================================
// Types
// ============================================================================

type FilterableEntity = Category | Series | Brand | GradeData | ScaleData | YearData;

// ============================================================================
// Constants
// ============================================================================

/** Mini card width in pixels */
const MINI_CARD_WIDTH = 75;

/** Card aspect ratio (image area only): 300/170 ≈ 1.76 */
const CARD_ASPECT_RATIO_STRING = "300 / 170";

/** Padding for count section */
const COUNT_PADDING = "2px 4px";

/** Default hover background color */
const BG_HOVER = "var(--mantine-color-default-hover)";

// ============================================================================
// Mini Entity Card
// ============================================================================

interface MiniEntityCardProps {
	id: string;
	name?: string | { ja: string; en?: string };
	itemCount: number;
	image?: string;
	isSelected: boolean;
	onToggle: () => void;
	/** Optional badge to show (e.g., "2/5" for selection counts) */
	badge?: string;
}

function MiniEntityCard({ name, itemCount, image, isSelected, onToggle, badge }: MiniEntityCardProps) {
	const displayName = typeof name === "string"
		? name
		: (name?.en ?? name?.ja ?? "");

	return (
		<UnstyledButton
			onClick={onToggle}
			style={{
				width: MINI_CARD_WIDTH,
				flexShrink: 0,
			}}
		>
			<Box
				style={{
					border: isSelected
						? "2px solid var(--mantine-primary-color-filled)"
						: "1px solid var(--mantine-color-default-border)",
					borderRadius: "var(--mantine-radius-sm)",
					overflow: "hidden",
					backgroundColor: "var(--mantine-color-body)",
				}}
			>
				{/* Image area with aspect ratio */}
				<Box
					style={{
						aspectRatio: CARD_ASPECT_RATIO_STRING,
						backgroundColor: "white",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						position: "relative",
						overflow: "hidden",
					}}
				>
					{image ? (
						<ImageWithFallback
							src={resolveCdnUrl(image)}
							alt={displayName}
							fallbackText={displayName}
						/>
					) : (
						<FittedText text={displayName} />
					)}

					{/* Selected overlay */}
					{isSelected && (
						<Box
							style={{
								position: "absolute",
								inset: 0,
								background: "var(--mantine-primary-color-light)",
								pointerEvents: "none",
							}}
						/>
					)}

					{/* Selection count badge */}
					{badge && (
						<Badge
							size="xs"
							variant="filled"
							style={{
								position: "absolute",
								top: 2,
								right: 2,
								fontSize: 9,
								padding: "0 4px",
								minWidth: "auto",
							}}
						>
							{badge}
						</Badge>
					)}
				</Box>

				{/* Count section */}
				<Box
					style={{
						backgroundColor: isSelected
							? "var(--mantine-primary-color-light)"
							: BG_HOVER,
						padding: COUNT_PADDING,
					}}
				>
					<Text size="xs" ta="center" truncate={true}>
						{itemCount.toLocaleString()}
					</Text>
				</Box>
			</Box>
		</UnstyledButton>
	);
}

// ============================================================================
// Filter Section
// ============================================================================

interface FilterSectionProps {
	title: string;
	entities: FilterableEntity[];
	selectedIds: string[];
	onToggle: (id: string) => void;
	otherCount?: number;
	showSearch?: boolean;
	getImage?: (entity: FilterableEntity) => string | undefined;
	getItemCount?: (entity: FilterableEntity) => number;
}

function FilterSection({
	title,
	entities,
	selectedIds,
	onToggle,
	otherCount = 0,
	showSearch = false,
	getImage = (e) => (e as { image?: string }).image,
	getItemCount = (e) => (e as { itemIds?: string[] }).itemIds?.length ?? 0,
}: FilterSectionProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const selectedCount = selectedIds.length;

	// Filter entities by search
	const filteredEntities = useMemo(() => {
		if (!searchQuery.trim()) return entities;

		const query = searchQuery.toLowerCase();
		return entities.filter((entity) => {
			const entityName = entity.name;
			const name = typeof entityName === "string"
				? entityName
				: (entityName.en ?? entityName.ja);
			return name.toLowerCase().includes(query);
		});
	}, [entities, searchQuery]);

	// Sort: selected items first, then by item count
	const sortedEntities = useMemo(() => {
		return filteredEntities.toSorted((a, b) => {
			const aSelected = selectedIds.includes(a.id);
			const bSelected = selectedIds.includes(b.id);
			if (aSelected !== bSelected) return aSelected ? -1 : 1;
			return getItemCount(b) - getItemCount(a);
		});
	}, [filteredEntities, selectedIds, getItemCount]);

	// Include "Other" option
	const showOther = otherCount > 0;
	const isOtherSelected = selectedIds.includes(OTHER_FILTER_ID);

	return (
		<Box>
			{/* Section header */}
			<UnstyledButton
				onClick={() => { setIsExpanded(!isExpanded); }}
				w="100%"
				py="xs"
			>
				<Group justify="space-between">
					<Group gap="xs">
						<Text size="sm" fw={600}>{title}</Text>
						{selectedCount > 0 && (
							<Badge size="sm" variant="filled" circle={true}>
								{selectedCount}
							</Badge>
						)}
					</Group>
					{isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
				</Group>
			</UnstyledButton>

			<Collapse in={isExpanded}>
				<Stack gap="xs" pb="sm">
					{/* Search input for large filter lists */}
					{showSearch && (
						<TextInput
							placeholder={`Search ${title.toLowerCase()}...`}
							size="xs"
							leftSection={<IconSearch size={14} />}
							value={searchQuery}
							onChange={(e) => { setSearchQuery(e.currentTarget.value); }}
							rightSection={
								searchQuery ? (
									<UnstyledButton onClick={() => { setSearchQuery(""); }}>
										<IconX size={14} />
									</UnstyledButton>
								) : null
							}
						/>
					)}

					{/* Search results count */}
					{showSearch && searchQuery && (
						<Text size="xs" c="dimmed">
							{filteredEntities.length} of {entities.length} shown
						</Text>
					)}

					{/* Entity cards grid */}
					<Box
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: 8,
						}}
					>
						{sortedEntities.map((entity) => (
							<MiniEntityCard
								key={entity.id}
								id={entity.id}
								name={entity.name}
								itemCount={getItemCount(entity)}
								image={getImage(entity)}
								isSelected={selectedIds.includes(entity.id)}
								onToggle={() => { onToggle(entity.id); }}
							/>
						))}

						{/* "Other" card */}
						{showOther && (
							<MiniEntityCard
								id={OTHER_FILTER_ID}
								name="Other"
								itemCount={otherCount}
								isSelected={isOtherSelected}
								onToggle={() => { onToggle(OTHER_FILTER_ID); }}
							/>
						)}
					</Box>
				</Stack>
			</Collapse>
		</Box>
	);
}

// ============================================================================
// Grade Section (with hierarchy)
// ============================================================================

interface GradeSectionProps {
	selectedIds: string[];
	onToggle: (id: string) => void;
	otherCount: number;
}

function GradeSection({ selectedIds, onToggle, otherCount }: GradeSectionProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

	const gradeHierarchy = useMemo(() => getGradesHierarchy(), []);

	// Sort hierarchy: families with selections first, then by total item count
	const sortedHierarchy = useMemo(() => {
		return gradeHierarchy.toSorted((a, b) => {
			const aFamilyIds = getGradeFamilyIds(a.root.id);
			const bFamilyIds = getGradeFamilyIds(b.root.id);
			const aHasSelection = aFamilyIds.some((id) => selectedIds.includes(id));
			const bHasSelection = bFamilyIds.some((id) => selectedIds.includes(id));
			if (aHasSelection !== bHasSelection) return aHasSelection ? -1 : 1;
			// Sort by total item count in family
			const aTotalItems = a.root.itemIds.length + a.children.reduce((sum, c) => sum + c.itemIds.length, 0);
			const bTotalItems = b.root.itemIds.length + b.children.reduce((sum, c) => sum + c.itemIds.length, 0);
			return bTotalItems - aTotalItems;
		});
	}, [gradeHierarchy, selectedIds]);

	const selectedCount = selectedIds.filter((id) => id !== OTHER_FILTER_ID).length;
	const isOtherSelected = selectedIds.includes(OTHER_FILTER_ID);

	const toggleFamilyExpand = (rootId: string) => {
		setExpandedFamilies((prev) => {
			const next = new Set(prev);
			if (next.has(rootId)) {
				next.delete(rootId);
			} else {
				next.add(rootId);
			}
			return next;
		});
	};

	return (
		<Box>
			<UnstyledButton
				onClick={() => { setIsExpanded(!isExpanded); }}
				w="100%"
				py="xs"
			>
				<Group justify="space-between">
					<Group gap="xs">
						<Text size="sm" fw={600}>Grade</Text>
						{selectedCount > 0 && (
							<Badge size="sm" variant="filled" circle={true}>
								{selectedCount}
							</Badge>
						)}
					</Group>
					{isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
				</Group>
			</UnstyledButton>

			<Collapse in={isExpanded}>
				<Stack gap="xs" pb="sm">
					{sortedHierarchy.map((entry) => {
						const { root, children } = entry;
						const hasChildren = children.length > 0;
						const isFamilyExpanded = expandedFamilies.has(root.id);
						const familyIds = getGradeFamilyIds(root.id);
						const selectedInFamily = familyIds.filter((id) => selectedIds.includes(id));
						const isAnySelected = selectedInFamily.length > 0;
						const totalFamilyItems = root.itemIds.length + children.reduce((sum, c) => sum + c.itemIds.length, 0);

						return (
							<Box key={root.id}>
								{/* Parent grade card - click to expand/collapse if has children, or toggle if no children */}
								<MiniEntityCard
									id={root.id}
									name={root.name}
									itemCount={totalFamilyItems}
									image={root.image}
									isSelected={isAnySelected}
									onToggle={() => {
										if (hasChildren) {
											toggleFamilyExpand(root.id);
										} else {
											onToggle(root.id);
										}
									}}
									badge={hasChildren ? (isFamilyExpanded ? "▾" : "▸") : undefined}
								/>

								{/* Child grades (when expanded) */}
								{hasChildren && (
									<Collapse in={isFamilyExpanded}>
										<Box
											mt="xs"
											ml={28}
											pl="xs"
											style={{
												borderLeft: "2px solid var(--mantine-color-blue-light)",
											}}
										>
											<Box
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: 8,
												}}
											>
												{children.map((child) => (
													<MiniEntityCard
														key={child.id}
														id={child.id}
														name={child.name}
														itemCount={child.itemIds.length}
														image={child.image}
														isSelected={selectedIds.includes(child.id)}
														onToggle={() => { onToggle(child.id); }}
													/>
												))}
											</Box>
										</Box>
									</Collapse>
								)}
							</Box>
						);
					})}

					{/* "Other" card */}
					{otherCount > 0 && (
						<MiniEntityCard
							id={OTHER_FILTER_ID}
							name="Other"
							itemCount={otherCount}
							isSelected={isOtherSelected}
							onToggle={() => { onToggle(OTHER_FILTER_ID); }}
						/>
					)}
				</Stack>
			</Collapse>
		</Box>
	);
}

// ============================================================================
// Main Component (inner content when context is available)
// ============================================================================

function SidebarFiltersContent() {
	const {
		isReady,
		filters,
		toggleFilter,
		clearFilters,
		toggleHasManual,
		toggleHasGlobalSite,
		hasActiveFilters,
		selectedCount,
		filteredItemCount,
		entityData,
		otherCounts,
		presets,
		applyPreset,
		isPresetActive,
	} = useFilters();

	const [filtersExpanded, setFiltersExpanded] = useState(true);

	// P-Bandai child brand IDs - filtered from display
	const displayBrands = useMemo(() => {
		if (!isReady) return [];
		const PBANDAI_CHILD_IDS = new Set(["pb_gunpla", "pb_hg", "pb_mg", "pb_rg", "pb_pg", "pb_bb", "pb_others", "pb_charapla"]);
		return entityData.brands.filter((b) => !PBANDAI_CHILD_IDS.has(b.id));
	}, [isReady, entityData.brands]);

	// If entity data not yet registered, show placeholder
	if (!isReady) {
		return (
			<Box p="md">
				<Text size="sm" c="dimmed">Loading filters...</Text>
			</Box>
		);
	}

	return (
		<Stack gap={0}>
			{/* Filters section header */}
			<UnstyledButton
				onClick={() => { setFiltersExpanded(!filtersExpanded); }}
				w="100%"
				p="md"
				style={{
					backgroundColor: BG_HOVER,
				}}
			>
				<Group justify="space-between">
					<Group gap="xs">
						<Text size="sm" fw={700}>Filters</Text>
						{selectedCount > 0 && (
							<Badge size="sm" variant="light">
								{selectedCount}
							</Badge>
						)}
					</Group>
					{filtersExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
				</Group>
			</UnstyledButton>

			<Collapse in={filtersExpanded}>
				<Stack gap={0} px="md">
					{/* Quick presets */}
					<Box py="xs">
						<Text size="xs" c="dimmed" mb="xs">Quick filters</Text>
						<Group gap="xs">
							{presets.map((preset) => (
								<Button
									key={preset.id}
									size="xs"
									variant={isPresetActive(preset) ? "filled" : "light"}
									onClick={() => { applyPreset(preset); }}
								>
									{preset.label}
								</Button>
							))}
						</Group>
					</Box>

					<Divider />

					{/* Filter sections */}
					<FilterSection
						title="Category"
						entities={entityData.categories}
						selectedIds={filters.categories}
						onToggle={(id) => { toggleFilter("categories", id); }}
						otherCount={otherCounts.categories}
					/>

					<Divider />

					<GradeSection
						selectedIds={filters.grades}
						onToggle={(id) => { toggleFilter("grades", id); }}
						otherCount={otherCounts.grades}
					/>

					<Divider />

					<FilterSection
						title="Brand"
						entities={displayBrands}
						selectedIds={filters.brands}
						onToggle={(id) => { toggleFilter("brands", id); }}
						otherCount={otherCounts.brands}
						showSearch={displayBrands.length > 20}
					/>

					<Divider />

					<FilterSection
						title="Series"
						entities={entityData.series}
						selectedIds={filters.series}
						onToggle={(id) => { toggleFilter("series", id); }}
						otherCount={otherCounts.series}
						showSearch={entityData.series.length > 20}
					/>

					<Divider />

					<FilterSection
						title="Scale"
						entities={entityData.scales}
						selectedIds={filters.scales}
						onToggle={(id) => { toggleFilter("scales", id); }}
						otherCount={otherCounts.scales}
					/>

					<Divider />

					<FilterSection
						title="Year"
						entities={entityData.years}
						selectedIds={filters.years}
						onToggle={(id) => { toggleFilter("years", id); }}
						otherCount={otherCounts.years}
						getItemCount={(e) => (e as YearData).itemIds.length}
					/>

					<Divider />

					{/* Boolean filters */}
					<Stack gap="sm" py="sm">
						<Switch
							checked={filters.hasManual}
							onChange={toggleHasManual}
							label={
								<Group gap="xs">
									<IconBook size={16} />
									<Text size="sm">Has Manual</Text>
								</Group>
							}
							styles={{
								track: { cursor: "pointer" },
								label: { cursor: "pointer" },
							}}
						/>
						<Switch
							checked={filters.hasGlobalSite}
							onChange={toggleHasGlobalSite}
							label={
								<Group gap="xs">
									<IconWorld size={16} />
									<Text size="sm">Has Global Site</Text>
								</Group>
							}
							styles={{
								track: { cursor: "pointer" },
								label: { cursor: "pointer" },
							}}
						/>
					</Stack>

					{/* Clear button */}
					{hasActiveFilters && (
						<>
							<Divider />
							<Box py="sm">
								<Button
									variant="subtle"
									size="xs"
									leftSection={<IconX size={14} />}
									onClick={clearFilters}
									fullWidth={true}
								>
									Clear all filters
								</Button>
							</Box>
						</>
					)}
				</Stack>
			</Collapse>

			{/* Result count (always visible) */}
			<Box
				px="md"
				py="sm"
				style={{
					backgroundColor: BG_HOVER,
					borderTop: "1px solid var(--mantine-color-default-border)",
				}}
			>
				<Text size="sm" ta="center" fw={500}>
					{filteredItemCount.toLocaleString()} item{filteredItemCount === 1 ? "" : "s"} match
				</Text>
			</Box>
		</Stack>
	);
}

// ============================================================================
// Exported Component
// ============================================================================

interface SidebarFiltersProps {
	onClose?: () => void;
}

export function SidebarFilters(_props: SidebarFiltersProps) {
	return <SidebarFiltersContent />;
}
