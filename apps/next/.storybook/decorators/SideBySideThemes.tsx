import { MantineProvider } from "@mantine/core";
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
 * Sets data-mantine-color-scheme on the wrapper div to scope CSS variables.
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

	return (
		<div
			data-mantine-color-scheme={colorScheme}
			style={{
				flex: 1,
				minWidth: 0,
				backgroundColor: colorScheme === "dark" ? "#1a1b1e" : "#ffffff",
				borderRadius: 8,
				overflow: "hidden",
			}}
		>
			<ThemeContext.Provider value={themeValue}>
				<MantineProvider
					theme={theme}
					defaultColorScheme={colorScheme}
					forceColorScheme={colorScheme}
					cssVariablesSelector={`[data-mantine-color-scheme="${colorScheme}"]`}
				>
					<ModalsProvider>
						{children}
					</ModalsProvider>
				</MantineProvider>
			</ThemeContext.Provider>
		</div>
	);
}

/**
 * Decorator that renders the story twice side-by-side: once in light mode, once in dark mode.
 * Useful for visual comparison of theme implementations.
 */
export const SideBySideThemes: Decorator = (Story) => {
	return (
		<div style={{
			display: "flex",
			gap: "1rem",
			padding: "1rem",
			backgroundColor: "#f0f0f0",
			minHeight: "100vh",
		}}>
			<div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
				<div style={{
					padding: "0.5rem 1rem",
					backgroundColor: "#e0e0e0",
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
			<div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
