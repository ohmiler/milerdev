# Password storage and policy

Scope: password creation and verification only. This is not a complete ASVS assessment or a NIST conformance certification. No production rollout is authorized by this change.

## New credentials

- All application writers (verified registration, reset, self-change, admin reset, CSV import) and account-creation scripts call `hashNewPassword`.
- Passwords contain 15–128 Unicode code points after NFC normalization. Spaces are preserved. No uppercase, digit or symbol composition rule is imposed. Control characters and unpaired surrogates are rejected.
- A small local whole-password blocklist covers common/service-derived choices. Pwned Passwords checks the broader breached-password corpus using a SHA-1 range query. Only five hexadecimal characters are sent; no email, password or full digest is sent. Responses are padded, not cached by the application, and never logged.
- Screening is mandatory before hashing/writing. Provider errors, malformed responses or a five-second timeout produce a retryable 503 for individual password-setting routes. A breached password produces 400. Registration/reset links remain usable until their original expiry. CSV import reports failed rows, preserving its partial-success contract; rejected rows can be retried without replacing existing users. Existing login does not call the screening provider.
- Argon2id uses 19 MiB memory, two iterations, one lane, a 32-byte hash and a library-generated random salt. The entire normalized password participates in hashing. Existing `varchar(255)` storage fits the PHC string; no schema migration or Workbench SQL is needed.
- CSV quoting is parsed without trimming passwords or deleting quotes. Malformed quoting is rejected. Other fields retain their normal trimming behavior.

## Existing accounts and sessions

Bcrypt remains a read-only compatibility format. Login/current-password verification uses the historical raw string, with no new minimum length or NFC transformation imposed on legacy accounts. It does not rehash on login or write a new session version after verification.

**Residual legacy limitation:** bcrypt hashes prove at most 72 UTF-8 bytes. An existing digest cannot reveal whether the original password had a longer suffix, and two suffixes after the same 72-byte prefix can still authenticate against that digest. This change does not retroactively repair historical hashes. The owner must explicitly change/reset the password to replace the verifier with Argon2id. Do not claim all existing credentials now have full-length verification. Do not silently migrate an ambiguous login attempt into a new full-length credential.

Self-change retains its old-password-hash compare-and-swap. Reset retains token equality, active-account and expiry checks immediately before updating. Password replacement clears reset material and increments `sessionVersion`; registration retains its transactional one-use token claim. These controls must be preserved by future changes.

## Operator scripts

Reusable demo passwords have been removed. Account-creation scripts require owner-provided environment values: `INITIAL_ADMIN_PASSWORD`, `INITIAL_USER_PASSWORD`, or (for seed roles) `INITIAL_INSTRUCTOR_PASSWORD` and `INITIAL_STUDENT_PASSWORD`. They use the same policy, breach screening and hashing as the application. Smoke fixture scripts retain their existing owner-provided password names and target guards. Never place real passwords in commands, logs or committed files. No script is run against an owner database as part of this work.

## Deployment and recovery

1. Require passing unit, MySQL integration, browser journey, type, lint and build checks on the feature PR. Linux CI must exercise the native Argon2 module. Test providers are mocked in isolated test configurations, not through an application bypass.
2. Before an approved rollout, confirm the runtime permits outbound HTTPS to `api.pwnedpasswords.com`. Its outage blocks setting new credentials but leaves existing login and Google login available. Keep the safe retry message; do not fail open or disable screening in production to conceal an outage.
3. After a separately approved deployment, test registration, legacy password login, Google login, password change/reset and fresh sign-in with owner-controlled accounts. Observe request status and safe error events; never inspect/log submitted passwords or bearer links.
4. **Rollback must retain dual-format verification.** Once any Argon2id password has been stored, rolling back to a bcrypt-only release prevents that user from authenticating with a password. Prefer a forward fix or a rollback patch retaining `verifyPassword` and its native dependency. Never downgrade hashes or restore an old user table to recover application code.
5. Credential migration completion and administrator MFA are follow-up work. Completing this patch alone does not establish whole-system ASVS Level 2 compliance.

## Primary references

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): Argon2id minimum configuration and bcrypt's 72-byte limit.
- [NIST SP 800-63B-4, authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/): single-factor password length, Unicode handling, blocklists and avoiding composition rules/truncation.
- [Pwned Passwords API](https://haveibeenpwned.com/API/v3#PwnedPasswords): range queries and response padding.
- [node-argon2](https://github.com/ranisalt/node-argon2): native runtime support and hash/verification API.

These references inform the scoped controls above; neither this document nor passing tests certifies the entire application.
