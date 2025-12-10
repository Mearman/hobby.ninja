import {
	Container,
	Alert,
	Button,
	Group,
	Stack,
	Title,
	Text,
	Anchor,
	Breadcrumbs,
	LoadingOverlay,
	Paper,
	Divider,
	SimpleGrid,
	Card,
	Badge,
	ActionIcon,
	Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
	IconArrowLeft,
	IconAlertTriangle,
	IconHome,
	IconDatabase,
	IconSearch,
	IconRefresh,
	IconExternalLink,
} from "@tabler/icons-react";
import { useParams, useNavigate, useLocation } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";

import { ItemDetail } from "../components/database/item-detail";
import { dataService, type UnifiedItem, type ManualItem, type CatalogItem } from "../services/dataService";


// Constants for magic numbers
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;
const FOUR = 4;
const FIVE = 5;
const SIX = 6;
const SEVEN = 7;
const EIGHT = 8;
const NINE = 9;
const TEN = 10;
const HUNDRED = 100;
const THOUSAND = 1000;
const JSON_INDENTATION = 2;
const PERCENTAGE_MULTIPLIER = 100;
const ARRAY_FIRST_INDEX = 0;
const ARRAY_SECOND_INDEX = 1;
const ARRAY_THIRD_INDEX = 2;

// Types for page state
interface PageState {
  item: UnifiedItem | ManualItem | CatalogItem | null;
  loading: boolean;
  error: string | null;
  source: "unified" | "manual" | "catalog" | "auto";
  notFound: boolean;
}

interface SearchState {
  query?: string;
  filters?: any;
  fromSearch?: boolean;
}

