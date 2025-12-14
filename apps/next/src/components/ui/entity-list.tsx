"use client";

import {
	getBrandById,
	getCategoryById,
	getNodeDisplayName,
	getSeriesById,
} from "@hobby-ninja/data";
import { Anchor, Badge, Group, Text } from "@mantine/core";
import Link from "next/link";
import { Fragment } from "react";


export type DisplayMode = "text" | "links" | "badges";
export type EntityType = "series" | "brand" | "category";

interface EntityListProps {
	ids: string[];
	entityType: EntityType;
	mode?: DisplayMode;
	size?: "xs" | "sm" | "md";
	emptyText?: string;
	/** Set to false when inside a parent link to avoid nested anchors */
	clickable?: boolean;
}

const routeMap: Record<EntityType, (id: string) => string> = {
	series: (id) => `/series/${id}`,
	brand: (id) => `/brand/${id}`,
	category: (id) => `/category/${id}`,
};

const colorMap: Record<EntityType, string> = {
	series: "violet",
	brand: "blue",
	category: "gray",
};

function getDisplayName(id: string, entityType: EntityType): string {
	let entity;
	switch (entityType) {
		case "series": {
			entity = getSeriesById(id);
			break;
		}
		case "brand": {
			entity = getBrandById(id);
			break;
		}
		case "category": {
			entity = getCategoryById(id);
			break;
		}
	}
	if (!entity) return id;
	return getNodeDisplayName(entity);
}

export function EntityList({
	ids,
	entityType,
	mode = "badges",
	size = "sm",
	emptyText = "-",
	clickable = true,
}: EntityListProps) {
	if (ids.length === 0) {
		return <Text component="span" size={size} c="dimmed">{emptyText}</Text>;
	}

	const getRoute = routeMap[entityType];
	const color = colorMap[entityType];

	// Text mode - plain comma-separated text
	if (mode === "text") {
		const names = ids.map((id) => getDisplayName(id, entityType));
		return <Text component="span" size={size} c="dimmed">{names.join(", ")}</Text>;
	}

	// Links mode - comma-separated clickable links
	if (mode === "links") {
		return (
			<Text component="span" size={size}>
				{ids.map((id, index) => (
					<Fragment key={id}>
						{clickable ? (
							<Anchor component={Link} href={getRoute(id)} size={size}>
								{getDisplayName(id, entityType)}
							</Anchor>
						) : (
							<Text component="span" size={size}>
								{getDisplayName(id, entityType)}
							</Text>
						)}
						{index < ids.length - 1 && ", "}
					</Fragment>
				))}
			</Text>
		);
	}

	// Badges mode - clickable badge components
	return (
		<Group gap={4} wrap="wrap">
			{ids.map((id) => {
				const displayName = getDisplayName(id, entityType);
				const entity = entityType === "brand" ? getBrandById(id) :
							   entityType === "series" ? getSeriesById(id) : null;
				const entityImage = entity?.image;
				const leftSection = entityImage ? (
					<img
						src={entityImage}
						alt=""
						style={{ width: 14, height: 14, objectFit: "contain" }}
					/>
				) : undefined;

				if (clickable) {
					return (
						<Badge
							key={id}
							component={Link}
							href={getRoute(id)}
							size={size}
							variant="light"
							color={color}
							leftSection={leftSection}
							style={{ cursor: "pointer" }}
						>
							{displayName}
						</Badge>
					);
				}

				return (
					<Badge
						key={id}
						size={size}
						variant="light"
						color={color}
						leftSection={leftSection}
					>
						{displayName}
					</Badge>
				);
			})}
		</Group>
	);
}
