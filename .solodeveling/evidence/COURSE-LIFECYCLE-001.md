---
solodeveling_schema: 1
---

# COURSE-LIFECYCLE-001 Evidence

Status: Done for the authorized implementation boundary. AC1-AC9 have current applicable evidence; live providers, production preflight/migration/deployment/observation, push, and fixture/data cleanup remain separate unauthorized work.

## Current acceptance matrix

| AC | Result | Evidence | Limitation |
| --- | --- | --- | --- |
| AC1 | Slice 1 passed | Service/API tests cover Active Admin recheck, strict action/expected-state validation, 400/403/404/409 mapping, stale state, invalid transition, retry, and authoritative state. | No database-backed or production authority check. |
| AC2 | Slice 1 passed | Transaction test proves audit failure rollback and concurrent archive convergence; API tests prove legacy DELETE archives and general PUT rejects status while ordinary detail edits remain available. | General detail/tag update atomicity was pre-existing and is outside this lifecycle slice. |
| AC3 | Passed locally | In-memory invariants and disposable MySQL rehearsal prove Archive/Restore leaves representative course, lesson, enrollment, progress, payment, review, coupon, coupon usage, certificate, Bundle, and Bundle membership rows intact. | Production data remains untouched and unverified. |
| AC4 | Passed locally | Public Bundle catalog/detail, free enrollment, Stripe checkout, and PromptPay intent paths reject empty or non-published children; archived public course detail produces a streamed not-found/noindex boundary without course or enrollment content. Owner-observed authenticated Student runtime confirmed the archived retention course still opens `Retained lesson` with preserved 100% progress/completion. Accepted payment fulfillment remains independent of current publication. | Production learner journeys and live providers remain unverified. |
| AC5 | Passed locally | Admin Bundle mutation and public sale tests prove published-child enforcement and rollback. Disposable MySQL rehearsal additionally proves a published containing Bundle blocks Archive and two concurrent Archive requests converge with one state change and one idempotent result. | No production lock-timing observation or live provider race was performed. |
| AC6 | Slice 2 passed at code level | PromptPay intent API creates a new immutable owner/target/amount/coupon snapshot before transfer, with a 30-minute TTL. Claim, foreign/altered/expired rejection, underpayment, provider-mocked verification, duplicate reference, completed replay, and fulfillment after archive are covered by focused tests. Stripe checkout retains its immutable-attempt behavior and now stores coupon identity locally. | Live SlipOK behavior, timeout reconciliation, and database-backed uniqueness/concurrency remain unverified. |
| AC7 | Passed locally | Admin list and editor represent draft/published/archived; expose only valid Publish/Archive/Restore actions; contain no physical-delete affordance; disable pending controls; use accessible confirmation dialogs; explain retained learner access, stopped sales, in-flight payment checks, and published-Bundle conflicts; display safe dependency titles; and update from the authoritative API status. Component/client/API tests pass; the owner completed Restore, Publish, and Archive through the local Admin UI. Owner-observed narrow mobile runtime showed the Restore dialog fully inside the viewport with readable content, full-width actions, and a visible focus indicator. Static inspection confirms the shared dialog handles Escape, Tab trapping, and focus restoration. | Production browser diversity and formal assistive-technology testing remain outside this local evidence. |
| AC8 | Passed locally | Generated migration is additive. Disposable fresh rehearsal reached 14 migrations/29 tables with one nullable coupon column/index; the 0012 base had 13 migrations and neither object; upgrade converged to the same 14/29/1/1 contract. All representative counts remained identical, old payment coupon stayed null, a new coupon link wrote successfully, and recovery returned the course to draft. | Production preflight, backup, execution, and observation remain separate release work. |
| AC9 | Passed for implementation | Current full Vitest regression passed 62 files/447 tests after the cache-invalidation repair; full ESLint and tracked `git diff --check` passed. Prior Admin text scan and generated SQL review remain current. Owner-run Next production build completed and produced a fresh `.next/BUILD_ID` after the latest source changes. Local migration, fixture integrity, authenticated Admin/Student lifecycle journeys, responsive/focus review, public catalog visibility, streamed not-found/noindex behavior, and positive published controls were observed. | Live providers, production release/migration/observation, push, and fixture/data cleanup remain unverified and unauthorized. |

