# Privacy consent implementation

Branch: `feat/privacy-consent`, based on `origin/master` at implementation start. This is a local implementation, not a production deployment or analytics enablement.

## Implemented behavior

- Optional first-party analytics default to off. The visitor can accept statistics, use only necessary functionality, or change the statistics switch in a dialog.
- At the owner's subsequent request, the initial choice card floats at the bottom again. The outer positioning area lets clicks pass through; only the card receives pointer events. The card scrolls within short viewports. Content directly beneath the visible card can still be covered until the visitor chooses or scrolls it clear.
- Settings are accessible from the footer, Privacy page and account settings. Choosing while signed in replaces the account's previous receipts; other devices must explicitly choose again. Anonymous permission is not silently promoted into account permission at login.
- The browser stores an HttpOnly, same-site receipt cookie for at most 180 days. The server stores only its digest, account binding when present, policy version, choice, creation/expiry and revocation times. The receipt is not added to analytics payloads.
- Browser senders check consent before transmission. Expired/unknown/refused states fail closed. There is no replay queue. Product/workspace exposures begin only after permission; Web Vitals for a newly consenting page are excluded to avoid sending buffered measurements from before the choice. Measurement starts on a later page load with existing permission.
- BroadcastChannel suspends other tabs during a choice change, then refreshes their state; focus/visibility and expiry also refresh the server decision. A failed save displays an error and keeps local measurement suspended rather than claiming withdrawal succeeded.
- Analytics APIs bind the receipt to the authenticated account (or anonymous visitor), validate it under a row lock and use the same transaction/connection for measurement through `measurement-database.ts`. Withdrawal waits for in-flight collection; subsequent writes fail the receipt check. Existing global governance and event-class gates still apply to analytics persistence.
- Checkout attribution checks current browser consent. A rejected browser cannot attach an old exposure merely by submitting its ID.
- Attributed payment insertion shares the receipt-lock transaction. Withdrawal cannot finish between attribution validation and persistence. Missing consent or optional-attribution failure still permits an unattributed checkout.
- Paid/free/learning transitions enqueue optional facts only when a current member receipt exists. The outbox captures that receipt ID. Projectors check that exact grant again under a lock; revoked, expired and legacy receipts are ineligible. A new opt-in never revives an old outbox item. Purchase reconciliation no longer synthesizes an outbox item for historical payments that lack one.
- Operational payments, enrollments, progress, certificates and idempotency remain the service authority. Missing consent infrastructure fails closed for optional collection without denying access.
- Privacy copy names ปฏิภาณ เพ็งเภา and milerdev.official@gmail.com as confirmed by the owner, explains first-party analytics and choice behavior, and adds the relevant slip/video/Google service categories.

## Files

- Contract and authority: [privacy-consent-contract](../src/lib/privacy-consent-contract.ts), [privacy-consent](../src/lib/privacy-consent.ts), [measurement-database](../src/lib/measurement-database.ts), [consent API](../src/app/api/privacy/consent/route.ts).
- UI: [ConsentProvider](../src/components/privacy/ConsentProvider.tsx), [consent-client](../src/components/privacy/consent-client.ts), [settings button](../src/components/privacy/ConsentSettingsButton.tsx), root layout, footer, settings and [Privacy](../src/app/privacy/page.tsx).
- Collection: analytics event/Web Vitals APIs, client senders, product/workspace exposures, analytics writer, measurement recorder, learning measurement, Web Vitals store and analytics-control database reads.
- Commerce and learning: Stripe course/bundle checkout attribution, paid/PromptPay/free fulfillment, learning progress and purchase/enrollment/learning projectors.
- Database: [schema](../src/lib/db/schema.ts), [0022 migration](../drizzle/0022_lucky_ken_ellis.sql), generated journal and snapshot.
- Tests: new consent authority, client and API suites, [MySQL concurrency test](../tests/integration/privacy-consent.mysql.ts), explicit consent fixtures in existing collection/fulfillment tests, and opt-out acquisition regressions.

## Verification

