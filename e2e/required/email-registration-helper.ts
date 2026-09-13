import { createServer } from 'node:http';
import { expect, type Page } from '@playwright/test';

const mailbox = new Map<string, string>();
let mailboxReady: Promise<void> | undefined;

function startMailbox() {
  mailboxReady ??= new Promise<void>((resolve, reject) => {
    const server = createServer(async (request, response) => {
      if (request.method !== 'POST' || request.url !== '/emails') {
        response.writeHead(404).end(); return;
      }
      try {
        const chunks: Buffer[] = [];
        let length = 0;
        for await (const chunk of request) {
          length += chunk.length;
          if (length > 100_000) throw new Error('Oversize test email');
          chunks.push(Buffer.from(chunk));
        }
        const payload = JSON.parse(Buffer.concat(chunks).toString());
        const recipient = Array.isArray(payload.to) ? payload.to[0] : payload.to;
        if (typeof recipient !== 'string' || !recipient.endsWith('@example.test')) throw new Error('Only synthetic mailboxes are allowed');
        const match = String(payload.html).match(/href="([^"]*\/verify-email[^"]*)"/);
        if (match) {
          const link = new URL(match[1].replaceAll('&amp;', '&'));
          if (link.origin !== 'http://127.0.0.1:3100') throw new Error('Unexpected test origin');
          mailbox.set(recipient, link.toString());
        }
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: 'test-email' }));
      } catch {
        response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid test email' }));
      }
    });
    server.once('error', reject);
    server.listen(4318, '127.0.0.1', () => { server.unref(); resolve(); });
  });
  return mailboxReady;
}

// Uses the actual signup, email rendering, verification, and login boundaries.
// The test mailbox holds links only in memory; no token values are printed.
export async function completeRegistration(page: Page, identity: { name: string; email: string; password: string }) {
  await startMailbox();
  await expect(page).toHaveURL(/\/register(?:\?|$)/);
  const consent = page.getByRole('complementary', { name: 'ตัวเลือกความเป็นส่วนตัว' });
  await consent.getByRole('button', { name: 'ไม่อนุญาต', exact: true }).click();
  await expect(consent).not.toBeVisible();
  await page.locator('#register-email').fill(identity.email);
  const [registrationResponse] = await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/register' && response.request().method() === 'POST'),
    page.locator('form').filter({ has: page.locator('#register-email') }).locator('button[type=submit]').click(),
  ]);
  expect(registrationResponse.status(), 'Registration request status').toBe(200);
  await expect(page.getByText('ตรวจสอบคำขอแล้ว', { exact: true })).toBeVisible();
  await expect.poll(() => mailbox.has(identity.email), { message: 'Verification email reaches the local mailbox' }).toBe(true);
  const link = mailbox.get(identity.email)!;
  mailbox.delete(identity.email);
  try { await page.goto(link); } catch { throw new Error('Could not open test verification email'); }
  await expect(page.locator('input[name=name]')).toBeVisible();
  expect(new URL(page.url()).hash === '', 'Bearer fragment is removed').toBe(true);
  await page.locator('input[name=name]').fill(identity.name);
  await page.locator('input[name=password]').fill(identity.password);
  await page.locator('input[name=confirmPassword]').fill(identity.password);
  await page.locator('button[type=submit]').click();
  await expect(page.getByText('ยืนยันอีเมลและสร้างบัญชีแล้ว', { exact: true })).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await page.locator('#login-email').fill(identity.email);
  await page.locator('input[name=password]').fill(identity.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((url) => url.pathname !== '/login');
  // The anonymous choice is not promoted to the newly authenticated account.
  await consent.getByRole('button', { name: 'ไม่อนุญาต', exact: true }).click();
  await expect(consent).not.toBeVisible();
}
