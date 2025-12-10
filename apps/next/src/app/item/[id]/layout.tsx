import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Item Details - hobby.ninja",
	description: "Item details from the hobby.ninja database",
};

export default function ItemLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>
				<div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
					<nav style={{ marginBottom: '20px' }}>
						<a href="/" style={{ marginRight: '15px' }}>← Back to Home</a>
						<a href="/database/gunpla/">← Gunpla Database</a>
					</nav>
					{children}
				</div>
			</body>
		</html>
	);
}