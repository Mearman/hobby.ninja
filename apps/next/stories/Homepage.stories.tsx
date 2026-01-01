import { Box, MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import type { Decorator, Meta, StoryObj } from "@storybook/react";
import React, { useMemo, useState } from "react";

import { HomepageClient } from "../src/components/homepage-client";
import { Header } from "../src/components/layout/header";
import { Navigation } from "../src/components/layout/navigation";
import { StickyFiltersProvider } from "../src/contexts/sticky-filters-context";
import { theme } from "../src/lib/theme";
import { ThemeContext, type ThemeContextValue } from "../src/providers/mantine-provider";
import { MultiDevice } from "../.storybook/decorators/MultiDevice";
import { SideBySideThemes } from "../.storybook/decorators/SideBySideThemes";
import { SingleViewContainer } from "../.storybook/decorators/SingleViewContainer";
import { defaultSample, largeSample, minimalSample } from "./utils/sample-homepage-data";

// ============================================================================
// Theme Provider Decorator for Homepage
// ============================================================================

/**
 * Creates a decorator that wraps the story with theme context and providers.
 * Uses CSS variable scoping to ensure theme applies even when nested in global ThemeWrapper.
 */
function createThemeDecorator(colorScheme: "light" | "dark"): Decorator {
	return (Story) => {
		const [fullWidth, setFullWidth] = useState(false);

		const themeValue = useMemo<ThemeContextValue>(() => ({
			colorScheme,
			effectiveColorScheme: colorScheme,
			cycleTheme: () => { /* no-op in stories */ },
			fullWidth,
			toggleFullWidth: () => { setFullWidth(prev => !prev); },
		}), [fullWidth]);

		// Use scoped class to isolate CSS variables from global ThemeWrapper
		const scopeClass = `mantine-story-scope-${colorScheme}`;

		return (
			<div
				className={scopeClass}
				data-mantine-color-scheme={colorScheme}
				style={{ minHeight: "100vh" }}
			>
				<ThemeContext.Provider value={themeValue}>
					<MantineProvider
						theme={theme}
						forceColorScheme={colorScheme}
						cssVariablesSelector={`.${scopeClass}`}
						getRootElement={() => document.querySelector(`.${scopeClass}`) as HTMLElement}
					>
						<ModalsProvider>
							<Box bg="var(--mantine-color-body)" c="var(--mantine-color-text)" mih="100vh">
								<StickyFiltersProvider>
									<Story />
								</StickyFiltersProvider>
							</Box>
						</ModalsProvider>
					</MantineProvider>
				</ThemeContext.Provider>
			</div>
		);
	};
}

// Pre-built decorators for each theme
const WithLightTheme = createThemeDecorator("light");
const WithDarkTheme = createThemeDecorator("dark");

/**
 * Wraps story with StickyFiltersProvider for use with SideBySideThemes.
 * The theme context is provided by SideBySideThemes decorator.
 */
const WithStickyFilters: Decorator = (Story) => (
	<StickyFiltersProvider>
		<Story />
	</StickyFiltersProvider>
);

// ============================================================================
// Story Configuration
// ============================================================================

const meta: Meta<typeof HomepageClient> = {
	title: "Pages/Homepage",
	component: HomepageClient,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	// Default to light theme
	decorators: [WithLightTheme],
};

export default meta;
type Story = StoryObj<typeof HomepageClient>;

// ============================================================================
// Stories using real sampled data
// ============================================================================

/**
 * Default homepage in light theme.
 * ~100 items across top categories, series, grades, brands, and scales.
 */
export const Default: Story = {
	args: defaultSample,
};

/**
 * Homepage in light theme.
 */
export const LightTheme: Story = {
	args: defaultSample,
	decorators: [WithLightTheme],
};

/**
 * Homepage in dark theme.
 */
export const DarkTheme: Story = {
	args: defaultSample,
	decorators: [WithDarkTheme],
};

/**
 * Light and dark themes side-by-side for visual comparison.
 */
export const ThemeComparison: Story = {
	args: minimalSample,
	decorators: [WithStickyFilters, SideBySideThemes],
};

/**
 * Minimal data sample for testing edge cases.
 * ~20 items with limited filter options.
 */
export const MinimalData: Story = {
	args: minimalSample,
};

/**
 * Minimal data in dark theme.
 */
export const MinimalDataDark: Story = {
	args: minimalSample,
	decorators: [WithDarkTheme],
};

/**
 * Larger data sample for performance testing.
 * ~300 items with more filter options.
 */
export const LargeData: Story = {
	args: largeSample,
};

/**
 * Multi-device preview (light theme).
 */
export const MultiDevicePreview: Story = {
	args: minimalSample,
	decorators: [WithLightTheme, MultiDevice],
};

/**
 * Multi-device preview (dark theme).
 */
export const MultiDevicePreviewDark: Story = {
	args: minimalSample,
	decorators: [WithDarkTheme, MultiDevice],
};

// ============================================================================
// Stories with Header
// ============================================================================

/**
 * Component that renders Homepage with Header for full-page stories.
 * Manages mobile menu state internally.
 */
function HomepageWithHeader(props: React.ComponentProps<typeof HomepageClient>) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<>
			<Header
				mobileMenuOpen={mobileMenuOpen}
				onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
			/>
			<Navigation
				opened={mobileMenuOpen}
				onClose={() => setMobileMenuOpen(false)}
			/>
			<HomepageClient {...props} />
		</>
	);
}

/**
 * Homepage with header bar - single view for inspecting layout.
 * Uses SingleViewContainer to provide scroll container context for YearScrollbar.
 */
export const WithHeader: Story = {
	args: minimalSample,
	decorators: [WithLightTheme, SingleViewContainer],
	render: (args) => <HomepageWithHeader {...args} />,
};

/**
 * Homepage with header bar - dark theme single view.
 * Uses SingleViewContainer to provide scroll container context for YearScrollbar.
 */
export const WithHeaderDark: Story = {
	args: minimalSample,
	decorators: [WithDarkTheme, SingleViewContainer],
	render: (args) => <HomepageWithHeader {...args} />,
};

/**
 * Homepage with header bar - light theme at multiple device sizes.
 * Shows responsive header behavior: hamburger menu on mobile,
 * full navigation on desktop.
 */
export const WithHeaderMultiDevice: Story = {
	args: minimalSample,
	decorators: [WithLightTheme, MultiDevice],
	render: (args) => <HomepageWithHeader {...args} />,
};

/**
 * Homepage with header bar - dark theme at multiple device sizes.
 */
export const WithHeaderMultiDeviceDark: Story = {
	args: minimalSample,
	decorators: [WithDarkTheme, MultiDevice],
	render: (args) => <HomepageWithHeader {...args} />,
};

/**
 * Homepage with header - side-by-side theme comparison.
 */
export const WithHeaderThemeComparison: Story = {
	args: minimalSample,
	decorators: [WithStickyFilters, SideBySideThemes],
	render: (args) => <HomepageWithHeader {...args} />,
};
