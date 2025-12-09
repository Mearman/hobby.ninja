import {
	Title,
	Text,
	Badge,
	Group,
	Stack,
	Card,
	SimpleGrid,
	Container,
	Grid,
	Image,
	Box,
	Breadcrumbs,
	Anchor,
	Button,
	TextInput,
	Select,
	MultiSelect,
	Modal,
	NumberInput,
	ActionIcon,
	Menu,
	Avatar,
	ActionIcon as MantineActionIcon,
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
	IconHome,
	IconLayoutGrid,
	IconList,
} from "@tabler/icons-react";
import React from "react";

import { useCollection } from "@/contexts/collection-context";
import type { CollectionItem } from "@/lib/collection-storage";
import { getAllItems } from "@/lib/graph-data";
import { getNodeDisplayName, isItemNode, type ItemNode } from "@/lib/schemas";
import {
	itemCard,
	itemCardImage,
	itemCardContent,
	itemCardTitle,
	itemCardSubtitle,
	itemCardMetadata,
	itemCardBadge,
	itemCardPrice,
	itemCardActions,
	collectionCard,
	statCard,
	progressBar,
	progressFill,
} from "@/styles/components.css";

// Static data fetching
interface PageProps {
  params: Promise<{ id: string }>;
}

// Constants for magic numbers
const PLACEHOLDER_IMAGE_HEIGHT = 200;
const ICON_SIZE_SMALL = 14;
const ICON_SIZE_MEDIUM = 16;
const MENU_WIDTH = 200;
const NUMBER_INPUT_STEP = 100;
const LOADING_GRID_ITEMS_COUNT = 8;
const LOADING_LIST_ITEMS_COUNT = 6;
const TEXTAREA_MIN_ROWS = 3;

// Interface for collection stats
interface CollectionStats {
  totalItems: number;
  totalValue: number;
  statusBreakdown: {
    owned: number;
    wanted: number;
    ordered: number;
    "pre-ordered": number;
    building: number;
    completed: number;
  };
  completionPercentage: number;
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
  dbItem?: ItemNode;
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
							src={`https://via.placeholder.com/280x200/f5f5f5/666666?text=${encodeURIComponent(dbItem ? getNodeDisplayName(dbItem) : item.itemId)}`}
							alt={dbItem ? getNodeDisplayName(dbItem) : item.itemId}
							fit="cover"
							height={PLACEHOLDER_IMAGE_HEIGHT}
							fallbackSrc="https://via.placeholder.com/280x200/e0e0e0/999999?text=No+Image"
						/>
					</Box>
					<Box className={itemCardContent}>
						<Text className={itemCardTitle} lineClamp={2}>
							{dbItem ? getNodeDisplayName(dbItem) : item.itemId}
						</Text>
						{dbItem?.series && (
							<Text className={itemCardSubtitle} lineClamp={1}>
								{dbItem.series}
							</Text>
						)}
						<Box className={itemCardMetadata}>
							{dbItem?.grade && (
								<Badge className={itemCardBadge} variant="light">
									{dbItem.grade}
								</Badge>
							)}
							{dbItem?.scale && (
								<Badge className={itemCardBadge} variant="light">
									{dbItem.scale}
								</Badge>
							)}
							<Badge
								className={itemCardBadge}
								variant={item.status === "completed" ? "filled" : "outline"}
								color={item.status === "completed" ? "green" : "blue"}
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
							src={`https://via.placeholder.com/40x40/f5f5f5/666666?text=${encodeURIComponent((dbItem ? getNodeDisplayName(dbItem) : item.itemId)[0])}`}
							alt={dbItem ? getNodeDisplayName(dbItem) : item.itemId}
						/>
						<Box>
							<Text fw={500}>{dbItem ? getNodeDisplayName(dbItem) : item.itemId}</Text>
							{dbItem?.series && (
								<Text size="sm" c="dimmed">
									{dbItem.series}
								</Text>
							)}
						</Box>
					</Group>

					<Group>
						<Box>
							<Text fw={500}>¥{item.purchaseInfo?.price?.toLocaleString() ?? 0}</Text>
							<Text size="sm" c="dimmed">
                Added: {new Date(item.added).toLocaleDateString()}
							</Text>
						</Box>

						<Group gap="xs">
							{dbItem?.grade && <Badge size="sm">{dbItem.grade}</Badge>}
							{dbItem?.scale && <Badge size="sm" variant="outline">{dbItem.scale}</Badge>}
							<Badge
								size="sm"
								color={item.status === "completed" ? "green" : "blue"}
								variant={item.status === "completed" ? "filled" : "light"}
							>
								{item.status}
							</Badge>
						</Group>

