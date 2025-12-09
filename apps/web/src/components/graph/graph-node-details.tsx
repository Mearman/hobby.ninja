/**
 * Graph Node Details Component
 *
 * Renders type-specific content for graph nodes (brands, categories, items, manuals, series).
 * Handles different data structures and displays relevant information for each node type.
 */

import { Text, Stack, Group, Divider, Badge, List, Anchor } from "@mantine/core";
import { IconPackage, IconTag, IconFileText, IconBooks, IconBuildingFactory } from "@tabler/icons-react";

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

interface GraphNodeDetailsProps {
	node: GraphNode;
}

// Constants for magic numbers
const MAX_CHARACTERS_DISPLAY = FIVE;
const MAX_RELATIONSHIPS_DISPLAY = TEN;

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
			{data["price"] && (
				<Group>
					<Text fw={600} size="sm">Price:</Text>
					<Text size="sm">
						¥{Number(data["price"]).toLocaleString()}
						{data["priceTax"] && ` (¥${Number(data["priceTax"]).toLocaleString()} with tax)`}
					</Text>
				</Group>
			)}

			{/* Release Date */}
			{data["release"] && (
				<Group>
					<Text fw={600} size="sm">Release:</Text>
					<Text size="sm">{new Date(data["release"] as string).toLocaleDateString()}</Text>
				</Group>
			)}

			{/* Scale/Grade */}
			{data["scale"] && (
				<Group>
					<Text fw={600} size="sm">Scale:</Text>
					<Badge color="blue" variant="light">{data["scale"]}</Badge>
				</Group>
			)}

			{/* Series */}
			{data["series"] && (
				<Group>
					<Text fw={600} size="sm">Series:</Text>
					<Text size="sm">{data["series"]}</Text>
				</Group>
			)}

			{/* Dimensions */}
			{(data["height"] ?? data["width"] ?? data["depth"]) && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Dimensions:</Text>
					{data["height"] && <Text size="sm">Height: {data["height"]}mm</Text>}
					{data["width"] && <Text size="sm">Width: {data["width"]}mm</Text>}
					{data["depth"] && <Text size="sm">Depth: {data["depth"]}mm</Text>}
				</Stack>
			)}

			{/* Weight */}
			{data["weight"] && (
				<Group>
					<Text fw={600} size="sm">Weight:</Text>
					<Text size="sm">{data["weight"]}g</Text>
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
			{data["description"] && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Description:</Text>
					<Text size="sm" lineClamp={THREE}>{data["description"]}</Text>
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
			{data["description"] && (
				<Stack gap="xs">
					<Text size="sm" fw={600}>About:</Text>
					<Text size="sm">{data["description"]}</Text>
				</Stack>
			)}

			{/* Founded Date */}
			{data["founded"] && (
				<Group>
					<Text fw={600} size="sm">Founded:</Text>
					<Text size="sm">{data["founded"]}</Text>
				</Group>
			)}

			{/* Country */}
			{data["country"] && (
				<Group>
					<Text fw={600} size="sm">Country:</Text>
					<Text size="sm">{data["country"]}</Text>
				</Group>
			)}

			{/* Official Website */}
			{data["website"] && (
				<Group>
					<Text fw={600} size="sm">Website:</Text>
					<Anchor href={data["website"] as string} target="_blank" rel="noopener noreferrer">
						{data["website"] as string}
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
			{data["description"] && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Description:</Text>
					<Text size="sm">{data["description"]}</Text>
				</Stack>
			)}

			{/* Item Count */}
			{data["itemCount"] !== undefined && (
				<Group>
					<Text fw={600} size="sm">Items:</Text>
					<Text size="sm">{Number(data["itemCount"]).toLocaleString()} items</Text>
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
			{data["type"] && (
				<Group>
					<Text fw={600} size="sm">Type:</Text>
					<Badge color="orange" variant="light">{data["type"]}</Badge>
				</Group>
			)}

			{/* Page Count */}
			{data["pages"] && (
				<Group>
					<Text fw={600} size="sm">Pages:</Text>
					<Text size="sm">{data["pages"]}</Text>
				</Group>
			)}

			{/* Language */}
			{data["language"] && (
				<Group>
					<Text fw={600} size="sm">Language:</Text>
					<Text size="sm">{data["language"]}</Text>
				</Group>
			)}

			{/* Format */}
			{data["format"] && (
				<Group>
					<Text fw={600} size="sm">Format:</Text>
					<Text size="sm">{data["format"]}</Text>
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
			{data["isbn"] && (
				<Group>
					<Text fw={600} size="sm">ISBN:</Text>
					<Text size="sm">{data["isbn"]}</Text>
				</Group>
			)}

			{/* Size */}
			{data["size"] && (
				<Group>
					<Text fw={600} size="sm">Size:</Text>
					<Text size="sm">{data["size"]}</Text>
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
			{data["description"] && (
				<Stack gap="xs">
					<Text fw={600} size="sm">About:</Text>
					<Text size="sm">{data["description"]}</Text>
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
			{data["episodes"] && (
				<Group>
					<Text fw={600} size="sm">Episodes:</Text>
					<Text size="sm">{data["episodes"]}</Text>
				</Group>
			)}

			{/* Genre */}
			{data["genre"] && (
				<Stack gap="xs">
					<Text fw={600} size="sm">Genre:</Text>
					<Group>
						{Array.isArray(data["genre"])
							? data["genre"].map((g: string, index: number) => (
								<Badge key={index} color="pink" variant="light" size="sm">
									{g}
								</Badge>
							))
							: <Badge color="pink" variant="light" size="sm">{data["genre"]}</Badge>
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
						{JSON.stringify(TWO, $TWO, JSON_INDENTATION)}
					</Text>
				</>
			)}
		</Stack>
	);
}