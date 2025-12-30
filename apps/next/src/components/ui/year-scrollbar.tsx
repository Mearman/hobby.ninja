"use client";

import { ActionIcon, Box, rem, Text, Transition } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconArrowUp } from "@tabler/icons-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

interface YearScrollbarProps {
	/** All available years sorted newest first */
	years: number[];
	/** Callback when a year is clicked or drag ends */
	onYearSelect?: (year: number) => void;
	/** Get scroll position (0-1) for a year based on actual item distribution */
	getYearPosition?: (year: number) => number | null;
}

// Track dimensions
const TRACK_HEIGHT = "70vh"; // Tall but leaves room for header and bottom spacing
const TRACK_WIDTH = 4;
const THUMB_SIZE = 14;
const THUMB_SIZE_MOBILE = 18; // Larger touch target on mobile
const MARK_SIZE = 8;
const CENTER_TRANSFORM = "translateX(-50%)";
// Threshold for considering scroll "arrived" at target (2% of scroll height)
const SCROLL_ARRIVAL_THRESHOLD = 0.02;
// Transition duration for thumb animation during year navigation
const THUMB_TRANSITION_MS = 800;

// Responsive dimensions
const CONTAINER_WIDTH_DESKTOP = 60;
const CONTAINER_WIDTH_MOBILE = 36;
const RIGHT_OFFSET_DESKTOP = 16;
const RIGHT_OFFSET_MOBILE = 8;

/**
 * Custom vertical year navigation rail.
 * Thumb position tracks scroll progress directly (no year detection needed).
 * Click/drag navigates to years.
 */
