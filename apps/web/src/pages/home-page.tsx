import { Container, Title, Text, Card, Badge, Button, Group, Stack, SimpleGrid, Grid, Center, Space, ThemeIcon } from "@mantine/core";
import { IconDatabase, IconClipboardList, IconTool, IconHeart, IconChartBar, IconSearch, IconPackage, IconStar, IconRuler, IconBuildingFactory, IconFlag, IconDeviceMobile } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import React from "react";

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
		{ label: "Items Cataloged", value: "1000+", icon: IconPackage },
		{ label: "Categories", value: "7", icon: IconStar },
		{ label: "Data Points", value: "50+", icon: IconRuler },
		{ label: "Sources", value: "15+", icon: IconBuildingFactory },
	];

	return (
		<>
			{/* Hero Section */}
			<div style={{
				background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
				color: "white",
				padding: "6rem 0",
				textAlign: "center"
			}}>
				<Container size="lg">
					<Stack gap="xl">
						<Text size="xl" c="dimmed" tt="uppercase" fw={500} letterSpacing={2}>
							Universal Hobby Collection Management
						</Text>
						<Title order={1} size={64} c="white" mb="md">
							Welcome to hobby.ninja
						</Title>
						<Text size="xl" c="gray.3" maw={800} mx="auto" lh={1.6}>
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
				<SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
					{stats.map((stat) => (
						<Card key={stat.label} p="lg" radius="md" shadow="sm">
							<Center h="100%">
								<Stack align="center" gap="xs">
									<ThemeIcon size="xl" variant="light" color="blue">
										<stat.icon size={24} />
									</ThemeIcon>
									<Title order={3} size={24} c="blue.6" ta="center">
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
				<Title order={2} size={36} mb="md" ta="center" c="gray.9">
					Powerful Features for Hobby Enthusiasts
				</Title>
				<Text size="lg" color="dimmed" ta="center" mb="xl" maw={600} mx="auto">
					Everything you need to manage your hobby collections efficiently
				</Text>
				<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
					{features.map((feature) => (
						<Card
							key={feature.title}
							p="xl"
							radius="lg"
							shadow="md"
							h="100%"
							shadow="hover-lg"
							style={{
								transition: "all 0.2s ease",
								border: "1px solid var(--mantine-color-gray-3)"
							}}
							withBorder={true}
						>
							<Stack gap="lg" h="100%" justify="space-between">
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
									<Title order={3} mb="xs">
										{feature.title}
									</Title>
									<Text color="dimmed" size="sm" style={{ lineHeight: 1.5 }}>
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
				<Title order={2} size={36} mb="md" ta="center" c="gray.9">
					Get Started Quickly
				</Title>
				<Text size="lg" color="dimmed" ta="center" mb="xl" maw={600} mx="auto">
					Choose your path and start building your collection
				</Text>
				<SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
					<Card p="xl" radius="lg" shadow="md" withBorder={true}>
						<Stack align="center" gap="lg">
							<ThemeIcon
								size={120}
								radius="xl"
								variant="gradient"
								gradient={{ from: "blue.0", to: "blue.1" }}
								mb="lg"
							>
								<IconFlag size={60} color="var(--mantine-color-blue-6)" />
							</ThemeIcon>
							<Title order={3} mb="sm" ta="center">
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
								gradient={{ from: "green.0", to: "green.1" }}
								mb="lg"
							>
								<IconDeviceMobile size={60} color="var(--mantine-color-green-6)" />
							</ThemeIcon>
							<Title order={3} mb="sm" ta="center">
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
				<Title order={2} size={36} mb="md" ta="center" c="gray.9">
					Built with Modern Technology
				</Title>
				<Text size="lg" color="dimmed" ta="center" mb="xl" maw={600} mx="auto">
					Powered by the latest web technologies for optimal performance
				</Text>
				<SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="lg">
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