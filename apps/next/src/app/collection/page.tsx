"use client";

import {
	ActionIcon,
	Anchor,
	Avatar,
	Badge,
	Box,
	Breadcrumbs,
	Button,
	Card,
	Container,
	Divider,
	Drawer,
	Group,
	Menu,
	Modal,
	Radio,
	Select,
	SimpleGrid,
	Skeleton,
	Stack,
	Text,
	Textarea,
	TextInput,
	Title,
	Tooltip,
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
	IconSearch,
	IconSortAscending,
	IconTrash,
	IconTrendingUp,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useMemo } from "react";

import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import type { CollectionState } from "@/contexts/collection-context";
import { useCollection } from "@/contexts/collection-context";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import type { Collection } from "@/lib/collection-storage";
import { CSS, TYPOGRAPHY, UI } from "@/lib/constants";
import {
	collectionCard,
	collectionContent,
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

// Collection color helper function
function getCollectionColor(index: number) {
	const colors = ["blue", "green", "red", "orange", "purple", "teal", "pink", "indigo"];
	return colors[index % colors.length];
}

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

// Collection card component for grid view
function CollectionCardGrid({ collection, onEdit, onDelete }: {
	collection: CollectionCardType;
	onEdit: (collection: CollectionCardType) => void;
	onDelete: (collection: CollectionCardType) => void;
}) {
	const collectionColor = getCollectionColor(Number.parseInt(collection.id) || 0);

	return (
		<Card
			p="lg"
			radius="md"
			className={collectionCard}
			withBorder={true}
			shadow="sm"
			style={{
				transition: "all 0.2s ease",
				cursor: "pointer",
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.transform = "translateY(-2px)";
				e.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.transform = "translateY(0)";
				e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
			}}
		>
			<Group justify="space-between" mb="md">
				<Group>
					<Avatar
						size={48}
						radius="md"
						bg={`var(--mantine-color-${collectionColor}-6)`}
						color="white"
					>
						<IconFolder size={UI.ICON_SIZE_XL} />
					</Avatar>
					<Box style={{ flex: 1 }}>
						<Text fw={TYPOGRAPHY.FONT_WEIGHT_MEDIUM} size="lg" lineClamp={1}>
							{collection.name}
						</Text>
						{collection.description && (
							<Text size="sm" c="dimmed" lineClamp={2}>
								{collection.description}
							</Text>
						)}
					</Box>
				</Group>

				<Menu shadow="md" width={200} position="bottom-end">
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
						<Text className={statValue}>{collection.itemCount ?? 0}</Text>
						<Text className={statLabel}>Items</Text>
					</div>
					<div className={statCard}>
						<Text className={statValue}>{collection.completedCount ?? 0}</Text>
						<Text className={statLabel}>Completed</Text>
					</div>
					<div className={statCard}>
						<Text className={statValue}>{collection.wantedCount ?? 0}</Text>
						<Text className={statLabel}>Wanted</Text>
					</div>
					<div className={statCard}>
						<Text className={statValue}>¥{(collection.totalValue ?? 0).toLocaleString()}</Text>
						<Text className={statLabel}>Value</Text>
					</div>
				</div>

				<Box mt="md">
					<Group justify="space-between" mb="xs">
						<Text size="sm" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>Completion Progress</Text>
						<Badge variant="light" size="sm" color={collectionColor}>
							{collection.completionPercentage ?? 0}%
						</Badge>
					</Group>
					<div className={progressBar}>
						<div
							className={progressFill}
							style={{
								width: `${collection.completionPercentage ?? 0}%`,
								backgroundColor: `var(--mantine-color-${collectionColor}-6)`,
							}}
						/>
						<div className={progressSegments}>
							<div
								className={progressSegment}
								style={{
									width: `${(collection.completedCount ?? 0) / (collection.itemCount ?? 1) * 100}%`,
									backgroundColor: "var(--mantine-color-green-6)",
								}}
							/>
							<div
								className={progressSegment}
								style={{
									width: `${(collection.inProgressCount ?? 0) / (collection.itemCount ?? 1) * 100}%`,
									backgroundColor: "var(--mantine-color-orange-6)",
								}}
							/>
						</div>
					</div>
				</Box>

				<Group mt="md" justify="space-between" align="center">
					<Text size="xs" c="dimmed">
						Updated {new Date(collection.lastModified).toLocaleDateString()}
					</Text>
					<Button
						component={Link}
						href={`/collection/${collection.id}`}
						variant="light"
						size="sm"
						color={collectionColor}
					>
						View Collection
					</Button>
				</Group>
			</Box>
		</Card>
	);
}

// Collection row component for list view
function CollectionCardList({ collection, onEdit, onDelete }: {
	collection: CollectionCardType;
	onEdit: (collection: CollectionCardType) => void;
	onDelete: (collection: CollectionCardType) => void;
}) {
	const collectionColor = getCollectionColor(Number.parseInt(collection.id) || 0);

	return (
		<Card
			p="md"
			radius="md"
			withBorder={true}
			style={{
				transition: "all 0.2s ease",
			}}
		>
			<Group align="center" justify="space-between">
				<Group align="center" style={{ flex: 1 }}>
					<Avatar
						size={40}
						radius="md"
						bg={`var(--mantine-color-${collectionColor}-6)`}
						color="white"
					>
						<IconFolder size={UI.ICON_SIZE_LG} />
					</Avatar>
					<Box style={{ flex: 1, minWidth: 0 }}>
						<Text fw={TYPOGRAPHY.FONT_WEIGHT_MEDIUM} size="lg" lineClamp={1}>
							{collection.name}
						</Text>
						{collection.description && (
							<Text size="sm" c="dimmed" lineClamp={1}>
								{collection.description}
							</Text>
						)}
					</Box>
				</Group>

				<Group align="center" gap="xl">
					<div style={{ textAlign: "center", minWidth: "80px" }}>
						<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>{collection.itemCount ?? 0}</Text>
						<Text size="xs" c="dimmed">Items</Text>
					</div>

					<div style={{ textAlign: "center", minWidth: "100px" }}>
						<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>{collection.completedCount ?? 0}</Text>
						<Text size="xs" c="dimmed">Completed</Text>
					</div>

					<div style={{ textAlign: "center", minWidth: "100px" }}>
						<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>¥{(collection.totalValue ?? 0).toLocaleString()}</Text>
						<Text size="xs" c="dimmed">Value</Text>
					</div>

					<Box style={{ minWidth: "120px" }}>
						<Group align="center" gap="xs">
							<div className={progressBar} style={{ flex: 1, height: "8px" }}>
								<div
									className={progressFill}
									style={{
										width: `${collection.completionPercentage ?? 0}%`,
										backgroundColor: `var(--mantine-color-${collectionColor}-6)`,
									}}
								/>
							</div>
							<Badge variant="light" size="sm" color={collectionColor}>
								{collection.completionPercentage ?? 0}%
							</Badge>
						</Group>
						<Text size="xs" c="dimmed" mt="xs">
							Updated {new Date(collection.lastModified).toLocaleDateString()}
						</Text>
					</Box>

					<Group gap="sm">
						<Button
							component={Link}
							href={`/collection/${collection.id}`}
							variant="light"
							size="sm"
							color={collectionColor}
						>
							View
						</Button>
						<Menu shadow="md" width={200} position="bottom-end">
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
				</Group>
			</Group>
		</Card>
	);
}

// Quick stats component
function QuickStats({ state }: { state: CollectionState }) {
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
							<Text size="xs" c="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
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
							<Text size="xs" c="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
                Total Items
							</Text>
							<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
								{state.stats?.totalItems ?? 0}
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
							<Text size="xs" c="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
                Completed
							</Text>
							<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
								{state.stats?.statusBreakdown.completed ?? 0}
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
							<Text size="xs" c="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
                Total Value
							</Text>
							<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
                ¥{(state.stats?.totalValue ?? 0).toLocaleString()}
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

// Search and filter component
function SearchAndFilters({
	searchQuery,
	onSearchChange,
	viewMode,
	onViewModeChange,
	sortBy,
	sortOrder,
	onSortChange,
}: {
	searchQuery: string;
	onSearchChange: (query: string) => void;
	viewMode: "grid" | "list";
	onViewModeChange: (mode: "grid" | "list") => void;
	sortBy: string;
	sortOrder: "asc" | "desc";
	onSortChange: (sortBy: string, order: "asc" | "desc") => void;
}) {
	return (
		<Card p="md" radius="md" withBorder={true}>
			<Group justify="space-between" align="center">
				<TextInput
					placeholder="Search collections..."
					leftSection={<IconSearch size={UI.ICON_SIZE_SM} />}
					value={searchQuery}
					onChange={(e) => { onSearchChange(e.target.value); }}
					style={{ flex: 1, maxWidth: "400px" }}
				/>

				<Group gap="sm">
					<Radio.Group
						value={viewMode}
						onChange={(value) => { onViewModeChange(value as "grid" | "list"); }}
					>
						<Group>
							<Tooltip label="Grid View">
								<Radio value="grid" label="Grid" />
							</Tooltip>
							<Tooltip label="List View">
								<Radio value="list" label="List" />
							</Tooltip>
						</Group>
					</Radio.Group>

					<Select
						leftSection={sortBy === "name" ? <IconSortAscending size={UI.ICON_SIZE_SM} /> : <IconTrendingUp size={UI.ICON_SIZE_SM} />}
						value={`${sortBy}-${sortOrder}`}
						onChange={(value) => {
							if (value) {
								const [field, order] = value.split("-");
								onSortChange(field, order as "asc" | "desc");
							}
						}}
						data={[
							{ value: "name-asc", label: "Name (A-Z)" },
							{ value: "name-desc", label: "Name (Z-A)" },
							{ value: "dateAdded-desc", label: "Newest First" },
							{ value: "dateAdded-asc", label: "Oldest First" },
							{ value: "itemCount-desc", label: "Most Items" },
							{ value: "itemCount-asc", label: "Fewest Items" },
							{ value: "totalValue-desc", label: "Highest Value" },
							{ value: "totalValue-asc", label: "Lowest Value" },
						]}
						w={160}
					/>
				</Group>
			</Group>
		</Card>
	);
}

// Enhanced empty state component
function EmptyState({ onCreateCollection }: { onCreateCollection: () => void }) {
	return (
		<Card p="xl" radius="md" withBorder={true} style={{ textAlign: "center" }}>
			<Stack gap="lg" align="center">
				<Avatar size={80} radius="md" bg="var(--mantine-color-gray-1)">
					<IconFolder size={48} color="var(--mantine-color-gray-4)" />
				</Avatar>
				<Box>
					<Title order={3} mb="sm">
						No Collections Yet
					</Title>
					<Text size="lg" c="dimmed" mb="md">
						Start organizing your hobby items by creating your first collection
					</Text>
					<Text size="sm" c="dimmed" mb="xl">
						Collections help you track progress, manage wishlists, and organize items by categories
					</Text>
				</Box>
				<Button
					size="lg"
					leftSection={<IconPlus size={UI.ICON_SIZE_SM} />}
					onClick={onCreateCollection}
				>
					Create Your First Collection
				</Button>
			</Stack>
		</Card>
	);
}

// Main collection page
export default function CollectionPage() {
	const { state, actions } = useCollection();
	const { preferences } = useUserPreferences();
	const [createModalOpen, setCreateModalOpen] = React.useState(false);
	const [editModalOpen, setEditModalOpen] = React.useState(false);
	const [filterDrawerOpen, setFilterDrawerOpen] = React.useState(false);
	const [selectedCollection, setSelectedCollection] = React.useState<Collection | null>(null);
	const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");
	const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
	const [sortBy, setSortBy] = React.useState("dateAdded");
	const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
	const [formData, setFormData] = React.useState({
		name: "",
		description: "",
	});

	const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
		setSortBy(newSortBy);
		setSortOrder(newSortOrder);
	};

	React.useEffect(() => {
		void actions.loadCollections();
	}, [actions]);

	const handleCreateCollection = async () => {
		try {
			await actions.createCollection(formData.name, formData.description);
			setCreateModalOpen(false);
			setFormData({ name: "", description: "" });
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			// Rethrow to allow error boundary to handle
			throw new Error(`Failed to create collection: ${errorMessage}`);
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
			// Rethrow to allow error boundary to handle
			throw new Error(`Failed to update collection: ${errorMessage}`);
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
			// Rethrow to allow error boundary to handle
			throw new Error(`Failed to delete collection: ${errorMessage}`);
		}
	};

	const openEditModal = (collection: Collection) => {
		setSelectedCollection(collection);
		setFormData({
			name: collection.name,
			description: collection.description,
		});
		setEditModalOpen(true);
	};

	const openDeleteModal = (collection: Collection) => {
		setSelectedCollection(collection);
		setDeleteModalOpen(true);
	};

	// Filter and sort collections
	const filteredAndSortedCollections = useMemo(() => {
		let filtered = state.collections;

		// Apply search filter
		if (searchQuery.trim()) {
			filtered = filtered.filter(collection =>
				collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				collection.description.toLowerCase().includes(searchQuery.toLowerCase()),
			);
		}

		// Apply sorting
		return filtered.toSorted((a, b) => {
			let aValue: string | number | Date;
			let bValue: string | number | Date;

			switch (sortBy) {
				case "name": {
					aValue = a.name.toLowerCase();
					bValue = b.name.toLowerCase();
					break;
				}
				case "dateAdded": {
					aValue = new Date(a.modifiedAt);
					bValue = new Date(b.modifiedAt);
					break;
				}
				case "itemCount": {
					aValue = a.itemCount;
					bValue = b.itemCount;
					break;
				}
				case "totalValue": {
					aValue = a.totalValue;
					bValue = b.totalValue;
					break;
				}
				default: {
					aValue = a.name.toLowerCase();
					bValue = b.name.toLowerCase();
				}
			}

			if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
			if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
			return 0;
		});
	}, [state.collections, searchQuery, sortBy, sortOrder]);

	// Infinite scroll hook
	const {
		visibleItems: visibleCollections,
		hasMore,
		isLoading: isLoadingMore,
		loadMore,
		lastItemRef,
	} = useInfiniteScroll({
		items: filteredAndSortedCollections,
		itemsPerPage: preferences.infiniteScrollPageSize,
		autoLoad: preferences.autoLoadInfiniteScroll,
	});

	const CollectionsList = viewMode === "grid" ? SimpleGrid : Stack;

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
							<Text size="lg" c="dimmed">
								Manage and track your personal hobby collections
							</Text>
						</Box>
						<Button
							size="lg"
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

				{/* Search and Filters */}
				<SearchAndFilters
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					viewMode={viewMode}
					onViewModeChange={setViewMode}
					sortBy={sortBy}
					sortOrder={sortOrder}
					onSortChange={handleSortChange}
				/>

				{/* Collections Display */}
				<Box>
					<Group justify="space-between" mb="md" align="center">
						<Title order={2}>
							{searchQuery ? `Search Results (${filteredAndSortedCollections.length})` :
							 filteredAndSortedCollections.length === state.collections.length ?
							 `Your Collections (${filteredAndSortedCollections.length})` :
							 `Filtered Collections (${filteredAndSortedCollections.length})`}
						</Title>
						{filteredAndSortedCollections.length > 0 && (
							<Group gap="sm">
								<Button
									variant="light"
									leftSection={<IconFilter size={UI.ICON_SIZE_SM} />}
									onClick={() => { setFilterDrawerOpen(true); }}
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
							</Group>
						)}
					</Group>

					{state.loading ? (
						<CollectionsList
							{...(viewMode === "grid" ? {
								cols: { base: 1, sm: 2, lg: 3 },
								spacing: "lg",
							} : {
								gap: "md",
							})}
						>
							<LoadingSkeleton />
						</CollectionsList>
					) : filteredAndSortedCollections.length > 0 ? (
						<>
							<CollectionsList
								{...(viewMode === "grid" ? {
									cols: { base: 1, sm: 2, lg: 3 },
									spacing: "lg",
								} : {
									gap: "md",
								})}
							>
								{visibleCollections.map((collection, index) => {
									const collectionData = {
										...collection,
										lastModified: collection.modifiedAt.toISOString(),
									};

									const isLastItem = index === visibleCollections.length - 1;

									return viewMode === "grid" ? (
										<div key={collection.id} ref={isLastItem ? lastItemRef : undefined}>
											<CollectionCardGrid
												collection={collectionData}
												onEdit={openEditModal}
												onDelete={openDeleteModal}
											/>
										</div>
									) : (
										<div key={collection.id} ref={isLastItem ? lastItemRef : undefined}>
											<CollectionCardList
												collection={collectionData}
												onEdit={openEditModal}
												onDelete={openDeleteModal}
											/>
										</div>
									);
								})}
							</CollectionsList>

							<InfiniteScrollLoader
								isLoading={isLoadingMore}
								hasMore={hasMore}
								onLoadMore={loadMore}
								autoLoad={preferences.autoLoadInfiniteScroll}
							/>
						</>
					) : searchQuery ? (
						<Card p="xl" radius="md" withBorder={true} style={{ textAlign: "center" }}>
							<Stack gap="lg" align="center">
								<Avatar size={80} radius="md" bg="var(--mantine-color-gray-1)">
									<IconSearch size={48} color="var(--mantine-color-gray-4)" />
								</Avatar>
								<Box>
									<Title order={3} mb="sm">
										No Collections Found
									</Title>
									<Text size="lg" c="dimmed" mb="md">
										No collections match your search for &quot;{searchQuery}&quot;
									</Text>
									<Text size="sm" c="dimmed" mb="xl">
										Try adjusting your search terms or browse all collections
									</Text>
								</Box>
								<Button
									variant="light"
									onClick={() => { setSearchQuery(""); }}
								>
									Clear Search
								</Button>
							</Stack>
						</Card>
					) : (
						<EmptyState onCreateCollection={() => { setCreateModalOpen(true); }} />
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
								onClick={() => { void handleCreateCollection(); }}
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
								onClick={() => { void handleUpdateCollection(); }}
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
							Are you sure you want to delete &quot;{selectedCollection?.name}&quot;? This action cannot be undone.
						</Text>
						<Text size="sm" c="dimmed">
							{selectedCollection?.itemCount ?? 0} items will be permanently removed from this collection.
						</Text>
						<Group justify="flex-end" gap="sm">
							<Button variant="light" onClick={() => { setDeleteModalOpen(false); }}>
								Cancel
							</Button>
							<Button color="red" onClick={() => { void handleDeleteCollection(); }}>
								Delete Collection
							</Button>
						</Group>
					</Stack>
				</Modal>

				{/* Filter Drawer */}
				<Drawer
					opened={filterDrawerOpen}
					onClose={() => { setFilterDrawerOpen(false); }}
					title="Advanced Filters"
					position="right"
					size="md"
				>
					<Stack gap="md">
						<Text size="sm" c="dimmed">
							Advanced filtering options will be available in a future update.
						</Text>
						<Divider />
						<Text size="sm" fw={TYPOGRAPHY.FONT_WEIGHT_MEDIUM}>
							Coming Soon:
						</Text>
						<Text size="sm" c="dimmed">
							• Filter by item count range<br/>
							• Filter by completion status<br/>
							• Filter by value range<br/>
							• Filter by creation date<br/>
							• Filter by categories
						</Text>
						<Button
							fullWidth={true}
							onClick={() => { setFilterDrawerOpen(false); }}
						>
							Close
						</Button>
					</Stack>
				</Drawer>
			</Stack>
		</Container>
	);
}