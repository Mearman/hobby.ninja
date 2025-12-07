import {
	Container,
	Grid,
	Card,
	Image,
	Title,
	Text,
	Badge,
	Group,
	Stack,
	Tabs,
	Button,
	ActionIcon,
	Tooltip,
	Modal,
	Alert,
	Divider,
	SimpleGrid,
	ScrollArea,
	Box,
	Flex,
	Anchor,
	Progress,
	List,
	ThemeIcon,
	CopyButton,
	Affix,
	Transition,
	rem,
} from "@mantine/core";
import {
	IconExternalLink,
	IconShare,
	IconDownload,
	IconEye,
	IconSearch,
	IconPhoto,
	IconFile,
	IconInfoCircle,
	IconCheck,
	IconAlertTriangle,
	IconClock,
	IconStar,
	IconBookmark,
	IconPrinter,
	IconX,
	IconZoomIn,
	IconZoomOut,
	IconRotate,
	IconRefresh,
	IconScale,
	IconHeart,
} from "@tabler/icons-react";
import React, { useState, useEffect } from "react";

import { dataService, type UnifiedItem, type ManualItem, type DatabaseCatalogItem } from "../../services/dataService";

import { ListSharing } from "./ListSharing";
import { RelatedItems } from "./RelatedItems";

// Enhanced types for better data handling
interface DetailItem extends UnifiedItem {
  catalogData?: DatabaseCatalogItem;
  manualData?: ManualItem;
}

interface SourceMetadata {
  type: "catalog" | "manual" | "unified";
  confidence: number;
  lastUpdated: string;
  completeness: number; // 0-100
}

interface ImageGalleryProps {
  images: string[];
  title: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title }) => {
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const [isZoomed, setIsZoomed] = useState(false);
	const [rotation, setRotation] = useState(0);
	const [scale, setScale] = useState(1);

	if (!images || images.length === 0) {
		return (
			<Card h={400} withBorder={true}>
				<Flex align="center" justify="center" h="100%">
					<Stack align="center" gap="sm">
						<ThemeIcon size="xl" variant="light">
							<IconPhoto size={24} />
						</ThemeIcon>
						<Text c="dimmed">No images available</Text>
					</Stack>
				</Flex>
			</Card>
		);
	}

	const currentImage = images[currentImageIndex];

	const handleZoomToggle = () => {
		setIsZoomed(!isZoomed);
		if (isZoomed) {
			setScale(1);
			setRotation(0);
		} else {
			setScale(1.5);
			setRotation(0);
		}
	};

	const handleRotate = () => {
		setRotation((prev) => (prev + 90) % 360);
	};

	const handleScale = (delta: number) => {
		setScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
	};

	return (
		<Card withBorder={true}>
			<Card.Section>
				<Flex justify="space-between" p="xs">
					<Text size="sm" fw={500}>
						{currentImageIndex + 1} / {images.length}
					</Text>
					<Group gap="xs">
						<Tooltip label="Zoom">
							<ActionIcon variant="subtle" onClick={handleZoomToggle}>
								<IconSearch size={16} />
							</ActionIcon>
						</Tooltip>
						<Tooltip label="Rotate">
							<ActionIcon variant="subtle" onClick={handleRotate}>
								<IconRotate size={16} />
							</ActionIcon>
						</Tooltip>
						<Tooltip label="Zoom In">
							<ActionIcon variant="subtle" onClick={() => { handleScale(0.2); }}>
								<IconZoomIn size={16} />
							</ActionIcon>
						</Tooltip>
						<Tooltip label="Zoom Out">
							<ActionIcon variant="subtle" onClick={() => { handleScale(-0.2); }}>
								<IconZoomOut size={16} />
							</ActionIcon>
						</Tooltip>
					</Group>
				</Flex>
			</Card.Section>

			<Box
				h={400}
				pos="relative"
				style={{
					overflow: isZoomed ? "auto" : "hidden",
					cursor: isZoomed ? "move" : "default",
				}}
			>
				<Image
					src={currentImage}
					alt={`${title} - Image ${currentImageIndex + 1}`}
					style={{
						transform: `scale(${scale}) rotate(${rotation}deg)`,
						transition: "transform 0.3s ease",
						cursor: isZoomed ? "grabbing" : "default",
					}}
					onClick={isZoomed ? handleZoomToggle : undefined}
					fit="contain"
					h="100%"
					w="100%"
				/>
			</Box>

			{images.length > 1 && (
				<Card.Section p="xs">
					<SimpleGrid cols={Math.min(4, images.length)} spacing="xs">
						{images.map((image, index) => (
							<Box
								key={index}
								pos="relative"
								style={{
									opacity: index === currentImageIndex ? 1 : 0.6,
									border: index === currentImageIndex ? "2px solid var(--mantine-primary-color-filled)" : "none",
									borderRadius: "4px",
									overflow: "hidden",
									cursor: "pointer",
								}}
								onClick={() => { setCurrentImageIndex(index); }}
							>
								<Image
									src={image}
									alt={`${title} - Thumbnail ${index + 1}`}
									h={60}
									w="100%"
									fit="cover"
								/>
							</Box>
						))}
					</SimpleGrid>
				</Card.Section>
			)}
		</Card>
	);
};

