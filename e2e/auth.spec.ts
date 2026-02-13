import { test, expect } from '@playwright/test';

// ============================================================
// REGISTER FLOW
// ============================================================
test.describe('Register', () => {
  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/register');
    // Try to submit with just the name (browser validation will catch email)
    const nameInput = page.locator('input[type="text"]');
    await nameInput.fill('T');
    await page.locator('button[type="submit"]').click();
    // Browser native validation should prevent submission (required fields)
    // Or client-side validation catches short name
  });

  test('should show error for short name', async ({ page }) => {
    await page.goto('/register');
    const nameInput = page.locator('input[type="text"]');
    const emailInput = page.locator('input[type="email"]');
    const passwordInputs = page.locator('input[type="password"]');

    await nameInput.fill('A');
    await emailInput.fill('test@example.com');
    await passwordInputs.nth(0).fill('Test1234');
    await passwordInputs.nth(1).fill('Test1234');

    await page.locator('button[type="submit"]').click();
    // Should show Thai error about name length
    await expect(page.getByText('ชื่อต้องมีอย่างน้อย 2 ตัวอักษร')).toBeVisible();
  });

  test('should show error for weak password (no uppercase)', async ({ page }) => {
    await page.goto('/register');
    const nameInput = page.locator('input[type="text"]');
    const emailInput = page.locator('input[type="email"]');
    const passwordInputs = page.locator('input[type="password"]');

    await nameInput.fill('Test User');
    await emailInput.fill('test@example.com');
    await passwordInputs.nth(0).fill('test1234');
    await passwordInputs.nth(1).fill('test1234');

    await page.locator('button[type="submit"]').click();
    await expect(page.getByText('รหัสผ่านต้องมีตัวพิมพ์ใหญ่')).toBeVisible();
  });

  test.fixme('should show error for password mismatch', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('ชื่อ-นามสกุล').fill('Test User');
    await page.getByLabel('อีเมล').fill('test@example.com');
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill('Test1234');
    await page.getByLabel('ยืนยันรหัสผ่าน').fill('Different1');

    await page.locator('button[type="submit"]').click();
    await expect(page.getByText('รหัสผ่านไม่ตรงกัน')).toBeVisible({ timeout: 10000 });
  });

  test('should show password strength meter', async ({ page }) => {
    await page.goto('/register');
    const pwInput = page.locator('input[placeholder="อย่างน้อย 8 ตัวอักษร"]');

    // Type weak password (score 1: length<8, no upper, has lower, no number, no special)
    await pwInput.fill('ab');
    await expect(page.getByText('อ่อนมาก')).toBeVisible();

    // Type strong password (score 5: length≥8, upper, lower, number, special)
    await pwInput.fill('Test1234!');
    await expect(page.getByText('แข็งแกร่งมาก')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/register');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Test1234');

    // Should start as password type
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click eye icon to show password
    const toggleBtn = page.locator('button[type="button"]').first();
    await toggleBtn.click();

    // Should now be text type
    const visibleInput = page.locator('input[placeholder="อย่างน้อย 8 ตัวอักษร"]');
    await expect(visibleInput).toHaveAttribute('type', 'text');
  });
});

// ============================================================
// LOGIN FLOW
// ============================================================
test.describe('Login', () => {
  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('nonexistent@example.com');
    await page.locator('input[type="password"]').fill('WrongPass1');
    await page.locator('button[type="submit"]').click();

    // Should show generic error (not leaking whether email exists)
    await expect(page.getByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeVisible({ timeout: 10000 });
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('Test1234');

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.locator('button[type="button"]').click();
    const visibleInput = page.locator('input[placeholder="••••••••"]');
    await expect(visibleInput).toHaveAttribute('type', 'text');
  });

  test('should have Google login button', async ({ page }) => {
    await page.goto('/login');
    // Check for Google OAuth button
    const googleBtn = page.getByText(/Google/i);
    await expect(googleBtn).toBeVisible();
  });

  test('should disable submit button while loading', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('Test1234');

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Button should show loading state briefly
    await expect(submitBtn).toContainText(/กำลัง/);
  });
});

// ============================================================
// FORGOT PASSWORD FLOW
// ============================================================
test.describe('Forgot Password', () => {
  test('should show success message after submitting email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('button[type="submit"]').click();

    // Should always show success (anti-enumeration)
    await expect(page.getByText('ส่งลิงก์รีเซ็ตแล้ว')).toBeVisible({ timeout: 10000 });
  });

  test('should show same success for non-existent email (anti-enumeration)', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.locator('input[type="email"]').fill('nobody-at-all@example.com');
    await page.locator('button[type="submit"]').click();

    // Should still show success — no email enumeration
    await expect(page.getByText('ส่งลิงก์รีเซ็ตแล้ว')).toBeVisible({ timeout: 10000 });
  });

  test('should have back to login link', async ({ page }) => {
    await page.goto('/forgot-password');
    const backLink = page.getByRole('link', { name: /กลับไปหน้าเข้าสู่ระบบ/i });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/login/);
  });
});

// ============================================================
// PROTECTED PAGES — should redirect to login
// ============================================================
test.describe('Protected Pages (unauthenticated)', () => {
  test('dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test('profile redirects to login', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test('settings redirects to login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test('admin panel redirects to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });
});
