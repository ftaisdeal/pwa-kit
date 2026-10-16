import { expect, test } from '@playwright/test';

// Service worker behavior: only runs in the "PWA Tests" project

test.beforeEach(async ({ page }) => {
  await page.route('https://www.gstatic.com/**', (route) =>
    route.fulfill({ status: 204 })
  );
  await page.route('https://httpbin.org/**', (route) =>
    route.fulfill({ status: 200 })
  );
});

// The first visit installs the worker; the next load is controlled by it
async function visitTwice(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
}

test('registers a service worker that takes control on the next visit', async ({
  page,
}) => {
  await visitTwice(page);

  const scope = await page.evaluate(
    async () => (await navigator.serviceWorker.getRegistration())?.scope
  );
  expect(scope).toBe(new URL('/', page.url()).href);
});

test('does not reload the page or prompt on a normal visit', async ({
  page,
}) => {
  let loads = 0;
  page.on('load', () => loads++);

  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(1000);

  expect(loads).toBe(1);
  await expect(page.locator('.update-prompt')).toHaveCount(0);
});

test('works offline once installed', async ({ page, context }) => {
  await visitTwice(page);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'PWA Kit Modern'
  );
  await expect(page.locator('#container')).toContainText(
    'No internet connection'
  );

  await context.setOffline(false);
});
