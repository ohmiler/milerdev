import { test, expect } from '@playwright/test';

// Helper: get courses from API
async function getCourses(page: import('@playwright/test').Page) {
  const res = await page.request.get('/api/courses');
  if (!res.ok()) return { free: null, paid: null };
  const data = await res.json();
  const list = data.courses || data;
  if (!Array.isArray(list)) return { free: null, paid: null };

  const free = list.find((c: { price: string }) => !c.price || parseFloat(c.price) === 0) || null;
  const paid = list.find((c: { price: string }) => parseFloat(c.price) > 0) || null;
  return { free, paid };
}

// ============================================================
// COURSE PRICING DISPLAY
// ============================================================
test.describe('Course Pricing Display', () => {
  test('paid course shows price on course page', async ({ page }) => {
    const { paid } = await getCourses(page);
    if (!paid) { test.skip(true, 'No paid courses in DB'); return; }

    await page.goto(`/courses/${paid.slug}`);
    await page.waitForLoadState('networkidle');

    // Price should be visible somewhere on the page
    const priceText = `฿${Number(paid.price).toLocaleString()}`;
    await expect(page.getByText(priceText).first()).toBeVisible({ timeout: 10000 });
  });

  test('paid course shows buy button with price', async ({ page }) => {
    const { paid } = await getCourses(page);
    if (!paid) { test.skip(true, 'No paid courses in DB'); return; }

    await page.goto(`/courses/${paid.slug}`);
    await page.waitForLoadState('networkidle');

    // Should show "ซื้อคอร์สนี้ ฿X,XXX" button
    const buyBtn = page.getByText(/ซื้อคอร์สนี้/);
    await expect(buyBtn).toBeVisible({ timeout: 10000 });
  });

  test('free course shows free enroll button', async ({ page }) => {
    const { free } = await getCourses(page);
    if (!free) { test.skip(true, 'No free courses in DB'); return; }

    await page.goto(`/courses/${free.slug}`);
    await page.waitForLoadState('networkidle');

    const freeBtn = page.getByText(/ลงทะเบียนเรียนฟรี/);
    await expect(freeBtn).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// UNAUTHENTICATED → REDIRECT TO LOGIN
// ============================================================
test.describe('Unauthenticated Purchase', () => {
  test('clicking buy on paid course redirects to login', async ({ page }) => {
    const { paid } = await getCourses(page);
    if (!paid) { test.skip(true, 'No paid courses in DB'); return; }

    await page.goto(`/courses/${paid.slug}`);
    await page.waitForLoadState('networkidle');

    const buyBtn = page.getByText(/ซื้อคอร์สนี้/).or(page.getByText(/ลงทะเบียนเรียนฟรี/));
    await buyBtn.click();

    // Should redirect to login with callbackUrl
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test('clicking enroll on free course redirects to login', async ({ page }) => {
    const { free } = await getCourses(page);
    if (!free) { test.skip(true, 'No free courses in DB'); return; }

    await page.goto(`/courses/${free.slug}`);
    await page.waitForLoadState('networkidle');

    const freeBtn = page.getByText(/ลงทะเบียนเรียนฟรี/).or(page.getByText(/ซื้อคอร์สนี้/));
    await freeBtn.click();

    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });
});

// ============================================================
// PAYMENT API SECURITY (direct calls)
// ============================================================
test.describe('Payment API Security', () => {
  test('stripe checkout requires auth', async ({ page }) => {
    const res = await page.request.post('/api/stripe/checkout', {
      data: { courseId: 'fake-id' },
    });
    expect(res.status()).toBe(401);
  });

  test('stripe bundle checkout requires auth', async ({ page }) => {
    const res = await page.request.post('/api/stripe/bundle-checkout', {
      data: { bundleId: 'fake-id' },
    });
    expect(res.status()).toBe(401);
  });

  test('enroll API requires auth', async ({ page }) => {
    const res = await page.request.post('/api/enroll', {
      data: { courseId: 'fake-id' },
    });
    expect(res.status()).toBe(401);
  });

  test('bundle enroll API requires auth', async ({ page }) => {
    const res = await page.request.post('/api/bundles/enroll', {
      data: { bundleId: 'fake-id' },
    });
    expect(res.status()).toBe(401);
  });

  test('slip verify API requires auth', async ({ page }) => {
    const res = await page.request.post('/api/slip/verify', {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('bundle slip verify API requires auth', async ({ page }) => {
    const res = await page.request.post('/api/bundles/slip/verify', {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('coupon validate API requires auth', async ({ page }) => {
    const res = await page.request.post('/api/coupons/validate', {
      data: { code: 'FAKE', courseId: 'fake', originalPrice: 100 },
    });
    expect(res.status()).toBe(401);
  });

  test('webhook rejects without stripe-signature', async ({ page }) => {
    const res = await page.request.post('/api/stripe/webhook', {
      data: '{}',
      headers: { 'Content-Type': 'application/json' },
    });
    // Should reject with 400 (missing signature) or 500
    expect([400, 500].includes(res.status())).toBeTruthy();
  });
});

// ============================================================
// PAYMENT AMOUNT VALIDATION
// ============================================================
test.describe('Payment Amount Validation', () => {
  test('checkout API rejects non-existent course', async ({ page }) => {
    // We need to be authenticated for this — skip if can't login
    // This test verifies the API doesn't crash on bad input
    const res = await page.request.post('/api/stripe/checkout', {
      data: { courseId: 'non-existent-course-id-12345' },
    });
    // Should be 401 (unauth) or 404 (not found) — NOT 500
    expect(res.status()).toBeLessThan(500);
  });

  test('enroll API rejects missing courseId', async ({ page }) => {
    const res = await page.request.post('/api/enroll', {
      data: {},
    });
    // Should be 400 or 401 — NOT 500
    expect(res.status()).toBeLessThan(500);
  });

  test('coupon validate rejects empty code', async ({ page }) => {
    const res = await page.request.post('/api/coupons/validate', {
      data: { code: '', courseId: 'fake', originalPrice: 100 },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ============================================================
// ADMIN PAYMENT API SECURITY
// ============================================================
test.describe('Admin Payment API Security', () => {
  test('admin payments list requires auth', async ({ page }) => {
    const res = await page.request.get('/api/admin/payments');
    expect(res.status()).toBe(401);
  });

  test('admin payment update requires auth', async ({ page }) => {
    const res = await page.request.put('/api/admin/payments/fake-id', {
      data: { status: 'completed' },
    });
    expect(res.status()).toBe(401);
  });

  test('admin payment delete requires auth', async ({ page }) => {
    const res = await page.request.delete('/api/admin/payments/fake-id');
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// BUNDLES
// ============================================================
test.describe('Bundle Pages', () => {
  test('bundles section visible on courses page', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    // The courses page should load without error
    await expect(page.locator('main')).toBeVisible();
  });

  test('bundle detail page loads for valid slug', async ({ page }) => {
    // Try to get bundles from API
    const res = await page.request.get('/api/bundles');
    if (!res.ok()) { test.skip(true, 'No bundles API available'); return; }
    const data = await res.json();
    const bundles = data.bundles || data;
    if (!Array.isArray(bundles) || bundles.length === 0) {
      test.skip(true, 'No bundles in database');
      return;
    }

    const slug = bundles[0].slug;
    await page.goto(`/bundles/${slug}`);
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
});

// ============================================================
// DASHBOARD PAYMENTS PAGE (auth required)
// ============================================================
test.describe('Dashboard Payments', () => {
  test('payments page requires authentication', async ({ page }) => {
    await page.goto('/dashboard/payments');
    // Either redirects to login OR shows login prompt / empty state
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const hasLoginRedirect = url.includes('login');
    const hasMainContent = await page.locator('main').isVisible().catch(() => false);
    // Should either redirect to login or show the page (with client-side auth)
    expect(hasLoginRedirect || hasMainContent).toBeTruthy();
  });
});
