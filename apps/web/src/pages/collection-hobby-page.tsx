import { Container, Title, Text, Card, Button, Group, Stack, SimpleGrid, Grid, Center, Badge, ActionIcon, Skeleton, Alert } from "@mantine/core";
import { IconPlus, IconSearch, IconHeart, IconPackage, IconSettings, IconEdit, IconTrash, IconFolderOpen } from "@tabler/icons-react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";

import { collectionService } from "../services/collectionService";
import { Collection, HobbyType } from "../types/hobby";

interface CollectionHobbyPageProps {}

/**
 * Collection page for a specific hobby type
 * Shows all collections and items for the selected hobby
 */
export function CollectionHobbyPage({}: CollectionHobbyPageProps): React.ReactElement {
	const { hobbyType } = useParams({ from: "/collection/$hobbyType" });
	const navigate = useNavigate();

	const [collections, setCollections] = useState<Collection[]>([]);
	const [hobbyTypeInfo, setHobbyTypeInfo] = useState<HobbyType | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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

				// Load hobby type info
				const hobbyTypeData = await collectionService.getHobbyType(hobbyType);
				setHobbyTypeInfo(hobbyTypeData);

				// Load collections for this hobby type
				const collectionsData = await collectionService.getCollections(hobbyType);
				setCollections(collectionsData);
			} catch (error_) {
				console.error("Failed to load collection data:", error_);
				setError("Failed to load collections. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, [hobbyType]);

	const handleCreateCollection = async () => {
		try {
			const defaultCollection = {
				name: `My ${config.name} Collection`,
				description: `Personal collection of ${config.name.toLowerCase()}`,
				hobbyType,
				isPublic: false,
				isDefault: false,
				tags: [],
				settings: {
					allowPublicView: false,
					allowComments: false,
					allowRating: true,
					allowSharing: true,
					requireApproval: false,
					autoSync: true,
				},
			};

			const newCollection = await collectionService.createCollection(defaultCollection);
			navigate({
				to: "/collection/$hobbyType/$collectionId",
				params: { hobbyType, collectionId: newCollection.id },
			});
		} catch (error_) {
			console.error("Failed to create collection:", error_);
			setError("Failed to create collection. Please try again.");
		}
	};

	const handleDeleteCollection = async (collectionId: string) => {
		if (!confirm("Are you sure you want to delete this collection? This action cannot be undone.")) {
			return;
		}

		try {
			await collectionService.deleteCollection(collectionId);
			setCollections(prev => prev.filter(c => c.id !== collectionId));
		} catch (error_) {
			console.error("Failed to delete collection:", error_);
			setError("Failed to delete collection. Please try again.");
		}
	};

	if (loading) {
		return (
			<Container size="lg" py="xl">
				<Stack gap="xl">
					<Skeleton height={48} width={300} />
					<Skeleton height={200} radius="md" />
					<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} height={200} radius="md" />
						))}
					</SimpleGrid>
				</Stack>
			</Container>
		);
	}

	if (error) {
		return (
			<Container size="lg" py="xl">
				<Alert color="red" title="Error">
					{error}
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
							<Text size="xl">{config.icon}</Text>
							<Title order={1} size={36}>
								{config.name} Collections
							</Title>
						</Group>
						<Text size="lg" color="dimmed">
							Manage your {config.name.toLowerCase()} collections and items
						</Text>
					</Stack>

					<Group>
						<Button
							component={Link}
							to="/database"
							variant="outline"
							leftSection={<IconSearch size={16} />}
						>
							Browse Database
						</Button>
						<Button
							onClick={handleCreateCollection}
							leftSection={<IconPlus size={16} />}
							color={config.color}
						>
							New Collection
						</Button>
					</Group>
				</Group>
			</Container>

			<Container size="lg" pb="xl">
				{collections.length === 0 ? (
					/* Empty State */
					<Card p="xl" radius="lg" withBorder={true}>
						<Stack align="center" gap="lg" mih={300}>
							<Text size="xl">{config.icon}</Text>
							<Title order={3} ta="center">
								No {config.name} Collections Yet
							</Title>
							<Text color="dimmed" ta="center" maw={400}>
								Start organizing your {config.name.toLowerCase()} by creating your first collection. You can add items, track progress, and manage your inventory.
							</Text>
							<Button
								onClick={handleCreateCollection}
								leftSection={<IconPlus size={16} />}
								color={config.color}
								size="lg"
							>
								Create Your First Collection
							</Button>
						</Stack>
					</Card>
				) : (
					/* Collections Grid */
					<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
						{collections.map((collection) => (
							<Card
								key={collection.id}
								p="lg"
								radius="lg"
								shadow="sm"
								withBorder={true}
								style={{
									transition: "all 0.2s ease",
								}}
							>
								<Stack gap="md" h="100%">
									{/* Collection Header */}
									<Group justify="space-between" align="flex-start">
										<Stack gap="xs" style={{ flex: 1 }}>
											<Group gap="xs">
												<IconFolderOpen size={16} color={config.color} />
												<Title order={4} size={18} lineClamp={1}>
													{collection.name}
												</Title>
											</Group>
											{collection.description && (
												<Text size="sm" color="dimmed" lineClamp={2}>
													{collection.description}
												</Text>
											)}
										</Stack>

										<Group gap="xs">
											{collection.isDefault && (
												<Badge variant="light" color="blue" size="xs">
													Default
												</Badge>
											)}
											{collection.isPublic && (
												<Badge variant="light" color="green" size="xs">
													Public
												</Badge>
											)}
										</Group>
									</Group>

									{/* Collection Stats */}
									<Group>
										<Stack gap={0} align="center">
											<IconPackage size={16} color="gray" />
											<Text size="lg" fw={600}>
												{collection.statistics.totalItems}
											</Text>
											<Text size="xs" color="dimmed">
												Items
											</Text>
										</Stack>
									</Group>

									{/* Collection Tags */}
									{collection.tags.length > 0 && (
										<Group gap="xs">
											{collection.tags.slice(0, 3).map((tag) => (
												<Badge key={tag} variant="outline" size="xs">
													{tag}
												</Badge>
											))}
											{collection.tags.length > 3 && (
												<Badge variant="outline" size="xs">
													+{collection.tags.length - 3}
												</Badge>
											)}
										</Group>
									)}

									{/* Actions */}
									<Group justify="space-between" mt="auto">
										<Button
											onClick={() => navigate({
												to: "/collection/$hobbyType/$collectionId",
												params: { hobbyType, collectionId: collection.id },
											})}
											variant="outline"
											flex={1}
										>
											View Collection
										</Button>

										<ActionIcon
											variant="subtle"
											color="red"
											onClick={() => handleDeleteCollection(collection.id)}
										>
											<IconTrash size={16} />
										</ActionIcon>
									</Group>
								</Stack>
							</Card>
						))}
					</SimpleGrid>
				)}
			</Container>
		</>
	);
}