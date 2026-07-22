---
solodeveling_schema: 1
id: AUTH-SEC-002
---

# Evidence: AUTH-SEC-002

| AC | Result | Evidence | Limitation |
| --- | --- | --- | --- |
| AC1 | Pass | AUTH-JWT: seven policy tests prove current DB role/version loading, immediate demotion, legacy-version handling, missing-account rejection, stale-token rejection, and fail-closed DB errors; `auth.ts` delegates every JWT callback to that policy with a two-column query | No live Auth.js cookie/browser session was exercised |
| AC2 | Pass | AUTH-CREDENTIAL: password change and reset-confirmation tests assert a session-version increment; stale-version policy test rejects the old JWT; build type-checks the callback and schema integration | Live MySQL arithmetic update semantics were not exercised |
| AC3 | Pass | AUTH-RESET: the new zero-affected-row regression fails on the old code and now returns 400; static inspection binds the update to user ID, token hash, and unexpired timestamp | Concurrency is simulated through the conditional-update result, not a live parallel MySQL test |
| AC4 | Pass | DB-META: journal/snapshot inspection shows ordered `0007`/`0008`/`0009`, current `session_version int NOT NULL DEFAULT 0`, and no managed legacy doc tables; new SQL is one documented no-op plus one additive ALTER; forbidden SQL scan is empty; a temp-copy generation after `0009` reports no schema changes | Migrations were not applied to any database; legacy physical tables remain intentionally untouched |
| AC5 | Pass | Current gates passed: focused 4 files / 47 tests; full unit 33 files / 303 tests; ESLint; Thai admin-text scan; production build/type-check with 90 routes; `git diff --check`; final status review preserved unrelated changes | Targeted browser E2E was not run because its local launcher reads `.env.local` and no safe server was already running; live MySQL and production smoke remain release evidence |

## Observations

- 2026-07-23: `tests/api/auth.test.ts`, `tests/lib/auth-google.test.ts`, and
  `tests/proxy.test.ts` passed 39 tests before implementation.
- 2026-07-23: Temp-copy Drizzle generation from the repository metadata proposed
  duplicate `stripe_events`/`promptpay_trans_ref` DDL and destructive drops for
  legacy `docs` and `doc_groups`. The audit did not read environment files or touch
  a database.
- 2026-07-23: A temp-copy `--custom` experiment produced empty SQL but retained the
  old snapshot, so it was rejected. A standard temp-copy diff produced the required
  current-schema snapshot; its duplicate/destructive SQL was not copied, and the
  snapshot was paired with an explicit no-op baseline instead.
- 2026-07-23: New regressions failed against the old implementation: the session
  policy module was absent, credential updates lacked a session version, and a
  reset consume with zero affected rows still returned success.
- 2026-07-23: After implementation, focused auth/session coverage passed 4 files and
  47 tests. The full unit suite passed 33 files and 303 tests.
- 2026-07-23: ESLint, Thai admin-text scan, and the Next.js production build passed;
  the build compiled, type-checked, and generated 90 routes.
- 2026-07-23: Temp-copy Drizzle generation after `0009` reported no schema changes.
  Final inspection found no DROP, RENAME, DELETE, UPDATE, duplicate Stripe table, or
  duplicate PromptPay column operation in migrations `0008` and `0009`.
- 2026-07-23: `git diff --check` passed. Existing `.agents`, payment hardening,
  `.claude`, `.playwright-cli`, and `output` worktree changes were preserved.
