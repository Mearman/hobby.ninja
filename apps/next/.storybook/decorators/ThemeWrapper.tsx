import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import type { Decorator } from "@storybook/react";
import React, { useMemo, useState } from "react";

import { theme } from "../../src/lib/theme";
import { ThemeContext, type ThemeContextValue } from "../../src/providers/mantine-provider";

type ColorScheme = "light" | "dark" | "system";

/**
 * Decorator that wraps stories with MantineProvider and theme support.
 * Reads the theme from Storybook's globals (set via toolbar).
 * Provides the same ThemeContext as MantineThemeProvider for component compatibility.
 */
export const ThemeWrapper: Decorator = (Story, context) => {
	const storybookTheme = (context.globals.theme as ColorScheme) || "light";
	const [fullWidth, setFullWidth] = useState(false);

	// Determine effective color scheme
	const effectiveColorScheme = useMemo(() => {
		if (storybookTheme === "system") {
			return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";
		}
		return storybookTheme;
	}, [storybookTheme]);

	// Create context value matching MantineThemeProvider
	const themeContextValue = useMemo<ThemeContextValue>(() => ({
		colorScheme: storybookTheme,
		effectiveColorScheme,
		cycleTheme: () => {
			// In Storybook, theme is controlled via toolbar, so this is a no-op
			console.log("Theme cycling is controlled via Storybook toolbar");
		},
		fullWidth,
		toggleFullWidth: () => { setFullWidth(prev => !prev); },
	}), [storybookTheme, effectiveColorScheme, fullWidth]);

	return (
		<ThemeContext.Provider value={themeContextValue}>
			<MantineProvider
				theme={theme}
				defaultColorScheme={effectiveColorScheme}
				forceColorScheme={effectiveColorScheme}
			>
				<ModalsProvider>
					<Story />
				</ModalsProvider>
			</MantineProvider>
		</ThemeContext.Provider>
	);
};
