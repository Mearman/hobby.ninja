import { ActionIcon } from "@mantine/core";
import { IconFileText, IconPackage } from "@tabler/icons-react";

interface RelationshipBadgeProps {
  type: "manual" | "product";
  size?: "xs" | "sm";
  viewMode?: "grid" | "list" | "table";
}

/**
 * A small icon badge indicating relationship between products and manuals
 *
 * @param type - The type of relationship to indicate
 * @param size - The size of the badge (xs or sm)
 * @param viewMode - The view mode for appropriate sizing
 */
export function RelationshipBadge({
	type,
	size = "xs",
	viewMode = "grid",
}: RelationshipBadgeProps) {
	const Icon = type === "manual" ? IconFileText : IconPackage;
	const color = type === "manual" ? "blue" : "green";
	const sizeMap = { grid: 16, list: 18, table: 14 };
	const iconSize = sizeMap[viewMode];

	const ariaLabel = type === "manual"
		? "Has manual available"
		: "Has associated product";

	return (
		<ActionIcon
			variant="light"
			color={color}
			size={size}
			aria-label={ariaLabel}
			title={ariaLabel}
		>
			<Icon size={iconSize} />
		</ActionIcon>
	);
}