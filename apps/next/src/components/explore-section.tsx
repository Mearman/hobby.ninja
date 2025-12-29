"use client";

import { getBrandById, getCategoryById, getGradeById, getNodeDisplayName, getNodeImages, getSeriesById, itemHasGrade, resolveCdnUrl, type Item } from "@hobby-ninja/data";
import { Box, Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import Link from "next/link";
import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useVirtualGrid } from "@/hooks/use-virtual-grid";

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

// Virtual grid configuration - fixed heights for consistent virtualization
// Square images: aspect-ratio 1:1, height estimated from typical card width
const CARD_BADGES_HEIGHT = 40; // Entity badges row
const GRID_GAP = 16; // Matches Mantine "lg" spacing
const GRID_COLUMNS = { base: 1, sm: 2, md: 3, lg: 4 };
// Estimate card width for row height calculation (works across breakpoints)
// At 4 cols on typical desktop (~1300px container): (1300 - 3*16) / 4 ≈ 312px
const ESTIMATED_CARD_WIDTH = 312;
const CARD_TOTAL_HEIGHT = TITLE_CONTAINER_HEIGHT + ESTIMATED_CARD_WIDTH + CARD_BADGES_HEIGHT;
const ROW_HEIGHT = CARD_TOTAL_HEIGHT + GRID_GAP; // Row height including gap

/** Title text that auto-scales to fit within a fixed-height container */
function FittedTitle({ text }: { text: string }): React.ReactElement {
	const measureRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const measureEl = measureRef.current;
		const textEl = textRef.current;
		if (!measureEl || !textEl) return;

		// Find the largest font size that fits within the content area (excluding padding)
		for (const size of TITLE_FONT_SIZES_PX) {
			textEl.style.fontSize = `${size}px`;
			if (textEl.scrollHeight <= measureEl.clientHeight) {
				break;
			}
		}
	}, [text]);

	return (
		<Box
			px="xs"
			pt="xs"
			pb={4}
			style={{
				height: TITLE_CONTAINER_HEIGHT,
				overflow: "hidden",
			}}
		>
			{/* Inner wrapper for accurate height measurement (excludes parent padding) */}
			<Box
				ref={measureRef}
				style={{
					height: "100%",
					overflow: "hidden",
					display: "flex",
					alignItems: "center",
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
					flex: "0 0 20%",
					aspectRatio: "300 / 170",
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
					<Text size="10px" fw={600} c="gray.7" ta="center" px={2} style={{ wordBreak: WORD_BREAK_STYLE, lineHeight: 1.2 }}>
						{name}
					</Text>
				)}
			</Box>
		</Tooltip>
	);
}

