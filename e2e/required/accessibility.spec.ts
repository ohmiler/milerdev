import { expect, test, type Page } from '@playwright/test';
import { E2E_FIXTURES } from '../fixtures';
import { expectAccessible, openForAudit } from './accessibility';
import { promoteAccessibilityAdmin } from './accessibility-fixtures';
import { completeRegistration } from './email-registration-helper';
import { installRequiredE2EProviderMocks } from './provider-mock-adapter.mjs';

const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

// Reveal animations would otherwise be audited half-faded; reduced motion shows the final content.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

// Each page is loaded fresh at each width so width-dependent rendering is what axe sees.
async function checkPages(page: Page, paths: string[]) {
  for (const path of paths) {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await openForAudit(page, path);
      await expectAccessible(page, `${path} at ${viewport.width}px`);
    }
  }
}

test('public pages have no serious WCAG A/AA findings', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await installRequiredE2EProviderMocks(page, String(testInfo.project.use.baseURL));
  await checkPages(page, [
    '/',
    '/courses',
    `/courses/${E2E_FIXTURES.courses.paid.slug}`,
    `/courses/${E2E_FIXTURES.courses.free.slug}/learn/${E2E_FIXTURES.lessons.freePreview.id}`,
    `/bundles/${E2E_FIXTURES.bundle.slug}`,
    `/certificate/${E2E_FIXTURES.certificates.active.code}`,
    '/about',
    '/faq',
    '/handbook',
    '/handbook/developers-in-the-ai-era',
    '/handbook/what-is-code',
    '/handbook/how-the-web-works',
    '/handbook/first-developer-tools',
    '/handbook/what-is-an-ai-agent',
    '/handbook/writing-prompts-for-agents',
    '/contact',
    '/login',
    '/register',
  ]);
});

test('learner and admin pages have no serious WCAG A/AA findings', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await installRequiredE2EProviderMocks(page, String(testInfo.project.use.baseURL));
  await page.context().setExtraHTTPHeaders({ 'x-real-ip': '192.0.2.120' });
  const id = crypto.randomUUID().replaceAll('-', '');
  await page.goto('/register');
  await completeRegistration(page, { name: 'Accessibility Member', email: `accessibility-${id}@example.test`, password: 'Aa1!' + id });

  await checkPages(page, ['/dashboard', '/dashboard/payments', '/dashboard/certificates', '/profile', '/settings']);

  // Only a learner who already has access sees the course page's success notice.
  const freeCourse = `/courses/${E2E_FIXTURES.courses.free.slug}`;
  await openForAudit(page, freeCourse);
  await page.getByRole('button', { name: 'ลงทะเบียนเรียนฟรี' }).first().click();
  await expect(page.getByText('คุณมีสิทธิ์เรียนคอร์สนี้แล้ว').first()).toBeVisible();
  await checkPages(page, [freeCourse]);

  const session = await (await page.request.get('/api/auth/session')).json();
  await promoteAccessibilityAdmin(session.user.id);
  const course = E2E_FIXTURES.courses.paid.id;
  await checkPages(page, [
    '/admin',
    '/admin/courses',
    `/admin/courses/${course}/edit`,
    `/admin/courses/${course}/lessons`,
    `/admin/courses/${course}/enrollments`,
    `/admin/lessons/${E2E_FIXTURES.lessons.paid.id}/edit`,
    '/admin/users',
    `/admin/users/${E2E_FIXTURES.users.learner.id}`,
    '/admin/enrollments',
    '/admin/payments',
    '/admin/reconciliation',
    '/admin/reports',
    '/admin/bundles',
    '/admin/certificates',
    '/admin/media',
  ]);
});
