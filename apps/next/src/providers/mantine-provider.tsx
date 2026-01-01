"use client";

import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import React, { createContext, useContext } from "react";

import { Z_INDEX, UI } from "../lib/constants";
import { theme } from "../lib/theme";

// LocalStorage keys for preferences
const STORAGE_KEY_COLOR_SCHEME = "hobby-ninja-color-scheme";
const STORAGE_KEY_FULL_WIDTH = "hobby-ninja-full-width";

// Theme context value type
export interface ThemeContextValue {
	colorScheme: "light" | "dark" | "system";
	effectiveColorScheme: "light" | "dark";
	cycleTheme: () => void;
	fullWidth: boolean;
	toggleFullWidth: () => void;
}

// Create context for theme functions (exported for Storybook)
export const ThemeContext = createContext<ThemeContextValue | null>(null);

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
	const [fullWidth, setFullWidth] = React.useState(false);
	const [mounted, setMounted] = React.useState(false);

	// Mark when component is mounted on client and restore preferences
	React.useEffect(() => {
		setMounted(true);
		// Restore preferences from localStorage
		const savedColorScheme = localStorage.getItem(STORAGE_KEY_COLOR_SCHEME);
		if (savedColorScheme === "light" || savedColorScheme === "dark" || savedColorScheme === "system") {
			setColorScheme(savedColorScheme);
		}
		const savedFullWidth = localStorage.getItem(STORAGE_KEY_FULL_WIDTH);
		if (savedFullWidth === "true") {
			setFullWidth(true);
		}
	}, []);

	// Persist color scheme to localStorage
	React.useEffect(() => {
		if (mounted) {
			localStorage.setItem(STORAGE_KEY_COLOR_SCHEME, colorScheme);
		}
	}, [mounted, colorScheme]);

	// Persist full width preference to localStorage
	React.useEffect(() => {
		if (mounted) {
			localStorage.setItem(STORAGE_KEY_FULL_WIDTH, String(fullWidth));
		}
	}, [mounted, fullWidth]);

	const getEffectiveColorScheme = (): "light" | "dark" => {
		if (!mounted) return "light"; // Default for SSR

		if (colorScheme === "system") {
			return globalThis.window.matchMedia("(prefers-color-scheme: dark)").matches
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

	const toggleFullWidth = () => {
		setFullWidth(prev => !prev);
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
		fullWidth,
		toggleFullWidth,
	};
}

export function MantineThemeProvider({ children }: MantineThemeProviderProps) {
	const { colorScheme, effectiveColorScheme, cycleTheme, fullWidth, toggleFullWidth } = useTheme();

	return (
		<ThemeContext.Provider value={{ colorScheme, effectiveColorScheme, cycleTheme, fullWidth, toggleFullWidth }}>
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