import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  publicDir: 'public',
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,txt,woff2,xml}'],
        skipWaiting: false, // Prevent immediate activation in dev
        clientsClaim: false, // Don't claim clients immediately
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'PWA Kit Modern',
        short_name: 'PWA Kit',
        description: 'Modern Progressive Web App starter with TypeScript & Vite',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'img/icons-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'img/icons-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'img/icons-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      devOptions: {
        enabled: false // Disable PWA in development to prevent constant reloading
      }
    })
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['idb', 'workbox-window', 'comlink']
        }
      }
    },
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    // Temporarily disable HTTPS to avoid certificate issues in development
    // https: {
    //   key: './cert/key.pem',
    //   cert: './cert/cert.pem'
    // }
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: false,
      interval: 1000
    }
  },
  preview: {
    host: true,
    port: 4173,
    https: {
      key: './cert/key.pem', 
      cert: './cert/cert.pem'
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString())
  }
})