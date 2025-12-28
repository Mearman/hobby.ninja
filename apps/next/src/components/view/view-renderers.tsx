"use client";

import { type Item, getNodeDisplayName, getNodePrimaryGrade, getNodeReleaseDate, isItem, resolveCdnUrl } from "@hobby-ninja/data";
import {
	Badge,
	Box,
	Card,
	Group,
	SimpleGrid,
	Stack,
	Table,
	Text,
	Title,
} from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";

import { ViewMode } from "./view-switcher";

import { CustomImage } from "@/components/ui/custom-image";
import { EntityList } from "@/components/ui/entity-list";
import { createPlaceholderSvg, createErrorPlaceholderSvg } from "@/lib/image-placeholders";
import {
	itemCard,
	itemCardBadge,
	itemCardImage,
	itemCardContent,
	itemCardMetadata,
	itemCardSubtitle,
	itemCardTitle,
} from "@/styles/components.css";

// Number of items to prioritize loading (above the fold in typical viewport)
const PRIORITY_ITEM_COUNT = 8;

// Common item card component used in grid and list views
function ItemCard({ item, priority = false }: { item: Item; priority?: boolean }) {
	if (!isItem(item)) return null;

	const primaryImage = item.displayImage ? resolveCdnUrl(item.displayImage) : null;
	const placeholderSrc = createPlaceholderSvg(getNodeDisplayName(item));
	const errorPlaceholderSrc = createErrorPlaceholderSvg();
	const releaseDate = getNodeReleaseDate(item);

	return (
		<Card
			component="a"
			href={`/items/${item.id}`}
			p={0}
			radius="md"
			className={itemCard}
			withBorder={true}
		>
			<Box className={itemCardImage}>
				<CustomImage
					src={primaryImage ?? placeholderSrc}
					alt={getNodeDisplayName(item)}
					fit="cover"
					height={200}
					fallbackSrc={errorPlaceholderSrc}
					priority={priority}
					onError={(e) => {
						e.currentTarget.src = errorPlaceholderSrc;
					}}
				/>
			</Box>
			<Box className={itemCardContent}>
				<Text className={itemCardTitle} lineClamp={2}>
					{getNodeDisplayName(item)}
				</Text>
				{item.series.length > 0 && (
					<Text className={itemCardSubtitle} lineClamp={1}>
						<EntityList ids={item.series.map(s => s.id)} entityType="series" mode="text" size="xs" emptyText="" />
					</Text>
				)}
				<Box className={itemCardMetadata}>
					{releaseDate && (
						<Badge className={itemCardBadge} variant="light" color="gray">
							{releaseDate}
						</Badge>
					)}
					{getNodePrimaryGrade(item) && (
						<Badge className={itemCardBadge} variant="light">
							{getNodePrimaryGrade(item)}
						</Badge>
					)}
					{item.scales.map(scale => (
						<Badge key={scale} className={itemCardBadge} variant="light">
							{scale}
						</Badge>
					))}
					<EntityList ids={item.brands.map(b => b.id)} entityType="brand" size="xs" clickable={false} />
				</Box>
			</Box>
		</Card>
	);
}

// Grid View - current implementation with SimpleGrid
export function GridView({ items }: { items: Item[] }) {
	if (items.length === 0) {
		return <EmptyState view="grid" />;
	}

	return (
		<SimpleGrid
			cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
			spacing="md"
		>
			{items.filter((item): item is Item => isItem(item)).map((item, index) => (
				<ItemCard key={item.id} item={item} priority={index < PRIORITY_ITEM_COUNT} />
			))}
		</SimpleGrid>
	);
}

