import { useState, useEffect } from "react";

export type ColorScheme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "hobby-ninja-theme";

/**
 * Get the system's preferred color scheme
 */
function getSystemColorScheme(): "light" | "dark" {
	if (globalThis.window !== undefined) {
		return globalThis.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	}
	return "light";
}

/**
 * Get the effective color scheme (resolving 'system' to actual preference)
 */
function getEffectiveColorScheme(scheme: ColorScheme): "light" | "dark" {
	if (scheme === "system") {
		return getSystemColorScheme();
	}
	return scheme;
}

/**
 * Hook for managing theme color scheme with system preference support
 * Cycles through: system → dark → light → system
 */
export function useTheme() {
	const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
		if (globalThis.window !== undefined) {
			const stored = localStorage.getItem(THEME_STORAGE_KEY);
			return (stored as ColorScheme) || "system";
		}
		return "system";
	});

	const [effectiveColorScheme, setEffectiveColorScheme] = useState<"light" | "dark">(() =>
		getEffectiveColorScheme(colorScheme),
	);

	// Listen for system theme changes when using 'system' scheme
	useEffect(() => {
		if (globalThis.window === undefined) return;

		const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = () => {
			if (colorScheme === "system") {
				setEffectiveColorScheme(getSystemColorScheme());
			}
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => { mediaQuery.removeEventListener("change", handleChange); };
	}, [colorScheme]);

	// Update effective scheme when color scheme changes
	useEffect(() => {
		setEffectiveColorScheme(getEffectiveColorScheme(colorScheme));
	}, [colorScheme]);

	// Persist theme preference
	useEffect(() => {
		if (globalThis.window !== undefined) {
			localStorage.setItem(THEME_STORAGE_KEY, colorScheme);
		}
	}, [colorScheme]);

	/**
	 * Cycle to the next color scheme: system → dark → light → system
	 */
	const cycleTheme = () => {
		setColorScheme((current) => {
			switch (current) {
				case "system": {
					return "dark";
				}
				case "dark": {
					return "light";
				}
				case "light": {
					return "system";
				}
				default: {
					return "system";
				}
			}
		});
	};

	/**
	 * Get the icon name for the current theme state
	 */
	const getThemeIcon = () => {
		switch (colorScheme) {
			case "system": {
				// Show what the system currently is NOT
				return getSystemColorScheme() === "dark" ? "IconSun" : "IconMoon";
			}
			case "dark": {
				return "IconSun";
			}
			case "light": {
				return "IconMoon";
			}
			default: {
				return "IconSun";
			}
		}
	};

	/**
	 * Get tooltip text for the current theme state
	 */
	const getThemeTooltip = () => {
		switch (colorScheme) {
			case "system": {
				const systemPref = getSystemColorScheme();
				const nextScheme = systemPref === "dark" ? "dark" : "light";
				return `Currently: System (${systemPref}) → Next: ${nextScheme}`;
			}
			case "dark": {
				return "Currently: Dark → Next: Light";
			}
			case "light": {
				return "Currently: Light → Next: System";
			}
			default: {
				return "Cycle theme";
			}
		}
	};

	return {
		colorScheme,
		effectiveColorScheme,
		cycleTheme,
		getThemeIcon,
		getThemeTooltip,
	};
}