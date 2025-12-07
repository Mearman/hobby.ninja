import { Container, Title, Text, Card, Badge, Button, Group, Stack, SimpleGrid } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import React from "react";

/**
 * Home page component displaying app overview, features, and quick start options
 */
export function HomePage(): React.ReactElement {
	const features = [
		{
			title: "📚 Database",
			description: "Browse extensive collection of Gunpla model kits with detailed information including grades, scales, and release dates.",
			icon: "🤖",
			color: "blue",
		},
		{
			title: "📋 Collection Manager",
			description: "Track your personal Gunpla collection, manage inventory, and organize your model kits efficiently.",
			icon: "📦",
			color: "green",
		},
		{
			title: "🔧 Build Logs",
			description: "Document your Gunpla building process with detailed build logs, progress tracking, and photo galleries.",
			icon: "🛠️",
			color: "orange",
		},
		{
			title: "💝 Wishlist",
			description: "Create and manage your wishlist of Gunpla kits you want to acquire with priority and target pricing.",
			icon: "⭐",
			color: "pink",
		},
		{
			title: "📊 Analytics",
			description: "View insights about your collection including completion rates, favorite grades, and spending analysis.",
			icon: "📈",
			color: "purple",
		},
		{
			title: "🔍 Search & Filter",
			description: "Powerful search and filtering capabilities to find exactly the Gunpla kits you're looking for.",
			icon: "🔎",
			color: "yellow",
		},
	];

	const stats = [
		{ label: "Total Kits", value: "1000+" },
		{ label: "Grades", value: "7" },
		{ label: "Scales", value: "6" },
		{ label: "Manufacturers", value: "15+" },
	];

	return (
		<Container size="lg" py="xl">
			{/* Hero Section */}
			<Stack align="center" gap="lg" mb="xl">
				<Title order={1} size={48} ta="center">
					Welcome to hobby.ninja
				</Title>
				<Text size="lg" color="dimmed" ta="center" maw={600}>
					Your comprehensive companion for Gundam and Gunpla model kit collection management
				</Text>
				<Group>
					<Button component={Link} to="#/about" variant="outline" size="lg">
						Learn More
					</Button>
					<Button component={Link} to="#/database" size="lg">
						Browse Database
					</Button>
				</Group>
			</Stack>

			{/* Stats Section */}
			<Card p="xl" radius="md" mb="xl" withBorder={true}>
				<Title order={2} mb="lg" ta="center">
					Database Overview
				</Title>
				<SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
					{stats.map((stat) => (
						<Stack key={stat.label} align="center" gap="xs">
							<Title order={3} size={32} c="primary" ta="center">
								{stat.value}
							</Title>
							<Text size="sm" color="dimmed" ta="center">
								{stat.label}
							</Text>
						</Stack>
					))}
				</SimpleGrid>
			</Card>

			{/* Features Section */}
			<Title order={2} mb="lg" ta="center">
				Features
			</Title>
			<SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg" mb="xl">
				{features.map((feature) => (
					<Card
						key={feature.title}
						p="xl"
						radius="md"
						withBorder={true}
						shadow="sm"
						h="100%"
					>
						<Stack align="center" gap="md" h="100%">
							<Text size="3rem">{feature.icon}</Text>
							<Title order={3} ta="center">
								{feature.title}
							</Title>
							<Text color="dimmed" ta="center" style={{ minHeight: "60px" }}>
								{feature.description}
							</Text>
							<Badge color={feature.color} variant="light" size="lg">
								Coming Soon
							</Badge>
						</Stack>
					</Card>
				))}
			</SimpleGrid>

			{/* Quick Start Section */}
			<Card p="xl" radius="md" withBorder={true}>
				<Title order={2} mb="lg" ta="center">
					Quick Start
				</Title>
				<SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
					<Stack align="center" gap="md">
						<Text size="4rem">🏁</Text>
						<Title order={3} ta="center">
							New to Gunpla?
						</Title>
						<Text color="dimmed" ta="center" mb="md">
							Start by exploring our database to discover amazing Gundam model kits.
						</Text>
						<Button component={Link} to="#/database" variant="outline" fullWidth={true} size="lg">
							Browse Database
						</Button>
					</Stack>
					<Stack align="center" gap="md">
						<Text size="4rem">📱</Text>
						<Title order={3} ta="center">
							Have a Collection?
						</Title>
						<Text color="dimmed" ta="center" mb="md">
							Import your existing Gunpla collection and start organizing your kits.
						</Text>
						<Button component={Link} to="#/collection" fullWidth={true} size="lg">
							Manage Collection
						</Button>
					</Stack>
				</SimpleGrid>
			</Card>

			{/* Technology Stack */}
			<Card p="xl" radius="md" mt="xl" withBorder={true}>
				<Title order={2} mb="lg" ta="center">
					Built with Modern Technology
				</Title>
				<SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
					<Stack align="center" gap="xs">
						<Text fw={500}>React 19</Text>
						<Text size="sm" color="dimmed">Latest React with TypeScript</Text>
					</Stack>
					<Stack align="center" gap="xs">
						<Text fw={500}>TanStack Router</Text>
						<Text size="sm" color="dimmed">Type-safe routing</Text>
					</Stack>
					<Stack align="center" gap="xs">
						<Text fw={500}>Mantine UI</Text>
						<Text size="sm" color="dimmed">Modern React components</Text>
					</Stack>
					<Stack align="center" gap="xs">
						<Text fw={500}>Vanilla Extract</Text>
						<Text size="sm" color="dimmed">Zero-runtime CSS</Text>
					</Stack>
				</SimpleGrid>
			</Card>
		</Container>
	);
}