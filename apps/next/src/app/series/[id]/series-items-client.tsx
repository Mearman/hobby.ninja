"use client";

import type { Item } from "@hobby-ninja/data";
import { Breadcrumbs, Anchor, Group } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";

import { itemConfig } from "@/components/lists/configs";
import { GenericListPage } from "@/components/lists/generic-list-page";

interface SeriesItemsClientProps {
	items: Item[];
	seriesName: string;
	totalItems: number;
}

export function SeriesItemsClient({ items, seriesName, totalItems }: SeriesItemsClientProps) {
	return (
		<GenericListPage
			items={items}
			totalItems={totalItems}
			config={itemConfig}
			pageTitle={`${seriesName} Items`}
			subtitle={`Browse ${totalItems.toLocaleString()} items from ${seriesName}`}
			breadcrumbs={
				<Breadcrumbs>
					<Anchor href="/" size="sm">
						<Group gap={4}>
							<IconHome size={14} />
							Home
						</Group>
					</Anchor>
					<Anchor href="/database" size="sm">
						Database
					</Anchor>
					<Anchor href="/series" size="sm">
						Series
					</Anchor>
					<Anchor size="sm" fw={500}>
						{seriesName}
					</Anchor>
				</Breadcrumbs>
			}
		/>
	);
}
