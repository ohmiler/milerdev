---
solodeveling_schema: 1
---

# PROOF-001: Transaction and credential proof surfaces

- Status: done
- Level: Standard
- Direction: User-authorized continuation of learner-facing work before Admin.
- Goal: Make course/bundle payment completion and public certificates form one truthful proof system that clearly communicates transaction state, access state, evidence, and the next learner action.
- Primary users: A learner returning from checkout and a recipient or verifier opening a public certificate URL.

## Scope

- Redesign course and bundle payment-success routes around a shared transaction receipt presentation.
- Say access is ready only when enrollment is actually present; show a recoverable verification state otherwise.
- Preserve current Stripe fallback, payment update, coupon, enrollment, authentication, redirect, and idempotency behavior.
- Redesign the public certificate route and downloadable certificate document as a verification-first proof surface.
- Preserve certificate lookup, revoked visibility, custom themes/header images, PNG download, clipboard sharing, and course navigation.
- Add metadata where missing and focused presentation/security-invariant regressions.

## Out of scope

- Stripe checkout/webhook logic, payment amount calculation, payment schema, enrollment authority, coupon rules, reconciliation, refunds, or migrations.
- Certificate issuance, revocation mutation, ownership policy, code generation, or Admin.
- Announcements, privacy, terms, deployment, or production data checks.

## Decisions

- Thesis: Thai learner transaction handoffs organized as verifiable receipt → access state → next learning action, expressed through MilerDev's light editorial grid and real order/certificate identifiers.
- Payment-success pages share one server-compatible receipt component; browser behavior is limited to an explicit refresh control.
- The receipt uses the recorded payment amount when available so discounted purchases are not visually replaced by list price.
- Certificate custom theme color remains a local document variable; layout, actions, feedback, and verification status use shared semantic tokens.
- No payment fulfillment branch is intentionally changed in this work.

## Acceptance criteria

- AC1: Course and bundle routes share one responsive receipt system with product, amount, order reference, access status, support, and next actions.
- AC2: A learning CTA appears only when enrollment is confirmed; pending enrollment has a named refresh/recovery action and does not claim access is ready.
- AC3: Course and bundle Stripe fallback invariants remain unchanged: paid session required, relevant metadata must not mismatch, payment updates stay pending-only, and enrollment uses the existing safe insertion path.
- AC4: Bundle receipt lists included real courses and uses recorded payment amount when present.
- AC5: Public certificate clearly distinguishes valid and revoked status without color alone and retains real recipient, course, dates, issuer, and certificate code.
- AC6: Download, share feedback, custom theme/header image, and course-link behavior remain available with explicit loading/error/success feedback.
- AC7: Server/client boundaries stay narrow, dynamic params remain awaited, metadata is present, and certificate data passed client-side remains serialized.
- AC8: Representative mobile/tablet/desktop layouts avoid document overflow and preserve readable Thai content and usable actions.
- AC9: Focused tests, payment/auth regressions, lint, build, diff integrity, scope audit, and UTF-8 checks pass when capabilities allow.

## Attack-surface matrix

| Boundary | Risk | Control | Verification | Recovery |
|---|---|---|---|---|
| Checkout return → Stripe retrieval | Unpaid or unrelated session grants access | Preserve paid-status and metadata mismatch returns; do not change fulfillment logic | Source-invariant regressions plus payment suite | Revert presentation commit; webhook remains authoritative |
| Payment row → enrollment | Duplicate or premature fulfillment | Preserve pending-only update and `safeInsertEnrollment` | Source-invariant regression and existing payment tests | Existing idempotency/reconciliation behavior; no data migration |
| Certificate code → public proof | Missing/revoked proof shown as valid | Preserve query-builder lookup, `notFound`, and explicit revoked state | Focused source/render tests | Revert public presentation; no certificate mutation |
| Certificate image → browser download | CORS failure or unsafe remote fetch | Preserve existing same-origin/proxied data-URL conversion and disabled download state | Source/render test plus local interaction when data exists | Inline error feedback; original public URL remains usable |

## Plan

1. Add a shared transaction receipt component, client refresh control, and proof stylesheet with focused render regressions.
2. Replace only the return markup of course/bundle payment pages; add metadata and preserve all pre-render payment logic byte-for-behavior.
3. Recompose the public certificate wrapper and CertificateCard around the same proof grammar while preserving serialized data and download conversion.
4. Verify focused structures and payment invariants, relevant payment/auth tests, responsive rendering, lint, build, diff, scope, and UTF-8.

## Verification mapping

| Criterion | Planned evidence |
|---|---|
| AC1, AC2, AC4 | Shared receipt static-render tests and source inspection |
| AC3 | Source-invariant regressions and existing payment tests |
| AC5, AC6 | Certificate static-render/source tests and browser states when local data permits |
| AC7 | Build route output, metadata/source inspection, RSC boundary review |
| AC8 | Playwright at approximately 360, 768, and 1280 CSS px |
| AC9 | Focused and relevant Vitest, full lint/build, diff/status, UTF-8 and sensitive-boundary audit |

## Rollback

Restore the three route presentations and prior CertificateCard, then remove shared proof components/tests. No payment, enrollment, or certificate data rollback is required because this work introduces no data mutation or migration.

## Outcome

- Course and bundle completion pages now use one shared receipt that separates recorded payment from confirmed learning access.
- Pending enrollment never presents a learning CTA and provides explicit refresh, dashboard, and support recovery paths.
- Bundle receipts use recorded payment amounts when available and expose the included real course links.
- Public certificates now present valid or revoked proof with text, symbols, document status, real identifiers, responsive actions, and inline download/share feedback.
- Payment fulfillment, enrollment, certificate lookup, schema, API routes, and provider integrations were not changed.
