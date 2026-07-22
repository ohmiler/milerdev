---
solodeveling_schema: 1
id: LEARNER-STATES-001
---

# Evidence: learner status surfaces

## Current acceptance matrix

| Criterion | Status | Evidence |
|---|---|---|
| 1. 404 orientation, actions, and public shell | Pass | Focused SSR test and runtime HTTP 404 confirm Thai heading, Home/Courses links, Navbar, and Footer. Playwright snapshots and screenshots at 1440×1000 and 390×844 show the public shell and recovery hierarchy intact. |
| 2. Error recovery behavior and safe disclosure | Pass | Focused SSR excludes the supplied private error message. A forced local HTTP 500 rendered the custom boundary at both viewports; clicking `ลองใหม่อีกครั้ง` re-ran the failing segment and returned to the recovery state, while Home remained available and raw details stayed out of the UI. |
| 3. Brand grammar, focus, responsive behavior | Pass | Rendered desktop/mobile review confirmed the editorial status rail, Thai hierarchy, stacked mobile actions, and no horizontal overflow (`1432 ≤ 1440`, `382 ≤ 390`). Keyboard Tab reached the primary recovery link with the expected 3px MilerDev focus ring. |
| 4. Dashboard loading semantics and structural fidelity | Pass | Focused test and Playwright semantic snapshots confirm the busy label and hidden decoration. Desktop/mobile screenshots show header/account navigation, four-stat summary, continuation feature, and course index matching the live dashboard order and responsive recomposition without horizontal overflow. |
| 5. Reduced motion and decorative accessibility | Pass | The visual skeleton container is `aria-hidden` while the main exposes `กำลังโหลดแดชบอร์ดการเรียน`. Playwright measured 39 active shimmer animations normally and 0 after emulating `prefers-reduced-motion: reduce`. |
| 6. Safe legacy PageHeader removal | Pass | Repository-wide search before deletion found only the definition and legacy CSS. Post-deletion search found no `PageHeader`, `.page-header-*`, or related keyframes; neighboring `PublicPageHeader` tests passed 2/2. |
| 7. Focused and broad verification | Pass | Final focused and neighboring Vitest passed 5/5; full lint passed; final production build compiled, type-checked, and generated 90 routes after audit harness removal; runtime and Playwright checks passed; `git diff --check` passed. |

## Observation log

- 2026-07-22: Static inspection confirmed `error.tsx`, `not-found.tsx`, and dashboard loading use legacy inline gradients/cards while the live dashboard uses the newer editorial learner grammar.
- 2026-07-22: Repository-wide `rg` found no `PageHeader` import or JSX consumer; `PublicPageHeader` is a separate active component used by About and Contact.
- 2026-07-22: Added a shared editorial status surface, route-owned recovery actions, and a dashboard loading module aligned to the live dashboard anatomy. Initial focused regression failed on missing dashboard busy semantics; the implemented test then passed 3/3.
- 2026-07-22: Focused and neighboring tests passed 5/5. Focused ESLint and full `npm run lint` passed. `npm run build` compiled, type-checked, and generated 90 routes. A local missing-route request returned HTTP 404 with the expected Thai heading and Home/Courses links.
- 2026-07-22: Post-cleanup search found no legacy PageHeader component, selectors, or keyframes. Changed routes contain no inline style blocks. `git diff --check` passed.
- 2026-07-22: Browser runtime setup succeeded but `agent.browsers.list()` returned an empty list. Per the Browser workflow, no unrelated browser backend was substituted; 1440px/390px visual, keyboard-focus, overflow, forced-error, dashboard-loading, and reduced-motion observations remain unverified.
- 2026-07-22: `solodeveling-validate` was unavailable; state/work/evidence schema and references were reviewed manually. Existing unrelated `.agents`, `.claude`, `.playwright-cli`, and `output` changes were preserved.
- 2026-07-22: On explicit completion follow-up, terminal Playwright provided a real Chromium backend. Temporary local-only routes rendered the root error boundary and DashboardLoading component and were removed before final gates.
- 2026-07-22: Observed 404 at 1440×1000 and 390×844 with HTTP 404, public shell, balanced desktop rail/content, stacked mobile composition, scroll widths within the viewport, and a keyboard-visible primary recovery focus ring. Screenshots: `output/playwright/learner-states-001/.playwright-cli/page-2026-07-22T09-03-22-095Z.png` and `page-2026-07-22T09-05-56-587Z.png`.
- 2026-07-22: Observed forced error at both viewports with HTTP 500, no raw detail in the UI, responsive recovery actions, no overflow, and a successful retry invocation that re-rendered the boundary. Screenshots: `page-2026-07-22T09-06-45-713Z.png` and `page-2026-07-22T09-07-37-364Z.png`. Console errors were the intentional forced exception and Next development overlay output.
- 2026-07-22: Observed DashboardLoading at both viewports with semantic busy labeling, hidden skeleton decoration, dashboard-matching anatomy, and no overflow. Reduced-motion emulation reduced active animations from 39 to 0. Screenshots: `page-2026-07-22T09-08-49-625Z.png` and `page-2026-07-22T09-09-33-872Z.png`. Console warnings were development-only preloaded-style warnings produced while navigating between audit routes.
- 2026-07-22: Removed all temporary audit routes, stopped local browser/server processes, then reran focused and neighboring Vitest (5/5), full lint, production build (90 routes), legacy/audit-route searches, and diff integrity successfully.
