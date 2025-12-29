"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface VirtualGridOptions<T> {
	items: T[];
	/** Responsive column counts: { base, number; sm: number; md: number; lg: number } */
	columns: { base: number; sm: number; md: number; lg: number };
	/** Gap between items in pixels */
	gap: number;
	/** Fixed portion of card height (title only) - image and badges calculated from width */
	fixedCardHeight: number;
	/** Multiplier for additional height based on card width (for badges that scale) */
	dynamicHeightMultiplier?: number;
	/** Overscan rows to render above/below viewport */
	overscan?: number;
	/** Offset from top of document to account for headers */
	scrollMargin?: number;
}

export interface VirtualGridReturn<T> {
	/** List ref - attach to the grid container for offset measurement */
	listRef: React.RefObject<HTMLDivElement | null>;
	/** Virtualized rows of items */
	virtualRows: Array<{
		index: number;
		start: number;
		size: number;
		items: T[];
	}>;
	/** Total height of all content */
	totalHeight: number;
	/** Current column count based on viewport */
	columnCount: number;
	/** Scroll to a specific item index */
	scrollToIndex: (index: number) => void;
	/** Get the row index for a given item index */
	getRowForIndex: (index: number) => number;
	/** Check if currently scrolling (for year indicator) */
	isScrolling: boolean;
}

// Breakpoints matching Mantine defaults
const BREAKPOINTS = {
	sm: 576,
	md: 768,
	lg: 992,
};

function getColumnCount(
	width: number,
	columns: { base: number; sm: number; md: number; lg: number },
): number {
	if (width >= BREAKPOINTS.lg) return columns.lg;
	if (width >= BREAKPOINTS.md) return columns.md;
	if (width >= BREAKPOINTS.sm) return columns.sm;
	return columns.base;
}

export function useVirtualGrid<T>({
	items,
	columns,
	gap,
	fixedCardHeight,
	dynamicHeightMultiplier = 0,
	overscan = 5,
	scrollMargin = 0,
}: VirtualGridOptions<T>): VirtualGridReturn<T> {
	const listRef = useRef<HTMLDivElement>(null);
	const [columnCount, setColumnCount] = useState(columns.lg);
	const [containerWidth, setContainerWidth] = useState(0);
	const [computedScrollMargin, setComputedScrollMargin] = useState(scrollMargin);

	// Update column count on resize
	useEffect(() => {
		const updateColumns = () => {
			const width = window.innerWidth;
			setColumnCount(getColumnCount(width, columns));
		};

		updateColumns();
		window.addEventListener("resize", updateColumns);
		return () => { window.removeEventListener("resize", updateColumns); };
	}, [columns]);

	// Track container width for dynamic row height calculation
	useEffect(() => {
		const element = listRef.current;
		if (!element) return;

		const updateWidth = () => {
			setContainerWidth(element.offsetWidth);
		};

		updateWidth();
		const observer = new ResizeObserver(updateWidth);
		observer.observe(element);

		return () => { observer.disconnect(); };
	}, []);

	// Calculate row height based on actual card width (image is 1:1 aspect ratio)
	const rowHeight = useMemo(() => {
		if (containerWidth === 0) return fixedCardHeight + 300 + 300 * dynamicHeightMultiplier; // fallback estimate
		const cardWidth = (containerWidth - (columnCount - 1) * gap) / columnCount;
		// Card height = fixed parts + image height + dynamic portion (badges that scale with width)
		return fixedCardHeight + cardWidth + cardWidth * dynamicHeightMultiplier + gap;
	}, [containerWidth, columnCount, gap, fixedCardHeight, dynamicHeightMultiplier]);

	// Update scroll margin when list ref is available and on layout changes
	useEffect(() => {
		const element = listRef.current;
		if (!element) return;

		const updateMargin = () => {
			const newMargin = element.offsetTop;
			setComputedScrollMargin((prev) => prev === newMargin ? prev : newMargin);
		};

		// Initial update
		updateMargin();

		// Update on resize (layout changes)
		const observer = new ResizeObserver(updateMargin);
		observer.observe(element);

		return () => { observer.disconnect(); };
	});

	// Calculate row count
	const rowCount = Math.ceil(items.length / columnCount);

	// Set up window virtualizer (scrolls with the whole page)
	const virtualizer = useWindowVirtualizer({
		count: rowCount,
		estimateSize: () => rowHeight,
		overscan,
		scrollMargin: computedScrollMargin,
	});

	// Get virtual items from virtualizer
	const virtualItems = virtualizer.getVirtualItems();

	// Get items for each virtual row
	// Adjust start positions to be container-relative (subtract scrollMargin)
	const virtualRows = useMemo(() => {
		return virtualItems.map((virtualRow) => {
			const startIndex = virtualRow.index * columnCount;
			const endIndex = Math.min(startIndex + columnCount, items.length);
			const rowItems = items.slice(startIndex, endIndex);

			return {
				index: virtualRow.index,
				// Convert window-relative to container-relative position
				start: virtualRow.start - computedScrollMargin,
				size: virtualRow.size,
				items: rowItems,
			};
		});
	}, [virtualItems, columnCount, items, computedScrollMargin]);

	// Scroll to a specific item index - positions the row at top of window
	const scrollToIndex = useCallback(
		(index: number) => {
			const rowIndex = Math.floor(index / columnCount);
			// Calculate exact pixel position: row position + container offset from top of document
			const scrollPosition = rowIndex * rowHeight + computedScrollMargin;
			window.scrollTo({ top: scrollPosition, behavior: "smooth" });
		},
		[columnCount, rowHeight, computedScrollMargin],
	);

	// Get row index for item index
	const getRowForIndex = useCallback(
		(index: number) => Math.floor(index / columnCount),
		[columnCount],
	);

	return {
		listRef,
		virtualRows,
		totalHeight: virtualizer.getTotalSize(),
		columnCount,
		scrollToIndex,
		getRowForIndex,
		isScrolling: virtualizer.isScrolling,
	};
}
