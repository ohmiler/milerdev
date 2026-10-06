import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { isDocsOnly } from '../../scripts/ci/docs-only-scope.mjs';

describe('docs-only pull request scope', () => {
  it('skips the journeys only when every changed file is documentation', () => {
    expect(isDocsOnly(['AGENTS.md', 'docs/workflow/README.md'])).toBe(true);
    expect(isDocsOnly(['docs/adr/0012-example.md', 'docs/workflow/diagram.png', ''])).toBe(true);
  });

  it('runs the journeys for any code, config, test or nested Markdown change, and for an empty list', () => {
    expect(isDocsOnly(['docs/workflow/README.md', 'src/app/page.tsx'])).toBe(false);
    expect(isDocsOnly(['.github/workflows/ci.yml'])).toBe(false);
    expect(isDocsOnly(['package.json'])).toBe(false);
    // Markdown outside the root or docs/ can be a fixture or content the code reads.
    expect(isDocsOnly(['tests/fixtures/empty-env/README.md'])).toBe(false);
    expect(isDocsOnly(['src/content/post.md'])).toBe(false);
    expect(isDocsOnly([])).toBe(false);
    expect(isDocsOnly(['', '  '])).toBe(false);
  });

  it('is wired so the Required E2E job still runs and reports, and lists both sides of a rename', () => {
    const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/ci.yml'), 'utf8').replace(/\r\n/g, '\n');
    // The Required E2E job, up to the next job or the end of the file.
    const start = workflow.indexOf('\n  required-e2e:\n');
    const next = workflow.slice(start + 1).search(/\n  [a-z-]+:\n/);
    const job = workflow.slice(start, next < 0 ? undefined : start + 1 + next);

    expect(job).toContain('git diff --name-only --no-renames HEAD^1 HEAD');
    expect(job).toContain('node scripts/ci/docs-only-scope.mjs');
    // Pushes to master always run the journeys.
    expect(job).toMatch(/if \[ "\$EVENT_NAME" = "pull_request" \]/);
    // The job itself has no condition: it must run and pass, never show as skipped.
    expect(job).not.toMatch(/\n    if:/);
    expect(job).toMatch(/- name: Run required browser journey\n        if: steps\.scope\.outputs\.run == 'true'\n        run: npm run test:e2e:required/);
  });
});
