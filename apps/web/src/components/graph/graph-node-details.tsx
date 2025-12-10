/**
 * Graph Node Details Component
 *
 * Renders type-specific content for graph nodes (brands, categories, items, manuals, series).
 * Handles different data structures and displays relevant information for each node type.
 */

import { Text, Stack, Group, Divider, Badge, List, Anchor } from "@mantine/core";
import { IconPackage, IconTag, IconFileText, IconBooks, IconBuildingFactory } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { ZERO } from "../../types/hobby";
import type { GraphNode } from "../../utils/graph-client";

const ARRAY_FIRST_INDEX = 0;
const JSON_INDENTATION = 2;

interface GraphNodeDetailsProps {
	node: GraphNode;
}

// Constants for magic numbers
const MAX_CHARACTERS_DISPLAY = 5;
const MAX_RELATIONSHIPS_DISPLAY = 10;

/**
 * Icon mapping for different node types
 */
const NodeTypeIcons = {
	brand: IconBuildingFactory,
	category: IconTag,
	item: IconPackage,
	manual: IconFileText,
	series: IconBooks,
} as const;

/**
 * Item-specific details (pricing, dimensions, etc.)
 */
function ItemDetails({ node }: { node: GraphNode }) {
	const { data } = node;

	return (
		<Stack gap="sm">
			{/* Price Information */}
			{data["price"] != null && (
				<Group>
					<Text fw={600} size="sm">Price:</Text>
					<Text size="sm">
						¥{Number(data["price"]).toLocaleString()}
						{data["priceTax"] != null && ` (¥${Number(data["priceTax"]).toLocaleString()} with tax)`}
					</Text>
				</Group>
			)}

			{/* Release Date */}
			{data["release"] != null && (
				<Group>
					<Text fw={600} size="sm">Release:</Text>
					<Text size="sm">{new Date(data["release"] as string).toLocaleDateString()}</Text>
				</Group>
			)}

			{/* Scale/Grade */}
			{data.scale && (
				<Group>
					<Text fw={600} size="sm">Scale:</Text>
					<Badge color="blue" variant="light">{data.scale}</Badge>
				</Group>
			)}

			{data.series && (
				<Group>
					<Text fw={600} size="sm">Series:</Text>
					<Text size="sm">{data.series}</Text>
				</Group>
			)}

			{(() => {
				const { height, width, depth } = data;
				return (height != null || width != null || depth != null) ? (
					<Stack gap="xs">
						<Text fw={600} size="sm">Dimensions:</Text>
						{height != null && <Text size="sm">Height: {height}mm</Text>}
						{width != null && <Text size="sm">Width: {width}mm</Text>}
						{depth != null && <Text size="sm">Depth: {depth}mm</Text>}
					</Stack>
				) : null;
			})()}

			{data.weight && (
				<Group>
					<Text fw={600} size="sm">Weight:</Text>
					<Text size="sm">{data.weight}g</Text>
				</Group>
			)}

			{/* Materials */}
			{data["materials"] && Array.isArray(data["materials"]) && data["materials"].length > ZERO && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Materials:</Text>
					<Group>
						{data["materials"].map((material: string, index: number) => (
							<Badge key={index} variant="outline" size="sm">
								{material}
							</Badge>
						))}
					</Group>
				</Stack>
			)}

			{/* Description */}
			{data.description && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Description:</Text>
					<Text size="sm" lineClamp={3}>{data.description}</Text>
				</Stack>
			)}

			{/* Official Links */}
			{data["links"] && Array.isArray(data["links"]) && data["links"].length > ZERO && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Official Links:</Text>
					<List size="sm">
						{data["links"].map((link: { name: string; url: string }, index: number) => (
							<List.Item key={index}>
								<Anchor href={link.url} target="_blank" rel="noopener noreferrer">
									{link.name}
								</Anchor>
							</List.Item>
						))}
					</List>
				</Stack>
			)}
		</Stack>
	);
}

/**
 * Brand-specific details
 */
