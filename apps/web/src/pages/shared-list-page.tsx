import {
	Container,
	Title,
	Text,
	Grid,
	Card,
	Button,
	Group,
	Badge,
	Paper,
	Loader,
	Alert,
	Image,
	SimpleGrid,
	Stack,
	Center,
	ActionIcon,
	Tooltip,
} from "@mantine/core";
import {
	IconShare,
	IconDownload,
	IconExternalLink,
	IconCopy,
	IconCheck,
	IconHeart,
	IconBookmark,
	IconInfoCircle,
} from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { inflate } from "pako";
import React, { useState, useEffect, useCallback } from "react";

import { ItemCard } from "../components/database/item-card";
import { dataService } from "../services/dataService";
import { databaseContainer } from "../styles/styles.css";

interface SharedListData {
	title?: string;
	description?: string;
	items: string[];
	createdBy?: string;
	createdAt?: string;
	tags?: string[];
}

/**
 * Shared list page for displaying lists shared via Pako-compressed URLs
 */
export function SharedListPage(): React.ReactElement {
	const { compressedData } = useParams({ from: "/database/share/$compressedData" });
	const navigate = useNavigate();

	// State management
	const [listData, setListData] = useState<SharedListData | null>(null);
	const [items, setItems] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [copiedToClipboard, setCopiedToClipboard] = useState(false);

	// Decode and load shared list data
	useEffect(() => {
		const loadSharedList = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Decode base64 and decompress with Pako
				let decodedData: string;
				try {
					const compressedBytes = Uint8Array.from(atob(compressedData), (c) => c.charCodeAt(0));
					const decompressedBytes = inflate(compressedBytes);
					decodedData = new TextDecoder().decode(decompressedBytes);
				} catch (decodeError) {
					console.error("Failed to decode compressed data:", decodeError);
					throw new Error("Invalid or corrupted share link");
				}

				// Parse JSON data
				let parsedData: SharedListData;
				try {
					parsedData = JSON.parse(decodedData);
				} catch (parseError) {
					console.error("Failed to parse JSON data:", parseError);
					throw new Error("Invalid share data format");
				}

				// Validate data structure
				if (!parsedData.items || !Array.isArray(parsedData.items)) {
					throw new Error("Invalid share data: missing items array");
				}

				setListData(parsedData);

				// Load items from database
				if (parsedData.items.length > 0) {
					const itemPromises = parsedData.items.map(async (itemId: string) => {
						try {
							const item = await dataService.getItemById(itemId, "unified");
							return item;
						} catch (itemError) {
							console.warn(`Failed to load item ${itemId}:`, itemError);
							return null;
						}
					});

					const loadedItems = await Promise.all(itemPromises);
					const validItems = loadedItems.filter((item): item is any => item !== null);
					setItems(validItems);
				}
			} catch (error_) {
				console.error("Failed to load shared list:", error_);
				setError(error_ instanceof Error ? error_.message : "Failed to load shared list");
			} finally {
				setIsLoading(false);
			}
		};

		loadSharedList();
	}, [compressedData]);

	// Copy share link to clipboard
	const copyShareLink = useCallback(() => {
		const shareUrl = `${globalThis.location.origin}${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;
		navigator.clipboard.writeText(shareUrl).then(() => {
			setCopiedToClipboard(true);
			setTimeout(() => { setCopiedToClipboard(false); }, 2000);
		});
	}, []);

	// Navigate to item detail
	const navigateToItem = useCallback((item: any) => {
		const hobbyType = item.type || "gunpla";
		navigate({
			to: "/database/$hobbyType/$id",
			params: { hobbyType, id: item.id },
		});
	}, [navigate]);

	// Calculate statistics
	const stats = {
		totalItems: items.length,
		withImages: items.filter((item) => item.images && item.images.length > 0).length,
		withManuals: items.filter((item) => item.manuals && item.manuals.length > 0).length,
		byGrade: items.reduce<Record<string, number>>((acc, item) => {
			const grade = item.grade || "Unknown";
			acc[grade] = (acc[grade] || 0) + 1;
			return acc;
		}, {}),
	};

	// Render loading state
	if (isLoading) {
		return (
			<div className={databaseContainer}>
				<Container size="lg">
					<Center h="50vh">
						<Stack align="center">
							<Loader size="xl" />
							<Text size="lg" color="dimmed">
								Loading shared list...
							</Text>
						</Stack>
					</Center>
				</Container>
			</div>
		);
	}

	// Render error state
	if (error) {
		return (
			<div className={databaseContainer}>
				<Container size="lg">
					<Center h="50vh">
						<Alert color="red" variant="light" w="100%" maw={600}>
							<Group>
								<IconInfoCircle size={20} />
								<Stack gap={0}>
									<Text fw={500}>Unable to load shared list</Text>
									<Text size="sm" color="dimmed">
										{error}
									</Text>
								</Stack>
							</Group>
							<Button
								variant="outline"
								onClick={() => navigate({ to: "/database" })}
								mt="md"
							>
								Go to Database
							</Button>
						</Alert>
					</Center>
				</Container>
			</div>
		);
	}

	return (
		<div className={databaseContainer}>
			<Container size="lg">
				{/* Header section */}
				<Paper p="xl" radius="lg" withBorder={true} mb="xl">
					<Group justify="space-between" align="flex-start">
						<div style={{ flex: 1 }}>
							<Title order={1} size={36} mb="sm" c="gunplaBlue">
								{listData?.title || "Shared List"}
							</Title>

							{listData?.description && (
								<Text size="lg" color="dimmed" mb="md">
									{listData.description}
								</Text>
							)}

							<Group gap="lg" mb="md">
								<Text size="sm" color="dimmed">
									{stats.totalItems.toLocaleString()} items
								</Text>

								{listData?.createdBy && (
									<Text size="sm" color="dimmed">
										Shared by {listData.createdBy}
									</Text>
								)}

								{listData?.createdAt && (
									<Text size="sm" color="dimmed">
										{new Date(listData.createdAt).toLocaleDateString()}
									</Text>
								)}
							</Group>

							{/* Tags */}
							{listData?.tags && listData.tags.length > 0 && (
								<Group gap="xs" mb="md">
									{listData.tags.map((tag) => (
										<Badge key={tag} variant="light" color="gunplaBlue" size="sm">
											{tag}
										</Badge>
									))}
								</Group>
							)}
						</div>

						{/* Actions */}
						<Group>
							<Tooltip
								label={copiedToClipboard ? "Copied!" : "Copy link"}
								position="top"
							>
								<ActionIcon
									variant="outline"
									size="lg"
									onClick={copyShareLink}
									color={copiedToClipboard ? "green" : undefined}
								>
									{copiedToClipboard ? <IconCheck size={18} /> : <IconCopy size={18} />}
								</ActionIcon>
							</Tooltip>

							<Tooltip label="Share this list" position="top">
								<ActionIcon
									variant="outline"
									size="lg"
									onClick={() => {
										if (navigator.share) {
											navigator.share({
												title: listData?.title || "Shared List",
												text: listData?.description || "Check out this hobby list",
												url: globalThis.location.href,
											});
										} else {
											copyShareLink();
										}
									}}
								>
									<IconShare size={18} />
								</ActionIcon>
							</Tooltip>
						</Group>
					</Group>
				</Paper>

				{/* Statistics overview */}
				<Paper p="lg" radius="md" withBorder={true} mb="xl">
					<Title order={3} mb="md">
						List Overview
					</Title>
					<Grid>
						<Grid.Col span={{ base: 6, sm: 3 }}>
							<div style={{ textAlign: "center" }}>
								<Title order={4} size={24} c="gunplaBlue">
									{stats.totalItems}
								</Title>
								<Text size="sm" color="dimmed">
									Total Items
								</Text>
							</div>
						</Grid.Col>
						<Grid.Col span={{ base: 6, sm: 3 }}>
							<div style={{ textAlign: "center" }}>
								<Title order={4} size={24} c="gunplaRed">
									{stats.withImages}
								</Title>
								<Text size="sm" color="dimmed">
									With Images
								</Text>
							</div>
						</Grid.Col>
						<Grid.Col span={{ base: 6, sm: 3 }}>
							<div style={{ textAlign: "center" }}>
								<Title order={4} size={24} c="gunplaGray">
									{stats.withManuals}
								</Title>
								<Text size="sm" color="dimmed">
									With Manuals
								</Text>
							</div>
						</Grid.Col>
						<Grid.Col span={{ base: 6, sm: 3 }}>
							<div style={{ textAlign: "center" }}>
								<Title order={4} size={24} c="green">
									{Object.keys(stats.byGrade).length}
								</Title>
								<Text size="sm" color="dimmed">
									Different Grades
								</Text>
							</div>
						</Grid.Col>
					</Grid>
				</Paper>

				{/* Grade breakdown */}
				{Object.keys(stats.byGrade).length > 0 && (
					<Paper p="lg" radius="md" withBorder={true} mb="xl">
						<Title order={3} mb="md">
							Grade Breakdown
						</Title>
						<Group>
							{Object.entries(stats.byGrade).map(([grade, count]) => (
								<Badge key={grade} variant="light" color="gunplaBlue" size="lg">
									{grade}: {count}
								</Badge>
							))}
						</Group>
					</Paper>
				)}

				{/* Items grid */}
				{items.length > 0 ? (
					<>
						<Title order={3} mb="lg">
							Items in this List
						</Title>
						<SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="lg" mb="xl">
							{items.map((item: any) => (
								<Card
									key={item.id}
									p="md"
									radius="md"
									withBorder={true}
									h="100%"
									style={{ cursor: "pointer" }}
									onClick={() => { navigateToItem(item); }}
								>
									<Stack h="100%" gap="sm">
										{item.images && item.images.length > 0 ? (
											<Image
												src={item.images[0]}
												alt={item.name?.en || item.name}
												h={120}
												radius="sm"
												fit="cover"
											/>
										) : (
											<div
												style={{
													height: 120,
													background: "var(--mantine-color-default-border)",
													borderRadius: "var(--mantine-radius-sm)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													color: "var(--mantine-color-dimmed)",
												}}
											>
												<IconExternalLink size={24} />
											</div>
										)}

										<div style={{ flex: 1 }}>
											<Text
												size="sm"
												fw={500}
												lineClamp={2}
												mb="xs"
											>
												{item.name?.en || item.name || "Unknown"}
											</Text>

											{item.grade && (
												<Badge
													variant="light"
													color="gunplaRed"
													size="xs"
												>
													{item.grade}
												</Badge>
											)}

											{item.scale && (
												<Badge
													variant="outline"
													size="xs"
													ml="xs"
												>
													{item.scale}
												</Badge>
											)}
										</div>

										<ActionIcon
											variant="subtle"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												navigateToItem(item);
											}}
										>
											<IconExternalLink size={14} />
										</ActionIcon>
									</Stack>
								</Card>
							))}
						</SimpleGrid>
					</>
				) : (
					<Paper p="xl" radius="md" withBorder={true} mb="xl">
						<Text ta="center" color="dimmed" size="lg">
							No items could be loaded for this list.
						</Text>
						<Text ta="center" color="dimmed" mt="sm">
							The items may have been removed or are no longer available.
						</Text>
					</Paper>
				)}

				{/* Actions */}
				<Group justify="center" mb="xl">
					<Button
						variant="outline"
						leftSection={<IconDownload size={16} />}
						onClick={() => {
							// Export list as JSON
							const exportData = {
								...listData,
								items: items.map((item) => ({
									id: item.id,
									name: item.name?.en || item.name,
									grade: item.grade,
									scale: item.scale,
									series: item.series,
								})),
							};
							const blob = new Blob([JSON.stringify(exportData, null, 2)], {
								type: "application/json",
							});
							const url = URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = url;
							a.download = `${listData?.title || "shared-list"}.json`;
							a.click();
							URL.revokeObjectURL(url);
						}}
					>
						Export List
					</Button>

					<Button
						onClick={() => navigate({ to: "/database" })}
					>
						Browse Database
					</Button>
				</Group>
			</Container>
		</div>
	);
}