import {
	Title,
	Text,
	Container,
	Card,
	Stack,
	Group,
	Button,
	Badge,
	SimpleGrid,
	Box,
	rem,
	ThemeIcon,
} from "@mantine/core";
import {
	IconSearch,
	IconDatabase,
	IconHeart,
	IconDownload,
	IconShield,
	IconDeviceMobile,
} from "@tabler/icons-react";
import Link from "next/link";
import { getAllItems, getAllBrands, getAllCategories, getAllSeries } from "@/lib/server-graph-data";
import { UI } from "@/lib/constants";

interface SearchResult {
	item: {
		id: string | number;
		[key: string]: unknown;
	};
}

// Build-time stats computation
async function getBuildTimeStats() {
	try {
		const [items, brands, categories, series] = await Promise.all([
			getAllItems(),
			getAllBrands(),
			getAllCategories(),
			getAllSeries(),
		]);

		return {
			totalItems: items.length,
			totalBrands: brands.length,
			totalCategories: categories.length,
			totalSeries: series.length,
		};
	} catch (error) {
		console.error("Failed to compute build-time stats:", error);
		// Fallback to reasonable defaults
		return {
			totalItems: 6000,
			totalBrands: 78,
			totalCategories: 5,
			totalSeries: 135,
		};
	}
}

export default async function HomePage() {
	const stats = await getBuildTimeStats();

	
	const features = [
	{
			icon: IconSearch,
			title: "Advanced Search",
			description: `Search through ${stats.totalItems.toLocaleString()}+ items with instant results and smart filtering`,
			color: "blue"
		},
		{
			icon: IconHeart,
			title: "Collection Management",
			description: "Track your collection with wishlist, status updates, and progress tracking",
			color: "red"
		},
		{
			icon: IconDatabase,
			title: "Comprehensive Database",
			description: "Detailed information about Gundam models, grades, series, and pricing",
			color: "green"
		},
		{
			icon: IconDeviceMobile,
			title: "PWA Ready",
			description: "Install as native app with full offline support and mobile-optimized design",
			color: "orange"
		},
		{
			icon: IconShield,
			title: "Privacy First",
			description: "Client-side storage means your data stays private and secure",
			color: "violet"
		},
		{
			icon: IconDownload,
			title: "Data Export",
			description: "Export your collection data in multiple formats for backup or sharing",
			color: "cyan"
		}
	];

	const displayStats = [
		{ label: "Items", value: stats.totalItems.toLocaleString() },
		{ label: "Brands", value: stats.totalBrands.toLocaleString() },
		{ label: "Categories", value: stats.totalCategories.toLocaleString() },
		{ label: "Series", value: stats.totalSeries.toLocaleString() }
	];

	return (
		<>
			{/* Hero Section */}
			<Container size="xl" py="xl">
				<Title order={1} size="h1" c="blue.6" fw={800}>
				hobby.ninja
			</Title>

				<Stack gap="xl" mt="xl">
					<Title
						order={2}
						size="h2"
						c="dimmed"
						fw={400}
						ta="center"
					>
						Static Collection Management
					</Title>

					<Text
						size="lg"
						c="dimmed"
						ta="center"
						maw={600}
						mx="auto"
						lh={1.6}
					>
						Comprehensive hobby collection management with powerful search,
						tracking features, and full offline capability. Your data stays on your device.
					</Text>

					{/* Search Integration */}
					<Box maw={600} mx="auto" w="100%">
						<Button
							variant="light"
							size="lg"
							radius="md"
							component={Link}
							href="/search"
							leftSection={<IconSearch size={UI.BUTTON_ICON_SIZE} />}
							w="100%"
							justify="start"
						>
							Search for Gundam models, brands, series...
						</Button>
					</Box>

					{/* Quick Actions */}
					<Group justify="center" gap="md" mt="lg">
						<Button
							variant="filled"
							size="lg"
							radius="md"
							component={Link}
							href="/database"
							leftSection={<IconDatabase size={UI.BUTTON_ICON_SIZE} />}
						>
							Browse Database
						</Button>
						<Button
							variant="outline"
							size="lg"
							radius="md"
							component={Link}
							href="/search"
							leftSection={<IconSearch size={UI.BUTTON_ICON_SIZE} />}
						>
							Advanced Search
						</Button>
					</Group>
				</Stack>
			</Container>

			{/* Stats Section */}
			<Box py="xl" bg="gray.0">
				<Container size="xl">
					<SimpleGrid
						cols={4}
						spacing="xl"
					>
						{displayStats.map((stat, index) => (
							<Card key={index} p="lg" radius="md" withBorder>
								<Stack align="center" gap="xs">
									<Title order={1} size="h2" c="blue.6" fw={800}>
										{stat.value}
									</Title>
									<Text size="sm" c="dimmed" fw={500}>
										{stat.label}
									</Text>
								</Stack>
							</Card>
						))}
					</SimpleGrid>
				</Container>
			</Box>

			{/* Features Section */}
			<Container size="xl" py="xl">
				<Stack gap="xl">
					<Title order={2} size="h2" ta="center" fw={600}>
						Powerful Features for Hobby Enthusiasts
					</Title>

					<Text
						size="lg"
						c="dimmed"
						ta="center"
						maw={800}
						mx="auto"
						lh={1.6}
					>
						Everything you need to manage your hobby collection efficiently,
						from detailed database search to personalized tracking.
					</Text>

					<SimpleGrid
						cols={3}
						spacing="xl"
						mt="xl"
					>
						{features.map((feature, index) => (
							<Card key={index} p="xl" radius="md" withBorder h="100%">
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

			{/* CTA Section */}
			<Box
				py="xl"
				style={{
					background: 'linear-gradient(to right, var(--mantine-color-blue-6), var(--mantine-color-cyan-6))'
				}}
			>
				<Container size="lg">
					<Stack align="center" gap="xl">
						<Title order={2} size="h2" c="white" ta="center" fw={700}>
							Start Building Your Collection Today
						</Title>

						<Text size="lg" c="white" ta="center" lh={1.6}>
							Join thousands of hobby enthusiasts managing their collections with hobby.ninja.
						</Text>

						<Group gap="md">
							<Button
								variant="white"
								size="lg"
								radius="md"
								component={Link}
							href="/collection"
								leftSection={<IconHeart size={UI.BUTTON_ICON_SIZE} />}
							>
								My Collection
							</Button>
							<Button
								variant="outline"
								size="lg"
								radius="md"
								color="white"
								component={Link}
							href="/database"
								leftSection={<IconDatabase size={UI.BUTTON_ICON_SIZE} />}
							>
								Explore Database
							</Button>
						</Group>

						<Badge
							size="lg"
							variant="white"
							color="white"
							radius="md"
						>
							100% Free • No Registration Required • Works Offline
						</Badge>
					</Stack>
				</Container>
			</Box>

			{/* Footer */}
			<Container size="lg" py="xl">
				<Stack align="center" gap="md">
					<Group gap="xs">
						<Badge variant="light" color="blue">React 19</Badge>
						<Badge variant="light" color="green">Next.js 15</Badge>
						<Badge variant="light" color="orange">TypeScript</Badge>
						<Badge variant="light" color="violet">Mantine v7</Badge>
					</Group>

					<Text c="dimmed" size="sm" ta="center">
						Built with modern web technologies for the best user experience
					</Text>
				</Stack>
			</Container>
		</>
	);
}