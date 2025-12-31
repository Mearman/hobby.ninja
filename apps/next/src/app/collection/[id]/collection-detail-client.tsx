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
	Modal,
	ActionIcon,
	Menu,
	Avatar,
	Skeleton,
	Textarea,
	Badge as MantineBadge,
} from "@mantine/core";
import {
	IconSearch,
	IconDots,
	IconEdit,
	IconTrash,
	IconLayoutGrid,
	IconList,
	IconNotes,
} from "@tabler/icons-react";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { EntityList } from "@/components/ui/entity-list";
import { ListIcon } from "@/components/ui/list-icon";
import { useCollection } from "@/contexts/collection-context";
import type { ListMembership } from "@/lib/collection-storage";
import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";
import {
	itemCard,
	itemCardImage,
	itemCardContent,
	itemCardTitle,
	itemCardSubtitle,
	itemCardMetadata,
	itemCardActions,
	collectionCard,
} from "@/styles/components.css";

// Constants for magic numbers
const PLACEHOLDER_IMAGE_HEIGHT = 200;
const PLACEHOLDER_IMAGE_WIDTH = 280;
const ICON_SIZE_SMALL = 14;
const ICON_SIZE_MEDIUM = 16;
const MENU_WIDTH = 200;
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

// Item card component for list items
function ListItemCard({
	membership,
	onEditNotes,
	onRemove,
	viewMode,
	dbItem,
}: {
  membership: ListMembership;
  dbItem?: Item;
  onEditNotes: (membership: ListMembership) => void;
  onRemove: (membership: ListMembership) => void;
  viewMode: "grid" | "list";
}) {
	if (!membership.itemId) return null;

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
							src={createPlaceholderSvg((dbItem ? getNodeDisplayName(dbItem) : membership.itemId).slice(0, 20), PLACEHOLDER_IMAGE_WIDTH, PLACEHOLDER_IMAGE_HEIGHT)}
							alt={dbItem ? getNodeDisplayName(dbItem) : membership.itemId}
							fit="cover"
							height={PLACEHOLDER_IMAGE_HEIGHT}
							fallbackSrc={createErrorPlaceholderSvg(PLACEHOLDER_IMAGE_WIDTH, PLACEHOLDER_IMAGE_HEIGHT)}
						/>
					</Box>
					<Box className={itemCardContent}>
						<Text className={itemCardTitle} lineClamp={2}>
							{dbItem ? getNodeDisplayName(dbItem) : membership.itemId}
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
							{dbItem?.scales && dbItem.scales.length > 0 && dbItem.scales.map(scale => (
								<Badge key={scale} size="sm" variant="outline">{scale}</Badge>
							))}
						</Box>
						{membership.notes && (
							<Text size="xs" c="dimmed" lineClamp={2} mt="xs">
								{membership.notes}
							</Text>
						)}
					</Box>
					<Box className={itemCardActions}>
						{membership.notes && (
							<ActionIcon
								variant="light"
								size="sm"
								color="blue"
								title="Has notes"
							>
								<IconNotes size={ICON_SIZE_SMALL} />
							</ActionIcon>
						)}
						<ActionIcon
							variant="light"
							size="sm"
							onClick={() => { onEditNotes(membership); }}
							title="Edit notes"
						>
							<IconEdit size={ICON_SIZE_SMALL} />
						</ActionIcon>
						<ActionIcon
							variant="light"
							size="sm"
							color="red"
							onClick={() => { onRemove(membership); }}
							title="Remove from list"
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
							src={createPlaceholderSvg((dbItem ? getNodeDisplayName(dbItem) : membership.itemId)[0], 40, 40)}
							alt={dbItem ? getNodeDisplayName(dbItem) : membership.itemId}
						/>
						<Box>
							<Text fw={500}>{dbItem ? getNodeDisplayName(dbItem) : membership.itemId}</Text>
							{(dbItem?.series ?? []).length > 0 && (
								<Text size="sm" c="dimmed">
									<EntityList ids={(dbItem?.series ?? []).map(s => s.id)} entityType="series" mode="text" size="sm" emptyText="" />
								</Text>
							)}
							{membership.notes && (
								<Text size="xs" c="dimmed" lineClamp={1}>
									{membership.notes}
								</Text>
							)}
						</Box>
					</Group>

					<Group>
						<Box>
							<Text size="sm" c="dimmed">
								Added: {new Date(membership.addedAt).toLocaleDateString()}
							</Text>
						</Box>

						<Group gap="xs">
							{dbItem && getNodePrimaryGrade(dbItem) && <Text size="sm">{getNodePrimaryGrade(dbItem)}</Text>}
							{dbItem?.scales && dbItem.scales.length > 0 && <Text size="sm">{dbItem.scales.join(", ")}</Text>}
						</Group>

						<Menu shadow="md" width={MENU_WIDTH}>
							<Menu.Target>
								<ActionIcon variant="subtle" color="gray">
									<IconDots size={ICON_SIZE_MEDIUM} />
								</ActionIcon>
							</Menu.Target>

							<Menu.Dropdown>
								<Menu.Item leftSection={<IconEdit size={ICON_SIZE_SMALL} />} onClick={() => { onEditNotes(membership); }}>
									Edit Notes
								</Menu.Item>
								<Menu.Divider />
								<Menu.Item
									leftSection={<IconTrash size={ICON_SIZE_SMALL} />}
									color="red"
									onClick={() => { onRemove(membership); }}
								>
									Remove from List
								</Menu.Item>
							</Menu.Dropdown>
						</Menu>
					</Group>
				</Group>
			)}
		</CardComponent>
	);
}

