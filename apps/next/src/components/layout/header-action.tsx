"use client";

import { ActionIcon, Box, Tooltip } from "@mantine/core";
import {
	IconArrowsDiagonal,
	IconArrowsDiagonalMinimize,
	IconDeviceDesktop,
	IconFilterDown,
	IconFilterUp,
	IconMoon,
	IconSun,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/config/navigation";
import { useStickyFilters } from "@/contexts/sticky-filters-context";
import { UI } from "@/lib/constants";
import { isPathActive, priorityToBreakpoint, shouldShowOnPath } from "@/lib/navigation-utils";
import { useThemeContext } from "@/providers/mantine-provider";

interface HeaderActionProps {
	item: NavItem;
}

/**
 * Renders a single header action item.
 *
 * Handles different action types (theme, fullwidth, filter-toggle) and
 * regular link actions. Applies responsive visibility based on priority.
 */
export function HeaderAction({ item }: HeaderActionProps) {
	const pathname = usePathname();
	const { colorScheme, cycleTheme, fullWidth, toggleFullWidth } = useThemeContext();
	const stickyFilters = useStickyFilters();

	// Check if item should be visible on current path
	if (!shouldShowOnPath(item, pathname)) {
		return null;
	}

	const visibleFrom = priorityToBreakpoint(item.headerPriority);
	const isActive = item.href ? isPathActive(item.href, pathname) : false;

	// Determine icon and click handler based on action type
	const getActionContent = () => {
		switch (item.action) {
			case "theme": {
				const themeIcon = colorScheme === "light"
					? <IconSun size={UI.ICON_SIZE_LG} />
					: colorScheme === "dark"
						? <IconMoon size={UI.ICON_SIZE_LG} />
						: <IconDeviceDesktop size={UI.ICON_SIZE_LG} />;

				const themeLabel = colorScheme === "light"
					? "Switch to dark mode"
					: colorScheme === "dark"
						? "Switch to system mode"
						: "Switch to light mode";

				return {
					icon: themeIcon,
					onClick: cycleTheme,
					tooltip: themeLabel,
					ariaLabel: "Toggle theme",
				};
			}

			case "fullwidth": {
				const icon = fullWidth
					? <IconArrowsDiagonalMinimize size={UI.ICON_SIZE_LG} style={{ transform: "rotate(-45deg)" }} />
					: <IconArrowsDiagonal size={UI.ICON_SIZE_LG} style={{ transform: "rotate(45deg)" }} />;

				const tooltip = fullWidth ? "Use constrained width" : "Use full width";

				return {
					icon,
					onClick: toggleFullWidth,
					tooltip,
					ariaLabel: tooltip,
				};
			}

			case "filter-toggle": {
				const icon = stickyFilters.expanded
					? <IconFilterUp size={UI.ICON_SIZE_LG} />
					: <IconFilterDown size={UI.ICON_SIZE_LG} />;

				const tooltip = stickyFilters.expanded ? "Hide active filters" : "Show active filters";

				return {
					icon,
					onClick: stickyFilters.toggleExpanded,
					tooltip,
					ariaLabel: tooltip,
				};
			}

			default: {
				// Regular link action
				const IconComponent = item.icon;
				return {
					icon: <IconComponent size={UI.ICON_SIZE_LG} />,
					href: item.href,
					tooltip: item.tooltip ?? item.label,
					ariaLabel: item.label,
				};
			}
		}
	};

	const { icon, onClick, href, tooltip, ariaLabel } = getActionContent();

	// Wrapper box for responsive visibility
	const content = href ? (
		<Tooltip label={tooltip}>
			<ActionIcon
				size="lg"
				variant={isActive ? "filled" : "subtle"}
				color={isActive ? "blue" : undefined}
				component={Link}
				href={href}
				aria-label={ariaLabel}
			>
				{icon}
			</ActionIcon>
		</Tooltip>
	) : (
		<Tooltip label={tooltip}>
			<ActionIcon
				size="lg"
				variant="subtle"
				onClick={onClick}
				aria-label={ariaLabel}
			>
				{icon}
			</ActionIcon>
		</Tooltip>
	);

	// Apply responsive visibility
	if (visibleFrom) {
		return <Box visibleFrom={visibleFrom}>{content}</Box>;
	}

	return content;
}
