import { brands, categories as allCategoriesData, homepage, resolveCdnUrl, series } from "@hobby-ninja/data";
import {
	Box,
	Button,
	Card,
	Container,
	Divider,
	Group,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	IconArrowNarrowRight,
	IconDatabase,
	IconHeart,
	IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";

import { FeaturedItemsGrid } from "@/components/featured-items-grid";
import { UI } from "@/lib/constants";
import { createGradientPlaceholderSvg } from "@/lib/image-placeholders";

// Constants
const STYLE_NO_DECORATION_INHERIT = { textDecoration: "none", color: "inherit" };
const STYLE_CURSOR_POINTER = { cursor: "pointer" };
const STYLE_BORDER_RADIUS_TOP = "var(--mantine-radius-md) var(--mantine-radius-md) 0 0";
const STYLE_IMAGE_CONTAINER = {
	aspectRatio: "300 / 170",
	backgroundColor: "white",
	borderRadius: STYLE_BORDER_RADIUS_TOP,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
} as const;
const STYLE_IMAGE = {
	maxWidth: "100%",
	maxHeight: "100%",
	objectFit: "contain",
	display: "block",
} as const;

// Category Card Component
interface CategoryCardProps {
	category: { id: string; name?: string | { ja: string; en?: string }; itemIds?: string[] };
}

function CategoryCard({ category }: CategoryCardProps): React.ReactElement {
	const displayName = typeof category.name === "string" ? category.name : (category.name?.en ?? category.name?.ja ?? "Category");
	const itemCount = category.itemIds?.length ?? 0;

	return (
		<Link href={`/category/${category.id}`} style={STYLE_NO_DECORATION_INHERIT}>
			<Card
				shadow="sm"
				padding={0}
				radius="md"
				withBorder={true}
				h="100%"
				style={STYLE_CURSOR_POINTER}
			>
				<div style={STYLE_IMAGE_CONTAINER}>
					<img
						src={createGradientPlaceholderSvg(displayName)}
						alt={displayName}
						style={STYLE_IMAGE}
					/>
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
	const imageSrc = brand.image ? resolveCdnUrl(brand.image) : createGradientPlaceholderSvg(displayName);

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
					<img
						src={imageSrc}
						alt={displayName}
						style={STYLE_IMAGE}
					/>
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
	const imageSrc = seriesItem.image ? resolveCdnUrl(seriesItem.image) : createGradientPlaceholderSvg(displayName);

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
					<img
						src={imageSrc}
						alt={displayName}
						style={STYLE_IMAGE}
					/>
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

// Static Search Link Component (replaces interactive SearchBar)
function StaticSearchPrompt() {
	return (
		<Box maw={600} mx="auto" w="100%">
			<Link href="/search" style={{ textDecoration: "none", color: "inherit" }}>
				<Card
					withBorder={true}
					p="md"
					radius="md"
					style={{ cursor: "pointer" }}
				>
					<Group>
						<IconSearch size={UI.BUTTON_ICON_SIZE} color="var(--mantine-color-gray-5)" />
						<Text c="dimmed" style={{ flex: 1 }}>
							Search for Gundam models, brands, series...
						</Text>
					</Group>
				</Card>
			</Link>
		</Box>
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
			{/* Hero Section */}
			<Container size="xl" py="xl">
				<Stack align="center" gap="xl" ta="center">
					<Title order={1} size="h1" c="blue.6" fw={800}>
						hobby.ninja
					</Title>

					<Title
						order={2}
						size="h2"
						c="dimmed"
						fw={400}
					>
						Complete Gundam Collection Management
					</Title>

					<Text
						size="lg"
						c="dimmed"
						maw={700}
						mx="auto"
						lh={1.6}
					>
						Discover, track, and manage your Gundam collection. Powerful search,
						detailed information, and full offline capability.
					</Text>

					{/* Integrated Search Prompt */}
					<StaticSearchPrompt />

					{/* Quick Actions */}
					<Group gap="md" mt="lg">
						<Link href="/database" style={{ textDecoration: "none" }}>
							<Button
								size="lg"
								radius="md"
								leftSection={<IconDatabase size={20} />}
								style={{ backgroundColor: "var(--mantine-color-blue-5)" }}
							>
								Browse Database
							</Button>
						</Link>
						<Link href="/search" style={{ textDecoration: "none" }}>
							<Button
								size="lg"
								radius="md"
								variant="outline"
								leftSection={<IconSearch size={20} />}
							>
								Advanced Search
							</Button>
						</Link>
						<Link href="/collection" style={{ textDecoration: "none" }}>
							<Button
								size="lg"
								radius="md"
								variant="subtle"
								leftSection={<IconHeart size={20} />}
							>
								My Collection
							</Button>
						</Link>
					</Group>
				</Stack>
			</Container>

			{/* Models */}
			<Container size="xl" py="xl">
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
			<Container size="xl" py="xl">
				<Stack gap="xl">
					{/* Categories Section */}
					<Stack gap="lg">
						<Title order={2} size="h2" fw={600}>
							Categories
						</Title>
						<SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="lg">
							{allCategories.map((category) => (
								<CategoryCard key={category.id} category={category} />
							))}
						</SimpleGrid>
					</Stack>

					<Divider />

					{/* Series Section */}
					<Stack gap="lg">
						<Title order={2} size="h2" fw={600}>
							Series
						</Title>
						<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
							{allSeries.map((s) => (
								<SeriesCard key={s.id} seriesItem={s} />
							))}
						</SimpleGrid>
					</Stack>

					<Divider />

					{/* Brands Section */}
					<Stack gap="lg">
						<Title order={2} size="h2" fw={600}>
							Brands
						</Title>
						<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
							{allBrands.map((brand) => (
								<BrandCard key={brand.id} brand={brand} />
							))}
						</SimpleGrid>
					</Stack>
				</Stack>
			</Container>

		</>
	);
}