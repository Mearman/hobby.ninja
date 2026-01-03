"use client";

import {
	Anchor,
	Box,
	Drawer,
	Stack,
	Group,
	Title,
	Text,
	Divider,
	ActionIcon,
	ScrollArea,
	ThemeIcon,
	Tooltip,
	UnstyledButton,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
	IconArrowsDiagonal,
	IconArrowsDiagonalMinimize,
	IconDeviceDesktop,
	IconFilterDown,
	IconFilterUp,
	IconMoon,
	IconPin,
	IconPinFilled,
	IconSun,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarFilters } from "@/components/sidebar-filters";
import { headerActions } from "@/config/navigation";
import { useStickyFilters } from "@/contexts/sticky-filters-context";
import { isPathActive } from "@/lib/navigation-utils";
import { useThemeContext } from "@/providers/mantine-provider";
import { fadeIn } from "@/styles/components.css";

/** Sidebar width when pinned */
export const SIDEBAR_WIDTH = 300;

interface NavigationProps {
	opened: boolean;
	onClose: () => void;
}

const ARIA_LABELS = {
	CLOSE_MENU: "Close menu",
	PIN_SIDEBAR: "Pin sidebar",
	UNPIN_SIDEBAR: "Unpin sidebar",
} as const;

const NAVIGATION_ITEM_BASE_STYLES = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	borderRadius: "var(--mantine-radius-default)",
} as const;

// Theme-aware colors that work in both light and dark mode
const THEME_COLORS = {
	// Active item background - uses Mantine's built-in light variant
	ACTIVE_BG: "var(--mantine-color-blue-light)",
	// Active item text
	ACTIVE_TEXT: "var(--mantine-color-blue-light-color)",
	// Default text color
	TEXT: "var(--mantine-color-text)",
	// Dimmed text for inactive items
	DIMMED: "var(--mantine-color-dimmed)",
} as const;

