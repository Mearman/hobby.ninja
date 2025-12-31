"use client";

import { getBrandById, getCategoryById, getGradeById, getNodeDisplayName, getNodeImages, getNodePrimaryGrade, getNodeReleaseDate, getSeriesById, itemHasGrade, resolveCdnUrl, type Item } from "@hobby-ninja/data";
import { Badge, Box, Card, Group, Skeleton, Table, Text, Tooltip } from "@mantine/core";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";

import { RelationshipBadge } from "@/components/ui/relationship-badge";
import { useViewMode, ViewSwitcher, type ViewMode } from "@/components/view/view-switcher";
import { useVirtualGrid } from "@/hooks/use-virtual-grid";
import { itemHasGlobalSite, itemHasManual } from "@/lib/relationship-utils";

function formatReleaseDate(releaseDate?: { year?: number | null; month?: number | null; day?: number | null }): string {
	if (!releaseDate?.year) return "";
	const parts = [String(releaseDate.year)];
	if (releaseDate.month) {
		parts.push(String(releaseDate.month).padStart(2, "0"));
		if (releaseDate.day) {
			parts.push(String(releaseDate.day).padStart(2, "0"));
		}
	}
	return parts.join("-");
}

// First page of images load eagerly to avoid lazy loading issues for visible items
// Native loading="lazy" can fail for images already in viewport at render time
const EAGER_LOAD_COUNT = 24;

/** Font sizes to try for auto-fitting title text (largest to smallest, more granular steps) */
const TITLE_FONT_SIZES_PX = [16, 15, 14, 13, 12, 11, 10];
const TITLE_CONTAINER_HEIGHT = 60;
const WORD_BREAK_STYLE = "break-word" as const;

// Virtual grid configuration
const GRID_GAP = 16; // Matches Mantine "lg" spacing
const GRID_COLUMNS = { base: 1, sm: 2, md: 3, lg: 4 };
// Fixed card height = title + badge padding (image and badge heights scale with card width)
const CARD_FIXED_PADDING = 12; // pt(4) + pb(4) + gap(4) for badges
const FIXED_CARD_HEIGHT = TITLE_CONTAINER_HEIGHT + CARD_FIXED_PADDING;
// Badges: increased height for better visibility
const BADGE_HEIGHT_MULTIPLIER = 0.18;

/** Title text that auto-scales to fit within a flexible container */
function FittedTitle({ text }: { text: string }): React.ReactElement {
	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLDivElement>(null);

	// Resize text to fit container - runs on mount and when container resizes
	useLayoutEffect(() => {
		const containerEl = containerRef.current;
		const textEl = textRef.current;
		if (!containerEl || !textEl) return;

		const fitText = () => {
			const containerHeight = containerEl.clientHeight;
			if (containerHeight === 0) return;

			// Find the largest font size that fits
			for (const size of TITLE_FONT_SIZES_PX) {
				textEl.style.fontSize = `${size}px`;
				if (textEl.scrollHeight <= containerHeight) {
					break;
				}
			}
		};

		// Initial fit
		fitText();

		// Re-fit when container size changes (flex layout updates)
		const observer = new ResizeObserver(fitText);
		observer.observe(containerEl);

		return () => { observer.disconnect(); };
	}, [text]);

	return (
		<Box
			px="xs"
			pt="xs"
			pb={4}
			style={{
				flex: "1 1 auto",
				minHeight: TITLE_CONTAINER_HEIGHT,
				overflow: "hidden",
				display: "flex",
				alignItems: "center",
			}}
		>
			{/* Inner wrapper for text measurement */}
			<Box
				ref={containerRef}
				style={{
					width: "100%",
					maxHeight: "100%",
					overflow: "hidden",
				}}
			>
				<Text
					ref={textRef}
					fw={600}
					lh={1.3}
					style={{ wordBreak: WORD_BREAK_STYLE }}
				>
					{text}
				</Text>
			</Box>
		</Box>
	);
}

// Badge aspect ratio (same as filter cards)
const BADGE_ASPECT_RATIO = "300 / 170";

// Empty value placeholder for table cells
const EMPTY_PLACEHOLDER = "—";

// Image fade-in transition style
const IMAGE_FADE_TRANSITION = "opacity 0.2s ease-in-out";

// Thumbnail background color
const THUMBNAIL_BG_COLOR = "var(--mantine-color-gray-1)";

/** Small image badge for brand/series/grade - same 300:170 ratio as filter cards */
function EntityBadge({ image, name, onClick, isSelected }: { image?: string; name: string; onClick?: () => void; isSelected?: boolean }): React.ReactElement {
	const handleClick = (e: React.MouseEvent) => {
		if (onClick) {
			e.preventDefault();
			e.stopPropagation();
			onClick();
		}
	};

	return (
		<Tooltip label={onClick ? `Filter by ${name}` : name} withArrow={true}>
			<Box
				onClick={handleClick}
				style={{
					flex: "1 1 0",
					maxWidth: "32%",
					aspectRatio: BADGE_ASPECT_RATIO,
					borderRadius: 4,
					overflow: "hidden",
					backgroundColor: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: onClick ? "pointer" : "default",
					transition: "transform 0.1s, box-shadow 0.1s, outline 0.1s",
					outline: isSelected ? "2px solid var(--mantine-color-blue-6)" : "2px solid transparent",
				}}
				className={onClick ? "entity-badge-clickable" : undefined}
			>
				{image ? (
					<img
						src={resolveCdnUrl(image)}
						alt={name}
						style={{ width: "100%", height: "100%", objectFit: "contain" }}
					/>
				) : (
					<Text
						size="10px"
						fw={600}
						c="gray.7"
						ta="center"
						px={4}
						style={{
							wordBreak: WORD_BREAK_STYLE,
							lineHeight: 1.2,
							overflow: "hidden",
							display: "-webkit-box",
							WebkitLineClamp: 3,
							WebkitBoxOrient: "vertical",
						}}
					>
						{name}
					</Text>
				)}
			</Box>
		</Tooltip>
	);
}

