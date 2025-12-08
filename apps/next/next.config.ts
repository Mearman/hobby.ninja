import type { NextConfig } from 'next';

// Import Vanilla Extract plugin
import { createVanillaExtractPlugin } from '@vanilla-extract/next-plugin';

const nextConfig: NextConfig = {
  // Enable static export for GitHub Pages deployment
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true
  },

  // Set base path for GitHub Pages (adjust if deploying to subdirectory)
  basePath: '',

  // Set trailing slash for consistent URLs
  trailingSlash: true,

  // Disable server-side features for static export
  distDir: 'out',

  // Use src directory
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // Transpile Vanilla Extract packages (required for Next.js 15)
  transpilePackages: ['@vanilla-extract'],

  // Configure experimental features for Mantine
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },

  // Enable strict mode for better error detection
  reactStrictMode: true,

  // Additional webpack configuration for Vanilla Extract (if needed)
  webpack: (config, { isServer }) => {
    // Add CSS file extension alias
    config.resolve.extensionAlias = {
      '.css': ['.css.ts', '.css'],
      ...config.resolve.extensionAlias,
    };

    // Add optimization for Vanilla Extract chunks
    config.optimization.splitChunks = {
      ...config.optimization.splitChunks,
      cacheGroups: {
        vanilla: {
          test: /[\\/]node_modules[\\/]@vanilla-extract[\\/]/,
          name: 'vanilla',
          chunks: 'all',
        },
      },
    };

    return config;
  },
};

// Create Vanilla Extract plugin instance
const withVanillaExtract = createVanillaExtractPlugin();

export default withVanillaExtract(nextConfig);