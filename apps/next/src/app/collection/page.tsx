"use client";

import {
	ActionIcon,
	Anchor,
	Avatar,
	Box,
	Breadcrumbs,
	Button,
	Card,
	Container,
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
	IconDots,
	IconDownload,
	IconEdit,
	IconFolder,
	IconHome,
	IconPlus,
	IconSearch,
	IconSortAscending,
	IconTrash,
	IconTrendingUp,
} from "@tabler/icons-react";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { ListIcon } from "@/components/ui/list-icon";
import { useList } from "@/contexts/collection-context";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import type { List } from "@/lib/collection-storage";
import { getListItemCount, SYNTHETIC_LISTS } from "@/lib/collection-storage";
import { TYPOGRAPHY, UI } from "@/lib/constants";
import {
	collectionCard,
	collectionContent,
	statCard,
	statValue,
	statLabel,
	databaseStatIcon,
} from "@/styles/components.css";

// ============================================================================
// Types
// ============================================================================

interface ListCardData {
	id: string;
	name: string;
	description?: string;
	icon?: string;
	itemCount: number;
	isSystem?: boolean;
	modifiedAt: Date;
}

// ============================================================================
// Helper Components
// ============================================================================

function ListCardGrid({
	list,
	onEdit,
	onDelete,
}: {
	list: ListCardData;
	onEdit: (list: ListCardData) => void;
	onDelete: (list: ListCardData) => void;
}) {
	return (
		<Card
			p="lg"
			radius="md"
			className={collectionCard}
			withBorder={true}
			shadow="sm"
			style={{ transition: "all 0.2s ease", cursor: "pointer" }}
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
					<Avatar size={48} radius="md" bg="var(--mantine-color-blue-6)" color="white">
						<ListIcon icon={list.icon} size={24} />
					</Avatar>
					<Box style={{ flex: 1 }}>
						<Group gap="xs">
							<Text fw={TYPOGRAPHY.FONT_WEIGHT_MEDIUM} size="lg" lineClamp={1}>
								{list.name}
							</Text>
							{list.isSystem && (
								<Text size="xs" c="dimmed">(System)</Text>
							)}
						</Group>
						{list.description && (
							<Text size="sm" c="dimmed" lineClamp={2}>
								{list.description}
							</Text>
						)}
					</Box>
				</Group>

				{!list.isSystem && (
					<Menu shadow="md" width={200} position="bottom-end">
						<Menu.Target>
							<ActionIcon variant="subtle" color="gray">
								<IconDots size={UI.ICON_SIZE_SM} />
							</ActionIcon>
						</Menu.Target>

						<Menu.Dropdown>
							<Menu.Item
								leftSection={<IconEdit size={UI.ICON_SIZE_SM} />}
								onClick={() => { onEdit(list); }}
							>
								Edit List
							</Menu.Item>
							<Menu.Item leftSection={<IconDownload size={UI.ICON_SIZE_SM} />}>
								Export
							</Menu.Item>
							<Menu.Divider />
							<Menu.Item
								leftSection={<IconTrash size={UI.ICON_SIZE_SM} />}
								color="red"
								onClick={() => { onDelete(list); }}
							>
								Delete List
							</Menu.Item>
						</Menu.Dropdown>
					</Menu>
				)}
			</Group>

			<Box className={collectionContent}>
				<Group justify="space-between" align="center">
					<Box>
						<Text className={statValue}>{list.itemCount}</Text>
						<Text className={statLabel}>Items</Text>
					</Box>
					<Text size="xs" c="dimmed">
						Updated {list.modifiedAt.toLocaleDateString()}
					</Text>
				</Group>

				<Button
					component={Link}
					href={`/collection/${list.id}`}
					variant="light"
					size="sm"
					fullWidth={true}
					mt="md"
				>
					View List
				</Button>
			</Box>
		</Card>
	);
}

