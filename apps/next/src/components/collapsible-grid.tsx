"use client";

import { Box, Group, SimpleGrid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

interface CollapsibleGridProps {
	title: string;
	children: React.ReactNode;
	collapsedChildren: React.ReactNode;
	totalCount: number;
	cols?: { base: number; sm: number; md: number; lg: number };
	initialCount?: number;
	/** Width of each card when in horizontal scroll mode */
	cardWidth?: number;
	/** Number of selected items (for filter mode) */
	selectedCount?: number;
}

export function CollapsibleGrid({
	title,
	children,
	collapsedChildren,
	totalCount,
	cols = { base: 1, sm: 2, md: 3, lg: 4 },
	initialCount = 4,
	cardWidth = 180,
	selectedCount = 0,
}: CollapsibleGridProps): React.ReactElement {
	const [opened, { toggle }] = useDisclosure(false);
	const hasMore = totalCount > initialCount;

	return (
		<Stack gap="lg">
			<UnstyledButton onClick={hasMore ? toggle : undefined} style={{ cursor: hasMore ? "pointer" : "default" }}>
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
					{hasMore && (
						<Group gap="xs" c="blue">
							<Text size="sm" fw={500}>
								{opened ? "Show less" : `Show all ${totalCount}`}
							</Text>
							{opened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
						</Group>
					)}
				</Group>
			</UnstyledButton>

			{opened ? (
				// Expanded: show all items in a grid
				<SimpleGrid cols={cols} spacing="md">
					{children}
					{collapsedChildren}
				</SimpleGrid>
			) : (
				// Collapsed: horizontal scroll with all items
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
						{/* Wrap each child in a fixed-width container */}
						{[children, collapsedChildren].flat().map((child, index) => (
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
