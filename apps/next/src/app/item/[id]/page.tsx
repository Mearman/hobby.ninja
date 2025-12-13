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
	getManualById,
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
	const manual = item.manualId ? getManualById(item.manualId) : undefined;

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

				{/* Assembly Manual - Full Width with Embedded PDF */}
				{manual && (
					<Card withBorder p="lg">
						<Stack gap="md">
							<Group justify="space-between" align="flex-start" wrap="wrap">
								<Group gap="md" align="flex-start">
									{manual.thumbnailImage && (
										<img
											src={manual.thumbnailImage}
											alt={getNodeDisplayName(manual)}
											style={{
												width: 80,
												height: 80,
												objectFit: "cover",
												borderRadius: 4,
												border: "1px solid var(--mantine-color-gray-3)",
											}}
										/>
									)}
									<Stack gap={4}>
										<Title order={3} size="h4">Assembly Manual</Title>
										<Text fw={500}>{getNodeDisplayName(manual)}</Text>
										<Group gap="xs">
											{manual.productNumber && (
												<Badge variant="light" color="gray" size="sm">
													Product #{manual.productNumber}
												</Badge>
											)}
											{manual.scale && (
												<Badge variant="light" color="orange" size="sm">
													{manual.scale}
												</Badge>
											)}
											{manual.releaseDate && (
												<Badge variant="light" color="blue" size="sm">
													{manual.releaseDate.year}/{String(manual.releaseDate.month).padStart(2, "0")}/{String(manual.releaseDate.day).padStart(2, "0")}
												</Badge>
											)}
										</Group>
										{manual.brandIds && manual.brandIds.length > 0 && (
											<Text size="xs" c="dimmed">
												Brand: {manual.brandIds.map(id => getBrandById(id)).filter(Boolean).map(b => b && getNodeDisplayName(b)).join(", ")}
											</Text>
										)}
										{manual.seriesIds && manual.seriesIds.length > 0 && (
											<Text size="xs" c="dimmed">
												Series: {manual.seriesIds.map(id => getSeriesById(id)).filter(Boolean).map(s => s && getNodeDisplayName(s)).join(", ")}
											</Text>
										)}
									</Stack>
								</Group>
								<Group gap="md">
									<Anchor
										href={`https://manual.bandai-hobby.net/menus/detail/${manual.id}/`}
										target="_blank"
										size="sm"
									>
										View on Bandai
									</Anchor>
									{manual.pdfs && manual.pdfs.length > 0 && manual.pdfs.map((pdf, index) => {
										const suffix = index === 0 ? "" : `_${index + 1}`;
										const pdfPath = `/manuals/${manual.id}/${manual.id}${suffix}.pdf`;
										const pdfName = pdf.name.en || pdf.name.ja;
										return (
											<Anchor
												key={index}
												href={pdfPath}
												target="_blank"
												size="sm"
												fw={500}
											>
												{pdfName}
											</Anchor>
										);
									})}
								</Group>
							</Group>

							{/* Embedded PDF Viewers - Show all PDFs */}
							{manual.pdfs && manual.pdfs.length > 0 && (
								<Stack gap="md">
									{manual.pdfs.map((pdf, index) => {
										const suffix = index === 0 ? "" : `_${index + 1}`;
										const pdfPath = `/manuals/${manual.id}/${manual.id}${suffix}.pdf`;
										const pdfName = pdf.name.en || pdf.name.ja;
										return (
											<Stack key={index} gap="xs">
												{manual.pdfs && manual.pdfs.length > 1 && (
													<Text fw={500} size="sm">{pdfName}</Text>
												)}
												<iframe
													src={pdfPath}
													title={`${getNodeDisplayName(manual)} - ${pdfName}`}
													style={{
														width: "100%",
														height: 800,
														border: "1px solid var(--mantine-color-gray-3)",
														borderRadius: 4,
													}}
												/>
											</Stack>
										);
									})}
								</Stack>
							)}
						</Stack>
					</Card>
				)}
			</Stack>
		</Container>
	);
}
