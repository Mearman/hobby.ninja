import { Item, Manual } from "@hobby-ninja/data";
import { IconFileText, IconPackage } from "@tabler/icons-react";

/**
 * Check if an item has an associated manual
 * @param item - The product item to check
 * @returns true if the item has a manualId, false otherwise
 */
export function itemHasManual(item: Item): boolean {
	return Boolean(item.manualId);
}

/**
 * Check if a manual has an associated product
 * @param manual - The manual to check
 * @returns true if the manual has a productNumber, false otherwise
 */
export function manualHasProduct(manual: Manual): boolean {
	return Boolean(manual.productNumber);
}

/**
 * Get the icon component for manual relationship
 * @returns IconFileText component
 */
export function getManualRelationshipIcon() {
	return IconFileText;
}

/**
 * Get the icon component for product relationship
 * @returns IconPackage component
 */
export function getProductRelationshipIcon() {
	return IconPackage;
}