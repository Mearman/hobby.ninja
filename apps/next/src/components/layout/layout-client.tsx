"use client";

import { useState } from "react";

import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { PWAInstall } from "@/components/pwa/pwa-install";
import { MantineThemeProvider } from "@/providers/mantine-provider";
import { CollectionProvider } from "@/contexts/collection-context";
import { appShell, mainContent } from "@/styles/components.css";

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
			<CollectionProvider>
				<div className={appShell}>
				<Header
					onMenuToggle={handleMenuToggle}
					mobileMenuOpen={mobileMenuOpen}
				/>
				<Navigation
					opened={mobileMenuOpen}
					onClose={() => { setMobileMenuOpen(false); }}
				/>
				<main className={mainContent}>
					{children}
				</main>
				</div>
				<PWAInstall />
			</CollectionProvider>
		</MantineThemeProvider>
	);
}