import { Container, Title, Text, Card, Button, Group, Stack, SimpleGrid, Grid, Center, Badge, ActionIcon, Skeleton, Alert, Select, TextInput, Menu } from "@mantine/core";
import { IconPlus, IconSearch, IconHeart, IconPackage, IconSettings, IconEdit, IconTrash, IconFilter, IconDots, IconPhoto, IconEye, IconShare } from "@tabler/icons-react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { collectionService } from "../services/collectionService";
import { Collection, UniversalItem, ItemStatus } from "../types/hobby";

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
			} catch (err) {
				console.error("Failed to load collection data:", err);
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
				item.data.name?.toLowerCase().includes(query) ||
				item.tags.some(tag => tag.toLowerCase().includes(query))
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
		} catch (err) {
			console.error("Failed to delete item:", err);
			setError("Failed to delete item. Please try again.");
		}
	};

	const handleStatusUpdate = async (itemId: string, newStatus: ItemStatus) => {
		try {
			await collectionService.updateItem(itemId, { status: newStatus });
			setItems(prev => prev.map(item =>
				item.id === itemId ? { ...item, status: newStatus } : item
			));
		} catch (err) {
			console.error("Failed to update item status:", err);
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
							<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
								{[1, 2, 3, 4, 5, 6].map((i) => (
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
						<Title order={1} size={36}>
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
								onChange={(e) => setSearchQuery(e.target.value)}
								style={{ flex: 1 }}
							/>
							<Select
								data={statusOptions}
								value={statusFilter}
								onChange={(value) => setStatusFilter(value || "")}
								placeholder="Filter by status"
								leftSection={<IconFilter size={16} />}
								w={200}
								clearable
							/>
						</Group>

						{/* Results Summary */}
						<Group justify="space-between">
							<Text size="sm" color="dimmed">
								Showing {filteredItems.length} of {items.length} items
							</Text>
						</Group>

						{/* Items Grid */}
						{filteredItems.length === 0 ? (
							/* Empty State */
							<Stack align="center" gap="lg" mih={300}>
								<IconPackage size={48} color="gray" />
								<Title order={3} ta="center">
									{items.length === 0 ? "No Items Yet" : "No Matching Items"}
								</Title>
								<Text color="dimmed" ta="center" maw={400}>
									{items.length === 0
										? "Start building your collection by adding your first item."
										: "Try adjusting your search or filters to find what you're looking for."
									}
								</Text>
								{items.length === 0 && (
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
							<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
								{filteredItems.map((item) => (
									<Card
										key={item.id}
										p="lg"
										radius="md"
										shadow="sm"
										withBorder={true}
										style={{
											transition: "all 0.2s ease",
										}}
									>
										<Stack gap="md" h="100%">
											{/* Item Header */}
											<Group justify="space-between" align="flex-start">
												<Stack gap="xs" style={{ flex: 1 }}>
													<Title order={4} size={16} lineClamp={1}>
														{item.data.name || "Untitled Item"}
													</Title>
													{item.data.brand && (
														<Text size="sm" color="dimmed">
															{item.data.brand}
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
															onClick={() => handleEditItem(item.id)}
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
											{item.images && item.images.length > 0 ? (
												<div
													style={{
														width: "100%",
														height: 120,
														background: `url(${item.images[0].url}) center/cover`,
														borderRadius: "8px",
													}}
												/>
											) : (
												<div
													style={{
														width: "100%",
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
											{item.data.grade && (
												<Badge variant="outline" size="xs">
													{item.data.grade}
												</Badge>
											)}

											{item.data.scale && (
												<Text size="xs" color="dimmed">
													Scale: {item.data.scale}
												</Text>
											)}

											{/* Item Tags */}
											{item.tags.length > 0 && (
												<Group gap="xs" wrap="wrap">
													{item.tags.slice(0, 2).map((tag) => (
														<Badge key={tag} variant="light" size="xs">
															{tag}
														</Badge>
													))}
													{item.tags.length > 2 && (
														<Badge variant="light" size="xs">
															+{item.tags.length - 2}
														</Badge>
													)}
												</Group>
											)}

											{/* Status */}
											<Group justify="space-between" mt="auto">
												<Select
													data={statusOptions.slice(1)} // Remove "All Status" option
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