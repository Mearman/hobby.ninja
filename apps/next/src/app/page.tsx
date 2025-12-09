"use client";

import {
	Title,
	Text,
	Container,
	Card,
	Stack,
	Group,
	ThemeIcon,
	rem,
	ActionIcon,
	Tooltip,
	Button,
	Badge,
	SimpleGrid,
	Box,
} from "@mantine/core";
import {
	IconSearch,
	IconDatabase,
	IconHeart,
	IconDownload,
	IconRocket,
	IconShield,
	IconDeviceMobile,
	IconSun,
	IconMoon,
} from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useSearch } from "@/lib/fuse-search";
import { useThemeContext } from "@/providers/mantine-provider";
import { FuseSearch } from "@/components/search/fuse-search";
import { UI } from "@/lib/constants";

interface SearchResult {
	item: {
		id: string | number;
		[key: string]: unknown;
	};
}

export default function HomePage() {
	const { effectiveColorScheme, cycleTheme } = useThemeContext();
	const router = useRouter();
	const { getStats } = useSearch();
	const stats = getStats();

	const getThemeIcon = () => {
		switch (effectiveColorScheme) {
			case "light":
				return <IconSun style={{ width: rem(UI.ICON_SIZE_SM), height: rem(UI.ICON_SIZE_SM) }} />;
			case "dark":
				return <IconMoon style={{ width: rem(UI.ICON_SIZE_SM), height: rem(UI.ICON_SIZE_SM) }} />;
			default:
				return <IconSun style={{ width: rem(UI.ICON_SIZE_SM), height: rem(UI.ICON_SIZE_SM) }} />;
		}
	};

	const getThemeLabel = () => {
		switch (effectiveColorScheme) {
			case "light":
				return "Switch to dark mode";
			case "dark":
				return "Switch to system mode";
			default:
				return "Switch to light mode";
		}
	};

	const handleSearchResult = (result: SearchResult) => {
		router.navigate({
			to: `/item/${result.item.id}`,
			replace: false
		});
	};

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
		{ label: "Brands", value: stats.brands.length.toString() },
		{ label: "Series", value: stats.series.length.toString() },
		{ label: "Grades", value: stats.grades.length.toString() }
	];

	return (
		<>
			{/* Hero Section */}
			<Container size="xl" py={{ base: "xl", md: "xl" }}>
				<Group justify="space-between" w="100%">
					<Title order={1} size={{ base: "h2", md: "h1" }} c="blue.6" fw={800}>
						hobby.ninja
					</Title>
					<Tooltip label={getThemeLabel()}>
						<ActionIcon
							variant="light"
							size="lg"
							onClick={cycleTheme}
							aria-label="Toggle theme"
						>
							{getThemeIcon()}
						</ActionIcon>
					</Tooltip>
				</Group>

				<Stack gap={{ base: "md", md: "xl" }} mt={{ base: "md", md: "xl" }}>
					<Title
						order={2}
						size={{ base: "h3", md: "h2" }}
						c="dimmed"
						fw={400}
						ta="center"
					>
						Static Collection Management
					</Title>

					<Text
						size={{ base: "md", md: "lg" }}
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
						<FuseSearch
							onResultClick={handleSearchResult}
							placeholder="Search for Gundam models, brands, series..."
							maxResults={UI.HOMEPAGE_SEARCH_RESULTS}
							showFilters={false}
						/>
					</Box>

					{/* Quick Actions */}
					<Group justify="center" gap="md" mt="lg">
						<Button
							variant="filled"
							size="lg"
							radius="md"
							onClick={() => router.navigate({ to: "/database" })}
							leftSection={<IconDatabase size={UI.BUTTON_ICON_SIZE} />}
						>
							Browse Database
						</Button>
						<Button
							variant="outline"
							size="lg"
							radius="md"
							onClick={() => router.navigate({ to: "/search" })}
							leftSection={<IconSearch size={UI.BUTTON_ICON_SIZE} />}
						>
							Advanced Search
						</Button>
					</Group>
				</Stack>
			</Container>

			{/* Stats Section */}
			<Box py={{ base: "lg", md: "xl" }} bg={effectiveColorScheme === "dark" ? "dark.8" : "gray.0"}>
				<Container size="xl">
					<SimpleGrid
						cols={{ base: 2, sm: 4 }}
						spacing={{ base: "md", md: "xl" }}
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
			<Container size="xl" py={{ base: "xl", md: "xl" }}>
				<Stack gap="xl">
					<Title order={2} size={{ base: "h3", md: "h2" }} ta="center" fw={600}>
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
						cols={{ base: 1, sm: 2, lg: 3 }}
						spacing={{ base: "md", md: "xl" }}
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
				py={{ base: "xl", md: "xl" }}
				style={{
					background: 'linear-gradient(to right, var(--mantine-color-blue-6), var(--mantine-color-cyan-6))'
				}}
			>
				<Container size="lg">
					<Stack align="center" gap="xl">
						<Title order={2} size={{ base: "h3", md: "h2" }} c="white" ta="center" fw={700}>
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
								onClick={() => router.navigate({ to: "/collection" })}
								leftSection={<IconHeart size={UI.BUTTON_ICON_SIZE} />}
							>
								My Collection
							</Button>
							<Button
								variant="outline"
								size="lg"
								radius="md"
								color="white"
								onClick={() => router.navigate({ to: "/database" })}
								leftSection={<IconRocket size={UI.BUTTON_ICON_SIZE} />}
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