						<Menu shadow="md" width={MENU_WIDTH}>
							<Menu.Target>
								<MantineActionIcon variant="subtle" color="gray">
									<IconDots size={ICON_SIZE_MEDIUM} />
								</MantineActionIcon>
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
  dbItem?: ItemNode;
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
				status: item.status ?? "wanted",
				notes: item.notes ?? "",
				price: item.purchaseInfo?.price ?? 0,
				condition: item.condition ?? "new",
				rating: item.rating ?? 0,
			});
		}
	}, [item]);

	const handleSave = () => {
		const updatedData: Partial<CollectionItem> = {
			status: formData.status as CollectionItem["status"],
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
								src={`https://via.placeholder.com/60x60/f5f5f5/666666?text=${encodeURIComponent((dbItem ? getNodeDisplayName(dbItem) : item.itemId)[0])}`}
								alt={dbItem ? getNodeDisplayName(dbItem) : item.itemId}
							/>
							<Box>
								<Text fw={500}>{dbItem ? getNodeDisplayName(dbItem) : item.itemId}</Text>
								<Text size="sm" c="dimmed">{dbItem?.series ?? item.itemId}</Text>
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
					onChange={(value) => { setFormData({ ...formData, price: Number(value) ?? 0 }); }}
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
					onChange={(value) => { setFormData({ ...formData, rating: Number(value) ?? 0 }); }}
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
function CollectionStats({ stats }: { stats: CollectionStats }) {
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
						{stats?.totalItems ?? 0}
					</Text>
				</div>

				<div className={statCard}>
					<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
            Total Value
					</Text>
					<Text size="lg" fw={500}>
            ¥{(stats?.totalValue ?? 0).toLocaleString()}
					</Text>
				</div>

				<div className={statCard}>
					<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
            Completed
					</Text>
					<Text size="lg" fw={500}>
						{stats?.statusBreakdown?.completed ?? 0}
					</Text>
				</div>

				<div className={statCard}>
					<Text size="sm" c="dimmed" tt="uppercase" fw={700}>
            In Progress
					</Text>
					<Text size="lg" fw={500}>
						{stats?.statusBreakdown?.building ?? 0}
					</Text>
				</div>
			</SimpleGrid>

			<Box>
				<Group justify="space-between" mb="xs">
					<Text size="sm" fw={500}>Progress</Text>
					<Text size="sm" c="dimmed">
						{stats?.completionPercentage ?? 0}% Complete
					</Text>
				</Group>
				<div className={progressBar}>
					<div
						className={progressFill}
						style={{
							width: `${stats?.completionPercentage ?? 0}%`,
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

// Generate static params for collection pages
export async function generateStaticParams() {
	// For static export, return basic collection IDs
	// In a real application, these would come from your data source
	return [
		{ id: "1" },
		{ id: "2" },
		{ id: "3" },
	];
}

// Main collection detail page
export default async function CollectionDetailPage({ params }: PageProps) {
	const { id } = await params;
	const { state, actions } = useCollection() as {
		state: {
			collections: any[];
			currentCollection: { id?: number; name: string; description?: string; isPublic: boolean; itemCount: number; totalValue: number; currency: string; createdAt: Date; modifiedAt: Date; settings: any } | null;
			items: CollectionItem[];
			stats: CollectionStats | null;
			loading: boolean;
			error: string | null;
			searchQuery: string;
			filters: any;
			sortBy: string;
			sortOrder: string;
			viewMode: string;
		};
		actions: any;
	};
	const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
	const [sortOrder, setSortOrder] = React.useState("dateAdded");
	const [itemModalOpen, setItemModalOpen] = React.useState(false);
	const [selectedItem, setSelectedItem] = React.useState<CollectionItem | null>(null);
	const [allDbItems, setAllDbItems] = React.useState<ItemNode[]>([]);

	React.useEffect(() => {
		actions.loadCollection(id);
		// Load all database items for display
		setAllDbItems(getAllItems());
	}, [id]);

	// Filter and sort items
	const filteredItems = React.useMemo(() => {
		let items = [...state.items];

		// Search filter - search in database item names
		if (searchQuery) {
			items = items.filter(item => {
				const dbItem = allDbItems.find(dbItem => isItemNode(dbItem) && dbItem.id === item.itemId);
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
					const aDbItem = allDbItems.find(dbItem => isItemNode(dbItem) && dbItem.id === a.itemId);
					const bDbItem = allDbItems.find(dbItem => isItemNode(dbItem) && dbItem.id === b.itemId);
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
				case "dateAdded":
				default: {
					return new Date(b.added).getTime() - new Date(a.added).getTime();
				}
			}
		});

		return items;
	}, [state.items, allDbItems, searchQuery, statusFilter, sortOrder]);

	const handleEditItem = (item: CollectionItem) => {
		setSelectedItem(item);
		setItemModalOpen(true);
	};

	const handleDeleteItem = (item: CollectionItem) => {
		const dbItem = allDbItems.find(dbItem => isItemNode(dbItem) && dbItem.id === item.itemId);
		if (confirm(`Remove "${dbItem ? getNodeDisplayName(dbItem) : item.itemId}" from this collection?`)) {
			actions.removeItem(item.id?.toString() ?? "");
		}
	};

	const handleToggleVisibility = (item: CollectionItem) => {
		actions.updateItem(item.id?.toString() ?? "", { hidden: !item.hidden });
	};

	const handleSaveItem = (itemData: Partial<CollectionItem>) => {
		if (selectedItem?.id) {
			actions.updateItem(selectedItem.id.toString(), itemData);
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
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Header */}
				<Box>
					<Group justify="space-between" align="flex-start">
						<Box>
							<Title order={1} mb="sm">
								{state.currentCollection?.name ?? "Collection"}
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

				{/* Breadcrumbs */}
				<Breadcrumbs>
					<Anchor href="/" size="sm">
						<Group gap={4}>
							<IconHome size={14} />
              Home
						</Group>
					</Anchor>
					<Anchor href="/collection" size="sm">
            Collections
					</Anchor>
					<Text size="sm">{state.currentCollection?.name}</Text>
				</Breadcrumbs>

				{/* Stats */}
				{!state.loading && state.stats && <CollectionStats stats={state.stats} />}

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
								onChange={(value) => { setSortOrder(value!); }}
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
									const dbItem = allDbItems.find(dbItem => isItemNode(dbItem) && dbItem.id === item.itemId);
									return (
										<CollectionItemCard
											key={item.id ? `${item.id}` : `${item.itemId}-${index}`}
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
									const dbItem = allDbItems.find(dbItem => isItemNode(dbItem) && dbItem.id === item.itemId);
									return (
										<CollectionItemCard
											key={item.id ? `${item.id}` : `${item.itemId}-${index}`}
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
		</Container>
	);
}