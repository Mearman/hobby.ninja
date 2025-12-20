import { homepage } from "@hobby-ninja/data";
import {
	Avatar,
	Box,
	Button,
	Card,
	Container,
	Divider,
	Group,
	rem,
	SimpleGrid,
	Stack,
	Text,
	ThemeIcon,
	Title,
} from "@mantine/core";
import {
	IconArrowNarrowRight,
	IconAward,
	IconCheck,
	IconDatabase,
	IconDeviceMobile,
	IconDownload,
	IconHeart,
	IconSearch,
	IconShield,
	IconSparkles,
	IconStar,
	IconTrendingUp,
} from "@tabler/icons-react";
import Link from "next/link";

import { FeaturedItemsGrid } from "@/components/featured-items-grid";
import { UI } from "@/lib/constants";

// Constants
const STYLE_NO_DECORATION_INHERIT = { textDecoration: "none", color: "inherit" };
const STYLE_CURSOR_POINTER = { cursor: "pointer" };
const WHITE_OVERLAY_BG = "rgba(255,255,255,0.9)";

// Category Card Component
interface CategoryCardProps {
	category: { id: string; name?: string | { ja: string; en?: string } };
	itemCount?: number;
}

function CategoryCard({ category, itemCount = 0 }: CategoryCardProps): React.ReactElement {
	const displayName = typeof category.name === "string" ? category.name : (category.name?.en ?? category.name?.ja ?? "Category");

	return (
		<Link href={`/category/${category.id}`} style={STYLE_NO_DECORATION_INHERIT}>
			<Card
				shadow="sm"
				padding="lg"
				radius="md"
				withBorder={true}
				h="100%"
				style={STYLE_CURSOR_POINTER}
			>
				<Stack align="center" gap="md">
					<ThemeIcon size={60} radius="xl" variant="light" color="blue">
						<IconDatabase size={30} />
					</ThemeIcon>
					<Title order={4} ta="center" size="h6" fw={600}>
						{displayName}
					</Title>
					<Text size="sm" c="dimmed" ta="center">
						{itemCount.toLocaleString()} items
					</Text>
				</Stack>
			</Card>
		</Link>
	);
}

// Brand Card Component
interface BrandCardProps {
	brand: { id: string; name?: string | { ja: string; en?: string } };
	itemCount?: number;
}

