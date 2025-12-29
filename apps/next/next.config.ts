import type { NextConfig } from "next";
import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";
import withPWA from "next-pwa";

const withVanillaExtract = createVanillaExtractPlugin();

const withPWAConfig = withPWA({
	dest: "public",
	disable: process.env.NODE_ENV === "development",
	register: true,
	skipWaiting: true,
	runtimeCaching: [
		{
			urlPattern: /^https?.*/,
			handler: "NetworkFirst",
			options: {
				cacheName: "http-calls",
				networkTimeoutSeconds: 15,
				expiration: {
					maxEntries: 150,
					maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
				},
				cacheableResponse: {
					statuses: [0, 200],
				},
			},
		},
		{
			urlPattern: /\.(?:js|css|html|json)$/,
			handler: "StaleWhileRevalidate",
			options: {
				cacheName: "static-resources",
				expiration: {
					maxEntries: 100,
					maxAgeSeconds: 24 * 60 * 60, // 24 hours
				},
			},
		},
		{
			urlPattern: /\.(?:png|jpg|jpeg|gif|svg|ico|webp)$/,
			handler: "CacheFirst",
			options: {
				cacheName: "images",
				expiration: {
					maxEntries: 200,
					maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
				},
			},
		},
		{
			urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
			handler: "CacheFirst",
			options: {
				cacheName: "fonts",
				expiration: {
					maxEntries: 50,
					maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
				},
			},
		},
	],
	buildExcludes: ["middleware-manifest.json"],
});

const nextConfig: NextConfig = {
	// Enable static export for GitHub Pages deployment
	output: "export",

	// Configure images for external domains and static export
	images: {
		unoptimized: true,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "bandai-hobby.net",
				port: "",
				pathname: "/images/**",
			},
			{
				protocol: "https",
				hostname: "raw.githubusercontent.com",
				port: "",
				pathname: "/Mearman/hobby.ninja/main/assets/**",
			},
		],
	},

	// Set base path for GitHub Pages (adjust if deploying to subdirectory)
	basePath: "",

	// Set trailing slash for consistent URLs
	trailingSlash: true,

	// Use src directory
	pageExtensions: ["ts", "tsx", "js", "jsx"],

	// Transpile Vanilla Extract packages (required for Next.js 15)
	transpilePackages: ["@vanilla-extract"],

	// Configure experimental features for Mantine and Vanilla Extract
	experimental: {
		optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
		// Worker threads disabled - incompatible with webpack plugins (Vanilla Extract, PWA)
		// The plugins inject webpack config that can't be serialized for worker threads
		workerThreads: false,
		// Use available CPUs (CI can override via NEXT_STATIC_GEN_CPUS env var)
		cpus: process.env.NEXT_STATIC_GEN_CPUS
			? parseInt(process.env.NEXT_STATIC_GEN_CPUS, 10)
			: Math.max(require("os").cpus().length, 4),
	},

	// Increase static page generation timeout for large dataset (6000+ pages)
	staticPageGenerationTimeout: 180, // 3 minutes per page (default is 60s)

	// Enable strict mode for better error detection
	reactStrictMode: true,

	// TypeScript configuration
	typescript: {
		// Disable TypeScript build checking - we'll handle type checking separately with nx typecheck
		tsconfigPath: "./tsconfig.json",
		// Completely ignore build errors for both dev and prod builds
		ignoreBuildErrors: true,
	},

	// Empty turbopack config to avoid webpack/turbopack conflicts
	turbopack: {},
};

// Apply Vanilla Extract and PWA plugins
// eslint-disable-next-line import/no-default-export
export default withVanillaExtract(withPWAConfig(nextConfig));
