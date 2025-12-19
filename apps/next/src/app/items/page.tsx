import {
	Anchor,
	Box,
	Breadcrumbs,
	Container,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { IconHome } from "@tabler/icons-react";

import { ItemsClient } from "./items-client";

import { getAllItems } from "@/lib/graph-data";


// Server Component - loads all items and passes to client for infinite scroll
export default function ItemsPage() {
	// Call data functions directly (synchronous, no await needed)
	const allItems = getAllItems();
	const total = allItems.length;

	return (
		<Container size="xl" py="xl">
			<Stack gap="xl">
				{/* Breadcrumbs */}
				<Breadcrumbs>
					<Anchor href="/" size="sm">
						<Group gap={4}>
							<IconHome size={14} />
							Home
						</Group>
					</Anchor>
					<Anchor href="/database" size="sm">
						Database
					</Anchor>
					<Text size="sm" c="dimmed">
						All Items
					</Text>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						All Items
					</Title>
					<Text size="lg" c="dimmed">
						Browse our complete database of {total.toLocaleString()} items with filtering and infinite scroll.
					</Text>
				</Box>

				{/* Client Component with Infinite Scroll */}
				<ItemsClient items={allItems} totalItems={total} />
			</Stack>
		</Container>
	);
}
