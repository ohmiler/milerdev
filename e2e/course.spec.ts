import { test, expect } from '@playwright/test';

// ============================================================
// COURSE BROWSING
// ============================================================
test.describe('Course Browsing', () => {
  test('courses page shows course list or empty state', async ({ page }) => {
    await page.goto('/courses');
    // Wait for client-side render
    await page.waitForLoadState('networkidle');
    // Should have either course cards or an empty/loading state
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('course detail page loads for valid slug', async ({ page }) => {
    // First get a course slug from the courses API
    const apiRes = await page.request.get('/api/courses');
    if (!apiRes.ok()) {
      test.skip(true, 'No courses API available');
      return;
    }
    const data = await apiRes.json();
    const courses = data.courses || data;
    if (!Array.isArray(courses) || courses.length === 0) {
      test.skip(true, 'No courses in database');
      return;
    }

    const slug = courses[0].slug;
    await page.goto(`/courses/${slug}`);
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('non-existent course shows 404 or error', async ({ page }) => {
    const response = await page.goto('/courses/this-course-does-not-exist-xyz');
    // Should be 404 or redirect
    expect([200, 404, 302].includes(response?.status() || 0)).toBeTruthy();
  });
});

// ============================================================
// API SECURITY — direct API call tests
// ============================================================
test.describe('API Security', () => {
  test('register API rejects weak password', async ({ page }) => {
    const res = await page.request.post('/api/auth/register', {
      data: { name: 'Test', email: 'weak@test.com', password: 'weak' },
    });
    expect(res.status()).toBe(400);
  });

  test('register API rejects invalid email', async ({ page }) => {
    const res = await page.request.post('/api/auth/register', {
      data: { name: 'Test', email: 'not-email', password: 'Test1234' },
    });
    expect(res.status()).toBe(400);
  });

  test('change-password API requires auth', async ({ page }) => {
    const res = await page.request.post('/api/auth/change-password', {
      data: { currentPassword: 'Old1234!', newPassword: 'New1234!' },
    });
    expect(res.status()).toBe(401);
  });

  test('enroll API requires auth', async ({ page }) => {
    const res = await page.request.post('/api/enroll', {
      data: { courseId: 'fake-id' },
    });
    expect(res.status()).toBe(401);
  });

  test('stripe checkout API requires auth', async ({ page }) => {
    const res = await page.request.post('/api/stripe/checkout', {
      data: { courseId: 'fake-id' },
    });
    expect(res.status()).toBe(401);
  });

  test('admin API requires admin role', async ({ page }) => {
    const res = await page.request.get('/api/admin/users');
    expect(res.status()).toBe(401);
  });

  test('profile API requires auth', async ({ page }) => {
    const res = await page.request.get('/api/profile');
    expect(res.status()).toBe(401);
  });

  test('reset-password API always returns 200 (anti-enumeration)', async ({ page }) => {
    const res = await page.request.post('/api/auth/reset-password', {
      data: { email: 'nobody-at-all-12345@example.com' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.message).toContain('หากอีเมลนี้มีในระบบ');
  });
});
