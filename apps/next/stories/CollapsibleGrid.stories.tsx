import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { CollapsibleGrid } from "../src/components/collapsible-grid";
import { EntityCard } from "../src/components/entity-card";
import { MultiDevice } from "../.storybook/decorators/MultiDevice";

const meta: Meta<typeof CollapsibleGrid> = {
	title: "Components/CollapsibleGrid",
	component: CollapsibleGrid,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		expanded: { control: "boolean" },
		selectedCount: { control: "number" },
		compactMode: { control: "boolean" },
		hideWhenEmpty: { control: "boolean" },
	},
};

export default meta;
type Story = StoryObj<typeof CollapsibleGrid>;

// Mock cards for stories
const mockCards = [
	{ id: "hg", name: "High Grade", count: 1234 },
	{ id: "mg", name: "Master Grade", count: 567 },
	{ id: "rg", name: "Real Grade", count: 89 },
	{ id: "pg", name: "Perfect Grade", count: 45 },
	{ id: "sd", name: "SD Gundam", count: 234 },
	{ id: "eg", name: "Entry Grade", count: 23 },
];

const renderCards = (selected: string[] = []) =>
	mockCards.map((card) => (
		<EntityCard
			key={card.id}
			id={card.id}
			name={card.name}
			type="grade"
			itemIds={Array.from({ length: card.count }, (_, i) => `item-${i}`)}
			isSelected={selected.includes(card.id)}
			asFilter={true}
			onToggle={() => {}}
		/>
	));

export const Collapsed: Story = {
	args: {
		title: "Grades",
		totalCount: 6,
		selectedCount: 0,
		expanded: false,
	},
	render: (args) => (
		<CollapsibleGrid {...args}>
			{renderCards()}
		</CollapsibleGrid>
	),
};

export const Expanded: Story = {
	args: {
		title: "Grades",
		totalCount: 6,
		selectedCount: 0,
		expanded: true,
	},
	render: (args) => (
		<CollapsibleGrid {...args}>
			{renderCards()}
		</CollapsibleGrid>
	),
};

export const WithSelections: Story = {
	args: {
		title: "Grades",
		totalCount: 6,
		selectedCount: 2,
		expanded: false,
	},
	render: (args) => (
		<CollapsibleGrid {...args}>
			{renderCards(["hg", "mg"])}
		</CollapsibleGrid>
	),
};

export const CompactMode: Story = {
	args: {
		title: "Grades",
		totalCount: 6,
		selectedCount: 2,
		compactMode: true,
	},
	render: (args) => (
		<CollapsibleGrid {...args}>
			{renderCards(["hg", "mg"])}
		</CollapsibleGrid>
	),
};

export const EmptyHidden: Story = {
	args: {
		title: "Empty Section",
		totalCount: 0,
		hideWhenEmpty: true,
	},
	render: (args) => (
		<div>
			<p>This section should be hidden:</p>
			<CollapsibleGrid {...args}>
				{[]}
			</CollapsibleGrid>
			<p>Content after the hidden section</p>
		</div>
	),
};

// Multi-device preview
export const MultiDevicePreview: Story = {
	args: {
		title: "Grades",
		totalCount: 6,
		selectedCount: 0,
		expanded: false,
	},
	render: (args) => (
		<CollapsibleGrid {...args}>
			{renderCards()}
		</CollapsibleGrid>
	),
	decorators: [MultiDevice],
	parameters: {
		layout: "fullscreen",
	},
};
