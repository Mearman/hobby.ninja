import React from "react";

interface BadgeProps {
	children: React.ReactNode;
	variant?: "light" | "filled" | "outline";
	size?: "xs" | "sm" | "md" | "lg";
	color?: string;
	className?: string;
}

export function Badge({ children, variant = "light", size = "sm", color = "blue", className }: BadgeProps) {
	const baseStyle = {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		padding: size === "xs" ? "2px 6px" : size === "sm" ? "4px 8px" : "6px 12px",
		fontSize: size === "xs" ? "10px" : size === "sm" ? "12px" : "14px",
		fontWeight: 500,
		borderRadius: "4px",
		backgroundColor: variant === "light"
			? (color === "blue" ? "#e7f5ff" : color === "green" ? "#ebfbee" : color === "orange" ? "#fff4e6" : "#f1f3f5")
			: variant === "filled"
			? (color === "blue" ? "#339af0" : color === "green" ? "#51cf66" : color === "orange" ? "#ff922b" : "#868e96")
			: "transparent",
		color: variant === "light"
			? (color === "blue" ? "#1864ab" : color === "green" ? "#2b8a3e" : color === "orange" ? "#e8590c" : "#495057")
			: variant === "filled"
			? "white"
			: (color === "blue" ? "#339af0" : color === "green" ? "#51cf66" : color === "orange" ? "#ff922b" : "#868e96"),
		border: variant === "outline" ? `1px solid ${color === "blue" ? "#339af0" : color === "green" ? "#51cf66" : color === "orange" ? "#ff922b" : "#868e96"}` : "none",
	};

	return (
		<span style={baseStyle} className={className}>
			{children}
		</span>
	);
}