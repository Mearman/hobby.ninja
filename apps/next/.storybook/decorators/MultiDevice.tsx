import type { Decorator } from "@storybook/react";
import React, { useMemo, useRef } from "react";

import { ScrollContainerContext, type ScrollContainerContextValue } from "../../src/contexts/scroll-container-context";

const devices = [
	{ name: "Mobile", width: 375 },
	{ name: "Tablet", width: 768 },
	{ name: "Desktop", width: 1280 },
];

interface DevicePreviewProps {
	name: string;
	width: number;
	children: React.ReactNode;
}

/**
 * Individual device preview with its own scroll container context.
 */
function DevicePreview({ name, width, children }: DevicePreviewProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const fixedRef = useRef<HTMLDivElement>(null);

	const contextValue = useMemo<ScrollContainerContextValue>(() => ({
		scrollRef,
		fixedRef,
	}), []);

	return (
		<div style={{ width, flexShrink: 0 }}>
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
					height: 600,
					position: "relative",
					overflow: "hidden",
				}}
			>
				{/* Fixed position layer for portaled elements */}
				<div
					ref={fixedRef}
					style={{
						position: "absolute",
						inset: 0,
						pointerEvents: "none",
						zIndex: 100,
					}}
				/>
				{/* Scrolling content layer */}
				<div
					ref={scrollRef}
					style={{
						height: "100%",
						overflowY: "auto",
						overflowX: "hidden",
					}}
				>
					<ScrollContainerContext.Provider value={contextValue}>
						{children}
					</ScrollContainerContext.Provider>
				</div>
			</div>
		</div>
	);
}

/**
 * Decorator that renders the story at multiple device widths side-by-side.
 * Use this to preview responsive behavior in a single view.
 *
 * Each device preview provides its own scroll container context so that
 * components like YearScrollbar can track scroll within the container
 * instead of the window.
 */
export const MultiDevice: Decorator = (Story) => (
	<div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", padding: "1rem" }}>
		{devices.map(({ name, width }) => (
			<DevicePreview key={name} name={name} width={width}>
				<Story />
			</DevicePreview>
		))}
	</div>
);
