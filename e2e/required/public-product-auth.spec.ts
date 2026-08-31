import { expect, test } from '@playwright/test';

import { E2E_FIXTURES } from '../fixtures';
import { installRequiredE2EProviderMocks } from './provider-mock-adapter.mjs';

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
