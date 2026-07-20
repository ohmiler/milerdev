---
solodeveling_schema: 1
---

# COURSES-004 evidence

## Current acceptance matrix

| AC | Status | Evidence | Limitation |
| --- | --- | --- | --- |
| 1. Faster mobile path to results with usable controls. | Pass | The 390px default render shows one full-width submit action instead of the prior inactive reset row. Source keeps every input/select at the existing 48px minimum and reduces only surrounding gaps. | Local seeded catalog; visual judgment is not user research. |
| 2. Reset appears only for active refinements. | Pass | Focused E2E first observes zero reset links, submits a no-result search, then observes the filter reset with `href=/courses` and uses it to restore the empty search value. | Query coverage uses search; price/tag/sort share the same normalized boolean branch and existing native form. |
| 3. Course title leads truthful catalog evidence. | Pass | 390px and 1280px renders show compact square tag labels and stronger course titles. CourseCard unit tests pass 3/3 for optional evidence, missing media, and one-link anatomy. | Local data contains two courses and no long-title stress fixture beyond the existing English/Thai examples. |
| 4. Catalog/query/commerce behavior is preserved. | Pass | Scoped diff changes only reset visibility and page-scoped CSS; query builders, form names/defaults, database reads, price/promotion logic, course links, bundle links, enrollment, and payment files are unchanged. Affected E2E passes 4/4 and production build completes. | Pagination has one local page and remains covered statically plus by existing query code. |
| 5. Responsive, focus, motion, and overflow remain intact. | Pass | Affected E2E reports equal client/scroll widths for Home, catalog, and detail at 390/768/1280/1600. Semantic snapshots retain labeled native controls and landmarks; the existing reduced-motion rule and focus-visible rules are unchanged. Browser renders at 390 and 1280 showed zero console errors. | No screen-reader or external accessibility audit; recurring Next dev warnings are non-failing. |
| 6. Required checks and diff integrity pass. | Pass | Focused unit 3/3, affected E2E 4/4, lint, production build with 90 routes, and `git diff --check` pass. Scoped status review separates pre-existing tooling/artifacts. | Solodeveling validator CLI is unavailable; memory was reconciled manually. |

## Observations

- Baseline 1280 and 390 renders showed no console errors or horizontal overflow symptoms.
- At 390px the inactive reset occupied a full extra action row, and catalog tags competed visually with the course title.
- The first focused E2E attempt reused an unrelated Next.js server on port 3000 and returned a 404. Process inspection confirmed MilerDev on port 3001; rerunning with `E2E_BASE_URL=http://localhost:3001` produced the intended failing reset assertion, then passed after implementation.

## Commands and observed results

- `npm run test -- --run tests/components/course-card.test.tsx` — passed, 1 file and 3 tests.
- `E2E_BASE_URL=http://localhost:3001 npm run test:e2e -- e2e/public-learning-journey.spec.ts --project=chromium` — passed, 4 tests.
- `npm run lint` — passed after the final source edit.
- `npm run build` — passed after the final source edit with Next.js 16.1.4 and 90 generated route entries.
- Playwright CLI — inspected default and filtered/no-result states at 390px and the default catalog at 1280px; zero console errors and only development warnings.
- `git diff --check` — passed with line-ending warnings only.

## Scope and recovery

- Product edits are limited to `/courses` reset visibility, its scoped CSS module, and behavior-level public journey coverage.
- No API, schema, stored data, auth, enrollment, payment, dependency, provider, or production action changed.
- Recovery is a scoped presentation/test revert; no data or commerce rollback is required.
