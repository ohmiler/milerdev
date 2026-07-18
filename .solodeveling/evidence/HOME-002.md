---
solodeveling_schema: 1
---

# HOME-002 — Evidence

## Policy and design locks

- Claim: Authorized redesign may replace presentation while preserving behavior and safety boundaries.
  - Method: cmd.exe /c npx.cmd vitest run tests/home-policy.test.ts
  - Result: Passed, 3 tests.
  - Scope: Light-default brand invariants, redesign authorization, test guidance, and flexible palette composition.
- Claim: Obsolete homepage visual contracts no longer remain in focused tests or active homepage presentation.
  - Method: repository searches for Swiss, cssBlock, exact grid/radius/shadow assertions, VS CODE DARK+, PATH 01, PROOF INDEX, SITE DIRECTORY, and retired homepage selectors.
  - Result: No matches in remaining tests; no retired homepage selectors in globals.css, active homepage code, home components, or shared public layout.
  - Limitation: Other non-home route comments and styles were left out of scope.

## Implementation and behavior

- Claim: The public homepage uses the new human-led editorial sequence while preserving current queries, published-course limit, bundle calculations, routes, empty state, gallery interaction, affiliate disclosure, and reduced-motion behavior.
  - Method: scoped diff and static component/CSS inspection.
  - Result: Implemented in src/app/page.tsx, src/app/home.module.css, home components, navbar, and footer. Superseded global homepage CSS was removed rather than overridden.
  - Limitation: Static inspection is not rendered visual evidence.
- Claim: The local route renders the new primary content.
  - Method: Invoke-WebRequest http://127.0.0.1:3000/ with bounded content checks.
  - Result: HTTP 200; new hero, course, and teaching-proof headings present; legacy MILERDEV / PATH 01 absent.
- Claim: Frontend regression coverage targets behavior rather than CSS implementation.
  - Method: review of tests/home-policy.test.ts, tests/navbar-behavior.test.ts, and e2e/homepage.spec.ts; cmd.exe /c npx.cmd playwright test e2e/homepage.spec.ts --list.
  - Result: Three Playwright flows discovered for learner decision flow, mobile overflow/navigation, and keyboard lightbox recovery.
  - Limitation: Browser-backed E2E execution was not available.

## Engineering gates

- cmd.exe /c npm.cmd run test -- --run
  - Result: Passed, 14 files and 218 tests.
  - Note: Expected mocked error-path stderr appeared in payment/auth/admin tests; exit status was 0.
- cmd.exe /c npm.cmd run lint
  - Result: Passed.
- cmd.exe /c npm.cmd run build
  - Result: Passed; Next.js production compilation, TypeScript, and route generation completed.
- git diff --check
  - Result: Passed; line-ending conversion warnings only.
- git status --short
  - Result: Reviewed. Pre-existing deleted design documentation and skill changes remain; scoped homepage, policy, test, and Solodeveling changes are present.

## Unverified visual evidence

- Browser discovery returned no available browser backend.
- Desktop/mobile composition, visual hierarchy, real focus appearance, hover appearance, image cropping, and overflow by observation remain unverified.
- Playwright E2E was added and discovered but not executed through a browser.

## Policy and test follow-up — 2026-07-18

- Claim: Repository guidance no longer duplicates a visual specification that competes with Gridgeist.
  - Method: Scoped review of `AGENTS.md` plus `rg -n "milerdev-color-palette|IBM Plex|#00abff|line-height|touch targets|70/20/10|visual-style|exact grid" AGENTS.md`.
  - Result: `AGENTS.md` is reduced to essential workflow and safety guidance; the search returned no visual prescriptions. The only UI rule routes visual work to Gridgeist, permits authorized presentation replacement, and preserves behavior and safety boundaries.
