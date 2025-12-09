import type { Metadata } from "next";
import "@mantine/core/styles.css";

import { LayoutClient } from "@/components/layout/layout-client";

export const metadata: Metadata = {
	title: "hobby.ninja - Static Collection Management",
	description: "Comprehensive hobby collection management with 8,485+ items, search, and tracking features",
	keywords: ["gunpla", "hobby", "collection", "database", "model kits", "figure-rise"],
	authors: [{ name: "hobby.ninja" }],
	viewport: "width=device-width, initial-scale=1",
	themeColor: "#339af0",
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		title: "Hobby Ninja",
		statusBarStyle: "default",
	},
	formatDetection: {
		telephone: false,
	},
	openGraph: {
		type: "website",
		siteName: "Hobby Ninja",
		title: "Hobby Ninja - Collection Manager",
		description: "Manage your hobby collections with advanced search and tracking features",
	},
	twitter: {
		card: "summary",
		title: "Hobby Ninja",
		description: "Progressive web app for hobby collection management",
	},
	icons: {
		icon: [
			{ url: "/icons/icon.svg", type: "image/svg+xml" },
			{ url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" }
		],
		apple: [
			{ url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }
		]
	}
};

export default function RootLayout({
	children,
}: {
  children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>
				<LayoutClient>{children}</LayoutClient>
			</body>
		</html>
	);
}