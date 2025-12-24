"use client";

import { getNodeDisplayName, getNodePrimaryGrade, type Item } from "@hobby-ninja/data";
import {
	Title,
	Text,
	Group,
	Stack,
	Card,
	SimpleGrid,
	Grid,
	Image,
	Box,
	Button,
	TextInput,
	Select,
	MultiSelect,
	Modal,
	NumberInput,
	ActionIcon,
	Menu,
	Avatar,
	Skeleton,
	Textarea,
} from "@mantine/core";
import {
	IconSearch,
	IconFilter,
	IconDots,
	IconEdit,
	IconTrash,
	IconDownload,
	IconEye,
	IconLayoutGrid,
	IconList,
} from "@tabler/icons-react";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { EntityList } from "@/components/ui/entity-list";
import { useCollection } from "@/contexts/collection-context";
import type { CollectionItem, CollectionStats } from "@/lib/collection-storage";
import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";
import {
	itemCard,
	itemCardImage,
	itemCardContent,
	itemCardTitle,
	itemCardSubtitle,
	itemCardMetadata,
	itemCardPrice,
	itemCardActions,
	collectionCard,
	statCard,
	progressBar,
	progressFill,
} from "@/styles/components.css";

// Constants for magic numbers
const PLACEHOLDER_IMAGE_HEIGHT = 200;
const PLACEHOLDER_IMAGE_WIDTH = 280;
const ICON_SIZE_SMALL = 14;
const ICON_SIZE_MEDIUM = 16;
const MENU_WIDTH = 200;
const NUMBER_INPUT_STEP = 100;
const LOADING_GRID_ITEMS_COUNT = 8;
const LOADING_LIST_ITEMS_COUNT = 6;
const TEXTAREA_MIN_ROWS = 3;
const AVATAR_SIZE_LARGE = 60;

// Props for the client component
interface CollectionDetailClientProps {
	collectionId: string;
	// Map of itemId -> Item for O(1) lookups
	dbItemsMap: Map<string, Item>;
}

