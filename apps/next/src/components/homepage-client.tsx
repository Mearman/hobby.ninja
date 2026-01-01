"use client";

import type { Brand, Category, GradeData, Item, ScaleData, Series } from "@hobby-ninja/data";
import { getGradeFamilyIds, getGradeFamilyItemIds, getGradesHierarchy } from "@hobby-ninja/data";
import {
	ActionIcon,
	Box,
	Button,
	Container,
	Group,
	Stack,
	Switch,
	Text,
	Title,
	Tooltip,
} from "@mantine/core";
import { IconArrowNarrowRight, IconBook, IconCalendar, IconChevronDown, IconChevronUp, IconRuler2, IconSortAscendingLetters, IconSortDescendingNumbers, IconWorld, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CollapsibleGrid } from "@/components/collapsible-grid";
import { EntityCard } from "@/components/entity-card";
import { ExploreSection, OTHER_FILTER_ID, type ArrayFilterType, type ExploreSectionHandle, type FilterState } from "@/components/explore-section";
import { YearScrollbar } from "@/components/ui/year-scrollbar";
import { useStickyFilters } from "@/contexts/sticky-filters-context";
import { useThemeContext } from "@/providers/mantine-provider";

// P-Bandai child brand IDs - these are hidden from the UI, replaced by "pb"
const PBANDAI_CHILD_IDS = new Set(["pb_gunpla", "pb_hg", "pb_mg", "pb_rg", "pb_pg", "pb_bb", "pb_others", "pb_charapla"]);

// Sort toggle tooltip labels
const SORT_BY_NAME = "Sort by name";
const SORT_BY_COUNT = "Sort by count";

// Sort modes per filter type
// - categories/series/brands: "count" (default) or "name" (alphabetical)
// - grades: "default" (original data order) or "count"
// - scales: "count" (default) or "size" (scale size order)
// - years: "date" (default, newest first) or "count"
interface FilterSortModes {
	categories: "count" | "name";
	series: "count" | "name";
	brands: "count" | "name";
	grades: "default" | "count";
	scales: "count" | "size";
	years: "date" | "count";
}

/** Year data for filtering */
export interface YearData {
	id: string;
	name: string;
	year: number;
	itemIds: string[];
}

/** Get display name string from name that may be string or localized object */
function getDisplayName(name: string | { ja: string; en?: string }): string {
	return typeof name === "string" ? name : (name.en ?? name.ja);
}

/** Parse scale string (e.g., "1/144") to numeric value for size sorting */
function parseScaleSize(scaleId: string): number {
	const match = /1\/(\d+)/.exec(scaleId);
	if (match?.[1]) {
		return Number.parseInt(match[1], 10);
	}
	// Non-standard scales go to end
	return Number.MAX_SAFE_INTEGER;
}

interface HomepageClientProps {
	categories: Category[];
	series: Series[];
	grades: GradeData[];
	brands: Brand[];
	scales: ScaleData[];
	years: YearData[];
	items: Item[];
}

