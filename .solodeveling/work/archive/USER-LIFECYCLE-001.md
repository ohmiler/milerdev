---
solodeveling_schema: 1
id: USER-LIFECYCLE-001
status: done
level: Critical
authority: User authorized creating and using `milerdev_lifecycle_fresh` and `milerdev_lifecycle_upgrade` on `localhost:3306` for Slice 6 on 2026-07-24, a scoped `USER-LIFECYCLE-001` source commit on 2026-07-25, destructive recreation plus migrations 0000-0012 on empty local schema `milerdev` on 2026-07-25, target-locked creation of local Admin/Student fixtures plus local server smoke on 2026-07-25, a scoped follow-up commit of local smoke tooling plus Project Memory on 2026-07-25, exact fast-forward push of `ad820df` and `7319b91` to `origin/master`, and manual Railway production deployment of candidate `7319b91` with migration 0012 through `npm start`, and a final scoped commit/push of the resulting release Project Memory; cleanup remains unauthorized.
---

# Make user deactivation reversible and data-safe

## Intent and outcome

Replace normal Admin hard-delete behavior with a reversible account lifecycle. An
inactive account cannot authenticate or retain a usable session, while learning,
commerce, certificate, OAuth, and audit history remain intact. Admin Users becomes
the first Admin vertical slice aligned with the established learner-facing system.

## Confirmed baseline

- `users` has role and `sessionVersion`, but no lifecycle field. JWT authorization
  reloads both from MySQL; credentials and recovery do not check account state.
- Single and bulk Admin delete physically remove `users`. Cascades remove OAuth
  accounts, enrollments, lesson progress, notifications, coupon usage, and
  certificates; several financial/audit references instead become null.
- Current self-delete/self-demotion guards do not express a concurrency-safe
  last-active-admin invariant. Admin password reset does not bump `sessionVersion`.
- Admin Users exposes hard-delete controls and mixes Admin primitives with hardcoded
  presentation; focused auth tests exist, but no lifecycle mutation/UI coverage does.

## Scope

- Add one indexed nullable `deactivatedAt` field; null means active and every existing
  row remains active without a data backfill or foreign-key change.
- Add admin-only, validated, idempotent single/bulk deactivate and reactivate flows;
  remove physical user deletion from normal Admin paths.
- Enforce inactive state across credentials, Google OAuth, JWT refresh, password-reset
  request/confirmation, role changes, and admin password reset/session invalidation.
- Preserve all related rows and public certificate verification; expose truthful
  lifecycle state in Admin list/detail, filtering, export, feedback, and audit history.
- Reuse global semantic tokens, shared dialogs/forms/feedback, and established public
  interaction/accessibility rules while retaining task-appropriate Admin density.
- Generate/review an additive migration and verify fresh/existing local schemas,
  authorization, concurrency, data retention, UI states, and recovery.

Out of scope: Course lifecycle; learner self-service closure/deletion; notification
email; deactivation reasons; permanent purge/erasure; payment or entitlement-policy
changes; broad CSV import redesign; full Admin redesign; production migration/deploy.

## Acceptance

- AC1: Schema/migration adds only indexed nullable `deactivated_at`; existing users
  remain active and no relationship, payment, learning, certificate, or audit row is
  deleted or rewritten.
- AC2: Authorized single/bulk transitions are validated, idempotent, atomic, audited,
  report actual affected rows, bump `sessionVersion`, and clear reset credentials on
  deactivation; normal Admin/API paths cannot physically delete a user.
- AC3: Inactive accounts receive the same generic credential/recovery failure shape as
  other denied accounts, cannot complete Google sign-in, and lose existing JWT access
  on the next authorization check; reactivation does not restore stale tokens.
- AC4: Deactivation preserves account identity, OAuth linkage, enrollments, progress,
  payments, coupon usage, notifications, reviews, certificates, and public certificate
  verification. Financial effects already in flight remain recordable for recovery.
- AC5: Self-protection and a concurrency-safe last-active-admin invariant cover
  deactivate, role update, and bulk variants; no authorized request sequence can leave
  zero active admins.
- AC6: Admin list/detail show and filter Active/Inactive state, provide safe reversible
  controls with explicit impact, and render default/loading/empty/error/success/
  disabled/destructive states accessibly at representative responsive widths.
- AC7: Imports do not reactivate an existing email, exports include lifecycle state,
  and admin password reset revokes prior sessions without activating the account.
- AC8: Focused auth/mutation/concurrency/data-retention/UI tests, fresh and representative
  existing-schema migration rehearsal, relevant regressions, admin-text, lint, build,
  diff integrity, and final status review pass before completion can be claimed.

## Boundary record

