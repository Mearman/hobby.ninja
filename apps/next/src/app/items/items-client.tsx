"use client";

import type { Item } from "@hobby-ninja/data";

import { itemConfig } from "@/components/lists/configs";
import { GenericListPage } from "@/components/lists/generic-list-page";

interface ItemsClientProps {
	items: Item[];
	totalItems: number;
}

export function ItemsClient({ items, totalItems }: ItemsClientProps) {
	return (
		<GenericListPage
			items={items}
			totalItems={totalItems}
			config={itemConfig}
			pageTitle="All Items"
			subtitle={`Browse ${totalItems.toLocaleString()} items in our database`}
		/>
	);
}
