"use client";

import {
	Group,
	ActionIcon,
	Burger,
	TextInput,
	Badge,
	Tooltip,
	Box,
	Container,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
	IconSearch,
	IconDatabase,
	IconAdjustmentsHorizontal,
	IconHome,
	IconMenu2,
	IconX,
	IconFolder,
	IconSun,
	IconMoon,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { rem } from "@mantine/core";

import { header, headerContent, logo, nav, navLink, mobileOnly, desktopOnly } from "@/styles/components.css";
import { useThemeContext } from "@/providers/mantine-provider";
import { UI, TIMING } from "@/lib/constants";

interface HeaderProps {
  onMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export function Header({ onMenuToggle, mobileMenuOpen = false }: HeaderProps) {
	const pathname = usePathname();
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearchQuery] = useDebouncedValue(searchQuery, TIMING.DEBOUNCE_DEFAULT);
	const { effectiveColorScheme, cycleTheme } = useThemeContext();

	const getThemeIcon = () => {
		switch (effectiveColorScheme) {
			case "light":
				return <IconSun style={{ width: rem(UI.ICON_SIZE_SM), height: rem(UI.ICON_SIZE_SM) }} />;
			case "dark":
				return <IconMoon style={{ width: rem(UI.ICON_SIZE_SM), height: rem(UI.ICON_SIZE_SM) }} />;
			default:
				return <IconSun style={{ width: rem(UI.ICON_SIZE_SM), height: rem(UI.ICON_SIZE_SM) }} />;
		}
	};

	const getThemeLabel = () => {
		switch (effectiveColorScheme) {
			case "light":
				return "Switch to dark mode";
			case "dark":
				return "Switch to system mode";
			default:
				return "Switch to light mode";
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

	const navigationItems = [
		{ href: "/", label: "Home", icon: IconHome },
		{ href: "/database", label: "Database", icon: IconDatabase },
		{ href: "/collection", label: "Collection", icon: IconFolder },
		{ href: "/search", label: "Search", icon: IconSearch },
	];

	return (
		<header className={header}>
			<div className={headerContent}>
				{/* Logo */}
				<Group gap="lg" align="center">
					{/* Mobile menu toggle */}
					<ActionIcon
						size="lg"
						variant="subtle"
						onClick={onMenuToggle}
						className={mobileOnly}
						aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
					>
						{mobileMenuOpen ? <IconX size={UI.ICON_SIZE_LG} /> : <IconMenu2 size={UI.ICON_SIZE_LG} />}
					</ActionIcon>

					<Link href="/" className={logo}>
            hobby.ninja
					</Link>

					{/* Desktop navigation */}
					<nav className={`${nav} ${desktopOnly}`}>
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
					</nav>
				</Group>

				{/* Search and actions */}
				<Group gap="md" align="center">
					{/* Search bar */}
					<Box className={desktopOnly} style={{ flex: 1, maxWidth: "400px" }}>
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

					{/* Mobile search button */}
					<ActionIcon
						size="lg"
						variant="subtle"
						onClick={() => globalThis.location.href = "/search"}
						className={mobileOnly}
						aria-label="Search"
					>
						<IconSearch size={UI.ICON_SIZE_LG} />
					</ActionIcon>

					{/* Collection badge */}
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

					{/* Mobile menu badge (for new items/updates) */}
					<div className={mobileOnly}>
						<Badge size="sm" color="blue" variant="light">
              New
						</Badge>
					</div>
				</Group>
			</div>
		</header>
	);
}

export default Header;