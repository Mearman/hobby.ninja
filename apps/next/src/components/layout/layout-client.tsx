"use client";

import { useMediaQuery } from "@mantine/hooks";
import { Suspense, useState } from "react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { PWAInstall } from "@/components/pwa/pwa-install";
import { SearchProvider } from "@/components/search/search-provider";
import { CollectionProvider } from "@/contexts/collection-context";
import { FilterProvider } from "@/contexts/filter-context";
import { StickyFiltersProvider } from "@/contexts/sticky-filters-context";
import { MantineThemeProvider, useThemeContext } from "@/providers/mantine-provider";
// Import the placeholder Vanilla Extract file for static export compatibility
import { appShell, mainContent } from "@/styles/components.css";
import "@/styles/components-placeholder.css";

interface LayoutClientProps {
  children: React.ReactNode;
}

/** Inner layout that has access to theme context */
function LayoutInner({ children }: LayoutClientProps) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const { sidebarPinned, sidebarWidth } = useThemeContext();
	// Desktop breakpoint (lg = 992px) - use default behavior for reliability
	const isDesktopQuery = useMediaQuery("(min-width: 992px)");
	const isDesktop = isDesktopQuery;
	const isPinned = isDesktop && sidebarPinned;

	const handleMenuToggle = () => {
		setMobileMenuOpen(!mobileMenuOpen);
	};

	return (
		<>
			<div
				className={appShell}
				style={{
					display: "flex",
					flexDirection: "column",
					minHeight: "100vh",
					marginLeft: isPinned ? sidebarWidth : 0,
					transition: "margin-left 0.2s ease",
				}}
			>
				<Header
					onMenuToggle={handleMenuToggle}
					mobileMenuOpen={mobileMenuOpen}
				/>
				<main className={mainContent} style={{ flex: 1 }}>
					{children}
				</main>
				<Footer />
			</div>
			<Navigation
				opened={mobileMenuOpen}
				onClose={() => { setMobileMenuOpen(false); }}
			/>
			<PWAInstall />
		</>
	);
}

export function LayoutClient({ children }: LayoutClientProps) {
	return (
		<MantineThemeProvider>
			<SearchProvider>
				<CollectionProvider>
					<Suspense fallback={null}>
						<FilterProvider>
							<StickyFiltersProvider>
								<LayoutInner>{children}</LayoutInner>
							</StickyFiltersProvider>
						</FilterProvider>
					</Suspense>
				</CollectionProvider>
			</SearchProvider>
		</MantineThemeProvider>
	);
}