"use client";

import type { Brand, Category, GradeData, Item, ScaleData, Series } from "@hobby-ninja/data";
import {
	ActionIcon,
	Box,
	Button,
	Container,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { IconArrowNarrowRight, IconChevronDown, IconChevronUp, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CollapsibleGrid } from "@/components/collapsible-grid";
import { EntityCard } from "@/components/entity-card";
import { ExploreSection, OTHER_FILTER_ID, type ExploreSectionHandle } from "@/components/explore-section";
import { YearScrollbar } from "@/components/ui/year-scrollbar";
import { useFilters, type FilterEntityData } from "@/contexts/filter-context";
import { useStickyFilters } from "@/contexts/sticky-filters-context";
import { useThemeContext } from "@/providers/mantine-provider";

// P-Bandai child brand IDs - these are hidden from the UI, replaced by "pb"
const PBANDAI_CHILD_IDS = new Set(["pb_gunpla", "pb_hg", "pb_mg", "pb_rg", "pb_pg", "pb_bb", "pb_others", "pb_charapla"]);

/** Year data for filtering */
export interface YearData {
	id: string;
	name: string;
	year: number;
	itemIds: string[];
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

/**
 * Main homepage component that registers entity data with the filter context
 */
export function HomepageClient({ categories, series, grades, brands, scales, years, items }: HomepageClientProps): React.ReactElement {
	// Get filter context (provided by layout) and register entity data
	const { registerEntityData } = useFilters();

	// Create entity data for the filter context
	const entityData: FilterEntityData = useMemo(() => ({
		categories,
		series,
		brands,
		grades,
		scales,
		years,
		items,
	}), [categories, series, brands, grades, scales, years, items]);

	// Register entity data with the filter context when homepage mounts
	useEffect(() => {
		registerEntityData(entityData);
	}, [registerEntityData, entityData]);

	return (
		<HomepageClientContent
			categories={categories}
			series={series}
			grades={grades}
			brands={brands}
			scales={scales}
			years={years}
			items={items}
		/>
	);
}

/**
 * Inner component that contains the homepage logic
 */
function HomepageClientContent({ categories, series, grades, brands, scales, years, items }: HomepageClientProps): React.ReactElement {
	// Use filter context directly as single source of truth
	const {
		filters,
		toggleFilter,
		clearFilters,
		hasActiveFilters,
		selectedCount,
	} = useFilters();

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

	// Filter out P-Bandai child brands (pb_*) - only show the parent "pb" brand
	const displayBrands = useMemo(
		() => brands.filter((b) => !PBANDAI_CHILD_IDS.has(b.id)),
		[brands],
	);

	// Sync hasActiveFilters to context for header button visibility
	useEffect(() => {
		stickyFilters.setHasActiveFilters(hasActiveFilters);
	}, [hasActiveFilters, stickyFilters]);

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

			{/* Main content - add right padding to avoid scrollbar overlap */}
			{/* In constrained mode on large screens, Container is centered with margins so no padding needed */}
			{/* Scrollbar dimensions: RIGHT_OFFSET + CONTAINER_WIDTH (8+36=44 mobile, 16+60=76 desktop) */}
			<Box pr={fullWidth ? { base: 44, md: 76 } : { base: 44, md: 76, xl: 0 }}>
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