- Claim: Source-inspection presentation contracts were removed without deleting business-flow coverage.
  - Method: File inventory after deleting `tests/home-policy.test.ts`, `tests/navbar-behavior.test.ts`, and `tests/learning-navbar.test.ts` and reviewing remaining `tests` and `e2e` files.
  - Result: No source/CSS policy test remains. Auth, payment, course, concurrency, smoke, API, validation, rate-limit, and other risk-boundary suites remain.
- Claim: Homepage browser coverage now checks behavior without locking headings, section copy, course count, CSS, or component structure.
  - Method: `cmd.exe /c npx.cmd playwright test e2e/homepage.spec.ts --list` and `cmd.exe /c npx.cmd playwright test e2e/homepage.spec.ts`.
  - Result: Two tests discovered and passed in Chromium: mobile overflow/navigation and keyboard lightbox recovery.
- Claim: Relevant regression and engineering gates pass after the cleanup.
  - Method: `cmd.exe /c npm.cmd run test -- --run`, `cmd.exe /c npm.cmd run lint`, `cmd.exe /c npm.cmd run build`, and `git diff --check`.
  - Result: Vitest passed 11 files and 210 tests; lint passed; Next.js production build and TypeScript passed; diff check passed with line-ending warnings only.
- Limitation: The successful browser flows supersede the earlier statement that browser-backed E2E was unavailable. They verify interaction, not visual quality; desktop/mobile visual observation is still pending for the broader redesign.

## Gridgeist visual iteration — 2026-07-18

### Direction and implementation

- Claim: The homepage follows one product-native editorial-trail thesis rather than repeated pastel bands and equal card grids.
  - Method: Rendered baseline comparison and scoped review of `src/app/page.tsx`, `src/app/home.module.css`, `ShowcaseGallery.tsx`, `AffiliateBannerCarousel.tsx`, and `Footer.module.css`.
  - Result: The hero now uses a full-track headline, authentic teaching photograph, connected learning rhythm, and bounded code evidence. Course discovery gives the first course greater weight, bundles read as a continuous path, partner evidence uses a structured field, the gallery is an asymmetric contact sheet, and the dark footer completes the system.
- Claim: Authentic product evidence carries the visual hierarchy.
  - Method: Full-page rendered inspection after deliberate scrolling to load below-fold images.
  - Result: Teaching and workshop photographs are visible at meaningful scale in the hero and gallery; real course, bundle, client, and affiliate data remain wired to their original sources and routes.

### Observed responsive and state evidence

- Viewports observed: 1440×1000 desktop, 768×900 tablet, and 390×844 mobile in installed Chrome, with full-page scrolling before capture.
- Result: Each viewport has one clear hero, intentional density changes, recomposed navigation/content order, readable Thai copy, and no horizontal overflow. DOM measurements were `scrollWidth === clientWidth` at all three widths.
- Result: The final desktop and mobile captures emitted no console or page errors. Tablet reduced-motion inspection reported only two external affiliate-image requests denied by the environment; the meaningful title/link fallback rendered at a stable aspect ratio instead of collapsing.
- Reduced motion: At 768 px with `prefers-reduced-motion: reduce`, code-line and affiliate-navigation transition durations computed to `0s`.
- Interaction: `cmd.exe /c npx.cmd playwright test e2e/homepage.spec.ts` passed two Chromium flows covering mobile overflow/navigation and gallery keyboard open, Escape close, and focus restoration.
- Limitation: The populated course/bundle state and affiliate image-failure state were observed. The no-course empty state remains supported by source inspection but was not rendered because local data contains published courses. Hover appearance was visually inferred from CSS and not captured as a separate artifact. No user research or usability claim is made.

### Engineering gates

- `cmd.exe /c npm.cmd run test -- --run`: passed 11 files and 210 tests; expected mocked error-path stderr appeared with exit status 0.
- `cmd.exe /c npm.cmd run lint`: passed.
- `cmd.exe /c npm.cmd run build`: passed Next.js production compilation, TypeScript, and route generation.
- `git diff --check`: passed with line-ending conversion warnings only.
- `git status --short`: reviewed; pre-existing unrelated deletions and skill changes remain preserved.