## Planning evidence

- Static inspection on 2026-07-25 confirmed `courses.status` already permits `draft`, `published`, and `archived`.
- Static inspection confirmed normal Admin DELETE physically deletes courses while multiple linked tables cascade or detach, and the general update path can mutate status outside an atomic lifecycle/audit transaction.
- Static inspection confirmed direct public course discovery, enrollment, Stripe checkout, and slip verification already require `published`, while enrolled learning/progress/certificate paths do not require publication.
- Static inspection confirmed published Bundle surfaces and sale paths validate Bundle status but do not consistently require published child courses.
- Static inspection confirmed Stripe/manual fulfillment enroll from accepted payment targets without requiring current publication, preserving recoverability, while PromptPay currently creates/reuses pending payment only after a publication check.
- Static inspection confirmed payments retain amount, target, method, status, provider reference, and creation time but not coupon identity; the accepted durable PromptPay-intent contract therefore plans an additive nullable coupon column.

These are source-inspection findings, not executed behavior. Existing unrelated worktree changes were preserved.

## Slice 1 observations

- Initial regression run failed as expected because `course-lifecycle` and PATCH did not exist and DELETE still used the legacy route behavior.
- `npx vitest run` over lifecycle, validation, Admin authorization, and neighboring user-lifecycle suites passed: 6 files, 90 tests. The narrower final lifecycle/validation run passed: 3 files, 51 tests.
- Targeted ESLint passed for all Slice 1 source and test files. `npm run check:admin-text` passed after the Thai copy changes.
- `npx tsc --noEmit` cleared all Slice 1 errors after the price-union fix, but remains non-zero for four errors in unchanged `admin-payment-security`, `auth-account-schema`, and `auth-rate-limit-schema` tests.
- No database, migration, provider, email, notification, commit, push, deploy, or cleanup action was performed. Build was not run because this slice lacks authority for any build-time database access.

## Slice 2 observations

- The initial two regression suites failed as expected because Bundle commerce and PromptPay-intent modules did not exist; their implemented rerun passed 11 tests.
- Admin Bundle mutations now use strict Zod input, an Active-Admin transaction recheck, stable child-course locking, published-child enforcement, atomic membership replacement, and atomic redacted audit. User-selected course display order is preserved separately from lock order.
- Public Bundle catalog/detail/free-enroll/Stripe entry points reject a legacy published Bundle with missing/draft/archived children. A completed payment may still restore entitlement after retirement; no new sale bypass is introduced.
- Course and Bundle clients create `/api/promptpay/intents` before displaying transfer instructions and submit only `paymentId` plus the slip. Verification claims `pending -> verifying` atomically, uses the stored THB amount, releases recoverable failures, preserves timeout state for reconciliation, and fulfills from the stored target without a publication recheck.
- The affected Critical gate passed 16 files/203 tests. Targeted ESLint and `check:admin-text` passed. `npx tsc --noEmit --pretty false` reported only the four known baseline errors and no Slice 2 file.
- Migration `0013` was generated with explicit CLI schema/dialect/out flags, so no secret-bearing Drizzle config was loaded and no database connection was made. Exact SQL review found only one nullable column and one index.
- No database was accessed or mutated; migration `0013` was not executed; no real Stripe, SlipOK, email, or other provider was called; and no commit, push, deploy, or cleanup was performed. Build was not run because Next build may load forbidden secret-bearing environment files and is not required for this authority-limited slice.

## Slice 3 observations

- The new component suite first failed because lifecycle controls did not exist, then passed after implementation. Final focused lifecycle client/component/API verification passed 3 files and 16 tests.
- Admin Courses now counts and filters archived courses on desktop and mobile, labels every status in text, hides public-page links for non-published courses, and offers only valid explicit transitions.
- The editor no longer renders or calls a physical-delete action. General detail saves continue to omit status; lifecycle changes use validated PATCH requests with expected state.
- A shared browser client validates the response course identity and status before updating UI state, surfaces stale/invalid responses, and includes safe published-Bundle titles in a persistent dialog error as well as toast feedback.
- Archive confirmation explicitly states that new sales stop, enrolled learners retain access, in-flight payments are rechecked, and published Bundle membership can block the operation. Restore returns to draft and Publish remains explicit.
- Targeted ESLint passed. `npm run check:admin-text` passed. `npx tsc --noEmit --pretty false` reported only the same four pre-existing errors in unchanged payment/auth schema tests and no Slice 3 error. Scoped `git diff --check` passed; only Windows LF-to-CRLF notices were emitted.
- No database was accessed or mutated; migration `0013` was not executed; no server, fixtures, browser, real provider, commit, push, deploy, or cleanup action was performed.

