"use client";

import { ActionIcon, Box, Container, Group, TextInput, Tooltip } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
	IconDeviceDesktop,
	IconFilterDown,
	IconFilterUp,
	IconFolder,
	IconInfoCircle,
	IconMenu2,
	IconMoon,
	IconSearch,
	IconSun,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

import { useStickyFilters } from "@/contexts/sticky-filters-context";
import { TIMING, UI } from "@/lib/constants";
import { useThemeContext } from "@/providers/mantine-provider";
import { header, logo, nav, navLink } from "@/styles/components.css";

interface HeaderProps {
  onMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export function Header({ onMenuToggle, mobileMenuOpen = false }: HeaderProps) {
	const pathname = usePathname();
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearchQuery] = useDebouncedValue(searchQuery, TIMING.DEBOUNCE_DEFAULT);
	const { colorScheme, cycleTheme } = useThemeContext();
	const stickyFilters = useStickyFilters();

	// Show filter toggle on homepage (always visible)
	const showFilterToggle = pathname === "/";

	const getThemeIcon = (): React.ReactNode => {
		switch (colorScheme) {
			case "light": {
				return <IconSun size={UI.ICON_SIZE_LG} />;
			}
			case "dark": {
				return <IconMoon size={UI.ICON_SIZE_LG} />;
			}
			case "system": {
				return <IconDeviceDesktop size={UI.ICON_SIZE_LG} />;
			}
		}
	};

	const getThemeLabel = (): string => {
		switch (colorScheme) {
			case "light": {
				return "Switch to dark mode";
			}
			case "dark": {
				return "Switch to system mode";
			}
			case "system": {
				return "Switch to light mode";
			}
		}
	};

	// Handle search
	useEffect(() => {
		if (debouncedSearchQuery && debouncedSearchQuery.length >= 2) {
			// Navigate to search page with query
			const searchParams = new URLSearchParams({ q: debouncedSearchQuery });
			globalThis.location.href = `/search?${searchParams.toString()}`;
		}
	}, [debouncedSearchQuery]);

	const isActive = (path: string): boolean => {
		if (path === "/") return pathname === "/";
		return pathname.startsWith(path);
	};

	const navigationItems: Array<{ href: string; label: string }> = [];

	return (
		<header className={header}>
			<Container
				size="xl"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					height: 60,
				}}
			>
				{/* Logo */}
				<Group gap="lg" align="center">
					{/* Mobile menu toggle */}
					<ActionIcon
						size="lg"
						variant="subtle"
						onClick={onMenuToggle}
						hiddenFrom="lg"
						aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
					>
						{mobileMenuOpen ? <IconX size={UI.ICON_SIZE_LG} /> : <IconMenu2 size={UI.ICON_SIZE_LG} />}
					</ActionIcon>

					<Link href="/" className={logo}>
						hobby.ninja
					</Link>
					<Box
						component="a"
						href={`https://github.com/Mearman/hobby.ninja/releases/tag/v${process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.1"}`}
						target="_blank"
						rel="noopener noreferrer"
						c="dimmed"
						fz="xs"
						ml={4}
						style={{ textDecoration: "none" }}
					>
						v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.1"}
					</Box>

					{/* Desktop navigation */}
					<Box component="nav" className={nav} visibleFrom="lg">
						{navigationItems.map(({ href, label }) => (
							<Link
								key={href}
								href={href}
								className={navLink}
								data-active={isActive(href)}
							>
								{label}
							</Link>
						))}
					</Box>
				</Group>

				{/* Search and actions */}
				<Group gap="md" align="center">
					{/* Search bar */}
					<Box visibleFrom="lg" style={{ flex: 1, maxWidth: "400px" }}>
						<TextInput
							placeholder="Search items, brands, series..."
							leftSection={<IconSearch size={UI.ICON_SIZE_SM} />}
							value={searchQuery}
							onChange={(event) => { setSearchQuery(event.currentTarget.value); }}
							rightSection={
								searchQuery && (
									<ActionIcon
										size="sm"
										variant="subtle"
										onClick={() => { setSearchQuery(""); }}
									>
										<IconX size={UI.ICON_SIZE_XS} />
									</ActionIcon>
								)
							}
							styles={{
								input: {
									height: "36px",
								},
							}}
						/>
					</Box>

					{/* Sticky filters toggle - always visible on homepage */}
					{showFilterToggle && (
						<Tooltip label={stickyFilters.expanded ? "Hide active filters" : "Show active filters"}>
							<ActionIcon
								size="lg"
								variant="subtle"
								onClick={stickyFilters.toggleExpanded}
								aria-label={stickyFilters.expanded ? "Hide active filters" : "Show active filters"}
							>
								{stickyFilters.expanded ? <IconFilterUp size={UI.ICON_SIZE_LG} /> : <IconFilterDown size={UI.ICON_SIZE_LG} />}
							</ActionIcon>
						</Tooltip>
					)}

					{/* Mobile search button */}
					<ActionIcon
						size="lg"
						variant="subtle"
						onClick={() => globalThis.location.href = "/search"}
						hiddenFrom="lg"
						aria-label="Search"
					>
						<IconSearch size={UI.ICON_SIZE_LG} />
					</ActionIcon>

					{/* Collection badge - hidden on mobile, accessible via menu */}
					<Box visibleFrom="sm">
						<Tooltip label="View collections">
							<ActionIcon
								size="lg"
								variant={isActive("/collection") ? "filled" : "subtle"}
								color="blue"
								component={Link}
								href="/collection"
								aria-label="Collections"
							>
								<IconFolder size={UI.ICON_SIZE_LG} />
							</ActionIcon>
						</Tooltip>
					</Box>

					{/* About - hidden on mobile, accessible via menu */}
					<Box visibleFrom="sm">
						<Tooltip label="About hobby.ninja">
							<ActionIcon
								size="lg"
								variant={isActive("/about") ? "filled" : "subtle"}
								component={Link}
								href="/about"
								aria-label="About"
							>
								<IconInfoCircle size={UI.ICON_SIZE_LG} />
							</ActionIcon>
						</Tooltip>
					</Box>

					{/* Theme toggle */}
					<Tooltip label={getThemeLabel()}>
						<ActionIcon
							size="lg"
							variant="subtle"
							onClick={cycleTheme}
							aria-label="Toggle theme"
						>
							{getThemeIcon()}
						</ActionIcon>
					</Tooltip>

				</Group>
			</Container>
		</header>
	);
}