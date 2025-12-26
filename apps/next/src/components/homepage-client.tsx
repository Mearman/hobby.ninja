"use client";

import type { Brand, Category, GradeData, Item, Series } from "@hobby-ninja/data";
import { getGradeFamilyIds, getGradesHierarchy } from "@hobby-ninja/data";
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

interface HomepageClientProps {
	categories: Category[];
	series: Series[];
	grades: GradeData[];
	brands: Brand[];
	items: Item[];
}

export function HomepageClient({ categories, series, grades, brands, items }: HomepageClientProps): React.ReactElement {
	const [filters, setFilters] = useState<FilterState>({
		categories: [],
		series: [],
		brands: [],
		grades: [],
	});

	// Track expanded state for each section
	const [expandedSections, setExpandedSections] = useState({
		categories: false,
		series: false,
		grades: false,
		brands: false,
	});

	// Track which grade families are expanded to show children
	const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

	// Get grade hierarchy for expand/collapse behavior
	const gradeHierarchy = useMemo(() => getGradesHierarchy(), []);

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
		setFilters({ categories: [], series: [], brands: [], grades: [] });
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
		filters.grades.length > 0;

	const selectedCount = filters.categories.length + filters.series.length + filters.brands.length + filters.grades.length;

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
		if (filters.brands.length === 0) return brands;
		const selected = brands.filter((b) => filters.brands.includes(b.id));
		const unselected = brands.filter((b) => !filters.brands.includes(b.id));
		return [...selected, ...unselected];
	}, [brands, filters.brands]);

	// Count items without categories/series/brands for "Other" option
	const otherCounts = useMemo(() => ({
		categories: items.filter((item) => item.categories.length === 0).length,
		series: items.filter((item) => item.series.length === 0).length,
		brands: items.filter((item) => item.brands.length === 0).length,
	}), [items]);

	return (
		<>
			{/* Categories, Series & Brands */}
			<Container size="xl" py="xl" w="100%">
				<Stack gap="xl">
					<CollapsibleGrid
						title="Categories"
						totalCount={categories.length + 1}
						selectedCount={filters.categories.length}
						expanded={expandedSections.categories}
						onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, categories: exp })); }}
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
						title="Series"
						totalCount={series.length + 1}
						selectedCount={filters.series.length}
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

					<Divider />

					<CollapsibleGrid
						title="Grades"
						totalCount={grades.length}
						selectedCount={filters.grades.length}
						expanded={expandedSections.grades}
						onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, grades: exp })); }}
					>
						{gradeHierarchy.flatMap((entry) => {
							const { root, children } = entry;
							const hasChildren = children.length > 0;
							const isExpanded = expandedFamilies.has(root.id);
							const familyIds = getGradeFamilyIds(root.id);
							const selectedInFamily = familyIds.filter((id) => filters.grades.includes(id)).length;

							// When collapsed or no children: just show root grade
							if (!isExpanded || !hasChildren) {
								return (
									<EntityCard
										key={root.id}
										id={root.id}
										name={root.name}
										itemIds={root.itemIds}
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
									itemIds={root.itemIds}
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
						totalCount={brands.length + 1}
						selectedCount={filters.brands.length}
						expanded={expandedSections.brands}
						onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, brands: exp })); }}
					>
						{(expandedSections.brands ? brands : sortedBrands).map((brand) => (
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
