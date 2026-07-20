---
solodeveling_schema: 1
---

# DESIGN-001 - Shared feedback primitives

- Status: done
- Level: Standard
- Authority: User authorized the proposed Design System Foundation Slice on 2026-07-21.
- Goal: Give MilerDev dialogs and toasts one accessible, theme-aware component grammar without changing enrollment, payment, admin, authentication, or data behavior.
- Users: Public visitors, learners, and administrators who encounter informational, success, warning, error, confirmation, and destructive feedback.
- Recovery: Revert the new feedback CSS/module helpers, the three shared UI component refactors, focused tests, and this work/evidence pair. No schema, data, payment, enrollment, provider, or authorization recovery is required.

## Direction and scope

MilerDev is a structured and approachable Thai coding-learning product. Feedback surfaces use a quiet grid, compact cyan/ink geometry, explicit semantic state, and stable recovery controls rather than decorative gradients, large floating shapes, or isolated hardcoded palettes.

- Preserve the current public, learning, and admin theme scopes and reuse their semantic tokens.
- Add a component-token layer and shared dialog behavior for `Modal`, `ConfirmDialog`, and `Toast`.
- Preserve each public component API and every consumer callback.
- Add named dialog semantics, Escape recovery, contained Tab navigation, initial focus, focus restoration, body-scroll restoration, visible focus, reduced motion, narrow-screen resilience, and non-color state cues.
- Keep confirmation dialogs deliberate: Escape and Cancel recover; backdrop clicks do not confirm or dismiss destructive work accidentally.

## Out of scope

- Broad `globals.css` token consolidation, `DESIGN.md`, PageHeader cleanup, route redesign, admin-theme redesign, course-detail styling, or migration of unrelated inline styles.
- Enrollment, payment, authentication, authorization, request payloads, redirects, database, schema, providers, or production behavior.
- New runtime or test dependencies.

## Acceptance criteria

1. `Modal`, `ConfirmDialog`, and `Toast` no longer carry inline visual systems or hardcoded status palettes; they share semantic component tokens and task-based variants.
2. Open dialogs expose an accessible role and name, keep keyboard focus within the dialog, close through the intended Escape/cancel path, restore prior focus, and restore the prior body overflow value.
3. Confirmation controls retain their existing callbacks and labels, use explicit button types, and visually distinguish secondary from destructive actions without relying on color alone.
4. Toasts preserve the existing `showToast` API and timeout behavior while exposing appropriate live-region semantics for informational/success and error feedback.
5. Focused tests cover closed/open markup, dialog semantics, task variants, and toast contract; lint, build, diff integrity, and relevant existing regressions pass.
6. No user-owned course-detail, payment, E2E, or unrelated worktree changes are modified.

## Implementation plan

1. Add a scoped feedback CSS module and a small shared dialog shell with behavior isolated from product callbacks.
2. Refactor `Modal` and `ConfirmDialog` onto the shell while preserving their exported props and consumer behavior.
3. Refactor `Toast` onto the same semantic feedback grammar and preserve its imperative API.
4. Add focused static component-contract tests, run the narrow tests and ESLint, then run the full test suite and build when practical.
5. Reconcile acceptance, evidence, Git diff integrity, and remaining visual-browser limitations before completion.

## Risks and controls

- Focus handling could interfere with enrollment/admin actions: keep product callbacks untouched and test semantic/control contracts.
- Body scroll could remain locked: capture and restore the exact prior inline overflow value on every cleanup path.
- Admin styling could be lost: consume admin tokens first with public semantic-token fallbacks in the component layer.
- Destructive confirmation could dismiss unexpectedly: do not enable backdrop dismissal for `ConfirmDialog`; Escape maps only to its existing cancel callback.
- Visual evidence is currently unavailable because no browser backend is connected; do not claim rendered or usability verification without it.

## Completion

- Replaced the three isolated inline feedback systems with one scoped semantic component layer and a shared DialogShell.
- Preserved Modal, ConfirmDialog, and showToast public APIs and left all enrollment, payment, authentication, admin, and consumer files unchanged.
- Added dialog naming, alert/dialog roles, safe initial focus, contained Tab navigation, Escape cancellation, focus and exact body-overflow restoration, explicit button types, live-region roles, reduced motion, narrow-screen composition, and forced-color treatment.
- Verification is complete at source, component-contract, lint, test-suite, and production-build levels. Rendered visual and real keyboard observations remain explicitly unverified because no browser backend was available.
