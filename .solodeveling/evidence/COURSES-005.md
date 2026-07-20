---
solodeveling_schema: 1
---

# COURSES-005 evidence

## Acceptance matrix

| AC | Status | Evidence | Limitation |
| --- | --- | --- | --- |
| 1. Shared editorial header system. | Pass | Comparative renders of Courses against Blog and Bundle at 1280x900 and 390x844 show the shared graph-paper field, asymmetric headline/supporting-copy hierarchy, container alignment, and 64px/48px grid rhythm. | Comparison used current local data and development rendering. |
| 2. Focused Courses hero anatomy. | Pass | Browser semantic snapshot exposes one `COURSE DIRECTORY / 02` eyebrow, one H1, and one supporting paragraph. Source and rendered output contain no jump CTA or catalog-fact rail. | The count reflects the two published courses in local data. |
| 3. Non-duplicated missing-media evidence. | Pass | Missing-media artwork now reads `MILERDEV / LEARNING MODULE`; the real course title remains once in the content heading/accessibility tree with tags, price, lesson count, duration, and free-lesson evidence. `tests/components/course-card.test.tsx` passed 3/3. | Shared Home rendering was source-reviewed rather than captured separately. |
| 4. Bundle course evidence at mobile and desktop. | Pass | The new mobile regression first reproduced the hidden-title failure, then passed after the layout repair. Browser inspection at 390px showed both real included-course names above price/action; the affected E2E suite passed 5/5. | Test skips explicitly if local data has no published bundle containing courses. |
| 5. Catalog and commerce behavior preserved. | Pass | `e2e/public-learning-journey.spec.ts` passed 5/5, including search/no-result/reset, course evidence, bundle link evidence, and responsive routes. Scoped diff contains no query, API, metadata, pricing, payment, enrollment, auth, or schema changes. | Local catalog has only one pagination page, so multi-page traversal was not exercised. |
| 6. Responsive, interaction, theme, and motion integrity. | Pass | The public journey checked horizontal overflow at 390/768/1280/1600; browser semantic inspection confirmed native controls/links and zero console errors. New styling uses existing semantic tokens, and the existing reduced-motion rule remains intact with no new motion. | Dark mode was verified statically through tokens, not captured as a separate render. |
| 7. Required checks and diff integrity. | Pass | CourseCard unit 3/3; affected Chromium E2E 5/5; `npm run lint` passed; `npm run build` compiled, type-checked, and generated 90 routes; `git diff --check` passed. | `solodeveling-validate` is unavailable, so memory was reconciled manually. |

## Visual observations

- Desktop Courses now reads as the learning-focused sibling of Blog and Bundle instead of a separate dashboard-like hero.
- Mobile retains the graph-paper identity while keeping the filter workbench compact and the bundle evidence visible.
- No-result and reset behavior remains purposeful: the reset link appears only when a refinement is active.

## Repository scope

- Product files: `src/app/courses/page.tsx`, `src/app/courses/courses.module.css`, `src/components/course/CourseCard.tsx`, and `e2e/public-learning-journey.spec.ts`.
- Memory files: this evidence, archived `COURSES-004`, archived `COURSES-005`, and `state.md`.
- Existing dirty `.agents`, `.claude`, `.playwright-cli`, and `output` content is unrelated and excluded from any future product commit.
