"use client";

import {
	ActionIcon,
	Anchor,
	Box,
	Breadcrumbs,
	Button,
	Card,
	Container,
	Group,
	Menu,
	Modal,
	SimpleGrid,
	Skeleton,
	Stack,
	Text,
	Textarea,
	TextInput,
	Title,
} from "@mantine/core";
import {
	IconBox,
	IconChartBar,
	IconDots,
	IconDownload,
	IconEdit,
	IconFilter,
	IconFolder,
	IconHome,
	IconPlus,
	IconTrash,
	IconTrendingUp,
} from "@tabler/icons-react";
import Link from "next/link";
import React from "react";


import { useCollection } from "@/contexts/collection-context";
import { CSS, TYPOGRAPHY, UI } from "@/lib/constants";
import {
  collectionCard,
  collectionContent,
  collectionHeader,
  statsGrid,
  statCard,
  statValue,
  statLabel,
  progressBar,
  progressFill,
  progressSegments,
  progressSegment,
  databaseStatIcon,
} from "@/styles/components.css";

// Collection card type
interface CollectionCardType {
  id: string;
  name: string;
  description?: string;
  itemCount?: number;
  completedCount?: number;
  wantedCount?: number;
  totalValue?: number;
  completionPercentage?: number;
  inProgressCount?: number;
  lastModified: string;
}

// Collection card component
function CollectionCard({ collection, onEdit, onDelete }: {
  collection: CollectionCardType;
  onEdit: (collection: CollectionCardType) => void;
  onDelete: (collection: CollectionCardType) => void;
}) {
	return (
		<Card
			p="lg"
			radius="md"
			className={collectionCard}
			withBorder={true}
		>
			<Group justify="space-between" mb="md">
				<Group>
					<div className={collectionHeader} style={{
						backgroundColor: "var(--mantine-color-blue-6)",
						width: 48,
						height: 48,
						borderRadius: "var(--mantine-radius-md)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "white",
					}}>
						<IconFolder size={UI.ICON_SIZE_XL} />
					</div>
					<Box>
						<Text fw={TYPOGRAPHY.FONT_WEIGHT_MEDIUM} size="lg">
							{collection.name}
						</Text>
						{collection.description && (
							<Text size="sm" c="dimmed" lineClamp={1}>
								{collection.description}
							</Text>
						)}
					</Box>
				</Group>

				<Menu shadow="md" width={200}>
					<Menu.Target>
						<ActionIcon variant="subtle" color="gray">
							<IconDots size={UI.ICON_SIZE_SM} />
						</ActionIcon>
					</Menu.Target>

					<Menu.Dropdown>
						<Menu.Item leftSection={<IconEdit size={UI.ICON_SIZE_SM} />} onClick={() => { onEdit(collection); }}>
              Edit Collection
						</Menu.Item>
						<Menu.Item leftSection={<IconDownload size={UI.ICON_SIZE_SM} />}>
              Export
						</Menu.Item>
						<Menu.Divider />
						<Menu.Item
							leftSection={<IconTrash size={UI.ICON_SIZE_SM} />}
							color="red"
							onClick={() => { onDelete(collection); }}
						>
              Delete Collection
						</Menu.Item>
					</Menu.Dropdown>
				</Menu>
			</Group>

			<Box className={collectionContent}>
				<div className={statsGrid}>
					<div className={statCard}>
						<Text className={statValue}>{collection.itemCount || 0}</Text>
						<Text className={statLabel}>Items</Text>
					</div>
					<div className={statCard}>
						<Text className={statValue}>{collection.completedCount || 0}</Text>
						<Text className={statLabel}>Completed</Text>
					</div>
					<div className={statCard}>
						<Text className={statValue}>{collection.wantedCount || 0}</Text>
						<Text className={statLabel}>Wanted</Text>
					</div>
					<div className={statCard}>
						<Text className={statValue}>{collection.totalValue || 0}</Text>
						<Text className={statLabel}>Total Value</Text>
					</div>
				</div>

				<Box mt="md">
					<Text size="sm" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL} mb="xs">Completion Progress</Text>
					<div className={progressBar}>
						<div
							className={progressFill}
							style={{
								width: `${collection.completionPercentage || 0}%`,
								backgroundColor: "var(--mantine-color-blue-6)",
							}}
						/>
						<div className={progressSegments}>
							<div
								className={progressSegment}
								style={{
									width: `${(collection.completedCount || 0) / (collection.itemCount || 1) * 100}%`,
									backgroundColor: "var(--mantine-color-green-6)",
								}}
							/>
							<div
								className={progressSegment}
								style={{
									width: `${(collection.inProgressCount || 0) / (collection.itemCount || 1) * 100}%`,
									backgroundColor: "var(--mantine-color-orange-6)",
								}}
							/>
						</div>
					</div>
					<Text size="xs" c="dimmed" mt="xs">
						{collection.completionPercentage || 0}% Complete
					</Text>
				</Box>

				<Group mt="md" justify="space-between">
					<Text size="sm" c="dimmed">
            Updated {new Date(collection.lastModified).toLocaleDateString()}
					</Text>
					<Button
						component={Link}
						href={`/collection/${collection.id}`}
						variant="light"
						size="sm"
					>
            View Collection
					</Button>
				</Group>
			</Box>
		</Card>
	);
}

