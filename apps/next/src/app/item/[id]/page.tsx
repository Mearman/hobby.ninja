import {
	Container,
	Card,
	Badge,
	Group,
	Stack,
	Text,
	Title,
	SimpleGrid,
	Anchor,
} from "@mantine/core";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ItemImageGallery } from "./item-image-gallery";

// Import from canonical data package
import {
	getItemIds,
	getItemById,
	getBrandById,
	getSeriesById,
	getCategoryById,
	type Item,
	getNodeDisplayName,
	getNodePrice,
	getNodeReleaseDate,
	getNodeImages,
	getNodeAccessories,
	isItem,
} from "@hobby-ninja/data";

interface ItemPageProps {
	params: Promise<{ id: string }>;
}

// Generate static params for items from canonical data package
export function generateStaticParams() {
	const itemIds = getItemIds();
	console.log(`Generating static params for ${itemIds.length} items`);
	return itemIds.map(id => ({ id }));
}

// Generate metadata for each item with type-safe data
export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
	const { id } = await params;
	const item = getItemById(id);

	if (!item || !isItem(item)) {
		return {
			title: "Item Not Found",
		};
	}

	const displayName = getNodeDisplayName(item);

	return {
		title: `${displayName} - hobby.ninja`,
		description: `Details about ${displayName} from the hobby.ninja database`,
	};
}

// Helper to get description items as an array
function getDescriptionItems(item: Item): string[] {
	if (!item.description || !Array.isArray(item.description)) return [];
	return item.description.map((desc) => {
		// Using || intentionally - fallback on empty string too, not just null/undefined
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		return desc.en || desc.ja || "";
	}).filter(Boolean);
}

// Next.js requires default exports for page components
// eslint-disable-next-line import/no-default-export
export default async function ItemPage({ params }: ItemPageProps) {
	const { id } = await params;
	const item = getItemById(id);

	if (!item || !isItem(item)) {
		notFound();
	}

	const displayName = getNodeDisplayName(item);
	const price = getNodePrice(item);
	const releaseDate = getNodeReleaseDate(item);
	const images = getNodeImages(item);
	const accessories = getNodeAccessories(item);
	const descriptionItems = getDescriptionItems(item);

	// Resolve relationship names from IDs
	const category = item.categoryIds[0] ? getCategoryById(item.categoryIds[0]) : undefined;
	const brand = item.brandIds[0] ? getBrandById(item.brandIds[0]) : undefined;
	const series = item.seriesIds[0] ? getSeriesById(item.seriesIds[0]) : undefined;

	return (
		<Container size="xl" py="md">
			<Stack gap="md">
				{/* Breadcrumbs */}
				<Group gap={8}>
					<Link href="/">Home</Link>
					<Text>/</Text>
					<Link href="/database">Database</Link>
					<Text>/</Text>
					<Text>{displayName}</Text>
				</Group>

				{/* Main content */}
				<SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
					{/* Left column - Images */}
					<Card withBorder={true} p="lg">
						<ItemImageGallery images={images} displayName={displayName} />
					</Card>

					{/* Right column - Details */}
					<Stack gap="md">
						<Card withBorder={true} p="lg">
							<Stack gap="md">
								<Title order={1} size="h2">{displayName}</Title>

								{/* Metadata Badges - Clickable links to related entities */}
								<Group gap="xs">
									{category && (
										<Link href={`/category/${category.id}`} style={{ textDecoration: "none" }}>
											<Badge color="gray" variant="light" style={{ cursor: "pointer" }}>
												{getNodeDisplayName(category)}
											</Badge>
										</Link>
									)}
									{brand && (
										<Badge color="blue" variant="light">{getNodeDisplayName(brand)}</Badge>
									)}
									{item.grade && (
										<Badge color="green" variant="light">{item.grade}</Badge>
									)}
									{item.scale && (
										<Badge color="orange" variant="light">{item.scale}</Badge>
									)}
									{series && (
										<Link href={`/series/${series.id}`} style={{ textDecoration: "none" }}>
											<Badge color="violet" variant="light" style={{ cursor: "pointer" }}>
												{getNodeDisplayName(series)}
											</Badge>
										</Link>
									)}
								</Group>

								{/* Price and Release */}
								<SimpleGrid cols={2} spacing="xs">
									{price && (
										<div>
											<Text size="sm" c="dimmed">Price</Text>
											<Text fw={600} size="lg">{price}</Text>
										</div>
									)}
									{releaseDate && (
										<div>
											<Text size="sm" c="dimmed">Released</Text>
											<Text fw={600} size="lg">{releaseDate}</Text>
										</div>
									)}
									{item.targetAge && (
										<div>
											<Text size="sm" c="dimmed">Target Age</Text>
											<Text fw={600} size="lg">{item.targetAge}+</Text>
										</div>
									)}
								</SimpleGrid>

								{/* Source Link */}
								{item.sourceUrl && (
									<Anchor href={item.sourceUrl} target="_blank" size="sm">
										View on Bandai Hobby
									</Anchor>
								)}
							</Stack>
						</Card>

						{/* Description */}
						{descriptionItems.length > 0 && (
							<Card withBorder={true} p="lg">
								<Stack gap="sm">
									<Title order={3} size="h4">Description</Title>
									<Stack gap="xs">
										{descriptionItems.map((desc, index) => (
											<Text key={index} size="sm">{desc}</Text>
										))}
									</Stack>
								</Stack>
							</Card>
						)}
					</Stack>
				</SimpleGrid>

				{/* Bottom section - Accessories */}
				{accessories.length > 0 && (
					<Card withBorder={true} p="lg">
						<Stack gap="sm">
							<Title order={3} size="h4">Accessories</Title>
							<Stack gap="xs">
								{accessories.map((acc, index) => (
									<Text key={index} size="sm">• {acc}</Text>
								))}
							</Stack>
						</Stack>
					</Card>
				)}
			</Stack>
		</Container>
	);
}
