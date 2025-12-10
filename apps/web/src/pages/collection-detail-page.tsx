import { Container, Title, Text, Card, Button, Group, Stack, SimpleGrid, Badge, ActionIcon, Skeleton, Alert, Select, TextInput, Menu } from "@mantine/core";
import { IconPlus, IconSearch, IconPackage, IconEdit, IconTrash, IconFilter, IconDots, IconPhoto } from "@tabler/icons-react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";

import { collectionService } from "../services/collectionService";
import { Collection, UniversalItem, ItemStatus } from "../types/hobby";


// Constants for magic numbers
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;
const FOUR = 4;
const FIVE = 5;
const SIX = 6;
const SEVEN = 7;
const EIGHT = 8;
const NINE = 9;
const TEN = 10;
const HUNDRED = 100;
const THOUSAND = 1000;
const JSON_INDENTATION = TWO;
const PERCENTAGE_MULTIPLIER = HUNDRED;
const ARRAY_FIRST_INDEX = ZERO;
const ARRAY_SECOND_INDEX = ONE;
const ARRAY_THIRD_INDEX = TWO;

interface CollectionDetailPageProps {}

const statusOptions = [
	{ value: "", label: "All Status" },
	{ value: "wanted", label: "Wanted" },
	{ value: "ordered", label: "Ordered" },
	{ value: "owned", label: "Owned" },
	{ value: "building", label: "Building" },
	{ value: "completed", label: "Completed" },
	{ value: "for_sale", label: "For Sale" },
	{ value: "traded", label: "Traded" },
	{ value: "lost", label: "Lost" },
	{ value: "archived", label: "Archived" },
];

const statusColors: Record<ItemStatus, string> = {
	wanted: "blue",
	ordered: "yellow",
	owned: "green",
	building: "orange",
	completed: "cyan",
	for_sale: "red",
	traded: "purple",
	lost: "gray",
	archived: "dark",
};

/**
 * Collection detail page showing all items in a specific collection
 */
