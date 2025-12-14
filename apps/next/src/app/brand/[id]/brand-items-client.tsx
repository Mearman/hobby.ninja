"use client";

import type { Item } from "@hobby-ninja/data";
import { Breadcrumbs, Anchor, Group } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";

import { itemConfig } from "@/components/lists/configs";
import { GenericListPage } from "@/components/lists/generic-list-page";

interface BrandItemsClientProps {
	items: Item[];
	brandName: string;
	totalItems: number;
}

export function BrandItemsClient({ items, brandName, totalItems }: BrandItemsClientProps) {
	return (
		<GenericListPage
			items={items}
			totalItems={totalItems}
			config={itemConfig}
			pageTitle={`${brandName} Items`}
			subtitle={`Browse ${totalItems.toLocaleString()} items from ${brandName}`}
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
					<Anchor href="/brands" size="sm">
						Brands
					</Anchor>
					<Anchor size="sm" fw={500}>
						{brandName}
					</Anchor>
				</Breadcrumbs>
			}
		/>
	);
}
