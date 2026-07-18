---
solodeveling_schema: 1
---

# HOME-010 Evidence - Course evidence and hero outcomes

Date: 2026-07-19

## Direction and scope

- Gridgeist 1.1.2 was the product and visual direction authority.
- Thesis: For Thai learners choosing where to begin, use a calm technical-editorial grid to connect real curriculum evidence with a visible code-to-result motif, while preserving MilerDev's Thai voice, paper/ink/blue palette, square geometry, pricing truth, and existing navigation.
- Scope stayed within the public Home hero, public course catalog evidence, catalog metadata hierarchy, and regression coverage. No schema, stored data, authentication, enrollment, or payment behavior changed.

## Implementation evidence

- `src/app/courses/page.tsx` now aggregates lesson count, total video duration, and free-preview count, normalizes the values, and passes truthful metadata to `CourseCard` using the same positive-value omission behavior as Home.
- `src/components/home/HeroCodeEditor.tsx` now presents a labeled demo with linked code and illustrative result panes. Pointer presence, focus, explicit tab selection, and reduced-motion preference determine playback state; manual selection is not overwritten by ambient rotation.
- `src/app/globals.css` gives catalog metadata a clearer vertical hierarchy and permits the instructor label to wrap instead of truncating on narrow screens.
- Unit and E2E coverage was added for static demo semantics, catalog evidence, hover/focus/manual/reduced playback states, keyboard tab selection, and representative viewport overflow.

## Rendered observations

- Playwright CLI rendered Home and `/courses` at 390, 768, 1280, and 1600 CSS pixels. At every width, `documentElement.clientWidth` equaled `scrollWidth`; no horizontal overflow was observed.
- Desktop Home showed the code and illustrative result as a balanced pair. At 390 pixels they stacked in reading order with the demo/result labels visible.
- Browser accessibility inspection showed three linked tabs and one labeled tabpanel. Console inspection reported zero errors; only development-mode stylesheet preload warnings were present.
- The local catalog rendered two cards, each with tags, lesson count, instructor, free-preview cue, and CTA. Aggregate local duration was zero and was therefore correctly omitted rather than fabricated.
- Visual QA initially exposed a truncated instructor on the 390-pixel catalog. The catalog metadata rule was corrected, then re-rendered and inspected with the full `สอนโดย Instructor Demo` label visible and no overflow.

## Automated verification

- `npx vitest run tests/components/course-card.test.tsx tests/components/hero-code-editor.test.tsx` — passed, 2 files and 3 tests. The static styled-jsx render emits a known non-failing React `jsx` attribute warning.
- `npx playwright test e2e/homepage.spec.ts e2e/public-learning-journey.spec.ts --reporter=line` — passed, 5 tests.
- `npx vitest run` — passed, 13 files and 213 tests. Expected stderr from negative-path mocks remained non-failing.
- `npm run lint` — passed with no lint findings.
- `npm run build` — passed; Next.js completed the production build and route generation.
- `git diff --check` — passed; Git reported only line-ending conversion notices.

## Acceptance reconciliation

- Catalog evidence: met through aggregate query/prop wiring, unit coverage for positive duration and missing-value omission, and rendered local catalog evidence.
- Pricing and promotions: met; no related query, calculation, or CourseCard pricing behavior changed.
- Code-to-result demo: met through visible DEMO/result labels and linked active snippet presentation.
- User-controlled playback: met through hover, focus, keyboard/manual, and reduced-motion E2E checks.
- Keyboard accessibility: met for ArrowLeft/ArrowRight/Home/End implementation, linked tab semantics, and representative ArrowRight E2E behavior.
- Responsive composition: met through rendered and computed overflow checks at 390, 768, 1280, and 1600 pixels.
- Verification: met through focused tests, full Vitest, affected E2E, lint, build, diff check, console inspection, and rendered review.

## Limits and remaining risk

- Local course data had zero aggregate video duration, so the positive-duration presentation is protected by focused component coverage rather than a live local card observation.
- Rendered verification covered guest-facing Home and catalog states with the current local dataset; it did not exercise authenticated or production data.
- The new implementation remains uncommitted so the user can review it before requesting a separate commit.