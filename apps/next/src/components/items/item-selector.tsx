"use client";

import { type Item, getNodeDisplayName, getNodePrimaryGrade, resolveCdnUrl } from "@hobby-ninja/data";
import {
	Badge,
	Box,
	Button,
	Card,
	Checkbox,
	Group,
	Modal,
	ScrollArea,
	Stack,
	Table,
	Text,
	ActionIcon,
} from "@mantine/core";
import {
	IconGitCompare,
	IconX,
} from "@tabler/icons-react";
import { useState } from "react";

import { CustomImage } from "@/components/ui/custom-image";
import { EntityList } from "@/components/ui/entity-list";
import { createPlaceholderSvg } from "@/lib/image-placeholders";

interface ItemSelectorProps {
  items: Item[];
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  maxSelection?: number;
}

interface ComparisonModalProps {
  items: Item[];
  opened: boolean;
  onClose: () => void;
}

// Item comparison modal
function ComparisonModal({ items, opened, onClose }: ComparisonModalProps) {
	if (items.length === 0) return null;

	const comparisonItems = items.slice(0, 5); // Limit to 5 items for better UX

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title="Compare Items"
			size="xl"
			scrollAreaComponent={ScrollArea.Autosize}
		>
			<Stack gap="md">
				<Text size="sm" c="dimmed">
          Comparing {comparisonItems.length} items side by side
				</Text>

				<Box miw={600}>
					<Table striped={true} highlightOnHover={true}>
						<Table.Thead>
							<Table.Tr>
								<Table.Th w={150}>Feature</Table.Th>
								{comparisonItems.map((item) => (
									<Table.Th key={item.id} ta="center">
										<Stack gap="xs" align="center" miw={120}>
											<CustomImage
												src={item.displayImage ? resolveCdnUrl(item.displayImage) : createPlaceholderSvg(getNodeDisplayName(item))}
												alt={getNodeDisplayName(item)}
												width={60}
												height={60}
												fit="cover"
												style={{ borderRadius: "4px" }}
											/>
											<Text size="xs" fw={500} lineClamp={2}>
												{getNodeDisplayName(item)}
											</Text>
										</Stack>
									</Table.Th>
								))}
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{/* Name Row */}
							<Table.Tr>
								<Table.Td fw={500}>Name</Table.Td>
								{comparisonItems.map((item) => (
									<Table.Td key={`name-${item.id}`} ta="center">
										<Text size="sm">{getNodeDisplayName(item)}</Text>
									</Table.Td>
								))}
							</Table.Tr>

							{/* Series Row */}
							<Table.Tr>
								<Table.Td fw={500}>Series</Table.Td>
								{comparisonItems.map((item) => (
									<Table.Td key={`series-${item.id}`} ta="center">
										<EntityList ids={item.series.map(s => s.id)} entityType="series" size="sm" />
									</Table.Td>
								))}
							</Table.Tr>

							{/* Brand Row */}
							<Table.Tr>
								<Table.Td fw={500}>Brand</Table.Td>
								{comparisonItems.map((item) => (
									<Table.Td key={`brand-${item.id}`} ta="center">
										<EntityList ids={item.brands.map(b => b.id)} entityType="brand" size="sm" />
									</Table.Td>
								))}
							</Table.Tr>

							{/* Grade Row */}
							<Table.Tr>
								<Table.Td fw={500}>Grade</Table.Td>
								{comparisonItems.map((item) => (
									<Table.Td key={`grade-${item.id}`} ta="center">
										{getNodePrimaryGrade(item) ? (
											<Badge size="sm" variant="light">{getNodePrimaryGrade(item)}</Badge>
										) : (
											"-"
										)}
									</Table.Td>
								))}
							</Table.Tr>

							{/* Scale Row */}
							<Table.Tr>
								<Table.Td fw={500}>Scale</Table.Td>
								{comparisonItems.map((item) => (
									<Table.Td key={`scale-${item.id}`} ta="center">
										<Text size="sm">{item.scale ?? "-"}</Text>
									</Table.Td>
								))}
							</Table.Tr>

							{/* Category Row */}
							<Table.Tr>
								<Table.Td fw={500}>Category</Table.Td>
								{comparisonItems.map((item) => (
									<Table.Td key={`category-${item.id}`} ta="center">
										<EntityList ids={item.categories.map(c => c.id)} entityType="category" size="sm" />
									</Table.Td>
								))}
							</Table.Tr>

							{/* Price Row */}
							<Table.Tr>
								<Table.Td fw={500}>Price</Table.Td>
								{comparisonItems.map((item) => (
									<Table.Td key={`price-${item.id}`} ta="center">
										<Text size="sm">
											{item.price?.amount ? `¥${item.price.amount.toLocaleString()}` : "-"}
										</Text>
									</Table.Td>
								))}
							</Table.Tr>

							{/* Release Date Row */}
							<Table.Tr>
								<Table.Td fw={500}>Release Date</Table.Td>
								{comparisonItems.map((item) => (
									<Table.Td key={`date-${item.id}`} ta="center">
										<Text size="sm">{item.releaseDate?.ja ?? "-"}</Text>
									</Table.Td>
								))}
							</Table.Tr>
						</Table.Tbody>
					</Table>
				</Box>

				<Group justify="flex-end">
					<Button onClick={onClose}>Close</Button>
				</Group>
			</Stack>
		</Modal>
	);
}

