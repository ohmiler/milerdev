---
solodeveling_schema: 1
id: BRAND-COLOR-001
---

# Evidence: MilerDev blue path

## Current acceptance matrix

| Criterion | Status | Evidence | Limitations |
|---|---|---|---|
| AC1: Accessible on-accent contract | Verified | `brand-color-contract.test.ts` verifies `#061923` on `#00ABFF` at about 7.06:1 and contextual strong pairs at >= 4.5:1; full Vitest run passed. | Contrast is calculated from fixed sRGB token values rather than sampled pixels. |
| AC2: Home primary CTA | Verified | Browser computed default `rgb(0, 171, 255)` / `rgb(6, 25, 35)` and hover `rgb(0, 117, 179)` / white; source retains active, focus-visible, transition, and reduced-motion rules. Desktop/mobile renders preserve hierarchy. | Reduced motion was source-inspected rather than OS-emulated. |
| AC3: Journey-wide blue path | Verified | Scoped diff applies semantic accent roles across course choice/enrollment, bundle enrollment, auth, recovery/status, navbar, reviews, notifications, progress, current lesson, and next action. Component regressions and public journey E2E passed. | Email, certificate, and Admin defaults intentionally remain outside this UI scope. |
| AC4: No white normal text on exact accent | Verified | Contract test scans CSS and React inline styles; repository scan found no white-on-exact-accent pairing in scoped UI. | Darker contextual hover blue is intentionally paired with white. |
| AC5: Semantic/Admin boundaries | Verified | Git/source review found no Admin UI changes and preserved success, warning, error, destructive, promotion, auth, payment, and data behavior. | Pre-existing dirty `.agents` changes are unrelated and preserved. |
| AC6: Responsive, focus, and theme behavior | Verified | E2E checked Home, Courses, course detail, and Learning at 390/768/1280/1600 widths; browser audit covered Home at 1440/390 and Login/404 at 390. Exact widths matched scroll widths. Keyboard focus on 404 primary showed a 3px accent ring; Learning retained its dark context. | Error UI was not deliberately forced; the 404 status surface represents recovery. |
| AC7: Project gates and integrity | Verified | 273/273 Vitest tests, 6/6 serial Chromium E2E, ESLint, Next production build, token scans, and `git diff --check` passed. | First parallel E2E run passed 4/6; two timeouts displayed fully rendered target pages and the unchanged spec passed 6/6 with one worker, confirming dev cold-compile contention. |

## Observation log

- 2026-07-22: Static review found that `#00ABFF` is the canonical semantic accent and is referenced broadly through tokens, but existing representative renders devote roughly 0.03% to 1.23% of sampled pixels to near-brand blue on most surfaces. Exact accent with white text measures about 2.54:1 contrast, while `#061923` on exact accent measures about 7.06:1.
- 2026-07-22: Added the exact-accent foreground contract, contextual strong foreground, Home primary/closing treatment, journey-wide semantic adoption, purchase edge, and stronger learning progress/current traces. Added a contract regression that covers CSS and React inline styles.
- 2026-07-22: Focused component/contract run passed 11/11; full Vitest passed 273/273; ESLint and Next.js production build passed.
- 2026-07-22: `e2e/public-learning-journey.spec.ts` passed 6/6 with one worker. Its initial six-worker cold run passed 4/6; screenshots and snapshots showed both timed-out targets had rendered correctly after the assertion deadline.
- 2026-07-22: Browser audit observed Home primary default and hover pairs, Login primary exact-accent pair, 404 keyboard focus ring, no horizontal overflow at 390px, and coherent light-public/dark-learning presentation. Artifacts are under `output/playwright/brand-color-001/`.
