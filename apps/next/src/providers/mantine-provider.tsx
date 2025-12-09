"use client";

import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import React, { createContext, useContext } from "react";

import { Z_INDEX, UI } from "../lib/constants";
import { theme } from "../lib/theme";

// Create context for theme functions
const ThemeContext = createContext<{
	colorScheme: "light" | "dark" | "system";
	effectiveColorScheme: "light" | "dark";
	cycleTheme: () => void;
		} | null>(null);

interface MantineThemeProviderProps {
	children: React.ReactNode;
}

// Hook to access theme context
export function useThemeContext() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useThemeContext must be used within MantineThemeProvider");
	}
	return context;
}

// Simple theme hook for Next.js (static build)
function useTheme() {
	// Initialize with system preference but allow client-side switching
	const [colorScheme, setColorScheme] = React.useState<"light" | "dark" | "system">("system");
	const [mounted, setMounted] = React.useState(false);

	// Mark when component is mounted on client
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const getEffectiveColorScheme = (): "light" | "dark" => {
		if (!mounted) return "light"; // Default for SSR

		if (colorScheme === "system") {
			return globalThis.window?.matchMedia?.("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";
		}
		return colorScheme;
	};

	const cycleTheme = () => {
		setColorScheme(prev => {
			if (prev === "light") return "dark";
			if (prev === "dark") return "system";
			return "light";
		});
	};

	// Listen for system preference changes when in "system" mode
	React.useEffect(() => {
		if (!mounted || colorScheme !== "system") return;

		const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			// Force re-render when system preference changes
			setColorScheme(prev => prev);
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => { mediaQuery.removeEventListener("change", handleChange); };
	}, [mounted, colorScheme]);

	return {
		colorScheme,
		effectiveColorScheme: getEffectiveColorScheme(),
		cycleTheme,
	};
}

export function MantineThemeProvider({ children }: MantineThemeProviderProps) {
	const { colorScheme, effectiveColorScheme, cycleTheme } = useTheme();

	return (
		<ThemeContext.Provider value={{ colorScheme, effectiveColorScheme, cycleTheme }}>
			<MantineProvider
				theme={theme}
				defaultColorScheme={effectiveColorScheme}
				forceColorScheme={effectiveColorScheme}
			>
				<ModalsProvider>
					<Notifications
						position="top-right"
						limit={5}
						zIndex={Z_INDEX.MODAL}
						containerWidth={UI.CONTAINER_WIDTH}
					/>
					{children}
				</ModalsProvider>
			</MantineProvider>
		</ThemeContext.Provider>
	);
}