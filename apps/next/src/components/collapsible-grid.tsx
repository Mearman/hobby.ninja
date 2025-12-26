"use client";

import { Box, Group, SimpleGrid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import React from "react";

interface CollapsibleGridProps {
	title: string;
	children: React.ReactNode;
	totalCount: number;
	cols?: { base: number; sm: number; md: number; lg: number };
	/** Width of each card when in horizontal scroll mode */
	cardWidth?: number;
	/** Number of selected items (for filter mode) */
	selectedCount?: number;
	/** Controlled expanded state */
	expanded?: boolean;
	/** Callback when expanded state changes */
	onExpandedChange?: (expanded: boolean) => void;
}

export function CollapsibleGrid({
	title,
	children,
	totalCount,
	cols = { base: 1, sm: 2, md: 3, lg: 4 },
	cardWidth = 180,
	selectedCount = 0,
	expanded: controlledExpanded,
	onExpandedChange,
}: CollapsibleGridProps): React.ReactElement {
	const [internalExpanded, { toggle: internalToggle }] = useDisclosure(false);

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

			{expanded ? (
				// Expanded: show all items in a grid
				<SimpleGrid cols={cols} spacing="md">
					{children}
				</SimpleGrid>
			) : (
				// Collapsed: horizontal scroll
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
							gap: "var(--mantine-spacing-md)",
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
		</Stack>
	);
}