function BrandCard({ brand, itemCount = 0 }: BrandCardProps): React.ReactElement {
	const displayName = typeof brand.name === "string" ? brand.name : (brand.name?.en ?? brand.name?.ja ?? "Brand");
	const firstChar = displayName.charAt(0).toUpperCase();

	return (
		<Link href={`/brands/${brand.id}`} style={STYLE_NO_DECORATION_INHERIT}>
			<Card
				shadow="sm"
				padding="md"
				radius="md"
				withBorder={true}
				h="100%"
				style={STYLE_CURSOR_POINTER}
			>
				<Group align="center" gap="md">
					<Avatar size={UI.BRAND_LOGO_SIZE} radius="md">
						{firstChar}
					</Avatar>
					<Box flex={1}>
						<Text size="sm" fw={600} lineClamp={1}>
							{displayName}
						</Text>
						<Text size="xs" c="dimmed">
							{itemCount.toLocaleString()} items
						</Text>
					</Box>
				</Group>
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
	// Use pre-computed homepage data (8KB instead of 19MB)
	// This avoids loading all 6000+ items just for the homepage
	const { stats, featuredItems, popularBrands, categories } = homepage;

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

			{/* Statistics Dashboard */}
			<Box py="xl" bg="gray.0">
				<Container size="xl">
					<Stack gap="lg" ta="center">
						<Title order={2} size="h2" fw={600}>
							Database Overview
						</Title>
						<Text size="lg" c="dimmed" maw={600} mx="auto">
							Browse items across multiple brands, grades, and series
						</Text>

						<SimpleGrid
							cols={{ base: 2, sm: 4 }}
							spacing="lg"
							mt="xl"
						>
							{[
								{ label: "Items", value: stats.totalItems.toLocaleString(), icon: IconDatabase, color: "blue" },
								{ label: "Brands", value: stats.totalBrands.toLocaleString(), icon: IconAward, color: "orange" },
								{ label: "Categories", value: stats.totalCategories.toLocaleString(), icon: IconSparkles, color: "green" },
								{ label: "Series", value: stats.totalSeries.toLocaleString(), icon: IconTrendingUp, color: "violet" },
							].map((stat, index) => (
								<Card key={index} p="lg" radius="md" withBorder={true} shadow="sm">
									<Stack align="center" gap="xs">
										<ThemeIcon color={stat.color} size={40} radius="xl" variant="light">
											<stat.icon size={20} />
										</ThemeIcon>
										<Title order={1} size="h2" c={`${stat.color}.6`} fw={800}>
											{stat.value}
										</Title>
										<Text size="sm" c="dimmed" fw={500}>
											{stat.label}
										</Text>
									</Stack>
								</Card>
							))}
						</SimpleGrid>
					</Stack>
				</Container>
			</Box>

			{/* Featured Items Carousel */}
			<Container size="xl" py="xl">
				<Stack gap="xl">
					<Group justify="space-between" align="center">
						<Title order={2} size="h2" fw={600}>
							Featured Models
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

			{/* Quick Navigation Cards */}
			<Container size="xl" py="xl">
				<Stack gap="xl">
					<Title order={2} size="h2" ta="center" fw={600}>
						Explore Collections
					</Title>

					<SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
						{[
							{ title: "All Items", description: `${stats.totalItems.toLocaleString()}+ models`, icon: IconDatabase, href: "/database", color: "blue" },
							{ title: "My Collection", description: "Track your personal collection", icon: IconHeart, href: "/collection", color: "red" },
							{ title: "Wishlist", description: "Save items you want to buy", icon: IconStar, href: "/wishlist", color: "yellow" },
							{ title: "Search", description: "Find specific models easily", icon: IconSearch, href: "/search", color: "green" },
							{ title: "Brands", description: `${stats.totalBrands}+ manufacturers`, icon: IconAward, href: "/brands", color: "orange" },
							{ title: "Categories", description: `${stats.totalCategories}+ types`, icon: IconSparkles, href: "/categories", color: "violet" },
							{ title: "Series", description: `${stats.totalSeries}+ series`, icon: IconTrendingUp, href: "/series", color: "cyan" },
							{ title: "Manuals", description: "Building instructions", icon: IconDownload, href: "/manuals", color: "grape" },
						].map((item, index) => (
							<Link key={index} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
								<Card
									shadow="sm"
									padding="lg"
									radius="md"
									withBorder={true}
									h="100%"
									style={{ cursor: "pointer" }}
								>
									<Stack align="center" gap="md">
										<ThemeIcon color={item.color} size={50} radius="xl" variant="light">
											<item.icon size={25} />
										</ThemeIcon>
										<Title order={4} ta="center" size="h6" fw={600}>
											{item.title}
										</Title>
										<Text size="sm" c="dimmed" ta="center">
											{item.description}
										</Text>
									</Stack>
								</Card>
							</Link>
						))}
					</SimpleGrid>
				</Stack>
			</Container>


			{/* Popular Categories & Brands */}
			<Container size="xl" py="xl">
				<Stack gap="xl">
					{/* Categories Section */}
					<Stack gap="lg">
						<Title order={2} size="h2" fw={600}>
							Popular Categories
						</Title>
						<SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="lg">
							{categories.slice(0, 10).map((category) => (
								<CategoryCard key={category.id} category={category} />
							))}
						</SimpleGrid>
					</Stack>

					<Divider />

					{/* Brands Section */}
					<Stack gap="lg">
						<Title order={2} size="h2" fw={600}>
							Top Brands
						</Title>
						<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
							{popularBrands.map((brand) => (
								<BrandCard key={brand.id} brand={brand} />
							))}
						</SimpleGrid>
					</Stack>
				</Stack>
			</Container>

			{/* Features Section */}
			<Box py="xl" bg="blue.0">
				<Container size="xl">
					<Stack gap="xl">
						<Title order={2} size="h2" ta="center" fw={600}>
							Powerful Features for Collectors
						</Title>

						<Text
							size="lg"
							c="dimmed"
							ta="center"
							maw={800}
							mx="auto"
							lh={1.6}
						>
							Everything you need to manage your Gundam collection efficiently,
							from advanced search to offline capability.
						</Text>

						<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl" mt="xl">
							{[
								{
									icon: IconSearch,
									title: "Smart Search",
									description: `Search through ${stats.totalItems.toLocaleString()}+ items with instant results and intelligent filtering`,
									color: "blue",
								},
								{
									icon: IconHeart,
									title: "Collection Tracking",
									description: "Track your collection with wishlist, status updates, and progress monitoring",
									color: "red",
								},
								{
									icon: IconDatabase,
									title: "Detailed Database",
									description: "Detailed information about models, grades, series, and pricing",
									color: "green",
								},
								{
									icon: IconDeviceMobile,
									title: "PWA Ready",
									description: "Install as native app with full offline support and mobile optimization",
									color: "orange",
								},
								{
									icon: IconShield,
									title: "Privacy First",
									description: "Client-side storage keeps your data private and secure on your device",
									color: "violet",
								},
								{
									icon: IconDownload,
									title: "Data Export",
									description: "Export your collection data in multiple formats for backup or sharing",
									color: "cyan",
								},
							].map((feature, index) => (
								<Card key={index} p="xl" radius="md" withBorder={true} shadow="sm" h="100%">
									<Stack gap="md" align="flex-start">
										<ThemeIcon
											color={feature.color}
											size={UI.FEATURE_ICON_SIZE}
											radius="xl"
											variant="light"
										>
											<feature.icon
												style={{ width: rem(UI.FEATURE_ICON_INNER_SIZE), height: rem(UI.FEATURE_ICON_INNER_SIZE) }}
											/>
										</ThemeIcon>
										<Title order={3} size="h4" fw={600}>
											{feature.title}
										</Title>
										<Text size="sm" c="dimmed" lh={1.5}>
											{feature.description}
										</Text>
									</Stack>
								</Card>
							))}
						</SimpleGrid>
					</Stack>
				</Container>
			</Box>

	
			{/* Newsletter/CTA Section */}
			<Box
				py="xl"
				style={{
					background: "linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-cyan-6))",
				}}
			>
				<Container size="lg">
					<Stack align="center" gap="xl" ta="center">
						<Title order={2} size="h2" c="white" fw={700}>
							Start Your Collection Journey Today
						</Title>

						<Text size="lg" c="white" lh={1.6} maw={600}>
							Browse {stats.totalItems.toLocaleString()}+ items and manage your collection.
							No registration required, works completely offline.
						</Text>

						<Group gap="md">
							<Link href="/collection" style={{ textDecoration: "none" }}>
								<Button
									size="lg"
									radius="md"
									leftSection={<IconHeart size={20} />}
									variant="white"
									style={{ backgroundColor: WHITE_OVERLAY_BG }}
								>
									Start Building Collection
								</Button>
							</Link>
							<Link href="/database" style={{ textDecoration: "none" }}>
								<Button
									size="lg"
									radius="md"
									variant="outline"
									leftSection={<IconDatabase size={20} />}
									style={{ borderColor: "white", color: "white" }}
								>
									Explore Database
								</Button>
							</Link>
						</Group>

						<Group gap="lg" mt="lg">
							{[
								{ icon: IconCheck, text: "100% Free" },
								{ icon: IconCheck, text: "No Registration" },
								{ icon: IconCheck, text: "Works Offline" },
								{ icon: IconCheck, text: "Privacy First" },
							].map((item, index) => (
								<Group key={index} gap="xs" c="white">
									<item.icon size={16} style={{ color: WHITE_OVERLAY_BG }} />
									<Text size="sm" style={{ color: WHITE_OVERLAY_BG }}>
										{item.text}
									</Text>
								</Group>
							))}
						</Group>
					</Stack>
				</Container>
			</Box>

		</>
	);
}