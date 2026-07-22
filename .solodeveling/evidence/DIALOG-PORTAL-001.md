---
solodeveling_schema: 1
id: DIALOG-PORTAL-001
---

# Evidence: Dialog portal stacking repair

## Current acceptance matrix

| Criterion | Status | Evidence | Limitations |
|---|---|---|---|
| AC1: Root-level browser portal | Verified | `tests/components/dialog-portal.test.tsx` observes `createPortal` receiving `document.body`; focused Vitest passed 2 files / 8 tests. | Portal destination is asserted with a controlled DOM boundary rather than a production Bunny stream. |
| AC2: DOM-free fallback | Verified | The same focused regression renders a named inline dialog with `document` unavailable; `npm run build` completed all 90 routes. | None. |
| AC3: Dialog semantics and recovery | Verified | Shared feedback regressions passed with the portal regression; full Vitest passed 31 files / 275 tests; the focused Playwright course-preview case passed. Existing `DialogShell` effects and handlers were not changed. | Local Playwright did not exercise a real production Bunny video or every consumer interactively. |
| AC4: Project gates and integrity | Verified | `npm run lint`, `npm run build`, full Vitest, focused Playwright, and `git diff --check` passed after the source change. Scoped diff review found only the portal boundary, its regression, and work-memory changes; unrelated dirty files remain unstaged and untouched. | Existing expected stderr diagnostics appeared in full Vitest while the suite exited successfully. |

## Observation log

- 2026-07-22: Rendered course screenshot shows curriculum and course-map stacking contexts painting above the preview video. Static tracing found `DialogShell` mounted inside `.heroGrid`, while the later `.bodyGrid` is a sibling stacking context with the same `z-index: 1`.
- 2026-07-22: The new regression failed before implementation because `createPortal` was never called, while the DOM-free fallback already rendered successfully.
- 2026-07-22: `DialogShell` now builds the same overlay tree and portals it to `document.body` only when a browser DOM exists.
- 2026-07-22: Focused Vitest passed 2 files / 8 tests; full Vitest passed 31 files / 275 tests; focused Playwright passed 1 test; full ESLint and the Next.js production build passed.
