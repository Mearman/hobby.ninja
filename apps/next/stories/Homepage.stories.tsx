import type { Meta, StoryObj } from "@storybook/react";

import { HomepageClient } from "../src/components/homepage-client";
import { StickyFiltersProvider } from "../src/contexts/sticky-filters-context";
import { MantineThemeProvider } from "../src/providers/mantine-provider";
import { MultiDevice } from "../.storybook/decorators/MultiDevice";
import { defaultSample, largeSample, minimalSample } from "./utils/sample-homepage-data";

// ============================================================================
// Story Configuration
// ============================================================================

/**
 * Decorator that wraps stories with required context providers
 */
const WithProviders = (Story: React.ComponentType) => (
	<MantineThemeProvider>
		<StickyFiltersProvider>
			<Story />
		</StickyFiltersProvider>
	</MantineThemeProvider>
);

const meta: Meta<typeof HomepageClient> = {
	title: "Pages/Homepage",
	component: HomepageClient,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	decorators: [WithProviders],
};

export default meta;
type Story = StoryObj<typeof HomepageClient>;

// ============================================================================
// Stories using real sampled data
// ============================================================================

/**
 * Default homepage with a representative sample of real data.
 * Includes ~100 items across top categories, series, grades, brands, and scales.
 */
export const Default: Story = {
	args: defaultSample,
};

/**
 * Minimal data sample for testing edge cases and empty states.
 * ~20 items with limited filter options.
 */
export const MinimalData: Story = {
	args: minimalSample,
};

/**
 * Larger data sample for performance testing.
 * ~300 items with more filter options.
 */
export const LargeData: Story = {
	args: largeSample,
};

/**
 * Multi-device preview showing homepage at different screen widths.
 * Uses minimal sample for faster rendering.
 */
export const MultiDevicePreview: Story = {
	args: minimalSample,
	decorators: [MultiDevice],
};
