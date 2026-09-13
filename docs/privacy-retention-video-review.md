# Privacy: retention and embedded video review

Reviewed 2026-09-13. The owner approved the optional-data retention durations in this conversation on that date. Production cleanup execution and scheduling are not authorized or enabled by that approval. The video section is a source-code inventory, not a production network audit.

## Approved retention for optional measurement

These are owner-approved product durations, not statutory periods. The operator still needs to deploy and schedule the runner before the website can promise automatic enforcement.

| Data | Approved limit | Reason / boundary |
| --- | --- | --- |
| Raw optional analytics and Web Vitals | 90 days from collection | Diagnose recent journeys and performance; remove user/exposure links after the window. |
| Processed measurement outbox | 30 days after projection | Allow operational investigation without retaining optional facts indefinitely. |
| Pending measurement outbox, including rejected/ineligible items | At most 30 days from creation | Discard optional measurement after the deadline without modifying the payment, enrollment or progress. No separate terminal state exists yet. |
| Consent evidence | 1 year after expiry or withdrawal, whichever ends the grant first | Minimize evidence to the implemented version, choice, timestamps and binding. |
| Aggregates | 13 months, only if no account/exposure links and small groups cannot identify a learner | Compare annual patterns. Pseudonymous or linkable rows remain subject to the raw-data policy. |

Cookie validity remains 180 days. Expiry stops authorization. The separate cleanup runner deletes eligible evidence only when an operator executes it.

Payment records, invoices, accounts, certificates, security records and learning progress need their own purpose-specific policy. Do not apply the optional-analytics cleanup to them. Resolve accounting, dispute handling, account deletion, backup expiry and any legal hold with the owner before defining that schedule.

## Cleanup runner and release operation

[Runner](../src/lib/privacy-retention.ts), [CLI](../scripts/privacy-retention.ts) and [MySQL tests](../tests/integration/privacy-retention.mysql.ts) are implemented. They use an operator-supplied dedicated connection and never load environment files. The default command reports counts and cutoffs only:

```text
npm run privacy:retention
```

After explicit authorization for the target database and operation, the operator can execute:

```text
npm run privacy:retention -- --apply --confirm-policy=privacy-2026-09-13
```

The runner takes a MySQL advisory lock on the dedicated connection and processes at most 20 batches of 500 rows per category per invocation. Each batch commits independently. It deletes expired outbox entries before raw analytics/Web Vitals; it stops before raw cleanup if the outbox backlog remains. It removes only the optional `payments.attributedExposureId` field from old payments, preserving the row, amount, owner, status and enrollment authority. Projectors lock outbox rows before reading them so cleanup cannot race with stale projection. No aggregate table exists: do not introduce stored aggregates without enforcing the approved 13-month policy.

Rows with unknown creation dates are reported for manual review, not assigned an invented age. Returned `remaining` counts and manual-review counts must reach zero before claiming backlog completion. Start with a dry run, inspect counts, then execute bounded passes during the approved operating window. Stop on failure and rerun after investigating; completed batches are idempotent. Deletion cannot be undone by reverting application code.

Recommended release schedule is daily, with repeated bounded passes if a backlog remains. Alert on command failure, lock contention, undated rows or persistent remaining counts. Scheduling, backup expiry, any legal hold, access/deletion request handling, and production dry-run/apply authorization remain release tasks. Do not enable collection or claim retention enforcement until that operational work is complete. No production cleanup or customer-data access occurred in this task.

## Embedded video inventory

A separate daily Railway count-only service configuration is prepared in [deployment/privacy-retention](../deployment/privacy-retention/README.md). It is not activated and cannot be substituted for the web-service configuration. Production apply mode still needs explicit operation approval.

[BunnyPlayer](../src/components/video/BunnyPlayer.tsx) builds Bunny, YouTube and Vimeo iframe URLs and assigns `src` when rendered. `loading="lazy"` is a browser performance hint, not consent enforcement. The current first-party analytics switch does not control those iframe requests.

| Provider supported in code | Current implementation | Follow-up |
| --- | --- | --- |
| Bunny Stream | Direct `iframe.mediadelivery.net` embed; Player.js messages support progress and playback recovery | Inspect the actual library settings and a designated test video. Separate required delivery/progress from optional vendor statistics. |
| YouTube | `www.youtube-nocookie.com/embed/…` (Privacy Enhanced Mode), allowed by the page CSP | Inspect live requests and document the remaining data transfer. This is not a no-data-transfer guarantee. |
| Vimeo | `player.vimeo.com/video/…` with `dnt=1` | Inspect live existing-cookie and security-cookie behavior. |
| Other URL | Falls back to supplied URL | Inventory the allowed hosts before promising coverage of all third-party media. |

Google documents `youtube-nocookie.com` as Privacy Enhanced Mode, limiting personalization; it does not establish that loading the player sends no data. [YouTube embedding documentation](https://support.google.com/youtube/answer/171780?hl=en).

Vimeo documents DNT as preventing new nonessential player cookies, with security-cookie exceptions; previously stored Vimeo cookies can still accompany requests. [Vimeo Player Cookies](https://help.vimeo.com/hc/en-us/articles/26080940921361-Vimeo-Player-Cookies/).

Bunny's general website privacy/cookie statements are insufficient to establish the exact behavior of this site's Stream library. Do not infer a tracker-free player from the vendor's own website policy. [Bunny privacy policy](https://bunny.net/privacy/).

Recommended UX: keep optional first-party statistics independent from access to lessons. If a provider requires a separate external-media choice, explain the provider and data transfer next to a load-video action; do not require analytics acceptance to study. The actual vendor settings, hosting regions, transfers, and whether YouTube/Vimeo are used by published courses remain unverified without an authorized inventory.

For a later network check, use a designated non-customer test video, a clean browser profile, and separate runs before interaction, after refusing analytics, after loading media and after withdrawal. Record host names, purposes and storage lifetimes, not signed URLs, tokens or personal payloads. Provider-mocked E2E proves application behavior only.
