import { Box, MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import type { Decorator } from "@storybook/react";
import React, { useMemo, useState } from "react";

import { theme } from "../../src/lib/theme";
import { ThemeContext, type ThemeContextValue } from "../../src/providers/mantine-provider";

interface ThemeColumnProps {
	colorScheme: "light" | "dark";
	children: React.ReactNode;
}

/**
 * Wraps content in a themed column with proper Mantine context.
 * Uses cssVariablesSelector with a unique class to scope CSS variables per column.
 */
function ThemeColumn({ colorScheme, children }: ThemeColumnProps) {
	const [fullWidth, setFullWidth] = useState(false);

	const themeValue = useMemo<ThemeContextValue>(() => ({
		colorScheme,
		effectiveColorScheme: colorScheme,
		cycleTheme: () => { /* no-op in stories */ },
		fullWidth,
		toggleFullWidth: () => { setFullWidth(prev => !prev); },
	}), [colorScheme, fullWidth]);

	// Use a unique class selector to scope CSS variables for this column
	const scopeClass = `mantine-scope-${colorScheme}`;

	return (
		<div className={scopeClass} style={{ flex: 1, minWidth: 0 }}>
			<ThemeContext.Provider value={themeValue}>
				<MantineProvider
					theme={theme}
					forceColorScheme={colorScheme}
					cssVariablesSelector={`.${scopeClass}`}
				>
					<ModalsProvider>
						<Box
							bg="var(--mantine-color-body)"
							c="var(--mantine-color-text)"
							mih="100%"
							style={{ borderRadius: 8, overflow: "hidden" }}
						>
							{children}
						</Box>
					</ModalsProvider>
				</MantineProvider>
			</ThemeContext.Provider>
		</div>
	);
}

/**
 * Decorator that renders the story twice side-by-side: once in light mode, once in dark mode.
 * Each side has its own MantineProvider with scoped CSS variables.
 */
export const SideBySideThemes: Decorator = (Story) => {
	return (
		<div style={{
			display: "flex",
			gap: "1rem",
			padding: "1rem",
			backgroundColor: "#808080",
			minHeight: "100vh",
		}}>
			<div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
				<div style={{
					padding: "0.5rem 1rem",
					backgroundColor: "#f0f0f0",
					color: "#333",
					borderRadius: "8px 8px 0 0",
					fontWeight: 600,
					fontSize: 14,
				}}>
					Light Mode
				</div>
				<ThemeColumn colorScheme="light">
					<Story />
				</ThemeColumn>
			</div>
			<div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
				<div style={{
					padding: "0.5rem 1rem",
					backgroundColor: "#333",
					color: "#fff",
					borderRadius: "8px 8px 0 0",
					fontWeight: 600,
					fontSize: 14,
				}}>
					Dark Mode
				</div>
				<ThemeColumn colorScheme="dark">
					<Story />
				</ThemeColumn>
			</div>
		</div>
	);
};
