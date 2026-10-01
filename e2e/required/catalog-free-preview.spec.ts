import { expect, test } from '@playwright/test';

import { E2E_FIXTURES } from '../fixtures';

test('home free-preview call to action opens a catalog filtered to free-preview courses', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /ทดลองบทเรียนฟรี/ }).first().click();

  await expect(page).toHaveURL(/\/courses\?preview=free$/);
  await expect(page.getByRole('link', { name: /ลบตัวกรอง มีบทเรียนทดลองฟรี/ })).toBeVisible();
  await expect(page.getByText(E2E_FIXTURES.courses.free.title).first()).toBeVisible();
  await expect(page.getByText(E2E_FIXTURES.courses.paid.title)).toHaveCount(0);

  await page.getByRole('link', { name: /ลบตัวกรอง มีบทเรียนทดลองฟรี/ }).click();
  await expect(page).toHaveURL(/\/courses$/);
  await expect(page.getByText(E2E_FIXTURES.courses.paid.title).first()).toBeVisible();
});
