import { expect, test } from '@playwright/test';

test.describe('public homepage', () => {
  test('recomposes without horizontal overflow and exposes mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    const menuButton = page.getByRole('button', { name: 'เปิดเมนูหลัก' });
    await menuButton.click();
    await expect(page.locator('#mobile-navigation')).toBeVisible();
    await expect(page.locator('#mobile-navigation a[href="/courses"]')).toBeVisible();
  });

  test('opens the teaching gallery with keyboard recovery', async ({ page }) => {
    await page.goto('/');

    const gallery = page.getByRole('region', { name: 'การสอนที่เกิดขึ้นนอกหน้าจอ' });
    const firstImage = gallery.getByRole('button').first();

    await firstImage.focus();
    await firstImage.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(firstImage).toBeFocused();
  });
});