## Slice 4 non-runtime verification observations

- `npm run test -- --run` passed 60 files and 434 tests. Expected stderr from negative webhook/auth paths did not fail any suite; exit status was zero.
- `npm run lint` passed with no findings. `npm run check:admin-text` passed.
- `npx tsc --noEmit --pretty false` remained non-zero only for the four recorded baseline errors: two call-signature errors in `admin-payment-security.test.ts` and two Drizzle `IndexColumn.name` errors in unchanged auth schema tests. No COURSE-LIFECYCLE-001 source or test file appeared.
- Full tracked `git diff --check` passed; output contained only Windows LF-to-CRLF notices. Static review reconfirmed migration `0013` contains exactly one nullable column and one non-unique index, with no backfill, constraint, drop, rename, or data rewrite.
- Static physical-delete search found no Admin course delete affordance or `db.delete(courses)` path. The remaining Admin course DELETE API references are the tested archive-compatibility boundary; lesson deletion is a separate out-of-scope resource operation.
- Applicable security profiles remain web-application, identity-access, sensitive-data, data-migration, supply-chain, infrastructure, and payments. Code-level authority, validation, idempotency, safe errors, audit, immutable payment ownership, and roll-forward recovery have automated or static evidence; target-environment migration, provider, runtime interaction, and operational observation remain explicitly unverified.
- Build was not run: Next build may automatically load secret-bearing `.env*` files, which repository policy prohibits the agent from reading or exposing. This is an unavailable gate, not a pass.
- No database was accessed or mutated; migration `0013` was not executed; no local server, fixtures, browser, E2E, real provider, commit, push, deploy, or cleanup action was performed.

## Verification tooling preparation

- Added fail-closed target guards for exact local schemas `milerdev_course_lifecycle_fresh`, `milerdev_course_lifecycle_upgrade`, and local smoke target `milerdev`. Initial tests failed because the guards did not exist; the implemented guard suites pass 13 tests and prove rejection of remote hosts, non-3306 ports, non-MySQL URLs, protected schemas, and credential echo.
- Added an unexecuted migration rehearsal command covering fresh apply, 0000-0012 base creation, 0012-to-0013 upgrade, representative retained-row comparison, nullable/default coupon compatibility, coupon snapshot write, archive retry, MySQL concurrency convergence, published-Bundle conflict, and restore recovery.
- Added an unexecuted local smoke fixture command that requires migration count 14, the coupon column/index, and the existing active local lifecycle Admin/Student fixtures before creating three bounded courses for Archive/retention, Bundle conflict, and Publish journeys. It calls no provider and stores no real credential.
- Focused guard/lifecycle/schema/API verification passed 5 files and 28 tests. ESLint with `--no-ignore` passed for every new script/test. TypeScript returned only the same four baseline errors and no tooling error. Package and tracked diff integrity passed.
- Safety inspection found no dotenv or `.env*` loading, drop statement, table/database deletion, or URL logging. Runtime scripts read only explicitly supplied environment variables and verify the connected database name and port before mutation.
- Tooling preparation did not connect to a database, execute a migration, create a fixture, open a server/browser, call a provider, commit, push, deploy, or clean up.

## Disposable MySQL rehearsal