// Item card component for collection items
function CollectionItemCard({
	item,
	onEdit,
	onDelete,
	onToggleVisibility,
	viewMode,
	dbItem,
}: {
  item: CollectionItem;
  dbItem?: Item;
  onEdit: (item: CollectionItem) => void;
  onDelete: (item: CollectionItem) => void;
  onToggleVisibility: (item: CollectionItem) => void;
  viewMode: "grid" | "list";
}) {
	if (!item.itemId) return null;

	const CardComponent = viewMode === "grid" ? Card : "div";

	return (
		<CardComponent
			{...(viewMode === "grid" ? {
				p: 0,
				radius: "md",
				className: itemCard,
				withBorder: true,
			} : {
				p: "md",
				radius: "md",
				className: collectionCard,
				withBorder: true,
			})}
		>
			{viewMode === "grid" ? (
				<>
					<Box className={itemCardImage}>
						<Image
							src={createPlaceholderSvg((dbItem ? getNodeDisplayName(dbItem) : item.itemId).slice(0, 20), PLACEHOLDER_IMAGE_WIDTH, PLACEHOLDER_IMAGE_HEIGHT)}
							alt={dbItem ? getNodeDisplayName(dbItem) : item.itemId}
							fit="cover"
							height={PLACEHOLDER_IMAGE_HEIGHT}
							fallbackSrc={createErrorPlaceholderSvg(PLACEHOLDER_IMAGE_WIDTH, PLACEHOLDER_IMAGE_HEIGHT)}
						/>
					</Box>
					<Box className={itemCardContent}>
						<Text className={itemCardTitle} lineClamp={2}>
							{dbItem ? getNodeDisplayName(dbItem) : item.itemId}
						</Text>
						{(dbItem?.series ?? []).length > 0 && (
							<Text className={itemCardSubtitle} lineClamp={1}>
								<EntityList ids={(dbItem?.series ?? []).map(s => s.id)} entityType="series" mode="text" size="xs" emptyText="" />
							</Text>
						)}
						<Box className={itemCardMetadata}>
							{dbItem && getNodePrimaryGrade(dbItem) && (
								<Badge size="sm">{getNodePrimaryGrade(dbItem)}</Badge>
							)}
							{dbItem?.scale && (
								<Badge size="sm" variant="outline">{dbItem.scale}</Badge>
							)}
							<Badge
								size="sm"
								color={item.status === "completed" ? "green" : "blue"}
								variant={item.status === "completed" ? "filled" : "light"}
							>
								{item.status}
							</Badge>
						</Box>
						{item.purchaseInfo?.price && (
							<Text className={itemCardPrice}>
                ¥{item.purchaseInfo.price.toLocaleString()}
							</Text>
						)}
					</Box>
					<Box className={itemCardActions}>
						<ActionIcon
							variant="light"
							size="sm"
							onClick={() => { onEdit(item); }}
						>
							<IconEdit size={ICON_SIZE_SMALL} />
						</ActionIcon>
						<ActionIcon
							variant="light"
							size="sm"
							color="red"
							onClick={() => { onDelete(item); }}
						>
							<IconTrash size={ICON_SIZE_SMALL} />
						</ActionIcon>
					</Box>
				</>
			) : (
				<Group justify="space-between" align="center">
					<Group>
						<Avatar
							size="md"
							src={createPlaceholderSvg((dbItem ? getNodeDisplayName(dbItem) : item.itemId)[0], 40, 40)}
							alt={dbItem ? getNodeDisplayName(dbItem) : item.itemId}
						/>
						<Box>
							<Text fw={500}>{dbItem ? getNodeDisplayName(dbItem) : item.itemId}</Text>
							{(dbItem?.series ?? []).length > 0 && (
								<Text size="sm" c="dimmed">
									<EntityList ids={(dbItem?.series ?? []).map(s => s.id)} entityType="series" mode="text" size="sm" emptyText="" />
								</Text>
							)}
						</Box>
					</Group>

					<Group>
						<Box>
							<Text fw={500}>¥{item.purchaseInfo?.price ? item.purchaseInfo.price.toLocaleString() : 0}</Text>
							<Text size="sm" c="dimmed">
                Added: {new Date(item.added).toLocaleDateString()}
							</Text>
						</Box>

						<Group gap="xs">
							{dbItem && getNodePrimaryGrade(dbItem) && <Text size="sm">{getNodePrimaryGrade(dbItem)}</Text>}
							{dbItem?.scale && <Text size="sm">{dbItem.scale}</Text>}
						</Group>

						<Menu shadow="md" width={MENU_WIDTH}>
							<Menu.Target>
								<ActionIcon variant="subtle" color="gray">
									<IconDots size={ICON_SIZE_MEDIUM} />
								</ActionIcon>
							</Menu.Target>

							<Menu.Dropdown>
								<Menu.Item leftSection={<IconEye size={ICON_SIZE_SMALL} />} onClick={() => { onToggleVisibility(item); }}>
									{item.hidden ? "Show" : "Hide"}
								</Menu.Item>
								<Menu.Item leftSection={<IconEdit size={ICON_SIZE_SMALL} />} onClick={() => { onEdit(item); }}>
                  Edit Item
								</Menu.Item>
								<Menu.Divider />
								<Menu.Item
									leftSection={<IconTrash size={ICON_SIZE_SMALL} />}
									color="red"
									onClick={() => { onDelete(item); }}
								>
                  Remove from Collection
								</Menu.Item>
							</Menu.Dropdown>
						</Menu>
					</Group>
				</Group>
			)}
		</CardComponent>
	);
}

