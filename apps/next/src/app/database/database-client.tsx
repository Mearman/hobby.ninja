"use client";

import { getNodeDisplayName, type Item, type Manual } from "@hobby-ninja/data";
import {
	Group,
	Stack,
	Text,
	Badge,
	Card,
	SimpleGrid,
} from "@mantine/core";
import {
	IconBox,
	IconFileText,
	IconFilter,
} from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { InfiniteScrollLoader } from "@/components/ui/infinite-scroll-loader";
import { ViewSwitcher, useViewMode } from "@/components/view/view-switcher";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserPreferences } from "@/hooks/use-user-preferences";

interface DatabaseClientProps {
	items: Item[];
	manuals: Manual[];
	totalItems: number;
	totalManuals: number;
}

// Type for combined database entries
type DatabaseEntry =
	| ({ type: "item" } & Item)
	| ({ type: "manual" } & Manual);

// Helper function to get item display name for manuals
const getItemDisplayName = (manual: Manual): string | null => {
	if (!manual.itemName) return null;
	if (typeof manual.itemName === "string") return manual.itemName;
	const en = manual.itemName.en;
	const ja = manual.itemName.ja;
	if (en && en.length > 0) return en;
	if (ja && ja.length > 0) return ja;
	return null;
};

// Helper to get first brand from brandIds
const getFirstBrand = (item: Item): string => {
	return item.brandIds.length > 0 ? item.brandIds[0] : "";
};

// Helper to get first category from categoryIds
const getFirstCategory = (item: Item): string => {
	return item.categoryIds.length > 0 ? item.categoryIds[0] : "";
};

// Grid View Card Component
function GridViewCard({ entry }: { entry: DatabaseEntry }) {
	if (entry.type === "item") {
		const priceAmount = entry.price?.amount;
		const brand = getFirstBrand(entry);
		const category = getFirstCategory(entry);

		return (
			<Card
				component={Link}
				href={`/item/${entry.id}`}
				p={0}
				radius="md"
				withBorder={true}
				style={{ textDecoration: "none", color: "inherit" }}
			>
				<div style={{ padding: "1rem" }}>
					<Text size="sm" fw="bold" lineClamp={2} mb="xs">
						{getNodeDisplayName(entry)}
					</Text>

					{brand && (
						<Text size="xs" c="blue" mb="xs">
							{brand}
						</Text>
					)}

					{category && (
						<Text size="xs" c="orange" mb="xs">
							{category}
						</Text>
					)}

					<div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "xs" }}>
						{entry.grade && (
							<Badge size="xs" variant="light" color="grape">
								{entry.grade}
							</Badge>
						)}
						{entry.scale && (
							<Badge size="xs" variant="light" color="cyan">
								{entry.scale}
							</Badge>
						)}
					</div>

					{priceAmount !== undefined && (
						<Text size="sm" fw="bold" c="green">
							¥{priceAmount.toLocaleString()}
						</Text>
					)}
				</div>
			</Card>
		);
	} else {
		const itemName = getItemDisplayName(entry);

		return (
			<Card
				component={Link}
				href={`/manual/${entry.id}`}
				p={0}
				radius="md"
				withBorder={true}
				style={{
					textDecoration: "none",
					color: "inherit",
					backgroundColor: "var(--mantine-color-blue-0)",
				}}
			>
				<div style={{ padding: "1rem" }}>
					<Group gap="xs" mb="xs">
						<IconFileText size={14} color="var(--mantine-color-blue-6)" />
						<Text size="sm" fw="bold" lineClamp={2}>
							{getNodeDisplayName(entry)}
						</Text>
					</Group>

					{itemName && (
						<Text size="xs" c="dimmed" mb="xs">
							Item: {itemName}
						</Text>
					)}

					<div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
						{entry.year && (
							<Badge size="xs" variant="light" color="blue">
								{entry.year}
							</Badge>
						)}
						{entry.language && (
							<Badge size="xs" variant="light">
								{entry.language.toUpperCase()}
							</Badge>
						)}
					</div>
				</div>
			</Card>
		);
	}
}