export function CollectionDetailPage({}: CollectionDetailPageProps): React.ReactElement {
	const { hobbyType, collectionId } = useParams({ from: "/collection/$hobbyType/$collectionId" });
	const navigate = useNavigate();

	const [collection, setCollection] = useState<Collection | null>(null);
	const [items, setItems] = useState<UniversalItem[]>([]);
	const [filteredItems, setFilteredItems] = useState<UniversalItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");

	const hobbyTypeConfig = {
		model_kits: { name: "Model Kits", icon: "🤖", color: "blue" },
		trading_cards: { name: "Trading Cards", icon: "🃏", color: "purple" },
		miniatures: { name: "Miniatures", icon: "🎭", color: "red" },
		other: { name: "Other", icon: "📦", color: "gray" },
	};

	const config = hobbyTypeConfig[hobbyType as keyof typeof hobbyTypeConfig] || { name: "Unknown", icon: "❓", color: "gray" };

	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true);
				setError(null);

				// Load collection details
				const collectionData = await collectionService.getCollection(collectionId);
				if (!collectionData) {
					setError("Collection not found");
					return;
				}
				setCollection(collectionData);

				// Load items for this collection
				const itemsData = await collectionService.getItems(hobbyType, collectionId);
				setItems(itemsData);
				setFilteredItems(itemsData);
			} catch (error_) {
				console.error("Failed to load collection data:", error_);
				setError("Failed to load collection. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, [hobbyType, collectionId]);

	useEffect(() => {
		// Apply filters
		let filtered = items;

		// Search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(item =>
				String(item.data["name"] as string).toLowerCase().includes(query) ||
				item.tags.some(tag => tag.toLowerCase().includes(query)),
			);
		}

		// Status filter
		if (statusFilter) {
			filtered = filtered.filter(item => item.status === statusFilter);
		}

		setFilteredItems(filtered);
	}, [items, searchQuery, statusFilter]);

	const handleAddItem = () => {
		navigate({
			to: "/collection/$hobbyType/item/new",
			params: { hobbyType, itemId: "new" },
		});
	};

	const handleEditItem = (itemId: string) => {
		navigate({
			to: "/collection/$hobbyType/item/$itemId",
			params: { hobbyType, itemId },
		});
	};

	const handleDeleteItem = async (itemId: string) => {
		if (!confirm("Are you sure you want to delete this item?")) {
			return;
		}

		try {
			await collectionService.deleteItem(itemId);
			setItems(prev => prev.filter(item => item.id !== itemId));
		} catch (error_) {
			console.error("Failed to delete item:", error_);
			setError("Failed to delete item. Please try again.");
		}
	};

	const handleStatusUpdate = async (itemId: string, newStatus: ItemStatus) => {
		try {
			await collectionService.updateItem(itemId, { status: newStatus });
			setItems(prev => prev.map(item =>
				item.id === itemId ? { ...item, status: newStatus } : item,
			));
		} catch (error_) {
			console.error("Failed to update item status:", error_);
		}
	};

	if (loading) {
		return (
			<Container size="lg" py="xl">
				<Stack gap="xl">
					<Skeleton height={48} width={400} />
					<Card p="lg" radius="lg" withBorder={true}>
						<Stack gap="md">
							<Skeleton height={32} width={200} />
							<SimpleGrid cols={{ base: ONE, sm: TWO, lg: THREE }} spacing="lg">
								{[ONE, TWO, THREE, FOUR, FIVE, SIX].map((i) => (
									<Skeleton key={i} height={200} radius="md" />
								))}
							</SimpleGrid>
						</Stack>
					</Card>
				</Stack>
			</Container>
		);
	}

	if (error || !collection) {
		return (
			<Container size="lg" py="xl">
				<Alert color="red" title="Error">
					{error || "Collection not found"}
				</Alert>
			</Container>
		);
	}

	return (
		<>
			{/* Header Section */}
			<Container size="lg" py="xl">
				<Group justify="space-between" align="center" mb="xl">
					<Stack gap="xs">
						<Group gap="sm">
							<Button
								variant="subtle"
								component={Link}
								to="/collection"
								size="sm"
							>
								← Back to Collections
							</Button>
						</Group>
						<Title order={ONE} size={36}>
							{collection.name}
						</Title>
						<Text size="lg" color="dimmed">
							{collection.description}
						</Text>
						<Group gap="md">
							<Badge variant="outline" size="sm">
								{config.icon} {config.name}
							</Badge>
							<Badge variant="light" color="blue" size="sm">
								{collection.statistics.totalItems} Items
							</Badge>
							{collection.isPublic && (
								<Badge variant="light" color="green" size="sm">
									Public
								</Badge>
							)}
						</Group>
					</Stack>

					<Group>
						<Button
							onClick={handleAddItem}
							leftSection={<IconPlus size={16} />}
							color={config.color}
						>
							Add Item
						</Button>
					</Group>
				</Group>
			</Container>

			<Container size="lg" pb="xl">
				<Card p="lg" radius="lg" withBorder={true}>
					<Stack gap="md">
						{/* Search and Filters */}
						<Group>
							<TextInput
								placeholder="Search items..."
								leftSection={<IconSearch size={16} />}
								value={searchQuery}
								onChange={(e) => { setSearchQuery(e.target.value); }}
								style={{ flex: ONE }}
							/>
							<Select
								data={statusOptions}
								value={statusFilter}
								onChange={(value) => { setStatusFilter(value || ""); }}
								placeholder="Filter by status"
								leftSection={<IconFilter size={16} />}
								w={200}
								clearable={true}
							/>
						</Group>

						{/* Results Summary */}
						<Group justify="space-between">
							<Text size="sm" color="dimmed">
								Showing {filteredItems.length} of {items.length} items
							</Text>
						</Group>

						{/* Items Grid */}
						{filteredItems.length === ZERO ? (
							/* Empty State */
							<Stack align="center" gap="lg" mih={300}>
								<IconPackage size={48} color="gray" />
								<Title order={THREE} ta="center">
									{items.length === ZERO ? "No Items Yet" : "No Matching Items"}
								</Title>
								<Text color="dimmed" ta="center" maw={400}>
									{items.length === ZERO
										? "Start building your collection by adding your first item."
										: "Try adjusting your search or filters to find what you're looking for."
									}
								</Text>
								{items.length === ZERO && (
									<Button
										onClick={handleAddItem}
										leftSection={<IconPlus size={16} />}
										color={config.color}
									>
										Add Your First Item
									</Button>
								)}
							</Stack>
						) : (
							<SimpleGrid cols={{ base: ONE, sm: TWO, lg: THREE }} spacing="lg">
								{filteredItems.map((item) => (
									<Card
										key={item.id}
										p="lg"
										radius="md"
										shadow="sm"
										withBorder={true}
										style={{
											transition: "all ZERO.2s ease",
										}}
									>
										<Stack gap="md" h="HUNDRED%">
											{/* Item Header */}
											<Group justify="space-between" align="flex-start">
												<Stack gap="xs" style={{ flex: ONE }}>
													<Title order={FOUR} size={16} lineClamp={ONE}>
														{String(item.data["name"] as string) || "Untitled Item"}
													</Title>
													{(item.data["brand"] != null) && (
														<Text size="sm" color="dimmed">
															{String(item.data["brand"] as string)}
														</Text>
													)}
												</Stack>

												<Menu shadow="md" width={160}>
													<Menu.Target>
														<ActionIcon variant="subtle">
															<IconDots size={16} />
														</ActionIcon>
													</Menu.Target>

													<Menu.Dropdown>
														<Menu.Item
															leftSection={<IconEdit size={14} />}
															onClick={() => { handleEditItem(item.id); }}
														>
															Edit
														</Menu.Item>
														<Menu.Item
															leftSection={<IconTrash size={14} />}
															color="red"
															onClick={() => handleDeleteItem(item.id)}
														>
															Delete
														</Menu.Item>
													</Menu.Dropdown>
												</Menu>
											</Group>

											{/* Item Image */}
											{item.images && item.images.length > ZERO ? (
												<div
													style={{
														width: "HUNDRED%",
														height: 120,
														background: `url(${item.images[ARRAY_FIRST_INDEX].url}) center/cover`,
														borderRadius: "8px",
													}}
												/>
											) : (
												<div
													style={{
														width: "HUNDRED%",
														height: 120,
														background: "#f5f5f5",
														borderRadius: "8px",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
													}}
												>
													<IconPhoto size={32} color="#ccc" />
												</div>
											)}

											{/* Item Details */}
											{(item.data["grade"] != null) && (
												<Badge variant="outline" size="xs">
													{String(item.data["grade"] as string)}
												</Badge>
											)}

											{(item.data["scale"] != null) && (
												<Text size="xs" color="dimmed">
													Scale: {String(item.data["scale"] as string)}
												</Text>
											)}

											{/* Item Tags */}
											{item.tags.length > ZERO && (
												<Group gap="xs" wrap="wrap">
													{item.tags.slice(ARRAY_FIRST_INDEX, TWO).map((tag) => (
														<Badge key={tag} variant="light" size="xs">
															{tag}
														</Badge>
													))}
													{item.tags.length > TWO && (
														<Badge variant="light" size="xs">
															+{item.tags.length - TWO}
														</Badge>
													)}
												</Group>
											)}

											{/* Status */}
											<Group justify="space-between" mt="auto">
												<Select
													data={statusOptions.slice(ARRAY_SECOND_INDEX)} // Remove "All Status" option
													value={item.status}
													onChange={(value) => value && handleStatusUpdate(item.id, value as ItemStatus)}
													size="xs"
													w={120}
												/>
												<Badge variant="light" color={statusColors[item.status]} size="xs">
													{item.status.replace("_", " ")}
												</Badge>
											</Group>
										</Stack>
									</Card>
								))}
							</SimpleGrid>
						)}
					</Stack>
				</Card>
			</Container>
		</>
	);
}