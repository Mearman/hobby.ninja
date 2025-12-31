"use client";

import { getItemById, type Item } from "@hobby-ninja/data/items";
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

import { CollectionDetailClient } from "./collection-detail-client";

import { useCollection } from "@/contexts/collection-context";

// Fully client-side page for collection details
// Collections are stored in IndexedDB and not known at build time
export function CollectionPageClient() {
	const params = useParams<{ id: string }>();
	const collectionId = params.id;

	const { state, actions } = useCollection();
	const [dbItemsMap, setDbItemsMap] = useState<Map<string, Item>>(new Map());
	const [loading, setLoading] = useState(true);

	// Load the list when component mounts
	useEffect(() => {
		void actions.loadList(collectionId);
	}, [collectionId, actions.loadList]);

	// Load only the database items that are in the user's list
	// This uses sync data access from @hobby-ninja/data
	useEffect(() => {
		try {
			// Get unique item IDs from the list memberships
			const itemIds = [...new Set(state.currentListItems.map(membership => membership.itemId))];

			if (itemIds.length > 0) {
				// Build items map synchronously
				const itemsMap = new Map<string, Item>();
				for (const id of itemIds) {
					const item = getItemById(id);
					if (item) {
						itemsMap.set(id, item);
					}
				}
				setDbItemsMap(itemsMap);
			}
		} finally {
			setLoading(false);
		}
	}, [state.currentListItems]);

	if (loading || state.loading) {
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
						Lists
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
					Lists
				</Anchor>
				<Text size="sm">{state.currentList?.name ?? `List ${collectionId}`}</Text>
			</Breadcrumbs>

			<CollectionDetailClient
				collectionId={collectionId}
				dbItemsMap={dbItemsMap}
			/>
		</Container>
	);
}