function ListCardList({
	list,
	onEdit,
	onDelete,
}: {
	list: ListCardData;
	onEdit: (list: ListCardData) => void;
	onDelete: (list: ListCardData) => void;
}) {
	return (
		<Card p="md" radius="md" withBorder={true} style={{ transition: "all 0.2s ease" }}>
			<Group align="center" justify="space-between">
				<Group align="center" style={{ flex: 1 }}>
					<Avatar size={40} radius="md" bg="var(--mantine-color-blue-6)" color="white">
						<ListIcon icon={list.icon} size={20} />
					</Avatar>
					<Box style={{ flex: 1, minWidth: 0 }}>
						<Group gap="xs">
							<Text fw={TYPOGRAPHY.FONT_WEIGHT_MEDIUM} size="lg" lineClamp={1}>
								{list.name}
							</Text>
							{list.isSystem && (
								<Text size="xs" c="dimmed">(System)</Text>
							)}
						</Group>
						{list.description && (
							<Text size="sm" c="dimmed" lineClamp={1}>
								{list.description}
							</Text>
						)}
					</Box>
				</Group>

				<Group align="center" gap="xl">
					<div style={{ textAlign: "center", minWidth: "80px" }}>
						<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>{list.itemCount}</Text>
						<Text size="xs" c="dimmed">Items</Text>
					</div>

					<Text size="xs" c="dimmed" style={{ minWidth: "100px" }}>
						Updated {list.modifiedAt.toLocaleDateString()}
					</Text>

					<Group gap="sm">
						<Button
							component={Link}
							href={`/collection/${list.id}`}
							variant="light"
							size="sm"
						>
							View
						</Button>
						{!list.isSystem && (
							<Menu shadow="md" width={200} position="bottom-end">
								<Menu.Target>
									<ActionIcon variant="subtle" color="gray">
										<IconDots size={UI.ICON_SIZE_SM} />
									</ActionIcon>
								</Menu.Target>

								<Menu.Dropdown>
									<Menu.Item
										leftSection={<IconEdit size={UI.ICON_SIZE_SM} />}
										onClick={() => { onEdit(list); }}
									>
										Edit List
									</Menu.Item>
									<Menu.Item leftSection={<IconDownload size={UI.ICON_SIZE_SM} />}>
										Export
									</Menu.Item>
									<Menu.Divider />
									<Menu.Item
										leftSection={<IconTrash size={UI.ICON_SIZE_SM} />}
										color="red"
										onClick={() => { onDelete(list); }}
									>
										Delete List
									</Menu.Item>
								</Menu.Dropdown>
							</Menu>
						)}
					</Group>
				</Group>
			</Group>
		</Card>
	);
}

function QuickStats({ listCount, totalItems }: { listCount: number; totalItems: number }) {
	return (
		<Card p="lg" radius="md" withBorder={true}>
			<Title order={3} mb="md">Quick Stats</Title>
			<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
				<div className={statCard}>
					<Group>
						<div className={databaseStatIcon}>
							<IconFolder size={UI.ICON_SIZE_LG} />
						</div>
						<div>
							<Text size="xs" c="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
								Total Lists
							</Text>
							<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
								{listCount}
							</Text>
						</div>
					</Group>
				</div>

				<div className={statCard}>
					<Group>
						<div className={databaseStatIcon}>
							<IconFolder size={UI.ICON_SIZE_LG} />
						</div>
						<div>
							<Text size="xs" c="dimmed" tt="uppercase" fw={TYPOGRAPHY.FONT_WEIGHT_BOLD}>
								Total Items
							</Text>
							<Text size="lg" fw={TYPOGRAPHY.FONT_WEIGHT_NORMAL}>
								{totalItems}
							</Text>
						</div>
					</Group>
				</div>
			</SimpleGrid>
		</Card>
	);
}

