import React from "react";

interface BadgeProps {
	children: React.ReactNode;
	variant?: "light" | "filled" | "outline";
	size?: "xs" | "sm" | "md" | "lg";
	color?: string;
	className?: string;
}

export function Badge({ children, variant = "light", size = "sm", color = "blue", className }: BadgeProps) {
	// Map color names to Mantine CSS variable indices
	const colorMap: Record<string, string> = {
		blue: "blue",
		green: "green",
		orange: "orange",
		gray: "gray",
	};
	const mantineColor = colorMap[color] || "gray";

	const baseStyle = {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		padding: size === "xs" ? "2px 6px" : size === "sm" ? "4px 8px" : "6px 12px",
		fontSize: size === "xs" ? "10px" : size === "sm" ? "12px" : "14px",
		fontWeight: 500,
		borderRadius: "4px",
		backgroundColor: variant === "light"
			? `var(--mantine-color-${mantineColor}-0)`
			: variant === "filled"
			? `var(--mantine-color-${mantineColor}-5)`
			: "transparent",
		color: variant === "light"
			? `var(--mantine-color-${mantineColor}-9)`
			: variant === "filled"
			? "var(--mantine-color-white)"
			: `var(--mantine-color-${mantineColor}-5)`,
		border: variant === "outline" ? `1px solid var(--mantine-color-${mantineColor}-5)` : "none",
	};

	return (
		<span style={baseStyle} className={className}>
			{children}
		</span>
	);
}