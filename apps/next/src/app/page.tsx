import { brands, categories as allCategoriesData, homepage, resolveCdnUrl, series } from "@hobby-ninja/data";
import {
	Box,
	Card,
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
import { FeaturedItemsGrid } from "@/components/featured-items-grid";
import { ImageWithFallback } from "@/components/image-with-fallback";

// Constants
const STYLE_NO_DECORATION_INHERIT = { textDecoration: "none", color: "inherit" };
const STYLE_CURSOR_POINTER = { cursor: "pointer" };
const STYLE_BORDER_RADIUS_TOP = "var(--mantine-radius-md) var(--mantine-radius-md) 0 0";
const STYLE_IMAGE_CONTAINER = {
	aspectRatio: "300 / 170",
	borderRadius: STYLE_BORDER_RADIUS_TOP,
	overflow: "hidden",
	backgroundColor: "white",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	position: "relative", // Required for next/image fill mode
} as const;

// Category Card Component
interface CategoryCardProps {
	category: { id: string; name?: string | { ja: string; en?: string }; itemIds?: string[]; image?: string };
}

function CategoryCard({ category }: CategoryCardProps): React.ReactElement {
	const displayName = typeof category.name === "string" ? category.name : (category.name?.en ?? category.name?.ja ?? "Category");
	const itemCount = category.itemIds?.length ?? 0;

	return (
		<Link href={`/categories/${category.id}`} style={STYLE_NO_DECORATION_INHERIT}>
			<Card
				shadow="sm"
				padding={0}
				radius="md"
				withBorder={true}
				h="100%"
				style={STYLE_CURSOR_POINTER}
			>
				<div style={STYLE_IMAGE_CONTAINER}>
					{category.image ? (
						<ImageWithFallback
							src={resolveCdnUrl(category.image)}
							alt={displayName}
							fallbackText={displayName}
						/>
					) : (
						<Text size="xl" fw={600} c="dimmed" ta="center" p="md">
							{displayName}
						</Text>
					)}
				</div>
				<Box p="sm">
					<Text size="sm" fw={600} lineClamp={1}>
						{displayName}
					</Text>
					<Text size="xs" c="dimmed">
						{itemCount.toLocaleString()} items
					</Text>
				</Box>
			</Card>
		</Link>
	);
}

// Brand Card Component
interface BrandCardProps {
	brand: { id: string; name?: string | { ja: string; en?: string }; itemIds?: string[]; image?: string };
}

function BrandCard({ brand }: BrandCardProps): React.ReactElement {
	const displayName = typeof brand.name === "string" ? brand.name : (brand.name?.en ?? brand.name?.ja ?? "Brand");
	const itemCount = brand.itemIds?.length ?? 0;

	return (
		<Link href={`/brands/${brand.id}`} style={STYLE_NO_DECORATION_INHERIT}>
			<Card
				shadow="sm"
				padding={0}
				radius="md"
				withBorder={true}
				h="100%"
				style={STYLE_CURSOR_POINTER}
			>
				<div style={STYLE_IMAGE_CONTAINER}>
					{brand.image ? (
						<ImageWithFallback
							src={resolveCdnUrl(brand.image)}
							alt={displayName}
							fallbackText={displayName}
						/>
					) : (
						<Text size="xl" fw={600} c="dimmed" ta="center" p="md">
							{displayName}
						</Text>
					)}
				</div>
				<Box p="sm">
					<Text size="sm" fw={600} lineClamp={1}>
						{displayName}
					</Text>
					<Text size="xs" c="dimmed">
						{itemCount.toLocaleString()} items
					</Text>
				</Box>
			</Card>
		</Link>
	);
}


// Series Card Component
interface SeriesCardProps {
	seriesItem: { id: string; name?: string | { ja: string; en?: string }; itemIds?: string[]; image?: string };
}

function SeriesCard({ seriesItem }: SeriesCardProps): React.ReactElement {
	const displayName = typeof seriesItem.name === "string" ? seriesItem.name : (seriesItem.name?.en ?? seriesItem.name?.ja ?? "Series");
	const itemCount = seriesItem.itemIds?.length ?? 0;

	return (
		<Link href={`/series/${seriesItem.id}`} style={STYLE_NO_DECORATION_INHERIT}>
			<Card
				shadow="sm"
				padding={0}
				radius="md"
				withBorder={true}
				h="100%"
				style={STYLE_CURSOR_POINTER}
			>
				<div style={STYLE_IMAGE_CONTAINER}>
					{seriesItem.image ? (
						<ImageWithFallback
							src={resolveCdnUrl(seriesItem.image)}
							alt={displayName}
							fallbackText={displayName}
						/>
					) : (
						<Text size="xl" fw={600} c="dimmed" ta="center" p="md">
							{displayName}
						</Text>
					)}
				</div>
				<Box p="sm">
					<Text size="sm" fw={600} lineClamp={1}>
						{displayName}
					</Text>
					<Text size="xs" c="dimmed">
						{itemCount.toLocaleString()} items
					</Text>
				</Box>
			</Card>
		</Link>
	);
}

export default function HomePage() {
	// Use pre-computed homepage data for featured items
	const { featuredItems } = homepage;

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
			{/* Models */}
			<Container size="xl" py="xl" w="100%">
				<Stack gap="xl">
					<Group justify="space-between" align="center">
						<Title order={2} size="h2" fw={600}>
							Models
						</Title>
						<Link href="/database" style={{ textDecoration: "none" }}>
							<Group gap="xs" c="blue">
								<Text size="sm" fw={600}>View all</Text>
								<IconArrowNarrowRight size={16} />
							</Group>
						</Link>
					</Group>

					<FeaturedItemsGrid items={featuredItems} count={8} />
				</Stack>
			</Container>

			{/* Categories, Series & Brands */}
			<Container size="xl" py="xl" w="100%">
				<Stack gap="xl">
					<CollapsibleGrid
						title="Categories"
						totalCount={allCategories.length}
						collapsedChildren={allCategories.slice(4).map((category) => (
							<CategoryCard key={category.id} category={category} />
						))}
					>
						{allCategories.slice(0, 4).map((category) => (
							<CategoryCard key={category.id} category={category} />
						))}
					</CollapsibleGrid>

					<Divider />

					<CollapsibleGrid
						title="Series"
						totalCount={allSeries.length}
						collapsedChildren={allSeries.slice(4).map((s) => (
							<SeriesCard key={s.id} seriesItem={s} />
						))}
					>
						{allSeries.slice(0, 4).map((s) => (
							<SeriesCard key={s.id} seriesItem={s} />
						))}
					</CollapsibleGrid>

					<Divider />

					<CollapsibleGrid
						title="Brands"
						totalCount={allBrands.length}
						collapsedChildren={allBrands.slice(4).map((brand) => (
							<BrandCard key={brand.id} brand={brand} />
						))}
					>
						{allBrands.slice(0, 4).map((brand) => (
							<BrandCard key={brand.id} brand={brand} />
						))}
					</CollapsibleGrid>
				</Stack>
			</Container>

		</>
	);
}