- Full Vitest suite: 211 files / 1,199 tests passed with four workers. A previous parallel run timed out in the existing navigation keyboard test; it passed both in the bounded full run and focused rerun.
- Focused projector/attribution/navigation tests: 29 passed after the subsequent attribution and projection-status changes. Final consent API/client/attribution checks: 9 passed after the bounded-body and client-state changes. The final default production build includes the identity-change layout effect and final client guards.
- Generated migration reviewed: adds `privacy_consents` and nullable `measurement_outbox.consent_id`; no destructive statements or data backfill. Full migration history applied successfully to a newly created dedicated local MySQL container/database, not the owner's existing database.
- Real MySQL test passed: receipt writes, account binding, in-flight collection versus withdrawal, and rejection of old receipts after re-consenting. The test has an isolated-database guard and removes only its own synthetic rows. CI's isolated `milerdev_e2e` database is also supported.
- Playwright CLI inspected the banner and settings dialog at 390×844 and the footer/settings entry point at 1440×900 using mocked session/consent APIs. Refusal persisted after reload in the mock; footer reopening and Escape dismissal were exercised. The desktop screenshot shows focus returned to the footer trigger, not an open dialog. Screenshots are under `output/playwright/consent-*.png`. This is bounded UI evidence, not real provider or assistive-technology certification.
- TypeScript and ESLint passed. Final ESLint result has zero errors and one pre-existing warning in `output/backend-audit-2026-09-11/vitest.audit.config.ts`; the temporary browser script was moved to a text artifact.
- An isolated webpack production build passed. The first Turbopack attempt rejected a node_modules junction outside its configured root. The default Turbopack build subsequently passed in a separate copy without that junction, using only placeholder configuration and the dedicated test database.

## Release conditions and limitations

