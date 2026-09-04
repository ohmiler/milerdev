import { expect, test, type Page } from '@playwright/test';

import { E2E_FIXTURES } from '../fixtures';
import { installRequiredE2EProviderMocks } from './provider-mock-adapter.mjs';

async function registerAndReturnTo(page: Page, destination: string, journeyName: string) {
  const uniqueId = crypto.randomUUID().replaceAll('-', '');
  const generatedPassword = 'Aa1!' + uniqueId;

  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get('callbackUrl')).toBe(destination);

  await page.getByRole('link', { name: /สมัครสมาชิกฟรี/ }).click();
  await expect(page).toHaveURL(/\/register\?/);
  expect(new URL(page.url()).searchParams.get('callbackUrl')).toBe(destination);

  await page.locator('input[name=name]').fill('Safe Return ' + journeyName);
  await page.locator('input[name=email]').fill('safe-return-' + uniqueId + '@example.test');
  await page.locator('input[name=password]').fill(generatedPassword);
  await page.locator('input[name=confirmPassword]').fill(generatedPassword);
  await page.locator('button[type=submit]').click();

  await page.waitForURL((url) => url.pathname === destination);
  expect(new URL(page.url()).pathname).toBe(destination);
  expect(new URL(page.url()).search).toBe('');
}

test('public paid product preserves its destination at the authentication boundary', async ({ page }, testInfo) => {
  const appBaseUrl = testInfo.project.use.baseURL;
  if (typeof appBaseUrl !== 'string') {
    throw new Error('Required E2E project must define a baseURL');
  }

  const network = await installRequiredE2EProviderMocks(page, appBaseUrl);

  const response = await page.request.get('/api/courses?limit=50');
  expect(response.ok(), 'fixture-backed course API must be available').toBe(true);
  const payload = await response.json() as {
    courses?: Array<{ id: string; slug: string; title: string }>;
  };
  const paidCourse = payload.courses?.find(
    ({ id }) => id === E2E_FIXTURES.courses.paid.id,
  );
  expect(paidCourse, 'named paid-course fixture must exist').toEqual(expect.objectContaining({
    slug: E2E_FIXTURES.courses.paid.slug,
    title: E2E_FIXTURES.courses.paid.title,
  }));

  await page.goto(`/courses/${E2E_FIXTURES.courses.paid.slug}`);
  await expect(page.getByRole('heading', {
    level: 1,
    name: E2E_FIXTURES.courses.paid.title,
  })).toBeVisible();

  await page.getByRole('button', { name: /ซื้อคอร์สนี้/ }).first().click();
  await expect(page).toHaveURL(/\/login\?/);

  const loginUrl = new URL(page.url());
  expect(loginUrl.pathname).toBe('/login');
  expect(loginUrl.searchParams.get('callbackUrl')).toBe(
    `/courses/${E2E_FIXTURES.courses.paid.slug}`,
  );
  expect(network.providerRequests, 'required journey must not invoke provider mocks').toEqual([]);
  expect(network.blockedRequests, 'required journey must not attempt unknown external traffic').toEqual([]);
});

test('desktop guest returns to the exact Course after registration', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const appBaseUrl = testInfo.project.use.baseURL;
  if (typeof appBaseUrl !== 'string') {
    throw new Error('Required E2E project must define a baseURL');
  }
  const network = await installRequiredE2EProviderMocks(page, appBaseUrl);
  const destination = `/courses/${E2E_FIXTURES.courses.paid.slug}`;

  await page.goto(destination);
  await page.getByRole('button', { name: /ซื้อคอร์สนี้/ }).first().click();
  await registerAndReturnTo(page, destination, 'Desktop Course');

  expect(network.providerRequests, 'credentials journey must not invoke provider mocks').toEqual([]);
  expect(network.blockedRequests, 'credentials journey must not attempt unknown external traffic').toEqual([]);
});

test('mobile guest returns to the exact Bundle after registration', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const appBaseUrl = testInfo.project.use.baseURL;
  if (typeof appBaseUrl !== 'string') {
    throw new Error('Required E2E project must define a baseURL');
  }
  const network = await installRequiredE2EProviderMocks(page, appBaseUrl);
  const response = await page.request.get('/api/bundles');
  expect(response.ok(), 'fixture-backed bundle API must be available').toBe(true);
  const payload = await response.json() as {
    bundles?: Array<{ slug: string; title: string }>;
  };
  const bundle = payload.bundles?.[0];
  expect(bundle, 'at least one published bundle fixture must exist').toBeTruthy();
  const destination = `/bundles/${bundle!.slug}`;

  await page.goto(destination);
  await expect(page.getByRole('heading', { level: 1, name: bundle!.title })).toBeVisible();
  await expect(page.getByRole('main').getByText('ชุดคอร์ส · 2 คอร์ส', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', {
    level: 3,
    name: E2E_FIXTURES.courses.paid.title,
  })).toBeVisible();
  await expect(page.getByRole('heading', {
    level: 3,
    name: E2E_FIXTURES.courses.free.title,
  })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'สรุปและสมัครชุดคอร์ส' })
    .getByText('ซื้อแยกวันนี้', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: /Bundle/ }).first().click();
  await registerAndReturnTo(page, destination, 'Mobile Bundle');

  expect(network.providerRequests, 'credentials journey must not invoke provider mocks').toEqual([]);
  expect(network.blockedRequests, 'credentials journey must not attempt unknown external traffic').toEqual([]);
});
