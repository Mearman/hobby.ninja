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
	Image,
	SimpleGrid,
	Anchor,
} from "@mantine/core";
import Link from "next/link";

import { getAllItems, getItemById } from "@/lib/graph-data";
import {
	getNodeDisplayName,
	getNodePrice,
	getNodeReleaseYear,
	getNodeImages,
	getNodeDescription,
	getNodeAccessories,
	isItemNode,
	type ItemNode,
} from "@/lib/schemas";

interface ItemPageProps {
	params: Promise<{ id: string }>;
}

// Generate static params for items from static data
export function generateStaticParams() {
	const items = getAllItems();
	console.log(`Generating static params for ${items.length} items`);
	return items.map(item => ({ id: item.id }));
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

// Helper to get localized text (prefer English, fallback to Japanese)
function getLocalizedText(item: { ja: string; en?: string } | string): string {
	if (typeof item === "string") return item;
	return item.en || item.ja;
}

// Helper to get description items as an array
function getDescriptionItems(item: ItemNode): string[] {
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
function getContentsItems(item: ItemNode): string[] {
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
	const releaseYear = getNodeReleaseYear(item);
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
						<Stack gap="md">
							{/* Main Image */}
							{images.length > 0 && (
								<Image src={images[0]} alt={displayName} height={400} fit="contain" />
							)}

							{/* Additional Images */}
							{images.length > 1 && (
								<Group gap="xs">
									{images.slice(1, 5).map((img, index) => (
										<Image
											key={index}
											src={img}
											alt={`${displayName} ${index + 2}`}
											height={80}
											width={80}
											fit="contain"
											style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: 4 }}
										/>
									))}
								</Group>
							)}
						</Stack>
					</Card>

					{/* Right column - Details */}
					<Stack gap="md">
						<Card withBorder p="lg">
							<Stack gap="md">
								<Title order={1} size="h2">{displayName}</Title>

								{/* Metadata Badges */}
								<Group gap="xs">
									{item.brand && (
										<Badge color="blue" variant="light">{item.brand}</Badge>
									)}
									{item.grade && (
										<Badge color="green" variant="light">{item.grade}</Badge>
									)}
									{item.scale && (
										<Badge color="orange" variant="light">{item.scale}</Badge>
									)}
									{item.series && (
										<Badge color="violet" variant="light">{item.series}</Badge>
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
									{releaseYear && (
										<div>
											<Text size="sm" c="dimmed">Released</Text>
											<Text fw={600} size="lg">{releaseYear}</Text>
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
