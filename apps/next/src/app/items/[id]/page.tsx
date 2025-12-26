import {
	getItemIds,
	getItemPageData,
	getManualCdnUrls,
	resolveCdnUrl,
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

// Format price for OG description
function formatPriceString(price?: { amount: number; currency: string }): string {
	if (!price) return "";
	const symbol = price.currency === "JPY" ? "¥" : price.currency;
	return `${symbol}${price.amount.toLocaleString()}`;
}

// Generate metadata for each item with type-safe data
export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
	const { id } = await params;
	const item = getItemPageData(id);

	if (!item) {
		return {
			title: "Item Not Found",
		};
	}

	// Build description with brand, grade, scale, and price
	const parts: string[] = [];
	const brand = item.brands[0]?.name;
	if (brand) parts.push(brand);
	if (item.primaryGrade) parts.push(item.primaryGrade);
	if (item.scale) parts.push(item.scale);
	const price = formatPriceString(item.price);
	if (price) parts.push(price);
	const ogDescription = parts.length > 0 ? parts.join(" · ") : `Details about ${item.name}`;

	return {
		title: `${item.name} - hobby.ninja`,
		description: item.description[0] ?? `Details about ${item.name} from the hobby.ninja database`,
		openGraph: {
			title: item.name,
			description: ogDescription,
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: item.name,
			description: ogDescription,
		},
	};
}

// Format price for display
function formatPrice(price?: { amount: number; currency: string }): string | null {
	if (!price) return null;
	const { amount, currency } = price;
	const symbol = currency === "JPY" ? "¥" : currency;
	return `${symbol}${amount.toLocaleString()}`;
}

// Format release date for display - only shows components that exist
function formatReleaseDate(releaseDate?: { year?: number | null; month?: number | null; day?: number | null }): string | null {
	if (!releaseDate?.year) return null;
	let result = String(releaseDate.year);
	if (releaseDate.month != null) {
		result += `/${String(releaseDate.month).padStart(2, "0")}`;
		if (releaseDate.day != null) {
			result += `/${String(releaseDate.day).padStart(2, "0")}`;
		}
	}
	return result;
}

// Next.js requires default exports for page components

