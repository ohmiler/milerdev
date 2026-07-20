---
solodeveling_schema: 1
---

# COURSES-003 — Editorial payment controls

- Status: done
- Level: Critical
- Authority: User explicitly authorized the Gridgeist button and tag corrections on 2026-07-20.
- Goal: Align every course-detail enrollment and payment control with the approved editorial dossier language without changing commerce behavior.
- Users: Guest, authenticated, enrolled, free-course, paid-course, coupon, Stripe, PromptPay/slip, loading, error, and success states.
- Recovery: Revert the EnrollButton class/style refactor, route tag geometry, focused tests, and this work/evidence pair. No data, payment, enrollment, or provider rollback is required.

## Direction and scope

Editorial action rail: one square-edged control geometry; solid accent for primary action, neutral outline for secondary action, semantic color only for state, and explicit focus/loading/disabled behavior. Course tags become compact bordered index labels rather than pills.

- Replace inline visual styling in `EnrollButton` with a scoped CSS module across the primary CTA, payment-method dialog, coupon controls, Stripe/PromptPay choices, slip upload/preview, and actions.
- Preserve all handlers, request URLs, methods, bodies, price/effective-price calculations, redirect targets, modal copy, file validation, enrollment context, and provider behavior.
- Keep dialogs readable and operable at mobile and desktop widths; do not broaden into a general payment refactor.

## Out of scope

- API, schema, webhook, idempotency, amount calculation, authorization, session, payment fulfillment, provider configuration, upload limits/types, secrets, stored data, or production changes.
- Bundle payment controls, shared Modal redesign, or new dependencies.

## Acceptance criteria

1. Default paid/free, checking, loading, enrolled, coupon, provider choice, slip, disabled, error, and success-related controls share the editorial geometry and semantic token system without gradients or decorative shadows.
2. Course tags remain links to the same filtered catalog URLs, with square index-label geometry, visible hover/focus, and usable targets.
3. Enrollment/payment handlers, request payloads, effective amount, redirects, file validation, provider choices, and authorization behavior are unchanged.
4. Payment dialogs expose dialog semantics, accessible names, Escape/backdrop recovery where currently supported or safely addable, and visible keyboard focus without obscuring content.
5. Paid/free guest flows, API security/payment regressions, mobile/desktop rendering, overflow, reduced motion, lint, build, and diff integrity support completion.

## Attack-surface matrix

| Boundary | Risk | Control | Verification | Recovery |
| --- | --- | --- | --- | --- |
| Guest/auth enrollment decision | Styling could hide or trigger the wrong action | Preserve handlers, button types, session checks, and redirect targets | Existing paid/free guest E2E plus static diff | Revert component presentation files |
| Payment amount/provider selection | Refactor could alter price or request payload | No logic edits; retain `price`, `effectivePrice`, coupon ID, course ID, and endpoints | Payment API/unit regressions and scoped diff | Revert presentation-only commit/worktree diff |
| Slip upload | Visual rewrite could weaken type/size or verifying lock | Preserve accept list, 5MB check, disabled states, and reset behavior | Static boundary review plus payment tests | Revert CSS/class changes |
| Dialog interaction | New layout could trap or lose keyboard users | Semantic dialog labels, focus-visible controls, stable close/back actions | Browser keyboard/render check | Revert dialog markup attributes/classes |
| Sensitive/provider data | Accidental logging or exposure | No new logging, fields, dependencies, or secret access | Diff review and build | Revert scoped files |

## Implementation plan

1. Add focused component-level coverage for stable CTA labels/types and authenticated paid method selection without calling providers.
2. Add `EnrollButton.module.css`, replace inline presentation with named state classes, and add dialog semantics while preserving event logic byte-for-byte where practical.
3. Adjust course-detail tag geometry and route-level CTA wrapper so it does not override internal dialog controls.
4. Render paid/free desktop and mobile states, exercise guest redirects and authenticated dialog controls with mocks where available, then run payment/security regressions, lint, build, and reconcile evidence.

## Security and recovery constraints

- No production credentials or external provider smoke checks.
- Mock Stripe, SlipOK, and other providers in tests; never submit a real payment or slip.
- Do not change financial fulfillment, server validation, idempotency, or authorization.
- Any unexpected request/payload/redirect change stops execution and returns to diagnosis.

## Completion

- Replaced the enrollment and payment presentation with a scoped editorial control system, including primary states, coupon controls, provider choices, slip upload, feedback, and mobile composition.
- Changed course tags from pills to bordered index labels while preserving their filtered-catalog links.
- Portaled both payment dialogs to the document body after browser evidence showed the course overview could intercept mobile pointer events inside the hero stacking context.
- Preserved handlers, endpoints, request bodies, amount calculation, redirects, validation, authorization, and provider behavior.
- Recovery remains presentation-only: revert the component CSS/markup, route tag styles, focused E2E, and this memory pair. No data or provider rollback is needed.
