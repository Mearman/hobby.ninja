"use client";

import { ActionIcon, Box, Container, Group, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
	IconMenu2,
	IconSearch,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

import { HeaderAction } from "./header-action";

import { headerActions, primaryNavItems } from "@/config/navigation";
import { TIMING, UI } from "@/lib/constants";
import { filterItemsByPath, isPathActive } from "@/lib/navigation-utils";
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
	const { fullWidth } = useThemeContext();

	// Filter header actions based on current path
	const visibleActions = filterItemsByPath(headerActions, pathname);

	// Handle search
	useEffect(() => {
		if (debouncedSearchQuery && debouncedSearchQuery.length >= 2) {
			const searchParams = new URLSearchParams({ q: debouncedSearchQuery });
			globalThis.location.href = `/search?${searchParams.toString()}`;
		}
	}, [debouncedSearchQuery]);

	// Desktop navigation items (from primaryNavItems that have headerPriority)
	const desktopNavItems = primaryNavItems.filter(item => item.headerPriority !== undefined);

	return (
		<header className={header}>
			<Container
				size={fullWidth ? "100%" : "xl"}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					height: 60,
				}}
			>
				{/* Logo and navigation */}
				<Group gap="lg" align="center">
					{/* Menu toggle - always visible */}
					<ActionIcon
						size="lg"
						variant="subtle"
						onClick={onMenuToggle}
						aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
					>
						{mobileMenuOpen ? <IconX size={UI.ICON_SIZE_LG} /> : <IconMenu2 size={UI.ICON_SIZE_LG} />}
					</ActionIcon>

					<Link href="/" className={logo}>
						hobby.ninja
					</Link>

					{/* Version - hidden on mobile */}
					<Box
						component="a"
						href={`https://github.com/Mearman/hobby.ninja/releases/tag/v${process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.1"}`}
						target="_blank"
						rel="noopener noreferrer"
						c="dimmed"
						fz="xs"
						ml={4}
						style={{ textDecoration: "none" }}
						visibleFrom="sm"
					>
						v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.1"}
					</Box>

					{/* Desktop navigation links */}
					<Box component="nav" className={nav} visibleFrom="lg">
						{desktopNavItems.map(({ id, href, label }) => href && (
							<Link
								key={id}
								href={href}
								className={navLink}
								data-active={isPathActive(href, pathname)}
							>
								{label}
							</Link>
						))}
					</Box>
				</Group>

				{/* Search and actions */}
				<Group gap="md" align="center">
					{/* Search bar - desktop only */}
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

					{/* Header actions from config */}
					{visibleActions.map(action => (
						<HeaderAction key={action.id} item={action} />
					))}
				</Group>
			</Container>
		</header>
	);
}
