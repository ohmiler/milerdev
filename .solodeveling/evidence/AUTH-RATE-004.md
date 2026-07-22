---
solodeveling_schema: 1
id: AUTH-RATE-004
---

# Evidence: AUTH-RATE-004

| AC | Result | Evidence | Limitation |
| --- | --- | --- | --- |
| AC1 | Pass | Credentials helper calls the async `login` bucket at 10/min before user lookup/bcrypt. Register, reset request, reset confirm, and password change await namespaced 5/min buckets before scoped expensive/state work. Affected suite passed 7 files / 62 tests including every route's 429 contract. | OAuth and non-auth API limits remain out of scope; the proxy map remains an optimistic first layer. |
| AC2 | Pass | Store uses one transaction for atomic upsert plus locked read and database-time expiry. Disposable MySQL 8.4 ran 20 concurrent application calls with exact returned counts 1..20; five configured decisions passed and the sixth failed; a 150 ms expired window reset from count 1 to count 1 with a later reset time. | Production latency and attack-volume load are not measured. |
| AC3 | Pass | HMAC tests prove deterministic 64-character namespace-bound digests with no identifier. Disposable rows all had digest length 64 and zero raw-IP matches. Client-IP tests prefer Railway `x-real-ip`, retain right-most trusted-proxy forwarding fallback, and ignore `x-client-ip`/`fly-client-ip`. Schema stores only digest, count, and reset time. | Pseudonymous bucket hashes remain for at most the cleanup retention period; AUTH_SECRET rotation resets active buckets. |
| AC4 | Pass | Missing key material, invalid bucket state, and store rejection fail closed. Credentials limiter failure returns null before lookup/bcrypt. Register limiter failure returns generic 503 before insert; blocked routes preserve 429. Limiter causes/details are neither returned nor logged. | A limiter/DB outage intentionally denies the scoped auth mutation until authority is restored. |
| AC5 | Pass | Generated 0011 contains only additive bucket table and expiry index. Fresh 0000-0011 migration created the table/index/journal row. Existing 0010 schema with one fake user upgraded successfully and retained that row. A two-day-old fake bucket was deleted in the bounded cleanup rehearsal. | Production migration/cleanup was not run; rollback leaves the additive table inert by design. |
| AC6 | Pass | Focused suite passed 7 files / 62 tests; full Vitest passed 40 files / 328 tests; scoped and full ESLint, admin-text scan, and production build with 90 routes passed. Disposable MySQL fresh, upgrade, concurrency, reset, decision, HMAC, and cleanup rehearsals passed; the dedicated container and fake data were removed. Snapshot lineage is valid, 0011 adds only `rate_limit_buckets`, generation reports no remaining schema changes, `git diff --check` passed, and status review isolated pre-existing unrelated changes. | E2E was not run because the change has no browser/UI contract. Production credentials, migration, traffic, and provider smoke remain release-controlled. |

## Observations

- 2026-07-23: The repository requires MySQL in documented Railway and self-hosted
  deployment paths and has no shared cache dependency. MySQL was selected for this
  bounded auth-only step; Redis/Valkey remains the scale-out alternative.
- 2026-07-23: Next.js Proxy retains only the inexpensive in-memory first layer. The
  authoritative database operation runs in Credentials authorization/route handlers,
  not Proxy.
- 2026-07-23: The first container readiness check incorrectly expected a Docker image
  health status; `mysqladmin ping` proved the server ready without a source edit. Two
  inline Windows `tsx -e` attempts exited without executing multiline async code and
  were rejected as evidence. A reviewable temporary TypeScript harness then produced
  the accepted concurrency results and was removed immediately.
- 2026-07-23: Disposable container `milerdev-auth-rate-limit-20260723` and all fake
  databases were permanently removed. Unrelated pre-existing container `my_db` was
  not modified.
- 2026-07-23: Critical closure gates passed after the final source change: focused 7
  files / 62 tests, full suite 40 files / 328 tests, full ESLint, admin-text scan,
  Next.js production build with 90 routes, snapshot lineage/scope, no-change Drizzle
  generation, `git diff --check`, temporary-file check, and final status review.
  Existing fixtures emitted known diagnostic stderr while every suite exited zero.
