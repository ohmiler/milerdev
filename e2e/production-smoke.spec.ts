import { expect, test } from '@playwright/test';

test.describe('Production deployment', () => {
  test('health endpoint confirms the app and database are ready', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('homepage renders', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(/Miler/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('login page renders its credential fields', async ({ page }) => {
    const response = await page.goto('/login');

    expect(response?.ok()).toBe(true);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
