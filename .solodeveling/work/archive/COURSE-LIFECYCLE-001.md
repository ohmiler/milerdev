---
solodeveling_schema: 1
---

# COURSE-LIFECYCLE-001

- Status: done
- Level: Critical
- Authority: On 2026-07-25 the owner authorized Slices 1-2, Slice 3 Admin lifecycle UI, non-runtime Slice 4 verification, fail-closed tooling, and successful rehearsal on the two exact course lifecycle schemas. The owner has now separately authorized migration `0013` on local `milerdev`, bounded course smoke fixtures, and a local authenticated browser smoke with external providers disabled and stop-on-failure. Other schemas, real provider calls, secret-bearing build execution, commit, push, deployment, and cleanup remain unauthorized, and a scoped local source commit on 2026-07-26. Push, deployment, production effects, real providers, and cleanup remain unauthorized.
- Goal: Retire and restore courses without destroying paid learner records, while preventing archived courses from accepting new enrollment or being sold directly or through bundles.

## Contract

`draft` is pre-sale, `published` is discoverable and saleable, and `archived` is retired from discovery and new sale while existing enrollment remains authoritative for learning, progress, completion, reviews, and certificates.

Allowed transitions are `draft -> published`, `draft -> archived`, `published -> archived`, and `archived -> draft`. Restored courses return to draft and require an explicit publish. Normal Admin operations never physically delete a course. Legacy DELETE maps to archive. Publishing does not automatically broadcast to all users; notification is a separate explicit action outside this work.

An archive is blocked while any published bundle contains the course. Bundle create/update/publish and every public bundle sale path must reject non-published child courses. A provider-valid Stripe payment or a non-expired PromptPay intent accepted while sale was open remains fulfillable idempotently after retirement. PromptPay intents expire 30 minutes after creation and lock user, target, amount, and coupon identity.

## Scope

- Add a transaction-backed course lifecycle service and validated Admin boundary with active-Admin authority, expected-state comparison, idempotent results, and atomic audit.
- Remove status mutation from the general course update path; preserve legacy DELETE compatibility as archive.
- Protect course and bundle publication/archive races with a shared row-lock order and server-side commerce checks.
- Add durable PromptPay intent creation for course and bundle flows; verify uploads against the owner-bound pending payment instead of recalculating an archived target.
- Add nullable `payments.coupon_id` through generated migration `0013`; no course-status schema change or data backfill.
- Add Archived Admin filters, counts, badges, Archive/Restore/Publish actions, dependency conflicts, authoritative pending/error/success states, and accessible confirmations using the established design system.

Out of scope: permanent purge, enrollment revocation, refunds, scheduled publication, course-content versioning, media cleanup, broad Bundle lifecycle redesign, a new announcement feature, production migration, deployment, and cleanup of existing local or production-derived data.

## Acceptance and planned verification

| ID | Acceptance | Planned proof |
| --- | --- | --- |
| AC1 | Only a server-verified active Admin can perform a valid transition; malformed, forbidden, missing, stale, and invalid transitions fail safely. | Service and API tests for 400/401/403/404/409, expected state, retries, and authoritative response. |
| AC2 | Status change and redacted audit commit together or roll back together; legacy DELETE archives and general PUT cannot bypass the service. | In-memory transaction rollback/concurrency tests plus API compatibility tests. |
| AC3 | Archive/restore never changes course-linked lesson, enrollment, progress, payment, review, coupon usage, bundle membership, or certificate rows. | Service invariants and representative local-MySQL before/after count checks. |
| AC4 | Draft/archived courses cannot be discovered, enrolled in, or checked out anew; an enrolled learner can still learn, update progress, and receive a certificate. | Public/API regressions and focused learner E2E with archived fixture. |
| AC5 | Archive conflicts with a published containing bundle; bundle publication and sale cannot race into an archived child or silently mutate either entity. | Concurrent service tests and course/bundle API tests across free, Stripe, and PromptPay paths. |
| AC6 | Existing Stripe and non-expired owner-bound PromptPay intents fulfill once after retirement; expired, foreign, altered, replayed, or newly requested intents fail without enrollment or coupon duplication. | Provider-mocked payment tests covering amount/coupon snapshot, timeout, retry, replay, and reconciliation. |
| AC7 | Admin surfaces represent all three states and safe effects accurately, remove physical-delete affordances, and expose dependency errors with keyboard/focus/responsive behavior. | Component tests, `check:admin-text`, and focused authenticated browser checks at representative widths. |
| AC8 | Migration `0013` is additive and compatible with current rows and the previous application; fresh and 0012-upgrade targets converge without data loss. | Generated diff review, schema test, isolated fresh/upgrade rehearsal, row-count/integrity comparison, and roll-forward recovery rehearsal. |
| AC9 | A release candidate passes affected tests, full unit regression, lint, build, and scoped E2E; production remains unchanged until separately authorized. | Commands and results recorded in cumulative EVIDENCE; production checks remain unverified until release authority. |

## Attack-surface and recovery record

