# Email verification for new password registrations

New password registrations now request an email link before choosing a name or password. `POST /api/auth/register` accepts email and a safe callback destination; legacy name/password/role fields are ignored. It returns the same neutral response for new, existing, inactive and mailbox-throttled addresses. Existing members can continue signing in without a verified timestamp. Google registration and already linked Google sign-in retain their existing behavior and linking restrictions.

Pending requests live in `email_registrations`, not `users`. They cannot authenticate, reset a password or own enrollments. The mailbox holder opens a 30-minute link and chooses a fresh password. This deliberately avoids activating a password selected by whoever initiated the request. The confirmation transaction claims the token and inserts a verified student together. An existing email, including a concurrent Google signup, is never updated or linked. No enrollment is granted.

Tokens contain 32 random bytes; only SHA-256 digests are stored. The email carries the bearer token in a URL fragment, which the confirmation form removes from browser history and retains in memory. GET and email scanners do not consume the token. A refresh requires reopening the email link. Confirmation is a rate-limited POST. Replays and expiry are rejected, and a failed transaction restores the claim for retry.

Resends are limited per IP and mailbox (one per minute, three per hour), with a neutral response and a visible resend timer. Resending does not invalidate earlier unexpired links. Failed delivery removes only that request's digest; Resend's resolved error responses are treated as failures and raw provider error payloads are not logged. Expired requests for an address are removed on a subsequent request for that address. A scheduled global expiry cleanup is not included; historical pending rows may remain until that cleanup or another request for the same address.

## Migration and release

`0021_slow_reavers.sql` adds only `email_registrations` and its email/expiry indexes. It does not backfill or modify existing users, sessions, passwords or OAuth links. Migration was generated with a config that does not load local environment files, reviewed, and applied only to a dedicated loopback MySQL test database.

Deploy the additive migration before or with the new application. Railway startup migrations must complete before serving the new registration route. Existing registration clients open during the rollout may still show the old form; their supplied password will not be stored, and the verification email explains the new next step. Do not reuse the old signup HTTP expectation that success means an account has been created.

Before production release, verify real email delivery and that any provider link tracking preserves URL fragments using an owner-controlled test mailbox. Check the new registration flow, resend, duplicate email recovery, existing credentials and linked Google sign-in. No production deployment is part of this implementation.

Code rollback leaves the additive table intact. Older registration code immediately enables passwords again, so rollback reopens unverified signup; it also cannot redeem pending new links. Prefer a reviewed fix when possible. Do not drop the table, revert passwords or change session versions to roll back code.

## Validation

- Unit/component coverage includes email-only signup, no automatic credentials login, confirmation, resend cooldown, malformed/expired/replayed tokens, safe return paths and provider failure handling.
- `npx vitest run --config vitest.mysql.config.ts` checks actual MySQL persistence, two simultaneous redemptions, two different links for one mailbox, a Google-created email collision, transaction rollback, HTTP handlers with real rate limits and legacy credentials. It refuses non-loopback or non-E2E database targets. CI runs it inside the existing isolated MySQL job.
- Full regression and isolated production build are recorded in the implementation handoff. Browser preview checks cover rendering/navigation; live Google/email delivery remains a release check.

Historical mislinked identities and ownership verification for existing members remain separate work. A legacy account is not marked verified merely to preserve access.
