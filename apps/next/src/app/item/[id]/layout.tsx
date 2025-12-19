import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Item Details - hobby.ninja",
	description: "Item details from the hobby.ninja database",
};

// Next.js requires default export for layout files
 
export default function ItemLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Nested layouts must NOT include <html> or <body> tags - those are only in root layout
	return children;
}