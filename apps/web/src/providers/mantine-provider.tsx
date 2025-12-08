import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import React, { createContext, useContext } from "react";

import { useTheme } from "../hooks/useTheme";
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
						zIndex={9999}
						containerWidth={400}
					/>
					{children}
				</ModalsProvider>
			</MantineProvider>
		</ThemeContext.Provider>
	);
}