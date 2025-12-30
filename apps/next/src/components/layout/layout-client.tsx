"use client";

import { useState } from "react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { PWAInstall } from "@/components/pwa/pwa-install";
import { SearchProvider } from "@/components/search/search-provider";
import { CollectionProvider } from "@/contexts/collection-context";
import { StickyFiltersProvider } from "@/contexts/sticky-filters-context";
import { MantineThemeProvider } from "@/providers/mantine-provider";
// Import the placeholder Vanilla Extract file for static export compatibility
import { appShell, mainContent } from "@/styles/components.css";
import "@/styles/components-placeholder.css";

interface LayoutClientProps {
  children: React.ReactNode;
}

export function LayoutClient({ children }: LayoutClientProps) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const handleMenuToggle = () => {
		setMobileMenuOpen(!mobileMenuOpen);
	};

	return (
		<MantineThemeProvider>
			<SearchProvider>
				<CollectionProvider>
					<StickyFiltersProvider>
						<div className={appShell} style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
							<Header
								onMenuToggle={handleMenuToggle}
								mobileMenuOpen={mobileMenuOpen}
							/>
							<Navigation
								opened={mobileMenuOpen}
								onClose={() => { setMobileMenuOpen(false); }}
							/>
							<main className={mainContent} style={{ flex: 1 }}>
								{children}
							</main>
							<Footer />
						</div>
						<PWAInstall />
					</StickyFiltersProvider>
				</CollectionProvider>
			</SearchProvider>
		</MantineThemeProvider>
	);
}