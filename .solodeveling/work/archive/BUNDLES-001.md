---
solodeveling_schema: 1
---

# BUNDLES-001 - Bundle decision and payment surface

- Status: done
- Level: Critical
- Authority: User authorized implementation on 2026-07-21.
- Goal: Make `/bundles/[slug]` a clear, consistent purchase decision surface while preserving every bundle enrollment and payment boundary.
- Users: Visitors comparing a bundle, signed-in learners purchasing or enrolling, and existing learners returning to their courses.
- Recovery: Revert the bundle page/module, bundle enrollment component/module, focused tests, and additive DialogShell sizing/content support. No database, schema, provider, entitlement, or production-data operation is in scope.

## Direction and scope

Use a decision-first bundle dossier: paper/ink/cyan geometry, visible course sequence, evidence-led value summary, and a stable purchase rail. Preserve the established MilerDev public design language without copying the course hero composition verbatim.

- Restyle only the public bundle detail and its bundle-specific enrollment/payment controls.
- Preserve server data reads, published filtering, metadata, authentication checks, price calculations, enrollment checks, API paths, HTTP methods, payload fields, redirects, upload constraints, provider selection, loading locks, and success/error recovery.
- Add named dialog semantics, focus containment/restoration, Escape recovery, visible focus, reduced motion, responsive composition, and non-color status cues.
- Add only backwards-compatible support to the shared dialog shell where the rich payment task requires it.

## Out of scope

- Payment API, webhook, SlipOK, Stripe, database, schema, environment configuration, coupons, authentication, authorization, payment-success route, bundle catalog, or admin changes.
- Editing user-owned E2E changes, course-detail changes, global styles, generated browser artifacts, deployment, or production verification.
- Claims beyond existing bundle facts and benefits already presented by the product.

## Acceptance criteria

1. The bundle page presents title, description, course sequence, lesson counts, original price, bundle price, savings, and the existing benefits with one coherent responsive MilerDev hierarchy.
2. The purchase rail preserves free, paid, already-enrolled, unauthenticated, Stripe, PromptPay/slip, loading, success, and error paths without changing requests, payloads, redirects, or entitlement behavior.
3. Payment dialogs have accessible names and descriptions, explicit button types, contained/restored focus, Escape/backdrop recovery when safe, locked dismissal while verifying, visible focus, narrow-screen resilience, and reduced-motion handling.
4. Slip selection preserves accepted MIME types and the 5 MB client limit, presents preview/remove/error states without relying on color alone, and never exposes bank or payment data beyond the existing public client configuration.
5. Focused presentation/component contracts and existing payment API regressions pass, followed by relevant lint, full tests, production build, diff integrity, and worktree review when practical.
6. No API, schema, provider, environment, user-owned E2E, global CSS, or unrelated dirty-worktree file is modified.

## Implementation plan

1. Add a scoped CSS module and refactor the server-rendered bundle page into the dossier/course-sequence/purchase-rail composition without changing data access or calculations.
2. Add a bundle enrollment CSS module and refactor only markup/presentation around the existing handlers and state machine.
3. Extend DialogShell additively for rich task content and a wide size, then use it for both bundle payment steps while retaining safe close guards.
4. Add focused source/component contracts for displayed facts, dialog accessibility, control types, upload constraints, and request-boundary preservation.
5. Run focused tests and payment API regressions, then lint, the full suite, build, `git diff --check`, and `git status --short`; record unavailable rendered-browser checks explicitly.

## Attack-surface matrix

| Boundary | Risk | Control | Verification | Recovery |
| --- | --- | --- | --- | --- |
| Visitor/session to enrollment UI | Client role/session state could be mistaken for authorization | Preserve login redirect and server-authorized endpoints; no new client entitlement logic | Component contract plus existing unauthenticated API tests | Revert component presentation |
| Browser to free enrollment and Stripe checkout | Changed endpoint, method, or `bundleId` payload could misprice or mis-enroll | Keep handlers byte-for-byte in behavior and server-derived bundle pricing | Source contract and payment API tests | Revert component refactor |
| Slip file to verification endpoint | Unsafe type/size, amount trust, duplicate submission, or dismissal mid-verification | Preserve MIME/5 MB checks, disabled verifying controls, FormData fields, server-side amount and idempotency controls | Component/source contract and bundle slip API tests | Revert UI; server route remains untouched |
| Public bank configuration to dialog | Secret leakage or accidental environment expansion | Read no env files; retain only existing `NEXT_PUBLIC_*` references and fallbacks | Diff review for environment/API changes | Revert bundle component |
| Dialog keyboard and focus boundary | Focus escape or accidental cancellation could interrupt payment | Shared focus trap/restoration; explicit close guard while verifying; non-destructive Escape/backdrop only | Dialog component contract; rendered keyboard check when backend exists | Revert additive DialogShell use |

## Current limitation

No in-app browser backend is connected, so rendered viewport, real keyboard, focus-order, and visual-theme observations cannot be claimed in this environment. Automated source, component, API, lint, test, and build evidence will remain separate from that limitation.

## Completion

- Replaced the purple/green inline bundle presentation with a scoped decision-first dossier, ordered course evidence, and responsive purchase rail using the established paper/ink/cyan system.
- Preserved every enrollment/payment handler and server boundary while adding explicit task controls, shared accessible dialog behavior, safe verifying locks, and non-color upload/error states.
- Added focused commerce-contract and rich-dialog tests. Full lint, 222 Vitest tests, payment regressions, production build, UTF-8 integrity, and diff integrity passed.
- Rendered viewport and real keyboard observation remain explicitly unverified because no browser backend is connected.