// Notes edit modal
function NotesEditModal({
	opened,
	onClose,
	membership,
	onSave,
	dbItem,
}: {
  opened: boolean;
  onClose: () => void;
  membership?: ListMembership;
  dbItem?: Item;
  onSave: (notes: string) => void;
}) {
	const [notes, setNotes] = React.useState(membership?.notes ?? "");

	React.useEffect(() => {
		if (membership) {
			setNotes(membership.notes ?? "");
		}
	}, [membership]);

	const handleSave = () => {
		onSave(notes);
		onClose();
	};

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title={membership ? `Edit Notes for ${dbItem ? getNodeDisplayName(dbItem) : membership.itemId}` : "Edit Notes"}
			size="md"
		>
			<Stack gap="md">
				{membership && (
					<Box mb="md">
						<Group>
							<Avatar
								size="lg"
								src={createPlaceholderSvg((dbItem ? getNodeDisplayName(dbItem) : membership.itemId)[0], AVATAR_SIZE_LARGE, AVATAR_SIZE_LARGE)}
								alt={dbItem ? getNodeDisplayName(dbItem) : membership.itemId}
							/>
							<Box>
								<Text fw={500}>{dbItem ? getNodeDisplayName(dbItem) : membership.itemId}</Text>
								{(dbItem?.series ?? []).length > 0
									? <EntityList ids={(dbItem?.series ?? []).map(s => s.id)} entityType="series" mode="text" size="sm" emptyText="" />
									: <Text size="sm" c="dimmed">{membership.itemId}</Text>
								}
							</Box>
						</Group>
					</Box>
				)}

				<Textarea
					label="Notes"
					placeholder="Add any notes about this item..."
					value={notes}
					onChange={(e) => { setNotes(e.target.value); }}
					minRows={TEXTAREA_MIN_ROWS}
				/>

				<Group justify="flex-end" gap="sm">
					<Button variant="light" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleSave}>
						Save Notes
					</Button>
				</Group>
			</Stack>
		</Modal>
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
	const [sortOrder, setSortOrder] = React.useState("dateAdded");
	const [notesModalOpen, setNotesModalOpen] = React.useState(false);
	const [selectedMembership, setSelectedMembership] = React.useState<ListMembership | null>(null);

	React.useEffect(() => {
		void actions.loadList(collectionId);
	}, [collectionId, actions.loadList]);

	// Filter and sort items
	const filteredItems = React.useMemo(() => {
		let items = [...state.currentListItems];

		// Search filter - search in database item names
		if (searchQuery) {
			items = items.filter(membership => {
				const dbItem = dbItemsMap.get(membership.itemId);
				return dbItem && getNodeDisplayName(dbItem).toLowerCase().includes(searchQuery.toLowerCase());
			});
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
				default: {
					return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
				}
			}
		});

		return items;
	}, [state.currentListItems, dbItemsMap, searchQuery, sortOrder]);

	const handleEditNotes = (membership: ListMembership) => {
		setSelectedMembership(membership);
		setNotesModalOpen(true);
	};

	const handleRemoveItem = (membership: ListMembership) => {
		const dbItem = dbItemsMap.get(membership.itemId);
		if (globalThis.confirm(`Remove "${dbItem ? getNodeDisplayName(dbItem) : membership.itemId}" from this list?`)) {
			void actions.removeItemFromList(collectionId, membership.itemId);
		}
	};

	const handleSaveNotes = (_notes: string) => {
		// Note: The current API doesn't have updateMembership exposed through the context
		// For now, we'll need to add this capability or handle it differently
		// This is a placeholder - the notes will be saved when we add the updateMembership action
		setSelectedMembership(null);
	};

	const currentList = state.currentList;
	const isSystemList = currentList?.isSystem;

	return (
		<Stack gap="xl">
			{/* Header */}
			<Box>
				<Group justify="space-between" align="flex-start">
					<Box>
						<Group gap="sm" mb="xs">
							<ListIcon icon={currentList?.icon} size={32} />
							<Title order={1}>
								{currentList?.name ?? `List ${collectionId}`}
							</Title>
							{isSystemList && (
								<MantineBadge variant="light" color="gray" size="sm">
									System
								</MantineBadge>
							)}
						</Group>
						{currentList?.description && (
							<Text size="lg" c="dimmed">
								{currentList.description}
							</Text>
						)}
					</Box>
				</Group>
			</Box>

			{/* Item count summary */}
			<Card p="md" radius="md" withBorder={true}>
				<Group justify="space-between">
					<Text size="lg" fw={500}>
						{state.currentListItems.length} {state.currentListItems.length === 1 ? "item" : "items"} in this list
					</Text>
					{currentList?.modifiedAt && (
						<Text size="sm" c="dimmed">
							Last updated: {new Date(currentList.modifiedAt).toLocaleDateString()}
						</Text>
					)}
				</Group>
			</Card>

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
						<Select
							data={[
								{ value: "dateAdded", label: "Date Added" },
								{ value: "name", label: "Name" },
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
						{searchQuery ? " (filtered)" : ""}
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
							{filteredItems.map((membership, index) => {
								const dbItem = dbItemsMap.get(membership.itemId);
								return (
									<ListItemCard
										key={membership.id || `${membership.itemId}-${index}`}
										membership={membership}
										dbItem={dbItem}
										onEditNotes={handleEditNotes}
										onRemove={handleRemoveItem}
										viewMode={viewMode}
									/>
								);
							})}
						</SimpleGrid>
					) : (
						<Stack gap="sm">
							{filteredItems.map((membership, index) => {
								const dbItem = dbItemsMap.get(membership.itemId);
								return (
									<ListItemCard
										key={membership.id || `${membership.itemId}-${index}`}
										membership={membership}
										dbItem={dbItem}
										onEditNotes={handleEditNotes}
										onRemove={handleRemoveItem}
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
							{searchQuery
								? "Try adjusting your search"
								: "This list is empty. Add items from the database to get started."
							}
						</Text>
						{searchQuery && (
							<Button
								variant="light"
								onClick={() => {
									setSearchQuery("");
								}}
							>
								Clear Search
							</Button>
						)}
					</Box>
				)}
			</Box>

			{/* Notes Edit Modal */}
			<NotesEditModal
				opened={notesModalOpen}
				onClose={() => {
					setNotesModalOpen(false);
					setSelectedMembership(null);
				}}
				membership={selectedMembership ?? undefined}
				dbItem={selectedMembership ? dbItemsMap.get(selectedMembership.itemId) : undefined}
				onSave={handleSaveNotes}
			/>
		</Stack>
	);
}
