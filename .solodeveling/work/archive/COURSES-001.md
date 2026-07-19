---
solodeveling_schema: 1
---

# COURSES-001 — Courses catalog reference-page redesign

- Status: done
- Level: Standard
- Authority: User asked on 2026-07-20 to continue from project memory; state and roadmap select `/courses` as the next public redesign.
- Goal: Make the public catalog a clear, truthful decision surface that extends the approved Home language without changing catalog data or commerce behavior.
- Users: First-time and returning Thai-language learners comparing individual courses and bundles.
- Desired outcome: Learners can understand the catalog, narrow choices, compare real decision evidence, and open the correct course or bundle at representative desktop and mobile widths.
- Recovery: Revert only the scoped `/courses` composition/styles, catalog presentation tests, and this work/evidence pair. No data, schema, auth, enrollment, or payment rollback is required.

## Direction

Catalog workbench for Thai learners choosing their next skill, organized as a warm editorial decision grid and led by real course evidence: topic, price, lesson count, duration when available, free preview, instructor, and bundle path.

- Brand source: approved Home paper/ink/accent palette, square geometry, bordered grids, editorial Thai hierarchy, purposeful motion, and responsive recomposition.
- Grid role: quiet across page structure and visible where it clarifies comparison.
- Preserve: Thai voice, real media/content, global semantic tokens, Public Navbar/Footer, accessible labels and native form behavior.
- Evolve: catalog hierarchy, bundle prominence, filter density, course-card composition within the catalog, and responsive ordering.
- Exclude: Home Hero editor motif and new claims, metrics, imagery, or course outcomes unsupported by stored data.

## Scope

- Redesign `/courses` hero, bundle path, catalog header, filter form, course grid, pagination, and no-results state.
- Preserve server-rendered search, price, tag, sort, page query behavior and canonical/robots behavior.
- Preserve published-course and published-bundle queries, real links, promotion calculation, lesson evidence, and course-card truthfulness.
- Recompose the page at 390, 768, 1280, and 1600 CSS pixels; keep keyboard focus, reduced motion, and overflow behavior visible and usable.
- Add or adjust focused regression coverage only where it protects product behavior or risk boundaries.

## Out of scope

- `/courses/[slug]`, bundle detail, Home, Blog, auth, learner, or Admin redesigns.
- Database schema, migrations, stored course/bundle data, publishing rules, pricing, discounts, enrollment, payments, and authorization.
- New dependencies, fabricated marketing evidence, or global promotion of patterns that occur only on this page.

## Acceptance criteria

1. The initial `/courses` view makes the catalog and its filtering task primary, while published bundles remain discoverable as a secondary learning path.
2. Search, price, tag, sort, reset, pagination, course links, and bundle links preserve their current URL and data behavior.
3. Each course exposes only available decision evidence and preserves free, paid, and active-promotion price states without invented fallback claims.
4. No-results output clearly reflects the filtered state and offers recovery to the unfiltered catalog; loading and route errors remain handled by existing Next.js boundaries unless a scoped gap is found.
5. Layout has no unintended horizontal overflow and remains legible and operable at 390, 768, 1280, and 1600 CSS pixels, including long Thai/English titles and sparse catalog results.
6. Keyboard order, semantic headings/landmarks, labels, accessible names, visible focus, touch targets, and reduced-motion behavior remain usable for the catalog flow.
7. Implementation uses established global semantic tokens and scoped course-catalog styles; it does not spread `--home-*` aliases or introduce a broad primitive before repetition is proven.
8. Recent focused tests, relevant public-journey regressions, lint, build when practical, rendered viewport inspection, `git diff --check`, and scoped Git status support the completion claim; limitations remain explicit.

## Risks

- Product/UX: A decorative hero or oversized bundle area can delay the primary catalog task; keep catalog controls visually dominant.
- Responsive: Five filter controls and price markers can become tall or cramped on narrow screens; recompose order and density rather than shrinking controls.
- Truth: Visual emphasis must not imply duration, previews, savings, or outcomes when source data is absent.
- Technical: `CourseCard` is shared with Home; page-specific changes should be scoped under the catalog unless a truly repeated contract changes.
- Operational: Local guest data and Playwright renders are not production performance or user-research evidence. Generated artifacts remain outside product commits.

## Alternatives and decisions

- Recommended: Editorial decision grid with catalog-first hierarchy and compact secondary bundle path. Selected because it matches Home while improving the learner's primary task.
- Smallest credible option: Restyle the existing sections without recomposition. Rejected because it retains the desktop dead space and mobile filter/bundle dominance observed in the baseline.
- Do nothing: Preserves current stability but leaves `/courses` below the approved public design language and roadmap objective.

## Implementation plan