// Item form modal
function ItemFormModal({
	opened,
	onClose,
	item,
	onSave,
	dbItem,
}: {
  opened: boolean;
  onClose: () => void;
  item?: CollectionItem;
  dbItem?: Item;
  onSave: (itemData: Partial<CollectionItem>) => void;
}) {
	const [formData, setFormData] = React.useState({
		status: item?.status ?? "wanted",
		notes: item?.notes ?? "",
		price: item?.purchaseInfo?.price ?? 0,
		condition: item?.condition ?? "new",
		rating: item?.rating ?? 0,
	});

	React.useEffect(() => {
		if (item) {
			setFormData({
				status: item.status,
				notes: item.notes,
				price: item.purchaseInfo?.price ?? 0,
				condition: item.condition,
				rating: item.rating ?? 0,
			});
		}
	}, [item]);

	const handleSave = () => {
		const updatedData: Partial<CollectionItem> = {
			status: formData.status,
			notes: formData.notes,
			condition: formData.condition,
			rating: formData.rating,
			purchaseInfo: {
				price: formData.price,
				currency: "JPY" as const,
				date: new Date(),
				store: "",
			},
			modified: new Date(),
		};
		onSave(updatedData);
		onClose();
	};

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title={item ? `Edit ${dbItem ? getNodeDisplayName(dbItem) : item.itemId}` : "Add Item Details"}
			size="md"
		>
			<Stack gap="md">
				{item && (
					<Box mb="md">
						<Group>
							<Avatar
								size="lg"
								src={createPlaceholderSvg((dbItem ? getNodeDisplayName(dbItem) : item.itemId)[0], AVATAR_SIZE_LARGE, AVATAR_SIZE_LARGE)}
								alt={dbItem ? getNodeDisplayName(dbItem) : item.itemId}
							/>
							<Box>
								<Text fw={500}>{dbItem ? getNodeDisplayName(dbItem) : item.itemId}</Text>
								{(dbItem?.series ?? []).length > 0
									? <EntityList ids={(dbItem?.series ?? []).map(s => s.id)} entityType="series" mode="text" size="sm" emptyText="" />
									: <Text size="sm" c="dimmed">{item.itemId}</Text>
								}
							</Box>
						</Group>
					</Box>
				)}

				<Select
					label="Status"
					data={[
						{ value: "owned", label: "Owned" },
						{ value: "wanted", label: "Wanted" },
						{ value: "ordered", label: "Ordered" },
						{ value: "pre-ordered", label: "Pre-ordered" },
						{ value: "building", label: "Building" },
						{ value: "completed", label: "Completed" },
					]}
					value={formData.status}
					onChange={(value) => { setFormData({ ...formData, status: value as CollectionItem["status"] }); }}
				/>

				<Select
					label="Condition"
					data={[
						{ value: "new", label: "New" },
						{ value: "used", label: "Used" },
						{ value: "damaged", label: "Damaged" },
						{ value: "box-damaged", label: "Box Damaged" },
					]}
					value={formData.condition}
					onChange={(value) => { setFormData({ ...formData, condition: value as CollectionItem["condition"] }); }}
				/>

				<NumberInput
					label="Price (¥)"
					value={formData.price}
					onChange={(value) => { setFormData({ ...formData, price: typeof value === "number" ? value : 0 }); }}
					min={0}
					step={NUMBER_INPUT_STEP}
				/>

				<Select
					label="Rating"
					data={[
						{ value: "0", label: "Not Rated" },
						{ value: "1", label: "1 Star" },
						{ value: "2", label: "2 Stars" },
						{ value: "3", label: "3 Stars" },
						{ value: "4", label: "4 Stars" },
						{ value: "5", label: "5 Stars" },
					]}
					value={formData.rating.toString()}
					onChange={(value) => { setFormData({ ...formData, rating: value ? Number(value) : 0 }); }}
				/>

				<Textarea
					label="Notes"
					placeholder="Add any notes about this item..."
					value={formData.notes}
					onChange={(e) => { setFormData({ ...formData, notes: e.target.value }); }}
					minRows={TEXTAREA_MIN_ROWS}
				/>

				<Group justify="flex-end" gap="sm">
					<Button variant="light" onClick={onClose}>
            Cancel
					</Button>
					<Button onClick={handleSave}>
            Save Changes
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
}

// Stats component
function CollectionStatsDisplay({ stats }: { stats: CollectionStats }) {
	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Title order={3} mb="md">
        Collection Statistics
			</Title>

			<SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="md">
				<div className={statCard}>
					<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
            Total Items
					</Text>
					<Text size="lg" fw={500}>
						{stats.totalItems}
					</Text>
				</div>

				<div className={statCard}>
					<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
            Total Value
					</Text>
					<Text size="lg" fw={500}>
            ¥{stats.totalValue.toLocaleString()}
					</Text>
				</div>

				<div className={statCard}>
					<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
            Completed
					</Text>
					<Text size="lg" fw={500}>
						{stats.statusBreakdown.completed}
					</Text>
				</div>

				<div className={statCard}>
					<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
            In Progress
					</Text>
					<Text size="lg" fw={500}>
						{stats.statusBreakdown.building}
					</Text>
				</div>
			</SimpleGrid>

			<Box>
				<Group justify="space-between" mb="xs">
					<Text size="sm" fw={500}>Progress</Text>
					<Text size="sm" c="dimmed">
						{stats.completionPercentage}% Complete
					</Text>
				</Group>
				<div className={progressBar}>
					<div
						className={progressFill}
						style={{
							width: `${stats.completionPercentage}%`,
						}}
					/>
				</div>
			</Box>
		</Card>
	);
}

