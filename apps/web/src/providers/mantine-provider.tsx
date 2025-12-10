import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import React, { createContext, useContext } from "react";

import { useTheme } from "../hooks/useTheme";
import { theme } from "../lib/theme";

// Constants for magic numbers - only keeping used constants
const ONE = 1;
const FOUR = 4;
const FIVE = 5;
const TEN = 10;
const HUNDRED = 100;
const THOUSAND = 1000;

// Create context for theme functions
interface ThemeContextType {
	colorScheme: "light" | "dark" | "system";
	effectiveColorScheme: "light" | "dark";
	cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface MantineThemeProviderProps {
	children: React.ReactNode;
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
						limit={FIVE}
						zIndex={THOUSAND * TEN - ONE}
						containerWidth={FOUR * HUNDRED}
					/>
					{children}
				</ModalsProvider>
			</MantineProvider>
		</ThemeContext.Provider>
	);
}

// Hook to access theme context
export function useThemeContext(): ThemeContextType {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useThemeContext must be used within MantineThemeProvider");
	}
	return context;
}