| ID | Boundary | Authority | Invariant | Failure | Risk / Control | Verification | Recovery |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UL-MIG | Existing MySQL schema to lifecycle-aware schema | Separately authorized migration runner against a confirmed target | Existing rows stay active and all relations remain intact | Wrong target, partial apply, old/new app overlap | Additive nullable indexed column; reviewed generated SQL; target preflight | Fresh and representative upgrade rehearsal plus row/relationship counts | Before use, app rollback leaves inert column; after deactivation, retain enforcing app and roll forward |
| UL-STATE | Admin single/bulk state mutation | Server-verified active admin; validated IDs/action | Transition is idempotent, audited, and never deletes related data | Retry, mixed state, concurrent role/deactivation, audit failure | Transactional compare-and-set, actual affected count, atomic audit/session bump | Mutation contracts, retries, mixed batches, rollback/failure injection | Transaction rollback; reactivate for authorized correction; no purge |
| UL-AUTH | Credentials/OAuth/recovery/JWT to authenticated session | Only an active database user with valid provider/credentials | Inactive users never obtain or retain an authorized session | Stale JWT, OAuth relink, pre-issued reset token, DB outage | DB-backed active-state check; generic denial; clear reset token; fail closed | Credentials/OAuth/session/reset negative-path tests | Reactivate then require fresh sign-in/recovery; never reuse stale token |
| UL-ADMIN | Role/deactivation decisions affecting administrators | Active admin excluding prohibited self-action | At least one active admin always remains | Two concurrent admins disable/demote each other | Transactional last-admin guard across single/bulk actions | Single, bulk, self, mixed-role, and concurrency tests | Roll back transaction; owner-controlled DB recovery only if invariant was externally broken |
| UL-UI | Admin Users list/detail lifecycle controls | Authenticated Admin UI backed by server authority | UI describes real effects and cannot imply permanent deletion | Stale tab, duplicate click, partial refresh, inaccessible confirmation | Shared tokens/primitives, disabled pending state, truthful response refresh, server remains authoritative | Component/route tests and keyboard/responsive browser checks | Refresh authoritative state; retry only idempotent transition |

## Decisions and alternatives

Use `deactivatedAt` rather than `isActive` so the minimal model retains when the
transition occurred without introducing a broader status machine. Audit logs own the
actor; no reason/by columns are added. Existing data stays linked because the user row
remains. Repeated deactivate/reactivate requests converge safely instead of failing.

Keeping hard delete is the smallest code option but fails the data-retention outcome.
A boolean is slightly smaller but loses lifecycle timing. A multi-state enum supports
future suspension/erasure but adds semantics not currently requested. Permanent purge
remains a separately authorized recovery/privacy workflow, not an Admin convenience.

## Implementation and verification plan

### Slice 1 - Schema contract and additive migration draft (AC1)

- Extend `src/lib/db/schema.ts` with nullable `deactivatedAt` mapped to
  `deactivated_at` and an index; add a focused schema-contract regression first.
- Generate the next Drizzle migration and review its SQL, journal, and snapshot. It
  may add only the nullable column and index: no default, backfill, foreign-key edit,
  delete, or relationship rewrite.
- Run static generation/tests only in this slice. Applying the migration to any MySQL
  target remains a later authorization checkpoint.

### Slice 2 - Transactional lifecycle domain and Admin API (AC2, AC4, AC5)

- Add one server-only lifecycle service used by single, bulk, and role-change paths.
  Validate action and IDs, prohibit self-deactivation/self-demotion, lock the active
  Admin set in deterministic order, then decide and mutate inside one transaction so
  concurrent requests cannot leave zero active Admins.
- Use compare-and-set transitions. Deactivation sets `deactivatedAt`, increments
  `sessionVersion`, and clears reset credentials; reactivation clears
  `deactivatedAt` and also increments `sessionVersion`. Retries and mixed batches
  return actual changed/skipped counts rather than requested counts.
- Write the lifecycle/role audit record in the same transaction; an audit failure
  rolls back the state change. Adapt `src/lib/auditLog.ts` with a transaction-aware
  path while preserving current callers and safe metadata handling.
- Replace physical deletion in `src/app/api/admin/users/[id]/route.ts` and
  `src/app/api/admin/users/bulk/route.ts`. Existing DELETE/bulk-delete requests become
  deactivation compatibility paths for stale clients; no normal route exposes purge.
- Add focused mutation tests for single, bulk, retry, mixed state, self-action,
  last-active-admin, concurrent cross-deactivation/demotion, audit failure rollback,
  and retention of representative linked records.

### Slice 3 - Authentication, session, OAuth, and recovery enforcement (AC3, AC7)

- Make the database-backed session policy in `src/lib/auth-session.ts` reject inactive
  users as well as missing/stale users, preserving fail-closed database behavior.
- Extend credentials and Google sign-in checks in `src/lib/auth-credentials.ts`,
  `src/lib/auth-google.ts`, and `src/lib/auth.ts` so inactive existing identities
  receive generic denial and cannot create/link a bypass session; new-account OAuth
  behavior remains unchanged.
- Make reset request return the existing generic response without issuing or emailing
  a token for inactive users. Reset confirmation requires an active user. Admin reset
  never activates a user and increments `sessionVersion` to revoke prior sessions.
- Extend existing auth/session/Google/recovery tests for inactive, reactivated, stale
  JWT, pre-issued reset-token, and database-failure paths. Provider and email calls
  remain mocked.

