import {
	Card,
	Stack,
	Group,
	Title,
	Text,
	Button,
	TextInput,
	Textarea,
	ActionIcon,
	Tooltip,
	Alert,
	Badge,
	Progress,
	Box,
	Grid,
	Divider,
	Switch,
	NumberInput,
	Modal,
	ScrollArea,
	CopyButton,
	QRCodeSVG,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
	IconShare,
	IconCopy,
	IconDownload,
	IconLink,
	IconQrcode,
	IconCheck,
	IconX,
	IconAlertTriangle,
	IconPhoto,
	IconFileText,
	IconFileZip,
	IconRefresh,
} from "@tabler/icons-react";
import React, { useState, useCallback, useMemo } from "react";

import type { UnifiedItem, ManualItem, DatabaseCatalogItem } from "../../services/dataService";

// Types for sharing
interface ShareableItem {
  id: string;
  type: "unified" | "manual" | "catalog";
  name: string;
  grade?: string;
  scale?: string;
  series?: string;
  thumbnail?: string;
}

interface ShareOptions {
  includeImages: boolean;
  includeMetadata: boolean;
  compressData: boolean;
  format: "json" | "csv";
  maxItems: number;
}

interface ShareResult {
  url: string;
  compressedData: string;
  size: number;
  compressedSize: number;
  compressionRatio: number;
}

interface ListSharingProps {
  items: (UnifiedItem | ManualItem | DatabaseCatalogItem)[];
  onClose?: () => void;
  initialFilters?: any;
}

// Lazy load Pako for compression
let PakoPromise: Promise<any> | null = null;

const loadPako = async () => {
	if (!PakoPromise) {
		PakoPromise = import("pako").then((module) => module.default);
	}
	return PakoPromise;
};