export function YearScrollbar({
	years,
	onYearSelect,
	getYearPosition,
}: YearScrollbarProps): React.ReactElement | null {
	const trackRef = useRef<HTMLDivElement>(null);
	const thumbRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragYear, setDragYear] = useState<number | null>(null);
	// Target year persists after release until scroll completes
	const [targetYear, setTargetYear] = useState<number | null>(null);
	// Ref to access targetYear in scroll handler without re-registering listeners
	const targetYearRef = useRef<number | null>(null);
	// Ref to access yearToPosition function in scroll handler
	const yearToPositionRef = useRef<(year: number) => number>(() => 0);
	// Scroll progress (0-1) for smooth thumb movement
	const [scrollProgress, setScrollProgress] = useState(0);
	// Whether we're currently animating the thumb (don't update from scroll)
	const isAnimatingRef = useRef(false);
	// Timestamp when animation started (to ensure minimum animation time)
	const animationStartTimeRef = useRef<number | null>(null);

	// Responsive: detect if we're on desktop (md+)
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const containerWidth = isDesktop ? CONTAINER_WIDTH_DESKTOP : CONTAINER_WIDTH_MOBILE;
	const rightOffset = isDesktop ? RIGHT_OFFSET_DESKTOP : RIGHT_OFFSET_MOBILE;
	const thumbSize = isDesktop ? THUMB_SIZE : THUMB_SIZE_MOBILE;

	const minYear = useMemo(() => Math.min(...years), [years]);
	const maxYear = useMemo(() => Math.max(...years), [years]);
	const yearRange = maxYear - minYear;

	// Years divisible by 5 for marks
	const markYears = useMemo(() => {
		return years.filter((year) => year % 5 === 0);
	}, [years]);

	// Convert year to Y position (0-1) - uses actual scroll position if available
	const yearToPosition = useCallback(
		(year: number): number => {
			// Use actual item-based position if available
			const actualPos = getYearPosition?.(year);
			if (actualPos !== null && actualPos !== undefined) {
				return actualPos;
			}
			// Fallback to linear year-based position
			return yearRange > 0 ? (maxYear - year) / yearRange : 0;
		},
		[getYearPosition, maxYear, yearRange],
	);

	// Convert Y position (0-1, top to bottom) to year
	// Finds the year whose actual scroll position is closest to the clicked position
	const positionToYear = useCallback(
		(position: number): number => {
			const clampedPos = Math.max(0, Math.min(1, position));

			// Find year whose position is closest to clicked position
			let closest = years[0];
			let closestDist = Infinity;

			for (const year of years) {
				const yearPos = yearToPosition(year);
				const dist = Math.abs(yearPos - clampedPos);
				if (dist < closestDist) {
					closest = year;
					closestDist = dist;
				}
			}

			return closest;
		},
		[years, yearToPosition],
	);

	// Sync refs with state for use in scroll handler
	useEffect(() => {
		targetYearRef.current = targetYear;
	}, [targetYear]);

	useEffect(() => {
		yearToPositionRef.current = yearToPosition;
	}, [yearToPosition]);

	// Set initial thumb position before first paint (prevents flash at wrong position)
	useLayoutEffect(() => {
		if (thumbRef.current) {
			const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
			const progress = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
			const clampedProgress = Math.max(0, Math.min(1, progress));
			const size = window.innerWidth >= 768 ? THUMB_SIZE : THUMB_SIZE_MOBILE;
			thumbRef.current.style.transition = "none";
			thumbRef.current.style.top = `calc(${clampedProgress * 100}% - ${size / 2}px)`;
		}
	}, []); // Run once on mount only

	// Track scroll position and update thumb via direct DOM manipulation
	useEffect(() => {
		const updateScrollProgress = () => {
			const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
			if (scrollHeight <= 0) return;

			const progress = window.scrollY / scrollHeight;
			const clampedProgress = Math.max(0, Math.min(1, progress));

			// Check if thumb animation is still running (800ms CSS transition)
			const animationElapsed = animationStartTimeRef.current
				? Date.now() - animationStartTimeRef.current
				: Infinity;
			const thumbAnimationRunning = animationElapsed < THUMB_TRANSITION_MS;

			// During thumb animation, skip ALL scroll handler updates
			// The CSS transition has exclusive control of thumb position
			if (thumbAnimationRunning) {
				return;
			}

			// Animation complete - update state and thumb position
			setScrollProgress(clampedProgress);

			if (thumbRef.current) {
				const size = window.innerWidth >= 768 ? THUMB_SIZE : THUMB_SIZE_MOBILE;
				thumbRef.current.style.transition = "none";
				thumbRef.current.style.top = `calc(${clampedProgress * 100}% - ${size / 2}px)`;
			}

			// Clear target indicator when scroll reaches destination
			const currentTarget = targetYearRef.current;
			if (currentTarget !== null) {
				const targetPos = yearToPositionRef.current(currentTarget);
				if (Math.abs(clampedProgress - targetPos) < SCROLL_ARRIVAL_THRESHOLD) {
					setTargetYear(null);
					isAnimatingRef.current = false;
					animationStartTimeRef.current = null;
				}
			}
		};

		updateScrollProgress();
		window.addEventListener("scroll", updateScrollProgress, { passive: true });
		window.addEventListener("resize", updateScrollProgress, { passive: true });

		return () => {
			window.removeEventListener("scroll", updateScrollProgress);
			window.removeEventListener("resize", updateScrollProgress);
		};
	}, []);

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

	// Start thumb animation using CSS transition
	const startThumbAnimation = useCallback((targetPos: number) => {
		if (!thumbRef.current) return;

		const thumb = thumbRef.current;
		const thumbSize = isDesktop ? THUMB_SIZE : THUMB_SIZE_MOBILE;

		// Use CSS transition - browser's native animation is smoothest
		thumb.style.transition = `top ${THUMB_TRANSITION_MS}ms ease-out`;
		thumb.style.top = `calc(${targetPos * 100}% - ${thumbSize / 2}px)`;
	}, [isDesktop]);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent) => {
			if (!isDragging) return;
			(e.target as HTMLElement).releasePointerCapture(e.pointerId);
			setIsDragging(false);
			if (dragYear !== null) {
				const targetPos = yearToPosition(dragYear);

				// Set animating flag and start time
				isAnimatingRef.current = true;
				animationStartTimeRef.current = Date.now();

				// Start CSS transition animation
				startThumbAnimation(targetPos);
				setTargetYear(dragYear);
				onYearSelect?.(dragYear);
			}
			setDragYear(null);
		},
		[isDragging, dragYear, onYearSelect, yearToPosition, startThumbAnimation],
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
			const targetPos = yearToPosition(year);

			// Set animating flag and start time
			isAnimatingRef.current = true;
			animationStartTimeRef.current = Date.now();

			// Start CSS transition animation
			startThumbAnimation(targetPos);
			setTargetYear(year);
			onYearSelect?.(year);
		},
		[isDragging, positionToYear, onYearSelect, yearToPosition, startThumbAnimation],
	);

	const scrollToTop = useCallback((e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent track click handler from firing
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

	// Compute active target for display
	const activeTargetYear = dragYear ?? targetYear;
	const targetPosition = activeTargetYear === null ? null : yearToPosition(activeTargetYear);

	if (years.length === 0) return null;

	// Show target thumb when navigating
	const showTargetThumb = activeTargetYear !== null;
	// Show scroll-to-top button when not at top
	const showScrollToTop = scrollProgress > 0;

	return (
		<Box
			pos="fixed"
			right={rem(rightOffset)}
			top="50%"
			style={{
				height: TRACK_HEIGHT,
				transform: "translateY(-50%)",
				zIndex: 900,
				display: "flex",
				alignItems: "center",
			}}
		>
			{/* Year label when navigating */}
			{showTargetThumb && targetPosition !== null && (
				<Box
					pos="absolute"
					right={40}
					style={{
						top: `calc(${targetPosition * 100}% - 12px)`,
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
						{activeTargetYear}
					</Box>
				</Box>
			)}

			{/* Track container */}
			<Box
				ref={trackRef}
				pos="relative"
				h="100%"
				w={containerWidth}
				style={{ cursor: "pointer", touchAction: "none" }}
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
							{/* Year label - desktop only */}
							{isDesktop && (
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
										pointerEvents: "none",
									}}
								>
									{year}
								</Text>
							)}
						</Box>
					);
				})}

				{/* Current scroll position thumb - moves with scroll via direct DOM manipulation */}
				<div
					ref={thumbRef}
					style={{
						position: "absolute",
						left: "50%",
						transform: CENTER_TRANSFORM,
						// top is controlled via direct DOM manipulation
					}}
				>
					<div
						style={{
							width: thumbSize,
							height: thumbSize,
							backgroundColor: showTargetThumb ? "var(--mantine-color-dark-4)" : "var(--mantine-color-blue-filled)",
							borderRadius: thumbSize / 2,
							border: "2px solid white",
							boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
							opacity: showTargetThumb ? 0.5 : 1,
							transition: "background-color 150ms ease, opacity 150ms ease",
						}}
					/>
				</div>

				{/* Target thumb - shows where you're going */}
				{showTargetThumb && targetPosition !== null && (
					<Box
						pos="absolute"
						left="50%"
						style={{
							top: `calc(${targetPosition * 100}% - ${thumbSize / 2}px)`,
							transform: CENTER_TRANSFORM,
						}}
					>
						<Box
							w={thumbSize}
							h={thumbSize}
							bg="var(--mantine-color-blue-filled)"
							style={{
								borderRadius: thumbSize / 2,
								border: "2px solid white",
								boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
							}}
						/>
					</Box>
				)}

				{/* Scroll to top button - positioned as final point after track */}
				<Box
					pos="absolute"
					left="50%"
					style={{
						top: `calc(100% + 16px)`,
						transform: CENTER_TRANSFORM,
					}}
				>
					<Transition transition="slide-up" mounted={showScrollToTop}>
						{(transitionStyles) => (
							<ActionIcon
								size="lg"
								radius="xl"
								variant="filled"
								color="gray"
								onClick={scrollToTop}
								aria-label="Scroll to top"
								style={transitionStyles}
							>
								<IconArrowUp size={20} />
							</ActionIcon>
						)}
					</Transition>
				</Box>
			</Box>
		</Box>
	);
}
