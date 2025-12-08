import { Container, Title, Text, Card, Button, Group, Stack, SimpleGrid, Badge, ActionIcon, Skeleton, Alert } from "@mantine/core";
import { IconPlus, IconSearch, IconPackage, IconTrash, IconFolderOpen } from "@tabler/icons-react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";

import { collectionService } from "../services/collectionService";
import { Collection } from "../types/hobby";

/**
 * Collection page for a specific hobby type
 * Shows all collections and items for the selected hobby
 */
export function CollectionHobbyPage(): React.ReactElement {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const { hobbyType } = useParams({ from: "/collection/$hobbyType" });
	const navigate = useNavigate();

	// Type assertion for hobbyType since it comes from URL params
	const hobbyTypeStr = hobbyType as string;

	const [collections, setCollections] = useState<Collection[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Constants
	const SKELETON_COUNT = 3;
	const TAG_DISPLAY_LIMIT = 3;

	const hobbyTypeConfig = {
		model_kits: { name: "Model Kits", icon: "MK", color: "blue" },
		trading_cards: { name: "Trading Cards", icon: "TC", color: "purple" },
		miniatures: { name: "Miniatures", icon: "MI", color: "red" },
		other: { name: "Other", icon: "OT", color: "gray" },
	};

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	const config = hobbyTypeConfig[hobbyTypeStr as keyof typeof hobbyTypeConfig] || { name: "Unknown", icon: "??", color: "gray" };

	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true);
				setError(null);

				// Load collections for this hobby type
				const collectionsData = await collectionService.getCollections(hobbyTypeStr);
				setCollections(collectionsData);
			} catch (error_) {
				// eslint-disable-next-line no-console
				console.error("Failed to load collection data:", error_);
				setError("Failed to load collections. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		void loadData();
	}, [hobbyTypeStr]);

	const handleCreateCollection = async () => {
		try {
			const defaultCollection = {
				name: `My ${config.name} Collection`,
				description: `Personal collection of ${config.name.toLowerCase()}`,
				hobbyType: hobbyTypeStr,
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
			void navigate({
				to: "/collection/$hobbyType/$collectionId",
				params: { hobbyType: hobbyTypeStr, collectionId: newCollection.id },
			});
		} catch (error_) {
			// eslint-disable-next-line no-console
			console.error("Failed to create collection:", error_);
			setError("Failed to create collection. Please try again.");
		}
	};

	const handleDeleteCollection = async (collectionId: string) => {
		if (!globalThis.confirm("Are you sure you want to delete this collection? This action cannot be undone.")) {
			return;
		}

		try {
			await collectionService.deleteCollection(collectionId);
			setCollections(prev => prev.filter(c => c.id !== collectionId));
		} catch (error_) {
			// eslint-disable-next-line no-console
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
						{Array.from({ length: SKELETON_COUNT }, (_, i) => (
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
						<Text size="lg" c="dimmed">
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
							onClick={() => void handleCreateCollection()}
							leftSection={<IconPlus size={16} />}
							c={config.color}
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
							<Text c="dimmed" ta="center" maw={400}>
								Start organizing your {config.name.toLowerCase()} by creating your first collection. You can add items, track progress, and manage your inventory.
							</Text>
							<Button
								onClick={() => void handleCreateCollection()}
								leftSection={<IconPlus size={16} />}
								c={config.color}
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
												<IconFolderOpen size={16} c={config.color} />
												<Title order={4} size={18} lineClamp={1}>
													{collection.name}
												</Title>
											</Group>
											{collection.description && (
												<Text size="sm" c="dimmed" lineClamp={2}>
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
											<IconPackage size={16} c="gray" />
											<Text size="lg" fw={600}>
												{collection.statistics.totalItems}
											</Text>
											<Text size="xs" c="dimmed">
												Items
											</Text>
										</Stack>
									</Group>

									{/* Collection Tags */}
									{collection.tags.length > 0 && (
										<Group gap="xs">
											{collection.tags.slice(0, TAG_DISPLAY_LIMIT).map((tag) => (
												<Badge key={tag} variant="outline" size="xs">
													{tag}
												</Badge>
											))}
											{collection.tags.length > TAG_DISPLAY_LIMIT && (
												<Badge variant="outline" size="xs">
													+{collection.tags.length - TAG_DISPLAY_LIMIT}
												</Badge>
											)}
										</Group>
									)}

									{/* Actions */}
									<Group justify="space-between" mt="auto">
										<Button
											onClick={() => void navigate({
												to: "/collection/$hobbyType/$collectionId",
												params: { hobbyType: hobbyTypeStr, collectionId: collection.id },
											})}
											variant="outline"
											flex={1}
										>
											View Collection
										</Button>

										<ActionIcon
											variant="subtle"
											c="red"
											onClick={() => void handleDeleteCollection(collection.id)}
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