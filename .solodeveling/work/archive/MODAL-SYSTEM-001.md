---
solodeveling_schema: 1
---

# MODAL-SYSTEM-001: Learner modal system

- Status: done
- Level: Standard
- Direction: User-confirmed continuation of the learner-facing editorial/workbench redesign.
- Goal: Give learner-facing confirmations and course/bundle payment tasks one coherent dialog shell without changing commerce, enrollment, authentication, or authorization behavior.

## Direction and boundaries

- Thesis: Thai-first learner decisions presented as a compact transaction workbench with square geometry, explicit status, stable task order, and MilerDev blue reserved for focus and primary action.
- In scope: DialogShell, Modal, ConfirmDialog, learner-facing shared dialog styling, course payment method/coupon/slip dialogs, bundle payment alignment, Course Preview Video, and an audit of the existing Gallery lightbox.
- Out of scope: admin form-modal redesign, Gallery lightbox visual replacement after its existing media-specific interaction contract passed inspection, payment APIs, price calculation, coupon authority, slip verification authority, enrollment grants, authentication, and database behavior.
- Preserve: named dialogs, focus trap, Escape handling, focus restoration, body scroll lock, backdrop policy, loading/disabled/error/success states, payment endpoints and payloads, file constraints, redirects, and Thai copy meaning.
- Admin boundary: public fallback geometry may change, but existing --admin-* dialog tokens continue to own admin radius, colors, and elevation.

## Acceptance criteria

1. Learner informational, confirmation, payment, and course-preview dialogs share square public geometry, clear containment, semantic state color, and task-ordered actions while admin token overrides remain intact.
2. Course payment method and slip flows use DialogShell rather than a separate overlay implementation and retain payment, coupon, file, loading, error, success, and recovery behavior.
3. Shared dialogs remain named and modal, trap keyboard focus, close with Escape when allowed, respect non-dismissible verification state, lock background scroll, and restore prior focus.
4. Course, bundle, confirmation, and course-preview dialogs render without horizontal overflow at representative 360, 768, and 1280 px widths; long Thai content and tall slip tasks remain scrollable with 44px-or-larger controls.
5. Focused dialog/payment regressions, lint, build, diff integrity, scope review, and rendered interaction checks pass.

## Plan

1. Strengthen shared public dialog geometry, overflow, action, focus, reduced-motion, and forced-color presentation while preserving admin token overrides.
2. Migrate the course method/coupon and slip-verification overlays to DialogShell, removing duplicate overlay CSS and preserving the payment contract.
3. Add focused component contract coverage for the course payment boundary and shared semantic dialog/media anatomy; migrate the legacy Course Preview overlay while retaining the compliant Gallery lightbox.
4. Render learner dialogs at representative widths and exercise keyboard, backdrop, Escape, loading/disabled, error, and focus-restoration behavior.
5. Run affected tests, lint, build, reconcile design documentation and memory, then hand off without committing unless requested.

## Risks and recovery

- A dialog migration could accidentally alter a payment request, amount, coupon, upload field, or success transition; keep handlers intact and protect stable constants with focused tests.
- Focus can regress when moving between method and transfer steps; exercise Tab, Shift+Tab, Escape, and restoration in a real browser.
- Tall payment content can become unreachable on mobile; constrain the panel to the dynamic viewport and keep the panel scrollable.
- Recovery is a scoped revert of shared feedback presentation, course dialog composition, tests, design documentation, and this work record. No API, schema, dependency, or data rollback is required.

## Outcome

- Unified learner informational, confirmation, course/bundle payment, and course-preview dialogs on DialogShell with square public geometry and preserved admin token overrides.
- Replaced the course payment overlays with the same named, focus-managed shell already used by bundle payments while retaining endpoints, payload fields, coupon behavior, upload constraints, and result transitions.
- Added scroll containment, visible task action rails, media sizing, filtered focus targets, backdrop focus preservation, and explicit focus return for logout confirmation.
- Audited the Gallery lightbox and retained it as a media-specific viewer because it already provides square controls, keyboard navigation, focus trapping/restoration, scroll lock, reduced motion, and responsive composition.