export const ListSharing: React.FC<ListSharingProps> = ({ items, onClose, initialFilters }) => {
	const [shareOptions, setShareOptions] = useState<ShareOptions>({
		includeImages: false,
		includeMetadata: true,
		compressData: true,
		format: "json",
		maxItems: 50,
	});

	const [shareResult, setShareResult] = useState<ShareResult | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [showQRCode, setShowQRCode] = useState(false);
	const [copySuccess, setCopySuccess] = useState(false);

	// Convert items to shareable format
	const shareableItems = useMemo((): ShareableItem[] => {
		return items.slice(0, shareOptions.maxItems).map((item) => {
			const baseItem = {
				id: item.id,
				name: "name" in item ? (item.name.ja || item.name.en || item.name) : item.title,
			};

			if ("sources" in item) {
				// UnifiedItem
				const unified = item as UnifiedItem;
				return {
					...baseItem,
					type: "unified" as const,
					grade: unified.grade,
					scale: unified.scale,
					series: unified.series?.ja || unified.series?.en,
					thumbnail: getThumbnail(unified),
				};
			} else if ("metadata" in item) {
				// ManualItem
				const manual = item as ManualItem;
				return {
					...baseItem,
					type: "manual" as const,
					grade: manual.metadata?.product?.grade,
					scale: manual.metadata?.product?.scale,
					series: manual.metadata?.product?.series,
					thumbnail: getManualThumbnail(manual),
				};
			} else {
				// DatabaseCatalogItem
				const catalog = item as DatabaseCatalogItem;
				return {
					...baseItem,
					type: "catalog" as const,
					grade: catalog.grade,
					scale: catalog.scale,
					series: catalog.series,
					thumbnail: getCatalogThumbnail(catalog),
				};
			}
		});
	}, [items, shareOptions.maxItems]);

	// Get thumbnail from unified item
	const getThumbnail = (item: UnifiedItem): string | undefined => {
		// Try to get thumbnail from catalog or manual data
		if (item.sources?.catalog) {
			return `/data/images/catalog/${item.sources.catalog.id}/thumb.jpg`;
		}
		if (item.sources?.manual) {
			return `/data/images/manual/${item.sources.manual.id}/thumb.jpg`;
		}
		return undefined;
	};

	// Get thumbnail from manual item
	const getManualThumbnail = (item: ManualItem): string | undefined => {
		if (item.assets?.thumbnails?.length > 0) {
			return item.assets.thumbnails[0].src;
		}
		return undefined;
	};

	// Get thumbnail from catalog item
	const getCatalogThumbnail = (item: DatabaseCatalogItem): string | undefined => {
		if (item.images?.length > 0) {
			return item.images[0];
		}
		return undefined;
	};

	// Generate shareable data
	const generateShareData = useCallback(async () => {
		setIsGenerating(true);
		setShareResult(null);

		try {
			const data: any = {
				items: shareableItems,
				generatedAt: new Date().toISOString(),
				itemCount: shareableItems.length,
			};

			// Include additional metadata if requested
			if (shareOptions.includeMetadata) {
				data.metadata = {
					filters: initialFilters || {},
					options: shareOptions,
					source: "hobby.ninja database",
					version: "1.0",
				};
			}

			// Include thumbnails if requested
			if (shareOptions.includeImages) {
				data.thumbnails = shareableItems
					.filter((item) => item.thumbnail)
					.map((item) => ({
						id: item.id,
						thumbnail: item.thumbnail,
					}));
			}

			// Convert to string based on format
			let jsonString: string;
			jsonString = shareOptions.format === "csv" ? convertToCSV(shareableItems) : JSON.stringify(data, null, 2);

			const originalSize = new Blob([jsonString]).size;

			// Compress data if requested
			let compressedData = jsonString;
			let compressedSize = originalSize;

			if (shareOptions.compressData && shareOptions.format === "json") {
				try {
					const pako = await loadPako();
					const compressed = pako.deflate(jsonString, { to: "string" });
					compressedData = compressed;
					compressedSize = new Blob([compressed]).size;
				} catch (error) {
					console.warn("Compression failed, using uncompressed data:", error);
					notifications.show({
						title: "Compression Failed",
						message: "Using uncompressed data instead",
						color: "yellow",
						icon: <IconAlertTriangle size={16} />,
					});
				}
			}

			// Generate URL
			const baseUrl = globalThis.location.origin + globalThis.location.pathname;
			const urlParam = encodeURIComponent(compressedData);
			const url = `${baseUrl}?shared=${urlParam}`;

			// Check URL length
			if (url.length > 2048) {
				notifications.show({
					title: "URL Too Long",
					message: "Consider reducing the number of items or disabling compression",
					color: "red",
					icon: <IconAlertTriangle size={16} />,
				});
				return;
			}

			const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

			setShareResult({
				url,
				compressedData,
				size: originalSize,
				compressedSize,
				compressionRatio,
			});

			notifications.show({
				title: "Share Link Generated",
				message: "Your share link is ready to use",
				color: "green",
				icon: <IconCheck size={16} />,
			});
		} catch (error) {
			console.error("Failed to generate share data:", error);
			notifications.show({
				title: "Generation Failed",
				message: "Failed to generate share link",
				color: "red",
				icon: <IconX size={16} />,
			});
		} finally {
			setIsGenerating(false);
		}
	}, [shareableItems, shareOptions, initialFilters]);

	// Convert items to CSV format
	const convertToCSV = (items: ShareableItem[]): string => {
		if (items.length === 0) return "";

		const headers = ["ID", "Type", "Name", "Grade", "Scale", "Series"];
		const csvRows = [headers.join(",")];

		for (const item of items) {
			const values = [
				item.id,
				item.type,
				`"${item.name.replaceAll('"', '""')}"`,
				item.grade || "",
				item.scale || "",
				`"${item.series?.replaceAll('"', '""') || ""}"`,
			];
			csvRows.push(values.join(","));
		}

		return csvRows.join("\n");
	};

	// Copy URL to clipboard
	const copyToClipboard = async (text: string, type: "url" | "data") => {
		try {
			await navigator.clipboard.writeText(text);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);

			notifications.show({
				title: "Copied!",
				message: `${type === "url" ? "Share link" : "Data"} copied to clipboard`,
				color: "green",
				icon: <IconCheck size={16} />,
			});
		} catch (error) {
			console.error("Failed to copy:", error);
			notifications.show({
				title: "Copy Failed",
				message: "Failed to copy to clipboard",
				color: "red",
				icon: <IconX size={16} />,
			});
		}
	};

	// Download data as file
	const downloadFile = () => {
		if (!shareResult) return;

		const blob = new Blob([shareResult.compressedData], {
			type: shareOptions.format === "csv" ? "text/csv" : "application/json",
		});

		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `shared-items-${new Date().toISOString().split("T")[0]}.${shareOptions.format}`;
		document.body.append(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);

		notifications.show({
			title: "Download Started",
			message: `Downloading ${shareOptions.format.toUpperCase()} file`,
			color: "blue",
			icon: <IconDownload size={16} />,
		});
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	return (
		<Box>
			<Card withBorder={true}>
				<Card.Section withBorder={true} inheritPadding={true} py="xs">
					<Group justify="space-between">
						<Title order={3}>Share Item List</Title>
						{onClose && (
							<ActionIcon variant="subtle" onClick={onClose}>
								<IconX size={16} />
							</ActionIcon>
						)}
					</Group>
				</Card.Section>

				<Card.Section p="md">
					<Grid>
						<Grid.Col span={{ base: 12, md: 6 }}>
							<Stack gap="md">
								{/* Share Options */}
								<Card withBorder={true} p="sm">
									<Title order={5} mb="sm">Share Options</Title>
									<Stack gap="sm">
										<Switch
											label="Include Images"
											description="Add thumbnail images to share data"
											checked={shareOptions.includeImages}
											onChange={(e) => setShareOptions({ ...shareOptions, includeImages: e.currentTarget.checked })}
										/>

										<Switch
											label="Include Metadata"
											description="Add filters and options information"
											checked={shareOptions.includeMetadata}
											onChange={(e) => setShareOptions({ ...shareOptions, includeMetadata: e.currentTarget.checked })}
										/>

										<Switch
											label="Compress Data"
											description="Use Pako compression for smaller URLs"
											checked={shareOptions.compressData}
											onChange={(e) => setShareOptions({ ...shareOptions, compressData: e.currentTarget.checked })}
										/>

										<NumberInput
											label="Max Items"
											description="Maximum number of items to share"
											min={1}
											max={100}
											value={shareOptions.maxItems}
											onChange={(value) => setShareOptions({ ...shareOptions, maxItems: value || 50 })}
										/>

										<Group>
											<Button
												variant={shareOptions.format === "json" ? "filled" : "outline"}
												size="sm"
												onClick={() => setShareOptions({ ...shareOptions, format: "json" })}
											>
												<IconFileText size={14} />
                        JSON
											</Button>
											<Button
												variant={shareOptions.format === "csv" ? "filled" : "outline"}
												size="sm"
												onClick={() => setShareOptions({ ...shareOptions, format: "csv" })}
											>
												<IconFileText size={14} />
                        CSV
											</Button>
										</Group>
									</Stack>
								</Card>

								{/* Preview */}
								<Card withBorder={true} p="sm">
									<Title order={5} mb="sm">Preview</Title>
									<Text size="sm" c="dimmed" mb="xs">
										{shareableItems.length} items selected
									</Text>
									<ScrollArea h={150}>
										<Stack gap="xs">
											{shareableItems.slice(0, 5).map((item, idx) => (
												<Group key={item.id} gap="xs">
													<Badge size="xs" variant="outline">
														{item.type}
													</Badge>
													<Text size="xs" truncate={true}>
														{item.name}
													</Text>
													{item.grade && (
														<Badge size="xs" variant="light">
															{item.grade}
														</Badge>
													)}
												</Group>
											))}
											{shareableItems.length > 5 && (
												<Text size="xs" c="dimmed">
                          ... and {shareableItems.length - 5} more
												</Text>
											)}
										</Stack>
									</ScrollArea>
								</Card>

								{/* Generate Button */}
								<Button
									onClick={generateShareData}
									loading={isGenerating}
									fullWidth={true}
									leftSection={<IconShare size={16} />}
								>
									{isGenerating ? "Generating..." : "Generate Share Link"}
								</Button>
							</Stack>
						</Grid.Col>

						<Grid.Col span={{ base: 12, md: 6 }}>
							<Stack gap="md">
								{/* Share Result */}
								{shareResult && (
									<Card withBorder={true} p="sm">
										<Title order={5} mb="sm">Share Link</Title>
										<Stack gap="sm">
											{/* Size Information */}
											<Group justify="space-between">
												<Text size="sm" c="dimmed">Original size:</Text>
												<Text size="sm" fw={500}>{formatFileSize(shareResult.size)}</Text>
											</Group>
											{shareOptions.compressData && (
												<>
													<Group justify="space-between">
														<Text size="sm" c="dimmed">Compressed size:</Text>
														<Text size="sm" fw={500}>{formatFileSize(shareResult.compressedSize)}</Text>
													</Group>
													<Group justify="space-between">
														<Text size="sm" c="dimmed">Compression:</Text>
														<Badge
															color={shareResult.compressionRatio < 0.5 ? "green" : "yellow"}
															size="sm"
														>
															{Math.round((1 - shareResult.compressionRatio) * 100)}%
														</Badge>
													</Group>
												</>
											)}

											<Divider />

											{/* URL Input */}
											<TextInput
												label="Share URL"
												value={shareResult.url}
												readOnly={true}
												rightSection={
													<CopyButton value={shareResult.url}>
														{({ copied, copy }) => (
															<Tooltip label={copied ? "Copied!" : "Copy URL"}>
																<ActionIcon color={copied ? "teal" : "gray"} onClick={copy}>
																	<IconCopy size={16} />
																</ActionIcon>
															</Tooltip>
														)}
													</CopyButton>
												}
											/>

											{/* Action Buttons */}
											<Group>
												<Button
													variant="outline"
													size="sm"
													onClick={() => copyToClipboard(shareResult.url, "url")}
													leftSection={<IconCopy size={14} />}
												>
                          Copy Link
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => setShowQRCode(true)}
													leftSection={<IconQrcode size={14} />}
												>
                          QR Code
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={downloadFile}
													leftSection={<IconDownload size={14} />}
												>
                          Download
												</Button>
											</Group>
										</Stack>
									</Card>
								)}

								{/* Instructions */}
								<Alert icon={<IconInfoCircle size={16} />} title="How to Share">
									<Stack gap="xs">
										<Text size="sm">
											<strong>Direct Link:</strong> Share the URL with others to let them view this item list
										</Text>
										<Text size="sm">
											<strong>QR Code:</strong> Generate a QR code for easy mobile sharing
										</Text>
										<Text size="sm">
											<strong>Download:</strong> Save the data as a {shareOptions.format.toUpperCase()} file for backup
										</Text>
									</Stack>
								</Alert>
							</Stack>
						</Grid.Col>
					</Grid>
				</Card.Section>
			</Card>

			{/* QR Code Modal */}
			<Modal
				opened={showQRCode}
				onClose={() => setShowQRCode(false)}
				title="QR Code"
				centered={true}
				size="md"
			>
				{shareResult && (
					<Stack align="center" gap="md">
						<Box
							p="md"
							style={{
								backgroundColor: "white",
								borderRadius: "8px",
							}}
						>
							<QRCodeSVG
								value={shareResult.url}
								size={256}
								bgColor="#FFFFFF"
								fgColor="#000000"
								level="M"
							/>
						</Box>
						<Text size="sm" c="dimmed" align="center">
              Scan this QR code to view the shared item list
						</Text>
						<Button
							onClick={() => {
								// Convert QR to image and download
								const svg = document.querySelector("svg");
								if (svg) {
									const svgData = new XMLSerializer().serializeToString(svg);
									const canvas = document.createElement("canvas");
									const ctx = canvas.getContext("2d");
									const img = new Image();
									img.addEventListener("load", () => {
										canvas.width = 256;
										canvas.height = 256;
										ctx?.drawImage(img, 0, 0);
										canvas.toBlob((blob) => {
											if (blob) {
												const url = URL.createObjectURL(blob);
												const link = document.createElement("a");
												link.href = url;
												link.download = "qrcode.png";
												link.click();
												URL.revokeObjectURL(url);
											}
										});
									});
									img.src = "data:image/svg+xml;base64," + btoa(svgData);
								}
							}}
							variant="outline"
							leftSection={<IconDownload size={16} />}
						>
              Download QR Code
						</Button>
					</Stack>
				)}
			</Modal>
		</Box>
	);
};