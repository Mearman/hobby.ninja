import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import {
	Container,
	Grid,
	GridCol,
	Card,
	Image,
	Badge,
	Group,
	Stack,
	Text,
	Title,
	Anchor,
	Skeleton,
	SimpleGrid,
	Accordion,
	List,
	ThemeIcon,
	Box,
	Divider,
	Button,
	ActionIcon,
	Tooltip,
} from "@mantine/core";
import {
	IconPhoto,
	IconDownload,
	IconExternalLink,
	IconChevronRight,
	IconCalendar,
	IconTag,
	IconCube,
	IconInfoCircle,
	IconManualGearbox,
	IconPackage,
} from "@tabler/icons-react";
import Link from "next/link";
import { CustomImage } from "@/components/ui/custom-image";
import { Badge as CustomBadge } from "@/components/ui/badge";
import { ImageGalleryClient } from "@/components/ui/image-gallery-client";

import { generateItemParams } from "@/lib/data-loader";
import { getItemById } from "@/lib/graph-data";
import {
	getNodeDisplayName,
	getNodePrice,
	getNodeReleaseYear,
	getNodeImages,
	getNodeDescription,
	getNodeAccessories,
	getNodeManuals,
	isItemNode,
} from "@/lib/schemas";

interface ItemPageProps {
  params: Promise<{ id: string }>;
}

// Breadcrumbs component
function Breadcrumbs({ item }: { item: any }) {
	const breadcrumbItems = [
		{ title: "Home", href: "/" },
		{ title: "Database", href: "/database" },
	];

	if (item.brand) {
		breadcrumbItems.push({ title: item.brand, href: `/brands/${encodeURIComponent(item.brand)}` });
	}

	if (item.series) {
		breadcrumbItems.push({ title: item.series, href: `/series/${encodeURIComponent(item.series)}` });
	}

	breadcrumbItems.push({ title: getNodeDisplayName(item) });

	return (
		<Group gap={8} mb="md">
			{breadcrumbItems.map((crumb, index) => (
				<Group key={index} gap={4}>
					{index > 0 && <IconChevronRight size={16} color="var(--mantine-color-gray-5)" />}
					{index < breadcrumbItems.length - 1 ? (
						<Anchor href={crumb.href} size="sm" c="dimmed">
							{crumb.title}
						</Anchor>
					) : (
						<Text size="sm" fw={500} c="var(--mantine-color-dark-2)">
							{crumb.title}
						</Text>
					)}
				</Group>
			))}
		</Group>
	);
}

// Loading skeleton component
function ItemPageSkeleton() {
	return (
		<Container size="xl" py="md">
			{/* Skeleton breadcrumbs */}
			<Group gap={8} mb="md">
				<Skeleton height={20} width={60} />
				<Skeleton height={16} width={16} />
				<Skeleton height={20} width={80} />
				<Skeleton height={16} width={16} />
				<Skeleton height={20} width={100} />
			</Group>

			<Grid>
				{/* Left column - Image gallery skeleton */}
				<GridCol span={{ base: 12, md: 8 }}>
					<Card withBorder p="md">
						<Skeleton height={400} radius="md" mb="md" />
						{Array.from({ length: 5 }).map((_, index) => (
							<Skeleton key={index} height={60} width={80} mr="sm" display="inline-block" />
						))}
					</Card>
				</GridCol>

				{/* Right column - Item info skeleton */}
				<GridCol span={{ base: 12, md: 4 }}>
					<Stack gap="md">
						<Card withBorder p="lg">
							<Stack gap="sm">
								<Skeleton height={32} width="80%" />
								<Group gap="xs">
									<Skeleton height={24} width={80} />
									<Skeleton height={24} width={60} />
									<Skeleton height={24} width={70} />
								</Group>
								<Group gap="sm" mt="xs">
									<Skeleton height={28} width={100} />
									<Skeleton height={28} width={80} />
								</Group>
							</Stack>
						</Card>

						<Card withBorder p="md">
							<Skeleton height={20} width="60" />
						</Card>

						{/* Accordion skeleton */}
						<Card withBorder p="md">
							<Skeleton height={40} mb="sm" />
							<Skeleton height={40} mb="sm" />
							<Skeleton height={40} />
						</Card>
					</Stack>
				</GridCol>
			</Grid>

			{/* Description skeleton */}
			<Card withBorder p="lg" mt="md">
				<Skeleton height={28} width="150" mb="md" />
				<Skeleton height={20} mb="sm" />
				<Skeleton height={20} width="90%" mb="sm" />
				<Skeleton height={20} width="95%" />
			</Card>
		</Container>
	);
}