function LoadingSkeleton() {
	return (
		<>
			{Array.from({ length: 4 }).map((_, index) => (
				<Card key={index} p="lg" radius="md" withBorder={true}>
					<Group justify="space-between" mb="md">
						<Group>
							<Skeleton width={48} height={48} radius="md" />
							<Box>
								<Skeleton width={150} height={20} mb="xs" />
								<Skeleton width={200} height={14} />
							</Box>
						</Group>
					</Group>
					<Group justify="space-between" align="center">
						<Box>
							<Skeleton width={40} height={24} mb="xs" />
							<Skeleton width={60} height={12} />
						</Box>
						<Skeleton width={100} height={32} radius="sm" />
					</Group>
				</Card>
			))}
		</>
	);
}

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
					placeholder="Search lists..."
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
							{ value: "modifiedAt-desc", label: "Recently Updated" },
							{ value: "modifiedAt-asc", label: "Oldest Updated" },
						]}
						w={180}
					/>
				</Group>
			</Group>
		</Card>
	);
}

function EmptyState({ onCreateList }: { onCreateList: () => void }) {
	return (
		<Card p="xl" radius="md" withBorder={true} style={{ textAlign: "center" }}>
			<Stack gap="lg" align="center">
				<Avatar size={80} radius="md" bg="var(--mantine-color-gray-1)">
					<IconFolder size={48} color="var(--mantine-color-gray-4)" />
				</Avatar>
				<Box>
					<Title order={3} mb="sm">No Custom Lists Yet</Title>
					<Text size="lg" c="dimmed" mb="md">
						You have the default system lists. Create a custom list to organize items your way.
					</Text>
				</Box>
				<Button
					size="lg"
					leftSection={<IconPlus size={UI.ICON_SIZE_SM} />}
					onClick={onCreateList}
				>
					Create Custom List
				</Button>
			</Stack>
		</Card>
	);
}

// ============================================================================
// Main Page
// ============================================================================

