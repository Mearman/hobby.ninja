import { tagsList, type TagData, getTagDisplayName } from "@hobby-ninja/data";
import {
	Anchor,
	Badge,
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
import { IconHome, IconTag } from "@tabler/icons-react";
import Link from "next/link";

import { getTagColor } from "@/lib/tag-colors";
import { categoryCard } from "@/styles/components.css";

// Sort tags by item count (most popular first)
function sortTags(tags: TagData[]): TagData[] {
	return [...tags].toSorted((a, b) => b.itemCount - a.itemCount);
}

// Tag Card Component
function TagCard({ tag }: { tag: TagData }) {
	const displayName = getTagDisplayName(tag);
	const tagColor = getTagColor(tag.id);

	return (
		<Link
			href={`/tags/${encodeURIComponent(tag.id)}`}
			style={{ textDecoration: "none", color: "inherit" }}
		>
			<Card p="md" radius="md" className={categoryCard} withBorder={true}>
				<Stack gap="md">
					<Group justify="space-between" align="flex-start">
						<Badge
							size="lg"
							variant="filled"
							style={{ backgroundColor: tagColor }}
							leftSection={<IconTag size={14} />}
						>
							{displayName}
						</Badge>
					</Group>

					<Group gap="xs" wrap="wrap">
						<Badge variant="outline" size="sm">
							{tag.itemCount.toLocaleString()} items
						</Badge>
					</Group>

					<Text size="sm" fw={500} style={{ color: tagColor }}>
						View all items →
					</Text>
				</Stack>
			</Card>
		</Link>
	);
}

export default function TagsPage() {
	// Load and sort tags by popularity
	const tags = sortTags(tagsList);

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
					<Anchor href="/tags" size="sm">
						Tags
					</Anchor>
				</Breadcrumbs>

				{/* Header */}
				<Box>
					<Title order={1} mb="sm">
						Tags
					</Title>
					<Text size="lg" c="dimmed">
						Distribution channel tags indicate where items were exclusively available
					</Text>
				</Box>

				{/* Tags Grid */}
				<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
					{tags.map((tag) => (
						<TagCard key={tag.id} tag={tag} />
					))}
				</SimpleGrid>
			</Stack>
		</Container>
	);
}