- Owner-created and explicitly authorized local schemas only: `milerdev_course_lifecycle_fresh` and `milerdev_course_lifecycle_upgrade` on `localhost:3306`. Credentials remained owner-controlled and were not provided to the agent or recorded.
- Fresh mode passed with `migrationCount=14`, `tableCount=29`, `columnCount=1`, and `indexCount=1`.
- Upgrade-base mode passed with the expected 0012 contract: `migrationCount=13`, `tableCount=29`, `columnCount=0`, and `indexCount=0`.
- Upgrade-lifecycle mode passed and converged to 14/29/1/1. Pre-migration, post-migration, and final fixture counts were exactly one for users, courses, lessons, enrollments, lesson progress, payments, reviews, coupons, coupon usages, certificates, Bundles, and Bundle memberships.
- Executed behavior observed a published-Bundle dependency conflict, two fulfilled concurrent Archive requests with exactly one internal state change, final recovery to `draft`, and one successful payment-to-coupon link. The script would have failed if concurrency changed more or fewer than one row even though the safe JSON reports two fulfilled idempotent requests.
- This rehearsal changes only the two authorized disposable local schemas. Local `milerdev`, production, providers, server/browser, commit, push, deploy, and cleanup remained untouched.

## Local migration and fixture verification

- Owner-operated migration on local MySQL Workbench-managed `localhost:3306/milerdev` completed successfully through migration `0013`.
- The fixture command stopped fail-closed because course lifecycle fixtures already existed; no duplicate rows were inserted and no cleanup was performed.
- Owner-operated read-only SQL verified the existing fixture set is complete: three courses and exactly one expected lesson, enrollment, lesson-progress, payment, review, coupon, coupon-usage, certificate, Bundle, and Bundle membership row.
- Current course states are retention course `archived`, Bundle-conflict course `published`, and former draft course `published`, consistent with prior lifecycle actions. This database evidence does not prove authenticated keyboard, responsive, focus, or learner-page behavior.

## Local lifecycle runtime and cache verification

- An unrelated Next.js application owns port 3000; prior project evidence and current fingerprinting confirmed MilerDev on port 3001. No unrelated process was stopped.
- The owner completed Restore, Publish, and Archive for the retention fixture through the authenticated Admin UI. The public course API then excluded the archived slug while retaining both published fixture slugs.
- Next App Router returned transport status 200 for the streamed not-found boundary, but the archived detail HTML contained no course title, fixture content, or enrollment path and did contain `noindex` plus the 404 fallback digest. Published course and Bundle controls contained their expected product markers without not-found/noindex markers.
- The unauthenticated retained-learning route produced a login redirect boundary rather than course content. Authenticated Student retention remains unobserved.
- Runtime probing exposed an explicit cache-consistency gap: lifecycle transactions changed status without invalidating cached public paths. A failing API regression proved PATCH and compatibility DELETE made zero invalidation calls. The repair carries the locked course slug through the service result and revalidates `/`, `/courses`, the course detail path, and `/sitemap.xml` after a successful transition. Focused lifecycle verification passed 2 files/13 tests; current full Vitest passed 62 files/447 tests, full ESLint passed, and tracked diff integrity passed.

## Authenticated Student retention

- Owner-observed authenticated browser evidence on MilerDev port 3001 showed the archived `Lifecycle Retention Course` lesson route open successfully for the existing Student. `Retained lesson` remained available and progress/completion displayed 100%, proving the linked enrollment and learning state survived Archive in this fixture.
- The supplied wide screenshot showed the course index, retained lesson, main learning surface, completion bar, and next action without visible clipping or overlap. No provider call was involved. Narrow Admin layout and keyboard/focus behavior remain unobserved.

## Narrow Admin dialog and keyboard evidence

- Owner-observed narrow mobile runtime showed the Restore confirmation fully within the viewport: title and safety copy remained readable, both actions remained full-width without clipping, the backdrop separated the task from the page, and the Cancel action displayed a clear focus indicator.
- Static inspection of the reused `DialogShell` confirms Escape invokes close, Tab and Shift+Tab wrap inside the dialog, body scroll is restored, and focus returns to the explicit target or previously focused connected element on cleanup. The screenshot proves the rendered narrow composition and focus visibility; the shared primitive supplies the keyboard mechanics.

## Controlled production build

- The owner stopped the local dev server and ran `npm run build` in the owner-controlled environment. The supplied terminal output reached the completed route manifest and static/dynamic route legend without an error.
- Read-only artifact inspection found a non-empty `.next/BUILD_ID` written at 2026-07-26 00:52:51 after the latest source changes; port 3001 was no longer listening. This closes the Next compilation, TypeScript application gate, and production-bundle evidence for the authorized implementation boundary.
