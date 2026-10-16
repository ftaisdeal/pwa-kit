import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

// Service worker tests live in *pwa*.spec.ts and only run in the "PWA Tests"
// project; every other project runs the rest.
const pwaSpecs = '**/*pwa*.spec.{js,ts}';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: pwaSpecs,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: pwaSpecs,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: pwaSpecs,
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: pwaSpecs,
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testIgnore: pwaSpecs,
    },
    {
      name: 'PWA Tests',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        serviceWorkers: 'allow',
      },
      testMatch: pwaSpecs,
    },
  ],

  // Tests run against the production build, which is what ships (and the only
  // build that registers the service worker).
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Plain HTTP: localhost counts as a secure context, and it avoids
    // self-signed certificate errors (see vite.config.js)
    env: { NO_HTTPS: '1' },
  },
});