export default async function ItemPage({ params }: ItemPageProps) {
	const { id } = await params;
	const item = getItemPageData(id);

	if (!item) {
		notFound();
	}

	const price = formatPrice(item.price);
	const releaseDate = formatReleaseDate(item.releaseDate);

	// Resolve all image URLs to CDN URLs
	let images = item.images.map(img => resolveCdnUrl(img));
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
					<Text>{item.name}</Text>
				</Group>

				{/* Main content */}
				<SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
					{/* Left column - Images */}
					<Card withBorder={true} p="lg">
						<ItemImageGallery images={images} displayName={item.name} />
					</Card>

					{/* Right column - Details */}
					<Stack gap="md">
						<Card withBorder={true} p="lg">
							<Stack gap="md">
								<Title order={1} size="h2">{item.name}</Title>

								{/* Metadata Badges - Clickable links to related entities */}
								<Group gap="xs">
									{item.categories.map(category => (
										<Link key={category.id} href={`/categories/${category.id}`} style={{ textDecoration: "none" }}>
											<Badge color="gray" variant="light" style={{ cursor: "pointer" }}>
												{category.name}
											</Badge>
										</Link>
									))}
									{item.brands.map(brand => (
										<Link key={brand.id} href={`/brands/${brand.id}`} style={{ textDecoration: "none" }}>
											<Badge color="blue" variant="light" style={{ cursor: "pointer" }}>
												{brand.name}
											</Badge>
										</Link>
									))}
									{item.primaryGrade && (
										<Badge color="green" variant="light">{item.primaryGrade}</Badge>
									)}
									{item.scale && (
										<Badge color="orange" variant="light">{item.scale}</Badge>
									)}
									{item.series.map(series => (
										<Link key={series.id} href={`/series/${series.id}`} style={{ textDecoration: "none" }}>
											<Badge color="violet" variant="light" style={{ cursor: "pointer" }}>
												{series.name}
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

								{/* Source Links */}
								{(item.sourceUrl ?? item.globalSiteUrls?.enUs ?? (item.pbandaiUs && item.pbandaiUs.length > 0)) && (
									<Group gap="md">
										{item.sourceUrl && (
											<Anchor href={item.sourceUrl} target="_blank" size="sm">
												Bandai Hobby (JP)
											</Anchor>
										)}
										{item.globalSiteUrls?.enUs && (
											<Anchor href={item.globalSiteUrls.enUs} target="_blank" size="sm">
												Bandai Hobby (Global)
											</Anchor>
										)}
										{item.pbandaiUs && item.pbandaiUs.length > 0 && (
											<Anchor href={item.pbandaiUs[0].url} target="_blank" size="sm">
												P-Bandai (US)
											</Anchor>
										)}
									</Group>
								)}
							</Stack>
						</Card>

						{/* Description */}
						{item.description.length > 0 && (
							<Card withBorder={true} p="lg">
								<Stack gap="sm">
									<Title order={3} size="h4">Description</Title>
									<Stack gap="xs">
										{item.description.map((desc, index) => (
											<Text key={index} size="sm">{desc}</Text>
										))}
									</Stack>
								</Stack>
							</Card>
						)}
					</Stack>
				</SimpleGrid>

				{/* Bottom section - Accessories */}
				{item.accessories.length > 0 && (
					<Card withBorder={true} p="lg">
						<Stack gap="sm">
							<Title order={3} size="h4">Accessories</Title>
							<Stack gap="xs">
								{item.accessories.map((acc, index) => (
									<Text key={index} size="sm">• {acc}</Text>
								))}
							</Stack>
						</Stack>
					</Card>
				)}

				{/* Assembly Manual - Full Width with Embedded PDF */}
				{item.manual && item.manual.pdfs.length > 0 && (
					<PdfAccordion
						pdfs={item.manual.pdfs.map((pdf, index) => {
							const suffix = index === 0 ? "" : `_${index + 1}`;
							return {
								name: pdf.name,
								path: `manuals/${item.manual!.id}/${item.manual!.id}${suffix}.pdf`,
								title: `${item.manual!.name} - ${pdf.name}`,
								externalUrl: pdf.url,
							};
						})}
						header={
							<Group justify="space-between" align="flex-start" wrap="wrap">
								<Stack gap={4}>
									<Title order={3} size="h4">Assembly Manual</Title>
									<Text fw={500}>{item.manual.name}</Text>
									<Group gap="xs">
										{item.manual.productNumber && (
											<Badge variant="light" color="gray" size="sm">
												Product #{item.manual.productNumber}
											</Badge>
										)}
										{item.manual.scale && (
											<Badge variant="light" color="orange" size="sm">
												{item.manual.scale}
											</Badge>
										)}
										{item.manual.releaseDate?.year && (
											<Badge variant="light" color="blue" size="sm">
												{item.manual.releaseDate.year}
												{item.manual.releaseDate.month != null && `/${String(item.manual.releaseDate.month).padStart(2, "0")}`}
												{item.manual.releaseDate.day != null && `/${String(item.manual.releaseDate.day).padStart(2, "0")}`}
											</Badge>
										)}
									</Group>
									{item.manual.brands.length > 0 && (
										<Text size="xs" c="dimmed">
											Brand: {item.manual.brands.map(b => b.name).join(", ")}
										</Text>
									)}
									{item.manual.series.length > 0 && (
										<Text size="xs" c="dimmed">
											Series: {item.manual.series.map(s => s.name).join(", ")}
										</Text>
									)}
								</Stack>
								<Group gap="md">
									<Anchor
										href={`https://manual.bandai-hobby.net/menus/detail/${item.manual.id}/`}
										target="_blank"
										size="sm"
									>
										View on Bandai
									</Anchor>
									{item.manual.pdfs.map((pdf, index) => {
										const suffix = index === 0 ? "" : `_${index + 1}`;
										const pdfUrls = getManualCdnUrls(`manuals/${item.manual!.id}/${item.manual!.id}${suffix}.pdf`);
										return (
											<Anchor
												key={index}
												href={pdfUrls.primary}
												target="_blank"
												size="sm"
												fw={500}
											>
												{pdf.name}
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
