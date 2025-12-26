"use client";

import type { Brand, Category, Item, Series } from "@hobby-ninja/data";
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
import { ExploreSection, type FilterState } from "@/components/explore-section";

interface HomepageClientProps {
	categories: Category[];
	series: Series[];
	brands: Brand[];
	items: Item[];
}

export function HomepageClient({ categories, series, brands, items }: HomepageClientProps): React.ReactElement {
	const [filters, setFilters] = useState<FilterState>({
		categories: [],
		series: [],
		brands: [],
	});

	// Track expanded state for each section
	const [expandedSections, setExpandedSections] = useState({
		categories: false,
		series: false,
		brands: false,
	});

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
		setFilters({ categories: [], series: [], brands: [] });
	}, []);

	const hasActiveFilters =
		filters.categories.length > 0 ||
		filters.series.length > 0 ||
		filters.brands.length > 0;

	const selectedCount = filters.categories.length + filters.series.length + filters.brands.length;

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

	return (
		<>
			{/* Categories, Series & Brands */}
			<Container size="xl" py="xl" w="100%">
				<Stack gap="xl">
					<CollapsibleGrid
						title="Categories"
						totalCount={categories.length}
						cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
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
					</CollapsibleGrid>

					<Divider />

					<CollapsibleGrid
						title="Series"
						totalCount={series.length}
						cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
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
					</CollapsibleGrid>

					<Divider />

					<CollapsibleGrid
						title="Brands"
						totalCount={brands.length}
						cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
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
