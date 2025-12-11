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
	Box,
	Image,
} from "@mantine/core";
import Link from "next/link";

import { getAllItems, getItemById } from "@/lib/graph-data";
import {
	getNodeDisplayName,
	getNodePrice,
	getNodeReleaseYear,
	getNodeImages,
	isItemNode,
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
				<Card withBorder p="lg">
					<Stack gap="md">
						<Title order={1}>{displayName}</Title>

						{/* Image */}
						{images.length > 0 && (
							<Image src={images[0]} alt={displayName} height={300} fit="contain" />
						)}

						{/* Metadata */}
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
						</Group>

						{/* Price and release */}
						<Group gap="md">
							{price && <Text>Price: {price}</Text>}
							{releaseYear && <Text>Released: {releaseYear}</Text>}
						</Group>
					</Stack>
				</Card>
			</Stack>
		</Container>
	);
}
