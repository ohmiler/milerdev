import { existsSync } from 'node:fs';
import { expect, test, type Page, type PageScreenshotOptions } from '@playwright/test';
import { E2E_FIXTURES } from '../fixtures';
import { openForAudit } from './accessibility';
import { installRequiredE2EProviderMocks } from './provider-mock-adapter.mjs';

// Full-page screenshots of the core public pages, compared with approved baselines so a change
// to a shared token or component cannot quietly alter a page. Baselines are rendered on the
// Linux CI runner, because other systems draw fonts differently. To approve an intended change,
// follow docs/workflow/visual-baselines.md.
const RUNS_HERE = process.platform === 'linux' || process.env.VISUAL_ANY_PLATFORM === '1';

const pages = [
  { name: 'home', path: '/' },
  { name: 'catalog', path: '/courses' },
  { name: 'course', path: `/courses/${E2E_FIXTURES.courses.paid.slug}` },
  { name: 'login', path: '/login' },
];

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

// Reduced motion shows final content: no reveal fades and no typing in the Home editor.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

// Scroll through once so lazy images load, then return to the top for the capture.
async function loadWholePage(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    }
    await Promise.all([...document.images].map((image) => (image.complete
      ? null
      : new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; }))));
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
}

test.describe('visual regression', () => {
  test.skip(!RUNS_HERE, 'Baselines are rendered on the Linux CI runner');

  for (const viewport of viewports) {
    for (const target of pages) {
      test(`${target.name} at ${viewport.width}px`, async ({ page }, testInfo) => {
        await installRequiredE2EProviderMocks(page, String(testInfo.project.use.baseURL));
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openForAudit(page, target.path);
        await loadWholePage(page);

        const name = `${target.name}-${viewport.name}.png`;
        const capture: PageScreenshotOptions = {
          fullPage: true,
          animations: 'disabled',
          // Embedded players load third-party frames that are not part of our UI.
          mask: [page.locator('iframe')],
        };
        // Playwright saves the actual image only when a baseline differs, not when it is missing.
        // Save it here too, under the same -actual.png name, so a first run can be approved.
        if (!existsSync(testInfo.snapshotPath(name, { kind: 'screenshot' }))) {
          await page.screenshot({ ...capture, path: testInfo.outputPath(name.replace(/\.png$/, '-actual.png')) });
        }

        await expect(page).toHaveScreenshot(name, {
          ...capture,
          // Repeat runs on one machine are pixel-identical. 20 pixels absorbs rare anti-aliasing noise
          // while a recoloured label or a 1px shift still fails.
          maxDiffPixels: 20,
        });
      });
    }
  }
});
