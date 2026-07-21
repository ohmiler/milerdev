import { expect, test } from '@playwright/test';

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
  { width: 1600, height: 900 },
] as const;

test.describe('public learning journey', () => {
  test('keeps Home, catalog, and course detail within representative viewport widths', async ({ page }) => {
    const response = await page.request.get('/api/courses');
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const courses = payload.courses || payload;
    const course = courses[0];
    test.skip(!course, 'No published course in local data');

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      for (const route of ['/', '/courses', `/courses/${course.slug}`]) {
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

  test('catalog keeps included bundle courses visible on mobile', async ({ page }) => {
    const response = await page.request.get('/api/bundles');
    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    const bundle = payload.bundles?.find((item: { courses?: unknown[] }) => item.courses?.length);
    test.skip(!bundle, 'No published bundle with courses in local data');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/courses');

    const bundleRegion = page.getByRole('region', { name: 'ถ้าอยากเรียนต่อเนื่อง ลองดูแบบชุด' });
    const bundleLink = bundleRegion.getByRole('link').filter({ hasText: bundle.title }).first();

    await expect(bundleLink.getByText(bundle.courses[0].courseTitle, { exact: true })).toBeVisible();
  });

  test('catalog preserves a no-result search and offers a clear reset path', async ({ page }) => {
    await page.goto('/courses');

    const filters = page.getByRole('complementary', { name: 'ตัวกรองคอร์ส' });
    await expect(filters.getByRole('link', { name: 'ล้างตัวกรอง' })).toHaveCount(0);

    await page.getByRole('searchbox', { name: 'ค้นหาจากชื่อคอร์ส' }).fill('no-course-matches-this-query-9f4e');
    await page.getByRole('button', { name: 'แสดงผลลัพธ์' }).click();

    await expect(page).toHaveURL(/\/courses\?search=no-course-matches-this-query-9f4e/);
    await expect(page.getByRole('searchbox', { name: 'ค้นหาจากชื่อคอร์ส' })).toHaveValue(
      'no-course-matches-this-query-9f4e',
    );
    await expect(page.getByRole('heading', { name: 'ไม่พบคอร์สตามเงื่อนไขนี้' })).toBeVisible();

    const resetFilters = filters.getByRole('link', { name: 'ล้างตัวกรอง' });
    await expect(resetFilters).toBeVisible();
    await expect(resetFilters).toHaveAttribute('href', '/courses');

    await resetFilters.click();

    await expect(page).toHaveURL('/courses');
    await expect(page.getByRole('searchbox', { name: 'ค้นหาจากชื่อคอร์ส' })).toHaveValue('');
  });

  test('course detail presents decision evidence before enrollment', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    const response = await page.request.get('/api/courses');
    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    const courses = payload.courses || payload;
    const course = courses[0];
    test.skip(!course, 'No published course in local data');

    await page.goto(`/courses/${course.slug}`);

    const skipLink = page.getByRole('link', { name: 'ข้ามไปดูเนื้อหาคอร์ส' });
    for (let tabIndex = 0; tabIndex < 3 && !(await skipLink.evaluate((element) => element === document.activeElement)); tabIndex += 1) {
      await page.keyboard.press('Tab');
    }
    await expect(skipLink).toBeFocused();

    await expect(page.getByRole('heading', { level: 1, name: course.title })).toBeVisible();

    const evidence = page.getByRole('region', { name: 'ข้อมูลประกอบการตัดสินใจ' });
    await expect(evidence).toContainText(`${course.lessonCount} บท`);

    const sectionNavigation = page.getByRole('navigation', { name: 'ส่วนต่าง ๆ ของคอร์ส' });
    await expect(sectionNavigation.getByRole('link', { name: 'ภาพรวม' })).toHaveAttribute('href', '#course-overview');
    await expect(sectionNavigation.getByRole('link', { name: 'เนื้อหาคอร์ส' })).toHaveAttribute('href', '#course-curriculum');
    await expect(sectionNavigation.getByRole('link', { name: 'รีวิวผู้เรียน' })).toHaveAttribute('href', '#course-reviews');

    await expect(page.getByRole('heading', { level: 2, name: 'รายละเอียดคอร์ส' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'เส้นทางการเรียน' })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('free preview uses the focused learning workspace and recoverable lesson rail', async ({ page }) => {
    const response = await page.request.get('/api/courses');
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const courses = payload.courses || payload;
    const course = courses[0];
    test.skip(!course, 'No published course in local data');

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/courses/${course.slug}`);

    const previewLesson = page.getByRole('button', { name: /ดูฟรี/ }).first();
    test.skip(await previewLesson.count() === 0, 'No public preview lesson in local data');
    await previewLesson.click();

    await expect(page.getByRole('banner', { name: 'แถบควบคุมการเรียน' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'สถานะและการเรียนต่อ' })).toContainText('บทเรียนทดลองฟรี');

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(dimensions.scrollWidth, `learning workspace at ${viewport.width}px`).toBe(
        dimensions.clientWidth,
      );
    }

    await page.setViewportSize({ width: 1280, height: 900 });

    const rail = page.getByRole('complementary', { name: 'ลำดับบทเรียน' });
    const main = page.getByRole('main');
    const [railBox, mainBox] = await Promise.all([rail.boundingBox(), main.boundingBox()]);
    expect(railBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    expect(railBox!.x).toBeLessThan(mainBox!.x);

    const currentLesson = rail.locator('a[aria-current="page"]');
    await expect(currentLesson).toHaveCount(1);
    await expect(currentLesson).toContainText('ฟรี');

    const lockedLesson = rail.getByRole('button', { name: /ต้องสมัครเรียนก่อน/ }).first();
    await lockedLesson.click();
    await expect(page.getByRole('heading', { name: /บทเรียนนี้ต้องลงทะเบียน/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ลงทะเบียนเรียน' })).toHaveAttribute('href', `/courses/${course.slug}`);
    await page.getByRole('button', { name: 'กลับไปดูบทเรียนปัจจุบัน' }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    const openRail = page.getByRole('button', { name: 'เปิดรายการบทเรียน', exact: true });
    await openRail.click();

    const closeRail = page.getByRole('button', { name: 'ปิดรายการบทเรียน', exact: true });
    await expect(closeRail).toBeFocused();
    await closeRail.click();
    await expect(openRail).toBeFocused();
    await openRail.click();
    await expect(closeRail).toBeFocused();
    const search = page.getByRole('textbox', { name: 'ค้นหาบทเรียน' });
    await search.fill('no-lesson-matches-this-query');
    await expect(rail).toContainText('ไม่พบบทเรียนที่ตรงกับ');
    await page.keyboard.press('Escape');
    await expect(openRail).toBeFocused();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  });
});
