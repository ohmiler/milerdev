// Approves the screenshots a failed Required E2E run took as the new visual baselines.
// Usage: node scripts/ci/accept-visual-baselines.mjs <run-id>
// Review the -diff.png images in the run's artifact before running this.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const BASELINE_DIRECTORY = 'e2e/required/visual-regression.spec.ts-snapshots';
const ARTIFACT_NAME = 'playwright-report';

/** "home-mobile-actual.png" → "home-mobile-linux.png"; anything else is not a screenshot. */
export function baselineNameFor(actualFile) {
  const match = /^(.+)-actual\.png$/.exec(actualFile);
  return match ? `${match[1]}-linux.png` : null;
}

function findActualScreenshots(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return findActualScreenshots(path);
    return baselineNameFor(name) ? [path] : [];
  });
}

function main(runId) {
  if (!/^\d+$/.test(runId ?? '')) {
    console.error('Usage: node scripts/ci/accept-visual-baselines.mjs <run-id>');
    process.exit(1);
  }

  const download = mkdtempSync(join(tmpdir(), 'visual-baselines-'));
  try {
    execFileSync('gh', ['run', 'download', runId, '--name', ARTIFACT_NAME, '--dir', download], { stdio: 'inherit' });
    const screenshots = findActualScreenshots(download);
    if (screenshots.length === 0) {
      console.error(`Run ${runId} has no -actual.png screenshots: nothing to approve.`);
      process.exit(1);
    }

    mkdirSync(BASELINE_DIRECTORY, { recursive: true });
    for (const screenshot of screenshots) {
      const target = join(BASELINE_DIRECTORY, baselineNameFor(basename(screenshot)));
      copyFileSync(screenshot, target);
      console.log(`approved ${target}`);
    }
  } finally {
    rmSync(download, { recursive: true, force: true });
  }
}

// Runs only as a command, so tests can import baselineNameFor.
if (process.argv[1]?.endsWith('accept-visual-baselines.mjs')) {
  main(process.argv[2]);
}
