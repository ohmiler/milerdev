---
solodeveling_schema: 1
id: FINDING-001
title: Refunded Stripe sessions can restore course entitlement
severity: high
confidence: high
source: manual-review
affected_asset: Stripe payment-success recovery and course enrollment
evidence:
  - Payment-success recovery retrieves an old paid Stripe session, conditionally updates only pending payments, then creates enrollment without requiring that update to succeed.
  - A missing local payment row also leaves the payment ID optional while enrollment creation continues.
impact: A user can restore course or bundle access after refund or payment-record removal by replaying a previously paid session URL.
recommendation: Require exact immutable payment metadata and an allowed payment state, then transition payment and grant entitlement atomically through one idempotent fulfillment service.
status: mitigated
verification:
  - Focused Stripe fulfillment tests reject refunded replay, incomplete metadata, owner mismatch, and amount mismatch while preserving valid idempotent fulfillment.
  - Both payment-success routes and the signed webhook delegate to the shared transactional fulfillment service.
  - Full unit, targeted payment E2E, lint, Thai admin-text, build, and diff-integrity gates passed on 2026-07-23.
---
