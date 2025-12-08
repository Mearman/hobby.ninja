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
	SimpleGrid,
	Box,
	Flex,
	Progress,
	ThemeIcon,
	Affix,
	Transition,
} from "@mantine/core";
import {
	IconShare,
	IconDownload,
	IconFile,
	IconHeart,
	IconPhoto,
	IconSearch,
	IconRotate,
	IconZoomIn,
	IconZoomOut,
	IconCheck,
	IconAlertTriangle,
	IconX,
	IconClock,
	IconEye,
	IconInfoCircle,
	IconExternalLink,
	IconStar,
	IconPrinter,
	IconBookmark,
} from "@tabler/icons-react";
import React, { useState, useEffect, useCallback } from "react";

import { dataService, type UnifiedItem, type ManualItem, type CatalogItem } from "../../services/dataService";

import { ListSharing } from "./list-sharing";
import { RelatedItems } from "./related-items";

// Enhanced types for better data handling
interface DetailItem extends UnifiedItem {
  catalogData?: CatalogItem;
  manualData?: ManualItem;
}

// Constants for magic numbers
const SCALE_FACTOR_RESET = 1.5;
const ROTATION_DEGREES = 90;
const SCALE_STEP = 0.2;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const IMAGE_HEIGHT = 400;
const HIGH_CONFIDENCE = 0.8;
const MEDIUM_CONFIDENCE = 0.6;
const SHARE_SUCCESS_TIMEOUT = 3000;
const HIGH_CONFIDENCE_PERCENTAGE = 85;
const MEDIUM_CONFIDENCE_PERCENTAGE = 60;
const PROGRESS_BAR_WIDTH = 200;
const FULL_ROTATION_DEGREES = 360;
const THUMBNAIL_ACTIVE_OPACITY = 1;
const THUMBNAIL_INACTIVE_OPACITY = 0.6;
const PERCENTAGE_MULTIPLIER = 100;

// UI constants
const THUMBNAIL_HEIGHT = 60;
const LOADING_ICON_SIZE = 48;
const THUMBNAIL_GRID_COLS = 4;
const TRANSITION_DURATION = 300;
const AFFIX_OFFSET = 20;

// Icon sizes
const ICON_SIZE_SM = 12;
const ICON_SIZE_MD = 16;
const ICON_SIZE_XL = 24;

// Mantine spacing constants
const SPACING_XS = "xs";
const SPACING_SM = "sm";
const SPACING_MD = "md";
const SPACING_XL = "xl";

// Container sizes
const CONTAINER_SIZE_LG = "lg";
const CONTAINER_SIZE_XL = "xl";

// Width constants
const LABEL_WIDTH = 100;

// Completeness percentages
const MANUAL_DATA_COMPLETENESS_HIGH = 90;
const MANUAL_DATA_COMPLETENESS_LOW = 50;
const CATALOG_ITEM_COMPLETENESS = 85;
const MANUAL_ITEM_COMPLETENESS = 90;

// Union type for all possible item types
type ItemDetailData = DetailItem | CatalogItem | ManualItem;

interface SourceMetadata {
  type: "catalog" | "manual" | "unified";
  confidence: number;
  lastUpdated: string;
  completeness: number; // 0-100
}

// Extended item properties interface for common properties
interface ExtendedItemProperties {
	grade?: string;
	scale?: string;
	series?: string | { ja?: string; en?: string };
	releaseDate?: {
		year?: number;
		month?: number;
		day?: number;
	};
	productNumber?: string;
	name?: string | { ja?: string; en?: string };
	pdfUrl?: string;
	thumbnailImage?: string;
	productImage?: string;
	matchMethod?: "exact" | "fuzzy" | "manual";
	matchStage?: number;
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

	if (!images.length) {
		return (
			<Card h={IMAGE_HEIGHT} withBorder={true}>
				<Flex align="center" justify="center" h="100%">
					<Stack align="center" gap={SPACING_SM}>
						<ThemeIcon size="xl" variant="light">
							<IconPhoto size={ICON_SIZE_XL} />
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
			setScale(SCALE_FACTOR_RESET);
			setRotation(0);
		}
	};

