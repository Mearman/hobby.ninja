/**
 * Graph Node Details Component
 *
 * Renders type-specific content for graph nodes (brands, categories, items, manuals, series).
 * Handles different data structures and displays relevant information for each node type.
 */

import { Text, Stack, Group, Divider, Badge, List, Anchor } from "@mantine/core";
import { IconPackage, IconTag, IconFileText, IconBooks, IconBuildingFactory } from "@tabler/icons-react";

import type { GraphNode } from "../../utils/graph-client";
import { ZERO, ONE } from "../../types/hobby";

// Helper to safely render conditional content
function renderConditional<T>(
	data: Record<string, unknown>,
	key: string,
	render: (value: T) => React.ReactNode
): React.ReactNode {
	const value = data[key] as T | undefined;
	return value != null ? render(value) : null;
}
const SIX = 6;
const SEVEN = 7;
const EIGHT = 8;
const NINE = 9;
const TEN = 10;
const HUNDRED = 100;
const THOUSAND = 1000;
const JSON_INDENTATION = 2;
const PERCENTAGE_MULTIPLIER = 100;
const ARRAY_FIRST_INDEX = 0;
const ARRAY_SECOND_INDEX = 1;
const ARRAY_THIRD_INDEX = 2;

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
			{(data["scale"] != null) as React.ReactNode && (
				<Group>
					<Text fw={600} size="sm">Scale:</Text>
					<Badge color="blue" variant="light">{String(data["scale"] as string)}</Badge>
				</Group>
			)}

			{renderConditional<string>(data, "series", (series) => (
				<Group>
					<Text fw={600} size="sm">Series:</Text>
					<Text size="sm">{String(series)}</Text>
				</Group>
			))}

			{(() => {
				const height = data["height"];
				const width = data["width"];
				const depth = data["depth"];
				return (height != null || width != null || depth != null) ? (
					<Stack gap="xs">
						<Text fw={600} size="sm">Dimensions:</Text>
						{height != null && <Text size="sm">Height: {String(height)}mm</Text>}
						{width != null && <Text size="sm">Width: {String(width)}mm</Text>}
						{depth != null && <Text size="sm">Depth: {String(depth)}mm</Text>}
					</Stack>
				) : null;
			})()}

		{renderConditional<string>(data, "weight", (weight) => (
			<Group>
				<Text fw={600} size="sm">Weight:</Text>
				<Text size="sm">{String(weight)}g</Text>
			</Group>
		))}

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
			{renderConditional(data["description"], (description) => (
				<Stack gap="xs">
					<Text fw={600} size="sm">Description:</Text>
					<Text size="sm" lineClamp={3}>{String(description)}</Text>
				</Stack>
			))}

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
			{renderConditional(data["description"], (description) => (
				<Stack gap="xs">
					<Text size="sm" fw={600}>About:</Text>
					<Text size="sm">{String(description)}</Text>
				</Stack>
			))}

			{renderConditional(data["founded"], (founded) => (
				<Group>
					<Text fw={600} size="sm">Founded:</Text>
					<Text size="sm">{String(founded)}</Text>
				</Group>
			))}

			{data["country"] != null ? (
				<Group>
					<Text fw={600} size="sm">Country:</Text>
					<Text size="sm">{String(data["country"])}</Text>
				</Group>
			) : null}

			{data["website"] != null ? (
			<Group>
				<Text fw={600} size="sm">Website:</Text>
				<Anchor href={data["website"] as string} target="_blank" rel="noopener noreferrer">
					{data["website"] as string}
				</Anchor>
			</Group>
		) : null}

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
			{renderConditional(data["description"], (description) => (
				<Stack gap="xs">
					<Text fw={600} size="sm">Description:</Text>
					<Text size="sm">{String(description)}</Text>
				</Stack>
			))}

			{data["itemCount"] !== undefined ? (
			<Group>
				<Text fw={600} size="sm">Items:</Text>
				<Text size="sm">{Number(data["itemCount"]).toLocaleString()} items</Text>
			</Group>
		) : null}

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
			{(data["type"] != null) as React.ReactNode && (
				<Group>
					<Text fw={600} size="sm">Type:</Text>
					<Badge color="orange" variant="light">{String(data["type"] as string)}</Badge>
				</Group>
			)}

			{/* Page Count */}
			{(data["pages"] != null) as React.ReactNode && (
				<Group>
					<Text fw={600} size="sm">Pages:</Text>
					<Text size="sm">{String(data["pages"] as string)}</Text>
				</Group>
			)}

			{data["language"] != null ? (
				<Group>
					<Text fw={600} size="sm">Language:</Text>
					<Text size="sm">{String(data["language"])}</Text>
				</Group>
			) : null}

			{/* Format */}
			{(data["format"] != null) as React.ReactNode && (
				<Group>
					<Text fw={600} size="sm">Format:</Text>
					<Text size="sm">{String(data["format"])}</Text>
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
			{(data["isbn"] != null) as React.ReactNode && (
				<Group>
					<Text fw={600} size="sm">ISBN:</Text>
					<Text size="sm">{String(data["isbn"])}</Text>
				</Group>
			)}

			{/* Size */}
			{(data["size"] != null) as React.ReactNode && (
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
			{(data["description"] != null) as React.ReactNode && (
				<Stack gap="xs">
					<Text fw={600} size="sm">About:</Text>
					<Text size="sm">{String(data["description"])}</Text>
				</Stack>
			)}

			{/* Start/End Dates */}
			{(data["startYear"] ?? data["endYear"]) && (
				<Group>
					<Text fw={600} size="sm">Period:</Text>
					<Text size="sm">
						{String(data["startYear"])}{data["endYear"] ? ` - ${String(data["endYear"])}` : ""}
					</Text>
				</Group>
			)}

			{/* Episode Count */}
			{(data["episodes"] != null) as React.ReactNode && (
				<Group>
					<Text fw={600} size="sm">Episodes:</Text>
					<Text size="sm">{String(data["episodes"])}</Text>
				</Group>
			)}

			{/* Genre */}
			{(data["genre"] != null) as React.ReactNode && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Genre:</Text>
					<Group>
						{Array.isArray(data["genre"])
							? (data["genre"] as string[]).map((g: string, index: number) => (
								<Badge key={index} color="pink" variant="light" size="sm">
									{g}
								</Badge>
							))
							: <Badge color="pink" variant="light" size="sm">{String(data["genre"] as string)}</Badge>
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
	const edges = (node.data["edges"] as Edge[]) ?? [];

	if (edges.length === ZERO) return null;

	// Group relationships by type using a standard loop instead of reduce
	const groupedEdges: Record<string, Edge[]> = {};
	for (const edge of edges) {
		const relationType = edge.relation ?? "related";
		if (!groupedEdges[relationType]) {
			groupedEdges[relationType] = [];
		}
		groupedEdges[relationType].push(edge);
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
	const iconComponentKey = node.type as keyof typeof NodeTypeIcons;
	const IconComponent = NodeTypeIcons[iconComponentKey] || IconPackage;

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