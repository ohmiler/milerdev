---
solodeveling_schema: 1
id: DIALOG-PORTAL-001
status: done
level: Standard
---

# Dialog portal stacking repair

## Intent

Keep every shared dialog above page stacking contexts so course content cannot paint over the preview video, while preserving the existing dialog semantics and interactions.

## Scope

- Portal open `DialogShell` surfaces to `document.body` in the browser.
- Preserve server/static markup fallback, naming, focus trap, Escape, backdrop dismissal, scroll lock, and focus return.
- Add focused portal and shared-dialog regressions.

## Out of scope

- Dialog visual redesign, payment/enrollment behavior, provider behavior, APIs, database, or production data.

## Acceptance criteria

1. An open browser dialog is rendered under `document.body`, outside caller stacking contexts.
2. Server/static rendering remains named and does not require a DOM.
3. Existing shared dialog semantics and recovery controls remain covered by regressions.
4. Focused tests, lint, build when practical, and diff integrity pass without unrelated changes.

## Risks and recovery

- Shared payment and confirmation dialogs use this primitive; all props and interaction effects remain unchanged.
- Revert the `DialogShell` portal boundary and focused regression if a hydration or focus regression appears.

## Outcome

- `DialogShell` renders its unchanged overlay tree through `createPortal(..., document.body)` in the browser and retains an inline fallback without a DOM.
- The course curriculum and course-map stacking contexts can no longer paint above the preview video dialog.
- Focused and full regressions, browser preview coverage, lint, build, and diff integrity passed; evidence and limitations are recorded in `.solodeveling/evidence/DIALOG-PORTAL-001.md`.