// Quick stats component
function QuickStats({ state }: { state: any }) {
	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Title order={3} mb="md">
        Quick Stats
			</Title>
			<SimpleGrid
				cols={{ base: 1, sm: 2, lg: 4 }}
				spacing="md"
			>
				<div className={statCard}>
					<Group>
						<div className={databaseStatIcon}>
							<IconFolder size={UI.ICON_SIZE_LG} />
						</div>
						<div>
							<Text size="xs" color="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
                Total Collections
							</Text>
							<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
								{state.collections.length}
							</Text>
						</div>
					</Group>
				</div>

				<div className={statCard}>
					<Group>
						<div className={databaseStatIcon}>
							<IconBox size={UI.ICON_SIZE_LG} />
						</div>
						<div>
							<Text size="xs" color="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
                Total Items
							</Text>
							<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
								{state.stats?.totalItems || 0}
							</Text>
						</div>
					</Group>
				</div>

				<div className={statCard}>
					<Group>
						<div className={databaseStatIcon}>
							<IconTrendingUp size={UI.ICON_SIZE_LG} />
						</div>
						<div>
							<Text size="xs" color="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
                Completed
							</Text>
							<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
								{state.stats?.statusBreakdown?.completed || 0}
							</Text>
						</div>
					</Group>
				</div>

				<div className={statCard}>
					<Group>
						<div className={databaseStatIcon}>
							<IconChartBar size={UI.ICON_SIZE_LG} />
						</div>
						<div>
							<Text size="xs" color="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
                Total Value
							</Text>
							<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
                ¥{(state.stats?.totalValue || 0).toLocaleString()}
							</Text>
						</div>
					</Group>
				</div>
			</SimpleGrid>
		</Card>
	);
}

// Loading skeleton
function LoadingSkeleton() {
	return (
		<>
			{Array.from({length: 3}).map((_, index) => (
				<Card key={index} p="lg" radius="md" withBorder={true}>
					<Group justify="space-between" mb="md">
						<Group>
							<Skeleton width={UI.AVATAR_SIZE} height={UI.AVATAR_SIZE} radius="md" />
							<Box>
								<Skeleton width={UI.SKELETON_HEIGHT_XXXL * 3} height={UI.SKELETON_HEIGHT_LARGE} mb="xs" />
								<Skeleton width={UI.SKELETON_HEIGHT_XXXL * 4} height={UI.SKELETON_HEIGHT_MEDIUM} />
							</Box>
						</Group>
						<Skeleton width={UI.SKELETON_HEIGHT_XXL + UI.SKELETON_HEIGHT_SMALL} height={UI.SKELETON_HEIGHT_XXL + UI.SKELETON_HEIGHT_SMALL} radius="sm" />
					</Group>

					<div className={statsGrid}>
						{Array.from({length: 4}).map((_, i) => (
							<div key={i} className={statCard}>
								<Skeleton width={UI.SKELETON_HEIGHT_XXXL + UI.SKELETON_HEIGHT_SMALL} height={UI.SKELETON_HEIGHT_XXL} mb="xs" />
								<Skeleton width={UI.SKELETON_HEIGHT_XXXL + UI.SKELETON_HEIGHT_MEDIUM} height={UI.SKELETON_HEIGHT_SMALL} />
							</div>
						))}
					</div>

					<Box mt="md">
						<Skeleton width={UI.SKELETON_HEIGHT_XXXL * 3} height={UI.SKELETON_HEIGHT_MEDIUM} mb="xs" />
						<Skeleton width={CSS.FULL_WIDTH} height={UI.SKELETON_HEIGHT_SMALL} mb="xs" />
						<Skeleton width={UI.SKELETON_HEIGHT_XXXL * 2} height={UI.SKELETON_HEIGHT_SMALL} />
					</Box>

					<Group mt="md" justify="space-between">
						<Skeleton width={UI.SKELETON_HEIGHT_XXXL * 3} height={UI.SKELETON_HEIGHT_SMALL} />
						<Skeleton width={UI.SKELETON_HEIGHT_XXXL * 2} height={UI.SKELETON_HEIGHT_XXXL + UI.SKELETON_HEIGHT_SMALL} radius="sm" />
					</Group>
				</Card>
			))}
		</>
	);
}

