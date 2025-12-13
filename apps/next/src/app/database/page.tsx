import { items } from "@hobby-ninja/data";
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

import { DatabaseClient } from "./database-client";

import { getAllManuals } from "@/lib/graph-data";

// Server Component - loads all data and passes to client for infinite scroll
export default function DatabasePage() {
	// Call data functions directly (synchronous, no await needed)
	const allItems = Object.values(items);
	const allManuals = getAllManuals();
	const totalItems = allItems.length;
	const totalManuals = allManuals.length;

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
					<Text size="sm" c="dimmed">
						Database
					</Text>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Database
					</Title>
					<Text size="lg" c="dimmed">
						Browse our complete database of {totalItems.toLocaleString()} items and {totalManuals.toLocaleString()} manuals with infinite scroll
					</Text>
				</Box>

				{/* Client Component for infinite scroll */}
				<DatabaseClient
					items={allItems}
					manuals={allManuals}
					totalItems={totalItems}
					totalManuals={totalManuals}
				/>
			</Stack>
		</Container>
	);
}