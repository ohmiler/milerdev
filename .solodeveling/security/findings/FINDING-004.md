---
solodeveling_schema: 1
id: FINDING-004
title: Authentication abuse limits are process-local and trust unnecessary client IP headers
severity: medium
confidence: high
source: manual-review
affected_asset: Credentials login, registration, password reset, and password change
evidence:
  - Both src/proxy.ts and src/lib/rate-limit.ts store counters in module-local Map instances.
  - Restarting or scaling the Next.js service creates independent counters and multiplies the effective request limit.
  - Client IP extraction accepts x-client-ip and fly-client-ip even though the documented Railway edge contract supplies x-real-ip.
impact: Distributed credential stuffing or recovery abuse can bypass the intended aggregate limit, and spoofable alternate headers can select new buckets when they reach the application unchanged.
recommendation: Enforce scoped auth limits in an atomic shared store, pseudonymize bucket identifiers, restrict trusted proxy headers, and fail closed when the authoritative limiter is unavailable.
status: mitigated
verification:
  - Credentials login and four auth mutation routes consume one async MySQL-backed limiter before scoped expensive or state-changing work.
  - Twenty concurrent disposable-MySQL application calls produced exact atomic counts 1 through 20; fixed-window expiry and configured blocking behaved as specified.
  - Bucket rows contain only 64-character HMAC digests, counts, and reset times; raw-IP query found zero matches and expired-row cleanup is bounded.
  - Client-IP tests ignore x-client-ip and fly-client-ip, while fail-closed tests prevent lookup, bcrypt, or mutation on limiter failure.
  - Focused auth/limiter tests, full unit suite, lint, build, migration rehearsals/inspection, and diff-integrity gates passed on 2026-07-23.
---
