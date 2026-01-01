import type { Meta, StoryObj } from "@storybook/react";

import { EntityCard } from "../src/components/entity-card";
import { MultiDevice } from "../.storybook/decorators/MultiDevice";

const meta: Meta<typeof EntityCard> = {
	title: "Components/EntityCard",
	component: EntityCard,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		type: {
			control: "select",
			options: ["category", "brand", "series", "grade", "scale", "year"],
		},
		isSelected: { control: "boolean" },
		asFilter: { control: "boolean" },
	},
};

export default meta;
type Story = StoryObj<typeof EntityCard>;

// Basic examples
export const Default: Story = {
	args: {
		id: "hg",
		name: "High Grade",
		type: "grade",
		itemIds: Array.from({ length: 1234 }, (_, i) => `item-${i}`),
	},
};

export const Selected: Story = {
	args: {
		id: "mg",
		name: "Master Grade",
		type: "grade",
		itemIds: Array.from({ length: 567 }, (_, i) => `item-${i}`),
		isSelected: true,
		asFilter: true,
	},
};

export const WithImage: Story = {
	args: {
		id: "gundam",
		name: "Mobile Suit Gundam",
		type: "series",
		itemIds: Array.from({ length: 89 }, (_, i) => `item-${i}`),
		image: "https://via.placeholder.com/300x170",
	},
};

export const NoImage: Story = {
	args: {
		id: "1-144",
		name: "1/144",
		type: "scale",
		itemIds: Array.from({ length: 2000 }, (_, i) => `item-${i}`),
	},
};

export const Year: Story = {
	args: {
		id: "2024",
		name: "2024",
		type: "year",
		itemIds: Array.from({ length: 156 }, (_, i) => `item-${i}`),
	},
};

// Multi-device preview
export const MultiDevicePreview: Story = {
	args: {
		id: "hg",
		name: "High Grade",
		type: "grade",
		itemIds: Array.from({ length: 1234 }, (_, i) => `item-${i}`),
	},
	decorators: [MultiDevice],
	parameters: {
		layout: "fullscreen",
	},
};
