import { ActionIcon } from "@mantine/core";
import { IconFileText, IconPackage, IconWorld } from "@tabler/icons-react";

interface RelationshipBadgeProps {
  type: "manual" | "product" | "globalSite";
  size?: "xs" | "sm";
  viewMode?: "grid" | "list" | "table";
}

const badgeConfig = {
	manual: { Icon: IconFileText, color: "blue", label: "Has manual available" },
	product: { Icon: IconPackage, color: "green", label: "Has associated product" },
	globalSite: { Icon: IconWorld, color: "teal", label: "Has global site link" },
} as const;

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
	const { Icon, color, label } = badgeConfig[type];
	const sizeMap = { grid: 16, list: 18, table: 14 };
	const iconSize = sizeMap[viewMode];

	return (
		<ActionIcon
			variant="light"
			color={color}
			size={size}
			aria-label={label}
			title={label}
		>
			<Icon size={iconSize} />
		</ActionIcon>
	);
}