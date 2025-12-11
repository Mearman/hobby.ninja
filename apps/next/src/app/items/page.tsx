import {
	Anchor,
	Box,
	Breadcrumbs,
	Card,
	Container,
	Group,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	IconHome,
} from "@tabler/icons-react";

import { getAllItems } from "@/lib/graph-data";
import { getNodeDisplayName } from "@/lib/schemas";

// Server Component - no client-side JavaScript needed
export default function ItemsPage() {
	// Call data functions directly (synchronous, no await needed)
	const allItems = getAllItems();

	// Show first 100 items statically
	const displayItems = allItems.slice(0, 100);
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
					<Anchor href="/items" size="sm">
						All Items
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						All Items
					</Title>
					<Text size="lg" c="dimmed">
						Showing {displayItems.length} of {total.toLocaleString()} items in our database
					</Text>
				</Box>

				{/* Items Grid */}
				<Box>
					<SimpleGrid
						cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
						spacing="md"
					>
						{displayItems.map((item) => {
							const itemName = getNodeDisplayName(item);
							const price = typeof item.price === 'number'
								? item.price
								: (item.price?.amount ?? 0);

							return (
								<Card key={item.id} p="md" radius="md" withBorder>
									<Stack gap="xs">
										<Anchor
											href={`/item/${item.id}`}
											size="sm"
											fw={500}
											lineClamp={2}
										>
											{itemName}
										</Anchor>

										{item.brand && (
											<Text size="xs" c="dimmed">
												Brand: {item.brand}
											</Text>
										)}

										{item.series && (
											<Text size="xs" c="dimmed">
												Series: {item.series}
											</Text>
										)}

										{item.grade && (
											<Text size="xs" c="dimmed">
												Grade: {item.grade}
											</Text>
										)}

										{item.scale && (
											<Text size="xs" c="dimmed">
												Scale: {item.scale}
											</Text>
										)}

										{price > 0 && (
											<Text size="sm" fw={500}>
												¥{price.toLocaleString()}
											</Text>
										)}

										{item.releaseDate?.year && (
											<Text size="xs" c="dimmed">
												Released: {item.releaseDate.year}
											</Text>
										)}
									</Stack>
								</Card>
							);
						})}
					</SimpleGrid>
				</Box>

				{/* Static footer */}
				{total > displayItems.length && (
					<Card p="md" radius="md" withBorder ta="center">
						<Text c="dimmed">
							Showing first {displayItems.length} items.
							Full filtering and pagination features coming soon.
						</Text>
					</Card>
				)}
			</Stack>
		</Container>
	);
}
