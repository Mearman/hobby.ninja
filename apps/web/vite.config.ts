import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/webapp',
  plugins: [
    react(),
    nxViteTsPaths(),
    vanillaExtractPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'offline.html'],
      manifest: {
        name: 'Gunpla Collection Manager',
        short_name: 'Gunpla App',
        description: 'A comprehensive Gundam and Gunpla model kit database and collection manager',
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
        ],
        shortcuts: [
          {
            name: 'My Collection',
            short_name: 'Collection',
            description: 'View and manage your Gunpla collection',
            url: '/collection',
            icons: [{ src: 'icons/shortcut-collection-96x96.png', sizes: '96x96' }]
          },
          {
            name: 'Search Kits',
            short_name: 'Search',
            description: 'Search for Gundam model kits',
            url: '/search',
            icons: [{ src: 'icons/shortcut-search-96x96.png', sizes: '96x96' }]
          },
          {
            name: 'Wishlist',
            short_name: 'Wishlist',
            description: 'Manage your wishlist of kits to buy',
            url: '/wishlist',
            icons: [{ src: 'icons/shortcut-wishlist-96x96.png', sizes: '96x96' }]
          },
          {
            name: 'Build Progress',
            short_name: 'Builds',
            description: 'Track your current build progress',
            url: '/builds',
            icons: [{ src: 'icons/shortcut-builds-96x96.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ],
        offlineGoogleAnalytics: false,
        cleanupOutdatedCaches: true,
        navigateFallback: '/offline.html'
      },
      // Development settings
      devOptions: {
        enabled: true,
        navigateFallback: '/offline.html'
      }
    }),
    // Bundle analysis plugin for production builds
    process.env['NODE_ENV'] === 'production' && visualizer({
      filename: '../../dist/apps/web/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': './src',
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  // GitHub Pages base path - adjust for your repository name
  base: '/unnamed-gunpla-app/',
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