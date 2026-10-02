# Administrator MFA scope (draft)

Date: 2026-09-13. Planning only; no implementation, migration or production operation is authorized by this document.

## Starting point

The local password-security handoff reports PR #90 deployed and owner manual checks passed. This session has not independently reverified that deployment. Preserve the existing password, email verification and Google account-linking controls; do not repeat a system-wide audit.

Current code uses Credentials and Google with JWT sessions (seven-day maximum). `src/lib/auth/session.ts` reloads role, deactivation and `sessionVersion` from the database and rejects stale sessions. `src/lib/auth/helpers.ts` and `src/app/admin/layout.tsx` check admin role but have no MFA proof. These are starting points, not an exhaustive inventory of privileged entry points.

## Proposed first release

- Require application-level MFA for every `admin`, including Google sign-ins. Do not assume Google login proves a second factor. Student and instructor MFA is outside this increment.
- Candidate baseline: authenticator-app TOTP plus single-use recovery codes. TOTP is susceptible to phishing; choose WebAuthn/passkeys instead if phishing resistance is a release requirement. Factor choice remains a product decision.
- Model first-factor authenticated, enrollment pending, challenge pending and MFA verified separately. Before verification, permit only the necessary enrollment/challenge/recovery, logout and ordinary member operations; deny every privileged operation.
- Inventory admin-authorized pages, API routes, server actions and role-based exceptions during implementation, including those outside `/admin` and `/api/admin`. Enforce a shared server-side policy at each boundary; redirects and client checks alone are insufficient.

## Enrollment and verification

Require fresh primary authentication to begin enrollment. Store pending enrollment with expiry and activate only after proof of the factor. Initial enrollment for existing admins needs an owner-controlled bootstrap process so a stolen old session cannot register an attacker's factor.

Bind successful verification to the specific session, account and credential/factor version. Never accept an MFA flag from a client session update. Define proof expiry independently of the seven-day login session, and require fresh verification for factor replacement and recovery-code regeneration. Existing sessions and newly promoted admins must not inherit MFA proof.

For TOTP, encrypt secrets server-side with a separately managed key; never expose them beyond the enrollment display or log QR payloads. Define the time window and atomically prevent reuse of an accepted time step, including concurrent requests. Use shared rate limits for challenges and recovery, bounded attempts, expiry, CSRF protection and safe audit events. Storage/provider failures must deny privileged access.

## Recovery and lockout prevention

Generate high-entropy recovery codes, show them once and store only verifiers. Consume codes atomically. Password reset and Google sign-in must not clear or bypass MFA. Factor replacement must revoke old proofs and recovery material and invalidate affected sessions using the existing version mechanism or an explicitly designed equivalent.

Before enforcement, verify that the owner has enrolled and retained recovery material. Rehearse lost-device recovery and the last-admin scenario in an isolated environment. Define an owner-controlled, audited emergency recovery procedure before rollout; no public email-only reset or universal bypass. Decide whether recovery grants a short restricted reenrollment session or normal access before implementation.

## Delivery and acceptance

1. Resolve factor choice, proof lifetime, bootstrap authorization and last-admin recovery. Confirm the intended admin population with the owner without accessing production records.
2. Design additive schema/migration, secret-key lifecycle and session proof issuance. Read the installed Next.js guides before application changes. Review compatibility with rollback; do not roll back into silently unprotected admin access.
3. Implement enrollment, challenge, recovery and all privileged guards together. An enrollment-only release must not be described as MFA enforcement.
4. Verify password and Google paths; old sessions; promotion/demotion/deactivation; password reset; forged client claims; OTP replay; concurrent recovery; expiry/rate limits; database failures; direct API access; and last-admin recovery. Run affected tests, MySQL concurrency checks, browser journeys, lint and build with integrations mocked.
5. Prepare a concrete migration-sensitive rollout and recovery plan. Production rollout requires separate explicit authorization.

## Local artifacts

`output/hardening/password-security/` contains untracked handoff notes, logs, helper scripts and a recovery patch. It is working evidence, not the canonical specification. The handoff reports completed deployment; the tracked [password-security guide](password-security.md) records implemented controls, and PR #90 carries delivery history. Preserve the local evidence until useful unique content is archived. Do not commit the whole directory or execute the recovery patch as routine MFA work.

Keep durable scope and operator guidance under `docs/security/`; publish agreed implementation work to GitHub Issues when requested. Ignoring `/output/` is an optional workspace cleanup, not required for MFA, and is not done by this draft.

## Reference

[OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html) supports requiring MFA for privileged users and designing secure enrollment, factor replacement and recovery. The session architecture and release boundaries above are project-specific proposals, not a compliance claim.
