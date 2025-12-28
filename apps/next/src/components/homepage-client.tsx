"use client";

import type { Brand, Category, GradeData, Item, ScaleData, Series } from "@hobby-ninja/data";
import { getGradeFamilyIds, getGradeFamilyItemIds, getGradesHierarchy } from "@hobby-ninja/data";
import {
	Button,
	Container,
	Divider,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { IconArrowNarrowRight, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { CollapsibleGrid } from "@/components/collapsible-grid";
import { EntityCard } from "@/components/entity-card";
import { ExploreSection, OTHER_FILTER_ID, type FilterState } from "@/components/explore-section";

// P-Bandai child brand IDs - these are hidden from the UI, replaced by "pb"
const PBANDAI_CHILD_IDS = new Set(["pb_gunpla", "pb_hg", "pb_mg", "pb_rg", "pb_pg", "pb_bb", "pb_others", "pb_charapla"]);

interface HomepageClientProps {
	categories: Category[];
	series: Series[];
	grades: GradeData[];
	brands: Brand[];
	scales: ScaleData[];
	items: Item[];
}

export function HomepageClient({ categories, series, grades, brands, scales, items }: HomepageClientProps): React.ReactElement {
	const [filters, setFilters] = useState<FilterState>({
		categories: [],
		series: [],
		brands: [],
		grades: [],
		scales: [],
	});

	// Track expanded state for each section
	const [expandedSections, setExpandedSections] = useState({
		categories: false,
		series: false,
		grades: false,
		brands: false,
		scales: false,
	});

	// Track which grade families are expanded to show children
	const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

	// Get grade hierarchy for expand/collapse behavior
	const gradeHierarchy = useMemo(() => getGradesHierarchy(), []);

	// Filter out P-Bandai child brands (pb_*) - only show the parent "pb" brand
	const displayBrands = useMemo(
		() => brands.filter((b) => !PBANDAI_CHILD_IDS.has(b.id)),
		[brands],
	);

	const toggleFilter = useCallback((type: keyof FilterState, id: string) => {
		setFilters((prev) => {
			const current = prev[type];
			const isSelected = current.includes(id);
			return {
				...prev,
				[type]: isSelected
					? current.filter((i) => i !== id)
					: [...current, id],
			};
		});
	}, []);

	const clearFilters = useCallback(() => {
		setFilters({ categories: [], series: [], brands: [], grades: [], scales: [] });
	}, []);

	const clearCategories = useCallback(() => {
		setFilters((prev) => ({ ...prev, categories: [] }));
	}, []);

	const clearSeries = useCallback(() => {
		setFilters((prev) => ({ ...prev, series: [] }));
	}, []);

	const clearBrands = useCallback(() => {
		setFilters((prev) => ({ ...prev, brands: [] }));
	}, []);

	const clearGrades = useCallback(() => {
		setFilters((prev) => ({ ...prev, grades: [] }));
		setExpandedFamilies(new Set());
	}, []);

	const clearScales = useCallback(() => {
		setFilters((prev) => ({ ...prev, scales: [] }));
	}, []);

	// Toggle all grades in a family (select/deselect entire family)
	// Also handles auto-expand when selecting, auto-collapse when deselecting
	const toggleGradeFamily = useCallback((rootId: string) => {
		const familyIds = getGradeFamilyIds(rootId);
		setFilters((prev) => {
			const currentGrades = prev.grades;
			const anySelected = familyIds.some((id) => currentGrades.includes(id));

			if (anySelected) {
				// Deselect all family grades and collapse
				setExpandedFamilies((prevExp) => {
					const next = new Set(prevExp);
					next.delete(rootId);
					return next;
				});
				return {
					...prev,
					grades: currentGrades.filter((id) => !familyIds.includes(id)),
				};
			} else {
				// Select all family grades and expand
				setExpandedFamilies((prevExp) => {
					const next = new Set(prevExp);
					next.add(rootId);
					return next;
				});
				const newGrades = [...currentGrades];
				for (const id of familyIds) {
					if (!newGrades.includes(id)) {
						newGrades.push(id);
					}
				}
				return { ...prev, grades: newGrades };
			}
		});
	}, []);

	const hasActiveFilters =
		filters.categories.length > 0 ||
		filters.series.length > 0 ||
		filters.brands.length > 0 ||
		filters.grades.length > 0 ||
		filters.scales.length > 0;

	const selectedCount = filters.categories.length + filters.series.length + filters.brands.length + filters.grades.length + filters.scales.length;

	// Sort items with selected ones first (for collapsed horizontal scroll view)
	const sortedCategories = useMemo(() => {
		if (filters.categories.length === 0) return categories;
		const selected = categories.filter((c) => filters.categories.includes(c.id));
		const unselected = categories.filter((c) => !filters.categories.includes(c.id));
		return [...selected, ...unselected];
	}, [categories, filters.categories]);

	const sortedSeries = useMemo(() => {
		if (filters.series.length === 0) return series;
		const selected = series.filter((s) => filters.series.includes(s.id));
		const unselected = series.filter((s) => !filters.series.includes(s.id));
		return [...selected, ...unselected];
	}, [series, filters.series]);

	const sortedBrands = useMemo(() => {
		if (filters.brands.length === 0) return displayBrands;
		const selected = displayBrands.filter((b) => filters.brands.includes(b.id));
		const unselected = displayBrands.filter((b) => !filters.brands.includes(b.id));
		return [...selected, ...unselected];
	}, [displayBrands, filters.brands]);

	const sortedScales = useMemo(() => {
		if (filters.scales.length === 0) return scales;
		const selected = scales.filter((s) => filters.scales.includes(s.id));
		const unselected = scales.filter((s) => !filters.scales.includes(s.id));
		return [...selected, ...unselected];
	}, [scales, filters.scales]);

	// Sort grade hierarchy so selected families come first (for collapsed view)
	const sortedGradeHierarchy = useMemo(() => {
		if (filters.grades.length === 0) return gradeHierarchy;
		const selected = gradeHierarchy.filter((entry) => {
			const familyIds = getGradeFamilyIds(entry.root.id);
			return familyIds.some((id) => filters.grades.includes(id));
		});
		const unselected = gradeHierarchy.filter((entry) => {
			const familyIds = getGradeFamilyIds(entry.root.id);
			return !familyIds.some((id) => filters.grades.includes(id));
		});
		return [...selected, ...unselected];
	}, [gradeHierarchy, filters.grades]);

	// Count visible selected grade cards
	// When section collapsed: count root families with any selection (1 card per family)
	// When section expanded: count all visible selected cards including expanded children
	const visibleSelectedGradeCount = useMemo(() => {
		if (!expandedSections.grades) {
			// Section collapsed: only root cards shown, count families with any selection
			return sortedGradeHierarchy.filter((entry) => {
				const { root, children } = entry;
				if (children.length === 0) {
					return filters.grades.includes(root.id);
				}
				const familyIds = getGradeFamilyIds(root.id);
				return familyIds.some((id) => filters.grades.includes(id));
			}).length;
		}

		// Section expanded: count each visible selected card
		let count = 0;
		for (const entry of gradeHierarchy) {
			const { root, children } = entry;
			const hasChildren = children.length > 0;
			const isExpanded = expandedFamilies.has(root.id);
			const familyIds = getGradeFamilyIds(root.id);
			const anySelectedInFamily = familyIds.some((id) => filters.grades.includes(id));

			if (!isExpanded || !hasChildren) {
				// Collapsed family or no children: 1 card visible
				if (hasChildren ? anySelectedInFamily : filters.grades.includes(root.id)) {
					count++;
				}
			} else {
				// Expanded family: root + "root only" + children cards
				// Root card - selected if any in family selected
				if (anySelectedInFamily) count++;
				// "Root only" card - selected if root.id specifically selected
				if (filters.grades.includes(root.id)) count++;
				// Child cards - each selected if that child.id selected
				for (const child of children) {
					if (filters.grades.includes(child.id)) count++;
				}
			}
		}
		return count;
	}, [gradeHierarchy, sortedGradeHierarchy, expandedSections.grades, expandedFamilies, filters.grades]);

	// Count items without categories/series/brands/scales for "Other" option
	const otherCounts = useMemo(() => ({
		categories: items.filter((item) => item.categories.length === 0).length,
		series: items.filter((item) => item.series.length === 0).length,
		brands: items.filter((item) => item.brands.length === 0).length,
		scales: items.filter((item) => item.scales.length === 0).length,
	}), [items]);

	return (
		<>
			{/* Categories, Grades, Brands & Series */}
			<Container size="xl" py="xl" w="100%">
				<Stack gap="xl">
					<CollapsibleGrid
						title="Categories"
						totalCount={categories.length + 1}
						selectedCount={filters.categories.length}
						expanded={expandedSections.categories}
						onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, categories: exp })); }}
						onClear={clearCategories}
					>
						{(expandedSections.categories ? categories : sortedCategories).map((category) => (
							<EntityCard
								key={category.id}
								id={category.id}
								name={category.name}
								itemIds={category.itemIds}
								image={category.image}
								type="category"
								asFilter={true}
								isSelected={filters.categories.includes(category.id)}
								onToggle={() => { toggleFilter("categories", category.id); }}
							/>
						))}
						<EntityCard
							key={OTHER_FILTER_ID}
							id={OTHER_FILTER_ID}
							name="Other"
							itemIds={Array.from({ length: otherCounts.categories }, () => "")}
							type="category"
							asFilter={true}
							isSelected={filters.categories.includes(OTHER_FILTER_ID)}
							onToggle={() => { toggleFilter("categories", OTHER_FILTER_ID); }}
						/>
					</CollapsibleGrid>

					<Divider />

					<CollapsibleGrid
						title="Grades"
						totalCount={grades.length}
						selectedCount={visibleSelectedGradeCount}
						expanded={expandedSections.grades}
						onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, grades: exp })); }}
						onClear={clearGrades}
					>
						{(expandedSections.grades ? gradeHierarchy : sortedGradeHierarchy).flatMap((entry) => {
							const { root, children } = entry;
							const hasChildren = children.length > 0;
							// Only show expanded families when the section itself is expanded
							const isExpanded = expandedSections.grades && expandedFamilies.has(root.id);
							const familyIds = getGradeFamilyIds(root.id);
							const selectedInFamily = familyIds.filter((id) => filters.grades.includes(id)).length;

							// When section collapsed, family collapsed, or no children: just show root grade
							if (!isExpanded || !hasChildren) {
								return (
									<EntityCard
										key={root.id}
										id={root.id}
										name={root.name}
										itemIds={hasChildren ? getGradeFamilyItemIds(root.id) : root.itemIds}
										image={root.image}
										type="grade"
										asFilter={true}
										isSelected={hasChildren ? selectedInFamily > 0 : filters.grades.includes(root.id)}
										onToggle={() => {
											if (hasChildren) {
												toggleGradeFamily(root.id);
											} else {
												toggleFilter("grades", root.id);
											}
										}}
									/>
								);
							}

							// Expanded with children: return array of cards (each gets own grid cell)
							return [
								// Root grade - clicking toggles family selection + collapses
								<EntityCard
									key={root.id}
									id={root.id}
									name={root.name}
									itemIds={getGradeFamilyItemIds(root.id)}
									image={root.image}
									type="grade"
									asFilter={true}
									isSelected={selectedInFamily > 0}
									onToggle={() => { toggleGradeFamily(root.id); }}
								/>,
								// Root-only option - toggle just the root grade
								<EntityCard
									key={`${root.id}-root-only`}
									id={`${root.id}-root-only`}
									name={`${typeof root.name === "string" ? root.name : root.name.en ?? root.name.ja} only`}
									itemIds={root.itemIds}
									image={root.image}
									type="grade"
									asFilter={true}
									isSelected={filters.grades.includes(root.id)}
									onToggle={() => { toggleFilter("grades", root.id); }}
								/>,
								// Child grades
								...children.map((child) => (
									<EntityCard
										key={child.id}
										id={child.id}
										name={child.name}
										itemIds={child.itemIds}
										image={child.image}
										type="grade"
										asFilter={true}
										isSelected={filters.grades.includes(child.id)}
										onToggle={() => { toggleFilter("grades", child.id); }}
									/>
								)),
							];
						})}
					</CollapsibleGrid>

					<Divider />

					<CollapsibleGrid
						title="Brands"
						totalCount={displayBrands.length + 1}
						selectedCount={filters.brands.length}
						expanded={expandedSections.brands}
						onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, brands: exp })); }}
						onClear={clearBrands}
					>
						{(expandedSections.brands ? displayBrands : sortedBrands).map((brand) => (
							<EntityCard
								key={brand.id}
								id={brand.id}
								name={brand.name}
								itemIds={brand.itemIds}
								image={brand.image}
								type="brand"
								asFilter={true}
								isSelected={filters.brands.includes(brand.id)}
								onToggle={() => { toggleFilter("brands", brand.id); }}
							/>
						))}
						<EntityCard
							key={OTHER_FILTER_ID}
							id={OTHER_FILTER_ID}
							name="Other"
							itemIds={Array.from({ length: otherCounts.brands }, () => "")}
							type="brand"
							asFilter={true}
							isSelected={filters.brands.includes(OTHER_FILTER_ID)}
							onToggle={() => { toggleFilter("brands", OTHER_FILTER_ID); }}
						/>
					</CollapsibleGrid>

					<Divider />

					<CollapsibleGrid
						title="Scales"
						totalCount={scales.length + 1}
						selectedCount={filters.scales.length}
						expanded={expandedSections.scales}
						onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, scales: exp })); }}
						onClear={clearScales}
					>
						{(expandedSections.scales ? scales : sortedScales).map((scale) => (
							<EntityCard
								key={scale.id}
								id={scale.id}
								name={scale.name}
								itemIds={scale.itemIds}
								type="scale"
								asFilter={true}
								isSelected={filters.scales.includes(scale.id)}
								onToggle={() => { toggleFilter("scales", scale.id); }}
							/>
						))}
						<EntityCard
							key={OTHER_FILTER_ID}
							id={OTHER_FILTER_ID}
							name="Other"
							itemIds={Array.from({ length: otherCounts.scales }, () => "")}
							type="scale"
							asFilter={true}
							isSelected={filters.scales.includes(OTHER_FILTER_ID)}
							onToggle={() => { toggleFilter("scales", OTHER_FILTER_ID); }}
						/>
					</CollapsibleGrid>

					<Divider />

					<CollapsibleGrid
						title="Series"
						totalCount={series.length + 1}
						selectedCount={filters.series.length}
						onClear={clearSeries}
						expanded={expandedSections.series}
						onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, series: exp })); }}
					>
						{(expandedSections.series ? series : sortedSeries).map((s) => (
							<EntityCard
								key={s.id}
								id={s.id}
								name={s.name}
								itemIds={s.itemIds}
								image={s.image}
								type="series"
								asFilter={true}
								isSelected={filters.series.includes(s.id)}
								onToggle={() => { toggleFilter("series", s.id); }}
							/>
						))}
						<EntityCard
							key={OTHER_FILTER_ID}
							id={OTHER_FILTER_ID}
							name="Other"
							itemIds={Array.from({ length: otherCounts.series }, () => "")}
							type="series"
							asFilter={true}
							isSelected={filters.series.includes(OTHER_FILTER_ID)}
							onToggle={() => { toggleFilter("series", OTHER_FILTER_ID); }}
						/>
					</CollapsibleGrid>
				</Stack>
			</Container>

			{/* Explore */}
			<Container size="xl" py="xl" w="100%">
				<Stack gap="xl">
					<Group justify="space-between" align="center">
						<Group gap="md">
							<Title order={2} size="h2" fw={600}>
								Explore
							</Title>
							{hasActiveFilters && (
								<Button
									variant="subtle"
									size="xs"
									leftSection={<IconX size={14} />}
									onClick={clearFilters}
								>
									Clear {selectedCount} filter{selectedCount > 1 ? "s" : ""}
								</Button>
							)}
						</Group>
						<Link href="/database" style={{ textDecoration: "none" }}>
							<Group gap="xs" c="blue">
								<Text size="sm" fw={600}>View all</Text>
								<IconArrowNarrowRight size={16} />
							</Group>
						</Link>
					</Group>

					<ExploreSection
						items={items}
						filters={filters}
						totalCount={items.length}
					/>
				</Stack>
			</Container>
		</>
	);
}
