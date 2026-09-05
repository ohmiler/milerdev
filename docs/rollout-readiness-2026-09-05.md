# User journey rollout readiness — 2026-09-05

Scope: GitHub #25, final contract/qualification #54. This report covers application readiness; it does not authorize or claim a production measurement baseline.

## Delivered boundaries

| Slice | PR | Authority and consumer outcome |
| --- | --- | --- |
| Order review #49 | #79 | Shared authoritative quote and payment-method dialog; verified payment remains required for access. |
| Exact payment recovery #50 | #80 | Owner-scoped immutable attempt records, Stripe return replay and exact PromptPay resumption; payment and enrollment facts remain separate. |
| Learner account #51 | #81 | Server guards before private rendering, minimal profile fields, saved/dirty/error states, certificate name snapshot explanation, shared password policy and fresh login after session invalidation. |
| Certificates #52 | #82 | Canonical active/revoked/missing collection, explicit idempotent repair, privacy-minimized public verification, status-aware noindex metadata and verifiable PNG/share recovery. |
| Learning #53 | #83 | Minimal authorized lesson projection, trusted playback resume, persistent completion recovery, Thai search with 20-item pagination and mobile focus/locked navigation. |
| Contract #54 | This change | Remove duplicated course/bundle price interpretation and use canonical formatting without losing satang; final deterministic verification and remaining operational gates. |

## Contract audit

- Dashboard derives next learning action and separate progress/completion/certificate facts from the learning presentation boundary. Payments/history/returns use exact owner records and PaymentPresentation instead of local status maps.
- The active-only certificate compatibility payload is removed after migrating its only user-facing consumer. Public verification does not select user IDs, course IDs or internal revocation notes.
- Profile no longer serializes a full user row to its client form. Settings reads a password-existence boolean and keeps credential verification on the server.
- Course price copy and bundle free/paid branching consume shared decision facts. Acquisition and progress APIs still revalidate on the server.
- The learning shell uses one curriculum implementation in its desktop rail and mobile modal. These intentional responsive instances are not legacy shells; browser assertions scope to visible landmarks because Next.js can retain inactive route DOM.
- Required E2E contains no skip/fixme/only escape hatches. Provider network guards remain enabled. Synthetic fixture helpers verify the isolated database identity and test-owner email namespace before writes.

## Deterministic verification

Final full-suite and latest-head CI evidence will be recorded after dependency reconciliation. Existing checked suites cover owner isolation, immutable historical amounts, payment replay, certificate repair/revocation, private route returns, fresh login, search boundaries, trusted player messages and progress recovery.

Required browser coverage includes course/bundle checkout and exact recovery, account registration/profile/password, certificate active/revoked/not-found and actual PNG download, content-only and empty lessons, trusted video resume/failure retry, persisted progress failure recovery, review mode, mobile Sheet/locked-dialog focus, Thai layouts and reduced-motion preference.

Accessibility evidence is bounded to automated behavior, semantic landmarks, keyboard/focus, responsive overflow and export readability contracts. It does not constitute a comprehensive WCAG audit or assistive-technology certification. Manual screen-reader and visual inspection across all production content remains untested.

## Measurement qualification and explicit blockers

| Gate | Deterministic evidence | Production status |
| --- | --- | --- |
| Purchase reconciliation | measurement-qualification and purchase/enrollment projector tests check missing/duplicate/unknown identities, replay and committed transition dates. | Not observed against production records; no production queries were run. |
| Attribution | Tests separate correlated exposure conversion from unattributed operational trends and reject mismatched identities. | No conversion or uplift claim; real exposure/payment correlation requires an approved qualification window. |
| Privacy and retention | Strict metadata tests, governance rejection, approved retention cutoff/batch validation and controlled deletion tests. | Owner must record purpose, lawful basis/consent policy, notice, allowed classes, retention, access and deletion decisions. No policy approval is inferred from permission to merge code. |
| Kill switch | Tests cover disabled defaults, event-class governance, auditing, cache invalidation and readback. | Production switch/configuration was not inspected or changed. |
| Learner cohort | Tests check matured observation windows and deduplication by enrollment. | No mature production cohort observed. |
| Web Vitals | Tests validate metric identity, privacy, release identity, p75/device series and sample-floor rejection. | Field samples and trusted release attribution are unqualified until an approved observation period exists. |

Production baseline/analytics enablement remains blocked pending explicit owner approval and successful production reconciliation, governance and sample gates. The application can be delivered with these blockers clearly recorded; code tests cannot substitute for field evidence. Do not enable instrumentation, start a baseline, perform retention deletion or access production learner/payment data as part of this rollout.

## Migration, rollback and production risk

- These final consumer slices introduce no schema or Drizzle migrations. Earlier migrations already present on master remain part of normal startup.
- Railway rebuilds/restarts on master merges and runs startup migrations. Public HTTP 200 smoke checks establish availability only, not deployed commit identity or real-provider correctness.
- Rollback should use a reviewed revert PR for the affected slice with passing checks, not history rewriting. Since the legacy certificate payload is removed, rollback its API and consumer together. Shared helper changes in #80 need their regression tests when reverting adjacent payment work.
- No production data was read or changed; no live provider payments, refunds, enrollment grants or certificate repairs were performed. CI used isolated MySQL and mocked Stripe/SlipOK/Bunny/Google/email boundaries.
- Untested external behavior: real provider settlement, webhooks over production infrastructure, browser-native Web Share on physical devices, every long-name/custom certificate theme combination, and real field performance.
- Existing user-owned untracked .agents/, CONTEXT.md, docs/wayfinder/, output/ and skills-lock.json are preserved and excluded from commits.