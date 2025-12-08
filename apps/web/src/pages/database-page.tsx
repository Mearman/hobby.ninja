import {
	Container,
	Title,
	Text,
	Grid,
	Card,
	Button,
	Group,
	Badge,
	Paper,
	TextInput,
	Loader,
	Alert,
	Image,
	SimpleGrid,
	Stack,
	Center,
} from "@mantine/core";
import { IconSearch, IconFilter, IconStar, IconClock, IconTrendingUp, IconDatabase, IconBook, IconPhoto, IconRobot, IconMask, IconRocket, IconBolt, IconDiamond, IconCrown, IconFlame } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useCallback } from "react";

import { dataService, type DatabaseStats, type UnifiedItem, type SearchResult } from "../services/dataService";
import { databaseContainer, heroSection, statsCard, hobbyTypeCard, featuredSection } from "../styles/styles.css";

/**
 * Main database hub page serving as entry point for hobby collection database
 */
export function DatabasePage(): React.ReactElement {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");
	const [stats, setStats] = useState<DatabaseStats | null>(null);
	const [recentItems, setRecentItems] = useState<UnifiedItem[]>([]);
	const [popularItems, setPopularItems] = useState<SearchResult["items"]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Hobby types data
	const hobbyTypes = [
		{
			id: "gunpla",
			name: "Gunpla",
			description: "Gundam model kits and accessories",
			icon: IconRobot,
			color: "gunplaBlue" as const,
			count: stats?.totalItems?.unified || 0,
			features: ["Master Grade", "High Grade", "Real Grade", "Perfect Grade"],
		},
		{
			id: "figure-rise",
			name: "Figure-rise",
			description: "Anime character figures and statues",
			icon: IconMask,
			color: "gunplaRed" as const,
			count: 0,
			features: ["Standard", "Effect", "Mechanic"],
		},
		{
			id: "model-kits",
			name: "Model Kits",
			description: "Other anime and sci-fi model kits",
			icon: IconRocket,
			color: "gunplaGray" as const,
			count: 0,
			features: ["Cars", "Aircraft", "Ships"],
		},
	];

	// Quick filter options
	const quickFilters = [
		{ name: "High Grade", grade: "HG", icon: IconBolt },
		{ name: "Master Grade", grade: "MG", icon: IconStar },
		{ name: "Real Grade", grade: "RG", icon: IconDiamond },
		{ name: "Perfect Grade", grade: "PG", icon: IconCrown },
		{ name: "Recent Releases", type: "recent", icon: IconClock },
		{ name: "Popular Items", type: "popular", icon: IconFlame },
	];

	// Load initial data
	useEffect(() => {
		const loadData = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Load statistics in parallel
				const [statsData, recentData, popularData] = await Promise.all([
					dataService.getStatistics(),
					dataService.getItemsByPage(1, 6, "unified"),
					dataService.searchItems("", {}, { limit: 6 }),
				]);

				setStats(statsData);
				setRecentItems(recentData.items.filter((item): item is UnifiedItem => item.$type === 'unified_item'));
				setPopularItems(popularData.items || []);
			} catch (error_) {
				console.error("Failed to load database data:", error_);
				setError("Failed to load database. Please try again.");
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, []);

	// Handle search - navigate to gunpla page with search query
	const handleSearch = useCallback((query: string) => {
		if (query.trim()) {
			navigate({
				to: "/database/gunpla",
				search: { q: query.trim() },
			});
		}
	}, [navigate]);

	// Handle filter selection - navigate to gunpla page with filter
	const handleFilterSelect = useCallback((filter: typeof quickFilters[0]) => {
		const searchParams: Record<string, string> = {};

		if (filter.grade) {
			searchParams["grade"] = filter.grade;
		} else if (filter.type === "recent") {
			searchParams["recent"] = "true";
		} else if (filter.type === "popular") {
			searchParams["popular"] = "true";
		}

		navigate({
			to: "/database/gunpla",
			search: searchParams,
		});
	}, [navigate]);

	// Handle hobby type selection - navigate directly to the hobby type page
	const handleHobbyTypeSelect = useCallback((typeId: string) => {
		navigate({
			to: `/database/${typeId}`,
		});
	}, [navigate]);

	// Render loading state
	if (isLoading) {
		return (
			<div className={databaseContainer}>
				<Container size="lg">
					<Center h="50vh">
						<Stack align="center">
							<Loader size="xl" />
							<Text size="lg" color="dimmed">
								Loading database...
							</Text>
						</Stack>
					</Center>
				</Container>
			</div>
		);
	}

	// Render error state
	if (error) {
		return (
			<div className={databaseContainer}>
				<Container size="lg">
					<Center h="50vh">
						<Alert color="red" variant="light" w="100%" maw={500}>
							<Text ta="center">{error}</Text>
							<Button variant="outline" onClick={() => { void globalThis.location.reload(); }} mt="md">
								Try Again
							</Button>
						</Alert>
					</Center>
				</Container>
			</div>
		);
	}

	return (
		<div className={databaseContainer}>
			{/* Hero Section */}
			<div className={heroSection}>
				<Container size="lg">
					<Paper p="xl" radius="lg" withBorder={true} bg="var(--mantine-color-body)">
						<div style={{ textAlign: "center", marginBottom: "3rem" }}>
							<Title order={1} size={48} mb="md" c="gunplaBlue">
								Hobby Database
							</Title>
							<Text size="lg" color="dimmed" mb="xl">
								Explore our comprehensive collection of Gunpla and hobby model kits with detailed information,
								high-quality images, and advanced search capabilities.
							</Text>

							{/* Quick Search Bar */}
							<TextInput
								size="lg"
								placeholder="Search for kits, series, or grades..."
								leftSection={<IconSearch size={20} />}
								rightSection={
									<Button
										size="sm"
										onClick={() => { handleSearch(searchQuery); }}
										disabled={!searchQuery.trim()}
									>
										Search
									</Button>
								}
								value={searchQuery}
								onChange={(event) => { setSearchQuery(event.currentTarget.value); }}
								onKeyPress={(event) => {
									if (event.key === "Enter") {
										handleSearch(searchQuery);
									}
								}}
								maw={600}
								mx="auto"
								styles={{
									input: {
										fontSize: "1.1rem",
									},
								}}
							/>

							{/* Quick Actions */}
							<Group justify="center" gap="md" mt="lg">
								<Button
									variant="outline"
									leftSection={<IconFilter size={16} />}
									onClick={() => navigate({ to: "/database/gunpla" })}
								>
									Advanced Search
								</Button>
								<Button
									variant="outline"
									leftSection={<IconTrendingUp size={16} />}
									onClick={() => navigate({ to: "/database/gunpla" })}
								>
									Browse All
								</Button>
							</Group>
						</div>

						{/* Statistics Overview */}
						<div className={statsCard}>
							<Title order={2} mb="lg" ta="center">
								Database Overview
							</Title>
							<Grid>
								<Grid.Col span={{ base: 6, sm: 3 }}>
									<div style={{ textAlign: "center" }}>
										<Title order={3} size={32} c="gunplaBlue">
											{stats?.totalItems?.unified || 0}
										</Title>
										<Text size="sm" color="dimmed">
											Total Items
										</Text>
									</div>
								</Grid.Col>
								<Grid.Col span={{ base: 6, sm: 3 }}>
									<div style={{ textAlign: "center" }}>
										<Title order={3} size={32} c="gunplaRed">
											{stats?.sourceCoverage?.withManual || 0}
										</Title>
										<Text size="sm" color="dimmed">
											With Manuals
										</Text>
									</div>
								</Grid.Col>
								<Grid.Col span={{ base: 6, sm: 3 }}>
									<div style={{ textAlign: "center" }}>
										<Title order={3} size={32} c="gunplaGray">
											{stats?.sourceCoverage?.withCatalog || 0}
										</Title>
										<Text size="sm" color="dimmed">
											Catalog Items
										</Text>
									</div>
								</Grid.Col>
								<Grid.Col span={{ base: 6, sm: 3 }}>
									<div style={{ textAlign: "center" }}>
										<Title order={3} size={32} c="green">
											{stats?.sourceCoverage?.withBoth || 0}
										</Title>
										<Text size="sm" color="dimmed">
											Complete Sets
										</Text>
									</div>
								</Grid.Col>
							</Grid>
						</div>
					</Paper>
				</Container>
			</div>

			<Container size="lg">
				{/* Hobby Type Selector */}
				<Title order={2} mb="lg" ta="center">
					Explore by Category
				</Title>
				<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" mb="3rem">
					{hobbyTypes.map((type) => (
						<Card
							key={type.id}
							className={hobbyTypeCard}
							p="xl"
							radius="md"
							withBorder={true}
							shadow="sm"
							h="100%"
							onClick={() => { handleHobbyTypeSelect(type.id); }}
							style={{ cursor: "pointer" }}
							component="button"
							type="button"
						>
							<Stack h="100%" align="center" justify="space-between">
								<div style={{ textAlign: "center" }}>
									<Center mb="md">
										<type.icon size={48} color={`var(--mantine-color-${type.color})`} />
									</Center>
									<Title order={3} mb="xs" c={type.color}>
										{type.name}
									</Title>
									<Text color="dimmed" size="sm" mb="md">
										{type.description}
									</Text>
								</div>

								<div style={{ width: "100%" }}>
									<Group justify="center" mb="sm">
										<Badge color={type.color} variant="light" size="lg">
											{type.count.toLocaleString()} items
										</Badge>
									</Group>

									{/* Features list */}
									{type.features.length > 0 && (
										<SimpleGrid cols={type.features.length} spacing="xs">
											{type.features.map((feature) => (
												<Badge
													key={feature}
													variant="outline"
													size="xs"
													color={type.color}
												>
													{feature}
												</Badge>
											))}
										</SimpleGrid>
									)}
								</div>
							</Stack>
						</Card>
					))}
				</SimpleGrid>

				{/* Quick Filter Shortcuts */}
				<Title order={2} mb="lg" ta="center">
					Quick Filters
				</Title>
				<Paper p="lg" radius="md" withBorder={true} mb="3rem">
					<SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md">
						{quickFilters.map((filter) => (
							<Button
								key={filter.name}
								variant="outline"
								onClick={() => { handleFilterSelect(filter); }}
								leftSection={<filter.icon size={16} />}
								styles={{
									inner: {
										justifyContent: "flex-start",
									},
								}}
							>
								{filter.name}
							</Button>
						))}
					</SimpleGrid>
				</Paper>

				{/* Featured Sections */}
				<Title order={2} mb="lg" ta="center">
					Featured Collections
				</Title>

				<Grid mb="3rem">
					{/* Recent Additions */}
					<Grid.Col span={{ base: 12, md: 6 }}>
						<Card className={featuredSection} p="lg" radius="md" withBorder={true} h="100%">
							<Group justify="space-between" mb="md">
								<Title order={4}>Recent Additions</Title>
								<IconClock size={18} color="var(--mantine-color-dimmed)" />
							</Group>

							{recentItems.length > 0 ? (
								<Stack gap="sm">
									{recentItems.slice(0, 4).map((item) => (
										<Card key={item.id} p="sm" radius="sm" withBorder={true} bg="var(--mantine-color-body)">
											<Group justify="space-between" align="center">
												<div style={{ flex: 1, minWidth: 0 }}>
													<Text size="sm" fw={500} truncate={true}>
														{item.properties?.name?.en || item.properties?.name?.ja || "Unknown"}
													</Text>
													{item.properties?.grade && (
														<Badge size="xs" variant="light" mt="2">
															{item.properties.grade}
														</Badge>
													)}
												</div>
												</Group>
										</Card>
									))}
								</Stack>
							) : (
								<Text color="dimmed" ta="center" py="xl">
									No recent items found
								</Text>
							)}

							<Button
								variant="outline"
								w="100%"
								mt="md"
								onClick={() => navigate({ to: "/database/gunpla", search: { recent: "true" } })}
							>
								View All Recent
							</Button>
						</Card>
					</Grid.Col>

					{/* Popular Items */}
					<Grid.Col span={{ base: 12, md: 6 }}>
						<Card className={featuredSection} p="lg" radius="md" withBorder={true} h="100%">
							<Group justify="space-between" mb="md">
								<Title order={4}>Popular Items</Title>
								<IconTrendingUp size={18} color="var(--mantine-color-dimmed)" />
							</Group>

							{popularItems.length > 0 ? (
								<Stack gap="sm">
									{popularItems.slice(0, 4).map((item) => (
										<Card key={item.id} p="sm" radius="sm" withBorder={true} bg="var(--mantine-color-body)">
											<Group justify="space-between" align="center">
												<div style={{ flex: 1, minWidth: 0 }}>
													<Text size="sm" fw={500} truncate={true}>
														{item.data?.properties?.name?.en || item.data?.properties?.name?.ja || "Unknown"}
													</Text>
													<Badge size="xs" variant="light" color="yellow" mt="2">
														Popular
													</Badge>
												</div>
												<Group gap="xs">
													<IconStar size={14} color="var(--mantine-color-yellow)" />
													<Text size="xs" color="dimmed">
														{(item.score * 5).toFixed(1)}
													</Text>
												</Group>
											</Group>
										</Card>
									))}
								</Stack>
							) : (
								<Text color="dimmed" ta="center" py="xl">
									No popular items found
								</Text>
							)}

							<Button
								variant="outline"
								w="100%"
								mt="md"
								onClick={() => navigate({ to: "/database/gunpla", search: { popular: "true" } })}
							>
								View All Popular
							</Button>
						</Card>
					</Grid.Col>
				</Grid>

				{/* Data Sources Overview */}
				<Title order={2} mb="lg" ta="center">
					Data Sources
				</Title>
				<Paper p="xl" radius="md" withBorder={true}>
					<Grid>
						<Grid.Col span={{ base: 12, sm: 4 }}>
							<Card p="md" radius="sm" withBorder={true} bg="var(--mantine-color-blue-light)">
								<Group align="center" mb="sm">
									<IconDatabase size={24} color="var(--mantine-color-blue)" />
									<Title order={5}>Unified Database</Title>
								</Group>
								<Text size="sm" color="dimmed" mb="sm">
									Merged and cross-referenced data from multiple sources
								</Text>
								<Badge color="blue" variant="light">
									{stats?.totalItems?.unified || 0} items
								</Badge>
							</Card>
						</Grid.Col>

						<Grid.Col span={{ base: 12, sm: 4 }}>
							<Card p="md" radius="sm" withBorder={true} bg="var(--mantine-color-red-light)">
								<Group align="center" mb="sm">
									<IconBook size={24} color="var(--mantine-color-red)" />
									<Title order={5}>Manual Library</Title>
								</Group>
								<Text size="sm" color="dimmed" mb="sm">
									Construction manuals and building guides
								</Text>
								<Badge color="red" variant="light">
									{stats?.totalItems?.manual || 0} manuals
								</Badge>
							</Card>
						</Grid.Col>

						<Grid.Col span={{ base: 12, sm: 4 }}>
							<Card p="md" radius="sm" withBorder={true} bg="var(--mantine-color-gray-light)">
								<Group align="center" mb="sm">
									<IconPhoto size={24} color="var(--mantine-color-gray)" />
									<Title order={5}>Product Catalog</Title>
								</Group>
								<Text size="sm" color="dimmed" mb="sm">
									Official product information and specifications
								</Text>
								<Badge color="gray" variant="light">
									{stats?.totalItems?.catalog || 0} products
								</Badge>
							</Card>
						</Grid.Col>
					</Grid>
				</Paper>
			</Container>
		</div>
	);
}