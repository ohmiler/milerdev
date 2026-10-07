import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { baselineNameFor } from '../../scripts/ci/accept-visual-baselines.mjs';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('visual baselines', () => {
  it('maps a CI screenshot to the Linux baseline it replaces, and ignores the rest', () => {
    expect(baselineNameFor('home-mobile-actual.png')).toBe('home-mobile-linux.png');
    expect(baselineNameFor('course-desktop-actual.png')).toBe('course-desktop-linux.png');
    expect(baselineNameFor('home-mobile-diff.png')).toBeNull();
    expect(baselineNameFor('home-mobile-expected.png')).toBeNull();
    expect(baselineNameFor('trace.zip')).toBeNull();
  });

  it('never lets CI write a missing baseline by itself', () => {
    expect(source('playwright.required.config.ts')).toContain("updateSnapshots: process.env.CI ? 'none' : 'missing'");
  });

  // With updateSnapshots 'none', Playwright keeps no full-page image for a missing baseline,
  // so the first CI run of a new page had nothing to approve.
  it('saves the full-page screenshot under -actual.png when a baseline is missing', () => {
    const spec = source('e2e/required/visual-regression.spec.ts');

    expect(spec).toContain("testInfo.snapshotPath(name, { kind: 'screenshot' })");
    expect(spec).toContain("name.replace(/\\.png$/, '-actual.png')");
  });

  it('runs inside Required E2E and uploads the screenshots a failed run took', () => {
    const workflow = source('.github/workflows/ci.yml');
    const job = workflow.slice(workflow.indexOf('\n  required-e2e:'));

    expect(job).toContain('run: npm run test:e2e:required');
    expect(job).toMatch(/name: playwright-report[\s\S]*?test-results\//);
  });
});