### Slice 4 - Admin data contracts and compatibility surfaces (AC6, AC7)

- Add lifecycle state to list/detail responses and stats; validate an
  all/active/inactive filter and keep pagination/counts consistent with it.
- Include lifecycle state and deactivation time in export. Import keeps its duplicate
  email behavior and must never reactivate an inactive account implicitly.
- Return authoritative post-mutation state and actual counts so stale tabs and retries
  can refresh rather than infer success locally. Add API tests for authorization,
  validation, filtering, export/import compatibility, and failure response shapes.

### Slice 5 - Admin Users lifecycle UI aligned with the user system (AC6)

- Update `src/app/admin/users/page.tsx` and `src/app/admin/users/[id]/page.tsx` to show
  Active/Inactive badges, filtering, and reversible deactivate/reactivate controls;
  remove permanent-delete language and explain preserved data versus blocked access.
- Reuse global semantic tokens, `AdminPrimitives`, shared feedback, forms, and
  `ConfirmDialog`. Map the affected Admin styling to the learner-facing token system
  instead of adding another palette; preserve keyboard focus, labels, pending/disabled
  behavior, contrast, and task-appropriate information density.
- Cover default, loading, empty, error, success, stale, disabled, and destructive
  confirmation states with behavior-focused component/route tests. Inspect keyboard
  flow and representative 390, 768, 1280, and 1600 px widths without asserting CSS
  implementation details.

### Slice 6 - Migration rehearsal and data-safety checkpoint (AC1, AC4, AC5, AC8)

- Stop and obtain explicit authorization plus the exact local disposable MySQL target
  before applying SQL. Do not use production or the normal development schema for the
  rehearsal, and do not display or edit secret-bearing environment files.
- Rehearse both a fresh schema and a representative existing schema with active and
  inactive Admin/user fixtures and linked OAuth, learning, commerce, notification,
  review, audit, and certificate rows. Record before/after table, relation, and sample
  row counts; verify the last-active-admin concurrency case and public certificate
  page after deactivation.
- A failed rehearsal is recovered by discarding only the explicitly confirmed
  disposable schema and fixing forward. Destructive cleanup requires a separately
  confirmed exact target.

### Slice 7 - Broad verification and handoff (AC1-AC8)

- Run focused tests after each slice, then affected auth/Admin regressions followed by
  `npm run test -- --run`, `npm run check:admin-text`, `npm run lint`, and
  `npm run build`. Run the scoped Playwright lifecycle flow only when a safe local
  authenticated fixture is available; otherwise record it as an untested limitation.
- Run `git diff --check` and `git status --short`, reconcile every acceptance row in
  the EVIDENCE file, and request Critical verification before marking done.
- Commit, production backup/preflight, migration, Railway deploy, smoke observation,
  and enabling Auto Deploy remain separate user-authorized release actions.

## Execution checkpoints

- Another session may implement Slices 1-5 after explicit implementation authority.
- Slice 6 cannot start until the user confirms a disposable local MySQL target.
- No production database or Railway action is implied by implementation authority.
- Before any production deactivation, an old app can still be rolled back while the
  additive column remains inert. After a deactivation exists, never roll back to code
  that ignores lifecycle state; keep enforcement online and forward-fix.
## Risks, recovery, and next action

Material risks are incomplete auth-path enforcement, last-admin races, misleading UI,
audit/state divergence, and an unsafe rollback to old code that ignores deactivation.
Before the first production deactivation, code rollback may leave the additive column
inert. After any deactivation, rolling back to non-enforcing auth code is unsafe;
retain lifecycle enforcement and forward-fix instead. Production still requires a
separate backup, preflight, migration, smoke, and rollback/roll-forward authority.

Next: await explicit Slice 6 authority and the exact disposable local MySQL target,
then rehearse fresh/existing lifecycle migration and data-safety behavior. Do not
connect to MySQL, apply a migration, commit, or deploy before that checkpoint.

## Outcome

Slices 1-7 are implemented and verified locally. Fresh and representative MySQL
rehearsals, linked-data retention, idempotent inactive enforcement, and real InnoDB
last-admin recovery passed. Full tests, Admin text, lint, build, and diff integrity
passed. Owner-operated authenticated local smoke then confirmed active Student login,
deactivation confirmation and retained-data messaging, immediate revocation of the
existing session, generic credential denial while inactive, direct reactivation,
fresh login after reactivation, session version 2, cleared reset credentials, and
two matching lifecycle audits. Full representative responsive-width and keyboard
checks plus live provider/production behavior remain explicit release-environment
gaps. The scoped source commit and fresh 0000-0012 migration of empty local schema
milerdev were authorized and completed; the later smoke tooling and memory updates
were verified and committed. Candidate `7319b91` was pushed and manually deployed to
Railway production after a restored logical backup and production preflight.
Migration 0012, database postflight, Admin login/logout/fresh login, Admin Users, and
the error-log observation passed. The final release-memory commit/push was authorized;
cleanup remains unauthorized.
