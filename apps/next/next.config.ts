import type { NextConfig } from 'next';
import path from 'path';

// Import Vanilla Extract plugin
import { createVanillaExtractPlugin } from '@vanilla-extract/next-plugin';

// Import PWA configuration
import withPWA from 'next-pwa';

// Dynamic import for build data plugin to avoid Nx module resolution issues
let BuildDataPlugin: any;
try {
  BuildDataPlugin = require('./scripts/build-data-plugin').default;
} catch (error) {
  console.warn('BuildDataPlugin not found, data processing will be skipped');
  BuildDataPlugin = class DummyPlugin {
    apply() {
      // No-op plugin
    };
  };
}

// Default build data strategy configuration
const DEFAULT_BUILD_DATA_STRATEGY = 'nx'; // Change to 'webpack' or 'disabled' to change default behavior

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Increase maximum file size for precaching to handle large chunks
  // maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // 20MB to handle graph data
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'http-calls',
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
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|gif|svg|ico|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'fonts',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
  ],
  buildExcludes: ['middleware-manifest.json'],
});


// Create Vanilla Extract plugin instance
const withVanillaExtract = createVanillaExtractPlugin();

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

  // Configure experimental features for Mantine and Vanilla Extract
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
    // Critical for Vanilla Extract static export compatibility
    // esmExternals: 'loose', // Not supported with Turbopack
    optimizeCss: true,
    // Fix for Webpack 5 ESM modules
    esmExternals: false,
  },

  // Enable strict mode for better error detection
  reactStrictMode: true,

  // TypeScript configuration
  typescript: {
    // Disable TypeScript build checking - we'll handle type checking separately with nx typecheck
    tsconfigPath: './tsconfig.json',
    // Completely ignore build errors for both dev and prod builds
    ignoreBuildErrors: true,
  },

  // Force webpack for better Vanilla Extract + static export compatibility
  turbopack: false,

  // Additional webpack configuration for Vanilla Extract and bundle optimization
  webpack: (config, { isServer }) => {
    // Use environment variable or fall back to configured default
    const buildDataStrategy = process.env.BUILD_DATA_STRATEGY || DEFAULT_BUILD_DATA_STRATEGY;

    // Fix for Webpack 5 and client-side modules in static export
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    if (isServer) {
      config.plugins.push(new BuildDataPlugin({
        strategy: buildDataStrategy
      }));
    }

    // Add CSS file extension alias
    config.resolve.extensionAlias = {
      '.css': ['.css.ts', '.css'],
      ...config.resolve.extensionAlias,
    };

    // Optimize chunk splitting to prevent large bundles
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        maxSize: 244000, // ~244KB chunks
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          vanilla: {
            test: /[\\/]node_modules[\\/]@vanilla-extract[\\/]/,
            name: 'vanilla-extract',
            priority: 10,
            chunks: 'all',
          },
          // Separate graph data into its own chunk
          graphData: {
            test: /[\\/](graph-data|data)[\\/]/,
            name: 'graph-data',
            priority: 20,
            chunks: 'all',
          },
          // Large UI libraries
          mantine: {
            test: /[\\/]node_modules[\\/]@mantine[\\/]/,
            name: 'mantine',
            priority: 15,
            chunks: 'all',
          },
          // Critical fix for Vanilla Extract static export
          css: {
            name: 'css',
            test: /\.css$/,
            chunks: 'all',
            enforce: true,
            priority: 30,
          },
        },
      };
    }

    return config;
  },
};

// Apply both PWA and Vanilla Extract plugins
export default withPWAConfig(withVanillaExtract(nextConfig));