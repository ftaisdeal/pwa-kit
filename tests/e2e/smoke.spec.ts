import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Keep the connectivity check deterministic: the external hosts it pings
  // answer instantly, whatever the network the tests run on.
  await page.route('https://www.gstatic.com/**', (route) =>
    route.fulfill({ status: 204 })
  );
  await page.route('https://httpbin.org/**', (route) =>
    route.fulfill({ status: 200 })
  );
});

test('loads without console errors or CSP violations', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });

  await page.goto('/');

  await expect(page).toHaveTitle(/PWA Kit Modern/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'PWA Kit Modern'
  );
  await expect(page.locator('#container')).toContainText(
    'Online and connected'
  );
  expect(problems).toEqual([]);
});

test('Check Again re-runs the connectivity check', async ({ page }) => {
  await page.goto('/');
  const status = page.locator('#container');
  await expect(status).toContainText('Online and connected');

  // Make the next check fail, then run it
  await page.route('https://www.gstatic.com/**', (route) => route.abort());
  await page.route('https://httpbin.org/**', (route) => route.abort());
  await page.route('**/favicon-32.png', (route) => route.abort());
  await page.getByRole('button', { name: /Check Again/ }).click();

  await expect(status).toContainText('Limited connectivity');
});

test('sends security headers', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();

  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['content-security-policy']).toContain(
    "frame-ancestors 'none'"
  );
  expect(headers['x-content-type-options']).toBe('nosniff');
});

test('serves a valid web app manifest with reachable icons', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();

  const response = await request.get(href!);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();

  expect(manifest.name).toBeTruthy();
  expect(manifest.start_url).toBe('/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThan(0);

  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok(), `${icon.src} should load`).toBe(true);
  }
});

test('site files have the site URL filled in', async ({ request }) => {
  for (const path of [
    '/robots.txt',
    '/sitemap.xml',
    '/.well-known/security.txt',
  ]) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(await response.text(), path).not.toMatch(/%SITE_(URL|HOST)%/);
  }
  const page = await request.get('/');
  expect(await page.text()).not.toMatch(/%SITE_(URL|HOST)%/);
});

test('has an offline fallback page', async ({ request }) => {
  const response = await request.get('/offline.html');
  expect(response.ok()).toBe(true);
});

test('skip link is hidden until it receives focus', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'keyboard navigation');
  await page.goto('/');
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });

  const hidden = await skipLink.boundingBox();
  expect(hidden!.y + hidden!.height).toBeLessThanOrEqual(0);

  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  const shown = await skipLink.boundingBox();
  expect(shown!.y).toBeGreaterThanOrEqual(0);
});

test('does not scroll horizontally', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test.describe('share button', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'needs clipboard permissions, which only Chromium can grant'
  );
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies the link when Web Share is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined });
    });
    await page.goto('/');

    await page.getByRole('button', { name: /Share App/ }).click();

    await expect(page.locator('.in-app-notification')).toContainText(
      'Link Copied'
    );
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      page.url()
    );
  });
});
