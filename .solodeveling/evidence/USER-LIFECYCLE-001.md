---
solodeveling_schema: 1
id: USER-LIFECYCLE-001
---

# Evidence: USER-LIFECYCLE-001

| AC | Result | Evidence | Limitation |
| --- | --- | --- | --- |
| AC1 | Pass | Nullable/no-default `deactivated_at` and its non-unique index are protected by schema/SQL regressions. Owner-operated fresh rehearsal applied 13 migrations and produced 29 tables plus exactly one lifecycle column/index; representative upgrade moved from 12/0/0 to 13/1/1; the recreated empty local `milerdev` schema independently reached 29/13/1/1. | Production was not migrated. |
| AC2 | Pass | Single/bulk lifecycle and role paths use transactional locks, compare-and-set updates, atomic audits, session rotation, reset clearing, and actual changed/skipped counts. Focused service/API tests and real MySQL student deactivation plus idempotent retry passed. | External production concurrency and volume remain release observations. |
| AC3 | Pass | Credentials, Google, JWT/session, reset request, and reset confirmation fail closed for inactive accounts; reactivation/session-version paths are covered. Full regression passed with Google/email mocked. Owner-operated local smoke confirmed that deactivation revoked an existing Student session, inactive credentials received the generic denial, reactivation required and allowed a fresh login, session version reached 2, reset credentials remained clear, and lifecycle audits captured both transitions. | Live Google/email and deployed-session behavior were not exercised. |
| AC4 | Pass | No normal Admin path deletes users. Representative OAuth, enrollment, progress, payment, notification, review, coupon usage, certificate, and audit fixtures remained after 0012 and deactivation. Public certificate route queries certificate code directly without joining/filtering user lifecycle, and production build includes `/certificate/[code]`. | A live HTTP render of the disposable certificate was not executed; evidence combines retained MySQL row, route inspection, component regression, and build. |
| AC5 | Pass | Unit concurrency covers cross-deactivation/demotion and failure rollback. Real InnoDB rehearsal produced four Admin lifecycle audit rows across two concurrent-deactivate/recovery rounds while ending with both fake Admins active and none inactive. | Production lock timing remains unobserved. |
| AC6 | Pass | Admin list/detail lifecycle filtering, badges, direct/bulk controls, preserved-data explanation, authoritative refresh, stale/loading/error/success/pending states, focus/reduced-motion/forced-color CSS, and disabled confirmation are covered by component/API tests; full lint/build passed. Owner-operated desktop smoke observed active/inactive badges, the deactivation dialog and retained-data explanation, immediate reactivation, and authoritative list refresh. | Authenticated 390/768/1280/1600 coverage plus keyboard, hover, and focus observation remains an explicit untested environment gap. |
| AC7 | Pass | Password reset revokes sessions without activation; export includes lifecycle state/time; duplicate import does not reactivate; focused and full regressions passed. The database fixture confirmed session increment and reset credential clearing while linked data remained. | No provider or production import/export smoke was run. |
| AC8 | Pass | Fresh/upgrade MySQL rehearsals passed; full Vitest passed 48 files / 376 tests; admin-text, full ESLint, Next production build with 90 routes, `git diff --check`, and final status/scope review passed. Security and recovery boundaries remain recorded in WORK. | Browser checks above remain explicitly unverified. Standalone `tsc --noEmit` retains four pre-existing test typing errors, while the Next production build TypeScript gate passed. |

## Observations

- 2026-07-23: Shaping used static repository inspection only. No application source,
  migration, database, environment file, production service, commit, or deployment was
  changed.
- 2026-07-23: Active security profiles are web-application, identity-access,
  sensitive-data, data-migration, infrastructure/release recovery, and payments only
  where in-flight financial records must remain recoverable; payment fulfillment logic
  itself is out of scope.
- 2026-07-23: Critical implementation, migration rehearsal, verification, and recovery
  steps were mapped to AC1-AC8. The work is ready, but no application source,
  generated migration, MySQL target, test, commit, or production service was changed.
- 2026-07-24: User authorized implementation Slice 1 only. The regression first
  failed for the missing column/index and migration, then passed 2/2 after the schema
  and `0012_user_lifecycle` draft were generated. Scoped ESLint passed. Generation
  used explicit schema/dialect/out flags without loading secret-bearing config; no
  migration was applied and no database, commit, or deployment action occurred.
