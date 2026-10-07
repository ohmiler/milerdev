# Visual baselines

`e2e/required/visual-regression.spec.ts` takes full-page screenshots of the core public pages — Home, the course catalog, a course page and login — at 390px and 1440px, and compares them with the approved baselines in `e2e/required/visual-regression.spec.ts-snapshots/`. It runs in `Required E2E`, so a change to a shared token, component or style that alters one of these pages fails CI until someone looks at it.

## Why the baselines come from CI

Baselines are rendered on the Linux CI runner (`*-linux.png`). Windows and macOS draw fonts differently, so the spec skips there; set `VISUAL_ANY_PLATFORM=1` to run it locally against local-only baselines, which `.gitignore` keeps out of the repository. In CI a missing baseline fails instead of being written (`updateSnapshots: 'none'`), so no screenshot becomes the reference without a person approving it.

The pages use the deterministic `npm run db:fixtures:e2e` data, reduced motion (no reveal fades, no typing in the Home editor), disabled animations and masked iframes, so two runs on the same commit produce the same pixels. `maxDiffPixels: 20` absorbs rare anti-aliasing noise only. Measured on Home at 1440px: a hero label 1px smaller changed 2,340 pixels, recoloured to orange 837, and 0.5px of letter-spacing on the step titles 3,764; all fail. Very subtle colour shifts within Playwright's per-pixel tolerance (`threshold: 0.2`) can pass.

## When the check fails

1. Open the failed `Required E2E` run and download the `playwright-report` artifact. For each failing page, `test-results/` holds `<page>-expected.png`, `<page>-actual.png` and `<page>-diff.png`.
2. Look at every diff. If a change is **not** intended, fix the code.
3. If every change is intended, approve the new screenshots from the run and commit them in the same pull request:

   ```bash
   node scripts/ci/accept-visual-baselines.mjs <run-id>
   git add e2e/required/visual-regression.spec.ts-snapshots
   git commit -m "test(e2e): approve visual baselines for <change>"
   ```

   The run id is the number in the run's URL (`…/actions/runs/<run-id>`). Say in the pull request which pages changed and why, so the reviewer checks the images too.

A new page in the spec works the same way: its first CI run fails with only an actual screenshot, which you approve with the script.

## What it does not cover

Signed-in pages, admin, dark surfaces outside these four pages, and browsers other than Chromium. A pixel comparison also cannot judge whether a change looks right — it only makes sure someone looked.