// Hook to parse URL parameters and sharing data
const useUrlParams = () => {
	const location = useLocation();
	const searchParams = new URLSearchParams(location.search);

	// Parse shared data if present
	const sharedData = searchParams.get("shared");
	let sharedItems: unknown[] = [];

	if (sharedData) {
		try {
			// Try to decode base64/URL encoded data
			const decodedData = decodeURIComponent(sharedData);

			// Check if it's compressed Pako data
			if (decodedData.length > HUNDRED) {
				try {
					// This would need Pako decompression, for now assume it's JSON
					const parsed = JSON.parse(decodedData);
					sharedItems = Array.isArray(parsed) ? parsed : [];
				} catch {
					// Fallback: try as JSON directly
					const fallbackParsed = JSON.parse(decodedData);
					sharedItems = Array.isArray(fallbackParsed) ? fallbackParsed : [];
				}
			} else {
				const simpleParsed = JSON.parse(decodedData);
				sharedItems = Array.isArray(simpleParsed) ? simpleParsed : [];
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.warn("Failed to parse shared data:", errorMessage);
			notifications.show({
				title: "Invalid Share Link",
				message: "The shared data could not be parsed",
				color: "red",
			});
		}
	}

	// Parse return state from search
	const returnState = searchParams.get("return");
	let searchState: SearchState = {};

	if (returnState) {
		try {
			searchState = JSON.parse(decodeURIComponent(returnState));
		} catch {
			console.warn("Failed to parse return state:", returnState);
		}
	}

	// Parse preferred source
	const source = searchParams.get("source") as "unified" | "manual" | "catalog" | "auto" || "auto";

	return {
		sharedItems,
		searchState,
		source,
	};
};

export const ItemDetailPage: React.FC = () => {
	const params = useParams({ from: "/database/$hobbyType/$id" });
	const navigate = useNavigate();
	const location = useLocation();

	// Extract URL parameters
	const { sharedItems, searchState, source: preferredSource } = useUrlParams();

	// Page state
	const [pageState, setPageState] = useState<PageState>({
		item: null,
		loading: true,
		error: null,
		source: preferredSource,
		notFound: false,
	});

	// Update source when URL parameter changes
	useEffect(() => {
		setPageState(prev => ({ ...prev, source: preferredSource }));
	}, [preferredSource]);

	// Update recently viewed items
	const updateRecentItems = (item: UnifiedItem | ManualItem | CatalogItem) => {
		try {
			const recentKey = "hobby_db_recent_items";
			const recentItems = JSON.parse(localStorage.getItem(recentKey) || "[]");

			// Remove if already exists
			const filtered = recentItems.filter((i: any) => i.id !== item.id);

			// Add to beginning
			const updated = [
				{
					id: item.id,
					name: item.properties?.name?.ja || item.properties?.name?.en || item.id,
					timestamp: Date.now(),
					type: "sources" in item ? "unified" : ("metadata" in item ? "manual" : "catalog"),
				},
				...filtered.slice(ARRAY_FIRST_INDEX, 19), // Keep only 20 recent items
			];

			localStorage.setItem(recentKey, JSON.stringify(updated));
		} catch (error) {
			console.warn("Failed to update recent items:", error);
		}
	};

	// Load item data
	useEffect(() => {
		void loadItem();
	}, [params.id, params.hobbyType, preferredSource]);

	const loadItem = async () => {
		if (!params.id) {
			setPageState({
				item: null,
				loading: false,
				error: "No item ID provided",
				source: preferredSource,
				notFound: true,
			});
			return;
		}

		setPageState(prev => ({ ...prev, loading: true, error: null, notFound: false }));

		try {
			// Check if this item is from shared data first
			if (sharedItems.length > ZERO) {
				const sharedItem = sharedItems.find(item => item.id === params.id);
				if (sharedItem) {
					setPageState({
						item: sharedItem,
						loading: false,
						error: null,
						source: "auto",
						notFound: false,
					});
					return;
				}
			}

			// Load from data service
			const item = await dataService.getItemById(
				params.id,
				preferredSource === "auto" ? "unified" : preferredSource,
			);

			if (item) {
				setPageState({
					item,
					loading: false,
					error: null,
					source: preferredSource,
					notFound: false,
				});

				// Update recent items in localStorage
				updateRecentItems(item);
			} else {
				setPageState({
					item: null,
					loading: false,
					error: "Item not found",
					source: preferredSource,
					notFound: true,
				});
			}
		} catch (error) {
			console.error("Failed to load item:", error);
			setPageState({
				item: null,
				loading: false,
				error: error instanceof Error ? error.message : "Failed to load item",
				source: preferredSource,
				notFound: false,
			});
		}
	};

	// Handle navigation
	const handleBack = () => {
		if (searchState.fromSearch) {
			// Return to search results with state
			const searchUrl = searchState.query
				? `/search?q=${encodeURIComponent(searchState.query)}`
				: "/database";

			navigate({ to: searchUrl });
		} else {
			// Go back to previous page
			navigate({ to: "/database" });
		}
	};

	const handleRelatedItemClick = (itemId: string) => {
		// Navigate to related item while preserving return state
		const currentUrl = location.pathname + location.search;
		const returnParam = encodeURIComponent(currentUrl);

		navigate({
			to: "/database/$hobbyType/$id",
			params: { hobbyType: params.hobbyType || "gunpla", id: itemId },
			search: { return: returnParam },
		});
	};

	const handleRetry = () => {
		setPageState(prev => ({ ...prev, source: "auto" }));
		loadItem();
	};

	// Get item title for breadcrumbs
	const getItemTitle = () => {
		if (!pageState.item) return "Loading...";

		return pageState.item.properties?.name?.ja || pageState.item.properties?.name?.en || pageState.item.id;
	};

	// Get item type badge
	const getItemTypeBadge = () => {
		if (!pageState.item) return null;

		const type = "sources" in pageState.item ? "unified" :
			("metadata" in pageState.item ? "manual" : "catalog");

		const colors = {
			unified: "green",
			manual: "blue",
			catalog: "orange",
		};

		return (
			<Badge color={colors[type]} variant="light">
				{type.charAt(ARRAY_FIRST_INDEX).toUpperCase() + type.slice(ARRAY_SECOND_INDEX)}
			</Badge>
		);
	};

	// Render loading state
	if (pageState.loading) {
		return (
			<Container size="xl" py="xl">
				<Paper p="xl" withBorder={true}>
					<LoadingOverlay visible={true} />
					<Stack align="center" gap="md">
						<Title order={THREE}>Loading Item Details...</Title>
						<Text c="dimmed">Please wait while we fetch the item information</Text>
					</Stack>
				</Paper>
			</Container>
		);
	}

	// Render not found state
	if (pageState.notFound || !pageState.item) {
		return (
			<Container size="xl" py="xl">
				<Stack gap="lg">
					{/* Breadcrumbs */}
					<Breadcrumbs>
						<Anchor href="/" onClick={(e) => { e.preventDefault(); navigate({ to: "/" }); }}>
							<Group gap="xs">
								<IconHome size={14} />
								<Text size="sm">Home</Text>
							</Group>
						</Anchor>
						<Anchor href="/database" onClick={(e) => { e.preventDefault(); navigate({ to: "/database" }); }}>
							<Group gap="xs">
								<IconDatabase size={14} />
								<Text size="sm">Database</Text>
							</Group>
						</Anchor>
						{params.hobbyType && (
							<Anchor href={`/database/${params.hobbyType}`} onClick={(e) => { e.preventDefault(); navigate({ to: "/database/$hobbyType", params: { hobbyType: params.hobbyType } }); }}>
								<Text size="sm" tt="capitalize">{params.hobbyType}</Text>
							</Anchor>
						)}
						<Text size="sm" c="dimmed">Not Found</Text>
					</Breadcrumbs>

					<Alert
						icon={<IconAlertTriangle size={16} />}
						color="red"
						title="Item Not Found"
						p="xl"
					>
						<Stack gap="md">
							<Text>
                The item with ID "{params.id}" could not be found in our database.
							</Text>

							<Group>
								<Button variant="outline" onClick={handleBack}>
									<Group gap="xs">
										<IconArrowLeft size={14} />
                    Go Back
									</Group>
								</Button>
								<Button variant="outline" onClick={handleRetry}>
									<Group gap="xs">
										<IconRefresh size={14} />
                    Try Again
									</Group>
								</Button>
								<Button
									variant="outline"
									onClick={() => navigate({ to: "/search" })}
								>
									<Group gap="xs">
										<IconSearch size={14} />
                    Search Database
									</Group>
								</Button>
							</Group>
						</Stack>
					</Alert>
				</Stack>
			</Container>
		);
	}

	// Render error state
	if (pageState.error) {
		return (
			<Container size="xl" py="xl">
				<Stack gap="lg">
					{/* Breadcrumbs */}
					<Breadcrumbs>
						<Anchor href="/" onClick={(e) => { e.preventDefault(); navigate({ to: "/" }); }}>
							<Group gap="xs">
								<IconHome size={14} />
								<Text size="sm">Home</Text>
							</Group>
						</Anchor>
						<Anchor href="/database" onClick={(e) => { e.preventDefault(); navigate({ to: "/database" }); }}>
							<Group gap="xs">
								<IconDatabase size={14} />
								<Text size="sm">Database</Text>
							</Group>
						</Anchor>
						{params.hobbyType && (
							<Anchor href={`/database/${params.hobbyType}`} onClick={(e) => { e.preventDefault(); navigate({ to: "/database/$hobbyType", params: { hobbyType: params.hobbyType } }); }}>
								<Text size="sm" tt="capitalize">{params.hobbyType}</Text>
							</Anchor>
						)}
						<Text size="sm" c="dimmed">Error</Text>
					</Breadcrumbs>

					<Alert
						icon={<IconAlertTriangle size={16} />}
						color="red"
						title="Loading Error"
						p="xl"
					>
						<Stack gap="md">
							<Text>Failed to load item details:</Text>
							<Text size="sm" c="red">{pageState.error}</Text>

							<Group>
								<Button variant="outline" onClick={handleBack}>
									<Group gap="xs">
										<IconArrowLeft size={14} />
                    Go Back
									</Group>
								</Button>
								<Button variant="outline" onClick={handleRetry}>
									<Group gap="xs">
										<IconRefresh size={14} />
                    Retry
									</Group>
								</Button>
							</Group>
						</Stack>
					</Alert>
				</Stack>
			</Container>
		);
	}

	// Render item details
	return (
		<Container size="xl" py="md">
			{/* Breadcrumbs and Navigation */}
			<Stack gap="sm" mb="lg">
				<Group justify="space-between" wrap="nowrap">
					<Breadcrumbs>
						<Anchor href="/" onClick={(e) => { e.preventDefault(); navigate({ to: "/" }); }}>
							<Group gap="xs">
								<IconHome size={14} />
								<Text size="sm">Home</Text>
							</Group>
						</Anchor>
						<Anchor href="/database" onClick={(e) => { e.preventDefault(); navigate({ to: "/database" }); }}>
							<Group gap="xs">
								<IconDatabase size={14} />
								<Text size="sm">Database</Text>
							</Group>
						</Anchor>
						{params.hobbyType && (
							<Anchor href={`/database/${params.hobbyType}`} onClick={(e) => { e.preventDefault(); navigate({ to: "/database/$hobbyType", params: { hobbyType: params.hobbyType } }); }}>
								<Text size="sm" tt="capitalize">{params.hobbyType}</Text>
							</Anchor>
						)}
						<Group gap="xs">
							<Text size="sm" truncate={true} maw={200}>
								{getItemTitle()}
							</Text>
							{getItemTypeBadge()}
						</Group>
					</Breadcrumbs>

					<Group gap="xs">
						<Tooltip label="Go back">
							<ActionIcon variant="subtle" onClick={handleBack}>
								<IconArrowLeft size={16} />
							</ActionIcon>
						</Tooltip>

						{searchState.fromSearch && (
							<Tooltip label="Return to search results">
								<ActionIcon
									variant="subtle"
									onClick={() => {
										const searchUrl = searchState.query
											? `/search?q=${encodeURIComponent(searchState.query)}`
											: "/database";
										navigate({ to: searchUrl });
									}}
								>
									<IconSearch size={16} />
								</ActionIcon>
							</Tooltip>
						)}

						<Tooltip label="Open in new tab">
							<ActionIcon
								variant="subtle"
								onClick={() => {
									window.open(globalThis.location.href, "_blank");
								}}
							>
								<IconExternalLink size={16} />
							</ActionIcon>
						</Tooltip>
					</Group>
				</Group>

				{/* Source indicator */}
				{pageState.source !== "auto" && (
					<Group gap="xs">
						<Text size="xs" c="dimmed">
              Source:
						</Text>
						<Badge size="xs" variant="outline">
							{pageState.source}
						</Badge>
					</Group>
				)}
			</Stack>

			{/* Item Detail Component */}
			<ItemDetail
				itemId={params.id}
				preferSource={pageState.source === "auto" ? undefined : pageState.source}
				onRelatedItemClick={handleRelatedItemClick}
			/>

			{/* Additional Page Content */}
			<Divider my="lg" />

			{/* Quick Actions Bar */}
			<Card withBorder={true} p="md">
				<Group justify="space-between" wrap="nowrap">
					<Group gap="xs">
						<Text size="sm" fw={500}>Quick Actions:</Text>
						<Button variant="outline" size="sm" onClick={() => navigate({ to: "/database" })}>
              Browse Database
						</Button>
						<Button variant="outline" size="sm" onClick={() => navigate({ to: "/search" })}>
              Search Similar
						</Button>
					</Group>

					<Group gap="xs">
						<Text size="xs" c="dimmed">
              Item ID: {params.id}
						</Text>
					</Group>
				</Group>
			</Card>
		</Container>
	);
};