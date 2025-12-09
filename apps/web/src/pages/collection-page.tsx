import { Container, Title, Text, Card, Badge, Button, Group, Stack, SimpleGrid, Grid, Center, Space, ThemeIcon, Skeleton } from "@mantine/core";
import { IconClipboardList, IconHeart, IconPlus, IconSearch, IconStar, IconFolderOpen, IconPackage, IconChartBar, IconTag, IconSettings } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";

import { collectionService } from "../services/collectionService";
import { hobbyGraphService , HobbyType } from "../services/hobbyGraphService";


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

interface CollectionStats {
	totalCollections: number;
	totalItems: number;
	totalValue: number;
	recentlyAdded: number;
}

/**
 * Collection management hub page
 * Shows user's collections, quick stats, and actions
 */
export function CollectionPage(): React.ReactElement {
	const [stats, setStats] = useState<CollectionStats>({
		totalCollections: ZERO,
		totalItems: ZERO,
		totalValue: ZERO,
		recentlyAdded: ZERO,
	});
	const [loading, setLoading] = useState(true);
	const [hobbyTypes, setHobbyTypes] = useState<HobbyType[]>([]);
	const [hobbyTypeStats, setHobbyTypeStats] = useState<Record<string, { totalCollections: number; totalItems: number; recentItems: number }>>({});

	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true);

				// Load dynamic hobby types from graph service
				const types = await hobbyGraphService.getHobbyTypes();
				setHobbyTypes(types);

				// Load collection stats
				const collections = await collectionService.getCollections();
				const items = await collectionService.getItems();

				// Calculate overall stats
				const overallStats = {
					totalCollections: collections.length,
					totalItems: items.length,
					totalValue: ZERO, // TODO: Calculate from items
					recentlyAdded: items.filter(item => {
						const addedDate = new Date(item.createdAt);
						const weekAgo = new Date();
						weekAgo.setDate(weekAgo.getDate() - SEVEN);
						return addedDate > weekAgo;
					}).length,
				};
				setStats(overallStats);

				// Load stats for each hobby type
				const statsPromises = types.map(async (type) => {
					const typeStats = await hobbyGraphService.getHobbyTypeStats(type.id);
					return { [type.id]: typeStats };
				});

				const statsResults = await Promise.all(statsPromises);
				const combinedStats = statsResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
				setHobbyTypeStats(combinedStats);

			} catch (error) {
				console.error("Failed to load collection data:", error);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	const features = [
		{
			title: "Create Collections",
			description: "Organize your items by hobby type, series, or any custom category",
			icon: IconFolderOpen,
			color: "blue",
		},
		{
			title: "Add Items",
			description: "Add items to your collection with photos, purchase info, and status",
			icon: IconPlus,
			color: "green",
		},
		{
			title: "Track Progress",
			description: "Monitor your collection growth, completion status, and wishlists",
			icon: IconChartBar,
			color: "orange",
		},
		{
			title: "Import & Export",
			description: "Import from various formats and share your collection with others",
			icon: IconTag,
			color: "pink",
		},
	];

	// Loading state
	if (loading) {
		return (
			<Container size="lg" py="xl">
				<Stack gap="xl">
					<Skeleton height={48} width={300} />
					<Card p="xl" radius="lg" withBorder={true}>
						<Stack gap="md">
							{[ONE, TWO, THREE, FOUR, FIVE, SIX].map((i) => (
								<Skeleton key={i} height={40} radius="md" />
							))}
						</Stack>
					</Card>
					{/* Hobby Types Loading Skeleton */}
					<Title order={TWO} size={36} mb="md" ta="center" c="gray.NINE">
						Start a Collection
					</Title>
					<SimpleGrid cols={{ base: ONE, sm: TWO }} spacing="xl">
						{[ONE, TWO, THREE, FOUR].map((i) => (
							<Card key={i} p="xl" radius="lg" shadow="md" withBorder={true}>
								<Stack gap="lg" align="center">
									<Skeleton width={80} height={80} radius="xl" />
									<Skeleton height={24} width={120} />
									<Skeleton height={16} width={200} />
									<Skeleton height={36} width={150} />
								</Stack>
							</Card>
						))}
					</SimpleGrid>
				</Stack>
			</Container>
		);
	}

	return (
		<>
			{/* Hero Section */}
			<div style={{
				background: "linear-gradient(135deg, #2d2d2d ZERO%, #1a1a1a HUNDRED%)",
				color: "white",
				padding: "4rem ZERO",
				textAlign: "center",
			}}>
				<Container size="lg">
					<Stack gap="xl">
						<ThemeIcon size={80} radius="xl" variant="light" color="blue">
							<IconClipboardList size={40} />
						</ThemeIcon>
						<Title order={ONE} size={48} c="white" mb="md">
							My Collections
						</Title>
						<Text size="xl" c="gray.THREE" maw={600} mx="auto" lh={ONE.SIX}>
							Manage your personal hobby collections with powerful organization tools
						</Text>
						<Group justify="center" gap="lg" mt="xl">
							<Button
								component={Link}
								to="/collection/model_kits"
								size="lg"
								color="blue"
								leftSection={<IconPlus size={18} />}
							>
								Create New Collection
							</Button>
							<Button
								variant="outline"
								size="lg"
								color="white"
								style={{ borderColor: "white" }}
								leftSection={<IconSearch size={18} />}
							>
								Browse Database
							</Button>
						</Group>
					</Stack>
				</Container>
			</div>

			{/* Stats Section */}
			<Container size="lg" py="xl">
				<Title order={TWO} size={36} mb="md" ta="center" c="gray.NINE">
					Collection Overview
				</Title>
				<Text size="lg" color="dimmed" ta="center" mb="xl" maw={600} mx="auto">
					A quick summary of your hobby collection statistics
				</Text>

				<SimpleGrid cols={{ base: TWO, sm: FOUR }} spacing="lg">
					<Card p="lg" radius="md" shadow="sm">
						<Center h="HUNDRED%">
							<Stack align="center" gap="xs">
								<ThemeIcon size="xl" variant="light" color="blue">
									<IconFolderOpen size={24} />
								</ThemeIcon>
								<Title order={THREE} size={24} c="blue.SIX" ta="center">
									{stats.totalCollections}
								</Title>
								<Text size="sm" color="dimmed" ta="center">
									Total Collections
								</Text>
							</Stack>
						</Center>
					</Card>

					<Card p="lg" radius="md" shadow="sm">
						<Center h="HUNDRED%">
							<Stack align="center" gap="xs">
								<ThemeIcon size="xl" variant="light" color="green">
									<IconPackage size={24} />
								</ThemeIcon>
								<Title order={THREE} size={24} c="green.SIX" ta="center">
									{stats.totalItems}
								</Title>
								<Text size="sm" color="dimmed" ta="center">
									Total Items
								</Text>
							</Stack>
						</Center>
					</Card>

					<Card p="lg" radius="md" shadow="sm">
						<Center h="HUNDRED%">
							<Stack align="center" gap="xs">
								<ThemeIcon size="xl" variant="light" color="orange">
									<IconStar size={24} />
								</ThemeIcon>
								<Title order={THREE} size={24} c="orange.SIX" ta="center">
									${stats.totalValue}
								</Title>
								<Text size="sm" color="dimmed" ta="center">
									Total Value
								</Text>
							</Stack>
						</Center>
					</Card>

					<Card p="lg" radius="md" shadow="sm">
						<Center h="HUNDRED%">
							<Stack align="center" gap="xs">
								<ThemeIcon size="xl" variant="light" color="purple">
									<IconHeart size={24} />
								</ThemeIcon>
								<Title order={THREE} size={24} c="purple.SIX" ta="center">
									{stats.recentlyAdded}
								</Title>
								<Text size="sm" color="dimmed" ta="center">
									Recently Added
								</Text>
							</Stack>
						</Center>
					</Card>
				</SimpleGrid>
			</Container>

			{/* Hobby Types Section */}
			<Container size="lg" py="xl">
				<Title order={TWO} size={36} mb="md" ta="center" c="gray.NINE">
					Start a Collection
				</Title>
				<Text size="lg" color="dimmed" ta="center" mb="xl" maw={600} mx="auto">
					Choose your hobby type and start organizing your collection
				</Text>

				<SimpleGrid cols={{ base: ONE, sm: TWO }} spacing="xl">
					{hobbyTypes.map((hobby) => {
						const stats = hobbyTypeStats[hobby.id];
						return (
							<Card
								key={hobby.id}
								p="xl"
								radius="lg"
								shadow="md"
								withBorder={true}
								style={{
									transition: "all ZERO.2s ease",
									border: "1px solid var(--mantine-color-gray-THREE)",
									textDecoration: "none",
									color: "inherit",
								}}
								component={Link}
								to={`/collection/${hobby.id}`}
							>
								<Stack align="center" gap="lg">
									<ThemeIcon
										size={80}
										radius="xl"
										variant="light"
										color={hobby.color}
									>
										<IconPackage size={40} />
									</ThemeIcon>
									<Title order={THREE} ta="center">{hobby.name}</Title>
									<Text color="dimmed" ta="center" size="sm">
										{hobby.description}
									</Text>
									{stats && (
										<Group gap="lg" mt="sm">
											<Stack gap={ZERO} align="center">
												<Text size="lg" fw={500} c={hobby.color}>
													{stats.totalCollections}
												</Text>
												<Text size="xs" color="dimmed">
													Collections
												</Text>
											</Stack>
											<Stack gap={ZERO} align="center">
												<Text size="lg" fw={500} c={hobby.color}>
													{stats.totalItems}
												</Text>
												<Text size="xs" color="dimmed">
													Items
												</Text>
											</Stack>
										</Group>
									)}
									<Button
										variant="outline"
										fullWidth={true}
										mt="md"
									>
										Manage {hobby.name}
									</Button>
								</Stack>
							</Card>
						);
					})}
				</SimpleGrid>
			</Container>

			{/* Features Section */}
			<Container size="lg" py="xl">
				<Title order={TWO} size={36} mb="md" ta="center" c="gray.NINE">
					Collection Management Features
				</Title>
				<Text size="lg" color="dimmed" ta="center" mb="xl" maw={600} mx="auto">
					Powerful tools to help you organize and track your hobby collections
				</Text>

				<SimpleGrid cols={{ base: ONE, sm: TWO, lg: FOUR }} spacing="lg">
					{features.map((feature) => (
						<Card
							key={feature.title}
							p="lg"
							radius="md"
							shadow="sm"
							withBorder={true}
							h="HUNDRED%"
						>
							<Stack gap="md" h="HUNDRED%">
								<ThemeIcon
									size="xl"
									variant="light"
									color={feature.color}
								>
									<feature.icon size={24} />
								</ThemeIcon>
								<Title order={FOUR} size={18} ta="center">
									{feature.title}
								</Title>
								<Text color="dimmed" size="sm" ta="center" style={{ lineHeight: ONE.FOUR }}>
									{feature.description}
								</Text>
							</Stack>
						</Card>
					))}
				</SimpleGrid>
			</Container>

			<Space h="xl" />
		</>
	);
}