import { getAllCategories, getAllItems, getCategoryById } from "@/lib/server-graph-data";
import { generateCategoryParams } from "@/lib/data-loader";
import CategoryPageClient from "./CategoryPageClient";

// Server component for static generation
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// Load data at build time
	const [categories, items, category] = await Promise.all([
		getAllCategories(),
		getAllItems(),
		getCategoryById(id),
	]);

	if (!category) {
		return (
			<div>
				<h1>Category not found</h1>
				<p>The category you're looking for doesn't exist.</p>
			</div>
		);
	}

	// Pass loaded data to client component
	return (
		<CategoryPageClient
			initialCategory={category}
			initialItems={items}
			initialCategories={categories}
			categoryId={id}
		/>
	);
}

// Generate static params for categories from JSON files
export async function generateStaticParams() {
	return await generateCategoryParams();
}