| ID | Boundary | Authority / invariant | Failure and control | Verification | Recovery |
| --- | --- | --- | --- | --- | --- |
| CL-STATE | Privileged course mutation | Active Admin; valid transition is idempotent and audited without delete. | Invalid/stale/concurrent mutation; Zod boundary, row lock, expected status, atomic audit. | AC1-AC3 | Retry authoritative state or restore archived course to draft. |
| CL-ACCESS | Paid learner entitlement | Existing enrollment, not course publication, authorizes learning. | Status filter or cascade revokes paid access; no hard delete and learner regressions. | AC3-AC4 | Restore status/code; reconcile retained rows, never purge. |
| CL-BUNDLE | Bundle composition and sale | Published bundle contains only published courses. | Publish/archive race or inconsistent legacy bundle; shared course locks plus mutation and checkout validation. | AC5 | Unpublish/fix bundle, then retry; no silent cascade. |
| CL-PAYMENT | Stripe/PromptPay fulfillment | Accepted provider-bound payment fulfills at most once for locked target/amount. | Archive race, replay, altered amount/coupon, provider timeout; durable intent, ownership, TTL, unique provider reference, transaction. | AC6 | Existing reconciliation flow, explicit refund if fulfillment cannot be honored, redacted audit. |
| CL-MIGRATION | Add nullable payment coupon identity | Migration runner on an explicitly authorized known schema; existing rows stay valid. | Wrong target, partial deploy, old/new overlap; preflight, generated additive SQL, fresh/upgrade rehearsal. | AC8 | Roll forward; previous app ignores nullable column. Do not drop it during rollback. |
| CL-UI | Admin browser interaction | UI is advisory; server response is authoritative. | Double submit, stale status, hidden dependency, accidental publication; disabled pending controls, confirmation, 409 handling, refresh. | AC7 | Refetch authoritative course/bundle state and retry safely. |

Sensitive-data impact is limited to existing user/payment ownership and audit metadata; no provider payload, slip image, credential, customer identifier, or secret may enter logs, tests, or Project Memory. Stripe, SlipOK, email, and notification effects are mocked in ordinary verification.

## Implementation slices

1. **Lifecycle contract and compatibility boundary**
   - Add failing service/API tests, then a `course-lifecycle` store/service modeled on the established user lifecycle transaction pattern.
   - Lock the course, verify the actor through `requireAdmin`, enforce transition and published-bundle dependency, compare expected status, and insert audit in the same transaction.
   - Add validated lifecycle PATCH; route legacy DELETE to archive; reject status in general PUT so it cannot bypass the lifecycle boundary.
   - Focused gate: new lifecycle service/API suites plus existing Admin auth and course API neighbors.
2. **Commerce integrity and durable payment intents**
   - Make bundle create/update/publish lock selected courses in stable ID order and require every child published; recheck all bundle catalog, free-enroll, Stripe, and PromptPay entry points.
   - Create owner-bound pending PromptPay payments before displaying payment instructions, lock amount/title/coupon and a 30-minute expiry derived from `createdAt`, and require `paymentId` on verification.
   - Generate/review migration `0013` for nullable `payments.coupon_id`; update schema and payment fulfillment without changing accepted Stripe replay behavior.
   - Focused gate: bundle race/contract tests, payment/provider-mock tests, schema test, then isolated fresh and 0012-upgrade migration rehearsal only after explicit database-test authority.
3. **Admin lifecycle UI**
   - Add Archived metrics/filter/status treatment and dedicated Archive, Restore-to-draft, and Publish controls; remove physical-delete language and affordance.
   - Explain retained learner access, stopped sales, in-flight payment behavior, and published-bundle conflicts. Use the established dialog/design primitives and authoritative API response.
   - Focused gate: component/API integration tests, `npm run check:admin-text`, and authenticated local browser checks after explicit local-server/fixture authority.
4. **Critical verification and release preparation**
   - Reconcile AC1-AC9; run `npm run test -- --run`, `npm run lint`, `npm run build`, and the scoped Playwright journeys when their environment is available.
   - Run `git diff --check`, review generated SQL and scoped Git status, and record all limitations.
   - Release readiness, backup, production migration, deployment, observation, and rollback execution require a separate explicit production authorization.

## Dependencies, risks, and next action

The payment migration must deploy before code reads `payments.coupon_id`; `npm start` already runs migrations before Next.js. Rollback is code rollback with the additive nullable column retained. The largest residual risks are a legacy published bundle already containing a non-published course, PromptPay transfers made before durable intents exist, and provider behavior unavailable to mocked tests; preflight and owner-controlled smoke checks must expose these rather than infer safety.

Slices 1-3 are implemented and focused-verified at code level. Bundle composition/sale requires published children with shared lock order, durable owner-bound PromptPay intents precede transfer instructions and fulfill from immutable snapshots, and generated migration `0013` adds only nullable `payments.coupon_id` plus its index. Admin Courses now represents draft/published/archived, exposes only valid explicit transitions, removes physical-delete affordances, explains safe effects, and displays authoritative dependency conflicts. Database-backed retention/concurrency, migration-application, authenticated browser, and full Critical-gate proof remain deferred by authority.

Non-runtime Slice 4 gates have passed: full Vitest and ESLint, Admin text scan, migration/static review, and diff integrity. The work remains verifying because database-backed retention/concurrency, fresh/0012-upgrade migration rehearsal, authenticated browser journeys, build, and scoped E2E are unverified.

Fail-closed migration rehearsal passed on exact disposable schemas `milerdev_course_lifecycle_fresh` and `milerdev_course_lifecycle_upgrade`. Fresh and 0012-upgrade targets converged, retained rows were unchanged, nullable coupon compatibility and write behavior passed, published-Bundle conflict was observed, concurrent Archive converged idempotently, and recovery returned to draft. Local `milerdev` smoke tooling remains prepared but unexecuted.

Next executable action: the owner stops the local dev server, runs `npm run build` in the owner-controlled environment, and shares only the sanitized final success/failure summary. Local migration `0013`, complete fixtures, Admin lifecycle actions, public runtime behavior, cache invalidation, full Vitest, ESLint, and diff integrity pass. Build must be owner-run or performed in a controlled environment that does not expose secret-bearing `.env*` files. Real providers, production, commit, push, deploy, and cleanup remain unauthorized.