1. Do not enable production analytics or start the [#85 qualification](https://github.com/ohmiler/milerdev/issues/85) from this implementation alone. Purpose, retention, access/deletion and governance still require the owner's operational decision.
2. The 180-day cookie/receipt validity is implemented as the product lifetime; it is not a statutory retention period. The owner subsequently approved raw statistics 90 days, queue 30 days, non-identifying aggregates 13 months, and evidence one year after expiry/withdrawal. A bounded count-only-by-default cleanup runner is implemented and tested on synthetic MySQL data. Production execution and scheduling are not enabled; expiry must not be described as automatic database deletion. Complete operational cleanup setup before release/collection.
3. Real third-party iframe/network behavior and vendor configuration were not inspected. This change controls MilerDev's first-party optional analytics, not a guarantee that every embedded provider is tracker-free. Confirm the video/provider inventory and treatment before representing the whole site as fully consent-compliant.
4. Privacy copy is updated for the implemented facts; remaining retention, international transfer and minor-user policy review are not replaced by this feature.
5. Consent-less historical measurements and pending outbox items are retained unchanged and are not backfilled. Qualification reports must account for consent eligibility; compare only eligible populations, not all purchases against consenting page views.
6. The initial manual UI check was limited. Follow-up provider-mocked browser journey evidence is recorded below. Live payment/email/video behavior remains unverified. No live payments, customer queries, refunds or production data deletion were performed.
7. Production startup runs migrations. Deploy schema 0022 with this code; reverting code does not undo schema. Retain the additive table/column on rollback. A pre-consent-code rollback would remove these collection gates, so keep optional analytics operationally disabled during any such rollback.

## Workspace note

User-owned untracked files and the previous branch were preserved. Local build tooling initially followed a junction during scratch-directory relocation and moved part of node_modules; it was stopped and dependencies were copied back before subsequent verification. Generated build files were moved out of source discovery without recursive deletion. No source changes resulted from that incident. Temporary build artifacts and a stopped test database container may remain for review; they are not intended for commit.

## Follow-up review and verification, 2026-09-13

Review scope: task-owned working-tree changes against HEAD `b6d03745f45a2c38105d9bf2e36c65575e7bc270`, including new consent files. Two independent review axes used the agreed consent plan and AGENTS standards.

### Standards

The review found reversed user/receipt lock order during authenticated collection versus withdrawal, and pending browser saves that could restore a superseded grant. The MySQL test originally omitted the event's user FK and missed the deadlock. Adding it reproduced `ER_LOCK_DEADLOCK`; acquiring the user lock before the receipt in browser collection and projection corrected it. Both authenticated MySQL concurrency variants now pass.

A nonblocking naming observation remains: `ensurePurchaseOutbox` is an intentional no-op in the production store, preserving the existing interface while prohibiting historical backfill.

### Spec

The review independently identified the pending-save identity/cross-tab race. Resets now invalidate a pending save, and a successful POST response checks its revision before publishing browser permission. Deferred-response regression tests verify that a superseded acceptance does not send analytics. The browser remains suspended and asks the visitor to retry; it does not represent the old account's grant as current. Narrow re-review found no remaining blocker in these fixes.

### Additional application finding

The original required browser suite passed 11/12 journeys and reproduced a consent overlay covering the lesson-completion button. Moving the card into page flow corrected that obstruction for the recorded matrix. The owner subsequently requested the floating bottom placement again; the current card follows that request and makes the surrounding empty area click-through. The local screenshot `output/playwright/consent-flow-mobile.png` and the 48-case matrix describe the previous in-flow placement, not verification that controls underneath the restored overlay are unobstructed.

The approved retention policy, cleanup operation guide and source-backed video inventory are in [Privacy retention and video review](privacy-retention-video-review.md). They are not an enabled production cleanup job or a live vendor-network audit.

### Retention implementation

The owner approved the proposed durations during follow-up. `src/lib/privacy-retention.ts` and `scripts/privacy-retention.ts` implement the `npm run privacy:retention` count-only default and explicit apply mode. Tests cover deletion on synthetic rows, preserving the operational payment fields, idempotency, a separate-connection lock conflict, date/batch bounds, and stopping raw cleanup while an outbox backlog remains. Purchase/enrollment projectors now lock their outbox reads to serialize with cleanup. The cleanup-versus-live-projector race was reviewed statically; the suite separately exercises the underlying lock and cleanup behavior.

### Proxy and browser test harness

An actual browser consent POST reproduced a 403 because Next's internal request origin differed from the public origin. The endpoint now checks the configured `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL`, falling back to the request origin when neither is set. Caller-supplied forwarded headers cannot expand the allowlist. API tests cover a proxy origin and a forged forwarded host.

The browser matrix runs the existing 12 required journeys in an environment-file-free checkout with synthetic MySQL fixtures, actual session/consent APIs and mocked providers. The local MySQL fixture guard alone was adapted to a dedicated port 3318 because 3306 was unavailable and the owner's existing 3307 database was preserved. Each non-unknown mode chooses through the real UI before the journey and again after registration/login, verifying that anonymous permission does not carry into the account. Consent status is checked through browser fetch; Playwright's standalone request cookie handling on HTTP differs from Chromium's loopback Secure-cookie handling. Registration locators in the scratch harness are scoped to the current form to avoid matching both forms during a Next page transition. The harness is `output/privacy-consent/run-matrix.py`, not a new CI matrix configuration.

### Follow-up results

- Browser matrix: unknown, accepted, refused and withdrawn each passed all 12 required journeys (48 cases). These cover registration, account changes, payment recovery/replay, course and bundle checkout, learning recovery and certificate verification. The providers remain mocked; this does not qualify live third-party services or production analytics.
- Full unit/component/API suite: 211 files / 1,204 tests passed. Final MySQL consent concurrency: 2 passed; retention: 4 passed, including the later outbox-backlog regression.
- Production build passed in the isolated checkout after retention and projector changes. TypeScript and ESLint passed; the single pre-existing output-directory lint warning remains.
- The actual `npm run privacy:retention` default command also passed against the dedicated synthetic database and emitted only counts/cutoffs. Apply-mode behavior was exercised only by the isolated MySQL tests.
- Review outcome: Standards identified two correctness findings (fixed) and one nonblocking interface-naming observation; Spec identified one overlapping correctness finding (fixed). The subsequent bounded retention review found no blocker. These local results do not include production qualification, deployment or production cleanup. PR delivery and CI are tracked separately.

## Floating-card PR verification

The owner requested PR delivery after restoring the floating card. The final layout was visually inspected at 390x844 and 1440x900; local images are `output/playwright/consent-floating-mobile-final.png` and `consent-floating-desktop-final.png`. Settings opened and Escape dismissed the dialog. The production build and all 12 required provider-mocked journeys passed with the final floating card. The shared registration helper now explicitly selects necessary-only consent before registration and after login; these journeys verify refusal, not unobstructed interaction beneath an unanswered floating card. The card and its current shadow/scroll boundary are intentional owner choices.
