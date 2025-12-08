/**
 * Related Nodes Grid Component
 *
 * Displays a grid of related graph nodes with navigation links.
 * Supports filtering, sorting, and type-aware display for different node relationships.
 */

import { Grid, Card, Text, Group, Badge, Anchor, Avatar, SimpleGrid, Stack, Title } from "@mantine/core";
import {
	IconPackage,
	IconTag,
	IconFileText,
	IconBooks,
	IconBuildingFactory,
	IconExternalLink,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { GraphNode } from "../../utils/graph-client";

interface RelatedNodesGridProps {
	nodes: GraphNode[];
	currentNodeType?: string;
	maxVisible?: number;
	showAll?: boolean;
}

/**
 * Icon and color mapping for different node types
 */
const NodeTypeConfig = {
	brand: {
		icon: IconBuildingFactory,
		color: "blue" as const,
		label: "Brand",
	},
	category: {
		icon: IconTag,
		color: "green" as const,
		label: "Category",
	},
	item: {
		icon: IconPackage,
		color: "orange" as const,
		label: "Item",
	},
	manual: {
		icon: IconFileText,
		color: "purple" as const,
		label: "Manual",
	},
	series: {
		icon: IconBooks,
		color: "pink" as const,
		label: "Series",
	},
} as const;

/**
 * Individual node card component
 */
function NodeCard({ node, currentNodeType }: { node: GraphNode; currentNodeType?: string }) {
	const config = (NodeTypeConfig as any)[node.type];
	const IconComponent = config.icon;
	const displayName = node.name?.en || node.name?.ja || node.id;

	return (
		<Card
			shadow="sm"
			padding="sm"
			radius="md"
			withBorder={true}
			h="100%"
			style={{ cursor: "pointer" }}
			component={Link}
			to={`/${node.type}/${node.id}`}
		>
			<Stack gap="xs">
				{/* Header with icon and name */}
				<Group justify="space-between" wrap="nowrap">
					<Group gap="xs" wrap="nowrap">
						<Avatar size="sm" color={config.color} variant="light">
							<IconComponent size={14} />
						</Avatar>
						<Text size="sm" fw={600} lineClamp={1}>
							{displayName}
						</Text>
					</Group>
					<IconExternalLink size={12} color="var(--mantine-color-dimmed)" />
				</Group>

				{/* Type badge */}
				<Badge
					color={config.color}
					variant="light"
					size="xs"
					w="fit-content"
				>
					{config.label}
				</Badge>

				{/* Japanese name (if different from English) */}
				{node.name?.ja && node.name?.en && node.name.ja !== node.name.en && (
					<Text size="xs" c="dimmed" lineClamp={1}>
						{node.name.ja}
					</Text>
				)}

				{/* Additional metadata based on node type */}
				{node.type === "item" && node.data["price"] && (
					<Text size="xs" c="blue">
						¥{Number(node.data["price"]).toLocaleString()}
					</Text>
				)}

				{node.type === "manual" && node.data["pages"] && (
					<Text size="xs" c="dimmed">
						{node.data["pages"]} pages
					</Text>
				)}

				{node.type === "series" && node.data["episodes"] && (
					<Text size="xs" c="dimmed">
						{node.data["episodes"]} episodes
					</Text>
				)}

				{node.type === "category" && node.data["itemCount"] !== undefined && (
					<Text size="xs" c="dimmed">
						{Number(node.data["itemCount"]).toLocaleString()} items
					</Text>
				)}

				{/* Differentiation from current node */}
				{currentNodeType && node.type === currentNodeType && (
					<Text size="xs" c="yellow.6">
						Same type
					</Text>
				)}
			</Stack>
		</Card>
	);
}

/**
 * Empty state when no related nodes found
 */
function EmptyState() {
	return (
		<Stack align="center" py="xl">
			<Text color="dimmed" size="sm">
				No related nodes found
			</Text>
			<Text color="dimmed" size="xs">
				This node doesn't have any connections in the graph
			</Text>
		</Stack>
	);
}

/**
 * Filter and sort nodes by relevance and type
 */
function filterAndSortNodes(
	nodes: GraphNode[],
	currentNodeType?: string,
	maxVisible?: number,
): GraphNode[] {
	// Filter out nodes of the same type as current (optional)
	const filteredNodes = currentNodeType
		? nodes.filter(node => node.type !== currentNodeType)
		: nodes;

	// Sort by priority: different types first, then by name
	const sortedNodes = filteredNodes.sort((a, b) => {
		// Different types get priority
		if (currentNodeType) {
			const aDifferentType = a.type === currentNodeType ? 1 : 0;
			const bDifferentType = b.type === currentNodeType ? 1 : 0;
			if (aDifferentType !== bDifferentType) {
				return aDifferentType - bDifferentType;
			}
		}

		// Then sort by type name
		const typeCompare = a.type.localeCompare(b.type);
		if (typeCompare !== 0) return typeCompare;

		// Finally sort by display name
		const aName = a.name?.en || a.name?.ja || a.id;
		const bName = b.name?.en || b.name?.ja || b.id;
		return aName.localeCompare(bName);
	});

	// Apply max visible limit
	return maxVisible ? sortedNodes.slice(0, maxVisible) : sortedNodes;
}

/**
 * Group nodes by type for organized display
 */
function groupNodesByType(nodes: GraphNode[]): Record<string, GraphNode[]> {
	return nodes.reduce<Record<string, GraphNode[]>>((groups, node) => {
		if (!groups[node.type]) {
			groups[node.type] = [];
		}
		groups[node.type].push(node);
		return groups;
	}, {});
}

/**
 * Main RelatedNodesGrid component
 */
export function RelatedNodesGrid({
	nodes,
	currentNodeType,
	maxVisible = 12,
	showAll = false,
}: RelatedNodesGridProps) {
	const filteredNodes = filterAndSortNodes(nodes, currentNodeType, showAll ? undefined : maxVisible);
	const hasMoreNodes = nodes.length > filteredNodes.length;

	if (filteredNodes.length === 0) {
		return <EmptyState />;
	}

	// Decide whether to show grouped or flat view
	const shouldGroup = filteredNodes.length > 6 && !showAll;

	if (shouldGroup) {
		const groupedNodes = groupNodesByType(filteredNodes);

		return (
			<Stack gap="md">
				{Object.entries(groupedNodes).map(([nodeType, typeNodes]) => {
					const config = NodeTypeConfig[nodeType as keyof typeof NodeTypeConfig];
					const IconComponent = config.icon;

					return (
						<Stack key={nodeType} gap="sm">
							<Title order={6}>
								<Group gap="xs">
									<IconComponent size={16} color={config.color} />
									<Text>
										{config.label}s ({typeNodes.length})
									</Text>
								</Group>
							</Title>

							<SimpleGrid
								cols={{ base: 1, sm: 2, md: 3 }}
								spacing="sm"
							>
								{typeNodes.map((node) => (
									<NodeCard
										key={`${node.type}-${node.id}`}
										node={node}
										currentNodeType={currentNodeType}
									/>
								))}
							</SimpleGrid>
						</Stack>
					);
				})}

				{hasMoreNodes && (
					<Anchor
						component={Link}
						to="/"
						size="sm"
						ta="center"
					>
						See all {nodes.length} related nodes →
					</Anchor>
				)}
			</Stack>
		);
	}

	// Flat grid view
	return (
		<Stack gap="md">
			<SimpleGrid
				cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
				spacing="sm"
			>
				{filteredNodes.map((node) => (
					<NodeCard
						key={`${node.type}-${node.id}`}
						node={node}
						currentNodeType={currentNodeType}
					/>
				))}
			</SimpleGrid>

			{hasMoreNodes && (
				<Anchor
					component={Link}
					to="/"
					size="sm"
					ta="center"
				>
					See all {nodes.length} related nodes →
				</Anchor>
			)}
		</Stack>
	);
}

/**
 * Compact version for sidebar display
 */
export function RelatedNodesCompact({
	nodes,
	currentNodeType,
	maxVisible = 5,
}: Omit<RelatedNodesGridProps, "showAll">) {
	const filteredNodes = filterAndSortNodes(nodes, currentNodeType, maxVisible);

	if (filteredNodes.length === 0) {
		return null;
	}

	return (
		<Stack gap="xs">
			{filteredNodes.map((node) => {
				const config = (NodeTypeConfig as any)[node.type];
				const IconComponent = config.icon;
				const displayName = node.name?.en || node.name?.ja || node.id;

				return (
					<Anchor
						key={`${node.type}-${node.id}`}
						component={Link}
						to={`/${node.type}/${node.id}`}
						size="sm"
						lineClamp={1}
					>
						<Group gap="xs" wrap="nowrap">
							<IconComponent size={12} color={config.color} />
							<Text size="xs" span={true} flex={1} lineClamp={1}>
								{displayName}
							</Text>
							<Badge
								color={config.color}
								variant="light"
								size="xs"
							>
								{config.label}
							</Badge>
						</Group>
					</Anchor>
				);
			})}

			{nodes.length > filteredNodes.length && (
				<Text size="xs" c="dimmed" ta="center">
					...and {nodes.length - filteredNodes.length} more
				</Text>
			)}
		</Stack>
	);
}