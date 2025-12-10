import { CategoryPageClient } from "./category-page-client";

import { generateCategoryParams } from "@/lib/data-loader";
import { getAllCategories, getItemsByCategory, getCategoryById } from "@/lib/server-graph-data";
import { Container, Title, Text, Group, Button, Anchor } from "@mantine/core";
import { IconArrowLeft, IconFolderOff } from "@tabler/icons-react";
import Link from "next/link";

// Server component for static generation
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// Load data at build time
	const [categories, items, category] = await Promise.all([
		getAllCategories(),
		getItemsByCategory(id),
		getCategoryById(id),
	]);

	if (!category) {
		return (
			<Container size="xl" py="xl">
				<Group mb="md">
					<Anchor href="/categories" size="sm">
						<Group gap={4}>
							<IconArrowLeft size={14} />
							Back to Categories
						</Group>
					</Anchor>
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
						<Button component={Link} href="/categories" variant="light">
							Browse All Categories
						</Button>
						<Button component={Link} href="/database" variant="outline">
							Explore Database
						</Button>
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

// Generate static params for categories from JSON files
export async function generateStaticParams() {
	return await generateCategoryParams();
}