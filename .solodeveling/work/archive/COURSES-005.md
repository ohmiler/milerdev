---
solodeveling_schema: 1
---

# COURSES-005 — Catalog visual-system alignment

- Status: done
- Level: Standard
- Authority: User explicitly authorized the Gridgeist alignment corrections on 2026-07-21 after comparing Courses, Blog, and Bundle.
- Goal: Make `/courses` recognizably part of the same editorial system as Blog and Bundle while keeping its course-comparison task and all catalog behavior intact.
- Users: Thai learners browsing, filtering, comparing individual courses, and evaluating bundle paths.
- Recovery: Revert the scoped hero/card/bundle presentation, focused regression, and this work/evidence pair. No data, schema, enrollment, or payment rollback is required.

## Direction and contract

Courses is the Blog index's learning-focused sibling: a visible graph-paper hero, asymmetric headline/supporting-copy composition, restrained paper/ink/cyan hierarchy, and course/bundle evidence that remains visible at every viewport.

- Replace the vertical-only hero with the shared graph-paper field and Blog-like two-column heading/lede anatomy.
- Remove duplicate hero CTA/statistics because course count, topics, and bundle paths already appear in their task sections.
- Preserve the catalog filter rail as a product-specific difference justified by four controls.
- Remove duplicate course-title presentation from missing-thumbnail artwork while retaining truthful category and MilerDev identity.
- Keep up to two real bundle course titles visible on mobile/tablet.
- Reuse semantic tokens, square geometry, existing type families, 64px desktop and 48px mobile grid rhythm, focus behavior, and reduced-motion behavior.

## Out of scope

- Queries, metadata rules, course/bundle data, publication status, prices, promotions, discounts, pagination, enrollment, payment, auth, APIs, schema, dependencies, Navbar, Footer, Blog, or Bundle-detail implementation.

## Acceptance criteria

1. Courses, Blog, and Bundle headers visibly share graph-paper field, display hierarchy, outer alignment, and responsive grid rhythm at 390 and 1280 CSS pixels.
2. The Courses hero contains one eyebrow, one H1, and one supporting paragraph without duplicated catalog statistics or a jump CTA.
3. Missing-thumbnail artwork does not repeat the course title; the linked card still exposes its real title, tags, price, and available decision evidence.
4. Published bundle teasers expose up to two real included-course names at mobile and desktop widths without changing destination or pricing evidence.
5. Search, price, tag, sort, reset, pagination, course links, bundle links, queries, metadata, and commerce behavior remain unchanged.
6. Default and filtered/no-result layouts have no unintended overflow at 390/768/1280/1600; semantic order, focus, touch targets, dark tokens, and reduced motion remain intact.
7. Focused unit/E2E, affected regression, lint, build, comparative renders, diff integrity, and scoped status support completion.

## Risks and decisions

- Brand: Copying Blog literally could erase the catalog task; share hero grammar but retain the filter workbench and course evidence.
- Responsive: Restoring bundle course names can crowd the mobile row; give evidence its own full-width track before price/action.
- Shared CourseCard: Fallback art is shared with Home; changing only its decorative copy must keep the real title in the content heading and accessible link name.
- Truth: Use only stored tag, course title, count, price, promotion, and bundle membership data.
- Recommended approach: system-level hero alignment plus two evidence repairs. Spacing-only changes were rejected because they leave the observed anatomy mismatch.

## Plan and verification map

1. Add a mobile behavior regression proving an included bundle course name is visibly exposed from real local/API data.
2. Recompose Courses hero markup and scoped CSS to the Blog-derived field without client JavaScript.
3. Replace the missing-media duplicate title with a category/brand module mark and recompose bundle evidence tracks at tablet/mobile widths.
4. Run focused CourseCard tests and public-learning E2E, then inspect Courses beside Blog/Bundle at 390 and 1280. Run lint/build and final integrity checks at checkpoint.

- AC1/2: comparative browser renders and semantic snapshots.
- AC3: CourseCard unit coverage, source inspection, and rendered missing-media card.
- AC4/5: focused mobile E2E, affected public journey, and scoped source diff.
- AC6/7: four-width E2E, browser state inspection, lint, build, and Git checks.

- Completed: 2026-07-21. The Courses hero now uses the shared editorial field, duplicate fallback-title presentation is removed, and real bundle course evidence remains visible across breakpoints. All mapped checks passed with the limitations recorded in `evidence/COURSES-005.md`.