/** Shared navigation content used in both drawer and pinned sidebar modes */
function NavigationContent({ onClose, isPinned, isDesktop }: { onClose: () => void; isPinned: boolean; isDesktop: boolean }) {
	const pathname = usePathname();
	const { colorScheme, cycleTheme, fullWidth, toggleFullWidth, sidebarPinned, toggleSidebarPinned } = useThemeContext();
	const stickyFilters = useStickyFilters();

	return (
		<>
			{/* Header */}
			<Stack p="md" gap="xs">
				<Group justify="space-between" align="center">
					<Title order={3}>Menu</Title>
					<Group gap={4}>
						{/* Pin button - only show on desktop */}
						{isDesktop && (
							<Tooltip label={sidebarPinned ? "Unpin sidebar" : "Pin sidebar"} position="bottom">
								<ActionIcon
									variant={sidebarPinned ? "filled" : "subtle"}
									color={sidebarPinned ? "blue" : "gray"}
									onClick={toggleSidebarPinned}
									aria-label={sidebarPinned ? ARIA_LABELS.UNPIN_SIDEBAR : ARIA_LABELS.PIN_SIDEBAR}
								>
									{sidebarPinned ? <IconPinFilled size={16} /> : <IconPin size={16} />}
								</ActionIcon>
							</Tooltip>
						)}
						{/* Close button - only show when not pinned */}
						{!isPinned && (
							<ActionIcon variant="subtle" onClick={onClose} aria-label={ARIA_LABELS.CLOSE_MENU}>
								<IconX size={16} />
							</ActionIcon>
						)}
					</Group>
				</Group>
			</Stack>

			<Divider />

			{/* Navigation */}
			<ScrollArea flex={1} offsetScrollbars={true} style={{ minHeight: 0 }}>
				{/* Actions */}
				<Stack p="md" gap="xs">
					{headerActions.map((action) => {
						// Skip path-restricted items if not on that path
						if (action.visibleOnPaths && !action.visibleOnPaths.some(p =>
							p === pathname || (p !== "/" && pathname.startsWith(p)),
						)) {
							return null;
						}

						// Determine icon and label based on action type
						let icon: React.ReactNode;
						let label = action.label;
						let onClick: (() => void) | undefined;
						const IconComponent = action.icon;

						switch (action.action) {
							case "theme": {
								icon = colorScheme === "light"
									? <IconSun size={16} />
									: colorScheme === "dark"
										? <IconMoon size={16} />
										: <IconDeviceDesktop size={16} />;
								label = colorScheme === "light"
									? "Switch to dark mode"
									: colorScheme === "dark"
										? "Switch to system mode"
										: "Switch to light mode";
								onClick = cycleTheme;
								break;
							}
							case "fullwidth": {
								icon = fullWidth
									? <IconArrowsDiagonalMinimize size={16} />
									: <IconArrowsDiagonal size={16} />;
								label = fullWidth ? "Use constrained width" : "Use full width";
								onClick = toggleFullWidth;
								break;
							}
							case "filter-toggle": {
								icon = stickyFilters.expanded
									? <IconFilterUp size={16} />
									: <IconFilterDown size={16} />;
								label = stickyFilters.expanded ? "Hide active filters" : "Show active filters";
								onClick = stickyFilters.toggleExpanded;
								break;
							}
							default: {
								icon = <IconComponent size={16} />;
							}
						}

						// Render as link or button
						if (action.href && !action.action) {
							const active = isPathActive(action.href, pathname);
							return (
								<UnstyledButton
									key={action.id}
									component={Link}
									href={action.href}
									w="100%"
									p="md"
									onClick={isPinned ? undefined : onClose}
									style={{
										...NAVIGATION_ITEM_BASE_STYLES,
										backgroundColor: active ? THEME_COLORS.ACTIVE_BG : "transparent",
										color: active ? THEME_COLORS.ACTIVE_TEXT : THEME_COLORS.TEXT,
										fontWeight: active ? 600 : 400,
									}}
								>
									<Group gap="sm">
										<ThemeIcon size="sm" variant="transparent" color={active ? "blue" : "gray"}>
											{icon}
										</ThemeIcon>
										<Text size="sm">{label}</Text>
									</Group>
								</UnstyledButton>
							);
						}

						return (
							<UnstyledButton
								key={action.id}
								w="100%"
								p="md"
								onClick={() => {
									onClick?.();
									// Don't close drawer for toggles so user can see the effect
								}}
								style={{
									...NAVIGATION_ITEM_BASE_STYLES,
									color: THEME_COLORS.TEXT,
								}}
							>
								<Group gap="sm">
									<ThemeIcon size="sm" variant="transparent" color="gray">
										{icon}
									</ThemeIcon>
									<Text size="sm">{label}</Text>
								</Group>
							</UnstyledButton>
						);
					})}
				</Stack>

				{/* Filters section - only on homepage */}
				{pathname === "/" && (
					<>
						<Divider />
						<SidebarFilters onClose={onClose} />
					</>
				)}
			</ScrollArea>

			{/* Legal footer */}
			<Divider />
			<Stack p="md" gap={0}>
				<Text size="xs" c="dimmed" ta="center">
					hobby.ninja is an unofficial fan reference. Not affiliated with BANDAI SPIRITS.
					All trademarks belong to their respective owners.{" "}
					<Anchor component={Link} href="/about" size="xs" onClick={isPinned ? undefined : onClose}>
						About
					</Anchor>
				</Text>
			</Stack>
		</>
	);
}

export function Navigation({ opened, onClose }: NavigationProps) {
	const { sidebarPinned } = useThemeContext();
	// Desktop breakpoint (lg = 992px) - use initialValue for SSR
	const isDesktop = useMediaQuery("(min-width: 992px)", false, { getInitialValueInEffect: false });
	const isPinned = isDesktop && sidebarPinned;

	// When pinned on desktop, render as fixed sidebar
	if (isPinned) {
		return (
			<Box
				component="aside"
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					width: SIDEBAR_WIDTH,
					height: "100vh",
					display: "flex",
					flexDirection: "column",
					backgroundColor: "var(--mantine-color-body)",
					borderRight: "1px solid var(--mantine-color-default-border)",
					zIndex: 100,
				}}
			>
				<NavigationContent onClose={onClose} isPinned={true} isDesktop={true} />
			</Box>
		);
	}

	// Otherwise, render as drawer
	return (
		<Drawer
			opened={opened}
			onClose={onClose}
			size={SIDEBAR_WIDTH}
			padding={0}
			withCloseButton={false}
			className={fadeIn}
			styles={{
				body: {
					display: "flex",
					flexDirection: "column",
					height: "100%",
				},
				content: {
					backgroundColor: "var(--mantine-color-body)",
				},
			}}
		>
			<NavigationContent onClose={onClose} isPinned={false} isDesktop={isDesktop} />
		</Drawer>
	);
}
