import { expect, test } from '@playwright/test';

test.describe('public homepage', () => {
  test('recomposes without horizontal overflow and exposes mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const primaryCourseCta = page.getByRole('link', { name: 'ดูคอร์สทั้งหมด' }).first();
    await expect(primaryCourseCta).toHaveAttribute('href', '/courses');

    const courseEvidence = page.getByRole('region', { name: 'ข้อมูลคอร์สที่ใช้ตัดสินใจก่อนสมัคร' });
    await expect(courseEvidence).toBeVisible();
    await expect(courseEvidence).toHaveAttribute('data-source', 'featured-courses');

    const navbar = page.getByRole('navigation', { name: 'เมนูหลัก' });
    const brandLockup = navbar.locator('.nav-brand-lockup');
    await expect(brandLockup).not.toContainText('เรียนโค้ดออนไลน์');
    await expect.poll(() => brandLockup.evaluate((brand) => getComputedStyle(brand, '::after').content)).toBe('none');
    const courseGrid = page.locator('#featured-courses [data-count]');
    await expect.poll(() => courseGrid.evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)).toBe(1);
    const renderedCourseCount = Number(await courseGrid.getAttribute('data-count'));
    const reportedCourseCount = Number(await courseEvidence.getByRole('definition').first().textContent());
    expect(reportedCourseCount).toBe(renderedCourseCount);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    const featuredCoursesTop = await page.locator('#featured-courses').evaluate(
      (element) => Math.round(element.getBoundingClientRect().top + window.scrollY),
    );
    expect(featuredCoursesTop).toBeLessThanOrEqual(844 * 3);

    const learningWorkspaceTop = await page.locator('[aria-labelledby="learning-workspace-title"]').evaluate(
      (element) => Math.round(element.getBoundingClientRect().top + window.scrollY),
    );
    expect(featuredCoursesTop).toBeLessThan(learningWorkspaceTop);

    const main = page.getByRole('main');
    await expect(main.getByRole('article', { name: 'ตัวอย่างพื้นที่เรียนออนไลน์ของ MilerDev' })).toBeVisible();
    await expect(main.getByRole('heading', { level: 3, name: 'เข้าใจแนวคิด แล้วเขียนโค้ดให้เห็นผล' })).toBeVisible();
    await expect(main.getByRole('progressbar', { name: 'ตัวอย่างความคืบหน้าของผู้เรียน 60 เปอร์เซ็นต์' })).toBeVisible();
    await expect(main.locator('.affiliate-section')).toHaveCount(0);
    await expect(main.locator('a[href^="/bundles/"]')).toHaveCount(0);

    const menuButton = page.getByRole('button', { name: 'เปิดเมนูหลัก' });
    await menuButton.click();
    await expect(page.locator('#mobile-navigation')).toBeVisible();
    await expect(page.locator('#mobile-navigation a[href="/courses"]')).toBeVisible();

    await page.setViewportSize({ width: 768, height: 900 });
    await expect.poll(() => courseGrid.evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)).toBe(2);
  });

  test('presents a full editor workspace and preserves manual tab control', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    const editor = page.getByLabel('ตัวอย่างพื้นที่เขียนโค้ดของ MilerDev');
    const featuredCourseColumns = await page.locator('#featured-courses [data-count]').evaluate(
      (grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length,
    );
    expect(featuredCourseColumns).toBe(4);

    await expect(editor.getByRole('tab')).toHaveCount(3);
    await expect(editor).not.toContainText('RESULT');

    await editor.hover();
    await expect(editor).toHaveAttribute('data-playback', 'auto');
    await expect(editor.locator('.hero-code-editor__cursor')).toBeVisible();
    const cursorPosition = editor.locator('.hero-code-editor__status-group').first();
    await expect(cursorPosition).toHaveText(/Ln \d+, Col \d+/);
    const initialPosition = await cursorPosition.textContent();
    await expect.poll(() => cursorPosition.textContent()).not.toBe(initialPosition);
    const htmlTab = editor.getByRole('tab', { name: 'index.html' });
    const cssTab = editor.getByRole('tab', { name: 'styles.css' });
    await htmlTab.focus();
    await expect(editor).toHaveAttribute('data-playback', 'paused');

    await htmlTab.press('ArrowRight');
    await expect(cssTab).toHaveAttribute('aria-selected', 'true');
    await expect(editor).toHaveAttribute('data-playback', 'manual');
    await expect(editor.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'hero-code-tab-css');

    await page.getByRole('heading', { level: 1 }).click();
    await expect(editor).toHaveAttribute('data-playback', 'auto');
    await expect(editor.locator('.hero-code-editor__cursor')).toBeVisible();
    const jsTab = editor.getByRole('tab', { name: 'app.js' });
    await expect(jsTab).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });
    await expect(htmlTab).toHaveAttribute('aria-selected', 'true', { timeout: 30_000 });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(editor).toHaveAttribute('data-playback', 'reduced');
  });

  test('opens the teaching gallery with keyboard recovery', async ({ page }) => {
    await page.goto('/');

    const gallery = page.getByRole('region', { name: 'การสอนที่เกิดขึ้นนอกหน้าจอ' });
    await expect(gallery.getByRole('button')).toHaveCount(5);
    const firstImage = gallery.getByRole('button').first();

    await firstImage.focus();
    await firstImage.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('เวทีแบ่งปันประสบการณ์');
    await expect(dialog).toContainText('01 / 06');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(firstImage).toBeFocused();
  });
});
