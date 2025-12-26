import { brands, categories as allCategoriesData, items, series } from "@hobby-ninja/data";
import {
	Container,
	Divider,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { IconArrowNarrowRight } from "@tabler/icons-react";
import Link from "next/link";

import { CollapsibleGrid } from "@/components/collapsible-grid";
import { EntityCard } from "@/components/entity-card";
import { ExploreSection } from "@/components/explore-section";

export default function HomePage() {
	// Get all items for the Explore section
	const allItems = Object.values(items);

	// Get all categories sorted by item count
	const allCategories = Object.values(allCategoriesData)
		.filter((c) => c.itemIds.length > 0)
		.toSorted((a, b) => b.itemIds.length - a.itemIds.length);

	// Get all series sorted by item count
	const allSeries = Object.values(series)
		.filter((s) => s.itemIds.length > 0)
		.toSorted((a, b) => b.itemIds.length - a.itemIds.length);

	// Get all brands sorted by item count
	const allBrands = Object.values(brands)
		.filter((b) => b.itemIds.length > 0)
		.toSorted((a, b) => b.itemIds.length - a.itemIds.length);

	return (
		<>
			{/* Categories, Series & Brands */}
			<Container size="xl" py="xl" w="100%">
				<Stack gap="xl">
					<CollapsibleGrid
						title="Categories"
						totalCount={allCategories.length}
						cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
						initialCount={6}
						collapsedChildren={allCategories.slice(6).map((category) => (
							<EntityCard key={category.id} type="category" {...category} />
						))}
					>
						{allCategories.slice(0, 6).map((category) => (
							<EntityCard key={category.id} type="category" {...category} />
						))}
					</CollapsibleGrid>

					<Divider />

					<CollapsibleGrid
						title="Series"
						totalCount={allSeries.length}
						cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
						initialCount={6}
						collapsedChildren={allSeries.slice(6).map((s) => (
							<EntityCard key={s.id} type="series" {...s} />
						))}
					>
						{allSeries.slice(0, 6).map((s) => (
							<EntityCard key={s.id} type="series" {...s} />
						))}
					</CollapsibleGrid>

					<Divider />

					<CollapsibleGrid
						title="Brands"
						totalCount={allBrands.length}
						cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
						initialCount={6}
						collapsedChildren={allBrands.slice(6).map((brand) => (
							<EntityCard key={brand.id} type="brand" {...brand} />
						))}
					>
						{allBrands.slice(0, 6).map((brand) => (
							<EntityCard key={brand.id} type="brand" {...brand} />
						))}
					</CollapsibleGrid>
				</Stack>
			</Container>

			{/* Explore */}
			<Container size="xl" py="xl" w="100%">
				<Stack gap="xl">
					<Group justify="space-between" align="center">
						<Title order={2} size="h2" fw={600}>
							Explore
						</Title>
						<Link href="/database" style={{ textDecoration: "none" }}>
							<Group gap="xs" c="blue">
								<Text size="sm" fw={600}>View all</Text>
								<IconArrowNarrowRight size={16} />
							</Group>
						</Link>
					</Group>

					<ExploreSection items={allItems} />
				</Stack>
			</Container>
		</>
	);
}