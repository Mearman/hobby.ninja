import {
	getBrandById,
	getCategoryById,
	getItemById,
	getItemIds,
	getManualById,
	getNodeAccessories,
	getNodeDisplayName,
	getNodeImages,
	getNodePrice,
	getNodePrimaryGrade,
	getNodeReleaseDate,
	getSeriesById,
	isItem,
	resolveCdnUrl,
	resolveImageUrl,
	resolveManualUrl,
	type Item,
} from "@hobby-ninja/data";
import {
	Anchor,
	Badge,
	Card,
	Container,
	Group,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ItemImageGallery } from "./item-image-gallery";
import { PdfAccordion } from "./pdf-accordion";

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
	if (!item.description) return [];
	// Description is now LocalizedTextArray: { ja: string[], en?: string[] }
	return item.description.en ?? item.description.ja;
}

// Next.js requires default exports for page components
 
export default async function ItemPage({ params }: ItemPageProps) {
	const { id } = await params;
	const item = getItemById(id);

	if (!item || !isItem(item)) {
		notFound();
	}

	const displayName = getNodeDisplayName(item);
	const price = getNodePrice(item);
	const releaseDate = getNodeReleaseDate(item);
	const accessories = getNodeAccessories(item);
	const descriptionItems = getDescriptionItems(item);

	// Resolve relationship names from IDs
	const categories = item.categoryIds.map(id => getCategoryById(id)).filter((c): c is NonNullable<typeof c> => c != null);
	const brands = item.brandIds.map(id => getBrandById(id)).filter((b): b is NonNullable<typeof b> => b != null);
	const seriesList = item.seriesIds.map(id => getSeriesById(id)).filter((s): s is NonNullable<typeof s> => s != null);
	const manual = item.manualId ? getManualById(item.manualId) : undefined;

	// Get item images, falling back to displayImage (which may come from manual)
	// Resolve all image URLs to CDN URLs
	let images = getNodeImages(item).map(img => resolveCdnUrl(img));
	if (images.length === 0 && item.displayImage) {
		images = [resolveCdnUrl(item.displayImage)];
	}

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
									{categories.map(category => (
										<Link key={category.id} href={`/category/${category.id}`} style={{ textDecoration: "none" }}>
											<Badge color="gray" variant="light" style={{ cursor: "pointer" }}>
												{getNodeDisplayName(category)}
											</Badge>
										</Link>
									))}
									{brands.map(brand => (
										<Link key={brand.id} href={`/brand/${brand.id}`} style={{ textDecoration: "none" }}>
											<Badge color="blue" variant="light" style={{ cursor: "pointer" }}>
												{getNodeDisplayName(brand)}
											</Badge>
										</Link>
									))}
									{getNodePrimaryGrade(item) && (
										<Badge color="green" variant="light">{getNodePrimaryGrade(item)}</Badge>
									)}
									{item.scale && (
										<Badge color="orange" variant="light">{item.scale}</Badge>
									)}
									{seriesList.map(series => (
										<Link key={series.id} href={`/series/${series.id}`} style={{ textDecoration: "none" }}>
											<Badge color="violet" variant="light" style={{ cursor: "pointer" }}>
												{getNodeDisplayName(series)}
											</Badge>
										</Link>
									))}
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
				{manual?.pdfs && manual.pdfs.length > 0 && (
					<PdfAccordion
						pdfs={manual.pdfs.map((pdf, index) => {
							const suffix = index === 0 ? "" : `_${index + 1}`;
							return {
								name: pdf.name.en ?? pdf.name.ja,
								src: resolveManualUrl(`manuals/${manual.id}/${manual.id}${suffix}.pdf`),
								title: `${getNodeDisplayName(manual)} - ${pdf.name.en ?? pdf.name.ja}`,
							};
						})}
						header={
							<Group justify="space-between" align="flex-start" wrap="wrap">
								<Group gap="md" align="flex-start">
									{manual.thumbnailImage && (
										<img
											src={resolveImageUrl(manual.thumbnailImage)}
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
										{manual.brandIds.length > 0 && (
											<Text size="xs" c="dimmed">
												Brand: {manual.brandIds.map(id => getBrandById(id)).filter((b): b is NonNullable<typeof b> => b != null).map(b => getNodeDisplayName(b)).join(", ")}
											</Text>
										)}
										{manual.seriesIds.length > 0 && (
											<Text size="xs" c="dimmed">
												Series: {manual.seriesIds.map(id => getSeriesById(id)).filter((s): s is NonNullable<typeof s> => s != null).map(s => getNodeDisplayName(s)).join(", ")}
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
									{manual.pdfs.map((pdf, index) => {
										const suffix = index === 0 ? "" : `_${index + 1}`;
										const pdfPath = resolveManualUrl(`manuals/${manual.id}/${manual.id}${suffix}.pdf`);
										const pdfName = pdf.name.en ?? pdf.name.ja;
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
						}
					/>
				)}
			</Stack>
		</Container>
	);
}
