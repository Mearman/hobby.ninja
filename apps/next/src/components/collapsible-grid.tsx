"use client";

import { Button, Collapse, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useState } from "react";

interface CollapsibleGridProps {
	title: string;
	children: React.ReactNode;
	collapsedChildren: React.ReactNode;
	totalCount: number;
	cols?: { base: number; sm: number; md: number; lg: number };
}

export function CollapsibleGrid({
	title,
	children,
	collapsedChildren,
	totalCount,
	cols = { base: 1, sm: 2, md: 3, lg: 4 },
}: CollapsibleGridProps): React.ReactElement {
	const [expanded, setExpanded] = useState(false);

	const hasMore = totalCount > 4;

	return (
		<Stack gap="lg">
			<Group justify="space-between" align="center">
				<Title order={2} size="h2" fw={600}>
					{title}
				</Title>
				{hasMore && (
					<Button
						variant="subtle"
						size="sm"
						rightSection={expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
						onClick={() => { setExpanded(!expanded); }}
					>
						{expanded ? "Show less" : `Show all ${totalCount}`}
					</Button>
				)}
			</Group>

			<SimpleGrid cols={cols} spacing="md">
				{children}
			</SimpleGrid>

			{hasMore && (
				<Collapse in={expanded}>
					<SimpleGrid cols={cols} spacing="md">
						{collapsedChildren}
					</SimpleGrid>
				</Collapse>
			)}
		</Stack>
	);
}