// Metadata badges component
function MetadataBadges({ item }: { item: any }) {
	const metadata = [];

	if (item.brand) metadata.push({ label: item.brand, color: "blue" });
	if (item.grade) metadata.push({ label: item.grade, color: "green" });
	if (item.scale) metadata.push({ label: item.scale, color: "orange" });
	if (item.category) metadata.push({ label: item.category, color: "grape" });
	if (item.series) metadata.push({ label: item.series, color: "red" });
	if (item.targetAge) metadata.push({ label: `${item.targetAge}+`, color: "yellow" });

	return (
		<Group gap="xs" wrap="wrap">
			{metadata.map((meta, index) => (
				<CustomBadge key={index} color={meta.color} variant="light">
					{meta.label}
				</CustomBadge>
			))}
		</Group>
	);
}

// Generate static params for items from JSON files
export async function generateStaticParams() {
	try {
		const params = await generateItemParams();
		// Generate static params for all items
		const result = Array.isArray(params) ? params : [];
		console.log(`Generating static params for ${result.length} items`);
		return result;
	} catch (error) {
		console.error('Error generating static params:', error);
		// Return empty array to prevent build failure
		return [];
	}
}

// Generate metadata for each item with type-safe data
export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
	const { id } = await params;
	const item = await getItemById(id);

	if (!item || !isItemNode(item)) {
		return {
			title: "Item Not Found",
		};
	}

	const displayName = getNodeDisplayName(item);
	const releaseYear = getNodeReleaseYear(item);

	const itemDescription = getNodeDescription(item);
	const fullDesc = itemDescription
		? itemDescription.replaceAll("\n", " ")
		: `Details about ${displayName}${releaseYear ? ` (${releaseYear})` : ""} from the hobby.ninja database`;

	return {
		title: `${displayName} - hobby.ninja`,
		description: fullDesc,
		keywords: [
			"gunpla", "gundam", "model kit",
			item.brand ?? "",
			item.category ?? "",
			item.series ?? "",
			item.grade ?? "",
			item.scale ?? "",
		].filter(Boolean).join(", "),
	};
}

