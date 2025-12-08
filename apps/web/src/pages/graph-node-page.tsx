/**
 * Unified Graph Node Page
 *
 * Renders static HTML pages for all graph node types (brands, categories, items, manuals, series)
 * using TanStack Router loader data. Provides consistent template with type-specific content.
 */

import { Title, Text, Container, Breadcrumbs, Anchor, Group, Stack, Card, Grid } from "@mantine/core";
import { Link, useLoaderData } from "@tanstack/react-router";

import { StructuredDataGenerator } from "../../scripts/structured-data-generator";
import { GraphNodeDetails } from "../components/graph/GraphNodeDetails";
import { RelatedNodesGrid } from "../components/graph/RelatedNodesGrid";
import type { GraphNode } from "../utils/graph-client";

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
			title: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
			href: `/database/${nodeType}s`,
		},
		{
			title: nodeData?.name?.en || nodeData?.name?.ja || nodeId,
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

	const title = nodeData.name?.en || nodeData.name?.ja || "Graph Node";
	const description = `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}: ${title}`;

	// Generate structured data
	const structuredDataGenerator = new StructuredDataGenerator();
	const structuredData = structuredDataGenerator.generateStructuredData(nodeData);
	const breadcrumbData = structuredDataGenerator.generateBreadcrumbData(
		nodeType,
		nodeData.id,
		nodeData.name?.en || nodeData.name?.ja,
	);

	return (
		<>
			<title>{title} - hobby.ninja</title>
			<meta name="description" content={description} />
			<meta property="og:title" content={`${title} - hobby.ninja`} />
			<meta property="og:description" content={description} />
			<meta property="og:type" content="website" />
			<link rel="canonical" href={`https://hobby.ninja/${nodeType}/${nodeData.id}`} />

			{/* Safe Structured Data for SEO */}
			{structuredData && <StructuredDataScript data={structuredData} />}
			{breadcrumbData && <StructuredDataScript data={breadcrumbData} />}
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
				<Title order={1}>Node Not Found</Title>
				<Text color="red" mb="md">
					{error || `${nodeType} with ID ${nodeId} not found`}
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
				<Title order={1}>
					{nodeData.name?.en || nodeData.name?.ja}
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
						Type: <strong>{nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}</strong>
					</Text>
					<Text size="sm" c="dimmed">
						ID: <strong>{nodeId}</strong>
					</Text>
				</Group>
			</Stack>

			{/* Main Content Grid */}
			<Grid>
				<Grid.Col span={{ base: 12, md: 8 }}>
					{/* Node Details */}
					<Card shadow="sm" padding="lg" radius="md" withBorder={true}>
						<Title order={2} mb="md">Details</Title>
						<GraphNodeDetails node={nodeData} />
					</Card>
				</Grid.Col>

				<Grid.Col span={{ base: 12, md: 4 }}>
					{/* Related Nodes */}
					{relatedNodes.length > 0 && (
						<Card shadow="sm" padding="lg" radius="md" withBorder={true}>
							<Title order={3} mb="md">Related Nodes</Title>
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