import { expect, test, type Page } from '@playwright/test';
import { E2E_FIXTURES } from '../fixtures';
import { installRequiredE2EProviderMocks } from './provider-mock-adapter.mjs';

async function registerBuyer(page: Page, destination: string) {
  const unique = crypto.randomUUID().replaceAll('-', '');
  const password = 'Aa1!' + unique;
  await page.goto(`/register?callbackUrl=${encodeURIComponent(destination)}`);
  await page.locator('input[name=name]').fill('ผู้ซื้อทดสอบรายการ ' + unique.slice(0, 6));
  await page.locator('input[name=email]').fill(`order-review-${unique}@example.test`);
  await page.locator('input[name=password]').fill(password);
  await page.locator('input[name=confirmPassword]').fill(password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((url) => url.pathname === destination);
}

for (const type of ['course', 'bundle'] as const) {
  test(`${type} reviews authoritative price and recovers a mocked PromptPay rejection without duplicate payment`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== 'string') throw new Error('Required baseURL is missing');
    const network = await installRequiredE2EProviderMocks(page, baseURL);
    const fixture = type === 'course' ? E2E_FIXTURES.courses.longThai : E2E_FIXTURES.bundle;
    const destination = `/${type === 'course' ? 'courses' : 'bundles'}/${fixture.slug}`;
    await registerBuyer(page, destination);
    const trigger = page.getByRole('button', { name: type === 'course' ? /ซื้อคอร์สนี้/ : /ซื้อ Bundle/ }).first();
    const dialog = page.getByRole('dialog', { name: 'เลือกช่องทางชำระเงิน' });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await trigger.click();
      await expect(dialog.getByText(fixture.title, { exact: true })).toBeVisible();
      await expect(dialog.getByText('ยอดชำระ (THB)', { exact: true })).toBeVisible();
      await expect(dialog.getByRole('button', { name: /Stripe/ })).toBeEnabled();
      const fits = await dialog.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= window.innerWidth && element.scrollWidth <= element.clientWidth;
      });
      expect(fits, `order review must fit ${width}px`).toBe(true);
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    }

    // Cancellation is advisory: the query does not claim payment or grant access.
    await page.goto(`${destination}?payment=cancelled`);
    await expect(page.getByRole('main').getByText('กลับจากหน้าชำระเงิน', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: fixture.title })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(fixture.slug + '$'));
    await page.goForward();
    await expect(page.getByRole('main').getByText('กลับจากหน้าชำระเงิน', { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await trigger.click();
    const intentResponse = page.waitForResponse((response) => response.url().endsWith('/api/promptpay/intents') && response.request().method() === 'POST');
    await dialog.getByRole('button', { name: /PromptPay/ }).click();
    const created = await intentResponse;
    expect(created.status()).toBe(201);
    const intent = await created.json() as { paymentId: string; amount: number; expiresAt: string };
    expect(intent.amount).toBe(Number(fixture.price));
    const transfer = page.getByRole('dialog', { name: 'โอนเงินและแนบสลิป' });
    await expect(transfer.getByText(intent.paymentId, { exact: true })).toBeVisible();
    await expect(transfer.getByText(/เวลาไทย/)).toBeVisible();
    await expect(transfer.getByText(/ข้อมูลส่วนบุคคล/)).toBeVisible();

    let intentCreations = 0;
    page.on('request', (request) => { if (request.url().endsWith('/api/promptpay/intents') && request.method() === 'POST') intentCreations += 1; });
    await transfer.getByRole('button', { name: 'ปิดและเก็บรายการไว้' }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(transfer.getByText(intent.paymentId, { exact: true })).toBeVisible();

    const slipEndpoint = type === 'course' ? '/api/slip/verify' : '/api/bundles/slip/verify';
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
    await page.route(`**${slipEndpoint}`, async (route) => {
      const actualResponse = await route.fetch();
      await responseGate;
      await route.fulfill({ response: actualResponse });
    });
    // Synthetic fixture proof: the server's provider adapter blocks all real SlipOK traffic.
    await transfer.getByLabel('แนบสลิปการโอนเงิน').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('fixture-only') });
    await transfer.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' }).click();
    await expect(transfer.getByRole('button', { name: 'กำลังตรวจสอบสลิป...' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(transfer).toBeVisible();
    releaseResponse();
    await expect(transfer.getByText('ยังดำเนินการไม่สำเร็จ', { exact: true })).toBeVisible();
    await expect(transfer.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' })).toBeEnabled();
    await transfer.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' }).click();
    await expect(transfer.getByRole('button', { name: 'ตรวจสอบและชำระเงิน' })).toBeEnabled();
    await transfer.getByRole('button', { name: 'ตรวจสถานะอีกครั้ง' }).click();
    await expect(transfer.getByText('รายการนี้ยังรอหลักฐานการชำระเงิน', { exact: true })).toBeVisible();
    expect(intentCreations).toBe(0);
    expect(network.blockedRequests).toEqual([]);
  });
}
