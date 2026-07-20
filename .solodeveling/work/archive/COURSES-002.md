---
solodeveling_schema: 1
---

# COURSES-002 — Course detail decision dossier

- Status: done
- Level: Standard
- Authority: User asked on 2026-07-20 to commit COURSES-001 and continue; project state selects `/courses/[slug]` next.
- Goal: Turn the public course detail into a truthful decision dossier that connects the catalog evidence to the existing enrollment path.
- Users: Thai-language learners evaluating whether to preview, enroll in, or buy one published course.
- Recovery: Revert only the scoped detail-page composition, styles, presentation tests, and this work/evidence pair. No schema, data, auth, enrollment, or payment rollback is required.

## Direction

An editorial course dossier: a restrained evidence-led header, a clearly bounded enrollment panel, and a reading column that separates overview, curriculum, and learner reviews. The page should feel like the next page of the approved catalog, not a generic marketplace product card.

- Brand source: approved paper/ink/accent palette, bordered grids, square geometry, Thai editorial hierarchy, and real learning evidence.
- Preserve: published-course query, metadata, sanitization, Bunny signing, pricing and promotion calculation, enrollment context, lesson access, reviews, Navbar, and Footer.
- Evolve: evidence order, instructor visibility, preview visibility, responsive composition, section navigation, and page-local style ownership.
- Exclude: invented outcomes, levels, social proof, urgency, guarantees, or claims unsupported by stored data.

## Scope

- Redesign only `src/app/courses/[slug]/page.tsx`, its loading state, and detail-specific presentation.
- Expose stored or derived facts only: lessons, duration when present, free-preview count, instructor when present, tags, price, active promotion, and course description.
- Preserve all enrollment/payment/auth components and their inputs exactly.
- Add behavior-level regression coverage for the decision evidence and preview-to-login boundary.
- Verify representative free and paid local courses at 390, 768, 1280, and 1600 CSS pixels.

## Out of scope

- Enrollment, checkout, coupon, SlipOK, Stripe, PromptPay, webhook, review API, or authorization changes.
- Schema, migrations, stored content, dependencies, bundle detail, learning player, or admin pages.
- Claims derived from assumptions rather than database fields.

## Acceptance criteria

1. A learner can identify the course, stored topic tags, lesson count, duration when available, free-preview availability, instructor when available, and current price state before the enrollment CTA.
2. Overview, curriculum, and reviews have semantic headings and direct in-page navigation; no stored course description is replaced or embellished.
3. Free-preview lesson behavior, locked-lesson behavior, enrollment CTA state, promotion state, and price passed to `CourseDetailClient` remain unchanged.
4. No unintended horizontal overflow occurs at 390, 768, 1280, or 1600 CSS pixels; enrollment evidence remains readable without obscuring the curriculum.
5. Keyboard focus, landmarks, labels, native controls, touch targets, and reduced-motion behavior remain usable.
6. Detail presentation is page-scoped and uses established semantic tokens; unrelated shared surfaces and commerce logic do not change.
7. Recent affected E2E, payment regressions, lint, build when practical, rendered checks, `git diff --check`, and scoped status support completion.

## Risks

- Commerce trust: visual changes can accidentally hide an active promotion or make a stale price look current; retain the existing calculations and render all price states explicitly.
- Authorization: lesson rows are interactive; keep the existing `CourseLessonList` access decisions untouched.
- Truth: local course descriptions are sparse; whitespace and hierarchy must not be filled with fabricated claims.
- Responsive: the enrollment panel can dominate narrow screens; preserve it before curriculum while reducing dead space and maintaining touch targets.
- Operational: local seeded data is not production performance or user-research evidence.

## Implementation plan

1. Add focused semantic E2E coverage for paid decision evidence, curriculum anchors, and free-preview access/login behavior.
2. Recompose the server page with a page-local CSS module, real derived evidence, an instructor line when stored, and semantic overview/curriculum/review anchors.
3. Align the loading state with the same responsive dossier composition; remove only superseded detail-specific global rules.
4. Run affected E2E and payment flows, lint, build, four-width render/overflow/focus/reduced-motion checks, and reconcile evidence.

## Acceptance-to-verification map

- AC1–2: semantic E2E plus paid/free rendered inspection and static source review.
- AC3: existing `e2e/payment.spec.ts`, focused course E2E, and diff inspection proving no commerce component/API edits.
- AC4–5: four-width Chromium measurements, keyboard traversal, console review, and reduced-motion check.
- AC6: scoped diff and CSS ownership review.
- AC7: recorded gates and Git integrity in `evidence/COURSES-002.md`.

## Readiness

- Confirmed: Current page already obtains all required course, lesson, tag, instructor, promotion, and signed-preview inputs server-side.
- Confirmed: Existing payment E2E protects guest redirects and free/paid CTA labels.
- Material unknowns: None that change architecture, security, data, cost, or acceptance.
- Decision boundary: Any change to enrollment, payment amount, authorization, schema, stored content, or external-provider behavior returns to shaping as Critical work.

## Completion

- Completed: 2026-07-20
- Reconciliation: All seven acceptance criteria are supported by recent evidence in `evidence/COURSES-002.md`.
- Verification: Affected E2E 37/37, final focused detail E2E 1/1, full lint, production build, 390/1440 rendered inspection, four-width overflow regression, keyboard skip-link focus, console-error regression, reduced-motion CSS review, and diff integrity passed.
- Limitations: Local seeded renders are not production performance or user-research evidence. Authenticated checkout provider UI and real provider credentials were not exercised; existing mocked/security boundaries remained unchanged.
- Boundary: No schema, data, API, auth, enrollment, payment, dependency, secret, or production action changed.