/** Table row cells component for virtualized table view - renders just the cells, not the row */
function TableRowCells({ item, onFilterToggle: _onFilterToggle, filters: _filters }: { item: Item; onFilterToggle?: (type: ArrayFilterType, id: string) => void; filters?: FilterState }): React.ReactElement {
	const [hasImageError, setHasImageError] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);
	const images = getNodeImages(item);
	const displayName = getNodeDisplayName(item);
	const hasValidImage = !hasImageError && images.length > 0;
	const releaseDate = getNodeReleaseDate(item);
	const gradeName = getNodePrimaryGrade(item);

	const primaryBrand = useMemo(() => {
		const brand = item.brands
			.map(b => getBrandById(b.id))
			.find(b => b && b.type !== "grade");
		if (brand?.id.startsWith("pb_")) {
			return getBrandById("pb") ?? brand;
		}
		return brand;
	}, [item.brands]);
	const primarySeries = item.series.length > 0 ? getSeriesById(item.series[0].id) : undefined;

	return (
		<>
			<Table.Td>
				<Link href={`/items/${item.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
					<Group gap="sm" align="center">
						<Box w={40} h={40} style={{ flexShrink: 0, borderRadius: 4, overflow: "hidden", backgroundColor: THUMBNAIL_BG_COLOR, position: "relative" }}>
							{!imageLoaded && hasValidImage && (
								<Skeleton width={40} height={40} radius={4} animate={true} style={{ position: "absolute", inset: 0 }} />
							)}
							{hasValidImage ? (
								<img
									src={resolveCdnUrl(images[0])}
									alt={displayName}
									loading="eager"
									decoding="async"
									onLoad={() => { setImageLoaded(true); }}
									onError={() => { setHasImageError(true); }}
									style={{
										width: "100%",
										height: "100%",
										objectFit: "cover",
										opacity: imageLoaded ? 1 : 0,
										transition: IMAGE_FADE_TRANSITION,
									}}
								/>
							) : (
								<Box w={40} h={40} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
									<Text size="xs" c="dimmed">{EMPTY_PLACEHOLDER}</Text>
								</Box>
							)}
						</Box>
						<Text size="sm" fw={500} lineClamp={1}>
							{displayName}
						</Text>
						{itemHasManual(item) && <RelationshipBadge type="manual" viewMode="table" />}
						{itemHasGlobalSite(item) && <RelationshipBadge type="globalSite" viewMode="table" />}
					</Group>
				</Link>
			</Table.Td>
			<Table.Td c="dimmed">{releaseDate ?? EMPTY_PLACEHOLDER}</Table.Td>
			<Table.Td>
				{primarySeries ? (
					<Text size="sm" lineClamp={1}>
						{typeof primarySeries.name === "string" ? primarySeries.name : primarySeries.name.en ?? primarySeries.name.ja}
					</Text>
				) : EMPTY_PLACEHOLDER}
			</Table.Td>
			<Table.Td>{gradeName ?? EMPTY_PLACEHOLDER}</Table.Td>
			<Table.Td>{item.scales.length > 0 ? item.scales.join(", ") : EMPTY_PLACEHOLDER}</Table.Td>
			<Table.Td>
				{primaryBrand ? (
					<Text size="sm" lineClamp={1}>
						{typeof primaryBrand.name === "string" ? primaryBrand.name : primaryBrand.name.en ?? primaryBrand.name.ja}
					</Text>
				) : EMPTY_PLACEHOLDER}
			</Table.Td>
		</>
	);
}

function ItemCard({ item, index, onFilterToggle, filters, viewMode = "grid" }: { item: Item; index: number; onFilterToggle?: (type: ArrayFilterType, id: string) => void; filters?: FilterState; viewMode?: ViewMode }): React.ReactElement {
	const [hasImageError, setHasImageError] = useState(false);
	// First batch loads eagerly for fastest initial paint
	// Subsequent batches still use eager loading since native lazy doesn't work reliably
	// for dynamically-added images near the viewport
	const isFirstBatch = index < EAGER_LOAD_COUNT;
	const [imageLoaded, setImageLoaded] = useState(isFirstBatch);
	const images = getNodeImages(item);
	const displayName = getNodeDisplayName(item);
	const hasValidImage = !hasImageError && images.length > 0;

	// Get entity images for badges - prefer specific child grade over root grade
	const primaryGrade = useMemo(() => {
		const rootGrades = Object.keys(item.grades);
		if (rootGrades.length === 0) return;

		const rootGrade = rootGrades[0];
		const specificGrades = item.grades[rootGrade];

		// Prefer the first specific grade if available, otherwise use the root
		if (specificGrades.length > 0) {
			return getGradeById(specificGrades[0]);
		}
		return getGradeById(rootGrade);
	}, [item.grades]);
	// Find first non-grade brand (brands with type: "grade" are shown as grades, not brands)
	// P-Bandai sub-brands (pb_gunpla, pb_hg, etc.) are shown as the parent "pb" brand
	const primaryBrand = useMemo(() => {
		const brand = item.brands
			.map(b => getBrandById(b.id))
			.find(b => b && b.type !== "grade");

		// If it's a P-Bandai child brand, use the parent P-Bandai brand instead
		if (brand?.id.startsWith("pb_")) {
			return getBrandById("pb") ?? brand;
		}
		return brand;
	}, [item.brands]);
	const primarySeries = item.series.length > 0 ? getSeriesById(item.series[0].id) : undefined;
	const primaryCategory = item.categories.length > 0 ? getCategoryById(item.categories[0].id) : undefined;

	const releaseDate = getNodeReleaseDate(item);
	const gradeName = getNodePrimaryGrade(item);

	// Table view: table row with structured data
	if (viewMode === "table") {
		return (
			<Table.Tr>
				<Table.Td>
					<Link href={`/items/${item.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
						<Group gap="sm" align="center">
							<Box w={40} h={40} style={{ flexShrink: 0, borderRadius: 4, overflow: "hidden", backgroundColor: THUMBNAIL_BG_COLOR, position: "relative" }}>
								{/* Skeleton for table view image */}
								{!imageLoaded && hasValidImage && (
									<Skeleton width={40} height={40} radius={4} animate={true} style={{ position: "absolute", inset: 0 }} />
								)}
								{hasValidImage ? (
									<img
										src={resolveCdnUrl(images[0])}
										alt={displayName}
										loading="eager"
										decoding="async"
										onLoad={() => { setImageLoaded(true); }}
										onError={() => { setHasImageError(true); }}
										style={{
											width: "100%",
											height: "100%",
											objectFit: "cover",
											opacity: imageLoaded ? 1 : 0,
											transition: IMAGE_FADE_TRANSITION,
										}}
									/>
								) : (
									<Box w={40} h={40} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
										<Text size="xs" c="dimmed">{EMPTY_PLACEHOLDER}</Text>
									</Box>
								)}
							</Box>
							<Text size="sm" fw={500} lineClamp={1}>
								{displayName}
							</Text>
							{itemHasManual(item) && <RelationshipBadge type="manual" viewMode="table" />}
							{itemHasGlobalSite(item) && <RelationshipBadge type="globalSite" viewMode="table" />}
						</Group>
					</Link>
				</Table.Td>
				<Table.Td c="dimmed">{releaseDate ?? EMPTY_PLACEHOLDER}</Table.Td>
				<Table.Td>
					{primarySeries ? (
						<Text size="sm" lineClamp={1}>
							{typeof primarySeries.name === "string" ? primarySeries.name : primarySeries.name.en ?? primarySeries.name.ja}
						</Text>
					) : EMPTY_PLACEHOLDER}
				</Table.Td>
				<Table.Td>{gradeName ?? EMPTY_PLACEHOLDER}</Table.Td>
				<Table.Td>{item.scales.length > 0 ? item.scales.join(", ") : EMPTY_PLACEHOLDER}</Table.Td>
				<Table.Td>
					{primaryBrand ? (
						<Text size="sm" lineClamp={1}>
							{typeof primaryBrand.name === "string" ? primaryBrand.name : primaryBrand.name.en ?? primaryBrand.name.ja}
						</Text>
					) : EMPTY_PLACEHOLDER}
				</Table.Td>
			</Table.Tr>
		);
	}

	// List view: horizontal card with more details
	if (viewMode === "list") {
		return (
			<Link href={`/items/${item.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
				<Card p="md" radius="md" withBorder={true} className="item-card-hover" style={{ position: "relative" }}>
					{/* Skeleton overlay for list view */}
					{!imageLoaded && hasValidImage && (
						<Box
							style={{
								position: "absolute",
								inset: 0,
								zIndex: 10,
								display: "flex",
								gap: 16,
								padding: 16,
								backgroundColor: "var(--mantine-color-body)",
								borderRadius: "inherit",
							}}
						>
							<Skeleton width={80} height={80} radius={8} animate={true} />
							<Box flex={1}>
								<Skeleton height={20} radius="sm" mb={8} />
								<Skeleton height={14} radius="sm" width="60%" mb={12} />
								<Group gap="xs">
									<Skeleton height={22} width={60} radius="xl" />
									<Skeleton height={22} width={50} radius="xl" />
									<Skeleton height={22} width={70} radius="xl" />
								</Group>
							</Box>
						</Box>
					)}
					<Group gap="md" align="flex-start" wrap="nowrap">
						<Box w={80} h={80} style={{ flexShrink: 0, borderRadius: 8, overflow: "hidden", backgroundColor: THUMBNAIL_BG_COLOR }}>
							{hasValidImage ? (
								<img
									src={resolveCdnUrl(images[0])}
									alt={displayName}
									loading="eager"
									decoding="async"
									onLoad={() => { setImageLoaded(true); }}
									onError={() => { setHasImageError(true); }}
									style={{
										width: "100%",
										height: "100%",
										objectFit: "cover",
										opacity: imageLoaded ? 1 : 0,
										transition: IMAGE_FADE_TRANSITION,
									}}
								/>
							) : (
								<Box w={80} h={80} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
									<Text size="sm" c="dimmed" ta="center" p="xs" style={{ wordBreak: WORD_BREAK_STYLE }}>
										{displayName}
									</Text>
								</Box>
							)}
						</Box>
						<Box flex={1} style={{ minWidth: 0 }}>
							<Text fw={600} mb={4} lineClamp={2}>
								{displayName}
							</Text>
							{primarySeries && (
								<Text size="sm" c="dimmed" mb="xs" lineClamp={1}>
									{typeof primarySeries.name === "string" ? primarySeries.name : primarySeries.name.en ?? primarySeries.name.ja}
								</Text>
							)}
							<Group gap="xs" wrap="wrap">
								{releaseDate && (
									<Badge variant="light" size="sm" color="gray">
										{releaseDate}
									</Badge>
								)}
								{gradeName && (
									<Badge variant="light" size="sm">
										{gradeName}
									</Badge>
								)}
								{item.scales.map(scale => (
									<Badge key={scale} variant="light" size="sm">
										{scale}
									</Badge>
								))}
								{itemHasManual(item) && <RelationshipBadge type="manual" viewMode="list" />}
								{itemHasGlobalSite(item) && <RelationshipBadge type="globalSite" viewMode="list" />}
								{primaryBrand && (
									<Badge variant="outline" size="sm">
										{typeof primaryBrand.name === "string" ? primaryBrand.name : primaryBrand.name.en ?? primaryBrand.name.ja}
									</Badge>
								)}
							</Group>
						</Box>
					</Group>
				</Card>
			</Link>
		);
	}

	// Grid view (default): compact card with image on top
	return (
		<Link href={`/items/${item.id}`} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
			<Card
				shadow="sm"
				padding={0}
				radius="md"
				withBorder={true}
				h="100%"
				style={{ cursor: "pointer", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}
				className="item-card-hover"
			>
				{/* Skeleton overlay - shows while image is loading */}
				{!imageLoaded && hasValidImage && (
					<Box
						style={{
							position: "absolute",
							inset: 0,
							zIndex: 10,
							display: "flex",
							flexDirection: "column",
							backgroundColor: "var(--mantine-color-body)",
							borderRadius: "inherit",
						}}
					>
						<Skeleton
							style={{ aspectRatio: "1 / 1", width: "100%", flexShrink: 0 }}
							radius={0}
							animate={true}
						/>
						<Box px="xs" pt="xs" pb={4} style={{ flex: "1 1 auto" }}>
							<Skeleton height={16} radius="sm" mb={8} />
							<Skeleton height={16} radius="sm" width="70%" />
						</Box>
						<Box py={4} px={4} style={{ display: "flex", gap: 4 }}>
							<Skeleton height={32} radius={4} style={{ flex: 1 }} />
							<Skeleton height={32} radius={4} style={{ flex: 1 }} />
							<Skeleton height={32} radius={4} style={{ flex: 1 }} />
						</Box>
					</Box>
				)}

				<Box
					bg="gray.1"
					style={{
						aspectRatio: "1 / 1",
						width: "100%",
						flexShrink: 0,
						background: "linear-gradient(135deg, var(--mantine-color-gray-1) 0%, var(--mantine-color-gray-2) 100%)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						position: "relative",
					}}
				>
					{/* Always show placeholder text until image loads */}
					{(!imageLoaded || !hasValidImage) && (
						<Text
							size="lg"
							fw={600}
							c="dimmed"
							ta="center"
							p="md"
							style={{
								wordBreak: WORD_BREAK_STYLE,
								position: hasValidImage ? "absolute" : "static",
								zIndex: 0,
							}}
						>
							{displayName}
						</Text>
					)}
					{hasValidImage && (
						<img
							src={resolveCdnUrl(images[0])}
							alt={displayName}
							loading="eager"
							decoding="async"
							onLoad={() => { setImageLoaded(true); }}
							onError={() => { setHasImageError(true); }}
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
								position: "absolute",
								top: 0,
								left: 0,
								opacity: imageLoaded ? 1 : 0,
								transition: IMAGE_FADE_TRANSITION,
								zIndex: 1,
							}}
						/>
					)}
					{(itemHasManual(item) || itemHasGlobalSite(item)) && (
						<div style={{ position: "absolute", top: 8, left: 8, zIndex: 2, display: "flex", gap: 4 }}>
							{itemHasManual(item) && <RelationshipBadge type="manual" viewMode="grid" />}
							{itemHasGlobalSite(item) && <RelationshipBadge type="globalSite" viewMode="grid" />}
						</div>
					)}
					{item.releaseDate?.year && (
						<Text
							size="xs"
							fw={500}
							style={{
								position: "absolute",
								top: 0,
								right: 0,
								zIndex: 2,
								backgroundColor: "rgba(0, 0, 0, 0.6)",
								color: "white",
								padding: "2px 6px",
								borderRadius: "0 0 0 4px",
							}}
						>
							{formatReleaseDate(item.releaseDate)}
						</Text>
					)}
				</Box>

				<FittedTitle text={displayName} />

				<Box
					py={4}
					style={{
						display: "flex",
						flexWrap: "nowrap",
						justifyContent: "space-evenly",
						gap: 4,
						paddingLeft: 4,
						paddingRight: 4,
					}}
				>
					{primaryCategory && (
						<EntityBadge
							image={primaryCategory.image}
							name={typeof primaryCategory.name === "string" ? primaryCategory.name : primaryCategory.name.en ?? primaryCategory.name.ja}
							onClick={onFilterToggle ? () => { onFilterToggle("categories", primaryCategory.id); } : undefined}
							isSelected={filters?.categories.includes(primaryCategory.id)}
						/>
					)}
					{primaryGrade && (
						<EntityBadge
							image={primaryGrade.image}
							name={typeof primaryGrade.name === "string" ? primaryGrade.name : primaryGrade.name.en ?? primaryGrade.name.ja}
							onClick={onFilterToggle ? () => { onFilterToggle("grades", primaryGrade.id); } : undefined}
							isSelected={filters?.grades.includes(primaryGrade.id)}
						/>
					)}
					{primaryBrand && (
						<EntityBadge
							image={primaryBrand.image}
							name={typeof primaryBrand.name === "string" ? primaryBrand.name : primaryBrand.name.en ?? primaryBrand.name.ja}
							onClick={onFilterToggle ? () => { onFilterToggle("brands", primaryBrand.id); } : undefined}
							isSelected={filters?.brands.includes(primaryBrand.id)}
						/>
					)}
					{primarySeries && (
						<EntityBadge
							image={primarySeries.image}
							name={typeof primarySeries.name === "string" ? primarySeries.name : primarySeries.name.en ?? primarySeries.name.ja}
							onClick={onFilterToggle ? () => { onFilterToggle("series", primarySeries.id); } : undefined}
							isSelected={filters?.series.includes(primarySeries.id)}
						/>
					)}
				</Box>
			</Card>
		</Link>
	);
}

// Convert release date to comparable number (YYYYMMDD)
function releaseDateToNumber(releaseDate?: { year?: number | null; month?: number | null; day?: number | null }): number {
	if (!releaseDate?.year) return 0;
	const year = releaseDate.year;
	const month = releaseDate.month ?? 1;
	const day = releaseDate.day ?? 1;
	return year * 10_000 + month * 100 + day;
}

/** Special ID for filtering items with no category/series/brand */
export const OTHER_FILTER_ID = "__other__";

/** P-Bandai child brand IDs - "pb" filter matches any of these */
const PBANDAI_CHILD_IDS = ["pb_gunpla", "pb_hg", "pb_mg", "pb_rg", "pb_pg", "pb_bb", "pb_others", "pb_charapla"];

/** Array-based filter types that can be toggled */
export type ArrayFilterType = "categories" | "series" | "brands" | "grades" | "scales" | "years";

export interface FilterState {
	categories: string[];
	series: string[];
	brands: string[];
	grades: string[];
	scales: string[];
	years: string[];
	/** Filter to only show items that have manuals */
	hasManual: boolean;
	/** Filter to only show items that have global site links */
	hasGlobalSite: boolean;
}

interface ExploreSectionProps {
	items: Item[];
	filters?: FilterState;
	totalCount?: number;
	/** Callback to toggle a filter - type is one of the array-based filter types */
	onFilterToggle?: (type: ArrayFilterType, id: string) => void;
}

/** Ref handle for ExploreSection - exposes year navigation */
export interface ExploreSectionHandle {
	/** Scroll to the first item of the given year, loading items if needed */
	scrollToYear: (year: number) => void;
	/** Scroll to the item with closest release date to the given date number (YYYYMMDD) */
	scrollToNearestDate: (dateNumber: number) => void;
	/** Get the scroll position (0-1) where a year's items start */
	getYearScrollPosition: (year: number) => number | null;
	/** Get array of years that have items in the current filtered set (sorted newest first) */
	getFilteredYears: () => number[];
	/** Get the release date (as YYYYMMDD number) of the item at viewport center */
	getCenterItemDate: () => number | null;
}

export const ExploreSection = forwardRef<ExploreSectionHandle, ExploreSectionProps>(function ExploreSection({ items, filters, totalCount, onFilterToggle }, ref) {
	// View mode state with URL persistence
	const { viewMode, setViewMode } = useViewMode("grid");

	// Filter items based on selected filters
	const filteredItems = useMemo(() => {
		if (!filters) return items;

		const hasActiveFilters =
			filters.categories.length > 0 ||
			filters.series.length > 0 ||
			filters.brands.length > 0 ||
			filters.grades.length > 0 ||
			filters.scales.length > 0 ||
			filters.years.length > 0 ||
			filters.hasManual ||
			filters.hasGlobalSite;

		if (!hasActiveFilters) return items;

		return items.filter((item) => {
			// Check categories (OR within type)
			if (filters.categories.length > 0) {
				const itemCategoryIds = new Set(item.categories.map((c) => c.id));
				const hasOther = filters.categories.includes(OTHER_FILTER_ID);
				const hasNoCategories = item.categories.length === 0;
				const matchesCategory = filters.categories.some((id) => id !== OTHER_FILTER_ID && itemCategoryIds.has(id));
				if (!matchesCategory && !(hasOther && hasNoCategories)) {
					return false;
				}
			}

			// Check series (OR within type)
			if (filters.series.length > 0) {
				const itemSeriesIds = new Set(item.series.map((s) => s.id));
				const hasOther = filters.series.includes(OTHER_FILTER_ID);
				const hasNoSeries = item.series.length === 0;
				const matchesSeries = filters.series.some((id) => id !== OTHER_FILTER_ID && itemSeriesIds.has(id));
				if (!matchesSeries && !(hasOther && hasNoSeries)) {
					return false;
				}
			}

			// Check brands (OR within type)
			// Special handling: "pb" filter matches any pb_* brand
			if (filters.brands.length > 0) {
				const itemBrandIds = new Set(item.brands.map((b) => b.id));
				const hasOther = filters.brands.includes(OTHER_FILTER_ID);
				const hasNoBrands = item.brands.length === 0;

				// Check if "pb" is selected and item has any P-Bandai brand
				const pbSelected = filters.brands.includes("pb");
				const hasPbandaiBrand = pbSelected && PBANDAI_CHILD_IDS.some((id) => itemBrandIds.has(id));

				// Check other selected brands (excluding "pb" and OTHER_FILTER_ID)
				const matchesBrand = filters.brands.some((id) =>
					id !== OTHER_FILTER_ID && id !== "pb" && itemBrandIds.has(id),
				);

				if (!matchesBrand && !hasPbandaiBrand && !(hasOther && hasNoBrands)) {
					return false;
				}
			}

			// Check grades (OR within type)
			if (filters.grades.length > 0) {
				const hasOther = filters.grades.includes(OTHER_FILTER_ID);
				const hasNoGrade = Object.keys(item.grades).length === 0;

				if (hasNoGrade) {
					if (!hasOther) return false;
				} else {
					// Check if item has any of the selected grades (root or specific variant)
					const matchesGrade = filters.grades.some((selectedGradeId) => {
						if (selectedGradeId === OTHER_FILTER_ID) return false;
						return itemHasGrade(item, selectedGradeId);
					});
					if (!matchesGrade) return false;
				}
			}

			// Check scales (OR within type)
			if (filters.scales.length > 0) {
				const hasOther = filters.scales.includes(OTHER_FILTER_ID);
				const hasNoScale = item.scales.length === 0;
				const matchesScale = item.scales.some((s) => filters.scales.includes(s));
				if (!matchesScale && !(hasOther && hasNoScale)) {
					return false;
				}
			}

			// Check years (OR within type)
			if (filters.years.length > 0) {
				const itemYear = item.releaseDate?.year;
				const hasOther = filters.years.includes(OTHER_FILTER_ID);
				const hasNoYear = !itemYear || itemYear <= 0;
				const matchesYear = itemYear && filters.years.includes(String(itemYear));
				if (!matchesYear && !(hasOther && hasNoYear)) {
					return false;
				}
			}

			// Check if item has manual
			if (filters.hasManual && !itemHasManual(item)) {
				return false;
			}

			// Check if item has global site link
			if (filters.hasGlobalSite && !itemHasGlobalSite(item)) {
				return false;
			}

			return true;
		});
	}, [items, filters]);

	// Sort items by release date (newest first)
	const sortedItems = useMemo(
		() => [...filteredItems].toSorted((a, b) => releaseDateToNumber(b.releaseDate) - releaseDateToNumber(a.releaseDate)),
		[filteredItems],
	);

	// Get unique years from filtered items (sorted newest first)
	const filteredYears = useMemo(() => {
		const years = new Set<number>();
		for (const item of sortedItems) {
			if (item.releaseDate?.year && item.releaseDate.year > 0) {
				years.add(item.releaseDate.year);
			}
		}
		return [...years].toSorted((a, b) => b - a);
	}, [sortedItems]);

	// Virtual grid for efficient rendering of large item lists (grid view)
	// High overscan (15 rows) ensures smooth scrolling during year navigation
	const { listRef: gridListRef, virtualRows: gridVirtualRows, totalHeight: gridTotalHeight, columnCount, rowHeight: gridRowHeight, scrollToIndex: gridScrollToIndex } = useVirtualGrid({
		items: sortedItems,
		columns: GRID_COLUMNS,
		gap: GRID_GAP,
		fixedCardHeight: FIXED_CARD_HEIGHT,
		dynamicHeightMultiplier: BADGE_HEIGHT_MULTIPLIER,
		overscan: 15,
	});

	// Fixed item heights for list/table views
	const LIST_ITEM_HEIGHT = 118; // Card height (110px) + gap (8px)
	const TABLE_ROW_HEIGHT = 57; // Row height (~49px) + gap (8px)

	// Container refs for list/table views
	const listContainerRef = useRef<HTMLDivElement>(null);
	const tableContainerRef = useRef<HTMLDivElement>(null);

	// Compute scroll margins for list/table virtualizers
	const [listScrollMargin, setListScrollMargin] = useState(0);
	const [tableScrollMargin, setTableScrollMargin] = useState(0);

	useEffect(() => {
		const updateMargins = () => {
			if (listContainerRef.current) {
				setListScrollMargin(listContainerRef.current.offsetTop);
			}
			if (tableContainerRef.current) {
				setTableScrollMargin(tableContainerRef.current.offsetTop);
			}
		};
		updateMargins();
		window.addEventListener("resize", updateMargins);
		return () => { window.removeEventListener("resize", updateMargins); };
	}, [viewMode]);

	// Window virtualizer for list view (single column)
	const listVirtualizer = useWindowVirtualizer({
		count: sortedItems.length,
		estimateSize: () => LIST_ITEM_HEIGHT,
		overscan: 15,
		scrollMargin: listScrollMargin,
	});

	// Window virtualizer for table view (single column)
	const tableVirtualizer = useWindowVirtualizer({
		count: sortedItems.length,
		estimateSize: () => TABLE_ROW_HEIGHT,
		overscan: 15,
		scrollMargin: tableScrollMargin,
	});

	// Get the appropriate container ref based on view mode
	const getContainerRef = useCallback(() => {
		if (viewMode === "grid") return gridListRef.current;
		if (viewMode === "list") return listContainerRef.current;
		return tableContainerRef.current;
	}, [viewMode, gridListRef]);

	// Get effective row height based on view mode
	const getEffectiveRowHeight = useCallback(() => {
		if (viewMode === "grid") return gridRowHeight;
		if (viewMode === "list") return LIST_ITEM_HEIGHT;
		return TABLE_ROW_HEIGHT;
	}, [viewMode, gridRowHeight]);

	// Get effective column count based on view mode (list/table = 1 column)
	const getEffectiveColumnCount = useCallback(() => {
		if (viewMode === "grid") return columnCount;
		return 1;
	}, [viewMode, columnCount]);

	// Unified scrollToIndex that works for all view modes
	const scrollToIndex = useCallback((index: number) => {
		if (viewMode === "grid") {
			gridScrollToIndex(index);
		} else if (viewMode === "list") {
			listVirtualizer.scrollToIndex(index, { align: "start", behavior: "smooth" });
		} else {
			tableVirtualizer.scrollToIndex(index, { align: "start", behavior: "smooth" });
		}
	}, [viewMode, gridScrollToIndex, listVirtualizer, tableVirtualizer]);

	// Scroll to year - uses teleport + smooth scroll pattern for all view modes
	const scrollToYear = useCallback((year: number) => {
		const firstIndex = sortedItems.findIndex((item) => item.releaseDate?.year === year);
		if (firstIndex === -1) return;

		const effectiveRowHeight = getEffectiveRowHeight();
		const effectiveColumnCount = getEffectiveColumnCount();

		// Calculate target row (for grid, accounts for columns; for list/table, same as index)
		const targetRowIndex = Math.floor(firstIndex / effectiveColumnCount);
		const currentScrollTop = window.scrollY;
		const targetScrollTop = targetRowIndex * effectiveRowHeight;
		const scrollDistance = Math.abs(targetScrollTop - currentScrollTop);

		// For short distances (< 30 rows worth), just smooth scroll directly
		const SHORT_DISTANCE_ROWS = 30;
		const shortDistanceThreshold = SHORT_DISTANCE_ROWS * effectiveRowHeight;
		if (scrollDistance < shortDistanceThreshold) {
			scrollToIndex(firstIndex);
			return;
		}

		// For long distances: teleport close to destination, then smooth scroll the rest
		// This avoids blank areas during scroll since we're always within overscan range
		const TELEPORT_BUFFER_ROWS = 20;
		const totalRows = Math.ceil(sortedItems.length / effectiveColumnCount);
		const teleportRowIndex = targetScrollTop > currentScrollTop
			? Math.max(0, targetRowIndex - TELEPORT_BUFFER_ROWS) // scrolling down
			: Math.min(totalRows - 1, targetRowIndex + TELEPORT_BUFFER_ROWS); // scrolling up

		const teleportPosition = teleportRowIndex * effectiveRowHeight;

		// Instantly teleport to near destination, then immediately start smooth scroll
		window.scrollTo({ top: teleportPosition, behavior: "instant" });
		scrollToIndex(firstIndex);
	}, [sortedItems, getEffectiveColumnCount, getEffectiveRowHeight, scrollToIndex]);

	// Scroll to the item with the closest release date, positioning it at viewport center
	const scrollToNearestDate = useCallback((targetDate: number) => {
		if (sortedItems.length === 0) return;

		// Find the item with the closest date (early exit since items are sorted by date desc)
		let closestIndex = 0;
		let closestDiff = Math.abs(releaseDateToNumber(sortedItems[0].releaseDate) - targetDate);

		for (let i = 1; i < sortedItems.length; i++) {
			const itemDate = releaseDateToNumber(sortedItems[i].releaseDate);
			const diff = Math.abs(itemDate - targetDate);
			if (diff < closestDiff) {
				closestDiff = diff;
				closestIndex = i;
			} else if (itemDate < targetDate) {
				// Since sorted descending, if we've passed the target date and diff is increasing, stop
				break;
			}
		}

		// Calculate scroll position to put item at viewport center (same for all view modes)
		const containerElement = getContainerRef();
		if (!containerElement) return;

		const effectiveRowHeight = getEffectiveRowHeight();
		const effectiveColumnCount = getEffectiveColumnCount();

		const targetRowIndex = Math.floor(closestIndex / effectiveColumnCount);
		const rowPositionInList = targetRowIndex * effectiveRowHeight;
		const listTop = containerElement.getBoundingClientRect().top + window.scrollY;
		const viewportCenter = window.innerHeight / 2;
		// Target scroll = list top + row position - offset to center it in viewport
		const targetScrollTop = listTop + rowPositionInList - viewportCenter + effectiveRowHeight / 2;

		window.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "instant" });
	}, [sortedItems, getContainerRef, getEffectiveColumnCount, getEffectiveRowHeight]);

	// Expose scrollToYear, scrollToNearestDate, getYearScrollPosition, getFilteredYears, and getCenterItemDate via ref
	useImperativeHandle(ref, () => ({
		scrollToYear,
		scrollToNearestDate,
		getYearScrollPosition: (year: number) => {
			// Find the index of the first item with this year
			const firstIndex = sortedItems.findIndex((item) => item.releaseDate?.year === year);
			if (firstIndex === -1) return null;

			// Return as fraction of total items (approximates scroll position)
			return sortedItems.length > 0 ? firstIndex / sortedItems.length : null;
		},
		getFilteredYears: () => filteredYears,
		getCenterItemDate: () => {
			if (sortedItems.length === 0) return null;
			const containerElement = getContainerRef();
			if (!containerElement) return null;

			const effectiveRowHeight = getEffectiveRowHeight();
			const effectiveColumnCount = getEffectiveColumnCount();

			// Calculate which item is at the center of the viewport
			const containerRect = containerElement.getBoundingClientRect();
			const viewportCenter = window.innerHeight / 2;
			const scrollIntoList = viewportCenter - containerRect.top;

			if (scrollIntoList < 0) {
				// Viewport center is above the list - don't restore position
				// (user is at top of page, no need to scroll)
				return null;
			}
			if (scrollIntoList > containerRect.height) {
				// Viewport center is below the list, return last item's date
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length already checked above
				return releaseDateToNumber(sortedItems.at(-1)!.releaseDate);
			}

			// Calculate which row is at viewport center
			const rowIndex = Math.floor(scrollIntoList / effectiveRowHeight);
			const itemIndex = Math.min(rowIndex * effectiveColumnCount, sortedItems.length - 1);

			return releaseDateToNumber(sortedItems[itemIndex].releaseDate);
		},
	}), [sortedItems, scrollToYear, scrollToNearestDate, filteredYears, getEffectiveRowHeight, getEffectiveColumnCount, getContainerRef]);

	const hasActiveFilters = filters && (
		filters.categories.length > 0 ||
		filters.series.length > 0 ||
		filters.brands.length > 0 ||
		filters.grades.length > 0 ||
		filters.scales.length > 0 ||
		filters.years.length > 0
	);

	return (
		<>
			{/* Header with count and view switcher */}
			<Group justify="space-between" align="center" mb="md">
				<Text size="sm" c="dimmed">
					{hasActiveFilters
						? `Showing ${filteredItems.length.toLocaleString()} of ${(totalCount ?? items.length).toLocaleString()} items`
						: `${filteredItems.length.toLocaleString()} items`}
				</Text>
				<ViewSwitcher value={viewMode} onChange={setViewMode} size="sm" />
			</Group>

			{/* Grid view: Virtual grid for efficient rendering */}
			{viewMode === "grid" && (
				<Box
					ref={gridListRef}
					style={{
						height: gridTotalHeight,
						width: "100%",
						position: "relative",
					}}
				>
					{gridVirtualRows.map((virtualRow) => (
						<Box
							key={virtualRow.index}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								height: virtualRow.size,
								transform: `translateY(${virtualRow.start}px)`,
								display: "grid",
								gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
								gridTemplateRows: `calc(100% - ${GRID_GAP}px)`,
								gap: GRID_GAP,
								alignContent: "start",
							}}
						>
							{virtualRow.items.map((item, itemIndex) => {
								const globalIndex = virtualRow.index * columnCount + itemIndex;
								return (
									<Box
										key={item.id}
										data-year={item.releaseDate?.year}
										data-item-id={item.id}
										h="100%"
									>
										<ItemCard item={item} index={globalIndex} onFilterToggle={onFilterToggle} filters={filters} viewMode="grid" />
									</Box>
								);
							})}
						</Box>
					))}
				</Box>
			)}

			{/* List view: Virtualized list for efficient rendering */}
			{viewMode === "list" && (
				<Box
					ref={listContainerRef}
					style={{
						height: listVirtualizer.getTotalSize(),
						width: "100%",
						position: "relative",
					}}
				>
					{listVirtualizer.getVirtualItems().map((virtualItem) => {
						const item = sortedItems[virtualItem.index];
						return (
							<Box
								key={item.id}
								data-year={item.releaseDate?.year}
								data-item-id={item.id}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "100%",
									height: virtualItem.size,
									transform: `translateY(${virtualItem.start - listScrollMargin}px)`,
									paddingBottom: 8,
								}}
							>
								<ItemCard item={item} index={virtualItem.index} onFilterToggle={onFilterToggle} filters={filters} viewMode="list" />
							</Box>
						);
					})}
				</Box>
			)}

			{/* Table view: Virtualized table for efficient rendering */}
			{viewMode === "table" && (
				<Box ref={tableContainerRef} style={{ overflowX: "auto" }}>
					<Table striped={true} highlightOnHover={true}>
						<Table.Thead>
							<Table.Tr>
								<Table.Th>Name</Table.Th>
								<Table.Th>Released</Table.Th>
								<Table.Th>Series</Table.Th>
								<Table.Th>Grade</Table.Th>
								<Table.Th>Scale</Table.Th>
								<Table.Th>Brand</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody
							style={{
								height: tableVirtualizer.getTotalSize(),
								position: "relative",
							}}
						>
							{tableVirtualizer.getVirtualItems().map((virtualItem) => {
								const item = sortedItems[virtualItem.index];
								return (
									<Table.Tr
										key={item.id}
										data-year={item.releaseDate?.year}
										data-item-id={item.id}
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											height: virtualItem.size,
											transform: `translateY(${virtualItem.start - tableScrollMargin}px)`,
											display: "table-row",
										}}
									>
										{/* Render table cells inline instead of using ItemCard for table rows */}
										<TableRowCells item={item} onFilterToggle={onFilterToggle} filters={filters} />
									</Table.Tr>
								);
							})}
						</Table.Tbody>
					</Table>
				</Box>
			)}
		</>
	);
});
