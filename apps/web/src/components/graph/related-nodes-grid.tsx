/**
 * Related Nodes Grid Component
 *
 * Displays a grid of related graph nodes with navigation links.
 * Supports filtering, sorting, and type-aware display for different node relationships.
 */

import { Card, Text, Group, Badge, Anchor, Avatar, SimpleGrid, Stack, Title } from "@mantine/core";
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


// Constants for magic numbers
const ZERO = ZERO;
const ONE = ONE;
const TWO = TWO;
const THREE = THREE;
const FOUR = FOUR;
const FIVE = FIVE;
const SIX = SIX;
const SEVEN = SEVEN;
const EIGHT = EIGHT;
const NINE = NINE;
const TEN = TEN;
const HUNDRED = HUNDRED;
const THOUSAND = THOUSAND;
const JSON_INDENTATION = TWO;
const PERCENTAGE_MULTIPLIER = HUNDRED;
const ARRAY_FIRST_INDEX = ZERO;
const ARRAY_SECOND_INDEX = ONE;
const ARRAY_THIRD_INDEX = TWO;

interface RelatedNodesGridProps {
	nodes: GraphNode[];
	currentNodeType?: string;
	maxVisible?: number;
	showAll?: boolean;
}

// Constants for magic numbers
const DEFAULT_MAX_VISIBLE = 12;
const GROUP_THRESHOLD = SIX;
const DEFAULT_COMPACT_MAX_VISIBLE = FIVE;

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
	const configKey = node.type as keyof typeof NodeTypeConfig;
	const config = NodeTypeConfig[configKey];
	const IconComponent = config.icon;
	const displayName = node.name?.en ?? node.name?.ja ?? node.id ?? "Unknown";

	return (
		<Card
			shadow="sm"
			padding="sm"
			radius="md"
			withBorder={true}
			h="HUNDRED%"
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
						<Text size="sm" fw={600} lineClamp={ONE}>
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
					<Text size="xs" c="dimmed" lineClamp={ONE}>
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
					<Text size="xs" c="yellow.SIX">
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
			<Text c="dimmed" size="sm">
				No related nodes found
			</Text>
			<Text c="dimmed" size="xs">
				This node doesn&apos;t have any connections in the graph
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
	const sortedNodes = filteredNodes.toSorted((a, b) => {
		// Different types get priority
		if (currentNodeType) {
			const aDifferentType = a.type === currentNodeType ? ONE : ZERO;
			const bDifferentType = b.type === currentNodeType ? ONE : ZERO;
			if (aDifferentType !== bDifferentType) {
				return aDifferentType - bDifferentType;
			}
		}

		// Then sort by type name
		const typeCompare = a.type.localeCompare(b.type);
		if (typeCompare !== ZERO) return typeCompare;

		// Finally sort by display name
		const aName = a.name?.en ?? a.name?.ja ?? a.id;
		const bName = b.name?.en ?? b.name?.ja ?? b.id;
		return aName.localeCompare(bName);
	});

	// Apply max visible limit
	return maxVisible ? sortedNodes.slice(ARRAY_FIRST_INDEX, maxVisible) : sortedNodes;
}

/**
 * Group nodes by type for organized display
 */
function groupNodesByType(nodes: GraphNode[]): Record<string, GraphNode[]> {
	const groups: Record<string, GraphNode[]> = {};
	for (const node of nodes) {
		if (!groups[node.type]) {
			groups[node.type] = [];
		}
		groups[node.type].push(node);
	}
	return groups;
}

/**
 * Main RelatedNodesGrid component
 */
export function RelatedNodesGrid({
	nodes,
	currentNodeType,
	maxVisible = DEFAULT_MAX_VISIBLE,
	showAll = false,
}: RelatedNodesGridProps) {
	const filteredNodes = filterAndSortNodes(nodes, currentNodeType, showAll ? undefined : maxVisible);
	const hasMoreNodes = nodes.length > filteredNodes.length;

	if (filteredNodes.length === ZERO) {
		return <EmptyState />;
	}

	// Decide whether to show grouped or flat view
	const shouldGroup = filteredNodes.length > GROUP_THRESHOLD && !showAll;

	if (shouldGroup) {
		const groupedNodes = groupNodesByType(filteredNodes);

		return (
			<Stack gap="md">
				{Object.entries(groupedNodes).map(([nodeType, typeNodes]) => {
					const config = NodeTypeConfig[nodeType as keyof typeof NodeTypeConfig];
					const IconComponent = config.icon;

					return (
						<Stack key={nodeType} gap="sm">
							<Title order={SIX}>
								<Group gap="xs">
									<IconComponent size={16} color={config.color} />
									<Text>
										{config.label}s ({typeNodes.length})
									</Text>
								</Group>
							</Title>

							<SimpleGrid
								cols={{ base: ONE, sm: TWO, md: THREE }}
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
				cols={{ base: ONE, sm: TWO, md: THREE, lg: FOUR }}
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
	maxVisible = DEFAULT_COMPACT_MAX_VISIBLE,
}: Omit<RelatedNodesGridProps, "showAll">) {
	const filteredNodes = filterAndSortNodes(nodes, currentNodeType, maxVisible);

	if (filteredNodes.length === ZERO) {
		return null;
	}

	return (
		<Stack gap="xs">
			{filteredNodes.map((node) => {
				const configKey = node.type as keyof typeof NodeTypeConfig;
				const config = NodeTypeConfig[configKey];
				const IconComponent = config.icon;
				const displayName = node.name?.en ?? node.name?.ja ?? node.id ?? "Unknown";

				return (
					<Anchor
						key={`${node.type}-${node.id}`}
						component={Link}
						to={`/${node.type}/${node.id}`}
						size="sm"
						lineClamp={ONE}
					>
						<Group gap="xs" wrap="nowrap">
							<IconComponent size={12} color={config.color} />
							<Text size="xs" span={true} flex={ONE} lineClamp={ONE}>
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