// Main collection page
export default function CollectionPage() {
	const { state, actions } = useCollection();
	const [createModalOpen, setCreateModalOpen] = React.useState(false);
	const [editModalOpen, setEditModalOpen] = React.useState(false);
	const [selectedCollection, setSelectedCollection] = React.useState<any>(null);
	const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
	const [formData, setFormData] = React.useState({
		name: "",
		description: "",
	});

	React.useEffect(() => {
		actions.loadCollections();
	}, []);

	const handleCreateCollection = async () => {
		try {
			await actions.createCollection(formData.name, formData.description);
			setCreateModalOpen(false);
			setFormData({ name: "", description: "" });
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("Failed to create collection:", errorMessage);
		}
	};

	const handleUpdateCollection = async () => {
		if (!selectedCollection) return;

		try {
			await actions.updateCollection(selectedCollection.id, formData);
			setEditModalOpen(false);
			setSelectedCollection(null);
			setFormData({ name: "", description: "" });
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("Failed to update collection:", errorMessage);
		}
	};

	const handleDeleteCollection = async () => {
		if (!selectedCollection) return;

		try {
			await actions.deleteCollection(selectedCollection.id);
			setDeleteModalOpen(false);
			setSelectedCollection(null);
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("Failed to delete collection:", errorMessage);
		}
	};

	const openEditModal = (collection: any) => {
		setSelectedCollection(collection);
		setFormData({
			name: collection.name,
			description: collection.description || "",
		});
		setEditModalOpen(true);
	};

	const openDeleteModal = (collection: any) => {
		setSelectedCollection(collection);
		setDeleteModalOpen(true);
	};

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Header */}
				<Box>
					<Group justify="space-between" align="flex-start">
						<Box>
							<Title order={1} mb="sm">
                My Collections
							</Title>
							<Text size="lg" color="dimmed">
                Manage and track your personal hobby collections
							</Text>
						</Box>
						<Button
							leftSection={<IconPlus size={UI.ICON_SIZE_SM} />}
							onClick={() => { setCreateModalOpen(true); }}
						>
              New Collection
						</Button>
					</Group>
				</Box>

				{/* Breadcrumbs */}
				<Breadcrumbs>
					<Anchor href="/" size="sm">
						<Group gap={4}>
							<IconHome size={UI.ICON_SIZE_SM} />
              Home
						</Group>
					</Anchor>
					<Anchor href="/database" size="sm">
            Database
					</Anchor>
					<Text size="sm">Collections</Text>
				</Breadcrumbs>

				{/* Quick Stats */}
				{!state.loading && <QuickStats state={state} />}

				{/* Collections Grid */}
				<Box>
					<Group justify="space-between" mb="md">
						<Title order={2}>
              Your Collections
						</Title>
						<Group>
							{state.collections.length > 0 && (
								<>
									<Button
										variant="light"
										leftSection={<IconFilter size={UI.ICON_SIZE_SM} />}
										size="sm"
									>
                    Filter
									</Button>
									<Button
										variant="light"
										leftSection={<IconDownload size={UI.ICON_SIZE_SM} />}
										size="sm"
									>
                    Export All
									</Button>
								</>
							)}
						</Group>
					</Group>

					{state.loading ? (
						<SimpleGrid
							cols={{ base: 1, sm: 2, lg: 3 }}
							spacing="lg"
						>
							<LoadingSkeleton />
						</SimpleGrid>
					) : state.collections.length > 0 ? (
						<SimpleGrid
							cols={{ base: 1, sm: 2, lg: 3 }}
							spacing="lg"
						>
							{state.collections.map((collection) => (
								<CollectionCard
									key={collection.id}
									collection={{
										...collection,
										lastModified: collection.modifiedAt?.toISOString() || new Date().toISOString(),
									}}
									onEdit={openEditModal}
									onDelete={openDeleteModal}
								/>
							))}
						</SimpleGrid>
					) : (
						<Box ta="center" py="xl">
							<IconFolder size={64} color="var(--mantine-color-gray-4)" />
							<Title order={3} mt="md" mb="sm">
                No Collections Yet
							</Title>
							<Text color="dimmed" mb="lg">
                Create your first collection to start tracking your hobby items
							</Text>
							<Button
								leftSection={<IconPlus size={UI.ICON_SIZE_SM} />}
								onClick={() => { setCreateModalOpen(true); }}
								size="lg"
							>
                Create Your First Collection
							</Button>
						</Box>
					)}
				</Box>

				{/* Create Collection Modal */}
				<Modal
					opened={createModalOpen}
					onClose={() => { setCreateModalOpen(false); }}
					title="Create New Collection"
					size="md"
				>
					<Stack gap="md">
						<TextInput
							label="Collection Name"
							placeholder="Enter collection name"
							value={formData.name}
							onChange={(e) => { setFormData({ ...formData, name: e.target.value }); }}
							required={true}
						/>
						<Textarea
							label="Description (Optional)"
							placeholder="Add a description for your collection"
							value={formData.description}
							onChange={(e) => { setFormData({ ...formData, description: e.target.value }); }}
							minRows={3}
						/>
						<Group justify="flex-end" gap="sm">
							<Button variant="light" onClick={() => { setCreateModalOpen(false); }}>
                Cancel
							</Button>
							<Button
								onClick={handleCreateCollection}
								disabled={!formData.name.trim()}
							>
                Create Collection
							</Button>
						</Group>
					</Stack>
				</Modal>

				{/* Edit Collection Modal */}
				<Modal
					opened={editModalOpen}
					onClose={() => { setEditModalOpen(false); }}
					title="Edit Collection"
					size="md"
				>
					<Stack gap="md">
						<TextInput
							label="Collection Name"
							placeholder="Enter collection name"
							value={formData.name}
							onChange={(e) => { setFormData({ ...formData, name: e.target.value }); }}
							required={true}
						/>
						<Textarea
							label="Description (Optional)"
							placeholder="Add a description for your collection"
							value={formData.description}
							onChange={(e) => { setFormData({ ...formData, description: e.target.value }); }}
							minRows={3}
						/>
						<Group justify="flex-end" gap="sm">
							<Button variant="light" onClick={() => { setEditModalOpen(false); }}>
                Cancel
							</Button>
							<Button
								onClick={handleUpdateCollection}
								disabled={!formData.name.trim()}
							>
                Update Collection
							</Button>
						</Group>
					</Stack>
				</Modal>

				{/* Delete Confirmation Modal */}
				<Modal
					opened={deleteModalOpen}
					onClose={() => { setDeleteModalOpen(false); }}
					title="Delete Collection"
					size="sm"
				>
					<Stack gap="md">
						<Text>
              Are you sure you want to delete "{selectedCollection?.name}"? This action cannot be undone.
						</Text>
						<Group justify="flex-end" gap="sm">
							<Button variant="light" onClick={() => { setDeleteModalOpen(false); }}>
                Cancel
							</Button>
							<Button color="red" onClick={handleDeleteCollection}>
                Delete Collection
							</Button>
						</Group>
					</Stack>
				</Modal>
			</Stack>
		</Container>
	);
}