// List View - single column layout with more details
export function ListView({ items }: { items: Item[] }) {
	if (items.length === 0) {
		return <EmptyState view="list" />;
	}

	return (
		<Stack gap="md">
			{items.filter((item): item is Item => isItem(item)).map((item, index) => {
				const releaseDate = getNodeReleaseDate(item);
				return (
					<Card
						key={item.id}
						component="a"
						href={`/items/${item.id}`}
						p="md"
						radius="md"
						withBorder={true}
						style={{ textDecoration: "none", color: "inherit" }}
					>
						<Group gap="md" align="flex-start">
							<Box w={80} style={{ flexShrink: 0 }}>
								<CustomImage
									src={item.displayImage ? resolveCdnUrl(item.displayImage) : createPlaceholderSvg(getNodeDisplayName(item))}
									alt={getNodeDisplayName(item)}
									fit="cover"
									height={80}
									priority={index < PRIORITY_ITEM_COUNT}
									fallbackSrc={createErrorPlaceholderSvg()}
								/>
							</Box>
							<Box flex={1}>
								<Title order={4} mb="xs">
									{getNodeDisplayName(item)}
								</Title>
								{item.series.length > 0 && (
									<Box mb="sm">
										<EntityList ids={item.series.map(s => s.id)} entityType="series" mode="text" size="sm" emptyText="" />
									</Box>
								)}
								<Group gap="xs">
									{releaseDate && (
										<Badge variant="light" size="sm" color="gray">
											{releaseDate}
										</Badge>
									)}
									{getNodePrimaryGrade(item) && (
										<Badge variant="light" size="sm">
											{getNodePrimaryGrade(item)}
										</Badge>
									)}
									{item.scales.map(scale => (
										<Badge key={scale} variant="light" size="sm">
											{scale}
										</Badge>
									))}
									<EntityList ids={item.brands.map(b => b.id)} entityType="brand" size="sm" clickable={false} />
								</Group>
							</Box>
						</Group>
					</Card>
				);
			})}
		</Stack>
	);
}

// Table View - structured data display
export function TableView({ items }: { items: Item[] }) {
	if (items.length === 0) {
		return <EmptyState view="table" />;
	}

	const validItems: Item[] = items.filter((item): item is Item => isItem(item));

	const rows = validItems.map((item, index) => {
		const releaseDate = getNodeReleaseDate(item);
		return (
			<Table.Tr key={item.id}>
				<Table.Td>
					<Box
						component="a"
						href={`/items/${item.id}`}
						style={{ textDecoration: "none", color: "inherit", display: "block" }}
					>
						<Group gap="sm" align="center">
							<Box w={40} h={40}>
								<CustomImage
									src={item.displayImage ? resolveCdnUrl(item.displayImage) : createPlaceholderSvg(getNodeDisplayName(item))}
									alt={getNodeDisplayName(item)}
									fit="cover"
									height={40}
									priority={index < PRIORITY_ITEM_COUNT}
									fallbackSrc={createErrorPlaceholderSvg()}
								/>
							</Box>
							<Text size="sm" fw={500}>
								{getNodeDisplayName(item)}
							</Text>
						</Group>
					</Box>
				</Table.Td>
				<Table.Td c="dimmed">{releaseDate ?? "-"}</Table.Td>
				<Table.Td><EntityList ids={item.series.map(s => s.id)} entityType="series" size="sm" /></Table.Td>
				<Table.Td>{getNodePrimaryGrade(item) ?? "-"}</Table.Td>
				<Table.Td>{item.scales.length > 0 ? item.scales.join(", ") : "-"}</Table.Td>
				<Table.Td>
					<EntityList ids={item.brands.map(b => b.id)} entityType="brand" size="sm" />
				</Table.Td>
			</Table.Tr>
		);
	});

	return (
		<Box>
			<Table striped={true} highlightOnHover={true}>
				<Table.Thead>
					<Table.Tr>
						<Table.Th>Name</Table.Th>
						<Table.Th>Released</Table.Th>
						<Table.Th>Series</Table.Th>
						<Table.Th>Grade</Table.Th>
						<Table.Th>Scale</Table.Th>
						<Table.Th>Brand</Table.Th>
					</Table.Tr>
				</Table.Thead>
				<Table.Tbody>{rows}</Table.Tbody>
			</Table>
		</Box>
	);
}

// Empty state component for all views
function EmptyState({ view }: { view: ViewMode }) {
	const isCompact = view === "table";

	return (
		<Box ta="center" py="xl">
			<IconFolder
				size={isCompact ? 48 : 64}
				color="var(--mantine-color-gray-4)"
				style={{ margin: "0 auto" }}
			/>
			<Title order={3} mt="md" mb="sm">
				No items found
			</Title>
			<Text c="dimmed">
				Try adjusting your search or filters to find what you&apos;re looking for.
			</Text>
		</Box>
	);
}

// Main view renderer component
interface ViewRendererProps {
  viewMode: ViewMode;
  items: Item[];
}

export function ViewRenderer({ viewMode, items }: ViewRendererProps) {
	switch (viewMode) {
		case "grid": {
			return <GridView items={items} />;
		}
		case "list": {
			return <ListView items={items} />;
		}
		case "table": {
			return <TableView items={items} />;
		}
		default: {
			// Fallback to grid view
			return <GridView items={items} />;
		}
	}
}
