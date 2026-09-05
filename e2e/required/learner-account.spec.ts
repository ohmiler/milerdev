import { expect, test } from '@playwright/test';
import { installRequiredE2EProviderMocks } from './provider-mock-adapter.mjs';

test('account preserves private destinations, saves a profile, and requires fresh credentials after password change', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.context().setExtraHTTPHeaders({ 'x-real-ip': '192.0.2.80' });
  const network = await installRequiredE2EProviderMocks(page, String(testInfo.project.use.baseURL));
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get('callbackUrl')).toBe('/profile');
  await page.getByRole('link', { name: /สมัครสมาชิกฟรี/ }).click();
  const id = crypto.randomUUID().replaceAll('-', '');
  const email = `account-journey-${id}@example.test`;
  const password = 'Aa1!' + id;
  await page.getByRole('main').locator('input[name=name]').fill('ผู้เรียนทดสอบ');
  await page.getByRole('main').locator('input[name=email]').fill(email);
  await page.getByRole('main').locator('input[name=password]').fill(password);
  await page.getByRole('main').locator('input[name=confirmPassword]').fill(password);
  await page.getByRole('main').locator('button[type=submit]').click();
  await page.waitForURL('**/profile');
  await expect(page.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' })).toBeDisabled();
  await page.getByLabel('ชื่อ', { exact: true }).fill('ผู้เรียน ทดสอบชื่อใบรับรอง');
  await page.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'อัปเดตโปรไฟล์สำเร็จ' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('ชื่อ', { exact: true })).toHaveValue('ผู้เรียน ทดสอบชื่อใบรับรอง');
  await expect(page.getByRole('main').getByText(/ใบรับรองที่ออกแล้วจะเก็บชื่อ/)).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto('/settings');
  await page.getByRole('button', { name: /เปลี่ยนรหัสผ่าน/ }).click();
  await page.getByLabel('รหัสผ่านปัจจุบัน', { exact: true }).fill(password);
  const nextPassword = 'Bb2!' + id;
  await page.getByLabel('รหัสผ่านใหม่', { exact: true }).fill(nextPassword);
  await page.getByLabel('ยืนยันรหัสผ่านใหม่', { exact: true }).fill(nextPassword);
  await page.getByRole('main').locator('button[type=submit]').click();
  await page.waitForURL(/\/login/);
  const session = await (await page.request.get('/api/auth/session')).json();
  expect(session?.user).toBeUndefined();
  await page.getByRole('main').locator('input[name=email]').fill(email);
  await page.getByRole('main').locator('input[name=password]').fill(nextPassword);
  await page.getByRole('main').locator('button[type=submit]').click();
  await expect(page).not.toHaveURL(/\/login/);
  expect(network.blockedRequests).toEqual([]);
});
