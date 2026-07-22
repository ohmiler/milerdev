---
solodeveling_schema: 1
id: FINDING-002
title: Stale JWT sessions retain authorization after credential changes or verification failure
severity: high
confidence: high
source: manual-review
affected_asset: Auth.js JWT sessions, administrator authorization, and password recovery
evidence:
  - Password change and reset-confirmation update the password hash but do not change any value checked by existing JWTs.
  - The JWT callback catches database errors and retains the role already embedded in the token, including admin.
  - Reset confirmation selects a valid token before an unconditional user-ID update, allowing concurrent replay attempts to pass the same precondition.
impact: A stolen session can remain authorized after credential rotation, an administrator token can fail open during role verification errors, and concurrent reset replay can commit more than once.
recommendation: Bind JWTs to a monotonic database session version, refresh role/version on every check with fail-closed behavior, increment the version on credential changes, and consume reset tokens conditionally.
status: mitigated
verification:
  - Seven focused JWT policy tests cover stale versions, demotion, deleted accounts, legacy tokens, and database failures.
  - Password change and reset confirmation increment session_version; reset confirmation requires one conditionally affected row.
  - Focused auth, full unit, lint, build, migration inspection, and diff-integrity gates passed on 2026-07-23.
---
