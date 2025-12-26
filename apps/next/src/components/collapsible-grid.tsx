"use client";

import { Collapse, Group, SimpleGrid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

interface CollapsibleGridProps {
	title: string;
	children: React.ReactNode;
	collapsedChildren: React.ReactNode;
	totalCount: number;
	cols?: { base: number; sm: number; md: number; lg: number };
	initialCount?: number;
}

export function CollapsibleGrid({
	title,
	children,
	collapsedChildren,
	totalCount,
	cols = { base: 1, sm: 2, md: 3, lg: 4 },
	initialCount = 4,
}: CollapsibleGridProps): React.ReactElement {
	const [opened, { toggle }] = useDisclosure(false);
	const hasMore = totalCount > initialCount;

	return (
		<Stack gap="lg">
			<UnstyledButton onClick={hasMore ? toggle : undefined} style={{ cursor: hasMore ? "pointer" : "default" }}>
				<Group justify="space-between" align="center">
					<Title order={2} size="h2" fw={600}>
						{title}
					</Title>
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

			<SimpleGrid cols={cols} spacing="md">
				{children}
			</SimpleGrid>

			{hasMore && (
				<Collapse in={opened}>
					<SimpleGrid cols={cols} spacing="md">
						{collapsedChildren}
					</SimpleGrid>
				</Collapse>
			)}
		</Stack>
	);
}
