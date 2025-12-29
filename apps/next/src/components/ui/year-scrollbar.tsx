"use client";

import { Box, rem, Text } from "@mantine/core";
import { useCallback, useMemo, useRef, useState } from "react";

interface YearScrollbarProps {
	/** All available years sorted newest first */
	years: number[];
	/** Currently visible year (from scroll position) */
	currentYear?: number;
	/** Callback when a year is clicked or drag ends */
	onYearSelect?: (year: number) => void;
}

// Track dimensions
const TRACK_HEIGHT = "50vh";
const TRACK_WIDTH = 4;
const THUMB_SIZE = 14;
const MARK_SIZE = 8;
const CENTER_TRANSFORM = "translateX(-50%)";

/**
 * Custom vertical slider showing years for quick navigation.
 * Built from scratch to handle vertical pointer events correctly.
 * Hidden on mobile.
 */
export function YearScrollbar({
	years,
	currentYear,
	onYearSelect,
}: YearScrollbarProps): React.ReactElement | null {
	const trackRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragYear, setDragYear] = useState<number | null>(null);

	const minYear = useMemo(() => Math.min(...years), [years]);
	const maxYear = useMemo(() => Math.max(...years), [years]);
	const yearRange = maxYear - minYear;

	// Years divisible by 5 for marks
	const markYears = useMemo(() => {
		return years.filter((year) => year % 5 === 0);
	}, [years]);

	// Convert Y position (0-1, top to bottom) to year
	// Top = newest (maxYear), Bottom = oldest (minYear)
	const positionToYear = useCallback(
		(position: number): number => {
			const clampedPos = Math.max(0, Math.min(1, position));
			// Position 0 (top) = maxYear, Position 1 (bottom) = minYear
			const rawYear = maxYear - clampedPos * yearRange;
			// Find closest year in our list
			let closest = years[0];
			for (const year of years) {
				if (Math.abs(year - rawYear) < Math.abs(closest - rawYear)) {
					closest = year;
				}
			}
			return closest;
		},
		[years, maxYear, yearRange],
	);

	// Convert year to Y position (0-1)
	const yearToPosition = useCallback(
		(year: number): number => {
			return (maxYear - year) / yearRange;
		},
		[maxYear, yearRange],
	);

	// Get position from pointer event
	const getPositionFromEvent = useCallback(
		(e: React.PointerEvent | PointerEvent): number => {
			if (!trackRef.current) return 0;
			const rect = trackRef.current.getBoundingClientRect();
			const y = e.clientY - rect.top;
			return y / rect.height;
		},
		[],
	);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
			setIsDragging(true);
			const position = getPositionFromEvent(e);
			const year = positionToYear(position);
			setDragYear(year);
		},
		[getPositionFromEvent, positionToYear],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (!isDragging) return;
			const position = getPositionFromEvent(e);
			const year = positionToYear(position);
			setDragYear(year);
		},
		[isDragging, getPositionFromEvent, positionToYear],
	);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent) => {
			if (!isDragging) return;
			(e.target as HTMLElement).releasePointerCapture(e.pointerId);
			setIsDragging(false);
			if (dragYear !== null) {
				onYearSelect?.(dragYear);
			}
			setDragYear(null);
		},
		[isDragging, dragYear, onYearSelect],
	);

	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			// Only handle direct clicks, not drag releases
			if (isDragging) return;
			if (!trackRef.current) return;
			const rect = trackRef.current.getBoundingClientRect();
			const y = e.clientY - rect.top;
			const position = y / rect.height;
			const year = positionToYear(position);
			onYearSelect?.(year);
		},
		[isDragging, positionToYear, onYearSelect],
	);

	if (years.length === 0) return null;

	// Show drag preview or current year position
	const displayYear = dragYear ?? currentYear;
	const thumbPosition = displayYear === undefined ? undefined : yearToPosition(displayYear);

	return (
		<Box
			pos="fixed"
			right={rem(16)}
			top="50%"
			style={{
				height: TRACK_HEIGHT,
				transform: "translateY(-50%)",
				zIndex: 900,
				display: "flex",
				alignItems: "center",
			}}
			visibleFrom="md"
		>
			{/* Year label (shows during drag or hover) */}
			{isDragging && dragYear !== null && thumbPosition !== undefined && (
				<Box
					pos="absolute"
					right={40}
					style={{
						top: `calc(${thumbPosition * 100}% - 12px)`,
						transition: "top 50ms ease-out",
						zIndex: 1,
					}}
				>
					<Box
						bg="var(--mantine-color-blue-filled)"
						c="white"
						px="xs"
						py={4}
						style={{ borderRadius: 4, fontSize: 12, fontWeight: 600 }}
					>
						{dragYear}
					</Box>
				</Box>
			)}

			{/* Track container */}
			<Box
				ref={trackRef}
				pos="relative"
				h="100%"
				w={60}
				style={{ cursor: "pointer" }}
				onClick={handleClick}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
			>
				{/* Track line */}
				<Box
					pos="absolute"
					left="50%"
					top={0}
					h="100%"
					w={TRACK_WIDTH}
					bg="var(--mantine-color-default-border)"
					style={{
						transform: CENTER_TRANSFORM,
						borderRadius: TRACK_WIDTH / 2,
					}}
				/>

				{/* Year marks */}
				{markYears.map((year) => {
					const pos = yearToPosition(year);
					return (
						<Box
							key={year}
							pos="absolute"
							left="50%"
							style={{
								top: `calc(${pos * 100}% - ${MARK_SIZE / 2}px)`,
								transform: CENTER_TRANSFORM,
							}}
						>
							{/* Mark dot */}
							<Box
								w={MARK_SIZE}
								h={MARK_SIZE}
								bg="var(--mantine-color-default-border)"
								style={{ borderRadius: MARK_SIZE / 2 }}
							/>
							{/* Year label */}
							<Text
								pos="absolute"
								size="xs"
								c="dimmed"
								style={{
									right: 20,
									top: "50%",
									transform: "translateY(-50%)",
									whiteSpace: "nowrap",
									fontSize: 10,
								}}
							>
								{year}
							</Text>
						</Box>
					);
				})}

				{/* Thumb */}
				{thumbPosition !== undefined && (
					<Box
						pos="absolute"
						left="50%"
						style={{
							top: `calc(${thumbPosition * 100}% - ${THUMB_SIZE / 2}px)`,
							transform: CENTER_TRANSFORM,
							transition: isDragging ? "none" : "top 100ms ease-out",
						}}
					>
						<Box
							w={THUMB_SIZE}
							h={THUMB_SIZE}
							bg="var(--mantine-color-blue-filled)"
							style={{
								borderRadius: THUMB_SIZE / 2,
								border: "2px solid white",
								boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
							}}
						/>
					</Box>
				)}
			</Box>
		</Box>
	);
}