// Bulk selection controls
export function ItemSelector({ items, selectedItems, onSelectionChange, maxSelection = 10 }: ItemSelectorProps) {
	const [comparisonModalOpen, setComparisonModalOpen] = useState(false);

	const handleToggleSelection = (itemId: string) => {
		if (selectedItems.includes(itemId)) {
			onSelectionChange(selectedItems.filter(id => id !== itemId));
		} else if (selectedItems.length < maxSelection) {
			onSelectionChange([...selectedItems, itemId]);
		}
	};

	const handleSelectAll = () => {
		if (selectedItems.length === items.length) {
			onSelectionChange([]);
		} else {
			onSelectionChange(items.slice(0, maxSelection).map(item => item.id));
		}
	};

	const selectedItemsData = items.filter(item => selectedItems.includes(item.id));

	return (
		<>
			<Card p="md" radius="md" withBorder={selectedItems.length > 0}>
				<Group justify="space-between">
					<Group gap="md">
						<Checkbox
							label="Select all"
							checked={selectedItems.length === items.length && items.length > 0}
							indeterminate={selectedItems.length > 0 && selectedItems.length < items.length}
							onChange={handleSelectAll}
						/>

						{selectedItems.length > 0 && (
							<Text size="sm" c="dimmed">
								{selectedItems.length} selected
								{maxSelection && ` (max ${maxSelection})`}
							</Text>
						)}
					</Group>

					{selectedItems.length > 1 && (
						<Button
							size="sm"
							variant="light"
							leftSection={<IconGitCompare size={14} />}
							onClick={() => { setComparisonModalOpen(true); }}
						>
              Compare ({selectedItems.length})
						</Button>
					)}
				</Group>

				{selectedItems.length > 0 && (
					<Group gap="xs" mt="sm" wrap="wrap">
						{selectedItemsData.map((item) => (
							<Badge
								key={item.id}
								size="sm"
								variant="light"
								rightSection={
									<ActionIcon
										size="xs"
										variant="transparent"
										onClick={() => { handleToggleSelection(item.id); }}
									>
										<IconX size={8} />
									</ActionIcon>
								}
							>
								{getNodeDisplayName(item)}
							</Badge>
						))}
					</Group>
				)}
			</Card>

			<ComparisonModal
				items={selectedItemsData}
				opened={comparisonModalOpen}
				onClose={() => { setComparisonModalOpen(false); }}
			/>
		</>
	);
}

// Enhanced item card with selection checkbox
interface SelectableItemCardProps {
  item: Item;
  isSelected: boolean;
  onToggleSelection: () => void;
  viewMode: "grid" | "list" | "table";
}

export function SelectableItemCard({
	item,
	isSelected,
	onToggleSelection,
	viewMode,
}: SelectableItemCardProps) {
	const primaryImage = item.displayImage ? resolveCdnUrl(item.displayImage) : null;
	const placeholderSrc = createPlaceholderSvg(getNodeDisplayName(item));

	if (viewMode === "table") {
		return (
			<Table.Tr>
				<Table.Td>
					<Checkbox
						checked={isSelected}
						onChange={onToggleSelection}
						onClick={(e) => { e.stopPropagation(); }}
					/>
				</Table.Td>
				<Table.Td>
					<Box
						component="a"
						href={`/items/${item.id}`}
						style={{ textDecoration: "none", color: "inherit", display: "block" }}
						onClick={(e) => { e.stopPropagation(); }}
					>
						<Group gap="sm" align="center">
							<CustomImage
								src={primaryImage ?? placeholderSrc}
								alt={getNodeDisplayName(item)}
								width={40}
								height={40}
								fit="cover"
								style={{ borderRadius: "var(--mantine-radius-sm)" }}
							/>
							<Text size="sm" fw={500}>
								{getNodeDisplayName(item)}
							</Text>
						</Group>
					</Box>
				</Table.Td>
				<Table.Td><EntityList ids={item.series.map(s => s.id)} entityType="series" size="sm" /></Table.Td>
				<Table.Td>{getNodePrimaryGrade(item) ?? "-"}</Table.Td>
				<Table.Td>{item.scale ?? "-"}</Table.Td>
				<Table.Td>
					<EntityList ids={item.brands.map(b => b.id)} entityType="brand" size="sm" />
				</Table.Td>
			</Table.Tr>
		);
	}

	return (
		<Card
			component="a"
			href={`/items/${item.id}`}
			p={0}
			radius="md"
			withBorder={true}
			pos="relative"
			style={{ textDecoration: "none", color: "inherit" }}
		>
			{/* Selection Checkbox */}
			<Box
				pos="absolute"
				top={8}
				left={8}
				style={{ zIndex: 1 }}
				onClick={(e) => { e.preventDefault(); }}
			>
				<Checkbox
					checked={isSelected}
					onChange={onToggleSelection}
					size="sm"
					styles={{
						input: { backgroundColor: "var(--mantine-color-body)" },
					}}
				/>
			</Box>

			<Box w="100%" h={200}>
				<CustomImage
					src={primaryImage ?? placeholderSrc}
					alt={getNodeDisplayName(item)}
					width={300}
					height={200}
					fit="cover"
					style={{ width: "100%" }}
				/>
			</Box>

			<Box p="md">
				<Text size="sm" fw={500} lineClamp={2}>
					{getNodeDisplayName(item)}
				</Text>
				{item.series.length > 0 && (
					<Box mt={2}>
						<EntityList ids={item.series.map(s => s.id)} entityType="series" mode="text" size="xs" emptyText="" />
					</Box>
				)}
				<Group gap={4} mt={8} wrap="wrap">
					{getNodePrimaryGrade(item) && (
						<Badge size="xs" variant="light">{getNodePrimaryGrade(item)}</Badge>
					)}
					{item.scale && (
						<Badge size="xs" variant="light">{item.scale}</Badge>
					)}
					<EntityList ids={item.brands.map(b => b.id)} entityType="brand" size="xs" clickable={false} />
				</Group>
			</Box>
		</Card>
	);
}
