"use client";

import type { Item } from "@hobby-ninja/data";
import { Breadcrumbs, Anchor, Group } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";

import { itemConfig } from "@/components/lists/configs";
import { GenericListPage } from "@/components/lists/generic-list-page";

interface GradeItemsClientProps {
	items: Item[];
	gradeName: string;
	totalItems: number;
}

export function GradeItemsClient({ items, gradeName, totalItems }: GradeItemsClientProps) {
	return (
		<GenericListPage
			items={items}
			totalItems={totalItems}
			config={itemConfig}
			pageTitle={`${gradeName} Items`}
			subtitle={`Browse ${totalItems.toLocaleString()} ${gradeName} items`}
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
					<Anchor href="/grades" size="sm">
						Grades
					</Anchor>
					<Anchor size="sm" fw={500}>
						{gradeName}
					</Anchor>
				</Breadcrumbs>
			}
		/>
	);
}
