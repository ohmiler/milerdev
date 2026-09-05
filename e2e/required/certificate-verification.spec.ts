import { expect, test } from '@playwright/test';
import { E2E_FIXTURES } from '../fixtures';
import { installRequiredE2EProviderMocks } from './provider-mock-adapter.mjs';

test('public certificate distinguishes revoked and missing proof and exports a verifiable artifact', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const network = await installRequiredE2EProviderMocks(page, String(testInfo.project.use.baseURL));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const kind of ['active', 'revoked'] as const) {
    await page.goto(`/certificate/${E2E_FIXTURES.certificates[kind].code}`);
    await expect(page.locator('[data-verification-status]')).toHaveAttribute('data-verification-status', kind === 'active' ? 'valid' : 'revoked');
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await expect(page.getByRole('document').getByRole('link')).toHaveAttribute('href', new RegExp(`/certificate/${E2E_FIXTURES.certificates[kind].code}$`));
    await expect(page.getByRole('document')).toContainText('สถานะใบรับรองอาจเปลี่ยนแปลง');
  }
  const downloadButton = page.getByRole('button', { name: 'ดาวน์โหลด PNG' });
  await downloadButton.focus();
  const downloadPromise = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`certificate-${E2E_FIXTURES.certificates.revoked.code}.png`);
  expect(await download.failure()).toBeNull();
  await page.goto('/certificate/CERT-NOT-FOUND');
  await expect(page.getByRole('heading', { name: 'ไม่พบหน้าที่คุณต้องการ' })).toBeVisible();
  expect(network.blockedRequests).toEqual([]);
});
