import { expect, test } from '@playwright/test';
import { installRequiredE2EProviderMocks } from './provider-mock-adapter.mjs';
import { seedLearningJourney } from './learning-journey-fixtures';

test('learning keeps failed completion recoverable and mobile locked navigation returns focus', async ({ page, browser }, testInfo) => {
  test.setTimeout(90_000);
  const baseURL = String(testInfo.project.use.baseURL);
  const network = await installRequiredE2EProviderMocks(page, baseURL);
  await page.context().setExtraHTTPHeaders({ 'x-real-ip': '192.0.2.90' });
  const id = crypto.randomUUID().replaceAll('-', '');
  await page.goto('/register');
  await page.locator('input[name=name]').fill('ผู้เรียนทดสอบ');
  await page.locator('input[name=email]').fill(`learning-journey-${id}@example.test`);
  await page.locator('input[name=password]').fill('Aa1!' + id);
  await page.locator('input[name=confirmPassword]').fill('Aa1!' + id);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard');
  const session = await (await page.request.get('/api/auth/session')).json();
  const fixture = await seedLearningJourney(session.user.id);
  const path = `/courses/${fixture.slug}/learn/${fixture.lessonIds[0]}`;
  await page.goto(path);
  await expect(page.getByRole('main')).toContainText('เนื้อหาการเรียนภาษาไทย');
  await page.route('**/api/progress', async (route) => { await route.fulfill({ status: 503, json: { error: 'temporarily unavailable' } }); });
  await page.getByRole('button', { name: 'ทำเครื่องหมายว่าเรียนจบ' }).click();
  await expect(page.getByRole('heading', { name: 'ยังบันทึกบทนี้ไม่ได้' })).toBeVisible();
  await page.unroute('**/api/progress');
  await page.getByRole('button', { name: 'ลองบันทึกอีกครั้ง' }).click();
  await expect(page.getByRole('heading', { name: 'เรียนจบบทนี้แล้ว' })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${fixture.lessonIds[0]}$`));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'เรียนจบบทนี้แล้ว' })).toBeVisible();
  await page.route('https://iframe.mediadelivery.net/**', async (route) => {
    await route.fulfill({ contentType: 'text/html', body: `<!doctype html><button id="fail">Simulate player failure</button><script>
      const listeners = {}; let seconds = 0;
      function send(event, value, listener) { parent.postMessage(JSON.stringify({ context: 'player.js', event, value, listener }), '*'); }
      addEventListener('message', ({ data }) => {
        const message = JSON.parse(data);
        if (message.method === 'addEventListener') {
          listeners[message.value] = message.listener;
          if (message.value === 'ready') send('ready', { src: location.href, events: ['error'], methods: ['getDuration', 'setCurrentTime', 'getCurrentTime'] });
        }
        if (message.method === 'getDuration') send('getDuration', 120, message.listener);
        if (message.method === 'setCurrentTime') seconds = message.value;
        if (message.method === 'getCurrentTime') send('getCurrentTime', seconds, message.listener);
      });
      document.querySelector('#fail').onclick = () => send('error', null, listeners.error);
    </script>` });
  });
  await page.goto(`/courses/${fixture.slug}/learn/${fixture.lessonIds[1]}`);
  await expect(page.getByRole('main').getByText('กลับมาเรียนต่อที่ 00:37')).toBeVisible();
  await page.getByRole('main').frameLocator('iframe').getByRole('button', { name: 'Simulate player failure' }).click();
  await expect(page.getByRole('main').getByText('ยังเล่นวิดีโอนี้ไม่ได้')).toBeVisible();
  await page.getByRole('button', { name: 'ลองโหลดวิดีโออีกครั้ง' }).click();
  await expect(page.getByRole('main').frameLocator('iframe').getByRole('button', { name: 'Simulate player failure' })).toBeVisible();
  await page.getByRole('button', { name: 'ทำเครื่องหมายว่าเรียนจบ' }).click();
  await expect(page.getByRole('heading', { name: 'เรียนจบบทนี้แล้ว' })).toBeVisible();
  await page.goto(`/courses/${fixture.slug}/learn/${fixture.lessonIds[2]}`);
  await expect(page.getByRole('main').getByText('บทเรียนนี้ยังไม่มีเนื้อหา')).toBeVisible();
  await page.getByRole('button', { name: 'ทำเครื่องหมายว่าเรียนจบ' }).click();
  await expect(page.getByRole('heading', { name: 'เรียนครบแล้ว · กำลังทบทวน' })).toBeVisible();
  const guest = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const guestPage = await guest.newPage();
  await installRequiredE2EProviderMocks(guestPage, baseURL);
  await guestPage.goto(path);
  const trigger = guestPage.getByRole('button', { name: 'เปิดรายการบทเรียน' });
  await trigger.click();
  const sheet = guestPage.getByRole('dialog');
  await sheet.getByRole('searchbox').fill('คําสั่ง');
  await expect(sheet.getByRole('status')).toContainText('3 บท');
  await sheet.getByRole('button', { name: 'ล้างคำค้น' }).click();
  await sheet.getByRole('button', { name: /บทที่ 2.*ต้องสมัครเรียนก่อน/ }).click();
  await expect(guestPage.getByRole('alertdialog')).toBeVisible();
  await guestPage.getByRole('button', { name: 'ไว้ก่อน' }).click();
  await expect(trigger).toBeFocused();
  await expect(guestPage).toHaveURL(new RegExp(`${fixture.lessonIds[0]}$`));
  expect(await guestPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await guest.close();
  expect(network.blockedRequests).toEqual([]);
});
