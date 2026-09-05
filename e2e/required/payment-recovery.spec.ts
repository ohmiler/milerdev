import { expect, test, type Page } from '@playwright/test';
import { E2E_FIXTURES } from '../fixtures';
import { installRequiredE2EProviderMocks } from './provider-mock-adapter.mjs';
import { recoveryEnrollmentCount, seedPaymentRecovery } from './payment-recovery-fixtures';

let fixtureClient = 20;
async function register(page: Page) {
  // Distinct synthetic buyers use distinct reverse-proxy client identities; real rate limits remain enabled.
  await page.context().setExtraHTTPHeaders({ 'x-real-ip': `192.0.2.${++fixtureClient}` });
  const id = crypto.randomUUID().replaceAll('-', '');
  const password = 'Aa1!' + id;
  await page.goto('/register?callbackUrl=%2Fdashboard%2Fpayments');
  await page.locator('input[name=name]').fill('ผู้ซื้อทดสอบการติดตามรายการ');
  await page.locator('input[name=email]').fill(`payment-recovery-${id}@example.test`);
  await page.locator('input[name=password]').fill(password);
  await page.locator('input[name=confirmPassword]').fill(password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard/payments');
  const session = await (await page.request.get('/api/auth/session')).json();
  expect(typeof session.user.id).toBe('string');
  return session.user.id as string;
}

for (const type of ['course', 'bundle'] as const) {
  test(`${type} exact Stripe replay repairs access without substituting the latest attempt`, async ({ page, browser }, testInfo) => {
    test.setTimeout(90_000);
    const baseURL = String(testInfo.project.use.baseURL);
    const network = await installRequiredE2EProviderMocks(page, baseURL);
    const userId = await register(page);
    const fixture = await seedPaymentRecovery(userId, type);
    const product = type === 'course' ? E2E_FIXTURES.courses.longThai : E2E_FIXTURES.bundle;
    const path = `/${type === 'course' ? 'courses' : 'bundles'}/${product.slug}/payment-success`;
    await page.goto(`/dashboard/payments/${fixture.id}`);
    await expect(page.getByRole('heading', { level: 1, name: 'ชำระแล้ว กำลังเปิดสิทธิ์' })).toBeVisible();
    await expect(page.getByRole('main').getByText('฿490.25', { exact: true })).toBeVisible();
    expect(await recoveryEnrollmentCount(userId)).toBe(0);
    await page.goto(`${path}?session_id=${fixture.sessionId}`);
    await expect(page).toHaveURL(new RegExp(`${fixture.sessionId}$`));
    await expect(page.getByRole('heading', { level: 1, name: 'ชำระแล้ว พร้อมเริ่มเรียน' })).toBeVisible();
    await expect(page.getByRole('main').getByText(fixture.id, { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('฿490.25', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText(fixture.latest, { exact: true })).toHaveCount(0);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'ชำระแล้ว พร้อมเริ่มเรียน' })).toBeVisible();
    expect(await recoveryEnrollmentCount(userId)).toBe(type === 'course' ? 1 : 2);
    await page.goto('/dashboard/payments');
    await expect(page.getByRole('main').getByText(fixture.id, { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText(fixture.latest, { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('ชำระเงินไม่สำเร็จ', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('คืนเงินแล้ว', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'กลับไปเลือกวิธีชำระเงิน' })).toHaveCount(0);

    const guest = await browser.newContext({ baseURL });
    const guestPage = await guest.newPage();
    await installRequiredE2EProviderMocks(guestPage, baseURL);
    await guestPage.goto(`${path}?session_id=${fixture.sessionId}`);
    await expect(guestPage).toHaveURL(/\/login\?/);
    expect(new URL(guestPage.url()).searchParams.get('callbackUrl')).toBe(`${path}/${fixture.sessionId}`);
    await guest.close();
    // A second authenticated owner cannot read the record or fulfill the first owner's return.
    await page.context().clearCookies();
    await register(page);
    await page.goto(`/dashboard/payments/${fixture.id}`);
    await expect(page.getByRole('heading', { name: 'ไม่พบหน้าที่คุณต้องการ' })).toBeVisible();
    await expect(page.getByRole('main').getByText(fixture.id, { exact: true })).toHaveCount(0);
    await page.goto(`${path}?session_id=${fixture.sessionId}`);
    await expect(page.getByRole('heading', { level: 1, name: 'ยังยืนยันรายการนี้ไม่ได้' })).toBeVisible();
    await expect(page.getByRole('main').getByText(fixture.id, { exact: true })).toHaveCount(0);
    expect(network.blockedRequests).toEqual([]);
  });

  test(`${type} resumes the same owner-checked PromptPay attempt from history after reload`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const network = await installRequiredE2EProviderMocks(page, String(testInfo.project.use.baseURL));
    await register(page);
    const product = type === 'course' ? E2E_FIXTURES.courses.longThai : E2E_FIXTURES.bundle;
    const response = await page.request.post('/api/promptpay/intents', { data: type === 'course' ? { courseId: product.id } : { bundleId: product.id } });
    expect(response.status()).toBe(201);
    const intent = await response.json();
    let newAttempts = 0;
    page.on('request', (request) => { if (request.url().endsWith('/api/promptpay/intents') && request.method() === 'POST') newAttempts += 1; });
    await page.reload();
    await expect(page.getByRole('main').getByText(intent.paymentId, { exact: true })).toBeVisible();
    const trigger = page.getByRole('button', { name: 'แนบสลิปในรายการเดิม' });
    await page.setViewportSize({ width: 320, height: 900 });
    await trigger.focus(); await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'แนบสลิปในรายการเดิม' });
    await expect(dialog.getByText(intent.paymentId, { exact: true })).toBeVisible();
    await expect(dialog.getByText('เลขบัญชี', { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: /Stripe/ })).toHaveCount(0);
    await dialog.getByLabel('แนบสลิปการโอนเงิน').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('fixture-only') });
    await dialog.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' }).click();
    await expect(dialog.getByText('ยังดำเนินการไม่สำเร็จ', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' }).click();
    await expect(dialog.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' })).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(newAttempts).toBe(0);
    expect(network.blockedRequests).toEqual([]);
  });
}
