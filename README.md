# PWA Kit Modern - Progressive Web App Starter

[![Vite](https://img.shields.io/badge/Vite-8-646CFF)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple)](https://web.dev/progressive-web-apps/)

A modern, feature-complete Progressive Web App starter kit built with the latest web technologies and best practices. Built to score well on Lighthouse out of the box with caching strategies, offline support, and modern web APIs.

## ✨ Features

### 🚀 Modern Development Stack
- **Vite 8** - Lightning-fast build tool with HMR
- **ESLint** (flat config) and **Prettier**
- **Vitest** for unit testing with UI
- **Playwright** for E2E testing across browsers
- **Workbox** integration for advanced service worker features

### 📱 PWA Features
- **High Lighthouse scores** (verify with `npm run lighthouse`)
- **Advanced caching strategies** (Cache First, Network First, Stale While Revalidate)
- **Smart offline detection** with multiple endpoint testing
- **Background sync** for offline actions
- **Push notifications** with VAPID support
- **App installation prompts** with custom UI
- **Web Share API** integration
- **Network Information API** for connection quality
- **App shortcuts** and rich manifest
- **Maskable icons** support
- **File handling** capabilities

### 🎨 Modern CSS & Design
- **CSS Custom Properties** (CSS Variables) with design system
- **Dark mode** support via `prefers-color-scheme`
- **High contrast** mode support
- **Reduced motion** accessibility support
- **Container queries** for responsive design
- **CSS logical properties** for internationalization
- **Modern color functions** with `color-mix()`
- **View Transitions API** support

### 🛡️ Security & Performance
- **Strict Content Security Policy** (no inline scripts/styles) and security headers, defined once in `plugins/security-headers.js`
- **Self-hosted fonts** (Inter) - no third-party requests
- **Optional HTTPS** for `npm run preview` (see SSL Certificate Setup)
- **IndexedDB** integration via `idb`

## 🚀 Quick Start

### Prerequisites
- Node.js 22.12+ and npm 10+
- Modern browser with PWA support

### Installation
```bash
git clone <your-fork-or-template-url> my-app
cd my-app
npm install
```

### Development
```bash
# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run e2e

# Build for production
npm run build

# Preview production build
npm run preview
```

### After You Clone
Before deploying your own app:
- [ ] Rename the package in `package.json` and set your own `name`, `author` and `repository` fields
- [ ] Set `VITE_SITE_URL` to your production origin, e.g. `VITE_SITE_URL=https://app.example.org` in `.env.production`. It fills in the canonical, Open Graph and structured-data URLs in `index.html`, and the templates in `site/` (`robots.txt`, `sitemap.xml`, `.well-known/security.txt`). It defaults to `https://example.com`, and the build warns when it is unset
- [ ] Update the security contact and `Expires` date in `site/.well-known/security.txt`, and the pages in `site/sitemap.xml`
- [ ] Replace the placeholder icons (see Icons & Assets) and the manifest names in `vite.config.js`
- [ ] Update the title, description and `og:` text in `index.html`
- [ ] Once your app has a real UI, add a `screenshot` URL to the JSON-LD block in `index.html` and `screenshots` to the manifest in `vite.config.js` (used for the richer install dialog)

### SSL Certificate Setup
For full PWA features in development, generate SSL certificates:
```bash
# Uses mkcert if installed, otherwise OpenSSL
./generate-certs.sh
```
The `cert/` directory is git-ignored. `npm run preview` serves over HTTPS when the certificates exist, and over HTTP otherwise.

## 📁 Project Structure

```
pwa-kit/
├── public/                 # Static assets (copied as-is)
│   ├── img/               # App icons
│   ├── offline.html       # Offline fallback page
│   └── ...                # favicons
├── site/                  # Templates filled with VITE_SITE_URL at build time
│   ├── robots.txt
│   ├── sitemap.xml
│   └── .well-known/security.txt
├── plugins/
│   ├── site-url.js        # Fills VITE_SITE_URL into index.html and site/
│   └── security-headers.js # CSP and other headers (_headers file, preview server, meta)
├── src/                   # TypeScript source (entry: main.ts)
│   ├── sw.ts              # Service worker registration and updates
│   ├── network.ts         # Connectivity detection
│   ├── install.ts         # Install prompt
│   ├── notifications.ts   # Notification permission and UI
│   ├── push.ts            # Push subscription
│   ├── sync.ts            # Background sync and offline queue
│   ├── db.ts              # IndexedDB (idb)
│   ├── share.ts, ui.ts    # Share button (Web Share or copy link), in-app notifications, helpers
│   ├── logger.ts          # The only place that uses console; debug output is dev-only
│   └── types.d.ts         # Types for browser APIs missing from lib.dom
├── tsconfig.json
├── index.html
├── styles.css
├── vite.config.js         # Vite + PWA plugin + web app manifest
├── vitest.config.js       # Unit tests (tests/unit/**)
├── playwright.config.js   # E2E tests (tests/e2e/**)
├── eslint.config.js
└── package.json
```

## 🔧 Configuration

### PWA Manifest
The manifest is generated by `vite-plugin-pwa` from the `manifest` option in `vite.config.js` (there is no static `manifest.webmanifest`). Update it with your app details:
```javascript
VitePWA({
  manifest: {
    name: 'Your App Name',
    short_name: 'YourApp',
    start_url: '/',
    display: 'standalone',
    theme_color: '#1976d2',
    background_color: '#ffffff'
  }
})
```

### Updates
The app registers its own service worker in `src/sw.ts` (`registerType: 'prompt'`, no auto-injected `registerSW.js`). When a new version is deployed, it installs in the background and a "A new version is available" prompt appears with **Reload** and **Later**. Nothing activates or reloads until the user clicks Reload, so an update never discards in-progress input. If they choose Later, the prompt returns on their next visit. Visitors with no controlling service worker (a first visit) simply get the new version.

### Offline Actions & the API
Forms with the class `sync-form` that are submitted while offline are saved in IndexedDB (`src/db.ts`) instead of being sent. When the device comes back online they are replayed in order as `POST /api/submit` with a JSON body (`src/sync.ts`), and removed once the server answers with a 2xx status.

**This starter has no backend.** `/api/submit` and `/api/push-subscribe` are placeholders: you need to provide endpoints for them (or change the URLs in `src/sync.ts` and `src/push.ts`). Without a real endpoint every replay fails, as a hosting service typically answers `404`. Push subscriptions fall back to being stored in `localStorage` when the server is unreachable.

A replay that fails (network error or non-2xx response) stays queued and is retried the next time the device comes online. **Each action is tried at most 5 times** (`MAX_SYNC_ATTEMPTS` in `src/sync.ts`); after the fifth failure it is dropped and an error is logged, so a request that can never succeed does not pile up forever. Raise the constant if you want more retries, but note that dropped actions are not recoverable.

### Security Headers & CSP
`plugins/security-headers.js` is the single source for the Content Security Policy and related headers. On build it writes a `dist/_headers` file (used by Netlify and Cloudflare Pages), adds the CSP as a `<meta>` fallback to `index.html`, and `npm run preview` serves the same headers. Other hosts need the headers set in their own config (e.g. `vercel.json`, nginx), copied from `_headers`. The meta fallback cannot express `frame-ancestors`.

The policy allows no inline scripts or styles. If you add an API, analytics or CDN origin, add it to the matching directive (usually `connect-src`) in that file. The connectivity check in `src/network.ts` pings `www.gstatic.com` and `httpbin.org`, which are listed there. The dev server does not send the CSP, since Vite's HMR needs inline styles and websockets, so test CSP changes with `npm run build && npm run preview`.

Use `log` from `src/logger.ts` instead of `console` (ESLint enforces this). `log.debug` prints only in development; `log.warn` and `log.error` are kept in production builds.

Never build markup by concatenating strings into `innerHTML`; use `textContent` and DOM APIs as `src/ui.ts` and `src/network.ts` do.

### Service Worker
The service worker is automatically generated by Workbox. Customize caching strategies in `vite.config.js`:
```javascript
VitePWA({
  workbox: {
    runtimeCaching: [
      // Add your custom caching rules
    ]
  }
})
```

### Icons & Assets
The starter includes minimal placeholder icons. **You should generate your own branded icons** for production:

**Current Icons (replace with your own):**
- `favicon-32.png` - Browser favicon
- `apple-touch-icon.png` - iOS home screen icon  
- `img/icons-192.png` - Android home screen icon
- `img/icons-512.png` - PWA splash screen icon

**Recommended Icon Generation Tools:**
- [PWA Builder](https://www.pwabuilder.com/) - Complete PWA asset generation
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Cross-platform favicon generator
- [App Icon Generator](https://appicon.co/) - Generate all sizes from one image

**Full Icon Set Needed for Production:**
```bash
# Essential PWA icons
/favicon-32.png          # 32×32 browser favicon
/apple-touch-icon.png    # 180×180 iOS icon
/img/icons-192.png       # 192×192 Android icon
/img/icons-512.png       # 512×512 splash screen
/img/icons-512-maskable.png # 512×512 maskable (safe area); add it to the manifest icons with purpose: 'maskable'

# Optional but recommended
/img/icons-72.png        # 72×72 small devices
/img/icons-96.png        # 96×96 desktop PWA
/img/icons-144.png       # 144×144 Windows tiles
/img/safari-pinned-tab.svg # Safari pinned tab
```

### Environment Variables
Create `.env` files for different environments:
```bash
# .env.production
VITE_SITE_URL=https://yourapp.example.org

# .env.local
VITE_API_URL=https://api.yourapp.com
VITE_VAPID_PUBLIC_KEY=your_vapid_key_here
```

## 🧪 Testing

### Unit Tests
Vitest (jsdom) runs the tests in `tests/unit/`.
```bash
npm test                  # Watch mode
npx vitest run            # Run once
npm run test:ui           # Interactive UI
npm run test:coverage     # With coverage report
```

### E2E Tests
Playwright tests in `tests/e2e/` run against the production build, which is built and served with `vite preview` automatically (over plain HTTP; `localhost` is a secure context, so service workers work). `*pwa*.spec.ts` files test the service worker (installs, takes control, works offline) and run only in the "PWA Tests" project; the other specs cover the page, security headers, manifest and site files.
```bash
npx playwright install chromium   # One-time browser download (add firefox webkit for the other projects)
npm run e2e                       # All projects
npx playwright test --project=chromium --project="PWA Tests"   # What CI runs
npm run e2e:headed                # With browser UI
npm run e2e:debug                 # Debug mode
```

### Everything at once
```bash
npm run check             # Lint, type-check, unit tests and build
```

### Performance Testing
```bash
npm run lighthouse      # Generate Lighthouse report
```

## 🤖 Continuous Integration
`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests:
- **check** (Node 22 and 24): lint, type-check, unit tests, build
- **e2e** (Node 24): Playwright smoke and service worker tests in Chromium; the HTML report is uploaded as an artifact

`.github/dependabot.yml` opens weekly dependency PRs: one grouped PR for minor and patch updates, individual PRs for majors, and one for GitHub Actions updates. TypeScript 7 is ignored until `typescript-eslint` supports it.

## 📦 Production Deployment

### Build
```bash
npm run build           # Build for production
npm run preview         # Preview build locally
```

### Deployment Checklist
- [ ] HTTPS enabled
- [ ] Service worker registered
- [ ] Manifest linked in HTML
- [ ] Icons generated (all sizes)
- [ ] Security headers deployed (copy `dist/_headers` if your host does not read it)
- [ ] Performance budget met

### Deployment Platforms
Works with any static hosting:
- **Netlify** - Auto-deploy from Git
- **Vercel** - Optimized for performance
- **GitHub Pages** - Free hosting
- **Firebase Hosting** - Google's platform
- **Cloudflare Pages** - Edge deployment

## 🔍 Lighthouse Optimization

This template is designed to score highly on Lighthouse. Run `npm run lighthouse` (with a dev or preview server running) to measure your own build; scores depend on your content and hosting.

### Key Optimizations
- Efficient caching strategies
- Code splitting and tree shaking
- Service worker precaching
- ARIA labels and semantic HTML
- Meta tags and structured data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Write tests for new features
- Follow the existing code style
- Update documentation
- Ensure Lighthouse scores remain high
- Test across different browsers and devices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- [Workbox](https://developers.google.com/web/tools/workbox) - Google's PWA toolkit
- [Vite](https://vitejs.dev/) - Next generation frontend tooling
- [web.dev](https://web.dev/) - Modern web development guidance

---

Made with ❤️ for the modern web