// List View Component
function ListViewRow({ entry }: { entry: DatabaseEntry }) {
	if (entry.type === "item") {
		const priceAmount = entry.price?.amount;
		const brand = getFirstBrand(entry);
		const category = getFirstCategory(entry);

		return (
			<Card
				component={Link}
				href={`/item/${entry.id}`}
				p="md"
				radius="md"
				withBorder={true}
				style={{
					textDecoration: "none",
					color: "inherit",
					marginBottom: "0.5rem",
				}}
			>
				<Group justify="space-between" align="center">
					<div style={{ flex: 1 }}>
						<Text size="sm" fw="bold" mb="xs">
							{getNodeDisplayName(entry)}
						</Text>
						<Text size="xs" c="dimmed">
							{brand && <span>{brand}</span>}
							{brand && category && <span> • </span>}
							{category && <span>{category}</span>}
							{entry.grade && <span> • {entry.grade}</span>}
							{entry.scale && <span> • {entry.scale}</span>}
						</Text>
					</div>
					{priceAmount !== undefined && (
						<Text size="sm" fw="bold" c="green">
							¥{priceAmount.toLocaleString()}
						</Text>
					)}
				</Group>
			</Card>
		);
	} else {
		const itemName = getItemDisplayName(entry);

		return (
			<Card
				component={Link}
				href={`/manual/${entry.id}`}
				p="md"
				radius="md"
				withBorder={true}
				style={{
					textDecoration: "none",
					color: "inherit",
					backgroundColor: "var(--mantine-color-blue-0)",
					marginBottom: "0.5rem",
				}}
			>
				<Group justify="space-between" align="center">
					<div style={{ flex: 1 }}>
						<Group gap="xs" mb="xs">
							<IconFileText size={14} color="var(--mantine-color-blue-6)" />
							<Text size="sm" fw="bold">
								{getNodeDisplayName(entry)}
							</Text>
						</Group>
						{itemName && (
							<Text size="xs" c="dimmed">
								Item: {itemName}
							</Text>
						)}
					</div>
					<Group gap="md">
						{entry.year && (
							<Badge size="xs" variant="light" color="blue">
								{entry.year}
							</Badge>
						)}
						{entry.language && (
							<Badge size="xs" variant="light">
								{entry.language.toUpperCase()}
							</Badge>
						)}
					</Group>
				</Group>
			</Card>
		);
	}
}

// Table View Component
function TableView({ entries }: { entries: DatabaseEntry[] }) {
	return (
		<div style={{
			border: "1px solid var(--mantine-color-gray-3)",
			borderRadius: "0.5rem",
			overflow: "hidden",
		}}>
			<table style={{ width: "100%", borderCollapse: "collapse" }}>
				<thead style={{ backgroundColor: "var(--mantine-color-gray-0)" }}>
					<tr>
						<th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
							Name
						</th>
						<th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
							Type
						</th>
						<th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
							Brand/Year
						</th>
						<th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
							Category/Language
						</th>
						<th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
							Grade/Scale
						</th>
						<th style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600" }}>
							Price
						</th>
					</tr>
				</thead>
				<tbody>
					{entries.map((entry) => {
						if (entry.type === "item") {
							const priceAmount = entry.price?.amount;
							const brand = getFirstBrand(entry);
							const category = getFirstCategory(entry);

							return (
								<tr key={entry.id} style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
									<td style={{ padding: "0.75rem 1rem" }}>
										<Link
											href={`/item/${entry.id}`}
											style={{
												color: "var(--mantine-color-blue-6)",
												textDecoration: "none",
												fontWeight: "500",
											}}
										>
											{getNodeDisplayName(entry)}
										</Link>
									</td>
									<td style={{ padding: "0.75rem 1rem" }}>
										<Badge size="xs" variant="light" color="blue">Product</Badge>
									</td>
									<td style={{ padding: "0.75rem 1rem", color: "var(--mantine-color-blue-6)" }}>
										{brand || "-"}
									</td>
									<td style={{ padding: "0.75rem 1rem", color: "var(--mantine-color-orange-6)" }}>
										{category || "-"}
									</td>
									<td style={{ padding: "0.75rem 1rem" }}>
										<div style={{ display: "flex", gap: "4px" }}>
											{entry.grade && <Badge size="xs">{entry.grade}</Badge>}
											{entry.scale && <Badge size="xs">{entry.scale}</Badge>}
										</div>
									</td>
									<td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
										{priceAmount === undefined ? "-" : `¥${priceAmount.toLocaleString()}`}
									</td>
								</tr>
							);
						} else {
							const itemName = getItemDisplayName(entry);
							return (
								<tr key={entry.id} style={{
									borderBottom: "1px solid var(--mantine-color-gray-2)",
									backgroundColor: "var(--mantine-color-blue-0)",
								}}>
									<td style={{ padding: "0.75rem 1rem" }}>
										<Link
											href={`/manual/${entry.id}`}
											style={{
												color: "var(--mantine-color-blue-6)",
												textDecoration: "none",
												fontWeight: "500",
												display: "flex",
												alignItems: "center",
												gap: "6px",
											}}
										>
											<IconFileText size={14} />
											{getNodeDisplayName(entry)}
										</Link>
									</td>
									<td style={{ padding: "0.75rem 1rem" }}>
										<Badge size="xs" variant="light" color="green">Manual</Badge>
									</td>
									<td style={{ padding: "0.75rem 1rem" }}>
										{entry.year || "-"}
									</td>
									<td style={{ padding: "0.75rem 1rem" }}>
										{entry.language ? entry.language.toUpperCase() : "-"}
									</td>
									<td style={{ padding: "0.75rem 1rem" }}>-</td>
									<td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>-</td>
								</tr>
							);
						}
					})}
				</tbody>
			</table>
		</div>
	);
}

