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
			count: stats?.totalItems?.unified || ZERO,
			features: ["Master Grade", "High Grade", "Real Grade", "Perfect Grade"],
		},
		{
			id: "figure-rise",
			name: "Figure-rise",
			description: "Anime character figures and statues",
			icon: IconMask,
			color: "gunplaRed" as const,
			count: ZERO,
			features: ["Standard", "Effect", "Mechanic"],
		},
		{
			id: "model-kits",
			name: "Model Kits",
			description: "Other anime and sci-fi model kits",
			icon: IconRocket,
			color: "gunplaGray" as const,
			count: ZERO,
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
					dataService.getItemsByPage(ONE, SIX, "unified"),
					dataService.searchItems("", {}, { limit: SIX }),
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
	const handleFilterSelect = useCallback((filter: typeof quickFilters[ARRAY_FIRST_INDEX]) => {
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
						<Alert color="red" variant="light" w="HUNDRED%" maw={500}>
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
							<Title order={ONE} size={48} mb="md" c="gunplaBlue">
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
										fontSize: "ONE.1rem",
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
							<Title order={TWO} mb="lg" ta="center">
								Database Overview
							</Title>
							<Grid>
								<Grid.Col span={{ base: SIX, sm: THREE }}>
									<div style={{ textAlign: "center" }}>
										<Title order={THREE} size={32} c="gunplaBlue">
											{stats?.totalItems?.unified || ZERO}
										</Title>
										<Text size="sm" color="dimmed">
											Total Items
										</Text>
									</div>
								</Grid.Col>
								<Grid.Col span={{ base: SIX, sm: THREE }}>
									<div style={{ textAlign: "center" }}>
										<Title order={THREE} size={32} c="gunplaRed">
											{stats?.sourceCoverage?.withManual || ZERO}
										</Title>
										<Text size="sm" color="dimmed">
											With Manuals
										</Text>
									</div>
								</Grid.Col>
								<Grid.Col span={{ base: SIX, sm: THREE }}>
									<div style={{ textAlign: "center" }}>
										<Title order={THREE} size={32} c="gunplaGray">
											{stats?.sourceCoverage?.withCatalog || ZERO}
										</Title>
										<Text size="sm" color="dimmed">
											Catalog Items
										</Text>
									</div>
								</Grid.Col>
								<Grid.Col span={{ base: SIX, sm: THREE }}>
									<div style={{ textAlign: "center" }}>
										<Title order={THREE} size={32} c="green">
											{stats?.sourceCoverage?.withBoth || ZERO}
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
				<Title order={TWO} mb="lg" ta="center">
					Explore by Category
				</Title>
				<SimpleGrid cols={{ base: ONE, sm: TWO, lg: THREE }} spacing="lg" mb="3rem">
					{hobbyTypes.map((type) => (
						<Card
							key={type.id}
							className={hobbyTypeCard}
							p="xl"
							radius="md"
							withBorder={true}
							shadow="sm"
							h="HUNDRED%"
							onClick={() => { handleHobbyTypeSelect(type.id); }}
							style={{ cursor: "pointer" }}
							component="button"
							type="button"
						>
							<Stack h="HUNDRED%" align="center" justify="space-between">
								<div style={{ textAlign: "center" }}>
									<Center mb="md">
										<type.icon size={48} color={`var(--mantine-color-${type.color})`} />
									</Center>
									<Title order={THREE} mb="xs" c={type.color}>
										{type.name}
									</Title>
									<Text color="dimmed" size="sm" mb="md">
										{type.description}
									</Text>
								</div>

								<div style={{ width: "HUNDRED%" }}>
									<Group justify="center" mb="sm">
										<Badge color={type.color} variant="light" size="lg">
											{type.count.toLocaleString()} items
										</Badge>
									</Group>

									{/* Features list */}
									{type.features.length > ZERO && (
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
				<Title order={TWO} mb="lg" ta="center">
					Quick Filters
				</Title>
				<Paper p="lg" radius="md" withBorder={true} mb="3rem">
					<SimpleGrid cols={{ base: TWO, sm: THREE, md: SIX }} spacing="md">
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
				<Title order={TWO} mb="lg" ta="center">
					Featured Collections
				</Title>

				<Grid mb="3rem">
					{/* Recent Additions */}
					<Grid.Col span={{ base: 12, md: SIX }}>
						<Card className={featuredSection} p="lg" radius="md" withBorder={true} h="HUNDRED%">
							<Group justify="space-between" mb="md">
								<Title order={FOUR}>Recent Additions</Title>
								<IconClock size={18} color="var(--mantine-color-dimmed)" />
							</Group>

							{recentItems.length > ZERO ? (
								<Stack gap="sm">
									{recentItems.slice(ARRAY_FIRST_INDEX, FOUR).map((item) => (
										<Card key={item.id} p="sm" radius="sm" withBorder={true} bg="var(--mantine-color-body)">
											<Group justify="space-between" align="center">
												<div style={{ flex: ONE, minWidth: ZERO }}>
													<Text size="sm" fw={500} truncate={true}>
														{item.properties?.name?.en || item.properties?.name?.ja || "Unknown"}
													</Text>
													{item.properties?.grade && (
														<Badge size="xs" variant="light" mt="TWO">
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
								w="HUNDRED%"
								mt="md"
								onClick={() => navigate({ to: "/database/gunpla", search: { recent: "true" } })}
							>
								View All Recent
							</Button>
						</Card>
					</Grid.Col>

					{/* Popular Items */}
					<Grid.Col span={{ base: 12, md: SIX }}>
						<Card className={featuredSection} p="lg" radius="md" withBorder={true} h="HUNDRED%">
							<Group justify="space-between" mb="md">
								<Title order={FOUR}>Popular Items</Title>
								<IconTrendingUp size={18} color="var(--mantine-color-dimmed)" />
							</Group>

							{popularItems.length > ZERO ? (
								<Stack gap="sm">
									{popularItems.slice(ARRAY_FIRST_INDEX, FOUR).map((item) => (
										<Card key={item.id} p="sm" radius="sm" withBorder={true} bg="var(--mantine-color-body)">
											<Group justify="space-between" align="center">
												<div style={{ flex: ONE, minWidth: ZERO }}>
													<Text size="sm" fw={500} truncate={true}>
														{item.data?.properties?.name?.en || item.data?.properties?.name?.ja || "Unknown"}
													</Text>
													<Badge size="xs" variant="light" color="yellow" mt="TWO">
														Popular
													</Badge>
												</div>
												<Group gap="xs">
													<IconStar size={14} color="var(--mantine-color-yellow)" />
													<Text size="xs" color="dimmed">
														{(item.score * FIVE).toFixed(ONE))}
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
								w="HUNDRED%"
								mt="md"
								onClick={() => navigate({ to: "/database/gunpla", search: { popular: "true" } })}
							>
								View All Popular
							</Button>
						</Card>
					</Grid.Col>
				</Grid>

				{/* Data Sources Overview */}
				<Title order={TWO} mb="lg" ta="center">
					Data Sources
				</Title>
				<Paper p="xl" radius="md" withBorder={true}>
					<Grid>
						<Grid.Col span={{ base: 12, sm: FOUR }}>
							<Card p="md" radius="sm" withBorder={true} bg="var(--mantine-color-blue-light)">
								<Group align="center" mb="sm">
									<IconDatabase size={24} color="var(--mantine-color-blue)" />
									<Title order={FIVE}>Unified Database</Title>
								</Group>
								<Text size="sm" color="dimmed" mb="sm">
									Merged and cross-referenced data from multiple sources
								</Text>
								<Badge color="blue" variant="light">
									{stats?.totalItems?.unified || ZERO} items
								</Badge>
							</Card>
						</Grid.Col>

						<Grid.Col span={{ base: 12, sm: FOUR }}>
							<Card p="md" radius="sm" withBorder={true} bg="var(--mantine-color-red-light)">
								<Group align="center" mb="sm">
									<IconBook size={24} color="var(--mantine-color-red)" />
									<Title order={FIVE}>Manual Library</Title>
								</Group>
								<Text size="sm" color="dimmed" mb="sm">
									Construction manuals and building guides
								</Text>
								<Badge color="red" variant="light">
									{stats?.totalItems?.manual || ZERO} manuals
								</Badge>
							</Card>
						</Grid.Col>

						<Grid.Col span={{ base: 12, sm: FOUR }}>
							<Card p="md" radius="sm" withBorder={true} bg="var(--mantine-color-gray-light)">
								<Group align="center" mb="sm">
									<IconPhoto size={24} color="var(--mantine-color-gray)" />
									<Title order={FIVE}>Product Catalog</Title>
								</Group>
								<Text size="sm" color="dimmed" mb="sm">
									Official product information and specifications
								</Text>
								<Badge color="gray" variant="light">
									{stats?.totalItems?.catalog || ZERO} products
								</Badge>
							</Card>
						</Grid.Col>
					</Grid>
				</Paper>
			</Container>
		</div>
	);
}