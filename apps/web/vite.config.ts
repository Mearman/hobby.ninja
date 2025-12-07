/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/webapp',
  publicDir: 'public',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.nx'],
  },
  plugins: [
    react(),
    nxViteTsPaths(),
    vanillaExtractPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'offline.html'],
      manifest: {
        name: 'hobby.ninja',
        short_name: 'hobby.ninja',
        description: 'A hobby collection manager for enthusiasts',
        theme_color: '#dc2626',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/stats.html'],
        navigateFallback: '/offline.html',
        maximumFileSizeToCacheInBytes: 3000000, // 3MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      }
    }),
  ],
  resolve: {
    alias: {
      '@': './src',
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  // Base path: use root for development, hobby-ninja for production
  base: process.env.NODE_ENV === 'production' ? '/hobby-ninja/' : '/',
  build: {
    outDir: '../../dist/apps/web',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Implement intelligent code splitting
        manualChunks: {
          // Split vendor libraries
          vendor: ['react', 'react-dom'],
          router: ['@tanstack/react-router'],
          mantine: ['@mantine/core', '@mantine/hooks', '@mantine/notifications'],
          utils: ['clsx', 'zod'],
          database: ['dexie'],
          icons: ['@tabler/icons-react'],
          vanillaExtract: ['@vanilla-extract/css'],
        },
        // Generate asset filenames with hashes for caching
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || 'asset';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(name)) {
              return 'images/[name]-[hash][extname]';
            }
            if (name.endsWith('.css')) {
              return 'css/[name]-[hash][extname]';
            }
            return '[name]-[hash][extname]';
        },
      },
      // Enhanced tree shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        unknownGlobalSideEffects: false,
      },
    },
    // Generate relative paths for GitHub Pages deployment
    assetsDir: 'assets',
    sourcemap: process.env['NODE_ENV'] === 'development',
    // Enable minification for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env['NODE_ENV'] === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        properties: {
          regex: /^_/
        }
      }
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
    // CSS code splitting
    cssCodeSplit: true,
  },
  preview: {
    port: 4300,
    host: true,
  },
  optimizeDeps: {
    // Pre-bundle dependencies for faster development
    include: [
      'react',
      'react-dom',
      '@tanstack/react-router',
      '@mantine/core',
      '@mantine/hooks',
      '@mantine/notifications',
      '@tabler/icons-react',
      'clsx',
      'zod',
      'dexie'
    ],
    // Exclude heavy dependencies from pre-bundling
    exclude: ['@vanilla-extract/css']
  },
  define: {
    // For GitHub Pages compatibility with hash routing
    __DEV__: process.env['NODE_ENV'] === 'development',
  },
});