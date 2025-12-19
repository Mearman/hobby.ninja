import { getNodeDisplayName, getNodePrimaryGrade, homepage, type Item } from "@hobby-ninja/data";
import {
	ActionIcon,
	Avatar,
	Box,
	Button,
	Card,
	Container,
	Divider,
	Flex,
	Group,
	rem,
	SimpleGrid,
	Stack,
	Text,
	ThemeIcon,
	Title,
	Tooltip,
} from "@mantine/core";
import {
	IconArrowNarrowRight,
	IconAward,
	IconBrandGithub,
	IconBrandTwitter,
	IconCheck,
	IconClock,
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

import { Badge } from "@/components/ui/badge";
import { UI } from "@/lib/constants";

// Constants
const STYLE_NO_DECORATION_INHERIT = { textDecoration: "none", color: "inherit" };
const STYLE_CURSOR_POINTER = { cursor: "pointer" };
const WHITE_OVERLAY_BG = "rgba(255,255,255,0.9)";

// Helper function for price formatting
function formatPrice(price?: { amount: number; currency: string }): string {
	if (!price) return "";
	return new Intl.NumberFormat("ja-JP", {
		style: "currency",
		currency: price.currency || "JPY",
	}).format(price.amount);
}

// Item Card Component
function ItemCard({ item, showGrade = true, showPrice = true }: {
	item: Item;
	showGrade?: boolean;
	showPrice?: boolean;
}): React.ReactElement {

	return (
		<Link href={`/item/${item.id}`} style={STYLE_NO_DECORATION_INHERIT}>
			<Card
				shadow="sm"
				padding="md"
				radius="md"
				withBorder={true}
				h="100%"
				style={{ cursor: "pointer" }}
				className="item-card-hover"
			>
				<Stack gap="xs">
					{/* Image placeholder */}
					<Box
						h={UI.THUMBNAIL_HEIGHT}
						bg="gray.0"
						style={{
							borderRadius: "var(--mantine-radius-sm)",
							background: "linear-gradient(135deg, var(--mantine-color-gray-0) 0%, var(--mantine-color-gray-1) 100%)",
						}}
					>
						{item.images && item.images.length > 0 ? (
							<img
								src={typeof item.images[0] === "string" ? item.images[0] : item.images[0].url}
								alt={getNodeDisplayName(item)}
								style={{
									width: "100%",
									height: "100%",
									objectFit: "cover",
									borderRadius: "var(--mantine-radius-sm)",
								}}
							/>
						) : (
							<Flex justify="center" align="center" h="100%">
								<IconDatabase size={40} color="var(--mantine-color-gray-4)" />
							</Flex>
						)}
					</Box>

					<Stack gap={4}>
						<Text size="sm" fw={600} lineClamp={2} c="var(--mantine-color-gray-8)">
							{getNodeDisplayName(item)}
						</Text>

						<Group gap="xs" wrap="wrap">
							{showGrade && (
								<Badge size="xs" variant="light" color="blue">
									{getNodePrimaryGrade(item) ?? "N/A"}
								</Badge>
							)}
						</Group>

						{showPrice && item.price && (
							<Text size="sm" fw={700} c="blue.6">
								{formatPrice(item.price)}
							</Text>
						)}
					</Stack>
				</Stack>
			</Card>
		</Link>
	);
}

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

// Testimonial Card Component
interface TestimonialCardProps {
	testimonial: {
		rating: number;
		content: string;
		author: string;
		role: string;
	};
}

function TestimonialCard({ testimonial }: TestimonialCardProps) {
	return (
		<Card padding="xl" radius="md" withBorder={true} h="100%">
			<Stack gap="md">
				<Group gap="xs">
					{Array.from({length: 5}).map((_, i) => (
						<IconStar
							key={i}
							size={16}
							color={i < testimonial.rating ? "var(--mantine-color-yellow-5)" : "var(--mantine-color-gray-3)"}
							fill={i < testimonial.rating ? "currentColor" : "none"}
						/>
					))}
				</Group>
				<Text size="sm" c="dimmed" fs="italic" lineClamp={3}>
					&ldquo;{testimonial.content}&rdquo;
				</Text>
				<Divider />
				<Group>
					<Avatar size={40} radius="xl">
						{testimonial.author.charAt(0)}
					</Avatar>
					<Box>
						<Text size="sm" fw={600}>
							{testimonial.author}
						</Text>
						<Text size="xs" c="dimmed">
							{testimonial.role}
						</Text>
					</Box>
				</Group>
			</Stack>
		</Card>
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

// Sample data for homepage
const sampleTestimonials = [
	{
		rating: 5,
		content: "Finally, a comprehensive Gundam database that works offline! The search functionality is incredibly fast and the collection management features are exactly what I needed.",
		author: "Alex Chen",
		role: "Hobby Collector",
	},
	{
		rating: 5,
		content: "As a long-time Gundam fan, this app has revolutionized how I track my collection. The detailed information and smart filtering make it easy to find exactly what I'm looking for.",
		author: "Sarah Mitchell",
		role: "Model Builder",
	},
	{
		rating: 4,
		content: "The user interface is clean and intuitive. I especially love the offline capability - I can manage my collection anywhere without worrying about internet connection.",
		author: "David Park",
		role: "Gunpla Enthusiast",
	},
];

export default function HomePage() {
	// Use pre-computed homepage data (8KB instead of 19MB)
	// This avoids loading all 6000+ items just for the homepage
	const { stats, featuredItems, popularBrands, categories } = homepage;

	// Recent items not available in pre-computed data, use featured items as fallback
	const recentItems = featuredItems.slice(0, 8);

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
						Discover, track, and manage your Gundam collection with our comprehensive database.
						Powerful search, detailed information, and full offline capability.
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
							Comprehensive Database
						</Title>
						<Text size="lg" c="dimmed" maw={600} mx="auto">
							The most complete collection of Gundam models, grades, and series available anywhere
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

					{featuredItems.length > 0 ? (
						<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
							{featuredItems.slice(0, 8).map((item) => (
								<ItemCard key={item.id} item={item} />
							))}
						</SimpleGrid>
					) : (
						<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
							{Array.from({length: 8}).map((_, i) => (
								<Card key={i} p="md" radius="md" withBorder={true} h="100%">
									<Box h={UI.THUMBNAIL_HEIGHT} bg="gray.0" />
								</Card>
							))}
						</SimpleGrid>
					)}
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

			{/* Recently Added Items */}
			{recentItems.length > 0 && (
				<Box py="xl" bg="gray.0">
					<Container size="xl">
						<Stack gap="xl">
							<Group justify="space-between" align="center">
								<Group gap="md">
									<IconClock size={24} color="var(--mantine-color-blue-6)" />
									<Title order={2} size="h2" fw={600}>
										Recently Updated
									</Title>
								</Group>
								<Link href="/database?sort=updated" style={{ textDecoration: "none" }}>
									<Group gap="xs" c="blue">
										<Text size="sm" fw={600}>View all</Text>
										<IconArrowNarrowRight size={16} />
									</Group>
								</Link>
							</Group>

							<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
								{recentItems.map((item) => (
									<ItemCard key={item.id} item={item} />
								))}
							</SimpleGrid>
						</Stack>
					</Container>
				</Box>
			)}

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
									description: "Comprehensive information about models, grades, series, and pricing",
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

			{/* Testimonials Section */}
			<Container size="xl" py="xl">
				<Stack gap="xl">
					<Title order={2} size="h2" ta="center" fw={600}>
						What Collectors Say
					</Title>

					<Text
						size="lg"
						c="dimmed"
						ta="center"
						maw={600}
						mx="auto"
					>
						Join thousands of Gundam enthusiasts using hobby.ninja to manage their collections
					</Text>

					<SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mt="xl">
						{sampleTestimonials.map((testimonial, index) => (
							<TestimonialCard key={index} testimonial={testimonial} />
						))}
					</SimpleGrid>
				</Stack>
			</Container>

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
							Join thousands of Gundam enthusiasts managing their collections with the most comprehensive database available.
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

			{/* Social Proof/Final CTA */}
			<Container size="lg" py="xl">
				<Stack align="center" gap="lg">
					<Title order={3} size="h3" fw={600}>
						Built with Modern Technologies
					</Title>

					<Group gap="md">
						<Badge variant="light" color="blue" size="lg">React 19</Badge>
						<Badge variant="light" color="green" size="lg">Next.js 15</Badge>
						<Badge variant="light" color="orange" size="lg">TypeScript</Badge>
						<Badge variant="light" color="violet" size="lg">Mantine v7</Badge>
						<Badge variant="light" color="cyan" size="lg">PWA</Badge>
					</Group>

					<Text c="dimmed" size="sm" ta="center">
						Optimized for performance, accessibility, and the best user experience
					</Text>

					<Group gap="md" mt="md">
						<Tooltip label="View on GitHub">
							<ActionIcon variant="subtle" size="lg">
								<IconBrandGithub size={20} />
							</ActionIcon>
						</Tooltip>
						<Tooltip label="Follow on Twitter">
							<ActionIcon variant="subtle" size="lg">
								<IconBrandTwitter size={20} />
							</ActionIcon>
						</Tooltip>
					</Group>
				</Stack>
			</Container>
		</>
	);
}