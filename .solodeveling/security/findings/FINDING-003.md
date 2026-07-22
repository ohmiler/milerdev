---
solodeveling_schema: 1
id: FINDING-003
title: OAuth account links lack provider identity uniqueness at the database boundary
severity: medium
confidence: high
source: manual-review
affected_asset: Auth.js accounts table and Google account linking
evidence:
  - The accounts schema has no unique index over provider and providerAccountId.
  - The current Drizzle snapshot reports zero indexes for accounts.
impact: Concurrent or repeated provider linking can create ambiguous duplicate account rows and weaken deterministic account ownership lookup.
recommendation: Run a production-safe duplicate preflight, resolve any conflicts explicitly, then add and verify a composite unique index without changing verified-email linking policy.
status: mitigated
verification:
  - The accounts schema and 0010 snapshot define a named unique provider/providerAccountId index matching the installed Auth.js adapter key.
  - Disposable MySQL 8.4 fresh and existing-schema rehearsals created the index without data loss; a duplicate-data rehearsal failed closed and preserved both fake rows.
  - Aggregate preflight and sanitized migration errors expose no provider account ID, user ID, token, SQL value, or stack trace.
  - Focused OAuth/auth regressions, full unit suite, lint, build, migration inspection, and diff-integrity gates passed on 2026-07-23.
---