export function HomepageClient({ categories, series, grades, brands, scales, years, items }: HomepageClientProps): React.ReactElement {
	const [filters, setFilters] = useState<FilterState>({
		categories: [],
		series: [],
		brands: [],
		grades: [],
		scales: [],
		years: [],
		hasManual: false,
		hasGlobalSite: false,
	});

	// Year scrollbar data - all years for initial render
	const allYearNumbers = useMemo(
		() => years.map((y) => y.year).toSorted((a, b) => b - a),
		[years],
	);
	// Filtered years from ExploreSection (updated when filters change)
	const [filteredYearNumbers, setFilteredYearNumbers] = useState<number[]>([]);

	// Ref for ExploreSection to call scrollToYear
	const exploreSectionRef = useRef<ExploreSectionHandle>(null);

	// Ref for filter section to detect when scrolled past
	const filterSectionRef = useRef<HTMLDivElement>(null);
	// Sticky filters context for shared state with header
	const stickyFilters = useStickyFilters();
	// Full width preference from theme context
	const { fullWidth } = useThemeContext();

	// Handle year selection from scrollbar - scrolls to that year in the virtual grid
	const handleYearSelect = useCallback((year: number) => {
		exploreSectionRef.current?.scrollToYear(year);
	}, []);

	// Get scroll position for a year based on actual item distribution
	const getYearScrollPosition = useCallback((year: number) => {
		return exploreSectionRef.current?.getYearScrollPosition(year) ?? null;
	}, []);

	// Update filtered years when filters change
	useEffect(() => {
		// Use setTimeout to ensure ref is populated after render
		const timeoutId = setTimeout(() => {
			const years = exploreSectionRef.current?.getFilteredYears();
			if (years) {
				setFilteredYearNumbers(years);
			}
		}, 0);
		return () => { clearTimeout(timeoutId); };
	}, [filters]);

	// Use filtered years if available, otherwise all years
	const yearNumbers = filteredYearNumbers.length > 0 ? filteredYearNumbers : allYearNumbers;

	// Track scroll to show/hide sticky filter bar
	useEffect(() => {
		const handleScroll = () => {
			if (!filterSectionRef.current) return;
			const rect = filterSectionRef.current.getBoundingClientRect();
			// Show sticky bar when filter section bottom is above viewport top
			stickyFilters.setIsVisible(rect.bottom < 0);
		};

		handleScroll(); // Check initial state
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => { window.removeEventListener("scroll", handleScroll); };
	}, [stickyFilters]);

	// Sort mode per filter type
	const [sortModes, setSortModes] = useState<FilterSortModes>({
		categories: "count",
		series: "count",
		brands: "count",
		grades: "default",
		scales: "count",
		years: "date",
	});

	// Track expanded state for each section
	const [expandedSections, setExpandedSections] = useState({
		categories: false,
		series: false,
		grades: false,
		brands: false,
		scales: false,
		years: false,
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

	// Track release date (as YYYYMMDD number) of center item to restore after filter changes
	const dateToRestoreRef = useRef<number | null>(null);

	// Helper to capture current center item's date before filter changes
	const captureViewPosition = useCallback(() => {
		const centerDate = exploreSectionRef.current?.getCenterItemDate();
		if (centerDate !== null && centerDate !== undefined) {
			dateToRestoreRef.current = centerDate;
		}
	}, []);

	// Restore scroll position to item with closest date after filter changes
	useEffect(() => {
		if (dateToRestoreRef.current !== null) {
			const dateToRestore = dateToRestoreRef.current;
			dateToRestoreRef.current = null;
			// Small delay to let filtered items render
			const timeoutId = setTimeout(() => {
				exploreSectionRef.current?.scrollToNearestDate(dateToRestore);
			}, 50);
			return () => { clearTimeout(timeoutId); };
		}
	}, [filters]);

	const toggleFilter = useCallback((type: ArrayFilterType, id: string) => {
		captureViewPosition();
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
	}, [captureViewPosition]);

	const clearFilters = useCallback(() => {
		captureViewPosition();
		setFilters({ categories: [], series: [], brands: [], grades: [], scales: [], years: [], hasManual: false, hasGlobalSite: false });
	}, [captureViewPosition]);

	const toggleHasManual = useCallback(() => {
		captureViewPosition();
		setFilters((prev) => ({ ...prev, hasManual: !prev.hasManual }));
	}, [captureViewPosition]);

	const toggleHasGlobalSite = useCallback(() => {
		captureViewPosition();
		setFilters((prev) => ({ ...prev, hasGlobalSite: !prev.hasGlobalSite }));
	}, [captureViewPosition]);

	const clearCategories = useCallback(() => {
		captureViewPosition();
		setFilters((prev) => ({ ...prev, categories: [] }));
	}, [captureViewPosition]);

	const clearSeries = useCallback(() => {
		captureViewPosition();
		setFilters((prev) => ({ ...prev, series: [] }));
	}, [captureViewPosition]);

	const clearBrands = useCallback(() => {
		captureViewPosition();
		setFilters((prev) => ({ ...prev, brands: [] }));
	}, [captureViewPosition]);

	const clearGrades = useCallback(() => {
		captureViewPosition();
		setFilters((prev) => ({ ...prev, grades: [] }));
		setExpandedFamilies(new Set());
	}, [captureViewPosition]);

	const clearScales = useCallback(() => {
		captureViewPosition();
		setFilters((prev) => ({ ...prev, scales: [] }));
	}, [captureViewPosition]);

	const clearYears = useCallback(() => {
		captureViewPosition();
		setFilters((prev) => ({ ...prev, years: [] }));
	}, [captureViewPosition]);

	// Select all callbacks
	const selectAllCategories = useCallback(() => {
		captureViewPosition();
		const allIds = categories.map((c) => c.id);
		setFilters((prev) => ({ ...prev, categories: [...allIds, OTHER_FILTER_ID] }));
	}, [categories, captureViewPosition]);

	const selectAllSeries = useCallback(() => {
		captureViewPosition();
		const allIds = series.map((s) => s.id);
		setFilters((prev) => ({ ...prev, series: [...allIds, OTHER_FILTER_ID] }));
	}, [series, captureViewPosition]);

	const selectAllBrands = useCallback(() => {
		captureViewPosition();
		const allIds = displayBrands.map((b) => b.id);
		setFilters((prev) => ({ ...prev, brands: [...allIds, OTHER_FILTER_ID] }));
	}, [displayBrands, captureViewPosition]);

	const selectAllGrades = useCallback(() => {
		captureViewPosition();
		const allIds = grades.map((g) => g.id);
		setFilters((prev) => ({ ...prev, grades: [...allIds, OTHER_FILTER_ID] }));
		// Expand all grade families that have children
		const familyRoots = gradeHierarchy.filter((entry) => entry.children.length > 0).map((entry) => entry.root.id);
		setExpandedFamilies(new Set(familyRoots));
	}, [grades, gradeHierarchy, captureViewPosition]);

	const selectAllScales = useCallback(() => {
		captureViewPosition();
		const allIds = scales.map((s) => s.id);
		setFilters((prev) => ({ ...prev, scales: [...allIds, OTHER_FILTER_ID] }));
	}, [scales, captureViewPosition]);

	const selectAllYears = useCallback(() => {
		captureViewPosition();
		const allIds = years.map((y) => y.id);
		// Only include OTHER_FILTER_ID if there are items without years
		const hasOther = items.some((item) => !item.releaseDate?.year || item.releaseDate.year <= 0);
		setFilters((prev) => ({ ...prev, years: hasOther ? [...allIds, OTHER_FILTER_ID] : allIds }));
	}, [years, items, captureViewPosition]);

	// Toggle all grades in a family (select/deselect entire family)
	// Also handles auto-expand when selecting, auto-collapse when deselecting
	const toggleGradeFamily = useCallback((rootId: string) => {
		captureViewPosition();
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
	}, [captureViewPosition]);

	const hasActiveFilters =
		filters.categories.length > 0 ||
		filters.series.length > 0 ||
		filters.brands.length > 0 ||
		filters.grades.length > 0 ||
		filters.scales.length > 0 ||
		filters.years.length > 0 ||
		filters.hasManual ||
		filters.hasGlobalSite;

	// Sync hasActiveFilters to context for header button visibility
	useEffect(() => {
		stickyFilters.setHasActiveFilters(hasActiveFilters);
	}, [hasActiveFilters, stickyFilters]);

	const selectedCount = filters.categories.length + filters.series.length + filters.brands.length + filters.grades.length + filters.scales.length + filters.years.length + (filters.hasManual ? 1 : 0) + (filters.hasGlobalSite ? 1 : 0);

	// Sort categories by mode
	const categoriesSorted = useMemo(() => {
		return categories.toSorted((a, b) => {
			if (sortModes.categories === "count") {
				return b.itemIds.length - a.itemIds.length;
			}
			return getDisplayName(a.name).localeCompare(getDisplayName(b.name));
		});
	}, [categories, sortModes.categories]);
	const categoriesCollapsed = useMemo(() => {
		if (filters.categories.length === 0) return categoriesSorted;
		const selected = categoriesSorted.filter((c) => filters.categories.includes(c.id));
		const unselected = categoriesSorted.filter((c) => !filters.categories.includes(c.id));
		return [...selected, ...unselected];
	}, [categoriesSorted, filters.categories]);

	// Sort series by mode
	const seriesSorted = useMemo(() => {
		return series.toSorted((a, b) => {
			if (sortModes.series === "count") {
				return b.itemIds.length - a.itemIds.length;
			}
			return getDisplayName(a.name).localeCompare(getDisplayName(b.name));
		});
	}, [series, sortModes.series]);
	const seriesCollapsed = useMemo(() => {
		if (filters.series.length === 0) return seriesSorted;
		const selected = seriesSorted.filter((s) => filters.series.includes(s.id));
		const unselected = seriesSorted.filter((s) => !filters.series.includes(s.id));
		return [...selected, ...unselected];
	}, [seriesSorted, filters.series]);

	// Sort brands by mode
	const brandsSorted = useMemo(() => {
		return displayBrands.toSorted((a, b) => {
			if (sortModes.brands === "count") {
				return b.itemIds.length - a.itemIds.length;
			}
			return getDisplayName(a.name).localeCompare(getDisplayName(b.name));
		});
	}, [displayBrands, sortModes.brands]);
	const brandsCollapsed = useMemo(() => {
		if (filters.brands.length === 0) return brandsSorted;
		const selected = brandsSorted.filter((b) => filters.brands.includes(b.id));
		const unselected = brandsSorted.filter((b) => !filters.brands.includes(b.id));
		return [...selected, ...unselected];
	}, [brandsSorted, filters.brands]);

	// Sort scales by mode (size = scale size order)
	const scalesSorted = useMemo(() => {
		return scales.toSorted((a, b) => {
			if (sortModes.scales === "count") {
				return b.itemIds.length - a.itemIds.length;
			}
			// Sort by scale size (smaller denominator = larger scale = first)
			return parseScaleSize(a.id) - parseScaleSize(b.id);
		});
	}, [scales, sortModes.scales]);
	const scalesCollapsed = useMemo(() => {
		if (filters.scales.length === 0) return scalesSorted;
		const selected = scalesSorted.filter((s) => filters.scales.includes(s.id));
		const unselected = scalesSorted.filter((s) => !filters.scales.includes(s.id));
		return [...selected, ...unselected];
	}, [scalesSorted, filters.scales]);

	// Sort years by mode (date = newest first, count = by item count)
	const yearsSorted = useMemo(() => {
		return years.toSorted((a, b) => {
			if (sortModes.years === "date") {
				return b.year - a.year; // Newest first
			}
			return b.itemIds.length - a.itemIds.length;
		});
	}, [years, sortModes.years]);
	const yearsCollapsed = useMemo(() => {
		if (filters.years.length === 0) return yearsSorted;
		const selected = yearsSorted.filter((y) => filters.years.includes(y.id));
		const unselected = yearsSorted.filter((y) => !filters.years.includes(y.id));
		return [...selected, ...unselected];
	}, [yearsSorted, filters.years]);

	// Sort grade hierarchy by mode (default = original order, count = by item count)
	const gradesSorted = useMemo(() => {
		if (sortModes.grades === "default") {
			return gradeHierarchy;
		}
		return gradeHierarchy.toSorted((a, b) => {
			const aCount = getGradeFamilyItemIds(a.root.id).length;
			const bCount = getGradeFamilyItemIds(b.root.id).length;
			return bCount - aCount;
		});
	}, [gradeHierarchy, sortModes.grades]);
	const gradesCollapsed = useMemo(() => {
		if (filters.grades.length === 0) return gradesSorted;
		const selected = gradesSorted.filter((entry) => {
			const familyIds = getGradeFamilyIds(entry.root.id);
			return familyIds.some((id) => filters.grades.includes(id));
		});
		const unselected = gradesSorted.filter((entry) => {
			const familyIds = getGradeFamilyIds(entry.root.id);
			return !familyIds.some((id) => filters.grades.includes(id));
		});
		return [...selected, ...unselected];
	}, [gradesSorted, filters.grades]);

	// Count visible selected grade cards
	// When section collapsed: count individual selected cards (partial selection shows children)
	// When section expanded: count all visible selected cards including expanded children
	const visibleSelectedGradeCount = useMemo(() => {
		// Count "Other" option separately (always visible)
		const otherSelected = filters.grades.includes(OTHER_FILTER_ID) ? 1 : 0;

		if (!expandedSections.grades) {
			// Section collapsed: count visible selected cards
			// - Full/no selection: 1 card per family (if selected)
			// - Partial selection: individual selected children shown
			let count = 0;
			for (const entry of gradesCollapsed) {
				const { root, children } = entry;
				const familyIds = getGradeFamilyIds(root.id);
				const selectedInFamily = familyIds.filter((id) => filters.grades.includes(id)).length;

				if (children.length === 0) {
					// No children: count if selected
					if (filters.grades.includes(root.id)) count++;
				} else if (selectedInFamily === 0 || selectedInFamily === familyIds.length) {
					// Full selection or no selection: 1 card shown (count if selected)
					if (selectedInFamily > 0) count++;
				} else {
					// Partial selection: count each individual selected card
					count += selectedInFamily;
				}
			}
			return count + otherSelected;
		}

		// Section expanded: count each visible selected card
		let count = 0;
		for (const entry of gradesSorted) {
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
		return count + otherSelected;
	}, [gradesSorted, gradesCollapsed, expandedSections.grades, expandedFamilies, filters.grades]);

	// Count items without categories/series/brands/grades/scales/years for "Other" option
	const otherCounts = useMemo(() => ({
		categories: items.filter((item) => item.categories.length === 0).length,
		series: items.filter((item) => item.series.length === 0).length,
		brands: items.filter((item) => item.brands.length === 0).length,
		grades: items.filter((item) => Object.keys(item.grades).length === 0).length,
		scales: items.filter((item) => item.scales.length === 0).length,
		years: items.filter((item) => !item.releaseDate?.year || item.releaseDate.year <= 0).length,
	}), [items]);

	// Selected-only items for sticky filter bar
	const categoriesSelectedOnly = useMemo(
		() => categories.filter((c) => filters.categories.includes(c.id)),
		[categories, filters.categories],
	);
	const seriesSelectedOnly = useMemo(
		() => series.filter((s) => filters.series.includes(s.id)),
		[series, filters.series],
	);
	const brandsSelectedOnly = useMemo(
		() => displayBrands.filter((b) => filters.brands.includes(b.id)),
		[displayBrands, filters.brands],
	);
	const gradesSelectedOnly = useMemo(
		() => grades.filter((g) => filters.grades.includes(g.id)),
		[grades, filters.grades],
	);
	const scalesSelectedOnly = useMemo(
		() => scales.filter((s) => filters.scales.includes(s.id)),
		[scales, filters.scales],
	);
	const yearsSelectedOnly = useMemo(
		() => years.filter((y) => filters.years.includes(y.id)),
		[years, filters.years],
	);

	// Container size based on fullWidth preference
	const containerSize = fullWidth ? "100%" : "xl";

	return (
		<>
			{/* Sticky filter bar - appears when scrolled past filter section */}
			<Box
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					zIndex: 100,
					backgroundColor: "var(--mantine-color-body)",
					borderBottom: "1px solid var(--mantine-color-default-border)",
					transform: stickyFilters.isVisible && hasActiveFilters ? "translateY(0)" : "translateY(-100%)",
					opacity: stickyFilters.isVisible && hasActiveFilters ? 1 : 0,
					transition: "transform 300ms ease-out, opacity 300ms ease-out",
				}}
			>
				<Container size={containerSize} py="xs" w="100%">
					<Group justify="space-between" align="center" mb={stickyFilters.expanded ? "xs" : 0}>
						<Group gap="sm">
							<Title order={3} size="h4" fw={600}>
								Active Filters
							</Title>
							<Text size="sm" c="dimmed">
								({selectedCount})
							</Text>
							<Button
								variant="subtle"
								size="xs"
								leftSection={<IconX size={14} />}
								onClick={clearFilters}
							>
								Clear all
							</Button>
						</Group>
						<ActionIcon
							variant="subtle"
							size="sm"
							onClick={stickyFilters.toggleExpanded}
							aria-label={stickyFilters.expanded ? "Collapse filters" : "Expand filters"}
						>
							{stickyFilters.expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
						</ActionIcon>
					</Group>
					{stickyFilters.expanded && (
						<Stack gap={6}>
							{categoriesSelectedOnly.length > 0 && (
								<CollapsibleGrid
									title="Category"
									totalCount={categoriesSelectedOnly.length + (filters.categories.includes(OTHER_FILTER_ID) ? 1 : 0)}
									compactMode={true}
									hideWhenEmpty={true}
								>
									{categoriesSelectedOnly.map((category) => (
										<EntityCard
											key={category.id}
											id={category.id}
											name={category.name}
											itemIds={category.itemIds}
											image={category.image}
											type="category"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("categories", category.id); }}
										/>
									))}
									{filters.categories.includes(OTHER_FILTER_ID) && (
										<EntityCard
											key={OTHER_FILTER_ID}
											id={OTHER_FILTER_ID}
											name="Other"
											itemIds={Array.from({ length: otherCounts.categories }, () => "")}
											type="category"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("categories", OTHER_FILTER_ID); }}
										/>
									)}
								</CollapsibleGrid>
							)}
							{(gradesSelectedOnly.length > 0 || filters.grades.includes(OTHER_FILTER_ID)) && (
								<CollapsibleGrid
									title="Grade"
									totalCount={gradesSelectedOnly.length + (filters.grades.includes(OTHER_FILTER_ID) ? 1 : 0)}
									compactMode={true}
									hideWhenEmpty={true}
								>
									{gradesSelectedOnly.map((grade) => (
										<EntityCard
											key={grade.id}
											id={grade.id}
											name={grade.name}
											itemIds={grade.itemIds}
											image={grade.image}
											type="grade"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("grades", grade.id); }}
										/>
									))}
									{filters.grades.includes(OTHER_FILTER_ID) && (
										<EntityCard
											key={OTHER_FILTER_ID}
											id={OTHER_FILTER_ID}
											name="Other"
											itemIds={Array.from({ length: otherCounts.grades }, () => "")}
											type="grade"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("grades", OTHER_FILTER_ID); }}
										/>
									)}
								</CollapsibleGrid>
							)}
							{(brandsSelectedOnly.length > 0 || filters.brands.includes(OTHER_FILTER_ID)) && (
								<CollapsibleGrid
									title="Brand"
									totalCount={brandsSelectedOnly.length + (filters.brands.includes(OTHER_FILTER_ID) ? 1 : 0)}
									compactMode={true}
									hideWhenEmpty={true}
								>
									{brandsSelectedOnly.map((brand) => (
										<EntityCard
											key={brand.id}
											id={brand.id}
											name={brand.name}
											itemIds={brand.itemIds}
											image={brand.image}
											type="brand"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("brands", brand.id); }}
										/>
									))}
									{filters.brands.includes(OTHER_FILTER_ID) && (
										<EntityCard
											key={OTHER_FILTER_ID}
											id={OTHER_FILTER_ID}
											name="Other"
											itemIds={Array.from({ length: otherCounts.brands }, () => "")}
											type="brand"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("brands", OTHER_FILTER_ID); }}
										/>
									)}
								</CollapsibleGrid>
							)}
							{(seriesSelectedOnly.length > 0 || filters.series.includes(OTHER_FILTER_ID)) && (
								<CollapsibleGrid
									title="Series"
									totalCount={seriesSelectedOnly.length + (filters.series.includes(OTHER_FILTER_ID) ? 1 : 0)}
									compactMode={true}
									hideWhenEmpty={true}
								>
									{seriesSelectedOnly.map((s) => (
										<EntityCard
											key={s.id}
											id={s.id}
											name={s.name}
											itemIds={s.itemIds}
											image={s.image}
											type="series"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("series", s.id); }}
										/>
									))}
									{filters.series.includes(OTHER_FILTER_ID) && (
										<EntityCard
											key={OTHER_FILTER_ID}
											id={OTHER_FILTER_ID}
											name="Other"
											itemIds={Array.from({ length: otherCounts.series }, () => "")}
											type="series"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("series", OTHER_FILTER_ID); }}
										/>
									)}
								</CollapsibleGrid>
							)}
							{(scalesSelectedOnly.length > 0 || filters.scales.includes(OTHER_FILTER_ID)) && (
								<CollapsibleGrid
									title="Scale"
									totalCount={scalesSelectedOnly.length + (filters.scales.includes(OTHER_FILTER_ID) ? 1 : 0)}
									compactMode={true}
									hideWhenEmpty={true}
								>
									{scalesSelectedOnly.map((scale) => (
										<EntityCard
											key={scale.id}
											id={scale.id}
											name={scale.name}
											itemIds={scale.itemIds}
											type="scale"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("scales", scale.id); }}
										/>
									))}
									{filters.scales.includes(OTHER_FILTER_ID) && (
										<EntityCard
											key={OTHER_FILTER_ID}
											id={OTHER_FILTER_ID}
											name="Other"
											itemIds={Array.from({ length: otherCounts.scales }, () => "")}
											type="scale"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("scales", OTHER_FILTER_ID); }}
										/>
									)}
								</CollapsibleGrid>
							)}
							{(yearsSelectedOnly.length > 0 || filters.years.includes(OTHER_FILTER_ID)) && (
								<CollapsibleGrid
									title="Year"
									totalCount={yearsSelectedOnly.length + (filters.years.includes(OTHER_FILTER_ID) ? 1 : 0)}
									compactMode={true}
									hideWhenEmpty={true}
								>
									{yearsSelectedOnly.map((year) => (
										<EntityCard
											key={year.id}
											id={year.id}
											name={year.name}
											itemIds={year.itemIds}
											type="year"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("years", year.id); }}
										/>
									))}
									{filters.years.includes(OTHER_FILTER_ID) && (
										<EntityCard
											key={OTHER_FILTER_ID}
											id={OTHER_FILTER_ID}
											name="Other"
											itemIds={Array.from({ length: otherCounts.years }, () => "")}
											type="year"
											asFilter={true}
											isSelected={true}
											onToggle={() => { toggleFilter("years", OTHER_FILTER_ID); }}
										/>
									)}
								</CollapsibleGrid>
							)}
						</Stack>
					)}
				</Container>
			</Box>

			{/* Main content - add right padding in full width mode to avoid scrollbar overlap */}
			{/* Scrollbar dimensions: RIGHT_OFFSET + CONTAINER_WIDTH (8+36=44 mobile, 16+60=76 desktop) */}
			<Box pr={fullWidth ? { base: 44, md: 76 } : 0}>
				{/* Categories, Grades, Brands & Series */}
				<Container ref={filterSectionRef} size={containerSize} py="xs" w="100%">
					<Stack gap="xs">
						<CollapsibleGrid
							title="Category"
							totalCount={categories.length + 1}
							selectedCount={filters.categories.length}
							expanded={expandedSections.categories}
							onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, categories: exp })); }}
							onClear={clearCategories}
							onSelectAll={selectAllCategories}
							headerRight={
								<Tooltip label={sortModes.categories === "count" ? SORT_BY_NAME : SORT_BY_COUNT}>
									<ActionIcon
										variant="subtle"
										size="sm"
										onClick={() => { setSortModes((prev) => ({ ...prev, categories: prev.categories === "count" ? "name" : "count" })); }}
									>
										{sortModes.categories === "count" ? <IconSortDescendingNumbers size={16} /> : <IconSortAscendingLetters size={16} />}
									</ActionIcon>
								</Tooltip>
							}
						>
							{(expandedSections.categories ? categoriesSorted : categoriesCollapsed).map((category) => (
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

						<CollapsibleGrid
							title="Grade"
							totalCount={grades.length + 1}
							selectedCount={visibleSelectedGradeCount}
							expanded={expandedSections.grades}
							onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, grades: exp })); }}
							onClear={clearGrades}
							onSelectAll={selectAllGrades}
							headerRight={
								<Tooltip label={sortModes.grades === "default" ? SORT_BY_COUNT : "Default order"}>
									<ActionIcon
										variant="subtle"
										size="sm"
										onClick={() => { setSortModes((prev) => ({ ...prev, grades: prev.grades === "default" ? "count" : "default" })); }}
									>
										{sortModes.grades === "default" ? <IconSortAscendingLetters size={16} /> : <IconSortDescendingNumbers size={16} />}
									</ActionIcon>
								</Tooltip>
							}
						>
							{(expandedSections.grades ? gradesSorted : gradesCollapsed).flatMap((entry) => {
								const { root, children } = entry;
								const hasChildren = children.length > 0;
								const familyIds = getGradeFamilyIds(root.id);
								const selectedInFamily = familyIds.filter((id) => filters.grades.includes(id)).length;

								// When section collapsed: show parent OR individual selected children
								if (!expandedSections.grades) {
								// No children or no partial selection: show root card
									if (!hasChildren || selectedInFamily === 0 || selectedInFamily === familyIds.length) {
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

									// Partial selection: show individual selected grades
									const selectedCards: React.ReactElement[] = [];
									if (filters.grades.includes(root.id)) {
										selectedCards.push(
											<EntityCard
												key={root.id}
												id={root.id}
												name={root.name}
												itemIds={root.itemIds}
												image={root.image}
												type="grade"
												asFilter={true}
												isSelected={true}
												onToggle={() => { toggleFilter("grades", root.id); }}
											/>,
										);
									}
									for (const child of children) {
										if (filters.grades.includes(child.id)) {
											selectedCards.push(
												<EntityCard
													key={child.id}
													id={child.id}
													name={child.name}
													itemIds={child.itemIds}
													image={child.image}
													type="grade"
													asFilter={true}
													isSelected={true}
													onToggle={() => { toggleFilter("grades", child.id); }}
												/>,
											);
										}
									}
									return selectedCards;
								}

								// Section expanded but family collapsed: show root card
								const isFamilyExpanded = expandedFamilies.has(root.id);
								if (!isFamilyExpanded || !hasChildren) {
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

								// Family expanded with children: return array of cards
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
							<EntityCard
								key={OTHER_FILTER_ID}
								id={OTHER_FILTER_ID}
								name="Other"
								itemIds={Array.from({ length: otherCounts.grades }, () => "")}
								type="grade"
								asFilter={true}
								isSelected={filters.grades.includes(OTHER_FILTER_ID)}
								onToggle={() => { toggleFilter("grades", OTHER_FILTER_ID); }}
							/>
						</CollapsibleGrid>

						<CollapsibleGrid
							title="Brand"
							totalCount={displayBrands.length + 1}
							selectedCount={filters.brands.length}
							expanded={expandedSections.brands}
							onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, brands: exp })); }}
							onClear={clearBrands}
							onSelectAll={selectAllBrands}
							headerRight={
								<Tooltip label={sortModes.brands === "count" ? SORT_BY_NAME : SORT_BY_COUNT}>
									<ActionIcon
										variant="subtle"
										size="sm"
										onClick={() => { setSortModes((prev) => ({ ...prev, brands: prev.brands === "count" ? "name" : "count" })); }}
									>
										{sortModes.brands === "count" ? <IconSortDescendingNumbers size={16} /> : <IconSortAscendingLetters size={16} />}
									</ActionIcon>
								</Tooltip>
							}
						>
							{(expandedSections.brands ? brandsSorted : brandsCollapsed).map((brand) => (
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

						<CollapsibleGrid
							title="Series"
							totalCount={series.length + 1}
							selectedCount={filters.series.length}
							onClear={clearSeries}
							onSelectAll={selectAllSeries}
							expanded={expandedSections.series}
							onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, series: exp })); }}
							headerRight={
								<Tooltip label={sortModes.series === "count" ? SORT_BY_NAME : SORT_BY_COUNT}>
									<ActionIcon
										variant="subtle"
										size="sm"
										onClick={() => { setSortModes((prev) => ({ ...prev, series: prev.series === "count" ? "name" : "count" })); }}
									>
										{sortModes.series === "count" ? <IconSortDescendingNumbers size={16} /> : <IconSortAscendingLetters size={16} />}
									</ActionIcon>
								</Tooltip>
							}
						>
							{(expandedSections.series ? seriesSorted : seriesCollapsed).map((s) => (
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

						<CollapsibleGrid
							title="Scale"
							totalCount={scales.length + 1}
							selectedCount={filters.scales.length}
							expanded={expandedSections.scales}
							onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, scales: exp })); }}
							onClear={clearScales}
							onSelectAll={selectAllScales}
							headerRight={
								<Tooltip label={sortModes.scales === "count" ? "Sort by size" : SORT_BY_COUNT}>
									<ActionIcon
										variant="subtle"
										size="sm"
										onClick={() => { setSortModes((prev) => ({ ...prev, scales: prev.scales === "count" ? "size" : "count" })); }}
									>
										{sortModes.scales === "count" ? <IconSortDescendingNumbers size={16} /> : <IconRuler2 size={16} />}
									</ActionIcon>
								</Tooltip>
							}
						>
							{(expandedSections.scales ? scalesSorted : scalesCollapsed).map((scale) => (
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

						<CollapsibleGrid
							title="Year"
							totalCount={years.length + (otherCounts.years > 0 ? 1 : 0)}
							selectedCount={filters.years.length}
							cardWidth={80}
							maxColumns={10}
							expanded={expandedSections.years}
							onExpandedChange={(exp) => { setExpandedSections((prev) => ({ ...prev, years: exp })); }}
							onClear={clearYears}
							onSelectAll={selectAllYears}
							headerRight={
								<Tooltip label={sortModes.years === "date" ? SORT_BY_COUNT : "Sort by date"}>
									<ActionIcon
										variant="subtle"
										size="sm"
										onClick={() => { setSortModes((prev) => ({ ...prev, years: prev.years === "date" ? "count" : "date" })); }}
									>
										{sortModes.years === "date" ? <IconCalendar size={16} /> : <IconSortDescendingNumbers size={16} />}
									</ActionIcon>
								</Tooltip>
							}
						>
							{(expandedSections.years ? yearsSorted : yearsCollapsed).map((year) => (
								<EntityCard
									key={year.id}
									id={year.id}
									name={year.name}
									itemIds={year.itemIds}
									type="year"
									asFilter={true}
									isSelected={filters.years.includes(year.id)}
									onToggle={() => { toggleFilter("years", year.id); }}
								/>
							))}
							{otherCounts.years > 0 && (
								<EntityCard
									key={OTHER_FILTER_ID}
									id={OTHER_FILTER_ID}
									name="Other"
									itemIds={Array.from({ length: otherCounts.years }, () => "")}
									type="year"
									asFilter={true}
									isSelected={filters.years.includes(OTHER_FILTER_ID)}
									onToggle={() => { toggleFilter("years", OTHER_FILTER_ID); }}
								/>
							)}
						</CollapsibleGrid>

						{/* Boolean filters */}
						<Group gap="lg" py="xs">
							<Switch
								checked={filters.hasManual}
								onChange={toggleHasManual}
								label={
									<Group gap="xs">
										<IconBook size={16} />
										<Text size="sm" fw={500}>Has Manual</Text>
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
										<Text size="sm" fw={500}>Has Global Site</Text>
									</Group>
								}
								styles={{
									track: { cursor: "pointer" },
									label: { cursor: "pointer" },
								}}
							/>
						</Group>
					</Stack>
				</Container>

				{/* Explore */}
				<Container size={containerSize} py="xl" w="100%">
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
							ref={exploreSectionRef}
							items={items}
							filters={filters}
							totalCount={items.length}
							onFilterToggle={toggleFilter}
						/>
					</Stack>
				</Container>
			</Box>

			{/* Year navigation with integrated scroll-to-top */}
			<YearScrollbar
				years={yearNumbers}
				onYearSelect={handleYearSelect}
				getYearPosition={getYearScrollPosition}
			/>
		</>
	);
}
