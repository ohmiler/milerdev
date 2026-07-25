---
solodeveling_schema: 1
---

# BACKEND-LOG-CI-001

- Status: done
- Level: Critical
- Authority: On 2026-07-26 the owner authorized production logging hardening and a blocking Vitest CI gate.
- Goal: Prevent sensitive identifiers and raw provider/error payloads from entering production logs, and prevent tested regressions from merging through CI.
- Out of scope: Database/schema/data changes, production deployment, secrets, Sentry/provider setup, live provider calls, and unrelated logging refactors.
- Recovery: Revert only the scoped source/tests/workflow changes; there is no database or external-state recovery.

## Attack-surface matrix

| ID | Boundary | Authority | Invariant | Failure | Risk / Control | Verification | Recovery |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LOG-ERROR | Server error logging | Server-only call sites | Production logs retain event/type diagnostics without raw messages, stacks, metadata, or identifiers | Provider/library errors contain sensitive values | Environment-aware centralized redaction | Focused unit tests and static sensitive-log scan | Revert helper behavior |
| LOG-EFFECT | Email, certificate, payment webhook, and Bunny operational logs | Existing server effects only | Operational outcome remains unchanged while identifiers and raw response bodies are omitted | Troubleshooting loses correlation detail | Stable event labels and safe status fields only | Focused tests, affected regression, lint/typecheck | Revert scoped call sites |
| CI-TEST | GitHub push/PR workflow | Repository CI | Vitest failures block Build and merge signals | Tests remain commented or run in watch mode | Non-interactive blocking test job | Workflow inspection plus full `vitest run` | Revert workflow job |

## Acceptance

- AC1: Production `logError` output excludes error messages, stacks, metadata, and user identifiers; development retains diagnostic detail.
- AC2: Email addresses/subjects, certificate/user IDs, Stripe event/payment IDs, and Bunny response bodies are absent from the scoped operational logs without changing business effects.
- AC3: Focused tests cover redaction and the CI workflow contains an active blocking non-interactive Vitest job.
- AC4: Focused tests, full Vitest, lint, TypeScript, build, `git diff --check`, and scoped status pass without database/provider access.

## Next action

Completed on 2026-07-26. Scoped production logging redaction, sensitive-call-site contracts, and the blocking non-interactive Vitest CI job passed local verification. GitHub-hosted CI remains pending a separately authorized commit/push.