export default function CollectionPage() {
	const { state, actions } = useList();
	const { preferences } = useUserPreferences();

	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [selectedList, setSelectedList] = useState<List | null>(null);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [sortBy, setSortBy] = useState("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [formData, setFormData] = useState({ name: "", description: "", icon: "" });
	const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

	// Load item counts for all lists
	useEffect(() => {
		async function loadCounts() {
			const counts: Record<string, number> = {};
			for (const list of state.lists) {
				counts[list.id] = await getListItemCount(list.id);
			}
			setItemCounts(counts);
		}
		if (state.lists.length > 0) {
			void loadCounts();
		}
	}, [state.lists]);

	const handleSortChange = useCallback((newSortBy: string, newSortOrder: "asc" | "desc") => {
		setSortBy(newSortBy);
		setSortOrder(newSortOrder);
	}, []);

	const handleCreateList = useCallback(async () => {
		await actions.createList(formData.name, formData.description, formData.icon || undefined);
		setCreateModalOpen(false);
		setFormData({ name: "", description: "", icon: "" });
	}, [actions, formData]);

	const handleUpdateList = useCallback(async () => {
		if (!selectedList) return;
		await actions.updateList(selectedList.id, {
			name: formData.name,
			description: formData.description,
			icon: formData.icon || undefined,
		});
		setEditModalOpen(false);
		setSelectedList(null);
		setFormData({ name: "", description: "", icon: "" });
	}, [actions, formData, selectedList]);

	const handleDeleteList = useCallback(async () => {
		if (!selectedList) return;
		await actions.deleteList(selectedList.id);
		setDeleteModalOpen(false);
		setSelectedList(null);
	}, [actions, selectedList]);

	const openEditModal = useCallback((list: ListCardData) => {
		const fullList = state.lists.find(l => l.id === list.id);
		if (fullList) {
			setSelectedList(fullList);
			setFormData({
				name: fullList.name,
				description: fullList.description ?? "",
				icon: fullList.icon ?? "",
			});
			setEditModalOpen(true);
		}
	}, [state.lists]);

	const openDeleteModal = useCallback((list: ListCardData) => {
		const fullList = state.lists.find(l => l.id === list.id);
		if (fullList) {
			setSelectedList(fullList);
			setDeleteModalOpen(true);
		}
	}, [state.lists]);

	// Filter and sort lists
	const filteredAndSortedLists = useMemo(() => {
		let filtered = state.lists;

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(list =>
				list.name.toLowerCase().includes(query) ||
				(list.description?.toLowerCase().includes(query) ?? false),
			);
		}

		return filtered.toSorted((a, b) => {
			let aValue: string | number | Date;
			let bValue: string | number | Date;

			switch (sortBy) {
				case "name": {
					aValue = a.name.toLowerCase();
					bValue = b.name.toLowerCase();
					break;
				}
				case "modifiedAt": {
					aValue = a.modifiedAt;
					bValue = b.modifiedAt;
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
	}, [state.lists, searchQuery, sortBy, sortOrder]);

	// Convert to card data
	const listCardData: ListCardData[] = useMemo(() =>
		filteredAndSortedLists.map(list => ({
			id: list.id,
			name: list.name,
			description: list.description,
			icon: list.icon,
			itemCount: itemCounts[list.id] ?? 0,
			isSystem: list.isSystem,
			modifiedAt: list.modifiedAt,
		})),
	[filteredAndSortedLists, itemCounts]);

	const totalItems = useMemo(() =>
		Object.values(itemCounts).reduce((sum, count) => sum + count, 0),
	[itemCounts]);

	// Infinite scroll
	const {
		visibleItems: visibleLists,
		hasMore,
		isLoading: isLoadingMore,
		loadMore,
		lastItemRef,
	} = useInfiniteScroll({
		items: listCardData,
		itemsPerPage: preferences.infiniteScrollPageSize,
		autoLoad: preferences.autoLoadInfiniteScroll,
	});

	const ListsContainer = viewMode === "grid" ? SimpleGrid : Stack;
	const hasCustomLists = state.lists.some(l => !l.isSystem);

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Header */}
				<Box>
					<Group justify="space-between" align="flex-start">
						<Box>
							<Title order={1} mb="sm">My Lists</Title>
							<Text size="lg" c="dimmed">
								Organize your items into lists
							</Text>
						</Box>
						<Button
							size="lg"
							leftSection={<IconPlus size={UI.ICON_SIZE_SM} />}
							onClick={() => { setCreateModalOpen(true); }}
						>
							New List
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
					<Text size="sm">Lists</Text>
				</Breadcrumbs>

				{/* Quick Stats */}
				{!state.loading && (
					<QuickStats
						listCount={state.lists.length + SYNTHETIC_LISTS.length}
						totalItems={totalItems}
					/>
				)}

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

				{/* Lists Display */}
				<Box>
					<Title order={2} mb="md">
						{searchQuery
							? `Search Results (${filteredAndSortedLists.length})`
							: `Your Lists (${filteredAndSortedLists.length})`}
					</Title>

					{state.loading ? (
						<ListsContainer
							{...(viewMode === "grid"
								? { cols: { base: 1, sm: 2, lg: 4 }, spacing: "lg" }
								: { gap: "md" })}
						>
							<LoadingSkeleton />
						</ListsContainer>
					) : filteredAndSortedLists.length > 0 ? (
						<>
							<ListsContainer
								{...(viewMode === "grid"
									? { cols: { base: 1, sm: 2, lg: 4 }, spacing: "lg" }
									: { gap: "md" })}
							>
								{visibleLists.map((list, index) => {
									const isLast = index === visibleLists.length - 1;
									return viewMode === "grid" ? (
										<div key={list.id} ref={isLast ? lastItemRef : undefined}>
											<ListCardGrid
												list={list}
												onEdit={openEditModal}
												onDelete={openDeleteModal}
											/>
										</div>
									) : (
										<div key={list.id} ref={isLast ? lastItemRef : undefined}>
											<ListCardList
												list={list}
												onEdit={openEditModal}
												onDelete={openDeleteModal}
											/>
										</div>
									);
								})}
							</ListsContainer>

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
									<Title order={3} mb="sm">No Lists Found</Title>
									<Text size="lg" c="dimmed">
										No lists match &quot;{searchQuery}&quot;
									</Text>
								</Box>
								<Button variant="light" onClick={() => { setSearchQuery(""); }}>
									Clear Search
								</Button>
							</Stack>
						</Card>
					) : hasCustomLists ? null : (
						<EmptyState onCreateList={() => { setCreateModalOpen(true); }} />
					)}
				</Box>

				{/* Create List Modal */}
				<Modal
					opened={createModalOpen}
					onClose={() => { setCreateModalOpen(false); }}
					title="Create New List"
					size="md"
				>
					<Stack gap="md">
						<TextInput
							label="List Name"
							placeholder="Enter list name"
							value={formData.name}
							onChange={(e) => { setFormData({ ...formData, name: e.target.value }); }}
							required={true}
						/>
						<TextInput
							label="Icon (Optional)"
							placeholder="Enter an emoji, e.g. ⭐"
							value={formData.icon}
							onChange={(e) => { setFormData({ ...formData, icon: e.target.value }); }}
						/>
						<Textarea
							label="Description (Optional)"
							placeholder="Add a description"
							value={formData.description}
							onChange={(e) => { setFormData({ ...formData, description: e.target.value }); }}
							minRows={3}
						/>
						<Group justify="flex-end" gap="sm">
							<Button variant="light" onClick={() => { setCreateModalOpen(false); }}>
								Cancel
							</Button>
							<Button
								onClick={() => void handleCreateList()}
								disabled={!formData.name.trim()}
							>
								Create List
							</Button>
						</Group>
					</Stack>
				</Modal>

				{/* Edit List Modal */}
				<Modal
					opened={editModalOpen}
					onClose={() => { setEditModalOpen(false); }}
					title="Edit List"
					size="md"
				>
					<Stack gap="md">
						<TextInput
							label="List Name"
							placeholder="Enter list name"
							value={formData.name}
							onChange={(e) => { setFormData({ ...formData, name: e.target.value }); }}
							required={true}
						/>
						<TextInput
							label="Icon (Optional)"
							placeholder="Enter an emoji, e.g. ⭐"
							value={formData.icon}
							onChange={(e) => { setFormData({ ...formData, icon: e.target.value }); }}
						/>
						<Textarea
							label="Description (Optional)"
							placeholder="Add a description"
							value={formData.description}
							onChange={(e) => { setFormData({ ...formData, description: e.target.value }); }}
							minRows={3}
						/>
						<Group justify="flex-end" gap="sm">
							<Button variant="light" onClick={() => { setEditModalOpen(false); }}>
								Cancel
							</Button>
							<Button
								onClick={() => void handleUpdateList()}
								disabled={!formData.name.trim()}
							>
								Update List
							</Button>
						</Group>
					</Stack>
				</Modal>

				{/* Delete Confirmation Modal */}
				<Modal
					opened={deleteModalOpen}
					onClose={() => { setDeleteModalOpen(false); }}
					title="Delete List"
					size="sm"
				>
					<Stack gap="md">
						<Text>
							Are you sure you want to delete &quot;{selectedList?.name}&quot;?
						</Text>
						<Text size="sm" c="dimmed">
							Items will be removed from this list but not deleted from other lists.
						</Text>
						<Group justify="flex-end" gap="sm">
							<Button variant="light" onClick={() => { setDeleteModalOpen(false); }}>
								Cancel
							</Button>
							<Button color="red" onClick={() => void handleDeleteList()}>
								Delete List
							</Button>
						</Group>
					</Stack>
				</Modal>
			</Stack>
		</Container>
	);
}