export function DatabaseClient({ items, manuals, totalItems, totalManuals }: DatabaseClientProps) {
	const { preferences } = useUserPreferences();
	const { viewMode, setViewMode } = useViewMode();

	// Type filter state
	const [typeFilter, setTypeFilter] = useState<"all" | "items" | "manuals">("all");
	const [searchQuery, setSearchQuery] = useState("");

	// Combine items and manuals
	const allEntries = useMemo(() => {
		const entries: DatabaseEntry[] = [];

		// Add items
		entries.push(...items.map(item => ({ type: "item", ...item })));

		// Add manuals
		entries.push(...manuals.map(manual => ({ type: "manual", ...manual })));

		return entries;
	}, [items, manuals]);

	// Filter entries
	const filteredEntries = useMemo(() => {
		let filtered = allEntries;

		// Type filter
		if (typeFilter === "items") {
			filtered = filtered.filter(entry => entry.type === "item");
		} else if (typeFilter === "manuals") {
			filtered = filtered.filter(entry => entry.type === "manual");
		}

		// Search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(entry => {
				const name = getNodeDisplayName(entry).toLowerCase();
				if (name.includes(query)) return true;

				if (entry.type === "item") {
					const brand = getFirstBrand(entry);
					const category = getFirstCategory(entry);
					return (
						(brand && brand.toLowerCase().includes(query)) ||
						(category && category.toLowerCase().includes(query)) ||
						(entry.grade?.toLowerCase().includes(query)) ||
						(entry.scale?.toLowerCase().includes(query))
					);
				} else {
					const itemName = getItemDisplayName(entry);
					return itemName && itemName.toLowerCase().includes(query);
				}
			});
		}

		// If both items and manuals are showing, remove items that have manuals
		if (typeFilter === "all") {
			const manualItemIds = new Set(
				manuals
					.filter(manual => manual.itemId)
					.map(manual => manual.itemId!),
			);
			filtered = filtered.filter(entry =>
				!(entry.type === "item" && manualItemIds.has(entry.id)),
			);
		}

		// Sort: items first, then manuals, then by name
		return filtered.sort((a, b) => {
			if (a.type !== b.type) {
				return a.type === "item" ? -1 : 1;
			}
			return getNodeDisplayName(a).localeCompare(getNodeDisplayName(b));
		});
	}, [allEntries, typeFilter, searchQuery, manuals]);

	const { visibleItems: paginatedEntries, isLoading, hasMore, lastItemRef } = useInfiniteScroll({
		items: filteredEntries,
		itemsPerPage: preferences.infiniteScrollPageSize,
		preservePageParam: true,
		autoLoad: preferences.autoLoadInfiniteScroll,
	});

	return (
		<Stack gap="xl">
			{/* Database Stats */}
			<div style={{
				padding: "1.5rem",
				border: "1px solid var(--mantine-color-gray-3)",
				borderRadius: "0.5rem",
				background: "white",
			}}>
				<div style={{ display: "flex", justifyContent: "center", gap: "3rem" }}>
					<div style={{ textAlign: "center" }}>
						<div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--mantine-color-blue-6)" }}>
							{totalItems.toLocaleString()}
						</div>
						<div style={{ fontSize: "0.875rem", color: "var(--mantine-color-dimmed)" }}>
							<Link href="/items" style={{ color: "inherit", textDecoration: "none" }}>Items</Link>
						</div>
					</div>
					<div style={{ textAlign: "center" }}>
						<div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--mantine-color-green-6)" }}>
							{totalManuals.toLocaleString()}
						</div>
						<div style={{ fontSize: "0.875rem", color: "var(--mantine-color-dimmed)" }}>
							<Link href="/manuals" style={{ color: "inherit", textDecoration: "none" }}>Manuals</Link>
						</div>
					</div>
				</div>
				<div style={{ textAlign: "center", marginTop: "1rem" }}>
					<Text size="sm" c="dimmed">
						Click on Items or Manuals above to browse them separately
					</Text>
				</div>
			</div>

			{/* Custom Filters */}
			<Card p="lg" radius="md" withBorder={true}>
				<Group gap="md" mb="md">
					<IconFilter size={16} />
					<Text size="sm" fw={500}>Filter</Text>
				</Group>

				<Group gap="lg" align="center">
					<div>
						<Text size="xs" c="dimmed" mb="xs">Type</Text>
						<Group gap="xs">
							{[
								{ value: "all", label: "All" },
								{ value: "items", label: "Products" },
								{ value: "manuals", label: "Manuals" },
							].map(({ value, label }) => (
								<Badge
									key={value}
									variant={typeFilter === value ? "filled" : "outline"}
									style={{ cursor: "pointer" }}
									onClick={() => { setTypeFilter(value as any); }}
								>
									{label}
								</Badge>
							))}
						</Group>
					</div>

					<div style={{ flex: 1 }}>
						<Text size="xs" c="dimmed" mb="xs">Search</Text>
						<input
							type="text"
							placeholder="Search..."
							value={searchQuery}
							onChange={(e) => { setSearchQuery(e.target.value); }}
							style={{
								width: "100%",
								padding: "0.5rem",
								border: "1px solid var(--mantine-color-gray-3)",
								borderRadius: "0.25rem",
								fontSize: "0.875rem",
							}}
						/>
					</div>
				</Group>

				{typeFilter !== "all" && (
					<div style={{ marginTop: "0.5rem" }}>
						<Text size="xs" c="blue">
							{typeFilter === "items"
								? "Showing all products"
								: "Showing all manuals"
							}
						</Text>
					</div>
				)}

				{typeFilter === "all" && (
					<div style={{ marginTop: "0.5rem" }}>
						<Text size="xs" c="green">
							Showing all items without manuals plus all manuals
						</Text>
					</div>
				)}
			</Card>

			{/* Header with View Switcher */}
			<Group justify="space-between" wrap="wrap">
				<Group gap="xs">
					<IconBox size={24} />
					<Text size="lg" fw={600}>
						{typeFilter === "all" ? "All Items & Manuals" : typeFilter === "items" ? "Products" : "Manuals"}
					</Text>
					<Text size="sm" c="dimmed">
						({filteredEntries.length.toLocaleString()} of {(totalItems + totalManuals).toLocaleString()})
					</Text>
				</Group>
				<ViewSwitcher
					value={viewMode}
					onChange={setViewMode}
					size="sm"
				/>
			</Group>

			{/* Entries Display */}
			{paginatedEntries.length > 0 ? (
				<>
					{viewMode === "grid" && (
						<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
							{paginatedEntries.map((entry, index) => {
								const isLast = index === paginatedEntries.length - 1;
								return (
									<div key={`${entry.type}-${entry.id}`} ref={isLast ? lastItemRef : undefined}>
										<GridViewCard entry={entry} />
									</div>
								);
							})}
						</SimpleGrid>
					)}

					{viewMode === "list" && (
						<Stack gap="xs">
							{paginatedEntries.map((entry, index) => {
								const isLast = index === paginatedEntries.length - 1;
								return (
									<div key={`${entry.type}-${entry.id}`} ref={isLast ? lastItemRef : undefined}>
										<ListViewRow entry={entry} />
									</div>
								);
							})}
						</Stack>
					)}

					{viewMode === "table" && (
						<div ref={lastItemRef}>
							<TableView entries={paginatedEntries} />
						</div>
					)}

					{/* Infinite Scroll Loader */}
					{viewMode !== "table" && (
						<InfiniteScrollLoader
							isLoading={isLoading}
							hasMore={hasMore}
							autoLoad={preferences.autoLoadInfiniteScroll}
						/>
					)}
				</>
			) : (
				<Stack align="center" py="xl" gap="md">
					<IconBox size={64} style={{ color: "var(--mantine-color-gray-4)" }} />
					<Text size="lg" fw={500}>
						{searchQuery.trim() || typeFilter !== "all"
							? "No items or manuals match your filters"
							: "No items or manuals found"}
					</Text>
					<Text c="dimmed" ta="center">
						{searchQuery.trim() || typeFilter !== "all"
							? "Try adjusting your filters to see more items."
							: "The database appears to be empty."}
					</Text>
				</Stack>
			)}
		</Stack>
	);
}