export default async function ItemPage({ params }: ItemPageProps) {
	const { id } = await params;

	// Add error handling for data fetching
	let item;
	try {
		item = await getItemById(id);
	} catch (error) {
		console.error('Error fetching item:', error);
		// Return a server error component or redirect
		throw new Error(`Failed to load item: ${id}`);
	}

	if (!item || !isItemNode(item)) {
		notFound();
	}

	const displayName = getNodeDisplayName(item);
	const price = getNodePrice(item);
	const releaseYear = getNodeReleaseYear(item);
	const images = getNodeImages(item);
	const description = getNodeDescription(item);
	const accessories = getNodeAccessories(item);
	const manuals = getNodeManuals(item);

	return (
		<Container size="xl" py="md">
			{/* Breadcrumbs */}
			<Breadcrumbs item={item} />

			{/* Main content grid */}
			<Grid>
				{/* Left column - Images */}
				<GridCol span={{ base: 12, md: 8 }}>
					<ImageGalleryClient images={images} itemName={displayName} />
				</GridCol>

				{/* Right column - Item info */}
				<GridCol span={{ base: 12, md: 4 }}>
					<Stack gap="md">
						{/* Title and basic info */}
						<Card withBorder p="lg">
							<Stack gap="sm">
								<Title order={1} size="h2" c="var(--mantine-color-dark-9)">
									{displayName}
								</Title>

								{/* Metadata badges */}
								<MetadataBadges item={item} />

								{/* Price and release info */}
								{(price || releaseYear) && (
									<Group gap="sm" mt="xs">
										{price && (
											<Badge size="lg" color="green" variant="light">
												{price}
											</Badge>
										)}
										{releaseYear && (
											<Badge size="lg" color="blue" variant="light" leftSection={<IconCalendar size={14} />}>
												{releaseYear}
											</Badge>
										)}
									</Group>
								)}
							</Stack>
						</Card>

						{/* Quick actions */}
						<Card withBorder p="md">
							<Group justify="space-between">
								<Text fw={500}>Actions</Text>
								<Group gap="xs">
									<Tooltip label="Add to collection">
										<ActionIcon variant="light" color="blue" size="lg">
											<IconPackage size={18} />
										</ActionIcon>
									</Tooltip>
									<Tooltip label="Add to wishlist">
										<ActionIcon variant="light" color="red" size="lg">
											<IconTag size={18} />
										</ActionIcon>
									</Tooltip>
									<Tooltip label="Share">
										<ActionIcon variant="light" color="gray" size="lg">
											<IconExternalLink size={18} />
										</ActionIcon>
									</Tooltip>
								</Group>
							</Group>
						</Card>

						{/* Detailed information accordion */}
						<Accordion variant="contained" radius="md">
							{item.price && (
								<Accordion.Item value="price">
									<Accordion.Control leftSection={<IconTag size={16} />}>
										Price Information
									</Accordion.Control>
									<Accordion.Panel>
										<Stack gap="xs">
											<Group justify="space-between">
												<Text size="sm" c="dimmed">Amount:</Text>
												<Text fw={500}>
													{item.price.currency} {item.price.amount.toLocaleString()}
												</Text>
											</Group>
											{item.price.taxIncluded !== undefined && (
												<Group justify="space-between">
													<Text size="sm" c="dimmed">Tax:</Text>
													<Text size="sm">{item.price.taxIncluded ? "Included" : "Excluded"}</Text>
												</Group>
											)}
											{item.price.taxRate && (
												<Group justify="space-between">
													<Text size="sm" c="dimmed">Tax Rate:</Text>
													<Text size="sm">{item.price.taxRate}%</Text>
												</Group>
											)}
										</Stack>
									</Accordion.Panel>
								</Accordion.Item>
							)}

							{item.releaseDate && (
								<Accordion.Item value="release">
									<Accordion.Control leftSection={<IconCalendar size={16} />}>
										Release Information
									</Accordion.Control>
									<Accordion.Panel>
										<Stack gap="xs">
											{item.releaseDate.ja && (
												<Group justify="space-between">
													<Text size="sm" c="dimmed">Japanese Date:</Text>
													<Text size="sm">{item.releaseDate.ja}</Text>
												</Group>
											)}
											<Group justify="space-between">
												<Text size="sm" c="dimmed">Year:</Text>
												<Text size="sm">{item.releaseDate.year}</Text>
											</Group>
											<Group justify="space-between">
												<Text size="sm" c="dimmed">Month:</Text>
												<Text size="sm">{item.releaseDate.month}</Text>
											</Group>
											{item.releaseDate.day && (
												<Group justify="space-between">
													<Text size="sm" c="dimmed">Day:</Text>
													<Text size="sm">{item.releaseDate.day}</Text>
												</Group>
											)}
										</Stack>
									</Accordion.Panel>
								</Accordion.Item>
							)}

							{manuals.length > 0 && (
								<Accordion.Item value="manuals">
									<Accordion.Control leftSection={<IconDownload size={16} />}>
										Manuals ({manuals.length})
									</Accordion.Control>
									<Accordion.Panel>
										<List spacing="sm">
											{manuals.map((manual, index: number) => {
												const manualId = typeof manual === "string" ? manual : manual.id;
												return (
													<List.Item
														key={index}
														icon={
															<ThemeIcon size="sm" variant="light" color="blue">
																<IconDownload size={12} />
															</ThemeIcon>
														}
													>
														<Anchor href={`/manual/${manualId}`} size="sm">
															View Manual {index + 1}
														</Anchor>
													</List.Item>
												);
											})}
										</List>
									</Accordion.Panel>
								</Accordion.Item>
							)}
						</Accordion>
					</Stack>
				</GridCol>
			</Grid>

			{/* Description section */}
			{description && (
				<Card withBorder p="lg" mt="md">
					<Title order={2} mb="md" leftSection={<IconInfoCircle size={20} />}>
						Description
					</Title>
					<Stack gap="sm">
						{description.split("\n").map((line, index) => (
							<Text key={index} size="md" lh={1.6}>
								{line}
							</Text>
						))}
					</Stack>
				</Card>
			)}

			{/* Accessories section */}
			{accessories.length > 0 && (
				<Card withBorder p="lg" mt="md">
					<Title order={2} mb="md" leftSection={<IconCube size={20} />}>
						Accessories
					</Title>
					<List spacing="sm">
						{accessories.map((accessory, index) => (
							<List.Item key={index}>
								<Text size="md">{accessory}</Text>
							</List.Item>
						))}
					</List>
				</Card>
			)}

			{/* Specifications section */}
			{item.specifications && Object.keys(item.specifications).length > 0 && (
				<Card withBorder p="lg" mt="md">
					<Title order={2} mb="md" leftSection={<IconManualGearbox size={20} />}>
						Specifications
					</Title>
					<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
						{Object.entries(item.specifications).map(([key, value]) => (
							<Box key={key}>
								<Text size="sm" c="dimmed" mb="xs">
									{key
										.replaceAll(/([A-Z])/g, " $1")
										.replace(/^./, (str) => str.toUpperCase())}
								</Text>
								<Text size="md" fw={500}>
									{typeof value === "object"
										? JSON.stringify(value, null, 2)
										: String(value)}
								</Text>
							</Box>
						))}
					</SimpleGrid>
				</Card>
			)}

			{/* Additional metadata section */}
			{item.metadata && Object.keys(item.metadata).length > 0 && (
				<Card withBorder p="lg" mt="md">
					<Title order={2} mb="md" leftSection={<IconInfoCircle size={20} />}>
						Additional Information
					</Title>
					<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
						{Object.entries(item.metadata).map(([key, value]) => {
							if (
								value === null ||
								value === undefined ||
								(typeof value === "string" && value.trim() === "")
							) {
								return null;
							}

							return (
								<Box key={key}>
									<Text size="sm" c="dimmed" mb="xs">
										{key
											.replaceAll(/([A-Z])/g, " $1")
											.replace(/^./, (str) => str.toUpperCase())}
									</Text>
									<Text size="md" fw={500}>
										{typeof value === "object"
											? JSON.stringify(value, null, 2)
											: String(value)}
									</Text>
								</Box>
							);
						})}
					</SimpleGrid>
				</Card>
			)}

			{/* Tags section */}
			{item.tags && item.tags.length > 0 && (
				<Card withBorder p="lg" mt="md">
					<Title order={2} mb="md" leftSection={<IconTag size={20} />}>
						Tags
					</Title>
					<Group gap="xs" wrap="wrap">
						{item.tags.map((tag, index) => (
							<Badge key={index} variant="outline" size="sm">
								{String(tag)}
							</Badge>
						))}
					</Group>
				</Card>
			)}

			{/* Related items section - placeholder for future implementation */}
			<Card withBorder p="lg" mt="md" style={{ display: "none" }}>
				<Title order={2} mb="md">
					Related Items
				</Title>
				<Text c="dimmed">
					Related items feature coming soon...
				</Text>
			</Card>
		</Container>
	);
}