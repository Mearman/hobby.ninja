import type { NextConfig } from 'next';

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

  // Custom webpack configuration for handling graph data
  webpack: (config, { isServer }) => {
    // Add custom rules if needed for processing graph data
    return config;
  },

  // Enable strict mode for better error detection
  reactStrictMode: true,

  };

export default nextConfig;