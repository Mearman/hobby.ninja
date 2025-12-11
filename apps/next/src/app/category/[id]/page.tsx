import { CategoryPageClient } from "./category-page-client";

import { getAllCategories, getItemsByCategory, getCategoryById } from "@/lib/server-graph-data";
import { Container, Title, Text, Group, Button } from "@mantine/core";
import { IconArrowLeft, IconFolderOff } from "@tabler/icons-react";
import Link from "next/link";

// Server component for static generation
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// Load data at build time (synchronous from static imports)
	const categories = getAllCategories();
	const items = getItemsByCategory(id);
	const category = getCategoryById(id);

	if (!category) {
		return (
			<Container size="xl" py="xl">
				<Group mb="md">
					<Link href="/categories" style={{ textDecoration: "none" }}>
						<Group gap={4}>
							<IconArrowLeft size={14} />
							<Text size="sm" c="blue">
								Back to Categories
							</Text>
						</Group>
					</Link>
				</Group>

				<Container size="sm" py="xl">
					<Group justify="center" mb="md">
						<IconFolderOff size={64} color="var(--mantine-color-gray-4)" />
					</Group>
					<Title order={2} ta="center" mb="md">
						Category Not Found
					</Title>
					<Text ta="center" c="dimmed" size="lg" mb="xl">
						The category you're looking for doesn't exist or has been moved.
					</Text>
					<Group justify="center">
						<Link href="/categories" style={{ textDecoration: "none" }}>
							<Button variant="light">
								Browse All Categories
							</Button>
						</Link>
						<Link href="/database" style={{ textDecoration: "none" }}>
							<Button variant="outline">
								Explore Database
							</Button>
						</Link>
					</Group>
				</Container>
			</Container>
		);
	}

	// Pass loaded data to client component
	return (
		<CategoryPageClient
			initialCategory={category}
			initialItems={items}
			_initialCategories={categories}
			categoryId={id}
		/>
	);
}

// Generate static params for categories from static data
export function generateStaticParams() {
	const categories = getAllCategories();
	return categories.map((category) => ({
		id: category.id,
	}));
}
