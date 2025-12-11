"use client";

import {
	Text,
	Container,
	Breadcrumbs,
	Anchor,
	Group,
	Skeleton,
	Stack,
} from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CollectionDetailClient } from "./CollectionDetailClient";
import { getAllItems } from "@/lib/graph-data";
import type { ItemNode } from "@/lib/schemas";

// Fully client-side page for collection details
// Collections are stored in IndexedDB and not known at build time
export function CollectionPageClient() {
	const params = useParams<{ id: string }>();
	const collectionId = params.id;

	const [allDbItems, setAllDbItems] = useState<ItemNode[]>([]);
	const [loading, setLoading] = useState(true);

	// Load database items client-side
	useEffect(() => {
		const loadItems = async () => {
			try {
				const items = await getAllItems();
				setAllDbItems(items);
			} catch (error) {
				console.error("Failed to load items:", error);
			} finally {
				setLoading(false);
			}
		};
		void loadItems();
	}, []);

	if (loading) {
		return (
			<Container size="xl" py="xl">
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
					<Text size="sm">Loading...</Text>
				</Breadcrumbs>
				<Stack gap="md">
					<Skeleton height={200} radius="md" />
					<Skeleton height={400} radius="md" />
				</Stack>
			</Container>
		);
	}

	return (
		<Container size="xl" py="xl">
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
				<Text size="sm">Collection {collectionId}</Text>
			</Breadcrumbs>

			<CollectionDetailClient
				collectionId={collectionId}
				allDbItems={allDbItems}
			/>
		</Container>
	);
}
