import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { existsSync } from 'node:fs'
import { siteUrl } from './plugins/site-url.js'
import { securityHeaders } from './plugins/security-headers.js'

const hasCerts = existsSync('./cert/key.pem') && existsSync('./cert/cert.pem')

export default defineConfig({
  publicDir: 'public',
  plugins: [
    siteUrl(),
    securityHeaders(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,txt,xml}'],
        skipWaiting: false, // Prevent immediate activation in dev
        clientsClaim: false, // Don't claim clients immediately
        runtimeCaching: [
          {
            // Self-hosted fonts (see @fontsource-variable/inter). Not precached,
            // because the package ships a file per script/subset.
            urlPattern: /\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
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
        description: 'Modern Progressive Web App starter with advanced features and perfect Lighthouse scores',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        lang: 'en-US',
        dir: 'ltr',
        categories: ['utilities', 'productivity'],
        icons: [
          {
            src: '/img/icons-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/img/icons-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
        enabled: false // Disable PWA in development to prevent constant reloading
      }
    })
  ],
  build: {
    target: 'baseline-widely-available',
    sourcemap: true,
    rolldownOptions: {
      output: {
        minify: { compress: { dropConsole: true } }
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
    // Use HTTPS only when local certs exist (run ./generate-certs.sh)
    https: hasCerts
      ? { key: './cert/key.pem', cert: './cert/cert.pem' }
      : undefined
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString())
  }
})