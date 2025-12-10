import {
	Text,
	Container,
	Breadcrumbs,
	Anchor,
	Group,
} from "@mantine/core";
import {
	IconHome,
} from "@tabler/icons-react";

import { CollectionDetailClient } from "./CollectionDetailClient";

import { getAllItems } from "@/lib/graph-data";

// Static data fetching
interface PageProps {
  params: Promise<{ id: string }>;
}

// Generate static params for collection pages
export function generateStaticParams() {
	// Collections are user-generated and stored in IndexedDB
	// They are handled entirely client-side, so no static generation needed
	return [];
}

// Main collection detail page (Server Component)
export default async function CollectionDetailPage({ params }: PageProps) {
	const { id } = await params;

	// Load all database items at build time (server-side)
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
	const allDbItems = await getAllItems();

	return (
		<Container size="xl" py="xl">
			{/* Breadcrumbs */}
			<Breadcrumbs mb="md">
				<Anchor href="/" size="sm">
					<Group gap={4}>
						<IconHome size={14} />
						Home
					</Group>
				</Anchor>
				<Anchor href="/collection" size="sm">
					Collections
				</Anchor>
				<Text size="sm">Collection {id}</Text>
			</Breadcrumbs>

			{/* Client Component for interactivity */}
			{ }
			<CollectionDetailClient
				collectionId={id}
				allDbItems={allDbItems}
			/>
		</Container>
	);
}