function BrandDetails({ node }: { node: GraphNode }) {
	const { data } = node;

	return (
		<Stack gap="sm">
			{/* Brand Description */}
			{data.description && (
				<Stack gap="xs">
					<Text size="sm" fw={600}>About:</Text>
					<Text size="sm">{data.description}</Text>
				</Stack>
			)}

			{data.founded && (
				<Group>
					<Text fw={600} size="sm">Founded:</Text>
					<Text size="sm">{data.founded}</Text>
				</Group>
			)}

			{data.country && (
				<Group>
					<Text fw={600} size="sm">Country:</Text>
					<Text size="sm">{data.country}</Text>
				</Group>
			)}

			{data.website && (
				<Group>
					<Text fw={600} size="sm">Website:</Text>
					<Anchor href={data.website} target="_blank" rel="noopener noreferrer">
						{data.website}
					</Anchor>
				</Group>
			)}

			{/* Product Lines */}
			{data["productLines"] && Array.isArray(data["productLines"]) && (data["productLines"] as string[]).length > ZERO && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Product Lines:</Text>
					<Group>
						{(data["productLines"] as string[]).map((line: string) => (
							<Badge key={line} color="grape" variant="light" size="sm">
								{line}
							</Badge>
						))}
					</Group>
				</Stack>
			)}
		</Stack>
	);
}

/**
 * Category-specific details
 */
function CategoryDetails({ node }: { node: GraphNode }) {
	const { data } = node;

	return (
		<Stack gap="sm">
			{/* Category Description */}
			{data.description && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Description:</Text>
					<Text size="sm">{data.description}</Text>
				</Stack>
			)}

			{data.itemCount !== undefined && (
				<Group>
					<Text fw={600} size="sm">Items:</Text>
					<Text size="sm">{Number(data.itemCount).toLocaleString()} items</Text>
				</Group>
			)}

			{/* Subcategories */}
			{data["subcategories"] && Array.isArray(data["subcategories"]) && data["subcategories"].length > ZERO && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Subcategories:</Text>
					<List size="sm">
						{data["subcategories"].map((subcat: string, index: number) => (
							<List.Item key={index}>{subcat}</List.Item>
						))}
					</List>
				</Stack>
			)}
		</Stack>
	);
}

/**
 * Manual-specific details
 */
function ManualDetails({ node }: { node: GraphNode }) {
	const { data } = node;

	return (
		<Stack gap="sm">
			{/* Manual Type */}
			{data.type && (
				<Group>
					<Text fw={600} size="sm">Type:</Text>
					<Badge color="orange" variant="light">{data.type}</Badge>
				</Group>
			)}

			{/* Page Count */}
			{data.pages != null && (
				<Group>
					<Text fw={600} size="sm">Pages:</Text>
					<Text size="sm">{data.pages}</Text>
				</Group>
			)}

			{data.language && (
				<Group>
					<Text fw={600} size="sm">Language:</Text>
					<Text size="sm">{data.language}</Text>
				</Group>
			)}

			{/* Format */}
			{data.format != null && (
				<Group>
					<Text fw={600} size="sm">Format:</Text>
					<Text size="sm">{data.format}</Text>
				</Group>
			)}

			{/* Publication Date */}
			{data["published"] && (
				<Group>
					<Text fw={600} size="sm">Published:</Text>
					<Text size="sm">{new Date(data["published"] as string).toLocaleDateString()}</Text>
				</Group>
			)}

			{/* ISBN */}
			{(data["isbn"] != null) as ReactNode && (
				<Group>
					<Text fw={600} size="sm">ISBN:</Text>
					<Text size="sm">{String(data["isbn"])}</Text>
				</Group>
			)}

			{/* Size */}
			{(data["size"] != null) as ReactNode && (
				<Group>
					<Text fw={600} size="sm">Size:</Text>
					<Text size="sm">{String(data["size"])}</Text>
				</Group>
			)}
		</Stack>
	);
}

/**
 * Series-specific details
 */
