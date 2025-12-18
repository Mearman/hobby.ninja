"use client";

import type { Item } from "@hobby-ninja/data";
import { Breadcrumbs, Anchor, Group } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";

import { itemConfig } from "@/components/lists/configs";
import { GenericListPage } from "@/components/lists/generic-list-page";

interface TagItemsClientProps {
	items: Item[];
	tagName: string;
	totalItems: number;
}

export function TagItemsClient({ items, tagName, totalItems }: TagItemsClientProps) {
	return (
		<GenericListPage
			items={items}
			totalItems={totalItems}
			config={itemConfig}
			pageTitle={`${tagName} Items`}
			subtitle={`Browse ${totalItems.toLocaleString()} ${tagName} items`}
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
					<Anchor href="/tags" size="sm">
						Tags
					</Anchor>
					<Anchor size="sm" fw={500}>
						{tagName}
					</Anchor>
				</Breadcrumbs>
			}
		/>
	);
}
