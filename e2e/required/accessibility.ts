import path from 'node:path';
import type * as Axe from 'axe-core';
import { expect, type Page } from '@playwright/test';

const AXE_SOURCE = path.resolve('node_modules/axe-core/axe.min.js');
// WCAG 2.0–2.2 level A and AA rules only; best-practice rules stay advisory.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Spinners, skeletons and busy regions mean client data is still loading.
const LOADING = '[data-slot="spinner"], [data-slot="skeleton"], [aria-busy="true"]';

// Opens a page and waits for its content rather than for network idle, which
// background link prefetching can keep from ever settling.
export async function openForAudit(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.locator(LOADING)).toHaveCount(0);
}

// Fails on serious or critical findings. The message names the rule and up to three elements.
export async function expectAccessible(page: Page, label: string) {
  await page.addScriptTag({ path: AXE_SOURCE });
  const findings = await page.evaluate(async (tags) => {
    const { axe } = window as unknown as { axe: typeof Axe };
    const result = await axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
    return result.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.slice(0, 3).map((node) => {
        // Contrast findings carry the measured colors, which is what a fix needs.
        const data = node.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
        const colors = data?.fgColor ? ` [${data.fgColor} on ${data.bgColor}, ${data.contrastRatio}:1]` : '';
        return node.target.join(' ') + colors;
      }).join(' | ')}`);
  }, WCAG_TAGS);
  expect(findings, `Accessibility findings on ${label}`).toEqual([]);
}