	const handleRotate = () => {
		setRotation((prev) => (prev + ROTATION_DEGREES) % FULL_ROTATION_DEGREES);
	};

	const handleScale = (delta: number) => {
		setScale((prev) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta)));
	};

	return (
		<Card withBorder={true}>
			<Card.Section>
				<Flex justify="space-between" p={SPACING_XS}>
					<Text size="sm" fw={500}>
						{currentImageIndex + 1} / {images.length}
					</Text>
					<Group gap={SPACING_XS}>
						<Tooltip label="Zoom">
							<ActionIcon variant="subtle" onClick={handleZoomToggle}>
								<IconSearch size={ICON_SIZE_MD} />
							</ActionIcon>
						</Tooltip>
						<Tooltip label="Rotate">
							<ActionIcon variant="subtle" onClick={handleRotate}>
								<IconRotate size={ICON_SIZE_MD} />
							</ActionIcon>
						</Tooltip>
						<Tooltip label="Zoom In">
							<ActionIcon variant="subtle" onClick={() => { handleScale(SCALE_STEP); }}>
								<IconZoomIn size={ICON_SIZE_MD} />
							</ActionIcon>
						</Tooltip>
						<Tooltip label="Zoom Out">
							<ActionIcon variant="subtle" onClick={() => { handleScale(-SCALE_STEP); }}>
								<IconZoomOut size={ICON_SIZE_MD} />
							</ActionIcon>
						</Tooltip>
					</Group>
				</Flex>
			</Card.Section>

			<Box
				h={IMAGE_HEIGHT}
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
				<Card.Section p={SPACING_XS}>
					<SimpleGrid cols={Math.min(THUMBNAIL_GRID_COLS, images.length)} spacing={SPACING_XS}>
						{images.map((image, index) => (
							<Box
								key={index}
								pos="relative"
								style={{
									opacity: index === currentImageIndex ? THUMBNAIL_ACTIVE_OPACITY : THUMBNAIL_INACTIVE_OPACITY,
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
									h={THUMBNAIL_HEIGHT}
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
			<Alert icon={<IconFile size={ICON_SIZE_MD} />} title="Manual Not Available">
        No PDF manual is available for this item.
			</Alert>
		);
	}

	return (
		<>
			<Button
				variant="outline"
				leftSection={<IconFile size={ICON_SIZE_MD} />}
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
		if (confidence >= HIGH_CONFIDENCE) return "green";
		if (confidence >= MEDIUM_CONFIDENCE) return "yellow";
		return "red";
	};

	const getIcon = () => {
		if (confidence >= HIGH_CONFIDENCE) return <IconCheck size={ICON_SIZE_SM} />;
		if (confidence >= MEDIUM_CONFIDENCE) return <IconAlertTriangle size={ICON_SIZE_SM} />;
		return <IconX size={ICON_SIZE_SM} />;
	};

	return (
		<Group gap={SPACING_XS} wrap="nowrap">
			<ThemeIcon color={getColor()} size="sm">
				{getIcon()}
			</ThemeIcon>
			<div>
				<Text size="xs" fw={500}>
					{label}
				</Text>
				<Progress value={confidence * PERCENTAGE_MULTIPLIER} size="xs" color={getColor()} />
			</div>
		</Group>
	);
};

interface ItemDetailProps {
  itemId: string;
  preferSource?: "unified" | "manual" | "catalog";
  onRelatedItemClick?: (itemId: string) => void;
}

// Print handler moved to outer scope to avoid recreation on every render
const handlePrint = () => {
	globalThis.print();
};

export const ItemDetail: React.FC<ItemDetailProps> = ({
	itemId,
	preferSource = "unified",
	onRelatedItemClick,
}) => {
	const [item, setItem] = useState<ItemDetailData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showSharing, setShowSharing] = useState(false);
	const [shareSuccess, setShareSuccess] = useState(false);

	useEffect(() => {
		void loadItem();
	}, [itemId, preferSource, loadItem]);

	const loadItem = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const loadedItem = await dataService.getItemById(itemId, preferSource);
			if (!loadedItem) {
				setError("Item not found");
				return;
			}

			// Only unified items can be DetailItems with source data
			if (loadedItem.$type !== "unified_item") {
				// For non-unified items, use as-is
				setItem(loadedItem as ItemDetailData);
				return;
			}

			// Create a proper DetailItem from unified item
			const unifiedItem = loadedItem;
			const catalogDataPromise = unifiedItem.properties?.sources?.catalog
				? dataService.getItemById(unifiedItem.properties.sources.catalog.id, "catalog")
				: Promise.resolve(null);
			const manualDataPromise = unifiedItem.properties?.sources?.manual
				? dataService.getItemById(unifiedItem.properties.sources.manual.id, "manual")
				: Promise.resolve(null);
			const [catalogData, manualData] = await Promise.all([catalogDataPromise, manualDataPromise]);

			// Type the results properly
			const catalogDataTyped = catalogData as CatalogItem | null;
			const manualDataTyped = manualData as ManualItem | null;

			const detailItem: DetailItem = {
				...unifiedItem,
				catalogData: catalogDataTyped ?? undefined,
				manualData: manualDataTyped ?? undefined,
			};

			setItem(detailItem);
		} catch (error_) {
			setError(error_ instanceof Error ? error_.message : "Failed to load item");
		} finally {
			setLoading(false);
		}
	}, [itemId, preferSource]);

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
			link.download = `${item.properties.name?.ja ?? item.properties.name?.en ?? "item"}-${itemId}.json`;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);

			setShareSuccess(true);
			await new Promise(resolve => setTimeout(resolve, SHARE_SUCCESS_TIMEOUT));
			setShareSuccess(false);
		} catch (error_) {
			console.error("Export failed:", error_);
		}
	};

	// Helper function to get item name safely
	const getItemName = (): string => {
		if (!item || !item.properties?.name) return "Unknown Item";

		if (typeof item.properties.name === "string") {
			return item.properties.name;
		}

		return item.properties.name.en ?? item.properties.name.ja ?? "Unknown Item";
	};

	// Helper function to get item properties safely
	const getCommonProperty = (propertyName: "grade" | "scale"): string | null => {
		if (!item || !item.properties) return null;

		const props = item.properties as ExtendedItemProperties;
		const value = props[propertyName];

		if (!value) return null;

		return typeof value === "string" ? value : null;
	};

	// Helper function to get series property (object type)
	const getSeriesProperty = (): { ja?: string; en?: string } | string | null => {
		if (!item || !item.properties) return null;

		const props = item.properties as ExtendedItemProperties;
		return props.series ?? null;
	};

	// Helper function to render series property as string
	const renderSeriesProperty = (): string | null => {
		const series = getSeriesProperty();
		if (!series) return null;

		if (typeof series === "string") return series;

		return series.en ?? series.ja ?? null;
	};

	// Helper function to get match method safely
	const getMatchMethod = (): "exact" | "fuzzy" | "manual" | null => {
		if (!item || !item.properties) return null;

		const props = item.properties as ExtendedItemProperties;
		return props.matchMethod ?? null;
	};

	// Helper function to get match stage safely
	const getMatchStage = (): number | null => {
		if (!item || !item.properties) return null;

		const props = item.properties as ExtendedItemProperties;
		return props.matchStage ?? null;
	};

	const getSourcesMetadata = (): SourceMetadata[] => {
		if (!item) return [];

		const sources: SourceMetadata[] = [];

		// Check if it's a unified item with sources
		if (item.$type === "unified_item" && item.properties?.sources) {
			const unifiedItem = item;

			if (unifiedItem.properties.sources.catalog) {
				sources.push({
					type: "catalog",
					confidence: unifiedItem.properties.sources.catalog.confidence,
					lastUpdated: unifiedItem.properties.sources.catalog.linkedAt,
					completeness: unifiedItem.catalogData ? HIGH_CONFIDENCE_PERCENTAGE : MEDIUM_CONFIDENCE_PERCENTAGE,
				});
			}

			if (unifiedItem.properties.sources.manual) {
				sources.push({
					type: "manual",
					confidence: unifiedItem.properties.sources.manual.confidence,
					lastUpdated: unifiedItem.properties.sources.manual.linkedAt,
					completeness: unifiedItem.manualData ? MANUAL_DATA_COMPLETENESS_HIGH : MANUAL_DATA_COMPLETENESS_LOW,
				});
			}
		} else {
			// Single source item - determine type based on the item's actual type
			if (item.$type === "catalog_item") {
				sources.push({
					type: "catalog",
					confidence: 1,
					lastUpdated: item.metadata?.updatedAt ?? new Date().toISOString(),
					completeness: CATALOG_ITEM_COMPLETENESS,
				});
			} else if (item.$type === "manual_item") {
				sources.push({
					type: "manual",
					confidence: 1,
					lastUpdated: item.metadata?.updatedAt ?? new Date().toISOString(),
					completeness: MANUAL_ITEM_COMPLETENESS,
				});
			} else {
				// Default to manual for unknown types
				sources.push({
					type: "manual",
					confidence: 1,
					lastUpdated: item.metadata?.updatedAt ?? new Date().toISOString(),
					completeness: MANUAL_ITEM_COMPLETENESS,
				});
			}
		}

		return sources;
	};

	const getAllImages = (): string[] => {
		if (!item) return [];

		const images: string[] = [];

		// Check if it's a unified item with catalog data
		switch (item.$type) {
			case "unified_item": {
				const unifiedItem = item;

				// Add catalog images from unified item
				// Note: thumbnailImage property doesn't exist in current schema
				// if (unifiedItem.catalogData?.properties?.thumbnailImage) {
				// 	images.push(unifiedItem.catalogData.properties.thumbnailImage);
				// }

				// Add manual images from unified item
				if (unifiedItem.manualData?.properties?.thumbnailImage) {
					images.push(unifiedItem.manualData.properties.thumbnailImage);
				}
				if (unifiedItem.manualData?.properties?.productImage) {
					images.push(unifiedItem.manualData.properties.productImage);
				}
		
				break;
			}
			case "catalog_item": {
			// Direct catalog item - check for image properties
				// Note: thumbnailImage property doesn't exist in current schema
				// if (item.properties?.thumbnailImage) {
				// 	images.push(item.properties.thumbnailImage);
				// }

				break;
			}
			case "manual_item": {
			// Direct manual item - check for image properties
				if (item.properties?.thumbnailImage) {
					images.push(item.properties.thumbnailImage);
				}
				if (item.properties?.productImage) {
					images.push(item.properties.productImage);
				}

				break;
			}
		// No default
		}

		return [...new Set(images)]; // Remove duplicates
	};

	if (loading) {
		return (
			<Container size={CONTAINER_SIZE_LG} py={SPACING_XL}>
				<Card p={SPACING_XL} withBorder={true}>
					<Stack align="center">
						<IconClock size={LOADING_ICON_SIZE} />
						<Text>Loading item details...</Text>
					</Stack>
				</Card>
			</Container>
		);
	}

	if (error || !item) {
		return (
			<Container size={CONTAINER_SIZE_LG} py={SPACING_XL}>
				<Alert icon={<IconAlertTriangle size={ICON_SIZE_MD} />} color="red" title="Error">
					{error ?? "Item not found"}
				</Alert>
			</Container>
		);
	}

	const sourcesMetadata = getSourcesMetadata();
	const images = getAllImages();
	const title = getItemName();

	return (
		<Container size={CONTAINER_SIZE_XL} py={SPACING_MD}>
			{/* Success notification */}
			<Transition mounted={shareSuccess} transition="fade" duration={TRANSITION_DURATION}>
				{(styles) => (
					<Affix position={{ top: AFFIX_OFFSET, right: AFFIX_OFFSET }} style={styles}>
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
							{item.properties.name && typeof item.properties.name === "object" && item.properties.name.en && (
								<Text c="dimmed">{item.properties.name.en}</Text>
							)}
							<Group gap="xs">
								{getCommonProperty("grade") && <Badge variant="light">{getCommonProperty("grade")}</Badge>}
								{getCommonProperty("scale") && <Badge variant="light">{getCommonProperty("scale")}</Badge>}
								{renderSeriesProperty() && (
									<Badge variant="outline">
										{renderSeriesProperty()}
									</Badge>
								)}
							</Group>
						</Stack>

						<Group gap="xs">
							<Tooltip label="Share">
								<ActionIcon variant="light" onClick={handleShare}>
									<IconShare size={ICON_SIZE_MD} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Export">
								<ActionIcon variant="light" onClick={handleExport}>
									<IconDownload size={ICON_SIZE_MD} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Print">
								<ActionIcon variant="light" onClick={handlePrint}>
									<IconPrinter size={ICON_SIZE_MD} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Favorite">
								<ActionIcon variant="light">
									<IconHeart size={ICON_SIZE_MD} />
								</ActionIcon>
							</Tooltip>
						</Group>
					</Group>
				</Card.Section>

				<Card.Section>
					<Tabs defaultValue="overview" p="md">
						<Tabs.List>
							<Tabs.Tab value="overview" leftSection={<IconEye size={ICON_SIZE_MD} />}>
                Overview
							</Tabs.Tab>
							<Tabs.Tab value="details" leftSection={<IconInfoCircle size={ICON_SIZE_MD} />}>
                Details
							</Tabs.Tab>
							<Tabs.Tab value="sources" leftSection={<IconExternalLink size={ICON_SIZE_MD} />}>
                Sources
							</Tabs.Tab>
							<Tabs.Tab value="manual" leftSection={<IconFile size={ICON_SIZE_MD} />}>
                Manual
							</Tabs.Tab>
							<Tabs.Tab value="related" leftSection={<IconStar size={ICON_SIZE_MD} />}>
                Related Items
							</Tabs.Tab>
						</Tabs.List>

						<Tabs.Panel value="overview" p="md">
							<Grid>
								<Grid.Col span={{ base: 12, md: 8 }}>
									<Stack gap="md">
										<ImageGallery images={images} title={title} />

										{/* Description */}
										{item.$type === "unified_item" && ((item).catalogData?.properties?.description || (item).manualData?.properties?.name?.en) && (
											<Card withBorder={true}>
												<Card.Section withBorder={true} inheritPadding={true} py="xs">
													<Text fw={500}>Description</Text>
												</Card.Section>
												<Stack gap="sm" p="md">
													{(item).catalogData?.properties?.description &&
													typeof (item).catalogData.properties.description === "string" && (
														<Text key="catalog-desc" size="sm">
															{(item).catalogData.properties.description as string}
														</Text>
													)}
													{(item).manualData?.properties?.name && (
														<Text size="sm">
                              Manual: {(item).manualData.properties.name.ja ?? (item).manualData.properties.name.en}
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
												{item.$type === "unified_item" && (item).properties?.sources?.manual?.productNumber && (
													<Group>
														<Text size="sm" c="dimmed">Product No:</Text>
														<Text size="sm" fw={500}>{(item).properties.sources.manual.productNumber}</Text>
													</Group>
												)}
												{item.$type === "manual_item" && (item).properties?.productNumber && (
													<Group>
														<Text size="sm" c="dimmed">Product No:</Text>
														<Text size="sm" fw={500}>{(item).properties.productNumber}</Text>
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
													pdfUrl={
														item.$type === "unified_item"
															? (item).properties?.sources?.manual?.pdfUrl
															: item.$type === "manual_item"
																? (item).properties?.pdfUrl
																: undefined
													}
													title={title}
												/>
												<Button
													variant="outline"
													leftSection={<IconBookmark size={ICON_SIZE_MD} />}
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
											{getCommonProperty("grade") && (
												<Group>
													<Text size="sm" c="dimmed" w={LABEL_WIDTH}>Grade:</Text>
													<Text size="sm">{getCommonProperty("grade")}</Text>
												</Group>
											)}
											{getCommonProperty("scale") && (
												<Group>
													<Text size="sm" c="dimmed" w={LABEL_WIDTH}>Scale:</Text>
													<Text size="sm">{getCommonProperty("scale")}</Text>
												</Group>
											)}
											{renderSeriesProperty() && (
												<Group>
													<Text size="sm" c="dimmed" w={LABEL_WIDTH}>Series:</Text>
													<Text size="sm">
														{renderSeriesProperty()}
													</Text>
												</Group>
											)}
											{item.properties?.releaseDate && (
												<Group>
													<Text size="sm" c="dimmed" w={LABEL_WIDTH}>Release Date:</Text>
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
											{getMatchMethod() && (
												<Group>
													<Text size="sm" c="dimmed" w={LABEL_WIDTH}>Match Method:</Text>
													<Badge
														color={
															getMatchMethod() === "exact" ? "green" :
																(getMatchMethod() === "fuzzy" ? "yellow" : "blue")
														}
													>
														{getMatchMethod()}
													</Badge>
												</Group>
											)}
											{getMatchStage() && (
												<Group>
													<Text size="sm" c="dimmed" w={LABEL_WIDTH}>Match Stage:</Text>
													<Text size="sm">{getMatchStage()}/5</Text>
												</Group>
											)}
											<Group>
												<Text size="sm" c="dimmed" w={LABEL_WIDTH}>Last Updated:</Text>
												<Text size="sm">
													{new Date(item.metadata?.updatedAt ?? Date.now()).toLocaleDateString()}
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
														source.confidence >= HIGH_CONFIDENCE ? "green" :
															(source.confidence >= MEDIUM_CONFIDENCE ? "yellow" : "red")
													}
												>
													{Math.round(source.confidence * PERCENTAGE_MULTIPLIER)}% confidence
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
												<Progress value={source.completeness} size="sm" w={PROGRESS_BAR_WIDTH} />
											</Group>
										</Stack>
									</Card>
								))}
							</Stack>
						</Tabs.Panel>

						<Tabs.Panel value="manual" p="md">
							<Stack gap="md">
								{item.$type === "unified_item" && (item).manualData ? (
									<>
										<Card withBorder={true}>
											<Card.Section withBorder={true} inheritPadding={true} py="xs">
												<Text fw={500}>Manual Information</Text>
											</Card.Section>
											<Stack gap="sm" p="md">
												<Group>
													<Text size="sm" c="dimmed">Title:</Text>
													<Text size="sm">
														{(item).manualData.properties?.name?.ja ?? (item).manualData.properties?.name?.en ?? "Unknown"}
													</Text>
												</Group>
											</Stack>
										</Card>

										<PDFViewer
											pdfUrl={(item).properties?.sources?.manual?.pdfUrl}
											title={title}
										/>
									</>
								) : item.$type === "manual_item" ? (
									<>
										<Card withBorder={true}>
											<Card.Section withBorder={true} inheritPadding={true} py="xs">
												<Text fw={500}>Manual Information</Text>
											</Card.Section>
											<Stack gap="sm" p="md">
												<Group>
													<Text size="sm" c="dimmed">Title:</Text>
													<Text size="sm">
														{(item).properties?.name?.ja ?? (item).properties?.name?.en ?? "Unknown"}
													</Text>
												</Group>
											</Stack>
										</Card>

										<PDFViewer
											pdfUrl={(item).properties?.pdfUrl}
											title={title}
										/>
									</>
								) : (
									<Alert icon={<IconFile size={ICON_SIZE_MD} />}>
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