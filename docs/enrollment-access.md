# Admin enrollment access

The owner chose on 2026-09-19 to separate withdrawal of course access from resetting learning history. An admin revocation keeps the enrollment identity, enrollment date, progress percentage, completion date, lesson progress, and certificates. Only an explicit admin restoration or manual grant clears revocation. Resetting progress is not part of this change.

`src/lib/admin-enrollment.ts` owns manual grants, explicit revocation/restoration, and imported grants. Access changes and their actor/reason audit commit in one transaction. Revocation/restoration require a reason of 5–500 characters. Manual grant and import record their explicit operation as the audit reason. CSV imports skip any existing enrollment, including revoked ones, and do not overwrite historical progress.

`enrollments.revoked_at IS NULL` means active access. Learner collection, workspace authorization, entry redirects, review eligibility, and ownership presentation exclude revoked rows. Progress mutations lock the enrollment and reject revoked access, including writes from an already-open preview. Public free previews remain public. Existing video URLs already delivered to a browser are not invalidated by this database transition.

Paid fulfillment remains insert-only and duplicate-safe. The existing unique member/course key prevents Stripe, PromptPay, manual payment fulfillment, free enrollment, or paid recovery from replacing a revoked enrollment. Refund cleanup excludes revoked rows so it cannot remove that protection. New acquisition checks reject revoked courses, including affected bundles, before creating a new payment. Historical paid attempts remain paid; the member payment view reports withdrawn access and directs the member to support.

Certificates remain independent historical credentials. Revocation does not revoke a certificate or erase earned completion. Existing missing-certificate repair continues using that retained evidence. Committed measurement facts remain historical; restoration does not create a new enrollment identity or acquisition fact. Administrative counts/reporting retain historical enrollment rows; operational enrollment lists and CSV export expose revocation separately.

## Migration and release

- Generated migration: `drizzle/0023_light_scarecrow.sql` adds one nullable datetime column. Existing rows remain active; no data backfill or deletion is required.
- Apply the additive migration before running the new application. All migrations have passed on a disposable local test instance only; the existing local database and production have not been migrated by the agent.
- Do not roll back to code that ignores `revoked_at` after using revocation: it would treat retained rows as active access. A rollback must retain the active-access checks. Never drop the column to undo this release.
- This change does not recover progress removed by the old hard-delete implementation. Any production recovery requires separately authorized evidence and restore operations.

## Verification on 2026-09-19

- The application suite passed 1,288 tests. After the final admin copy adjustment, the 15 affected API/component tests, scoped ESLint, Thai admin text validation, and an isolated production build passed.
- A separate native MySQL 8.0.46 instance on localhost port 3307 applied the complete migration history. Three integration tests verified concurrent/idempotent revocation, transactional rollback when audit insertion fails, retained learning history, explicit restoration, and blocked automatic restoration through import/free/paid fulfillment. Run these with `npx vitest run --config vitest.mysql.config.ts tests/integration/enrollment-access.mysql.ts` against an owner-provisioned isolated test database.
- Targeted browser checks passed on member administration and the global enrollment list: required reason validation, revoke/restore, learner access denial/restoration, retained progress/completion/certificate, and actor audit records. The second course remained accessible. These checks used synthetic members and sessions, mocked external providers, and a production build; they do not cover real provider integrations, login, or full visual/mobile QA.
- The disposable app and MySQL processes were stopped after verification. The existing MySQL80 service remained running and its data was not accessed. Production migration and deployment remain outstanding.