// Loading skeleton
function LoadingGrid({ viewMode }: { viewMode: "grid" | "list" }) {
	if (viewMode === "grid") {
		return (
			<SimpleGrid
				cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}
				spacing="md"
			>
				{Array.from({length: LOADING_GRID_ITEMS_COUNT}).map((_, index) => (
					<Card key={index} p={0} radius="md" withBorder={true}>
						<Skeleton height={PLACEHOLDER_IMAGE_HEIGHT} />
						<Box p="md">
							<Skeleton height={20} mb="xs" />
							<Skeleton height={16} mb="md" width="60%" />
							<Group gap="xs">
								<Skeleton width={40} height={20} radius="sm" />
								<Skeleton width={50} height={20} radius="sm" />
							</Group>
							<Skeleton height={24} mb="md" />
						</Box>
					</Card>
				))}
			</SimpleGrid>
		);
	}

	return (
		<Stack gap="sm">
			{Array.from({length: LOADING_LIST_ITEMS_COUNT}).map((_, index) => (
				<Card key={index} p="md" radius="md" withBorder={true}>
					<Skeleton height={40} mb="md" />
					<Group justify="space-between">
						<Group>
							<Skeleton width={40} height={40} radius="md" />
							<Box>
								<Skeleton width={150} height={16} mb="xs" />
								<Skeleton width={100} height={12} />
							</Box>
						</Group>
						<Group>
							<Skeleton width={80} height={16} />
							<Skeleton width={60} height={16} />
							<Skeleton width={50} height={20} radius="sm" />
						</Group>
					</Group>
				</Card>
			))}
		</Stack>
	);
}

