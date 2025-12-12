import { Metadata } from "next";
import { notFound } from "next/navigation";
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
import Link from "next/link";

import { getItemById, type EnrichedItem } from "@/lib/graph-data";
import { ItemImageGallery } from "./ItemImageGallery";
// Import lightweight static params (96KB) instead of full items (19MB) for generateStaticParams
import staticParams from "@/data/static-params.json";
import {
	getNodeDisplayName,
	getNodePrice,
	getNodeReleaseDate,
	getNodeImages,
	getNodeAccessories,
	isItemNode,
} from "@/lib/schemas";

interface ItemPageProps {
	params: Promise<{ id: string }>;
}

// Generate static params for items using lightweight IDs file (96KB vs 19MB)
export function generateStaticParams() {
	console.log(`Generating static params for ${staticParams.itemIds.length} items`);
	return staticParams.itemIds.map(id => ({ id }));
}

// Generate metadata for each item with type-safe data
export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
	const { id } = await params;
	const item = getItemById(id);

	if (!item || !isItemNode(item)) {
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
function getDescriptionItems(item: EnrichedItem): string[] {
	if (!item.description || !Array.isArray(item.description)) return [];
	return item.description.map((desc: unknown) => {
		if (typeof desc === "string") return desc;
		if (typeof desc === "object" && desc !== null) {
			const d = desc as { ja?: string; en?: string };
			return d.en || d.ja || "";
		}
		return "";
	}).filter(Boolean);
}

// Helper to get contents items as an array
function getContentsItems(item: EnrichedItem): string[] {
	if (!item.contents || !Array.isArray(item.contents)) return [];
	return item.contents.map((content) => {
		if (typeof content === "string") return content;
		if (typeof content === "object" && content !== null) {
			const c = content as { ja?: string; en?: string };
			return c.en || c.ja || "";
		}
		return "";
	}).filter(Boolean);
}

export default async function ItemPage({ params }: ItemPageProps) {
	const { id } = await params;
	const item = getItemById(id);

	if (!item || !isItemNode(item)) {
		notFound();
	}

	const displayName = getNodeDisplayName(item);
	const price = getNodePrice(item);
	const releaseDate = getNodeReleaseDate(item);
	const images = getNodeImages(item);
	const accessories = getNodeAccessories(item);
	const descriptionItems = getDescriptionItems(item);
	const contentsItems = getContentsItems(item);

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
					<Card withBorder p="lg">
						<ItemImageGallery images={images} displayName={displayName} />
					</Card>

					{/* Right column - Details */}
					<Stack gap="md">
						<Card withBorder p="lg">
							<Stack gap="md">
								<Title order={1} size="h2">{displayName}</Title>

								{/* Metadata Badges - Clickable links to related entities */}
								<Group gap="xs">
									{item.category && item.categoryId && (
										<Link href={`/category/${item.categoryId}`} style={{ textDecoration: "none" }}>
											<Badge color="gray" variant="light" style={{ cursor: "pointer" }}>
												{item.category}
											</Badge>
										</Link>
									)}
									{item.brand && (
										<Badge color="blue" variant="light">{item.brand}</Badge>
									)}
									{item.grade && (
										<Badge color="green" variant="light">{item.grade}</Badge>
									)}
									{item.scale && (
										<Badge color="orange" variant="light">{item.scale}</Badge>
									)}
									{item.series && item.seriesId && (
										<Link href={`/series/${item.seriesId}`} style={{ textDecoration: "none" }}>
											<Badge color="violet" variant="light" style={{ cursor: "pointer" }}>
												{item.series}
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
							<Card withBorder p="lg">
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

				{/* Bottom section - Accessories and Contents */}
				<SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
					{/* Accessories */}
					{accessories.length > 0 && (
						<Card withBorder p="lg">
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

					{/* Contents */}
					{contentsItems.length > 0 && (
						<Card withBorder p="lg">
							<Stack gap="sm">
								<Title order={3} size="h4">Box Contents</Title>
								<Stack gap="xs">
									{contentsItems.map((content, index) => (
										<Text key={index} size="sm">• {content}</Text>
									))}
								</Stack>
							</Stack>
						</Card>
					)}
				</SimpleGrid>
			</Stack>
		</Container>
	);
}
