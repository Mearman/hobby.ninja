import { brands, categories as allCategoriesData, homepage, series } from "@hobby-ninja/data";
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
import { FeaturedItemsGrid } from "@/components/featured-items-grid";

// Convert release date to comparable number (YYYYMMDD)
function releaseDateToNumber(releaseDate?: { year?: number | null; month?: number | null; day?: number | null }): number {
	if (!releaseDate?.year) return 0;
	const year = releaseDate.year;
	const month = releaseDate.month ?? 1;
	const day = releaseDate.day ?? 1;
	return year * 10_000 + month * 100 + day;
}

export default function HomePage() {
	// Use pre-computed homepage data for featured items, sorted by release date (newest first)
	const { featuredItems } = homepage;
	const sortedFeaturedItems = [...featuredItems].toSorted(
		(a, b) => releaseDateToNumber(b.releaseDate) - releaseDateToNumber(a.releaseDate),
	);

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

					<FeaturedItemsGrid items={sortedFeaturedItems} count={8} />
				</Stack>
			</Container>
		</>
	);
}