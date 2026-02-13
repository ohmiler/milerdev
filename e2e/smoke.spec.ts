import { test, expect } from '@playwright/test';

// ============================================================
// PUBLIC PAGES — ทุกหน้าที่ไม่ต้อง login ต้องเปิดได้
// ============================================================
test.describe('Public Pages', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Miler/i);
    await expect(page.locator('nav')).toBeVisible();
  });

  test('courses page loads', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('nav')).toBeVisible();
    // Should have some content (heading or course cards)
    await expect(page.locator('main')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'สมัครสมาชิก' })).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /ลืมรหัสผ่าน/ })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('blog page loads', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('faq page loads', async ({ page }) => {
    await page.goto('/faq');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('main')).toBeVisible();
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('main')).toBeVisible();
  });
});

// ============================================================
// NAVIGATION — ลิงก์สำคัญทำงานถูกต้อง
// ============================================================
test.describe('Navigation', () => {
  test('login page has register link', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /สมัครสมาชิก/i });
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/register/);
  });

  test('register page has login link', async ({ page }) => {
    await page.goto('/register');
    const loginLink = page.getByRole('link', { name: /เข้าสู่ระบบ/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/login/);
  });

  test('login page has forgot password link', async ({ page }) => {
    await page.goto('/login');
    const forgotLink = page.getByRole('link', { name: /ลืมรหัสผ่าน/i });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await expect(page).toHaveURL(/forgot-password/);
  });
});

// ============================================================
// SECURITY HEADERS
// ============================================================
test.describe('Security Headers', () => {
  test('response includes security headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() || {};
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-xss-protection']).toBe('1; mode=block');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toBeTruthy();
  });
});
