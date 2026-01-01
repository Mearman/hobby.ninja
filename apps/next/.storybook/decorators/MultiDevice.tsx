import type { Decorator } from "@storybook/react";
import React from "react";

const devices = [
	{ name: "Mobile", width: 375 },
	{ name: "Tablet", width: 768 },
	{ name: "Desktop", width: 1280 },
];

/**
 * Decorator that renders the story at multiple device widths side-by-side.
 * Use this to preview responsive behavior in a single view.
 */
export const MultiDevice: Decorator = (Story) => (
	<div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", padding: "1rem" }}>
		{devices.map(({ name, width }) => (
			<div key={name} style={{ width, flexShrink: 0 }}>
				<div
					style={{
						fontSize: 12,
						fontWeight: 600,
						padding: "4px 8px",
						background: "#f5f5f5",
						borderRadius: "4px 4px 0 0",
						borderBottom: "1px solid #e0e0e0",
					}}
				>
					{name} ({width}px)
				</div>
				<div
					style={{
						border: "1px solid #e0e0e0",
						borderTop: "none",
						borderRadius: "0 0 4px 4px",
						overflow: "hidden",
					}}
				>
					<Story />
				</div>
			</div>
		))}
	</div>
);
