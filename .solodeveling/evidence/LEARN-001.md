---
solodeveling_schema: 1
---

# LEARN-001 Evidence

## Current acceptance matrix

| Criterion | Status | Evidence |
|---|---|---|
| AC1 | Pass | Rendered public preview at 1280/1600 shows a persistent 300px course rail left of the learning stage. Final 1600 measurement: rail x=0 width=300; main x=300 width=1300. Stage exposes lesson title, player/no-video area, status, and next action. |
| AC2 | Pass | Playwright asserts the real H1, current lesson, free-preview state, one `aria-current` row, free label, and locked next action. Component inspection confirms course/title/index/progress/state copy derives from existing props and state. |
| AC3 | Pass with bounded limitation | Zero-context diff inspection shows no edits to existing `/api/progress` requests, watch-time payloads, Bunny callbacks, sanitized content, auto-completion, auto-advance, arrow routing, access conditions, or route targets. Full Vitest passed 20 files / 236 tests, including unauthenticated progress authorization. Real enrolled playback was not locally available. |
| AC4 | Pass | E2E measures no overflow at 390, 768, 1280, and 1600px. Mobile test opens/closes the named drawer by pointer, verifies close-button focus, Escape close and focus return. Final 390 observation: scrollWidth=clientWidth=390, drawer x=0 width=343.19, drawer z-index 120 above overlay 115. |
| AC5 | Pass with bounded limitation | Public fixture exercised no-video, locked recovery, search/no-results, and drawer states. Source inspection confirms pagination, disabled/loading completion, celebration, and reduced-motion styles remain represented; enrolled-only states were not runtime exercised. |
| AC6 | Pass | Production build and TypeScript passed. Server route ownership and serialized props were not changed; interactive changes remain inside existing client components. |
| AC7 | Pass | Full ESLint passed; focused final ESLint passed; Vitest 236/236 passed; final production build passed; focused Learning Workspace E2E passed 1/1; serial Learning Journey passed 5 with 1 fixture-dependent bundle skip; `git diff --check` passed; UTF-8/mojibake scan found no findings. |

## Observation log

- 2026-07-21: User confirmed the supplied dark learning-workspace image as the target direction and authorized implementation.
- 2026-07-21: Baseline public free-preview render at 1280px showed a right-side lesson rail, a large no-video placeholder, and lesson context below the player. At 390px the rail became a drawer, but the no-video block dominated the initial viewport and the next action was visually weak.
- 2026-07-21: Source inventory found preserved mature behavior for authorization/free-preview access, signed Bunny playback, sanitized content, lesson search/pagination, locked recovery, progress/watch-time sync, manual/automatic completion, auto-advance, keyboard navigation, celebration, and responsive sidebar controls.
- 2026-07-21: Work classified Standard because implementation is limited to presentation, semantic markup, and focused regression coverage; trust-boundary and mutation behavior is explicitly preserved.
- 2026-07-21: Implemented the dark workspace header, left desktop lesson rail, mobile drawer, stage-first player hierarchy, truthful progress/next-action deck, semantic lesson rows, and focused public-preview regression.
- 2026-07-21: Initial focused E2E after responsive assertions passed 6/6. Final visual review found the legacy sidebar z-index overriding the new drawer layer; corrected it and added a real close-button click assertion.
- 2026-07-21: A subsequent 6-worker run produced two simultaneous navigation timeouts (4 passed, 2 failed). The affected Learning Workspace test passed alone (1/1), and the full file passed serially (5 passed, 1 skipped because the local bundle fixture did not match). This is recorded as local dev-server concurrency noise, not hidden as a pass.
- 2026-07-21: Final checks: ESLint pass; Vitest 20 files / 236 tests pass; Next.js production build pass; scoped diff integrity and UTF-8 checks pass; final browser console errors: none.

## Verification limitations

- The public fixture has no lesson video and no enrolled session, so real Bunny playback, watch-time delivery, manual/automatic enrolled completion, celebration, and auto-advance were verified by unchanged-source inspection and broad tests/build rather than an end-to-end enrolled runtime.
- Playwright used the locally installed Google Chrome because the package-managed Chromium executable was absent. No dependency or permanent Playwright configuration change was made.
