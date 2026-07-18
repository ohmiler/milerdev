---
solodeveling_schema: 1
---

# HOME-012 - Make the Hero editor the dominant coding surface

## Goal

Turn the Home Hero into an exact 50/50 desktop composition where the existing learning promise remains on the left and a full-height, VS Code-informed MilerDev editor becomes the dominant product motif on the right.

## Classification

- Level: Standard.
- Lifecycle: Done. Reopened and verified on 2026-07-19 for the same-boundary continuous HTML/CSS/JavaScript typing loop refinement.
- Recovery: Revert the scoped Hero layout, HeroCodeEditor structure/styles, tests, and this work/evidence pair. No schema, data, route, authentication, enrollment, or payment change is required.

## Direction

For Thai learners deciding whether coding feels approachable, use a 50/50 editorial Hero with clear guidance on the left and an authentic code workspace on the right, expressed through MilerDev paper, ink, blue, square geometry, and file-oriented editor structure.

## Scope

- Use equal desktop Hero tracks and let the editor fill the right track vertically and horizontally.
- Remove the illustrative result preview from HeroCodeEditor.
- Recompose the editor with a restrained window bar, accessible file tabs, code canvas, and status bar.
- Preserve automatic typing, manual tab selection, pointer/focus pause, keyboard tab navigation, and reduced-motion behavior.
- Recompose tablet and mobile into text-first then editor without horizontal overflow.

## Out of scope

- Copying VS Code branding or exact proprietary presentation.
- Changing Hero copy, calls to action, course data, navigation, workspace, pricing, authentication, enrollment, or payment behavior.
- New dependencies or global design-system cleanup.

## Acceptance

- At desktop and wide widths, Hero uses two equal tracks and the editor visibly fills the right half instead of reading as a small preview card.
- No result preview, preview card, RESULT label, or preview-focused copy remains in the Hero editor.
- The editor visibly includes project orientation, accessible file tabs, code lines, and status information while staying recognizably MilerDev.
- Click, ArrowLeft/ArrowRight, Home, and End select files; pointer/focus/manual interaction pauses ambient typing; reduced motion renders stable complete code.
- Hero remains readable and has no horizontal page overflow at 390, 768, 1280, and 1600 CSS pixels.
- Focused tests, affected Home E2E, lint, build, diff checks, and rendered observations are recorded.

## Plan

1. Update focused component and E2E expectations to define the editor-only contract.
2. Recompose HeroCodeEditor markup and local styles around a file-oriented workspace.
3. Change Home Hero tracks and responsive sizing to exact equal desktop halves and a deliberate mobile stack.
4. Run focused checks, affected regressions, lint/build, rendered viewport and interaction review, then reconcile evidence and state.

## Follow-up refinement

- Match the desktop editor height to the natural left-side text-content height and create deliberate Hero space above and below.
- Remove the activity rail and explorer; file tabs remain the only file-selection control.
- Keep automatic code typing visibly continuous when the pointer enters the editor; focus and explicit tab selection still create stable manual states.
- Remove the Hero decorative rectangles and shadows that use --home-blue-soft or --home-blue.
- Preserve exact equal desktop tracks, responsive stacking, keyboard file tabs, reduced motion, and overflow behavior.
- Replace the left status label with a live VS Code-style Ln number, Col number position derived from the animated code cursor, without parentheses around either number.
- Extend the blue status treatment across the entire editor footer while preserving readable position, language, encoding, and ready-state information.
- Keep the ambient typing loop cycling HTML to CSS to JavaScript indefinitely; direct tab interaction may pause while focus remains in the editor but must resume the loop after focus leaves.
