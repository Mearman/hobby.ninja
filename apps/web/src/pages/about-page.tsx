import { Container, Title, Text, Grid, Card, Group, Badge, Anchor, List, ThemeIcon } from "@mantine/core";
import { IconApi, IconBrandReact, IconBrandTypescript, IconDatabase, IconSparkles } from "@tabler/icons-react";
import React from "react";

import { aboutContainer, techStack } from "../styles/styles.css";


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


export function AboutPage() {
	const technologies = [
		{ name: "React 19", description: "Latest React with modern hooks and concurrent features", icon: IconBrandReact },
		{ name: "TypeScript", description: "Type-safe JavaScript with strict mode enabled", icon: IconBrandTypescript },
		{ name: "TanStack Router", description: "Type-safe routing with hash routing for GitHub Pages", icon: IconApi },
		{ name: "Mantine UI", description: "Modern React component library with extensive customization", icon: IconApi },
		{ name: "Vanilla Extract", description: "Zero-runtime CSS-in-JS with TypeScript support", icon: IconApi },
		{ name: "Dexie", description: "Minimalist IndexedDB wrapper for client-side storage", icon: IconDatabase },
	];

	const features = [
		"Comprehensive Gunpla database with detailed kit information",
		"Personal collection management with tracking capabilities",
		"Build logging system with progress tracking",
		"Wishlist management with priority and target pricing",
		"Powerful search and filtering capabilities",
		"Offline-first design with local data storage",
		"Responsive design for all device sizes",
		"Accessibility-first approach with WCAG TWO.ONE AA compliance",
	];

	return (
		<div className={aboutContainer}>
			<Container size="lg">
				{/* Hero Section */}
				<div style={{ textAlign: "center", marginBottom: "3rem" }}>
					<Title order={ONE} size={42}>
            About hobby.ninja
					</Title>
					<Text size="lg" color="dimmed">
            A hobby collection manager for enthusiasts
					</Text>
				</div>

				{/* Mission Section */}
				<Card p="xl" radius="md" mb="3rem" withBorder={true}>
					<Title order={TWO} mb="md">
            Our Mission
					</Title>
					<Text size="md" color="dimmed" mb="lg">
            We believe that every hobbyist deserves a powerful, intuitive tool to manage their passion.
            This application combines comprehensive database information with personal collection management,
            all built with modern web technologies for the best possible user experience.
					</Text>
					<Text size="md" color="dimmed">
            Whether you&apos;re just starting your Gunpla journey or you&apos;re a seasoned collector with hundreds of kits,
            our platform adapts to your needs and helps you organize, track, and discover amazing Gundam model kits.
					</Text>
				</Card>

				{/* Key Features */}
				<Card p="xl" radius="md" mb="3rem" withBorder={true}>
					<Title order={TWO} mb="lg">
            Key Features
					</Title>
					<List
						spacing="md"
						size="md"
						icon={
							<ThemeIcon color="primary" size={24} radius="xl">
								<IconSparkles size={14} />
							</ThemeIcon>
						}
					>
						{features.map((feature, index) => (
							<List.Item key={index}>
								<Text>{feature}</Text>
							</List.Item>
						))}
					</List>
				</Card>

				{/* Technology Stack */}
				<Card p="xl" radius="md" mb="3rem" withBorder={true} className={techStack}>
					<Title order={TWO} mb="lg">
            Built with Modern Technology
					</Title>
					<Grid>
						{technologies.map((tech) => (
							<Grid.Col span={{ base: 12, sm: SIX, md: FOUR }} key={tech.name}>
								<Card p="md" radius="md" withBorder={true} h="HUNDRED%">
									<Group>
										<ThemeIcon color="primary" size={40} radius="md">
											<tech.icon size={20} />
										</ThemeIcon>
										<div style={{ flex: ONE }}>
											<Text fw={600} size="sm">{tech.name}</Text>
											<Text size="xs" color="dimmed">
												{tech.description}
											</Text>
										</div>
									</Group>
								</Card>
							</Grid.Col>
						))}
					</Grid>
				</Card>

				{/* Development Approach */}
				<Card p="xl" radius="md" mb="3rem" withBorder={true}>
					<Title order={TWO} mb="md">
            Development Approach
					</Title>
					<Grid>
						<Grid.Col span={{ base: 12, md: SIX }}>
							<Title order={THREE} size="h4" mb="sm">
                Modern Web Standards
							</Title>
							<Text color="dimmed" mb="lg">
                Built with the latest web technologies and best practices, ensuring optimal performance,
                security, and user experience across all modern browsers.
							</Text>
						</Grid.Col>
						<Grid.Col span={{ base: 12, md: SIX }}>
							<Title order={THREE} size="h4" mb="sm">
                Accessibility First
							</Title>
							<Text color="dimmed" mb="lg">
                Designed with WCAG TWO.ONE AA compliance in mind, ensuring the application is usable
                by everyone regardless of their abilities or assistive technology needs.
							</Text>
						</Grid.Col>
						<Grid.Col span={{ base: 12, md: SIX }}>
							<Title order={THREE} size="h4" mb="sm">
                Privacy & Security
							</Title>
							<Text color="dimmed" mb="lg">
                Your data stays local with IndexedDB storage, ensuring privacy and offline functionality.
                No personal data is sent to external servers without your explicit consent.
							</Text>
						</Grid.Col>
						<Grid.Col span={{ base: 12, md: SIX }}>
							<Title order={THREE} size="h4" mb="sm">
                Progressive Enhancement
							</Title>
							<Text color="dimmed" mb="lg">
                Progressive Web App capabilities ensure the application works reliably even on
                poor network connections, with offline caching and background sync features.
							</Text>
						</Grid.Col>
					</Grid>
				</Card>

				{/* Open Source */}
				<Card p="xl" radius="md" mb="3rem" withBorder={true}>
					<Title order={TWO} mb="md">
            Open Source Project
					</Title>
					<Text color="dimmed" mb="lg">
            This project is open source and built with the community in mind. We welcome contributions,
            bug reports, and feature requests from fellow Gunpla enthusiasts and developers.
					</Text>
					<Group>
						<Badge color="blue" variant="light">
              Nx Monorepo
						</Badge>
						<Badge color="green" variant="light">
              TypeScript
						</Badge>
						<Badge color="orange" variant="light">
              MIT License
						</Badge>
					</Group>
				</Card>

				{/* Acknowledgments */}
				<Card p="xl" radius="md" withBorder={true}>
					<Title order={TWO} mb="md">
            Acknowledgments
					</Title>
					<Text color="dimmed" mb="lg">
            Special thanks to the amazing open source community and the creators of the libraries
            and frameworks that make this application possible:
					</Text>
					<Group>
						<Anchor href="https://react.dev" target="_blank" rel="noopener noreferrer">
							<Badge color="blue" variant="light">React</Badge>
						</Anchor>
						<Anchor href="https://tanstack.com/router" target="_blank" rel="noopener noreferrer">
							<Badge color="teal" variant="light">TanStack</Badge>
						</Anchor>
						<Anchor href="https://mantine.dev" target="_blank" rel="noopener noreferrer">
							<Badge color="indigo" variant="light">Mantine</Badge>
						</Anchor>
						<Anchor href="https://vanilla-extract.style" target="_blank" rel="noopener noreferrer">
							<Badge color="yellow" variant="light">Vanilla Extract</Badge>
						</Anchor>
						<Anchor href="https://dexie.org" target="_blank" rel="noopener noreferrer">
							<Badge color="orange" variant="light">Dexie</Badge>
						</Anchor>
						<Anchor href="https://nx.dev" target="_blank" rel="noopener noreferrer">
							<Badge color="red" variant="light">Nx</Badge>
						</Anchor>
					</Group>
				</Card>
			</Container>
		</div>
	);
}