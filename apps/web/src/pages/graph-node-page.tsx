/**
 * Unified Graph Node Page
 *
 * Renders static HTML pages for all graph node types (brands, categories, items, manuals, series)
 * using TanStack Router loader data. Provides consistent template with type-specific content.
 */

import { Title, Text, Container, Breadcrumbs, Anchor, Group, Stack, Card, Grid } from "@mantine/core";
import { Link, useLoaderData } from "@tanstack/react-router";

import { GraphNodeDetails } from "../components/graph/graph-node-details";
import { RelatedNodesGrid } from "../components/graph/related-nodes-grid";
import type { GraphNode } from "../utils/graph-client";


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

interface GraphNodePageLoader {
	nodeData: GraphNode | null;
	nodeType: string;
	nodeId: string;
	relatedNodes: GraphNode[];
	error: string | null;
}

/**
 * Hook to get loader data with proper typing
 */
function useGraphNodeLoader(): GraphNodePageLoader {
	try {
		return useLoaderData({ from: "/$nodeType/$id" });
	} catch {
		// Fallback for client-side navigation
		return {
			nodeData: null,
			nodeType: "",
			nodeId: "",
			relatedNodes: [],
			error: "Unable to load node data",
		};
	}
}

/**
 * Breadcrumb navigation for graph nodes
 */
function GraphNodeBreadcrumbs({ nodeType, nodeId, nodeData }: { nodeType: string; nodeId: string; nodeData: GraphNode | null }) {
	const items = [
		{ title: "Home", href: "/" },
		{ title: "Database", href: "/database" },
		{
			title: nodeType.charAt(ARRAY_FIRST_INDEX).toUpperCase() + nodeType.slice(ARRAY_SECOND_INDEX)),
			href: `/database/${nodeType}s`,
		},
		{
			title: nodeData?.name?.en ?? nodeData?.name?.ja ?? nodeId,
			href: `/${nodeType}/${nodeId}`,
		},
	].map((item, index) => (
		<Anchor key={index} href={item.href} size="sm">
			{item.title}
		</Anchor>
	));

	return (
		<Breadcrumbs mb="md">
			{items}
		</Breadcrumbs>
	);
}

/**
 * Safe JSON-LD structured data component
 */
function StructuredDataScript({ data }: { data: Record<string, unknown> }) {
	// Sanitize structured data to ensure no script injection
	const sanitizedData = JSON.stringify(data).replaceAll("<", String.raw`\u003c`).replaceAll(">", String.raw`\u003e`);

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: sanitizedData,
			}}
		/>
	);
}

/**
 * Meta tags for SEO optimization
 */
function GraphNodeMeta({ nodeData, nodeType }: { nodeData: GraphNode | null; nodeType: string }) {
	if (!nodeData) return null;

	const title = nodeData.name?.en ?? nodeData.name?.ja ?? "Graph Node";
	const description = `${nodeType.charAt(ARRAY_FIRST_INDEX).toUpperCase() + nodeType.slice(ARRAY_SECOND_INDEX))}: ${title}`;

	// TODO: Add structured data generation when needed
	// const structuredData = {
	//   "@context": "https://schema.org",
	//   "@type": "Thing",
	//   name: title,
	//   description
	// };

	return (
		<>
			<title>{title} - hobby.ninja</title>
			<meta name="description" content={description} />
			<meta property="og:title" content={`${title} - hobby.ninja`} />
			<meta property="og:description" content={description} />
			<meta property="og:type" content="website" />
			<link rel="canonical" href={`https://hobby.ninja/${nodeType}/${nodeData.id}`} />

			{/* Structured Data for SEO - TODO: Add when needed */}
		</>
	);
}

/**
 * Main graph node page component
 */
export function GraphNodePage() {
	const { nodeData, nodeType, nodeId, relatedNodes, error } = useGraphNodeLoader();

	// Handle loading state
	if (!nodeData && !error) {
		return (
			<Container size="lg" py="md">
				<Text>Loading...</Text>
			</Container>
		);
	}

	// Handle error state
	if (error || !nodeData) {
		return (
			<Container size="lg" py="md">
				<Title order={ONE}>Node Not Found</Title>
				<Text c="red" mb="md">
					{error ?? `${nodeType} with ID ${nodeId} not found`}
				</Text>
				<Anchor href="/">Return to Home</Anchor>
			</Container>
		);
	}

	// Main content rendering
	return (
		<Container size="lg" py="md">
			{/* SEO Meta Tags */}
			<GraphNodeMeta nodeData={nodeData} nodeType={nodeType} />

			{/* Breadcrumb Navigation */}
			<GraphNodeBreadcrumbs
				nodeType={nodeType}
				nodeId={nodeId}
				nodeData={nodeData}
			/>

			{/* Page Header */}
			<Stack gap="lg" mb="xl">
				<Title order={ONE}>
					{nodeData.name?.en ?? nodeData.name?.ja}
				</Title>

				{nodeData.name?.en && nodeData.name?.ja && (
					<Text size="lg" c="dimmed">
						{nodeData.name.ja}
					</Text>
				)}

				{nodeData.name?.en && nodeData.name?.en !== nodeData.name?.ja && (
					<Text size="md" c="dimmed">
						Japanese: {nodeData.name.ja}
					</Text>
				)}

				<Group>
					<Text size="sm" c="dimmed">
						Type: <strong>{nodeType.charAt(ARRAY_FIRST_INDEX).toUpperCase() + nodeType.slice(ARRAY_SECOND_INDEX))}</strong>
					</Text>
					<Text size="sm" c="dimmed">
						ID: <strong>{nodeId}</strong>
					</Text>
				</Group>
			</Stack>

			{/* Main Content Grid */}
			<Grid>
				<Grid.Col span={{ base: 12, md: EIGHT }}>
					{/* Node Details */}
					<Card shadow="sm" padding="lg" radius="md" withBorder={true}>
						<Title order={TWO} mb="md">Details</Title>
						<GraphNodeDetails node={nodeData} />
					</Card>
				</Grid.Col>

				<Grid.Col span={{ base: 12, md: FOUR }}>
					{/* Related Nodes */}
					{relatedNodes.length > ZERO && (
						<Card shadow="sm" padding="lg" radius="md" withBorder={true}>
							<Title order={THREE} mb="md">Related Nodes</Title>
							<RelatedNodesGrid nodes={relatedNodes} currentNodeType={nodeType} />
						</Card>
					)}
				</Grid.Col>
			</Grid>

			{/* Navigation Links */}
			<Group mt="xl">
				<Link to="/" style={{ textDecoration: "none" }}>
					<Anchor size="sm">← Back to Home</Anchor>
				</Link>
				<Link to="/database" style={{ textDecoration: "none" }}>
					<Anchor size="sm">Database</Anchor>
				</Link>
			</Group>
		</Container>
	);
}