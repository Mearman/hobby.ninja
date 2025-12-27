"use client";

import { ActionIcon, Box, Group, Stack, Text, Title, Tooltip, UnstyledButton } from "@mantine/core";
import { useDisclosure, useElementSize } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp, IconX } from "@tabler/icons-react";
import React, { useMemo, useRef, useState } from "react";

interface CollapsibleGridProps {
	title: string;
	children: React.ReactNode;
	totalCount: number;
	/** Width of each card */
	cardWidth?: number;
	/** Number of selected items (for filter mode) */
	selectedCount?: number;
	/** Controlled expanded state */
	expanded?: boolean;
	/** Callback when expanded state changes */
	onExpandedChange?: (expanded: boolean) => void;
	/** Callback to clear selections for this filter type */
	onClear?: () => void;
}

const GAP = 16; // var(--mantine-spacing-md) in pixels
const CARD_ASPECT_RATIO = 170 / 300; // From EntityCard's aspectRatio
const COLLAPSE_DURATION = 300; // ms
const ROW_STAGGER_DELAY = 50; // ms delay between each row

export function CollapsibleGrid({
	title,
	children,
	totalCount,
	cardWidth: minCardWidth = 140,
	selectedCount = 0,
	expanded: controlledExpanded,
	onExpandedChange,
	onClear,
}: CollapsibleGridProps): React.ReactElement {
	const [internalExpanded, { toggle: internalToggle }] = useDisclosure(false);
	const { ref: containerRef, width: containerWidth } = useElementSize();
	const gridRef = useRef<HTMLDivElement>(null);
	const [isCollapsing, setIsCollapsing] = useState(false);
	const [animatedHeight, setAnimatedHeight] = useState<number | null>(null);
	// Track when we just expanded to trigger row animations
	const [expandAnimationKey, setExpandAnimationKey] = useState(0);

	// Calculate exact card width to fill container with no gap
	const cardWidth = useMemo(() => {
		if (containerWidth === 0) return minCardWidth;
		// Calculate how many cards fit
		const cols = Math.floor((containerWidth + GAP) / (minCardWidth + GAP));
		if (cols <= 0) return minCardWidth;
		// Calculate exact width to fill the space
		return (containerWidth - (cols - 1) * GAP) / cols;
	}, [containerWidth, minCardWidth]);

	// Calculate number of columns for row-based animations
	const numCols = useMemo(() => {
		if (containerWidth === 0) return 1;
		return Math.max(1, Math.floor((containerWidth + GAP) / (minCardWidth + GAP)));
	}, [containerWidth, minCardWidth]);

	// Use controlled state if provided, otherwise use internal state
	const expanded = controlledExpanded ?? internalExpanded;

	// Calculate collapsed height (single row for horizontal scroll)
	const collapsedHeight = useMemo(() => {
		const cardHeight = cardWidth * CARD_ASPECT_RATIO;
		return cardHeight + 8; // one card height + padding for scrollbar
	}, [cardWidth]);

	// Show expand button if more items than fit in one row
	const showExpandButton = totalCount > numCols;

	const toggle = () => {
		const toExpanded = !expanded;

		if (!toExpanded && gridRef.current) {
			// Collapsing: animate height down
			const currentHeight = gridRef.current.scrollHeight;
			setAnimatedHeight(currentHeight);
			setIsCollapsing(true);
			requestAnimationFrame(() => {
				setAnimatedHeight(collapsedHeight);
				setTimeout(() => {
					setIsCollapsing(false);
					setAnimatedHeight(null);
				}, COLLAPSE_DURATION);
			});
		} else {
			// Expanding: trigger row-by-row animation
			setExpandAnimationKey((k) => k + 1);
		}

		if (onExpandedChange) {
			onExpandedChange(toExpanded);
		} else {
			internalToggle();
		}
	};

	return (
		<Stack gap="lg">
			<Group justify="space-between" align="center">
				<Group gap="sm">
					{showExpandButton ? (
						<UnstyledButton onClick={toggle} style={{ cursor: "pointer" }}>
							<Title order={2} size="h2" fw={600}>
								{title}
							</Title>
						</UnstyledButton>
					) : (
						<Title order={2} size="h2" fw={600}>
							{title}
						</Title>
					)}
					{selectedCount > 0 && (
						<Group gap={4}>
							<Text size="sm" c="blue" fw={500}>
								({selectedCount} selected)
							</Text>
							{onClear && (
								<Tooltip label={`Clear ${title.toLowerCase()}`}>
									<ActionIcon
										variant="subtle"
										color="gray"
										size="xs"
										onClick={onClear}
									>
										<IconX size={12} />
									</ActionIcon>
								</Tooltip>
							)}
						</Group>
					)}
				</Group>
				{showExpandButton && (
					<UnstyledButton onClick={toggle} style={{ cursor: "pointer" }}>
						<Group gap="xs" c="blue">
							<Text size="sm" fw={500}>
								{expanded ? "Collapse" : `Show all ${totalCount}`}
							</Text>
							{expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
						</Group>
					</UnstyledButton>
				)}
			</Group>

			<Box
				ref={containerRef}
				style={{
					height: animatedHeight ?? undefined,
					overflow: isCollapsing ? "hidden" : undefined,
					transition: isCollapsing ? `height ${COLLAPSE_DURATION}ms ease-in-out` : undefined,
				}}
			>
				{expanded || isCollapsing ? (
					// Expanded (or collapsing): grid with calculated card width
					<Box
						ref={gridRef}
						style={{
							display: "grid",
							gridTemplateColumns: `repeat(auto-fill, ${cardWidth}px)`,
							gap: GAP,
						}}
					>
						{React.Children.map(children, (child, index) => {
							const row = Math.floor(index / numCols);
							// Skip animation for first row (already visible in collapsed state)
							const delay = row > 0 ? row * ROW_STAGGER_DELAY : 0;
							return (
								<Box
									key={`${expandAnimationKey}-${index}`}
									style={{
										animation: row > 0 && expandAnimationKey > 0
											? `rowFadeIn 200ms ease-out ${delay}ms both`
											: undefined,
									}}
								>
									{child}
								</Box>
							);
						})}
					</Box>
				) : (
					// Collapsed: horizontal scroll row
					<Box
						style={{
							display: "flex",
							gap: GAP,
							overflowX: "auto",
							paddingBottom: 8,
						}}
					>
						{React.Children.map(children, (child, index) => (
							<Box key={index} style={{ flexShrink: 0, width: cardWidth }}>
								{child}
							</Box>
						))}
					</Box>
				)}
			</Box>

			{/* CSS keyframes for row animation */}
			<style>{`
				@keyframes rowFadeIn {
					from {
						opacity: 0;
						transform: translateY(-8px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>
		</Stack>
	);
}
