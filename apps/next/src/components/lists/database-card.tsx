"use client";

import { isItem, type Item, type Manual } from "@hobby-ninja/data";

import { ItemCard } from "./item-card";
import { ManualCard } from "./manual-card";
import type { ViewMode } from "./types";

interface DatabaseCardProps {
	item: Item | Manual;
	viewMode: ViewMode;
}

/**
 * Card component for database entries that can be either Items or Manuals.
 * Delegates to ItemCard or ManualCard based on the entry type.
 */
export function DatabaseCard({ item, viewMode }: DatabaseCardProps) {
	// Use type guard to determine which card component to render
	if (isItem(item)) {
		return <ItemCard item={item} viewMode={viewMode} />;
	}

	return <ManualCard item={item} viewMode={viewMode} />;
}
