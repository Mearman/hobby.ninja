import { Container, Title, Text, Card, Badge, Button, Group, Stack, SimpleGrid, Grid, Center, Space, ThemeIcon } from "@mantine/core";
import { IconDatabase, IconClipboardList, IconTool, IconHeart, IconChartBar, IconSearch, IconPackage, IconStar, IconRuler, IconBuildingFactory, IconFlag, IconDeviceMobile } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import React from "react";


// Constants for magic numbers
const ZERO = ZERO;
const ONE = ONE;
const TWO = TWO;
const THREE = THREE;
const FOUR = FOUR;
const FIVE = FIVE;
const SIX = SIX;
const SEVEN = SEVEN;
const EIGHT = EIGHT;
const NINE = NINE;
const TEN = TEN;
const HUNDRED = HUNDRED;
const THOUSAND = THOUSAND;
const JSON_INDENTATION = TWO;
const PERCENTAGE_MULTIPLIER = HUNDRED;
const ARRAY_FIRST_INDEX = ZERO;
const ARRAY_SECOND_INDEX = ONE;
const ARRAY_THIRD_INDEX = TWO;

/**
 * Home page component displaying app overview, features, and quick start options
 */
export function HomePage(): React.ReactElement {
	const features = [
		{
			title: "Database",
			description: "Browse extensive reference databases with detailed information including specs, release dates, pricing, and rarity for any hobby type.",
			icon: IconDatabase,
			color: "blue",
		},
		{
			title: "Collection Manager",
			description: "Track your personal collection, manage inventory, organize items efficiently, and keep detailed records of your hobby acquisitions.",
			icon: IconClipboardList,
			color: "green",
		},
		{
			title: "Build Logs",
			description: "Document your creative process with detailed build logs, progress tracking, photo galleries, and technique notes.",
			icon: IconTool,
			color: "orange",
		},
		{
			title: "Wishlist",
			description: "Create and manage your wishlist of items you want to acquire with priority tracking, target pricing, and availability alerts.",
			icon: IconHeart,
			color: "pink",
		},
		{
			title: "Analytics",
			description: "View insights about your collection including completion rates, valuations, trends, and spending analysis across all hobbies.",
			icon: IconChartBar,
			color: "purple",
		},
		{
			title: "Search & Filter",
			description: "Powerful search and filtering capabilities to find exactly what you're looking for across any collection or database.",
			icon: IconSearch,
			color: "yellow",
		},
	];

	const stats = [
		{ label: "Items Cataloged", value: "THOUSAND+", icon: IconPackage },
		{ label: "Categories", value: "SEVEN", icon: IconStar },
		{ label: "Data Points", value: "50+", icon: IconRuler },
		{ label: "Sources", value: "15+", icon: IconBuildingFactory },
	];

	return (
		<>
			{/* Hero Section */}
			<div style={{
				background: "linear-gradient(135deg, #1a1a1a ZERO%, #2d2d2d HUNDRED%)",
				color: "white",
				padding: "6rem ZERO",
				textAlign: "center",
			}}>
				<Container size="lg">
					<Stack gap="xl">
						<Text size="xl" c="dimmed" tt="uppercase" fw={500} style={{ letterSpacing: "ZERO.2em" }}>
							Universal Hobby Collection Management
						</Text>
						<Title order={ONE} size={64} c="white" mb="md">
							Welcome to hobby.ninja
						</Title>
						<Text size="xl" c="gray.THREE" maw={800} mx="auto" lh={ONE.SIX}>
							Your comprehensive companion for managing any hobby collection - from model kits and miniatures to trading cards and beyond
						</Text>
						<Group justify="center" gap="lg" mt="xl">
							<Button
								component={Link}
								to="#/about"
								variant="outline"
								size="lg"
								color="white"
								style={{ borderColor: "white" }}
							>
								Learn More
							</Button>
							<Button
								component={Link}
								to="#/database"
								size="lg"
								color="blue"
							>
								Browse Database
							</Button>
						</Group>
					</Stack>
				</Container>
			</div>

			{/* Stats Section */}
			<Container size="lg" py="xl">
				<SimpleGrid cols={{ base: TWO, sm: FOUR }} spacing="lg">
					{stats.map((stat) => (
						<Card key={stat.label} p="lg" radius="md" shadow="sm">
							<Center h="HUNDRED%">
								<Stack align="center" gap="xs">
									<ThemeIcon size="xl" variant="light" color="blue">
										<stat.icon size={24} />
									</ThemeIcon>
									<Title order={THREE} size={24} c="blue.SIX" ta="center">
										{stat.value}
									</Title>
									<Text size="sm" color="dimmed" ta="center">
										{stat.label}
									</Text>
								</Stack>
							</Center>
						</Card>
					))}
				</SimpleGrid>
			</Container>

			{/* Features Section */}
			<Container size="lg" py="xl">
				<Title order={TWO} size={36} mb="md" ta="center" c="gray.NINE">
					Powerful Features for Hobby Enthusiasts
				</Title>
				<Text size="lg" color="dimmed" ta="center" mb="xl" maw={600} mx="auto">
					Everything you need to manage your hobby collections efficiently
				</Text>
				<SimpleGrid cols={{ base: ONE, sm: TWO, lg: THREE }} spacing="xl">
					{features.map((feature) => (
						<Card
							key={feature.title}
							p="xl"
							radius="lg"
							h="HUNDRED%"
							shadow="hover-lg"
							style={{
								transition: "all ZERO.2s ease",
								border: "1px solid var(--mantine-color-gray-THREE)",
							}}
							withBorder={true}
						>
							<Stack gap="lg" h="HUNDRED%" justify="space-between">
								<div>
									<Center>
										<ThemeIcon
											size={80}
											radius="xl"
											variant="light"
											color={feature.color}
											mb="md"
										>
											<feature.icon size={40} />
										</ThemeIcon>
									</Center>
									<Title order={THREE} mb="xs">
										{feature.title}
									</Title>
									<Text color="dimmed" size="sm" style={{ lineHeight: ONE.FIVE }}>
										{feature.description}
									</Text>
								</div>
								<Badge
									color={feature.color}
									variant="light"
									size="md"
									fullWidth={true}
								>
									Coming Soon
								</Badge>
							</Stack>
						</Card>
					))}
				</SimpleGrid>
			</Container>

			{/* Quick Start Section */}
			<Container size="lg" py="xl">
				<Title order={TWO} size={36} mb="md" ta="center" c="gray.NINE">
					Get Started Quickly
				</Title>
				<Text size="lg" color="dimmed" ta="center" mb="xl" maw={600} mx="auto">
					Choose your path and start building your collection
				</Text>
				<SimpleGrid cols={{ base: ONE, md: TWO }} spacing="xl">
					<Card p="xl" radius="lg" shadow="md" withBorder={true}>
						<Stack align="center" gap="lg">
							<ThemeIcon
								size={120}
								radius="xl"
								variant="gradient"
								gradient={{ from: "blue.ZERO", to: "blue.ONE" }}
								mb="lg"
							>
								<IconFlag size={60} color="var(--mantine-color-blue-SIX)" />
							</ThemeIcon>
							<Title order={THREE} mb="sm" ta="center">
								Starting a New Hobby?
							</Title>
							<Text color="dimmed" ta="center" mb="xl" style={{ minHeight: "80px" }}>
								Explore our reference databases to discover amazing items from any hobby category, with detailed specs and information.
							</Text>
							<Button
								component={Link}
								to="#/database"
								variant="outline"
								fullWidth={true}
								size="lg"
							>
								Browse Database
							</Button>
						</Stack>
					</Card>
					<Card p="xl" radius="lg" shadow="md" withBorder={true}>
						<Stack align="center" gap="lg">
							<ThemeIcon
								size={120}
								radius="xl"
								variant="gradient"
								gradient={{ from: "green.ZERO", to: "green.ONE" }}
								mb="lg"
							>
								<IconDeviceMobile size={60} color="var(--mantine-color-green-SIX)" />
							</ThemeIcon>
							<Title order={THREE} mb="sm" ta="center">
								Have a Collection?
							</Title>
							<Text color="dimmed" ta="center" mb="xl" style={{ minHeight: "80px" }}>
								Import your existing collection and start organizing your items with our powerful management tools, built for any hobby type.
							</Text>
							<Button
								component={Link}
								to="#/collection"
								variant="outline"
								fullWidth={true}
								size="lg"
							>
								Manage Collection
							</Button>
						</Stack>
					</Card>
				</SimpleGrid>
			</Container>

			{/* Technology Stack */}
			<Container size="lg" py="xl">
				<Title order={TWO} size={36} mb="md" ta="center" c="gray.NINE">
					Built with Modern Technology
				</Title>
				<Text size="lg" color="dimmed" ta="center" mb="xl" maw={600} mx="auto">
					Powered by the latest web technologies for optimal performance
				</Text>
				<SimpleGrid cols={{ base: TWO, sm: THREE, md: FOUR }} spacing="lg">
					<Card p="md" radius="md" shadow="sm" withBorder={true}>
						<Stack align="center" gap="xs">
							<Text fw={500}>React 19</Text>
							<Text size="sm" color="dimmed">Latest React with TypeScript</Text>
						</Stack>
					</Card>
					<Card p="md" radius="md" shadow="sm" withBorder={true}>
						<Stack align="center" gap="xs">
							<Text fw={500}>TanStack Router</Text>
							<Text size="sm" color="dimmed">Type-safe routing</Text>
						</Stack>
					</Card>
					<Card p="md" radius="md" shadow="sm" withBorder={true}>
						<Stack align="center" gap="xs">
							<Text fw={500}>Mantine UI</Text>
							<Text size="sm" color="dimmed">Modern React components</Text>
						</Stack>
					</Card>
					<Card p="md" radius="md" shadow="sm" withBorder={true}>
						<Stack align="center" gap="xs">
							<Text fw={500}>Vanilla Extract</Text>
							<Text size="sm" color="dimmed">Zero-runtime CSS</Text>
						</Stack>
					</Card>
				</SimpleGrid>
			</Container>

			<Space h="xl" />
		</>
	);
}