function ItemCard({ item, index, onFilterToggle, filters }: { item: Item; index: number; onFilterToggle?: (type: keyof FilterState, id: string) => void; filters?: FilterState }): React.ReactElement {
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

	return (
		<Link href={`/items/${item.id}`} style={{ textDecoration: "none", color: "inherit" }}>
			<Card
				shadow="sm"
				padding={0}
				radius="md"
				withBorder={true}
				h="100%"
				style={{ cursor: "pointer", overflow: "hidden" }}
				className="item-card-hover"
			>
				<FittedTitle text={displayName} />
				<Box
					bg="gray.1"
					style={{
						aspectRatio: "1 / 1",
						width: "100%",
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
								transition: "opacity 0.2s ease-in-out",
								zIndex: 1,
							}}
						/>
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

				<Stack gap={0} px="sm" pt={0} pb={0} style={{ flex: 1 }}>
					<Group gap={0} wrap="nowrap" justify="space-evenly" w="calc(100% + var(--mantine-spacing-sm) * 2)" mt="xs" ml="calc(-1 * var(--mantine-spacing-sm))" mb="xs">
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
						{primaryCategory && (
							<EntityBadge
								image={primaryCategory.image}
								name={typeof primaryCategory.name === "string" ? primaryCategory.name : primaryCategory.name.en ?? primaryCategory.name.ja}
								onClick={onFilterToggle ? () => { onFilterToggle("categories", primaryCategory.id); } : undefined}
								isSelected={filters?.categories.includes(primaryCategory.id)}
							/>
						)}
					</Group>
				</Stack>
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

export interface FilterState {
	categories: string[];
	series: string[];
	brands: string[];
	grades: string[];
	scales: string[];
	years: string[];
}

interface ExploreSectionProps {
	items: Item[];
	filters?: FilterState;
	totalCount?: number;
	/** Callback to toggle a filter - type is "categories" | "series" | "brands" | "grades" */
	onFilterToggle?: (type: keyof FilterState, id: string) => void;
}

/** Ref handle for ExploreSection - exposes year navigation */
export interface ExploreSectionHandle {
	/** Scroll to the first item of the given year, loading items if needed */
	scrollToYear: (year: number) => void;
	/** Get the scroll position (0-1) where a year's items start */
	getYearScrollPosition: (year: number) => number | null;
}

export const ExploreSection = forwardRef<ExploreSectionHandle, ExploreSectionProps>(function ExploreSection({ items, filters, totalCount, onFilterToggle }, ref) {
	// Filter items based on selected filters
	const filteredItems = useMemo(() => {
		if (!filters) return items;

		const hasActiveFilters =
			filters.categories.length > 0 ||
			filters.series.length > 0 ||
			filters.brands.length > 0 ||
			filters.grades.length > 0 ||
			filters.scales.length > 0 ||
			filters.years.length > 0;

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

			return true;
		});
	}, [items, filters]);

	// Sort items by release date (newest first)
	const sortedItems = useMemo(
		() => [...filteredItems].toSorted((a, b) => releaseDateToNumber(b.releaseDate) - releaseDateToNumber(a.releaseDate)),
		[filteredItems],
	);

	// Virtual grid for efficient rendering of large item lists
	const { listRef, virtualRows, totalHeight, columnCount, scrollToIndex } = useVirtualGrid({
		items: sortedItems,
		columns: GRID_COLUMNS,
		gap: GRID_GAP,
		rowHeight: ROW_HEIGHT,
		overscan: 3,
	});

	// Expose scrollToYear and getYearScrollPosition via ref
	useImperativeHandle(ref, () => ({
		scrollToYear: (year: number) => {
			// Find the index of the first item with this year in the sorted list
			const firstIndex = sortedItems.findIndex((item) => item.releaseDate?.year === year);
			if (firstIndex === -1) return;

			// Scroll to that item using virtual grid
			scrollToIndex(firstIndex);
		},
		getYearScrollPosition: (year: number) => {
			// Find the index of the first item with this year
			const firstIndex = sortedItems.findIndex((item) => item.releaseDate?.year === year);
			if (firstIndex === -1) return null;

			// Return as fraction of total items (approximates scroll position)
			return sortedItems.length > 0 ? firstIndex / sortedItems.length : null;
		},
	}), [sortedItems, scrollToIndex]);

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
			{hasActiveFilters && (
				<Text size="sm" c="dimmed" mb="md">
					Showing {filteredItems.length.toLocaleString()} of {(totalCount ?? items.length).toLocaleString()} items
				</Text>
			)}
			{/* Virtual grid container - height matches total virtualized content */}
			<Box
				ref={listRef}
				style={{
					height: totalHeight,
					width: "100%",
					position: "relative",
				}}
			>
				{virtualRows.map((virtualRow) => (
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
							gap: GRID_GAP,
						}}
					>
						{virtualRow.items.map((item, itemIndex) => {
							const globalIndex = virtualRow.index * columnCount + itemIndex;
							return (
								<Box
									key={item.id}
									data-year={item.releaseDate?.year}
									data-item-id={item.id}
									style={{ height: CARD_TOTAL_HEIGHT }}
								>
									<ItemCard item={item} index={globalIndex} onFilterToggle={onFilterToggle} filters={filters} />
								</Box>
							);
						})}
					</Box>
				))}
			</Box>
		</>
	);
});