- 2026-07-24: User authorized implementation Slice 2. Service regressions first
  failed because the lifecycle module did not exist; API regressions then failed
  against physical-delete routes. After implementation, focused and neighboring
  checks passed: 5 Vitest files / 76 tests, scoped ESLint, admin-text, and diff check.
  Deterministic tests cover mixed-state retry, audit rollback, linked-data retention,
  self-protection, cross-deactivation, cross-demotion, validation, compatibility
  DELETE mapping, role routing, and last-admin conflict responses. No migration,
  database connection, commit, or deployment action occurred.
- 2026-07-24: `tsc --noEmit` was rerun after fixing both USER-LIFECYCLE test typing
  issues; it remains non-zero only for four existing errors in
  `admin-payment-security.test.ts`, `auth-account-schema.test.ts`, and
  `auth-rate-limit-schema.test.ts`. These unrelated baseline errors were not changed.
- 2026-07-24: User authorized implementation Slice 3. Focused regressions first
  exposed five missing inactive checks across JWT, credentials, and Google, then three
  missing recovery/Admin-reset controls. Review added and reproduced a reset-token
  issuance race where deactivation could win after lookup. The implementation now
  fails closed on database lookup errors, checks active state at Google/JWT/credential
  boundaries, conditions reset issue/consume on active state, and rotates sessions on
  Admin reset without changing lifecycle state or logging target email.
- 2026-07-24: Slice 3 combined verification passed 7 Vitest files / 68 tests, scoped
  ESLint, admin-text, and diff check. `tsc --noEmit` still reports exactly the four
  previously recorded unrelated baseline errors. Google/email behavior used mocks;
  no migration, database connection, commit, or deployment action occurred.
- 2026-07-24: User authorized implementation Slice 4. New API/service regressions
  first failed for missing filter validation, lifecycle fields/stats/export columns,
  and authoritative mutation state. Implementation added validated active/inactive
  filtering, consistent filtered counts, safe detail allowlists, lifecycle-aware
  export and duplicate-import protection, and post-mutation user states.
- 2026-07-24: Slice 4 affected verification passed 6 Vitest files / 86 tests, scoped
  ESLint, admin-text, and diff check. `tsc --noEmit` remains non-zero only for the same
  four unrelated baseline test typing errors. No migration, database connection,
  commit, or deployment action occurred.
- 2026-07-24: User authorized implementation Slice 5. Gridgeist direction remained
  brand-derived: a quiet operational workspace using the existing semantic Admin
  system, with lifecycle state and preserved-data impact as the product-native lead.
  Failing UI-contract regressions preceded the state/action helper implementation.
- 2026-07-24: Slice 5 affected verification passed 10 Vitest files / 100 tests,
  scoped ESLint, admin-text, production build, and diff check. `tsc --noEmit` retains
  only the same four unrelated baseline errors. Browser discovery returned no
  available backend, so representative viewport and authenticated interaction checks
  remain explicitly unverified. No migration, database connection, commit, or
  deployment action occurred.
- 2026-07-24: User authorized continuing into Slice 6 preparation. Non-secret source
  inspection found a repository Docker definition, but the user then clarified that
  it is not the active environment and MySQL is accessed through MySQL Workbench.
  Docker commands and the container target are therefore excluded. Proposed isolated
  schemas remain `milerdev_lifecycle_fresh` and `milerdev_lifecycle_upgrade`, pending
  confirmation of the server host/port, protected normal schema, and exact targets.
  No password or connection URL was requested or recorded, no environment file was
  read, no database connection was made, and no schema, migration, commit, or
  deployment action occurred.
- 2026-07-24: The user confirmed the Workbench-connected MySQL Server as
  `localhost:3306` and identified existing schema `milerdev`; that schema is now the
  explicit protected target and must not be used for rehearsal. Permission to create
  and use the two proposed disposable schemas remains pending. No database connection
  or mutation occurred.
- 2026-07-24: The user explicitly authorized creation and use of
  `milerdev_lifecycle_fresh` and `milerdev_lifecycle_upgrade` on `localhost:3306`.
  TCP and Windows-service preflight observed port 3306 reachable and MySQL80 running.
  The installed MySQL 8.0 CLI was found, but a no-password root connection was denied
  with MySQL error 1045 before any identity/schema query ran. No credential store or
  environment file was accessed, and no database or schema was changed. Owner action
  through the authenticated Workbench session is required before rehearsal can
  continue without exposing credentials.