// Client Component for interactive parts
export function CollectionDetailClient({ collectionId, dbItemsMap }: CollectionDetailClientProps) {
	const { state, actions } = useCollection();
	const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
	const [sortOrder, setSortOrder] = React.useState("dateAdded");
	const [itemModalOpen, setItemModalOpen] = React.useState(false);
	const [selectedItem, setSelectedItem] = React.useState<CollectionItem | null>(null);

	React.useEffect(() => {
		void actions.loadCollection(collectionId);
	}, [collectionId, actions]);

	// Filter and sort items
	const filteredItems = React.useMemo(() => {
		let items = [...state.items];

		// Search filter - search in database item names
		if (searchQuery) {
			items = items.filter(item => {
				const dbItem = dbItemsMap.get(item.itemId);
				return dbItem && getNodeDisplayName(dbItem).toLowerCase().includes(searchQuery.toLowerCase());
			});
		}

		// Status filter
		if (statusFilter.length > 0) {
			items = items.filter(item => statusFilter.includes(item.status));
		}

		// Sort
		items.sort((a, b) => {
			switch (sortOrder) {
				case "name": {
					const aDbItem = dbItemsMap.get(a.itemId);
					const bDbItem = dbItemsMap.get(b.itemId);
					if (!aDbItem || !bDbItem) return 0;
					return getNodeDisplayName(aDbItem).localeCompare(getNodeDisplayName(bDbItem));
				}
				case "status": {
					return a.status.localeCompare(b.status);
				}
				case "rating": {
					return (b.rating ?? 0) - (a.rating ?? 0);
				}
				case "price": {
					return (b.purchaseInfo?.price ?? 0) - (a.purchaseInfo?.price ?? 0);
				}
				default: {
					return new Date(b.added).getTime() - new Date(a.added).getTime();
				}
			}
		});

		return items;
	}, [state.items, dbItemsMap, searchQuery, statusFilter, sortOrder]);

	const handleEditItem = (item: CollectionItem) => {
		setSelectedItem(item);
		setItemModalOpen(true);
	};

	const handleDeleteItem = (item: CollectionItem) => {
		const dbItem = dbItemsMap.get(item.itemId);
		if (globalThis.confirm(`Remove "${dbItem ? getNodeDisplayName(dbItem) : item.itemId}" from this collection?`)) {
			void actions.removeItem(item.id);
		}
	};

	const handleToggleVisibility = (item: CollectionItem) => {
		void actions.updateItem(item.id, { hidden: !item.hidden });
	};

	const handleSaveItem = (itemData: Partial<CollectionItem>) => {
		if (selectedItem?.id != null) {
			void actions.updateItem(selectedItem.id, itemData);
		}
		setSelectedItem(null);
	};

	const statusOptions = [
		{ value: "owned", label: "Owned" },
		{ value: "wanted", label: "Wanted" },
		{ value: "ordered", label: "Ordered" },
		{ value: "pre-ordered", label: "Pre-ordered" },
		{ value: "building", label: "Building" },
		{ value: "completed", label: "Completed" },
	];

	return (
		<Stack gap="xl">
			{/* Header */}
			<Box>
				<Group justify="space-between" align="flex-start">
					<Box>
						<Title order={1} mb="sm">
							{state.currentCollection?.name ?? `Collection ${collectionId}`}
						</Title>
						<Text size="lg" c="dimmed">
							{state.currentCollection?.description}
						</Text>
					</Box>
					<Group>
						<Button
							variant="light"
							leftSection={<IconDownload size={14} />}
							size="sm"
						>
              Export
						</Button>
					</Group>
				</Group>
			</Box>

			{/* Stats */}
			{!state.loading && state.stats && <CollectionStatsDisplay stats={state.stats} />}

			{/* Filters and Controls */}
			<Card p="lg" radius="md" withBorder={true}>
				<Grid>
					<Grid.Col span={{ base: 12, md: 6 }}>
						<TextInput
							leftSection={<IconSearch size={16} />}
							placeholder="Search items..."
							value={searchQuery}
							onChange={(e) => { setSearchQuery(e.target.value); }}
						/>
					</Grid.Col>
					<Grid.Col span={{ base: 12, md: 4 }}>
						<MultiSelect
							leftSection={<IconFilter size={16} />}
							placeholder="Filter by status"
							data={statusOptions}
							value={statusFilter}
							onChange={setStatusFilter}
							clearable={true}
						/>
					</Grid.Col>
					<Grid.Col span={{ base: 12, md: 2 }}>
						<Select
							data={[
								{ value: "dateAdded", label: "Date Added" },
								{ value: "name", label: "Name" },
								{ value: "status", label: "Status" },
								{ value: "rating", label: "Rating" },
								{ value: "price", label: "Price" },
							]}
							value={sortOrder}
							onChange={(value) => { if (value) setSortOrder(value); }}
						/>
					</Grid.Col>
					<Grid.Col span={{ base: 12, md: 2 }}>
						<Group>
							<Button
								variant={viewMode === "grid" ? "filled" : "light"}
								size="sm"
								onClick={() => { setViewMode("grid"); }}
								leftSection={<IconLayoutGrid size={14} />}
							>
                Grid
							</Button>
							<Button
								variant={viewMode === "list" ? "filled" : "light"}
								size="sm"
								onClick={() => { setViewMode("list"); }}
								leftSection={<IconList size={14} />}
							>
                List
							</Button>
						</Group>
					</Grid.Col>
				</Grid>
			</Card>

			{/* Items Grid/List */}
			<Box>
				<Group justify="space-between" mb="md">
					<Text size="lg" fw={500}>
						{filteredItems.length} {filteredItems.length === 1 ? "Item" : "Items"}
						{searchQuery || statusFilter.length > 0 ? " (filtered)" : ""}
					</Text>
				</Group>

				{state.loading ? (
					<LoadingGrid viewMode={viewMode} />
				) : filteredItems.length > 0 ? (
					viewMode === "grid" ? (
						<SimpleGrid
							cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}
							spacing="md"
						>
							{filteredItems.map((item, index) => {
								const dbItem = dbItemsMap.get(item.itemId);
								return (
									<CollectionItemCard
										key={item.id || `${item.itemId}-${index}`}
										item={item}
										dbItem={dbItem}
										onEdit={handleEditItem}
										onDelete={handleDeleteItem}
										onToggleVisibility={handleToggleVisibility}
										viewMode={viewMode}
									/>
								);
							})}
						</SimpleGrid>
					) : (
						<Stack gap="sm">
							{filteredItems.map((item, index) => {
								const dbItem = dbItemsMap.get(item.itemId);
								return (
									<CollectionItemCard
										key={item.id || `${item.itemId}-${index}`}
										item={item}
										dbItem={dbItem}
										onEdit={handleEditItem}
										onDelete={handleDeleteItem}
										onToggleVisibility={handleToggleVisibility}
										viewMode={viewMode}
									/>
								);
							})}
						</Stack>
					)
				) : (
					<Box ta="center" py="xl">
						<IconSearch size={64} color="var(--mantine-color-gray-4)" />
						<Title order={3} mt="md" mb="sm">
              No items found
						</Title>
						<Text c="dimmed" mb="lg">
							{searchQuery || statusFilter.length > 0
								? "Try adjusting your search or filters"
								: "This collection is empty. Add items from the database to get started."
							}
						</Text>
						{(searchQuery || statusFilter.length > 0) && (
							<Button
								variant="light"
								onClick={() => {
									setSearchQuery("");
									setStatusFilter([]);
								}}
							>
                Clear Filters
							</Button>
						)}
					</Box>
				)}
			</Box>

			{/* Item Form Modal */}
			<ItemFormModal
				opened={itemModalOpen}
				onClose={() => {
					setItemModalOpen(false);
					setSelectedItem(null);
				}}
				item={selectedItem ?? undefined}
				onSave={handleSaveItem}
			/>
		</Stack>
	);
}