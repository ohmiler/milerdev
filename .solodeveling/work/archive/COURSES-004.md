---
solodeveling_schema: 1
---

# COURSES-004 — Catalog mobile-density refinement

- Status: done
- Level: Standard
- Authority: User authorized continuing the `/courses` UI refinement on 2026-07-21.
- Goal: Help Thai learners reach and compare real course choices faster on narrow screens while preserving the established editorial catalog language.
- Users: Guest and returning learners browsing, filtering, and comparing published courses and bundles.
- Recovery: Revert the scoped `/courses` markup/styles, focused behavior coverage, and this work/evidence pair. No data, schema, enrollment, or payment rollback is required.

## Direction and scope

Catalog decision desk for Thai learners: preserve the paper/ink/cyan editorial grid, but compress the mobile filter workflow and let course titles and truthful learning evidence lead each catalog card.

- Hide the reset action when no search, price, tag, sort, or page refinement is active.
- Keep submit and reset actions compact and touch-usable on narrow screens.
- Reduce mobile filter spacing without shrinking controls below the established 48px target.
- Give catalog-only course tags square index-label geometry and strengthen title hierarchy without changing shared Home cards.
- Preserve native GET search/filter behavior, query names, defaults, pagination, course and bundle links, price/promotion calculation, and server data access.

## Out of scope

- Course-detail, Home, bundle-detail, Navbar, Footer, auth, enrollment, payment, API, schema, stored data, dependencies, or product claims.
- Client-side filter state, auto-submit, debounce, or a new collapsible interaction.

## Acceptance criteria

1. The default mobile catalog reaches its first result with less non-result vertical space, while search and all three filters remain visible and touch-usable.
2. Reset appears only when the current URL has an active refinement and still links to `/courses`.
3. Catalog cards make the course title more prominent than tags while preserving free, paid, promotion, lesson, preview, duration, instructor, and CTA evidence.
4. Search, price, tag, sort, pagination, course links, bundle links, metadata, queries, and commerce behavior remain unchanged.
5. Default and filtered/no-result layouts have no unintended horizontal overflow at 390, 768, 1280, and 1600 CSS pixels; focus and reduced-motion behavior remain intact.
6. Focused behavior tests, affected catalog regression, lint/build at checkpoint, rendered inspection, diff integrity, and scoped Git status support completion.

## Risks and decisions

- UX: Excessive compression could harm touch use; retain 48px controls and clear labels.
- Shared component: `CourseCard` is reused on Home; use page-scoped descendants rather than changing global anatomy.
- Truth: Do not add outcomes, ratings, urgency, or savings claims beyond current data.
- Recommended approach: conditional reset plus scoped density/hierarchy adjustments. This improves the observed friction without adding a client boundary.
- Smaller option: spacing-only CSS. Rejected because an inactive reset remains misleading and consumes a full mobile row.
- Do nothing: stable but preserves avoidable mobile depth and weak card hierarchy.

## Plan and verification map

1. Add behavior coverage for default reset absence and active-filter reset recovery.
2. Compute active refinement from existing normalized params; conditionally render the existing reset link without changing query behavior.
3. Adjust only `courses.module.css` for mobile density and catalog-card hierarchy.
4. Run focused tests, render default and filtered/no-result states at representative widths, inspect focus/overflow/console, then run affected regressions, lint, build, and diff checks at checkpoint.

- AC1/3/5: rendered 390/768/1280/1600 checks plus overflow and semantic snapshots.
- AC2/4: behavior-level test and source diff review.
- AC6: recorded commands and scoped status.

- Completed: 2026-07-21
- Reconciliation: All six acceptance criteria are supported by recent evidence in `evidence/COURSES-004.md`.
- Result: Default filters omit an inactive reset, active refinements retain direct recovery, mobile spacing is shorter without reducing control targets, and catalog-only tag/title hierarchy is clearer.
- Boundary: Query, data, pricing, promotion, enrollment, payment, dependencies, and shared Home card presentation remain unchanged.