- 2026-07-24: The owner reported both disposable schemas created. A new runner accepts
  credentials only through `USER_LIFECYCLE_DATABASE_URL`, loads no dotenv file,
  permits only localhost port 3306 and the mode-specific authorized schema, verifies
  connected database identity, requires an empty base, and checks migration journal,
  nullable lifecycle column, and index counts. Target-guard regressions passed 7/7,
  forced scoped ESLint passed, and TypeScript reported only the same four unrelated
  baseline test errors. A fake-credential connection emitted only sanitized
  `ER_ACCESS_DENIED_ERROR`; no URL or password appeared and no migration ran. A
  PowerShell wrapper with validated modes now accepts the password through hidden
  input, keeps the URL process-local, and clears it after execution; syntax parsing
  passed without executing a database action.
- 2026-07-25: Owner-operated fresh rehearsal returned `status: passed` for authorized
  target `milerdev_lifecycle_fresh` at localhost port 3306. Observed aggregate output
  reported 13 migration journal rows, 29 tables, one nullable `deactivated_at` column,
  and one `idx_users_deactivated_at` index. This is operator-provided sanitized
  evidence; Codex did not receive a credential or connection URL. Protected schema
  `milerdev` was not targeted by the locked runner.
- 2026-07-25: Owner-operated `upgrade-base` rehearsal returned `status: passed` for
  authorized target `milerdev_lifecycle_upgrade`: 12 migration journal rows, 29
  tables, and zero lifecycle column/index objects, matching the expected 0011 source
  state. The next runner stage now transactionally seeds fake OAuth, learning,
  commerce, notification, review, audit, coupon, and certificate links; compares
  counts around 0012; exercises idempotent student deactivation and concurrent Admin
  deactivation through the production lifecycle service; and restores the inactive
  Admin afterward. Focused runner/lifecycle tests passed 2 files / 13 tests, forced
  scoped ESLint and diff check passed, and TypeScript retained only the same four
  unrelated baseline test errors. No upgrade-lifecycle execution has run yet.
- 2026-07-25: The first owner-operated `upgrade-lifecycle` attempt reported only
  `Upgrade schema is not at the expected 0011 base`. The guard fails before fixture
  insertion or migration, so this attempt performed no runner-authorized mutation;
  however, the current database state is unknown and conflicts with the immediately
  preceding 12/0/0 upgrade-base report. Mutation is paused. A target-locked
  `inspect-upgrade` mode was added to return only migration, lifecycle-column, index,
  and table counts. Its guard regression now passes 8/8, forced scoped ESLint,
  PowerShell syntax, and diff checks passed. Root cause remains unconfirmed pending
  the read-only operator result.
- 2026-07-25: Read-only operator inspection observed the upgrade schema at 13
  migrations, 29 tables, one lifecycle column, and one lifecycle index. This proves
  0012 was applied after the earlier 12/0/0 result, but does not yet prove whether
  fixtures or behavior checks ran. The falsifiable working hypothesis is that an
  earlier upgrade-lifecycle execution advanced the schema and a later invocation
  produced the reported 0011 precondition error. `inspect-upgrade` was expanded to
  report only deterministic fake-fixture counts, student lifecycle/reset booleans,
  and active/inactive fake-Admin counts. Guard tests pass 8/8, forced scoped ESLint
  and diff checks pass; no mutation was performed by diagnosis.
- 2026-07-25: Expanded read-only inspection found all deterministic linked fixtures
  retained (three users plus one row in each OAuth, enrollment, lesson-progress,
  payment, notification, review, coupon-usage, and certificate surface). Student is
  inactive at session version 1 with reset token/expiry cleared; audit count is 2;
  both fake Admins remain active. This proves the earlier runner invocation completed
  seed, 0012, student deactivation, and its idempotent retry, then stopped before an
  Admin concurrency transition committed. The later 0011 guard error was therefore
  from a subsequent invocation, not the migration failure. A `verify-upgrade` resume
  mode now requires this exact checkpoint, runs only concurrency, returns sanitized
  outcome codes, and restores the changed fake Admin after success. Focused checks
  pass 2 files / 15 tests, forced scoped ESLint, PowerShell syntax, and diff checks.
- 2026-07-25: Owner-operated `verify-upgrade` reported
  `Representative user or audit fixture count changed unexpectedly`. That guard runs
  before its concurrency mutation, proving the database changed after the prior
  audit-count-2 snapshot. The leading hypothesis is that one verify invocation
  completed Admin deactivate/reactivate and another invocation then encountered the
  stale exact-count guard, mirroring the earlier migration-stage pattern. Mutation is
  paused and this remains a hypothesis until a new read-only inspection confirms
  audit count and final Admin state.
