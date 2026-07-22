---
solodeveling_schema: 1
id: AUTH-DATA-003
---

# Evidence: AUTH-DATA-003

| AC | Result | Evidence | Limitation |
| --- | --- | --- | --- |
| AC1 | Pass | Installed adapter source uses provider + providerAccountId for account lookup/unlink and its default MySQL composite key. `auth-account-schema` verifies the named unique index and ordered columns; focused schema/preflight/error tests pass 3 files / 8 tests. | No production provider callback was executed; provider behavior remains covered by code-level tests because production credentials and deployment are outside scope. |
| AC2 | Pass | Static SQL test rejects destructive statements. Disposable MySQL 8.4 fresh rehearsal applied 0000-0010, created accounts, produced the two ordered unique-index columns, and retained zero rows. Existing-schema rehearsal applied committed 0000-0009, seeded one fake account, then applied 0010; the row count remained 1 and index columns were `provider,providerAccountId`. | Production migration was not run. |
| AC3 | Pass | Aggregate helper tests cover count 2, empty 0, and invalid fail-closed. Duplicate rehearsal printed only count 1 and exited 2. Safe migration-error tests pass 3 cases; final duplicate migration output was only `Migration failed (ER_DUP_ENTRY)` with exit 1 and contained no SQL, identity value, or stack. | Operators must supply `DATABASE_URL`; the preflight intentionally does not load secret files. |
| AC4 | Pass | Duplicate rehearsal seeded two fake rows for one provider identity. Preflight exited 2; migration exited 1; row count remained 2, unique-index column count remained 0, and migration 0010 journal record count remained 0. | Real conflicts require separately authorized owner review; no automatic data repair exists by design. |
| AC5 | Pass | Affected regression passed 6 files / 50 tests; full Vitest passed 36 files / 311 tests; ESLint, admin-text scan, and production build passed with 90 generated routes. Snapshot lineage is valid and only accounts changed; generated index metadata is unique with ordered provider/providerAccountId columns. `git diff --check` passed and final status review isolated pre-existing unrelated changes. | E2E was not run because this change has no browser/UI contract. Production provider and database smoke remain release-controlled. |

## Observations

- 2026-07-23: Auth.js Drizzle adapter source defines its default MySQL accounts
  composite primary key and all account lookup/unlink operations on provider plus
  providerAccountId. `linkAccount` performs a plain insert, so the database is the
  final concurrency boundary.
- 2026-07-23: `0001_snapshot.json` has no accounts table; `0002_snapshot.json` does,
  but `0002_uneven_hobgoblin.sql` never creates it. Fresh migration coverage is
  therefore incomplete by static inspection.
- 2026-07-23: Docker Desktop was started for an isolated MySQL 8.4 rehearsal. Fresh,
  representative existing, and duplicate-data cases produced the results in the
  current matrix. The dedicated `milerdev-oauth-migration-20260723` container and all
  fake rehearsal databases were permanently removed afterward; the unrelated
  pre-existing `my_db` container was not modified.
- 2026-07-23: The first expected duplicate failure exposed that the existing startup
  migration runner logged the MySQL duplicate value and SQL. A failing regression was
  added, the runner was changed to emit only a validated database code, both manual
  migration scripts were routed through that runner, and the duplicate case was
  repeated successfully with sanitized output.
- 2026-07-23: Critical closure gates passed after the final source change: affected
  regression 6 files / 50 tests, full suite 36 files / 311 tests, ESLint, admin-text
  scan, Next.js production build with 90 routes, snapshot lineage/scope inspection,
  `git diff --check`, and worktree status review. Existing test fixtures emitted known
  diagnostic stderr, but all suites exited successfully.
