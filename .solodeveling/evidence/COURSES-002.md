---
solodeveling_schema: 1
---

# COURSES-002 evidence

- Verified: 2026-07-20
- Scope: Public `/courses/[slug]` presentation, loading state, semantic decision evidence, curriculum/review navigation, and related behavior tests.

## Acceptance reconciliation

1. Decision evidence: The server-rendered hero exposes stored tags, lesson count, derived duration when present, free-preview count, instructor when stored, and the existing current price/promotion state before the CTA. The semantic detail E2E passed against local published data.
2. Content structure: Overview, curriculum, and reviews have stable headings, anchors, and an in-page navigation landmark. Stored sanitized description content remains the source; sparse content is not embellished.
3. Commerce/access preservation: `CourseDetailClient` still receives the same course ID, slug, `displayPrice`, render mode, and lesson inputs. `EnrollButton`, lesson access logic, auth, APIs, promotion calculation, and provider integrations were not edited. Paid/free CTA and guest redirect regressions passed.
4. Responsive behavior: Full-page Chromium renders at 390 and 1440 CSS pixels were inspected. Automated overflow coverage passed at 390, 768, 1280, and 1600 CSS pixels for Home, catalog, and the selected course detail.
5. Accessibility: The route exposes one main landmark, labeled breadcrumbs/evidence/section navigation/enrollment/decision notes, semantic headings, and a first-page skip link. Keyboard regression confirms the skip link is reachable within three tabs under the Next dev toolbar. Focus styles and minimum CTA/control sizing are explicit. Reduced-motion rules disable route animation/transition duration.
6. Style ownership: New composition and loading presentation live in `course-detail.module.css` using established semantic tokens. Superseded detail globals were removed; shared curriculum and review rules remain global because their client components still own those classes.
7. Gates: Affected E2E, focused final regression, full lint, production build, rendered review, console-error assertion, reduced-motion inspection, and diff integrity passed.

## Commands and observed results

- `npm run test:e2e -- e2e/public-learning-journey.spec.ts e2e/course.spec.ts e2e/payment.spec.ts --project=chromium`: 37/37 passed after repairing the pre-existing generic bundle `nav` selector to the named primary-navigation landmark.
- `npm run test:e2e -- e2e/public-learning-journey.spec.ts --project=chromium --grep "course detail presents"`: 1/1 passed after the final console-error and keyboard regression edit.
- `npm run lint`: passed after final source and test edits.
- `npm run build`: passed with Next.js 16.1.4; TypeScript, page-data collection, and all 90 static/dynamic route entries completed.
- Chromium full-page renders: paid course inspected at 390×844 and 1440×1000; promotion contrast, evidence grid, CTA boundary, mobile ordering, curriculum rows, and review hierarchy were visible.
- Four-width behavior: no unintended horizontal overflow at 390, 768, 1280, or 1600 CSS pixels in the E2E viewport loop.
- Browser console: focused course-detail E2E recorded zero console errors.
- `git diff --check`: passed before evidence reconciliation; final integrity was rerun at handoff.

## Changed boundaries

- `src/app/courses/[slug]/page.tsx`: server composition and real derived evidence only.
- `src/app/courses/[slug]/loading.tsx`: loading composition aligned to the dossier layout.
- `src/app/courses/[slug]/course-detail.module.css`: route-scoped responsive presentation.
- `src/app/globals.css`: removed superseded top-level detail/loading rules; retained shared lesson/review rules.
- `e2e/public-learning-journey.spec.ts`: decision evidence, section anchors, viewport overflow, skip-link focus, and console-error contracts.
- `e2e/payment.spec.ts`: repaired a generic `nav` locator exposed by the existing three navigation landmarks; no payment assertion changed.

## Limitations and remaining risk

- Local seed data covered paid promotion, free preview, instructor, and free-course CTA behavior, but it is not production performance or user-research evidence.
- Real authenticated Stripe, PromptPay/SlipOK, email, and external-provider flows were intentionally not exercised; no provider or commerce implementation changed.
- Reduced-motion behavior is supported by scoped CSS and static inspection; no visual-diff tooling was introduced.
- Generated screenshots and Playwright artifacts remain untracked and outside product commits.
