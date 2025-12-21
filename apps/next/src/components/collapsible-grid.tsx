"use client";

import { Accordion, Group, SimpleGrid, Stack, Title } from "@mantine/core";

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
	const hasMore = totalCount > 4;

	return (
		<Stack gap="lg">
			<Group justify="space-between" align="center">
				<Title order={2} size="h2" fw={600}>
					{title}
				</Title>
			</Group>

			<SimpleGrid cols={cols} spacing="md">
				{children}
			</SimpleGrid>

			{hasMore && (
				<Accordion variant="default" chevronPosition="left">
					<Accordion.Item value="more" style={{ border: "none" }}>
						<Accordion.Control>
							Show all {totalCount} {title.toLowerCase()}
						</Accordion.Control>
						<Accordion.Panel>
							<SimpleGrid cols={cols} spacing="md">
								{collapsedChildren}
							</SimpleGrid>
						</Accordion.Panel>
					</Accordion.Item>
				</Accordion>
			)}
		</Stack>
	);
}