function SeriesDetails({ node }: { node: GraphNode }) {
	const { data } = node;

	return (
		<Stack gap="sm">
			{/* Series Description */}
			{data.description != null && (
				<Stack gap="xs">
					<Text fw={600} size="sm">About:</Text>
					<Text size="sm">{data.description}</Text>
				</Stack>
			)}

			{/* Start/End Dates */}
			{(data.startYear ?? data.endYear) && (
				<Group>
					<Text fw={600} size="sm">Period:</Text>
					<Text size="sm">
						{(data.startYear as string | number)}{data.endYear ? ` - ${(data.endYear as string | number)}` : ""}
					</Text>
				</Group>
			)}

			{/* Episode Count */}
			{data.episodes != null && (
				<Group>
					<Text fw={600} size="sm">Episodes:</Text>
					<Text size="sm">{data.episodes}</Text>
				</Group>
			)}

			{/* Genre */}
			{data.genre != null && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Genre:</Text>
					<Group>
						{Array.isArray(data.genre)
							? data.genre.map((g: string, index: number) => (
								<Badge key={index} color="pink" variant="light" size="sm">
									{g}
								</Badge>
							))
							: <Badge color="pink" variant="light" size="sm">{data.genre}</Badge>
						}
					</Group>
				</Stack>
			)}

			{/* Main Characters */}
			{data["characters"] && Array.isArray(data["characters"]) && (data["characters"] as string[]).length > ZERO && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Main Characters:</Text>
					<Text size="sm">{(data["characters"] as string[]).slice(ARRAY_FIRST_INDEX, MAX_CHARACTERS_DISPLAY).join(", ")}
						{(data["characters"] as string[]).length > MAX_CHARACTERS_DISPLAY && ` +${(data["characters"] as string[]).length - MAX_CHARACTERS_DISPLAY} more`}
					</Text>
				</Stack>
			)}
		</Stack>
	);
}

/**
 * Common relationships display
 */
interface Edge {
	relation?: string;
	node?: {
		name?: {
			en?: string;
			ja?: string;
		};
		id?: string;
		type?: string;
	};
}

function CommonRelationships({ node }: { node: GraphNode }) {
	const edges = node.data.edges as Edge[];

	if (edges.length === ZERO) return null;

	// Group relationships by type using a standard loop instead of reduce
	const groupedEdges: Record<string, Edge[]> = {};
	for (const edge of edges) {
		const relationType = edge.relation ?? "related";
		(groupedEdges[relationType] ??= []).push(edge);
	}

	return (
		<Stack gap="md">
			<Divider label="Relationships" labelPosition="center" />
			{Object.entries(groupedEdges).map(([relationType, relationEdges]) => (
				<Stack key={relationType} gap="xs">
					<Text fw={600} size="sm" style={{ textTransform: "capitalize" }}>
						{relationType} ({relationEdges.length}):
					</Text>
					<List size="sm" spacing="xs">
						{relationEdges.slice(ARRAY_FIRST_INDEX, MAX_RELATIONSHIPS_DISPLAY).map((edge, index) => (
							<List.Item key={index}>
								{edge.node?.name?.en ?? edge.node?.name?.ja ?? edge.node?.id ?? "Unknown"}
								{edge.node?.type && (
									<Text size="xs" c="dimmed">
										{" "}({edge.node.type})
									</Text>
								)}
							</List.Item>
						))}
						{relationEdges.length > MAX_RELATIONSHIPS_DISPLAY && (
							<Text size="xs" c="dimmed">
							...and {relationEdges.length - MAX_RELATIONSHIPS_DISPLAY} more
							</Text>
						)}
					</List>
				</Stack>
			))}
		</Stack>
	);
}

/**
 * Main component that renders appropriate details based on node type
 */
export function GraphNodeDetails({ node }: GraphNodeDetailsProps) {
	const { [node.type]: IconComponent = IconPackage } = NodeTypeIcons;

	return (
		<Stack gap="md">
			{/* Node Type Header */}
			<Group>
				<IconComponent size={20} color="var(--mantine-color-blue-SIX)" />
				<Text fw={600} style={{ textTransform: "capitalize" }}>
					{node.type} Information
				</Text>
			</Group>

			{/* Type-specific details */}
			{node.type === "item" && <ItemDetails node={node} />}
			{node.type === "brand" && <BrandDetails node={node} />}
			{node.type === "category" && <CategoryDetails node={node} />}
			{node.type === "manual" && <ManualDetails node={node} />}
			{node.type === "series" && <SeriesDetails node={node} />}

			{/* Common relationships */}
			<CommonRelationships node={node} />

			{/* Raw data for debugging (remove in production) */}
			{process.env.NODE_ENV === "development" && (
				<>
					<Divider label="Debug Info" labelPosition="center" />
					<Text size="xs" c="dimmed" component="pre">
						{JSON.stringify(node, null, JSON_INDENTATION)}
					</Text>
				</>
			)}
		</Stack>
	);
}