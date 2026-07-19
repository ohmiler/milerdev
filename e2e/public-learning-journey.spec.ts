import { expect, test } from '@playwright/test';

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
  { width: 1600, height: 900 },
] as const;

test.describe('public learning journey', () => {
  test('keeps Home and catalog within representative viewport widths', async ({ page }) => {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      for (const route of ['/', '/courses']) {
        await page.goto(route);
        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));

        expect(dimensions.scrollWidth, `${route} at ${viewport.width}px`).toBe(dimensions.clientWidth);
      }
    }
  });

  test('catalog surfaces the same available decision evidence as Home', async ({ page }) => {
    await page.goto('/courses');

    const catalog = page.getByRole('region', { name: 'คอร์สทั้งหมด' });
    const cards = catalog.getByRole('link').filter({ hasText: /\d+ บทเรียน/ });
    expect(await cards.count()).toBeGreaterThan(0);

    const evidenceCard = cards
      .filter({ hasText: 'มีบทเรียนทดลอง' })
      .filter({ hasText: /สอนโดย/ })
      .first();

    await expect(evidenceCard).toBeVisible();
    await expect(evidenceCard).toContainText(/\d+ บทเรียน/);
    await expect(evidenceCard).toContainText('มีบทเรียนทดลอง');
    await expect(evidenceCard).toContainText(/สอนโดย/);
    await expect(evidenceCard).toContainText('ทดลองบทเรียนฟรี');
  });

  test('catalog preserves a no-result search and offers a clear reset path', async ({ page }) => {
    await page.goto('/courses');

    await page.getByRole('searchbox', { name: 'ค้นหาจากชื่อคอร์ส' }).fill('no-course-matches-this-query-9f4e');
    await page.getByRole('button', { name: 'แสดงผลลัพธ์' }).click();

    await expect(page).toHaveURL(/\/courses\?search=no-course-matches-this-query-9f4e/);
    await expect(page.getByRole('searchbox', { name: 'ค้นหาจากชื่อคอร์ส' })).toHaveValue(
      'no-course-matches-this-query-9f4e',
    );
    await expect(page.getByRole('heading', { name: 'ไม่พบคอร์สตามเงื่อนไขนี้' })).toBeVisible();

    await page.getByRole('main').getByRole('link', { name: 'ดูคอร์สทั้งหมด' }).click();

    await expect(page).toHaveURL('/courses');
    await expect(page.getByRole('searchbox', { name: 'ค้นหาจากชื่อคอร์ส' })).toHaveValue('');
  });
});
