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
import { getItemsByIds } from "@/lib/client-data";
import { useCollection } from "@/contexts/collection-context";
import type { ItemNode } from "@/lib/schemas";

// Fully client-side page for collection details
// Collections are stored in IndexedDB and not known at build time
export function CollectionPageClient() {
	const params = useParams<{ id: string }>();
	const collectionId = params.id;

	const { state } = useCollection();
	const [dbItemsMap, setDbItemsMap] = useState<Map<string, ItemNode>>(new Map());
	const [loading, setLoading] = useState(true);

	// Load only the database items that are in the user's collection
	// This fetches individual item files (~3KB each) instead of all items (19MB)
	useEffect(() => {
		const loadItems = async () => {
			try {
				// Get unique item IDs from the collection
				const itemIds = [...new Set(state.items.map(item => item.itemId))];

				if (itemIds.length > 0) {
					// Fetch only the items we need (parallel requests)
					const itemsMap = await getItemsByIds(itemIds);
					setDbItemsMap(itemsMap);
				}
			} catch (error) {
				console.error("Failed to load items:", error);
			} finally {
				setLoading(false);
			}
		};
		void loadItems();
	}, [state.items]);

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
				dbItemsMap={dbItemsMap}
			/>
		</Container>
	);
}