- 2026-07-25: Static trace confirmed the runner defect: `fixtureCounts.audit_logs`
  intentionally counts rows whose entity is the student, but both the combined and
  resume final assertions incorrectly expected that count to include Admin entity
  audits. Student count therefore remained 2 even after Admin deactivate/reactivate,
  producing a false failure. A failing checkpoint regression preceded the repair.
  Inspection now reports `adminLifecycleAuditCount` separately; verification accepts
  a completed even Admin-audit pair with both fake Admins active and returns an
  already-verified result without mutation. Focused checks pass 2 files / 16 tests,
  forced scoped ESLint and diff checks pass. Application migration/service code was
  not changed by this repair.
- 2026-07-25: Corrected read-only inspection reported four Admin lifecycle audit rows,
  both fake Admins active, zero inactive Admins, the inactive student at session
  version 1 with reset credentials cleared, and every deterministic linked fixture
  retained. Four Admin audit rows represent two completed concurrent-deactivate plus
  authorized-reactivate rehearsal rounds; the final active count proves recovery.
  Slice 6 database, retention, idempotency, InnoDB last-admin, and recovery evidence
  is complete. The public certificate row is retained; rendered public-page behavior
  remains a separate runtime/browser observation.
- 2026-07-25: Slice 7 broad verification passed after the final tooling repair: full
  Vitest 48 files / 376 tests, Admin Thai-text scan, full ESLint, Next production
  build with 90 routes, and `git diff --check`. Final source inspection confirmed the
  public certificate route selects by certificate code without a user lifecycle
  filter. Worktree review preserved unrelated pre-existing skill, roadmap, `.claude`,
  `.playwright-cli`, and `output` changes. The standard Next build reported its local
  environment configuration, but no secret value was printed or recorded; no
  protected or production database was targeted, and no commit, disposable-schema
  cleanup, or deployment occurred.
- 2026-07-25: The owner confirmed local milerdev contained no valuable data and
  explicitly authorized destructive recreation on localhost:3306 followed by
  migrations 0000-0012. Preflight exposed an old 27-table/four-journal state and a
  journal timestamp ordering hazard for incremental 0004, so no incremental mutation
  was attempted. Owner-operated Workbench recreation reported zero tables, the
  credential-hidden repository migrator reported completion, and sanitized
  postflight reported milerdev, 29 tables, 13 journal rows, one nullable lifecycle
  column, and one lifecycle index. No credential was shared or recorded; production,
  disposable-schema cleanup, push, and deployment were not targeted.
- 2026-07-25: The existing broad seed was not used because static inspection found
  fixed logged passwords, unnecessary cross-domain data, mojibake content, and unsafe
  rerun coupling. A target-locked smoke fixture runner passed 6 guard tests, forced
  ESLint, PowerShell syntax, and missing-credential denial before the owner executed
  it with hidden inputs. Sanitized output reported exactly two active local users in
  `localhost:3306/milerdev`: one Admin and one Student; no email or provider path was
  invoked. The existing workspace Next server was confirmed by process path and
  returned HTTP 200 for `/login`. Browser discovery returned no available backend,
  so authenticated UI interaction remains owner-operated and unverified at this
  checkpoint.
- 2026-07-25: Owner-operated authenticated local smoke passed end to end without
  email or external-provider calls. The active Student logged in, Admin deactivation
  displayed the preserved-data warning, and confirmation revoked the existing
  Student session by redirecting it to `/login`. The same credentials then received
  the generic Thai invalid-email-or-password response while inactive. Admin list
  retained the Student with inactive status/date; reactivation executed directly as
  designed, and a fresh Student login reached `/dashboard`. Final sanitized database
  inspection showed the Admin active at session version 0 and Student active at
  session version 2, with reset token and expiry clear for both. Two audit rows
  recorded `lifecycle:active` to `lifecycle:inactive` and the reverse transition for
  the Student. Full representative responsive-width and keyboard/focus observation
  remains outstanding.
- 2026-07-25: The owner authorized a scoped follow-up commit of the reusable local
  smoke tooling and USER-LIFECYCLE-001 Project Memory. Immediately before staging,
  the target guard passed 6/6 focused Vitest tests; the fixture TypeScript and test
  passed focused ESLint; the credential-prompting runner parsed as valid PowerShell;
  and `git diff --check` passed. No database, provider, email, push, deployment, or
  cleanup action was part of this commit checkpoint.
