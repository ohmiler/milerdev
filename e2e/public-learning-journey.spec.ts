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

    const cards = page.locator('.courses-grid .course-card');
    expect(await cards.count()).toBeGreaterThan(0);

    const evidenceCard = page.locator(
      '.courses-grid .course-card:has(.course-card__tags):has(.course-card__preview):has(.course-card__instructor)',
    ).first();

    await expect(evidenceCard).toBeVisible();
    await expect(evidenceCard.locator('.course-card__lessons')).toBeVisible();
    await expect(evidenceCard.locator('.course-card__preview')).toBeVisible();
    await expect(evidenceCard.locator('.course-card__instructor')).toBeVisible();
    await expect(evidenceCard.locator('.cc-cta')).toContainText('ทดลองบทเรียนฟรี');
  });
});
