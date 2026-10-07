import { expect, test, type Page } from '@playwright/test';

// ADR 0012. Reviews appear only when the database has verified reviews to show.
const HOME_SECTION_ORDER = [
  'hero',
  'how',
  'courses',
  'studio-proof',
  'reviews',
  'faq',
  'final-cta',
] as const;

async function renderedSections(page: Page) {
  return page.locator('[data-home-section]').evaluateAll((sections) =>
    sections.map((section) => section.getAttribute('data-home-section')),
  );
}

test.describe('public homepage', () => {
  test('keeps the mobile journey ordered, with both actions on the first screen and no page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const rendered = await renderedSections(page);
    expect(rendered).toEqual(HOME_SECTION_ORDER.filter((section) => section !== 'reviews' || rendered.includes('reviews')));

    const positions = await page.locator('[data-home-section]').evaluateAll((sections) =>
      sections.map((section) => Math.round(section.getBoundingClientRect().top + window.scrollY)),
    );
    expect(positions).toEqual([...positions].sort((left, right) => left - right));

    const hero = page.locator('[data-home-section=hero]');
    for (const name of ['ดูคอร์สทั้งหมด', 'ทดลองบทเรียนฟรี']) {
      const box = await hero.getByRole('link', { name }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.getByRole('button', { name: 'เปิดเมนูหลัก' }).click();
    const menu = page.getByRole('dialog', { name: 'MilerDev' }).getByRole('navigation', { name: 'ลิงก์หลัก' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link', { name: 'คอร์สทั้งหมด' })).toBeVisible();
  });

  test('fits the hero in the desktop fold and keeps a measurable section rhythm', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const heroBox = await page.locator('[data-home-section=hero]').boundingBox();
    expect(heroBox).not.toBeNull();
    expect(heroBox!.y + heroBox!.height).toBeLessThanOrEqual(900);

    // ADR 0014: the title sits on two lines on desktop.
    const titleLines = await page.locator('#home-hero-title').evaluate((title) =>
      Math.round(title.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(title).lineHeight)),
    );
    expect(titleLines).toBe(2);

    const paddings = await page
      .locator('[data-home-section]:not([data-home-section=hero])')
      .evaluateAll((sections) =>
        sections.map((section) => {
          const style = getComputedStyle(section);
          return { top: Number.parseFloat(style.paddingTop), bottom: Number.parseFloat(style.paddingBottom) };
        }),
      );
    for (const padding of paddings) {
      expect(padding.top).toBeGreaterThanOrEqual(88);
      expect(padding.bottom).toBeGreaterThanOrEqual(88);
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('types the hero page into the preview and lets the visitor open each file', async ({ page }) => {
    await page.goto('/');

    const hero = page.locator('[data-home-section=hero]');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/เรียนให้เข้าใจ\s*สร้างได้จริง\s*เติบโตเป็น\s*Developer/);
    await expect(hero.locator('[data-home-preview]')).toContainText('กาแฟคั่วสด', { timeout: 10_000 });

    await hero.getByRole('button', { name: 'index.css' }).click();
    await expect(hero.getByRole('button', { name: 'index.css' })).toHaveAttribute('aria-pressed', 'true');
    await expect(hero.locator('[data-home-editor]')).toContainText('border-radius: 999px;');
    await expect(hero.getByRole('button', { name: 'เล่นการพิมพ์โค้ดตัวอย่างอีกครั้ง' })).toBeVisible();
  });

  test('shows the finished program at once for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.locator('[data-home-preview]')).toContainText('สั่งเลย', { timeout: 1_000 });
  });

  test('shows real learning screens, static teaching proof, and canonical purchase answers', async ({ page }) => {
    await page.goto('/');

    const how = page.locator('[data-home-section=how]');
    await expect(how.getByRole('heading', { name: 'เห็นบทเรียนทั้งคอร์สก่อนเริ่ม', exact: true })).toBeVisible();
    await expect(how.getByRole('heading', { name: 'ดูวิดีโอและอ่านเนื้อหาประกอบในหน้าเดียว', exact: true })).toBeVisible();

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
