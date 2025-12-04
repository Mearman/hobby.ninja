import { Container, Title, Text, Grid, Card, Badge, Button, Group } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import React from "react";

import { homeContainer, featuresGrid, featureCard } from "../styles/styles.css";


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
		<div className={homeContainer}>
			<Container size="lg">
				{/* Hero Section */}
				<div style={{ textAlign: "center", marginBottom: "4rem" }}>
					<Title order={1} size={48} mb="md">
            Welcome to Unnamed Gunpla App
					</Title>
					<Text size="lg" color="dimmed" mb="xl">
            Your comprehensive companion for Gundam and Gunpla model kit collection management
					</Text>
					<Group justify="center" gap="md">
						<Button component={Link} to="#/about" variant="outline" size="lg">
              Learn More
						</Button>
						<Button component={Link} to="#/database" size="lg">
              Browse Database
						</Button>
					</Group>
				</div>

				{/* Stats Section */}
				<Card p="xl" radius="md" mb="3rem" withBorder={true}>
					<Title order={2} mb="lg" ta="center">
            Database Overview
					</Title>
					<Grid>
						{stats.map((stat) => (
							<Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={stat.label}>
								<div style={{ textAlign: "center" }}>
									<Title order={3} size={32} c="primary">
										{stat.value}
									</Title>
									<Text size="sm" color="dimmed">
										{stat.label}
									</Text>
								</div>
							</Grid.Col>
						))}
					</Grid>
				</Card>

				{/* Features Section */}
				<Title order={2} mb="lg" ta="center">
          Features
				</Title>
				<div className={featuresGrid}>
					{features.map((feature) => (
						<Card
							key={feature.title}
							p="xl"
							radius="md"
							withBorder={true}
							shadow="sm"
							className={featureCard}
						>
							<div style={{ textAlign: "center", marginBottom: "1rem" }}>
								<div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
									{feature.icon}
								</div>
								<Title order={3} mb="sm">
									{feature.title}
								</Title>
							</div>
							<Text color="dimmed" mb="md" style={{ minHeight: "60px" }}>
								{feature.description}
							</Text>
							<Group justify="center">
								<Badge color={feature.color} variant="light">
                  Coming Soon
								</Badge>
							</Group>
						</Card>
					))}
				</div>

				{/* Quick Start Section */}
				<Card p="xl" radius="md" mt="3rem" withBorder={true}>
					<Title order={2} mb="lg" ta="center">
            Quick Start
					</Title>
					<Grid>
						<Grid.Col span={{ base: 12, md: 6 }}>
							<div style={{ textAlign: "center" }}>
								<div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🏁</div>
								<Title order={3} mb="sm">
                  New to Gunpla?
								</Title>
								<Text color="dimmed" mb="md">
                  Start by exploring our database to discover amazing Gundam model kits.
								</Text>
								<Button component={Link} to="#/database" variant="outline" fullWidth={true}>
                  Browse Database
								</Button>
							</div>
						</Grid.Col>
						<Grid.Col span={{ base: 12, md: 6 }}>
							<div style={{ textAlign: "center" }}>
								<div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📱</div>
								<Title order={3} mb="sm">
                  Have a Collection?
								</Title>
								<Text color="dimmed" mb="md">
                  Import your existing Gunpla collection and start organizing your kits.
								</Text>
								<Button component={Link} to="#/collection" variant="outline" fullWidth={true}>
                  Manage Collection
								</Button>
							</div>
						</Grid.Col>
					</Grid>
				</Card>

				{/* Technology Stack */}
				<Card p="xl" radius="md" mt="3rem" withBorder={true}>
					<Title order={2} mb="lg" ta="center">
            Built with Modern Technology
					</Title>
					<Grid>
						<Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
							<Text ta="center" fw={600}>React 19</Text>
							<Text ta="center" color="dimmed" size="sm">
                Latest React with TypeScript
							</Text>
						</Grid.Col>
						<Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
							<Text ta="center" fw={600}>TanStack Router</Text>
							<Text ta="center" color="dimmed" size="sm">
                Type-safe routing
							</Text>
						</Grid.Col>
						<Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
							<Text ta="center" fw={600}>Mantine UI</Text>
							<Text ta="center" color="dimmed" size="sm">
                Modern React components
							</Text>
						</Grid.Col>
						<Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
							<Text ta="center" fw={600}>Vanilla Extract</Text>
							<Text ta="center" color="dimmed" size="sm">
                Zero-runtime CSS
							</Text>
						</Grid.Col>
					</Grid>
				</Card>
			</Container>
		</div>
	);
}