---
solodeveling_schema: 1
id: AUTH-DATA-003
status: done
level: Critical
authority: User authorized continued backend work on 2026-07-23.
---

# Enforce OAuth provider identity uniqueness and repair fresh migrations

## Goal and scope

Make each Auth.js provider identity map to at most one local account row and ensure a
fresh migration history creates the `accounts` table before enforcing that identity
key. Preserve the existing verified-Google-email linking policy. Cover schema,
migration, aggregate duplicate preflight, and focused tests. Production data access,
automatic deduplication, account reassignment, deployment, distributed rate limiting,
and unrelated schema cleanup are out of scope.

## Acceptance

- AC1: `accounts(provider, providerAccountId)` is a named composite unique index that
  matches Auth.js `getUserByAccount`, `getAccount`, `unlinkAccount`, and default-table
  identity semantics.
- AC2: The next migration safely creates `accounts` when missing for fresh histories,
  preserves existing rows when the table already exists, and adds only the composite
  unique index. It contains no delete, update, reassignment, drop, or rename.
- AC3: A redacted preflight reports only the number of duplicate provider-identity
  groups and exits nonzero when manual resolution is required. Expected migration
  failures retain at most a validated database error code; neither path prints
  provider account IDs, user IDs, tokens, SQL values, or stack traces.
- AC4: Existing duplicate data fails closed rather than being modified. Fresh-schema
  and representative existing-schema rehearsals prove the migration when a disposable
  MySQL target is available; unavailable infrastructure remains explicitly unverified
  and blocks `done` unless the owner accepts the gap.
- AC5: Focused schema/preflight/auth regressions, migration inspection, applicable
  full tests, lint, build, diff integrity, and status review provide evidence.

## Boundary record

| ID | Boundary | Authority | Invariant | Failure | Risk / Control | Verification | Recovery |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OAUTH-IDENTITY | OAuth provider callback to `accounts` row | Auth.js adapter after verified provider callback | One provider + providerAccountId maps to at most one row | Concurrent link, legacy duplicate, missing table on fresh install | DB composite unique index; create-if-missing repair; aggregate preflight; no automatic data rewrite | Schema contract, SQL safety, adapter regression, fresh/existing rehearsal | Before release revert files; after apply resolve duplicates before retry or drop only the new index under release authority |

## Decisions and recovery

The adapter source installed in this repository uses provider and providerAccountId
as its lookup/delete key and defines the same pair as the default composite primary
key. The custom table keeps its existing surrogate ID for compatibility and adds a
named composite unique index. Migration history first gains a create-if-missing table
repair because `0002_snapshot.json` contains accounts while `0002` SQL does not.
Existing rows are never merged or deleted automatically. A duplicate preflight or
unique-index failure requires owner-reviewed data repair in a separate authorized
workflow. The migration runner emits only a generic failure plus a strictly validated
database error code because MySQL duplicate errors include the conflicting identity
value. No migration is applied to production in this work item.

## Next action

Plan the next bounded backend item. Recommended follow-up is distributed auth rate
limiting after selecting an operationally supported shared store; production OAuth
preflight, migration, and smoke checks remain a separately authorized release activity.
