---
solodeveling_schema: 1
id: AUTH-RATE-004
status: done
level: Critical
authority: User authorized continued backend improvement work on 2026-07-23.
---

# Coordinate abuse limits across authentication instances

## Intent and outcome

Credential login and account-recovery mutations currently use process-local maps.
Restarting or scaling the Next.js service creates independent counters, so an attacker
can multiply the effective limit. Make the high-risk authentication boundaries share
one authoritative counter while preserving generic auth responses, existing limits,
and the lightweight proxy check as defense in depth.

## Scope

- Credentials login, registration, reset request, reset confirmation, and authenticated
  password change.
- An additive MySQL bucket table, atomic fixed-window operation, pseudonymous keys,
  bounded expired-row cleanup, and server-only integration.
- A trusted-proxy client-IP contract suitable for the documented Railway deployment;
  untrusted alternate client-IP headers must not select a bucket.
- Focused concurrency/failure/security tests and disposable MySQL rehearsal.

Out of scope: payment/general API limiter migration, CAPTCHA or WAF, OAuth-provider
limits, Redis/Valkey provisioning, production migration/deployment, live traffic,
credential use, and automatic edits to environment files.

## Acceptance

- AC1: All five scoped auth boundaries await one shared limiter before expensive or
  state-changing work. Counters remain coordinated across independent application
  instances and preserve the current 10 requests/minute credentials limit and 5
  requests/minute limits for other auth mutations.
- AC2: Concurrent checks atomically permit no more than the configured count within a
  fixed window and reset after expiry using database time. A unique bucket key is the
  concurrency boundary.
- AC3: Stored keys are HMAC digests made with existing server-only key material. Raw IP,
  email, password, reset token, user ID, and request body never enter the bucket table
  or limiter logs. Only trusted Railway/reverse-proxy IP headers influence IP buckets.
- AC4: Limiter/database failure fails closed with a generic response and no account
  enumeration. The existing proxy map remains explicitly optimistic, not authoritative.
- AC5: The migration is additive and non-destructive, indexes expiry for bounded
  cleanup, and does not touch existing rows or production data. Rollback can leave the
  inert table in place.
- AC6: Focused auth/limiter tests, concurrent disposable-MySQL rehearsal, full tests,
  lint, build, migration inspection, diff integrity, and status review pass.

## Boundary record

| ID | Boundary | Authority | Invariant | Failure | Risk / Control | Verification | Recovery |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-ABUSE | Untrusted auth request to password/account mutation | Server route or installed Auth.js Credentials `authorize(credentials, request)` after trusted proxy normalization | Every instance consumes the same atomic bucket; identifiers remain pseudonymous | Process restart/scale, spoofed header, concurrent attempts, DB failure, stale buckets | MySQL unique HMAC key; atomic DB-time window; restricted header sources; fail closed; bounded cleanup | Unit races/failures, auth route contracts, disposable MySQL concurrency/recovery, broad gates | Before release revert files; after migration roll back code and retain the additive inert table, then forward-fix before re-enabling |

## Decisions and alternatives

Use the existing mandatory MySQL service for this bounded auth-only step. It avoids a
new paid/operated dependency and is available in both documented Railway and
self-hosted topologies. Keep queries out of Next.js Proxy because Proxy remains a fast
optimistic layer; the authoritative check belongs in route handlers and Credentials
authorization. Hash bucket material with HMAC rather than storing direct identifiers.

Redis/Valkey with atomic increment and TTL is the preferred scale-out alternative if
auth traffic later justifies another service, but it currently adds dependency,
configuration, cost, and release work absent from the repository. Keeping only the
current maps is the smallest code option but does not meet the multi-instance outcome.

## Risks and next action

Primary risks are database write amplification under attack, stale-row growth,
unintended NAT-wide blocking, proxy-header spoofing, and async integration drift across
Auth.js/routes. Plan an atomic query and bounded cleanup, preserve exact public limits,
and require a real concurrent MySQL rehearsal before implementation can be called done.

## Attack surface matrix

| Actor / condition | Abuse or failure | Control | Planned proof |
| --- | --- | --- | --- |
| Distributed credential bot | Spreads attempts across app instances or restarts | One MySQL bucket keyed by HMAC(namespace + IP), atomic row lock/update | Two independent store clients plus concurrent requests never exceed the configured successes |
| Header-spoofing client | Rotates non-platform IP headers to create fresh buckets | Accept Railway `x-real-ip`, then the right-most reverse-proxy `x-forwarded-for` fallback; remove `x-client-ip` and `fly-client-ip` trust | Header contract tests prove ignored headers cannot select the identifier |
| High-cardinality scanner | Creates unbounded pseudonymous rows and DB writes | Expiry index plus bounded cleanup of buckets older than one day; auth-only scope | Migration/index inspection and cleanup test/rehearsal |
| Shared NAT users | Legitimate users share one IP bucket | Preserve current documented limits and fixed one-minute windows; return Retry-After | Existing and new route contract tests |
| Database/limiter outage | Limiter cannot establish authority | Fail closed before password hashing/state mutation; generic response/log only | Injected failures prove no user lookup/hash/mutation and no sensitive error output |
| Database reader | Attempts to recover client identity | HMAC-SHA-256 with server-only AUTH_SECRET; store digest/count/reset only | Schema and deterministic/no-plaintext key tests |

## Implementation and verification plan

1. Add failing tests for restricted client-IP headers, deterministic HMAC keys with no
   plaintext identifier, fixed-window decisions, fail-closed behavior, credentials
   short-circuiting, and scoped route 429 behavior.
2. Add `rate_limit_buckets` to `src/lib/db/schema.ts` with a 64-character digest
   primary key, count, millisecond reset time, and reset-time index. Generate and
   inspect additive migration 0011; reject destructive or data-rewrite SQL.
3. Implement an async auth-only limiter. Inside one Drizzle transaction, perform a
   MySQL DB-time `INSERT ... ON DUPLICATE KEY UPDATE`, then select the locked row so
   each decision observes its exact atomic increment. Validate configuration/result,
   HMAC namespace + identifier with AUTH_SECRET, and run bounded expired-row cleanup
   no more than once per process interval without exposing database errors.
4. Extract credentials verification into a testable server helper and call the shared
   limiter before user lookup or bcrypt. Integrate the same awaited limiter into
   register, reset request, reset confirmation, and change password while preserving
   response bodies, Retry-After, anti-enumeration, and existing numerical limits.
   Retain the proxy map only as an optimistic first layer and deduplicate IP parsing.
5. Run focused tests after each slice. Rehearse 0011 and concurrent increments against
   a dedicated disposable MySQL 8.4 container, including expiry reset, exact maximum,
   fail-closed invalid state, cleanup, fresh history, and upgrade with existing rows.
   Remove only that named container afterward; do not access production data.
6. Run affected auth/proxy regressions, full Vitest, ESLint, admin-text scan, production
   build, snapshot lineage/scope inspection, `git diff --check`, and status review.
   Record every acceptance result in one evidence matrix, then use the Critical
   verifying gate before closure.

No production migration, secret edit, deployment, external service provisioning, or
destructive cleanup is authorized. Before release, repository rollback removes the
feature. After 0011 is applied, code rollback leaves the additive table inert; table
removal or live conflict repair requires a separate release/migration authority.

## Follow-up

Production application of migrations 0010/0011, the OAuth duplicate preflight,
provider/login smoke, and rate-limit latency/load observation require a separately
authorized release workflow. Redis/Valkey remains a future scale-out option rather
than a current dependency.
