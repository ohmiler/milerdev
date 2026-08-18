import { expect, test } from '@playwright/test';

const HOME_SECTION_ORDER = [
  'hero',
  'confidence',
  'outcomes',
  'courses',
  'studio-proof',
  'faq',
  'final-cta',
] as const;

test.describe('public homepage', () => {
  test('keeps the mobile journey ordered, scrollable, and free of page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'ดูคอร์สทั้งหมด' }).first()).toHaveAttribute('href', '/courses');

    const renderedOrder = await page.locator('[data-home-section]').evaluateAll((sections) =>
      sections.map((section) => section.getAttribute('data-home-section')),
    );
    expect(renderedOrder).toEqual(HOME_SECTION_ORDER);

    const positions = await page.locator('[data-home-section]').evaluateAll((sections) =>
      sections.map((section) => Math.round(section.getBoundingClientRect().top + window.scrollY)),
    );
    expect(positions).toEqual([...positions].sort((left, right) => left - right));

    const courseTrack = page.locator('[data-home-course-track]');
    if (await courseTrack.count()) {
      await expect.poll(() => courseTrack.evaluate((track) => getComputedStyle(track).display)).toBe('flex');

      const courseCount = Number(await courseTrack.getAttribute('data-count'));
      if (courseCount > 1) {
        await expect.poll(() => courseTrack.evaluate((track) => track.scrollWidth > track.clientWidth)).toBe(true);
      }

      await page.setViewportSize({ width: 768, height: 900 });
      await expect.poll(() => courseTrack.evaluate((track) => getComputedStyle(track).display)).toBe('grid');
      await expect
        .poll(() => courseTrack.evaluate((track) => getComputedStyle(track).gridTemplateColumns.split(' ').length))
        .toBe(2);
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'เปิดเมนูหลัก' }).click();
    await expect(page.locator('#mobile-navigation')).toBeVisible();
    await expect(page.locator('#mobile-navigation').getByRole('link', { name: 'คอร์สทั้งหมด' })).toBeVisible();
  });

  test('uses the approved desktop fold and measurable section rhythm', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const heroBox = await page.locator('[data-home-section=hero]').boundingBox();
    expect(heroBox).not.toBeNull();
    expect(heroBox!.height).toBeGreaterThanOrEqual(670);
    expect(heroBox!.height).toBeLessThanOrEqual(780);

    const confidenceTop = await page.locator('[data-home-section=confidence]').evaluate(
      (section) => Math.round(section.getBoundingClientRect().top + window.scrollY),
    );
    expect(confidenceTop).toBeGreaterThan(760);
    expect(confidenceTop).toBeLessThan(900);

    const standardSections = page.locator(
      '[data-home-section=outcomes], [data-home-section=courses], [data-home-section=studio-proof], [data-home-section=faq], [data-home-section=final-cta]',
    );
    const paddings = await standardSections.evaluateAll((sections) =>
      sections.map((section) => {
        const style = getComputedStyle(section);
        return { top: Number.parseFloat(style.paddingTop), bottom: Number.parseFloat(style.paddingBottom) };
      }),
    );
    for (const padding of paddings) {
      expect(padding.top).toBeGreaterThanOrEqual(88);
      expect(padding.bottom).toBeGreaterThanOrEqual(88);
    }

    const courseTrack = page.locator('[data-home-course-track]');
    if (await courseTrack.count()) {
      await expect
        .poll(() => courseTrack.evaluate((track) => getComputedStyle(track).gridTemplateColumns.split(' ').length))
        .toBe(4);
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('shows truthful confidence, static teaching proof, and canonical purchase answers', async ({ page }) => {
    await page.goto('/');

    for (const label of [
      'อธิบายเป็นภาษาไทย',
      'บันทึกความคืบหน้า',
      'เรียนซ้ำได้ตลอดชีพ',
      'Certificate เมื่อเรียนจบ',
      'เข้าใจเหตุผล',
      'สร้างด้วยตัวเอง',
      'ต่อยอดเป็นผลงาน',
    ]) {
      await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
    }

    const studio = page.locator('[data-home-section=studio-proof]');
    await expect(studio.getByRole('img')).toHaveCount(3);
    await expect(studio.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const faq = page.locator('[data-home-section=faq]');
    const triggers = faq.locator('[data-slot=accordion-trigger]');
    await expect(triggers).toHaveCount(5);

    const paymentQuestion = faq.getByRole('button', { name: 'ชำระเงินได้ช่องทางไหนบ้าง?' });
    await paymentQuestion.focus();
    await paymentQuestion.press('Enter');
    await expect(paymentQuestion).toHaveAttribute('aria-expanded', 'true');
    await expect(faq.getByText(/PromptPay/)).toBeVisible();
    await expect(faq.getByText(/Stripe/)).toBeVisible();
  });
});
