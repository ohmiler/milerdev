---
solodeveling_schema: 1
id: PAYMENT-SEC-001
---

# Evidence: PAYMENT-SEC-001

| AC | Result | Evidence | Limitation |
| --- | --- | --- | --- |
| AC1 | Pass | PAY-FULFILL: focused suite covers refunded replay, missing target, owner and amount mismatch, unpaid session, rollback failure, completed repair, and event replay | Provider behavior is mocked; target-environment smoke is release evidence |
| AC2 | Pass | PAY-CHECKOUT: focused course and bundle tests prove a new insert, no pending-row update, and `checkout:<paymentId>` idempotency key | No live Stripe request |
| AC3 | Pass | PAY-FULFILL: webhook and both return routes delegate to `fulfillStripeCheckoutSession`; focused tests prove transaction failure and duplicate-event behavior; static inspection confirms coupon capacity is not a post-charge fulfillment gate | MySQL transaction semantics are type/build checked and mocked, not exercised against a live database |
| AC4 | Pass | PAY-MANUAL: 12 focused admin tests cover empty action, explicit approval/rejection, Stripe denial, refunded terminal state, bulk reason/audit, and concurrency | Notifications/email are mocked |
| AC5 | Pass | PAY-MANUAL: focused tests prove detail/cleanup return 405, refund preserves another paid entitlement, revokes only without one, and fails closed on a transition race; search finds no payment-row delete call | Existing schema cannot distinguish a non-payment enrollment source |
| AC6 | Pass | Current gates passed: focused 3 files / 55 tests; full unit 32 files / 295 tests; targeted payment/concurrency E2E 32 tests; lint; Thai admin-text scan; production build/type-check with 90 routes; `git diff --check`; no payment-row delete call found | Live MySQL, Stripe, SlipOK, email, and production smoke were not run and remain release evidence |

## Observations

- 2026-07-23: Pre-change baseline `npm run test -- --run` passed 31 files and
  275 tests. Static review confirmed payment-success recovery can grant enrollment
  after a conditional pending update affects no row.
- 2026-07-23: Checkout regressions failed against the old implementation because it
  reused a pending row and supplied no Stripe idempotency key.
- 2026-07-23: Fulfillment regressions failed against the old implementation because
  a refunded row was changed back to completed and incomplete target metadata still
  entered fulfillment.
- 2026-07-23: Admin regressions failed against the old implementation because an
  empty reconciliation request approved by default, Stripe could be completed
  manually, and detail/cleanup endpoints hard-deleted payment history.
- 2026-07-23: After implementation, the focused payment/admin/return-route command
  passed 3 files and 55 tests.
- 2026-07-23: Final full Vitest passed 32 files and 295 tests. Expected negative-path
  stderr included invalid Stripe signatures and existing shallow admin-auth mocks;
  the command exited successfully and the focused security assertions passed.
- 2026-07-23: Final `npm run lint`, `npm run check:admin-text`, and `npm run build`
  passed. The build compiled, type-checked, and generated 90 routes.
- 2026-07-23: Targeted `npm run test:e2e -- e2e/payment.spec.ts
  e2e/concurrency.spec.ts` passed 32 tests. Invalid-webhook cases logged the expected
  absence of a local Stripe credential; no real provider call was made.
- 2026-07-23: Final search found no `delete(payments)` variant, `git diff --check`
  passed, and unrelated pre-existing `.agents`, `.claude`, `.playwright-cli`, and
  `output` worktree changes were preserved.