interface PDFViewerProps {
  pdfUrl?: string;
  title: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl, title }) => {
	const [isOpened, setIsOpened] = useState(false);

	if (!pdfUrl) {
		return (
			<Alert icon={<IconFile size={16} />} title="Manual Not Available">
        No PDF manual is available for this item.
			</Alert>
		);
	}

	return (
		<>
			<Button
				variant="outline"
				leftSection={<IconFile size={16} />}
				onClick={() => { setIsOpened(true); }}
				fullWidth={true}
			>
        View PDF Manual
			</Button>

			<Modal
				opened={isOpened}
				onClose={() => { setIsOpened(false); }}
				size="90%"
				title={title}
				centered={true}
			>
				<iframe
					src={pdfUrl}
					style={{
						width: "100%",
						height: "80vh",
						border: "none",
					}}
					title={`${title} PDF Manual`}
				/>
			</Modal>
		</>
	);
};

interface ConfidenceIndicatorProps {
  confidence: number;
  label: string;
}

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({ confidence, label }) => {
	const getColor = () => {
		if (confidence >= 0.8) return "green";
		if (confidence >= 0.6) return "yellow";
		return "red";
	};

	const getIcon = () => {
		if (confidence >= 0.8) return <IconCheck size={12} />;
		if (confidence >= 0.6) return <IconAlertTriangle size={12} />;
		return <IconX size={12} />;
	};

	return (
		<Group gap="xs" wrap="nowrap">
			<ThemeIcon color={getColor()} size="sm">
				{getIcon()}
			</ThemeIcon>
			<div>
				<Text size="xs" fw={500}>
					{label}
				</Text>
				<Progress value={confidence * 100} size="xs" color={getColor()} />
			</div>
		</Group>
	);
};

interface ItemDetailProps {
  itemId: string;
  preferSource?: "unified" | "manual" | "catalog";
  onRelatedItemClick?: (itemId: string) => void;
}

