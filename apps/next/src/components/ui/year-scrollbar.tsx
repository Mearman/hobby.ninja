"use client";

import { Box, Text, rem } from "@mantine/core";
import { useCallback, useRef, useState } from "react";

// Check if year is a major tick (divisible by 5: 1980, 1985, 1990, etc.)
const isMajorYear = (year: number) => year % 5 === 0;

interface YearScrollbarProps {
	/** All available years sorted newest first */
	years: number[];
	/** Currently visible year (from scroll position) */
	currentYear?: number;
	/** Callback when a year is clicked or drag ends */
	onYearSelect?: (year: number) => void;
}

/**
 * Vertical scrollbar showing years for quick navigation.
 * - Click on a year to scroll to it
 * - Drag to scrub through years (shows preview)
 * Hidden on mobile.
 */
export function YearScrollbar({
	years,
	currentYear,
	onYearSelect,
}: YearScrollbarProps): React.ReactElement | null {
	const [isDragging, setIsDragging] = useState(false);
	const [previewYear, setPreviewYear] = useState<number | undefined>();
	const containerRef = useRef<HTMLDivElement>(null);

	const getYearFromPosition = useCallback(
		(clientY: number): number | undefined => {
			if (!containerRef.current || years.length === 0) return undefined;

			const rect = containerRef.current.getBoundingClientRect();
			const relativeY = clientY - rect.top;
			const percentage = Math.max(0, Math.min(1, relativeY / rect.height));

			const index = Math.floor(percentage * years.length);
			return years[Math.min(index, years.length - 1)];
		},
		[years],
	);

	const handlePointerDown = useCallback(
		(event: React.PointerEvent) => {
			event.preventDefault();
			setIsDragging(true);
			containerRef.current?.setPointerCapture(event.pointerId);

			const year = getYearFromPosition(event.clientY);
			setPreviewYear(year);
		},
		[getYearFromPosition],
	);

	const handlePointerMove = useCallback(
		(event: React.PointerEvent) => {
			if (!isDragging) return;

			const year = getYearFromPosition(event.clientY);
			setPreviewYear(year);
		},
		[isDragging, getYearFromPosition],
	);

	const handlePointerUp = useCallback(
		(event: React.PointerEvent) => {
			if (!isDragging) return;

			containerRef.current?.releasePointerCapture(event.pointerId);
			setIsDragging(false);

			const year = previewYear ?? getYearFromPosition(event.clientY);
			if (year !== undefined) {
				onYearSelect?.(year);
			}
			setPreviewYear(undefined);
		},
		[isDragging, previewYear, getYearFromPosition, onYearSelect],
	);

	const handleClick = useCallback(
		(year: number) => {
			if (!isDragging) {
				onYearSelect?.(year);
			}
		},
		[isDragging, onYearSelect],
	);

	if (years.length === 0) return null;

	return (
		<Box
			pos="fixed"
			right={rem(8)}
			top="50%"
			style={{
				transform: "translateY(-50%)",
				zIndex: 900,
				display: "flex",
			}}
			visibleFrom="md"
		>
			{/* Preview tooltip during drag */}
			{isDragging && previewYear !== undefined && (
				<Box
					pos="absolute"
					right={rem(40)}
					top="50%"
					style={{
						transform: "translateY(-50%)",
						backgroundColor: "var(--mantine-color-text)",
						color: "var(--mantine-color-body)",
						padding: "4px 12px",
						borderRadius: 4,
						fontSize: 14,
						fontWeight: 600,
						whiteSpace: "nowrap",
					}}
				>
					{previewYear}
				</Box>
			)}

			{/* Year rail */}
			<Box
				ref={containerRef}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 0,
					padding: "8px 4px",
					backgroundColor: "var(--mantine-color-default)",
					border: "1px solid var(--mantine-color-default-border)",
					borderRadius: 8,
					cursor: isDragging ? "grabbing" : "grab",
					userSelect: "none",
					touchAction: "none",
					maxHeight: "60vh",
					overflowY: "auto",
				}}
			>
				{years.map((year) => {
					const isCurrentYear = year === currentYear;
					const showLabel = isMajorYear(year);

					return (
						<Box
							key={year}
							onClick={() => { handleClick(year); }}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								minHeight: showLabel ? 20 : 8,
								width: showLabel ? 36 : 12,
								cursor: "pointer",
								position: "relative",
							}}
						>
							{showLabel ? (
								<Text
									size="xs"
									fw={isCurrentYear ? 700 : 400}
									c={isCurrentYear ? "blue" : "dimmed"}
									style={{
										fontSize: 10,
										lineHeight: 1,
									}}
								>
									{year}
								</Text>
							) : (
								<Box
									style={{
										width: 4,
										height: 4,
										borderRadius: "50%",
										backgroundColor: isCurrentYear
											? "var(--mantine-color-blue-6)"
											: "var(--mantine-color-dimmed)",
									}}
								/>
							)}
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}
