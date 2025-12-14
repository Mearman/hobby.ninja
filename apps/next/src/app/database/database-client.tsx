"use client";

import type { Item, Manual } from "@hobby-ninja/data";
import { Card, Group, Stack, Text } from "@mantine/core";
import Link from "next/link";
import { useMemo } from "react";

import { databaseConfig } from "@/components/lists/configs";
import { GenericListPage } from "@/components/lists/generic-list-page";

interface DatabaseClientProps {
	items: Item[];
	manuals: Manual[];
	totalItems: number;
	totalManuals: number;
}

export function DatabaseClient({ items, manuals, totalItems, totalManuals }: DatabaseClientProps) {
	// Combine items and manuals into unified array for GenericListPage
	const combinedData = useMemo((): Array<Item | Manual> => {
		const combined: Array<Item | Manual> = [];
		for (const item of items) {
			combined.push(item);
		}
		for (const manual of manuals) {
			combined.push(manual);
		}
		return combined;
	}, [items, manuals]);

	return (
		<GenericListPage
			items={combinedData}
			totalItems={totalItems + totalManuals}
			config={databaseConfig}
			pageTitle="Database"
			subtitle={`Browse ${(totalItems + totalManuals).toLocaleString()} items and manuals`}
			headerContent={
				<Card p="xl" radius="md" withBorder={true}>
					<Group justify="center" gap="3rem">
						<Stack align="center" gap="xs">
							<Text size="2rem" fw="bold" c="blue.6">
								{totalItems.toLocaleString()}
							</Text>
							<Text size="sm" c="dimmed">
								<Link href="/items" style={{ color: "inherit", textDecoration: "none" }}>
									Items
								</Link>
							</Text>
						</Stack>
						<Stack align="center" gap="xs">
							<Text size="2rem" fw="bold" c="green.6">
								{totalManuals.toLocaleString()}
							</Text>
							<Text size="sm" c="dimmed">
								<Link href="/manuals" style={{ color: "inherit", textDecoration: "none" }}>
									Manuals
								</Link>
							</Text>
						</Stack>
					</Group>
					<Text size="sm" c="dimmed" ta="center" mt="md">
						Click on Items or Manuals above to browse them separately
					</Text>
				</Card>
			}
		/>
	);
}