export const ItemDetail: React.FC<ItemDetailProps> = ({
	itemId,
	preferSource = "unified",
	onRelatedItemClick,
}) => {
	const [item, setItem] = useState<DetailItem | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showSharing, setShowSharing] = useState(false);
	const [shareSuccess, setShareSuccess] = useState(false);

	useEffect(() => {
		loadItem();
	}, [itemId, preferSource]);

	const loadItem = async () => {
		setLoading(true);
		setError(null);

		try {
			const loadedItem = await dataService.getItemById(itemId, preferSource);
			if (!loadedItem) {
				setError("Item not found");
				return;
			}

			// Only unified items can be DetailItems with source data
			if (loadedItem.type !== "unified_item") {
				// For non-unified items, use as-is without casting to DetailItem
				setItem(loadedItem as any);
				return;
			}

			// Create a proper DetailItem from unified item
			const unifiedItem = loadedItem as UnifiedItem;
			const [catalogData, manualData] = await Promise.all([
				unifiedItem.properties?.sources?.catalog
					? dataService.getItemById(unifiedItem.properties.sources.catalog.id, "catalog")
					: Promise.resolve(null),
				unifiedItem.properties?.sources?.manual
					? dataService.getItemById(unifiedItem.properties.sources.manual.id, "manual")
					: Promise.resolve(null),
			]);

			// Type the results properly
			const catalogDataTyped = catalogData as DatabaseCatalogItem | null;
			const manualDataTyped = manualData as ManualItem | null;

			const detailItem: DetailItem = {
				...unifiedItem,
				catalogData: catalogDataTyped || undefined,
				manualData: manualDataTyped || undefined,
			};

			setItem(detailItem);
		} catch (error_) {
			setError(error_ instanceof Error ? error_.message : "Failed to load item");
		} finally {
			setLoading(false);
		}
	};

	const handleShare = () => {
		setShowSharing(true);
	};

	const handleExport = async () => {
		if (!item) return;

		try {
			const exportData = {
				item,
				exportedAt: new Date().toISOString(),
				exportType: "single_item",
			};

			const blob = new Blob([JSON.stringify(exportData, null, 2)], {
				type: "application/json",
			});

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${item.properties?.name?.ja || item.properties?.name?.en || "item"}-${itemId}.json`;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);

			setShareSuccess(true);
			setTimeout(() => { setShareSuccess(false); }, 3000);
		} catch (error_) {
			console.error("Export failed:", error_);
		}
	};

	const handlePrint = () => {
		globalThis.print();
	};

	const getSourcesMetadata = (): SourceMetadata[] => {
		if (!item) return [];

		const sources: SourceMetadata[] = [];

		if ("sources" in item && item.properties?.sources) {
			const unifiedItem = item as UnifiedItem;

			if (unifiedItem.properties.sources.catalog) {
				sources.push({
					type: "catalog",
					confidence: unifiedItem.properties.sources.catalog.confidence,
					lastUpdated: unifiedItem.properties.sources.catalog.linkedAt,
					completeness: item.catalogData ? 85 : 60,
				});
			}

			if (unifiedItem.properties.sources.manual) {
				sources.push({
					type: "manual",
					confidence: unifiedItem.properties.sources.manual.confidence,
					lastUpdated: unifiedItem.properties.sources.manual.linkedAt,
					completeness: item.manualData ? 90 : 50,
				});
			}
		} else {
			// Single source item
			if ("images" in item) {
				sources.push({
					type: "catalog",
					confidence: 1,
					lastUpdated: item.metadata?.updatedAt || new Date().toISOString(),
					completeness: 85,
				});
			} else {
				sources.push({
					type: "manual",
					confidence: 1,
					lastUpdated: item.metadata?.updatedAt || new Date().toISOString(),
					completeness: 90,
				});
			}
		}

		return sources;
	};

	const getAllImages = (): string[] => {
		if (!item) return [];

		const images: string[] = [];

		// Add catalog images
		if (item.catalogData?.images) {
			images.push(...item.catalogData.images);
		} else if ("images" in item && Array.isArray(item.images)) {
			images.push(...item.images);
		}

		// Add manual images
		if (item.manualData?.properties?.thumbnailImage) {
			images.push(item.manualData.properties.thumbnailImage);
		}
		if (item.manualData?.properties?.productImage) {
			images.push(item.manualData.properties.productImage);
		}

		return [...new Set(images)]; // Remove duplicates
	};

	if (loading) {
		return (
			<Container size="lg" py="xl">
				<Card p="xl" withBorder={true}>
					<Stack align="center">
						<IconClock size={48} />
						<Text>Loading item details...</Text>
					</Stack>
				</Card>
			</Container>
		);
	}

	if (error || !item) {
		return (
			<Container size="lg" py="xl">
				<Alert icon={<IconAlertTriangle size={16} />} color="red" title="Error">
					{error || "Item not found"}
				</Alert>
			</Container>
		);
	}

	const sourcesMetadata = getSourcesMetadata();
	const images = getAllImages();
	const title = item.properties?.name?.ja || item.properties?.name?.en || "Unknown Item";

	return (
		<Container size="xl" py="md">
			{/* Success notification */}
			<Transition mounted={shareSuccess} transition="fade" duration={300}>
				{(styles) => (
					<Affix position={{ top: 20, right: 20 }} style={styles}>
						<Alert color="green" withCloseButton={true} onClose={() => { setShareSuccess(false); }}>
              Item exported successfully!
						</Alert>
					</Affix>
				)}
			</Transition>

			<Card withBorder={true}>
				<Card.Section p="md">
					<Group justify="space-between" wrap="nowrap">
						<Stack gap="xs">
							<Title order={1}>{title}</Title>
							{item.properties?.name?.en && <Text c="dimmed">{item.properties.name.en}</Text>}
							<Group gap="xs">
								{item.properties?.grade && <Badge variant="light">{item.properties.grade}</Badge>}
								{item.properties?.scale && <Badge variant="light">{item.properties.scale}</Badge>}
								{item.properties?.series && (
									<Badge variant="outline">
										{item.properties.series.ja || item.properties.series.en}
									</Badge>
								)}
							</Group>
						</Stack>

						<Group gap="xs">
							<Tooltip label="Share">
								<ActionIcon variant="light" onClick={handleShare}>
									<IconShare size={16} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Export">
								<ActionIcon variant="light" onClick={handleExport}>
									<IconDownload size={16} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Print">
								<ActionIcon variant="light" onClick={handlePrint}>
									<IconPrinter size={16} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Favorite">
								<ActionIcon variant="light">
									<IconHeart size={16} />
								</ActionIcon>
							</Tooltip>
						</Group>
					</Group>
				</Card.Section>

				<Card.Section>
					<Tabs defaultValue="overview" p="md">
						<Tabs.List>
							<Tabs.Tab value="overview" leftSection={<IconEye size={16} />}>
                Overview
							</Tabs.Tab>
							<Tabs.Tab value="details" leftSection={<IconInfoCircle size={16} />}>
                Details
							</Tabs.Tab>
							<Tabs.Tab value="sources" leftSection={<IconExternalLink size={16} />}>
                Sources
							</Tabs.Tab>
							<Tabs.Tab value="manual" leftSection={<IconFile size={16} />}>
                Manual
							</Tabs.Tab>
							<Tabs.Tab value="related" leftSection={<IconStar size={16} />}>
                Related Items
							</Tabs.Tab>
						</Tabs.List>

						<Tabs.Panel value="overview" p="md">
							<Grid>
								<Grid.Col span={{ base: 12, md: 8 }}>
									<Stack gap="md">
										<ImageGallery images={images} title={title} />

										{/* Description */}
										{(item.catalogData?.description || item.manualData?.properties?.name?.en) && (
											<Card withBorder={true}>
												<Card.Section withBorder={true} inheritPadding={true} py="xs">
													<Text fw={500}>Description</Text>
												</Card.Section>
												<Stack gap="sm" p="md">
													{item.catalogData?.description && (
														<Text key="catalog-desc" size="sm">
															{item.catalogData.description}
														</Text>
													)}
													{item.manualData?.properties?.name && (
														<Text size="sm">
                              Manual: {item.manualData.properties.name.ja || item.manualData.properties.name.en}
														</Text>
													)}
												</Stack>
											</Card>
										)}
									</Stack>
								</Grid.Col>

								<Grid.Col span={{ base: 12, md: 4 }}>
									<Stack gap="md">
										{/* Quick Info */}
										<Card withBorder={true}>
											<Card.Section withBorder={true} inheritPadding={true} py="xs">
												<Text fw={500}>Quick Info</Text>
											</Card.Section>
											<Stack gap="xs" p="md">
												{item.properties?.releaseDate && (
													<Group>
														<Text size="sm" c="dimmed">Release:</Text>
														<Text size="sm" fw={500}>
															{item.properties.releaseDate.month ? `${item.properties.releaseDate.year}/${item.properties.releaseDate.month}` : item.properties.releaseDate.year}
														</Text>
													</Group>
												)}
												{item.properties?.sources?.manual?.productNumber && (
													<Group>
														<Text size="sm" c="dimmed">Product No:</Text>
														<Text size="sm" fw={500}>{item.properties.sources.manual.productNumber}</Text>
													</Group>
												)}
												</Stack>
										</Card>

										{/* Source Quality */}
										<Card withBorder={true}>
											<Card.Section withBorder={true} inheritPadding={true} py="xs">
												<Text fw={500}>Data Sources</Text>
											</Card.Section>
											<Stack gap="xs" p="md">
												{sourcesMetadata.map((source, idx) => (
													<ConfidenceIndicator
														key={idx}
														confidence={source.confidence}
														label={`${source.type.charAt(0).toUpperCase() + source.type.slice(1)} (${Math.round(source.completeness)}%)`}
													/>
												))}
											</Stack>
										</Card>

										{/* Quick Actions */}
										<Card withBorder={true}>
											<Card.Section withBorder={true} inheritPadding={true} py="xs">
												<Text fw={500}>Quick Actions</Text>
											</Card.Section>
											<Stack gap="xs" p="md">
												<PDFViewer
													pdfUrl={item.properties?.sources?.manual?.pdfUrl}
													title={title}
												/>
												<Button
													variant="outline"
													leftSection={<IconBookmark size={16} />}
													fullWidth={true}
												>
                          Add to Collection
												</Button>
											</Stack>
										</Card>
									</Stack>
								</Grid.Col>
							</Grid>
						</Tabs.Panel>

						<Tabs.Panel value="details" p="md">
							<Grid>
								<Grid.Col span={{ base: 12, md: 6 }}>
									<Card withBorder={true} h="100%">
										<Card.Section withBorder={true} inheritPadding={true} py="xs">
											<Text fw={500}>Basic Information</Text>
										</Card.Section>
										<Stack gap="sm" p="md">
											{item.properties?.grade && (
												<Group>
													<Text size="sm" c="dimmed" w={100}>Grade:</Text>
													<Text size="sm">{item.properties?.grade}</Text>
												</Group>
											)}
											{item.properties?.scale && (
												<Group>
													<Text size="sm" c="dimmed" w={100}>Scale:</Text>
													<Text size="sm">{item.properties?.scale}</Text>
												</Group>
											)}
											{item.properties?.series && (
												<Group>
													<Text size="sm" c="dimmed" w={100}>Series:</Text>
													<Text size="sm">{item.properties?.series.ja || item.properties?.series.en}</Text>
												</Group>
											)}
											{item.properties?.releaseDate && (
												<Group>
													<Text size="sm" c="dimmed" w={100}>Release Date:</Text>
													<Text size="sm">
														{item.properties?.releaseDate.year}年
														{item.properties?.releaseDate.month && `${item.properties?.releaseDate.month}月`}
														{item.properties?.releaseDate.day && `${item.properties?.releaseDate.day}日`}
													</Text>
												</Group>
											)}
										</Stack>
									</Card>
								</Grid.Col>

								<Grid.Col span={{ base: 12, md: 6 }}>
									<Card withBorder={true} h="100%">
										<Card.Section withBorder={true} inheritPadding={true} py="xs">
											<Text fw={500}>Match Information</Text>
										</Card.Section>
										<Stack gap="sm" p="md">
											<Group>
												<Text size="sm" c="dimmed" w={100}>Match Method:</Text>
												<Badge
													color={
														item.properties?.matchMethod === "exact" ? "green" :
															(item.properties?.matchMethod === "fuzzy" ? "yellow" : "blue")
													}
												>
													{item.properties?.matchMethod}
												</Badge>
											</Group>
											{item.properties?.matchStage && (
												<Group>
													<Text size="sm" c="dimmed" w={100}>Match Stage:</Text>
													<Text size="sm">{item.properties.matchStage}/5</Text>
												</Group>
											)}
											<Group>
												<Text size="sm" c="dimmed" w={100}>Last Updated:</Text>
												<Text size="sm">
													{new Date(item.metadata?.updatedAt || Date.now()).toLocaleDateString()}
												</Text>
											</Group>
										</Stack>
									</Card>
								</Grid.Col>
							</Grid>

						</Tabs.Panel>

						<Tabs.Panel value="sources" p="md">
							<Stack gap="md">
								{sourcesMetadata.map((source, idx) => (
									<Card withBorder={true} key={idx}>
										<Card.Section withBorder={true} inheritPadding={true} py="xs">
											<Group justify="space-between">
												<Text fw={500}>
													{source.type.charAt(0).toUpperCase() + source.type.slice(1)} Source
												</Text>
												<Badge
													color={
														source.confidence >= 0.8 ? "green" :
															(source.confidence >= 0.6 ? "yellow" : "red")
													}
												>
													{Math.round(source.confidence * 100)}% confidence
												</Badge>
											</Group>
										</Card.Section>
										<Stack gap="sm" p="md">
											<Group>
												<Text size="sm" c="dimmed">Last Updated:</Text>
												<Text size="sm">{new Date(source.lastUpdated).toLocaleString()}</Text>
											</Group>
											<Group>
												<Text size="sm" c="dimmed">Completeness:</Text>
												<Progress value={source.completeness} size="sm" w={200} />
											</Group>
										</Stack>
									</Card>
								))}
							</Stack>
						</Tabs.Panel>

						<Tabs.Panel value="manual" p="md">
							<Stack gap="md">
								{item.manualData ? (
									<>
										<Card withBorder={true}>
											<Card.Section withBorder={true} inheritPadding={true} py="xs">
												<Text fw={500}>Manual Information</Text>
											</Card.Section>
											<Stack gap="sm" p="md">
												<Group>
													<Text size="sm" c="dimmed">Title:</Text>
													<Text size="sm">
														{item.manualData.properties?.name?.ja || item.manualData.properties?.name?.en || "Unknown"}
													</Text>
												</Group>
											</Stack>
										</Card>

										<PDFViewer
											pdfUrl={item.properties?.sources?.manual?.pdfUrl}
											title={title}
										/>
									</>
								) : (
									<Alert icon={<IconFile size={16} />}>
                    No manual data is available for this item.
									</Alert>
								)}
							</Stack>
						</Tabs.Panel>

						<Tabs.Panel value="related" p="md">
							<RelatedItems
								currentItem={item}
								onItemClick={onRelatedItemClick}
							/>
						</Tabs.Panel>
					</Tabs>
				</Card.Section>
			</Card>

			{/* Sharing Modal */}
			<Modal
				opened={showSharing}
				onClose={() => { setShowSharing(false); }}
				title="Share Item"
				size="lg"
			>
				<ListSharing
					items={[item]}
					onClose={() => { setShowSharing(false); }}
				/>
			</Modal>
		</Container>
	);
};