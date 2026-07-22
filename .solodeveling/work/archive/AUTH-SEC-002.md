---
solodeveling_schema: 1
id: AUTH-SEC-002
status: done
level: Critical
authority: User authorized the next backend improvement round on 2026-07-23.
---

# Harden authentication sessions and repair migration metadata drift

## Goal and scope

Make JWT-backed sessions lose server authorization when an account disappears,
an administrator is demoted, credentials change, or current account state cannot
be verified. Make password-reset tokens single-use under concurrency. Repair the
Drizzle snapshot gap after `0007_payment_idempotency.sql`, then add only the
non-destructive session-version column needed for revocation. Production migration
execution, secrets, OAuth provider changes, distributed rate limiting, legacy table
deletion, and unrelated backend cleanup are out of scope.

## Acceptance

- AC1: Every JWT session check reloads the account role and session version from
  the database. Missing accounts, stale versions, and database errors return no
  authorized session; a demoted admin cannot retain an admin role from the JWT.
- AC2: Password change and password-reset confirmation increment the account
  session version, invalidating older JWTs. Pre-migration JWTs remain valid only
  while the database version is still zero.
- AC3: A reset token is consumed with a conditional update so concurrent or replayed
  confirmation can change the password at most once.
- AC4: Migration history gains a no-op metadata baseline for the already-authored
  `0007` changes and one additive `users.session_version` migration. Generated SQL
  contains no `DROP`, rename, data rewrite, or duplicate payment DDL; legacy
  `docs`/`doc_groups` tables are left untouched.
- AC5: Focused regressions, neighboring auth tests, migration inspection, full unit
  suite, lint, build, diff integrity, and current status provide evidence. Live
  MySQL and production rollout remain release-controlled and unverified.

## Boundary record

| ID | Boundary | Authority | Invariant | Failure | Control | Verification | Recovery |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-JWT | Encrypted JWT to server session/role | Auth.js token plus current DB account state | JWT identity and role are never more authoritative than current DB state | Deleted user, demotion, stale token, DB outage | Per-check role/version reload; null token on missing, mismatch, or error | Unit policy tests and protected-route regressions | User signs in again after DB recovery; no privileged fail-open |
| AUTH-CREDENTIAL | Password change/reset to existing sessions | Authenticated user with current password, or valid reset token | Credential rotation revokes every older JWT | Stolen cookie survives password change | Monotonic `session_version` increment in the same update | Route update assertions plus stale-token policy tests | Fresh login issues a token at the new version |
| AUTH-RESET | Emailed reset token to password mutation | Unexpired SHA-256 token hash | One token can commit one password change | Concurrent replay wins twice | Conditional consume on hash and expiry; affected-row gate | Replay/zero-row regression | Request a new reset email |
| DB-META | Drizzle schema to ordered migration files | Reviewed repository change only; no live DB authority | New migration generation reflects authored history without destructive guesses | Missing 0007 snapshot repeats DDL and proposes legacy drops | Current-schema snapshot generated in a temp copy, paired with reviewed no-op baseline SQL, then additive generated migration | Temp-copy drift generation and SQL inspection | Revert repository metadata before any release; production unchanged |

## Decisions and plan

1. Add failing policy and route regressions for stale JWTs, database failure, session
   version increments, and reset-token replay.
2. Extract a testable JWT/session policy and have Auth.js reload only `role` and
   `sessionVersion` on every session access.
3. Add `users.sessionVersion` with default zero and increment it during both
   credential-changing routes. Make reset confirmation check the update result.
4. Generate the current-schema `0008` snapshot from a standard diff in a temp copy,
   discard its duplicate/destructive SQL, and pair the reviewed snapshot with a
   documented no-op baseline. Then generate and review an additive `0009` column
   migration. Never execute either migration in this workflow.
5. Run focused checks after each slice, then the Critical verification gates in AC5.

## Sensitive data, risk, and recovery

No `.env` file, credential, reset-token plaintext, customer identifier, or live
database row enters memory or logs. Tests mock database, OAuth, and email behavior.
JWT validation adds one narrow user-state query per session access; this is an
accepted security/performance tradeoff for immediate revocation. Repository rollback
is sufficient before release because this workflow does not apply migrations. After
release, rollback must retain the additive column or use a forward fix; legacy tables
remain present unless a separately authorized destructive migration is planned.

## Next action

Plan the next bounded backend item. Recommended follow-up is database-level OAuth
account-link uniqueness after a duplicate-data preflight; live migration and smoke
checks remain a separately authorized release activity.
