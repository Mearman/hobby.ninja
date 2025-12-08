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
	Pagination,
	Select,
	Checkbox,
	Center,
	Breadcrumbs,
	Anchor,
} from "@mantine/core";
import { IconSearch, IconFilter, IconChevronRight, IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import React, { useState, useEffect, useCallback } from "react";

import { AdvancedFilters } from "../components/database/advanced-filters";
import { ItemCard } from "../components/database/ItemCard";
import { dataService, type FilterOptions } from "../services/dataService";
import { databaseContainer, heroSection, statsCard } from "../styles/styles.css";

const getItemType = (item: unknown): "unified" | "manual" | "catalog" => {
	if (!item || typeof item !== "object" || !("type" in item)) {
		return "unified";
	}

	const typedItem = item as { type: string };
	switch (typedItem.type) {
		case "unified_item": {
			return "unified";
		}
		case "manual_item": {
			return "manual";
		}
		case "catalog_item": {
			return "catalog";
		}
		default: {
			return "unified";
		}
	}
};

interface FilterState {
	grade?: string;
	series?: string;
	scale?: string;
	priceRange?: [number, number];
	availability?: string;
	features?: string[];
}

/**
 * Hobby-specific database browsing page
 */
export function DatabaseHobbyPage(): React.ReactElement {
	const { hobbyType } = useParams({ from: "/database/$hobbyType" });
	const navigate = useNavigate();

	// State management
	const [searchQuery, setSearchQuery] = useState("");
	const [filters, setFilters] = useState<FilterState>({});
	const [showFilters, setShowFilters] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [sortBy, setSortBy] = useState("name");
	const [items, setItems] = useState<any[]>([]);
	const [totalItems, setTotalItems] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Hobby type configuration
	const hobbyTypeConfig = {
		gunpla: {
			name: "Gunpla",
			description: "Gundam model kits and accessories",
			color: "gunplaBlue" as const,
			grades: ["HG", "RG", "MG", "PG", "EG", "SD", "RE/100"],
			series: ["Mobile Suit Gundam", "Wing", "Seed", "00", "Thunderbolt", "Iron-Blooded Orphans"],
		},
		"figure-rise": {
			name: "Figure-rise",
			description: "Anime character figures and statues",
			color: "gunplaRed" as const,
			grades: ["Standard", "Effect", "Mechanic", "Mega"],
			series: ["Dragon Ball", "One Piece", "Naruto", "My Hero Academia"],
		},
		"model-kits": {
			name: "Model Kits",
			description: "Other anime and sci-fi model kits",
			color: "gunplaGray" as const,
			grades: ["1/144", "1/100", "1/72", "1/48", "1/35"],
			series: ["Macross", "Patlabor", "Armored Core", "Votoms"],
		},
	};

	const config = hobbyTypeConfig[hobbyType as keyof typeof hobbyTypeConfig];

	// Redirect if invalid hobby type
	if (!config) {
		navigate({ to: "/database" });
		// Return loading state while redirecting
		return <Container>Loading...</Container>;
	}

	// Load items based on current state
	useEffect(() => {
		const loadItems = async () => {
			try {
				setIsLoading(true);
				setError(null);

				const searchParams = {
					page: currentPage,
					limit: 24,
					query: searchQuery,
					type: hobbyType,
					...filters,
					sortBy,
				};

				// Convert FilterState to FilterOptions
				const filterOptions: FilterOptions = {
					series: filters.series ? [filters.series] : undefined,
					grade: filters.grade ? [filters.grade] : undefined,
					scale: filters.scale ? [filters.scale] : undefined,
					availability: filters.availability ? [filters.availability as "available" | "discontinued" | "preorder"] : undefined,
				};

				const result = await dataService.searchItems(searchQuery, filterOptions, {
					page: currentPage,
					limit: 24,
					sortBy,
				});

				setItems(result.items || []);
				setTotalItems(result.total || 0);
			} catch (error_) {
				console.error("Failed to load items:", error_);
				setError("Failed to load items. Please try again.");
			} finally {
				setIsLoading(false);
			}
		};

		loadItems();
	}, [hobbyType, currentPage, searchQuery, filters, sortBy]);

	// Handle search
	const handleSearch = useCallback((query: string) => {
		setSearchQuery(query);
		setCurrentPage(1);
	}, []);

	// Handle filter changes
	const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
		setFilters((prev) => ({ ...prev, ...newFilters }));
		setCurrentPage(1);
	}, []);

	// Clear filters
	const clearFilters = useCallback(() => {
		setFilters({});
		setCurrentPage(1);
	}, []);

	// Breadcrumb items
	const breadcrumbItems = [
		{ title: "Home", href: "/" },
		{ title: "Database", href: "/database" },
		{ title: config.name },
	].map((item, index) => (
		<Anchor key={index} href={item.href} component={Link}>
			{item.title}
		</Anchor>
	));

	// Render loading state
	if (isLoading && currentPage === 1) {
		return (
			<div className={databaseContainer}>
				<Container size="lg">
					<Center h="50vh">
						<Stack align="center">
							<Loader size="xl" />
							<Text size="lg" color="dimmed">
								Loading {config.name} database...
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
							<Button variant="outline" onClick={() => { globalThis.location.reload(); }} mt="md">
								Try Again
							</Button>
						</Alert>
					</Center>
				</Container>
			</div>
		);
	}

	const totalPages = Math.ceil(totalItems / 24);

	return (
		<div className={databaseContainer}>
			{/* Header section */}
			<div className={heroSection}>
				<Container size="lg">
					<Paper p="xl" radius="lg" withBorder={true} bg="var(--mantine-color-body)">
						<Breadcrumbs mb="md">
							{breadcrumbItems}
						</Breadcrumbs>

						<Title order={1} size={36} mb="sm" c={config.color}>
							{config.name}
						</Title>
						<Text size="lg" color="dimmed" mb="xl">
							{config.description} • {totalItems.toLocaleString()} items
						</Text>

						{/* Search and filters */}
						<Group mb="md">
							<TextInput
								placeholder={`Search ${config.name.toLowerCase()}...`}
								leftSection={<IconSearch size={16} />}
								value={searchQuery}
								onChange={(event) => { handleSearch(event.currentTarget.value); }}
								style={{ flex: 1, maxWidth: 400 }}
							/>

							<Select
								placeholder="Sort by"
								value={sortBy}
								onChange={(value) => { setSortBy(value || "name"); }}
								data={[
									{ value: "name", label: "Name" },
									{ value: "grade", label: "Grade" },
									{ value: "release_date", label: "Release Date" },
									{ value: "price", label: "Price" },
									{ value: "popularity", label: "Popularity" },
								]}
								w={150}
							/>

							<Button
								variant="outline"
								leftSection={<IconAdjustmentsHorizontal size={16} />}
								onClick={() => { setShowFilters(!showFilters); }}
							>
								Filters
								{Object.keys(filters).length > 0 && (
									<Badge size="xs" color={config.color} ml="xs">
										{Object.keys(filters).length}
									</Badge>
								)}
							</Button>
						</Group>

						{/* Active filters */}
						{Object.keys(filters).length > 0 && (
							<Group mb="md">
								<Text size="sm" color="dimmed">
									Active filters:
								</Text>
								{Object.entries(filters).map(([key, value]) => (
									<Badge
										key={key}
										color={config.color}
										variant="light"
										size="sm"
									>
										{key}: {Array.isArray(value) ? value.join(", ") : value}
									</Badge>
								))}
								<Button
									variant="subtle"
									size="xs"
									onClick={clearFilters}
								>
									Clear all
								</Button>
							</Group>
						)}
					</Paper>
				</Container>
			</div>

			<Container size="lg">
				{/* Advanced filters panel */}
				{showFilters && (
					<Paper p="lg" radius="md" withBorder={true} mb="xl">
						<AdvancedFilters
							opened={showFilters}
							onClose={() => { setShowFilters(false); }}
							onApply={() => { /* Apply logic handled by onFiltersChange */ }}
							filters={{
								series: filters.series ? [filters.series] : undefined,
								grade: filters.grade ? [filters.grade] : undefined,
								scale: filters.scale ? [filters.scale] : undefined,
								priceRange: filters.priceRange ? { min: filters.priceRange[0], max: filters.priceRange[1] } : undefined,
								availability: filters.availability ? [filters.availability as "available" | "discontinued" | "preorder"] : undefined,
							}}
							onFiltersChange={(newFilters: any) => {
								handleFilterChange({
									series: newFilters.series?.[0],
									grade: newFilters.grade?.[0],
									scale: newFilters.scale?.[0],
									priceRange: newFilters.priceRange,
									availability: newFilters.availability?.[0],
								});
							}}
						/>
					</Paper>
				)}

				{/* Results summary */}
				<Group justify="space-between" mb="lg">
					<Text size="sm" color="dimmed">
						Showing {items.length} of {totalItems.toLocaleString()} items
					</Text>

					{totalPages > 1 && (
						<Pagination
							total={totalPages}
							value={currentPage}
							onChange={setCurrentPage}
							boundaries={1}
							siblings={1}
						/>
					)}
				</Group>

				{/* Items grid */}
				{items.length > 0 ? (
					<SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="lg" mb="xl">
						{items.map((item) => (
							<Card
								key={item.id}
								shadow="sm"
								p="md"
								radius="md"
								component="button"
								onClick={() =>
									navigate({
										to: "/database/$hobbyType/$id",
										params: { hobbyType, id: item.id },
									})
								}
								style={{ cursor: "pointer" }}
							>
								<ItemCard
									item={item}
									itemType={getItemType(item)}
								/>
							</Card>
						))}
					</SimpleGrid>
				) : (
					<Paper p="xl" radius="md" withBorder={true} mb="xl">
						<Text ta="center" color="dimmed" size="lg">
							No items found matching your criteria.
						</Text>
						<Text ta="center" color="dimmed" mt="sm">
							Try adjusting your search or filters.
						</Text>
						<Button
							variant="outline"
							onClick={clearFilters}
							mt="md"
							mx="auto"
						>
							Clear Filters
						</Button>
					</Paper>
				)}

				{/* Pagination at bottom */}
				{totalPages > 1 && (
					<Group justify="center" mb="xl">
						<Pagination
							total={totalPages}
							value={currentPage}
							onChange={setCurrentPage}
							boundaries={2}
							siblings={2}
							size="lg"
						/>
					</Group>
				)}
			</Container>
		</div>
	);
}