"use client";

import { Box, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure, useElementSize } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import React, { useMemo } from "react";

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
}

const GAP = 16; // var(--mantine-spacing-md) in pixels

export function CollapsibleGrid({
	title,
	children,
	totalCount,
	cardWidth: minCardWidth = 180,
	selectedCount = 0,
	expanded: controlledExpanded,
	onExpandedChange,
}: CollapsibleGridProps): React.ReactElement {
	const [internalExpanded, { toggle: internalToggle }] = useDisclosure(false);
	const { ref: containerRef, width: containerWidth } = useElementSize();

	// Calculate exact card width to fill container with no gap
	const cardWidth = useMemo(() => {
		if (containerWidth === 0) return minCardWidth;
		// Calculate how many cards fit
		const cols = Math.floor((containerWidth + GAP) / (minCardWidth + GAP));
		if (cols <= 0) return minCardWidth;
		// Calculate exact width to fill the space
		return (containerWidth - (cols - 1) * GAP) / cols;
	}, [containerWidth, minCardWidth]);

	// Use controlled state if provided, otherwise use internal state
	const expanded = controlledExpanded ?? internalExpanded;
	const toggle = () => {
		if (onExpandedChange) {
			onExpandedChange(!expanded);
		} else {
			internalToggle();
		}
	};

	return (
		<Stack gap="lg">
			<UnstyledButton onClick={toggle} style={{ cursor: "pointer" }}>
				<Group justify="space-between" align="center">
					<Group gap="sm">
						<Title order={2} size="h2" fw={600}>
							{title}
						</Title>
						{selectedCount > 0 && (
							<Text size="sm" c="blue" fw={500}>
								({selectedCount} selected)
							</Text>
						)}
					</Group>
					<Group gap="xs" c="blue">
						<Text size="sm" fw={500}>
							{expanded ? "Collapse" : `Show all ${totalCount}`}
						</Text>
						{expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
					</Group>
				</Group>
			</UnstyledButton>

			<Box ref={containerRef}>
				{expanded ? (
					// Expanded: grid with calculated card width (fills container exactly)
					<Box
						style={{
							display: "grid",
							gridTemplateColumns: `repeat(auto-fill, ${cardWidth}px)`,
							gap: GAP,
						}}
					>
						{children}
					</Box>
				) : (
					// Collapsed: horizontal scroll with same card width
					<Box
						style={{
							overflowX: "auto",
							overflowY: "hidden",
							marginInline: "calc(-1 * var(--mantine-spacing-md))",
							paddingInline: "var(--mantine-spacing-md)",
							scrollbarWidth: "thin",
						}}
					>
						<Box
							style={{
								display: "flex",
								gap: GAP,
								paddingBottom: "var(--mantine-spacing-xs)",
							}}
						>
							{React.Children.map(children, (child, index) => (
								<Box key={index} style={{ flexShrink: 0, width: cardWidth }}>
									{child}
								</Box>
							))}
						</Box>
					</Box>
				)}
			</Box>
		</Stack>
	);
}
