---
solodeveling_schema: 1
id: PAYMENT-SEC-001
status: done
level: Critical
authority: User authorized implementation on 2026-07-23.
---

# Harden payment fulfillment and entitlement lifecycle

## Goal and scope

Ensure a verified payment grants the intended course entitlements exactly once,
while refunded, failed, mismatched, replayed, or unverified payment state cannot
grant or restore access. Cover Stripe checkout/webhook/success recovery, PromptPay
manual reconciliation, and admin payment transitions. Preserve current Thai UX and
provider mocks. Auth lifecycle, distributed rate limiting, general API cleanup,
production deployment, and unrelated migration drift are out of scope.

## Acceptance

- AC1: Old, refunded, failed, missing, amount/currency-mismatched, or cross-user/item
  Stripe sessions cannot create enrollment. A valid pending session fulfills
  atomically and a completed session is idempotent.
- AC2: Every checkout request creates an immutable payment attempt and provider
  creation uses a stable idempotency key; no pending row is reused or repriced.
- AC3: Webhook and success recovery use one strict fulfillment service with required
  metadata, transaction rollback, event replay protection, and safe coupon recording.
  A paid transaction is not denied only because coupon capacity changed after checkout.
- AC4: Manual completion requires an explicit valid action and reason, cannot
  complete Stripe payments, uses the same entitlement transaction, records audit,
  and cannot reactivate a refunded payment.
- AC5: Payment records are not hard-deleted by detail or cleanup endpoints. Refund
  is explicit, terminal, reasoned, and preserves other valid entitlements.
- AC6: Focused regressions, neighboring tests, full unit suite, lint, build, diff
  integrity, and current status provide evidence. Real provider and production
  checks remain owner-controlled and unverified.

## Boundary record

| ID | Boundary | Authority | Invariant | Failure | Control | Verification | Recovery |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PAY-CHECKOUT | Authenticated checkout to Stripe | Authenticated user; published item and server price | One immutable attempt per provider session | Retry, timeout, stale price | New payment ID per request; Stripe idempotency key; no row reuse | Checkout attempt tests | Pending orphan remains reconcilable; no entitlement |
| PAY-FULFILL | Signed webhook or authenticated recovery to entitlement | Valid signature for webhook; exact metadata and DB ownership for both | Completion and enrollment commit together; terminal state never grants | Replay, mismatch, partial failure, out-of-order delivery | Shared transaction service; conditional transition; event uniqueness | Replay/refund/mismatch/failure tests | Provider retries; pending remains recoverable |
| PAY-MANUAL | Admin reconciliation/status to entitlement/refund | Server-verified admin plus explicit action and reason | Stripe cannot be manually completed; refunded is terminal | Empty POST, repeated approval, false refund | Zod validation, transition matrix, shared fulfillment, audit | Admin negative and allowed paths | Preserved payment/audit supports roll-forward |
| PAY-PROMPTPAY | SlipOK/manual recovery to entitlement | SlipOK success or explicit admin recovery for PromptPay only | Unique reference and atomic entitlement | Timeout, duplicate slip, missing evidence | Existing verification plus explicit manual action; no default approval | Duplicate/timeout/manual tests | Leave verifying/failed for reviewed recovery |

## Decisions and plan

1. Begin with failing regressions for refunded-session replay, missing payment,
   metadata/amount mismatch, duplicate event, row reuse, and empty manual approval.
2. Add a shared server-only fulfillment service that validates Stripe metadata and
   decimal amounts without floating-point comparison, conditionally transitions
   state, grants course/bundle entitlements, records coupon use, and handles event
   replay inside one transaction.
3. Route webhook and both payment-success pages through the service. Keep recovery
   for resilience, but fail closed and never grant from a terminal state.
4. Stop checkout row reuse and pass a stable Stripe idempotency key for each new
   attempt. No schema change is required in this slice.
5. Harden manual reconciliation/status transitions, disable hard deletion and
   destructive stale cleanup, and add auditable reasons.
6. Run focused checks after each slice, then the applicable broad gates in AC6.

## Sensitive data, risk, and recovery

No secrets, full slip images, card data, or provider payloads enter memory or logs.
Tests mock Stripe, SlipOK, email, and notifications. This work performs no production
action or data migration. Code rollback restores prior behavior and existing payment
rows remain intact. A failed local fulfillment rolls back and webhook retry or manual
reconciliation remains the roll-forward path. Production smoke verification requires
the owner and redacted output after separate release authorization.

## Next action

Select the next bounded backend hardening item; production Stripe/MySQL smoke remains
a separately authorized release check.