1. Catalog contract slice
   - Extend `e2e/public-learning-journey.spec.ts` with behavior-level coverage for submitting a guaranteed no-result search, retaining query state, showing the recovery action, and returning to the unfiltered catalog.
   - Keep assertions on visible behavior, URL state, and semantic controls; do not assert CSS classes or decorative copy.
   - Focused check: `npm run test:e2e -- e2e/public-learning-journey.spec.ts --project=chromium`.
2. Server-rendered composition slice
   - Recompose `src/app/courses/page.tsx` so the hero orients the learner with real catalog counts, the filter/catalog task appears before bundles, and bundle paths remain linked and truthful.
   - Preserve the async `searchParams` contract, direct server data access, parallel queries, metadata behavior, query-building semantics, pricing/promotion calculations, and all current data boundaries.
   - Keep native GET form controls and avoid a new client boundary.
   - Focused check: the new no-result/reset E2E plus a manual query pass for search, price, tag, and sort.
3. Scoped responsive visual-system slice
   - Add `src/app/courses/courses.module.css` for page-local composition and replace the current course-catalog block in `src/app/globals.css` with scoped module styles.
   - Keep shared `CourseCard` behavior and global base styles unchanged; use page-scoped descendant styling only where the catalog needs a distinct grid treatment.
   - Use global semantic tokens, square/bordered geometry, and catalog evidence; do not add `--home-*` aliases or dependencies.
   - Recompose filters and two-column comparison at wide widths, then prioritize search and compact filter controls on narrow widths. Keep sparse results balanced without fabricating content.
   - Focused check: rendered 390 and 1280 inspections, overflow measurement, keyboard traversal, and console review.
4. Checkpoint verification and reconciliation
   - Run `npm run test -- --run tests/components/course-card.test.tsx`.
   - Run `npm run test:e2e -- e2e/public-learning-journey.spec.ts e2e/course.spec.ts --project=chromium`.
   - Run `npm run lint` and `npm run build` when the local environment remains capable.
   - Render 390, 768, 1280, and 1600 CSS pixels; exercise default, filtered/no-results/reset, focus, sparse results, reduced motion, and overflow. Record observations separately from static inspection and automated checks.
   - Run `git diff --check` and `git status --short`; reconcile every acceptance criterion in `evidence/COURSES-001.md` before any completion claim.

## Affected boundaries and dependencies

- Primary source: `src/app/courses/page.tsx`.
- New scoped presentation: `src/app/courses/courses.module.css`.
- Existing presentation cleanup: only the /courses catalog rules in `src/app/globals.css`; shared card, Navbar, Footer, and tokens remain sources of truth.
- Behavior regression: `e2e/public-learning-journey.spec.ts`; existing `tests/components/course-card.test.tsx` and `e2e/course.spec.ts` remain affected gates.
- No schema, migration, API, dependency, secret, production-data, auth, enrollment, or payment effect.
- Course thumbnails keep the existing native-image behavior in this item because stored URLs are not constrained to the configured Next Image remote hosts; image-pipeline normalization is separate work.

## Acceptance-to-verification map

- AC1: rendered hierarchy at four widths plus semantic snapshot showing catalog before bundle paths.
- AC2: E2E no-result/reset flow, manual native-control query pass, static pagination-link inspection, and build.
- AC3: focused CourseCard unit tests, existing public evidence E2E, and default/promo/free rendered observations available in local data.
- AC4: no-result/reset E2E and static confirmation of inherited route error handling; any unobserved provider/database failure remains a named gap.
- AC5: automated width measurements at 390/768/1280/1600 and full-page rendered inspection with sparse local results.
- AC6: semantic snapshot, keyboard traversal, visible focus observation, control target inspection, and reduced-motion render.
- AC7: scoped diff inspection for semantic tokens, CSS-module ownership, and absence of new `--home-*` aliases/dependencies.
- AC8: recorded command results, rendered evidence, diff integrity, and scoped Git status.

## Readiness

- Confirmed facts: Existing server queries and form controls cover search, price, tag, sort, pagination, bundles, empty state, and truthful course metadata. Baseline renders were observed at 390 and 1280 CSS pixels.
- Material unknowns: None that change architecture, data, security, cost, or acceptance.
- Decision points during execution: Page-local composition may change within the selected thesis; any change to data queries, shared CourseCard behavior, image ingestion, or product claims returns to shaping.
- Next action: Shape /courses/[slug] as the next separately scoped public journey when work resumes.

## Completion

- Completed: 2026-07-20
- Reconciliation: All eight acceptance criteria are supported by recent evidence in `evidence/COURSES-001.md`.
- Verification: CourseCard unit 3/3, affected E2E 14/14, full lint, production build, four rendered widths, keyboard focus, reduced motion, and diff integrity passed.
- Limitations: Local seeded renders are not production performance or user-research evidence; the one-page local dataset did not render pagination links; provider/database failure was not forced.
- Boundary: No schema, data, API, auth, enrollment, payment, dependency, secret, or production action changed.
