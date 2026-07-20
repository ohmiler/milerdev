---
solodeveling_schema: 1
---

# AUTH-001 - Account access and recovery journey

- Status: done
- Level: Critical
- Authority: User authorized continuing the consistency roadmap after committing SUPPORT-001 on 2026-07-21.
- Goal: Make login, registration, forgot-password, and reset-password one trustworthy MilerDev account journey while preserving identity, session, anti-enumeration, recovery-token, rate-limit, and provider behavior.
- Users: Returning learners, new learners, Google-authenticated learners, and users recovering credential access.
- Recovery: Revert only the four route presentations, extracted client form components, scoped auth styles, focused UI contract tests, and this work/evidence pair. No API, Auth.js configuration, database, token, provider, rate-limit, session, or migration rollback is authorized or expected.

## Confirmed facts

- Login uses Auth.js credentials with generic invalid-credential feedback, maps known query-string auth errors, and redirects successful credentials or Google sign-in to `/dashboard`.
- Register validates name/email/password client-side, POSTs JSON to `/api/auth/register`, then attempts credential sign-in; the API intentionally returns a generic 200 for existing email to resist account enumeration and always assigns `student` to new accounts.
- Forgot password POSTs JSON to `/api/auth/reset-password`; the API returns a generic response for missing/existing accounts, rate-limits by IP, hashes reset tokens at rest, suppresses duplicate fresh requests, and clears a token when email delivery fails.
- Reset password reads `token`, POSTs `{ token, newPassword }` to `/api/auth/reset-password/confirm`, and exposes missing-token, invalid/expired, loading, error, and success recovery paths.
- Login/Register already use the established paper/ink/cyan account grammar but own it through global selectors and route-wide client boundaries. Forgot/Reset use unrelated inline rounded-card presentation.
- Metadata for all four routes is server-owned in layouts with `robots: { index: false, follow: false }`.

## Direction

MilerDev Account Gateway is a calm Thai identity checkpoint for learners entering or recovering their learning path, organized as a stable transactional task flow with paper/ink/cyan brand expression and access, password-strength, delivery, and recovery states carrying the evidence.

- Direction source: Brand-derived from the converging Login/Register implementation and the completed public-journey grammar; no new visual thesis is introduced.
- Preserve: Thai copy, fields, constraints, autocomplete intent, show/hide controls, query error mapping, Google sign-in, redirects, API endpoints/methods/payloads, generic responses, loading locks, retry/recovery links, metadata, Navbar/Footer, and all backend identity controls.
- Evolve: Four route-wide client pages into server shells with narrowly scoped form/state islands; consolidate repeated auth anatomy and icons; replace inline Forgot/Reset presentation and superseded auth globals with one scoped responsive workflow system.
- Grid: Quiet behind credential entry, visible only where it clarifies learning continuity, password requirements, delivery status, and recovery sequence.

## Scope

- `/login`: preserve credentials and Google flows, error-code mapping, password visibility, disabled/loading behavior, registration/recovery links, privacy copy, metadata, and dashboard redirect; move state/handlers to a client form island.
- `/register`: preserve all fields, limits, password checks/strength/match feedback, endpoint/payload, generic-response behavior, auto-login/fallback redirect, Google flow, privacy copy, metadata, and loading/error states; move state/handlers to a client form island.
- `/forgot-password`: preserve endpoint/payload, generic success wording, email echo, loading/error/success/retry/back flows, metadata, and native email validation; move state/handlers to a client island.
- `/reset-password`: preserve token transport, endpoint/payload, password/match constraints, missing-token, invalid/expired, loading/error/success/back/re-request flows, Suspense-safe route behavior, and metadata; move state/handlers to a client island without logging or displaying the token.
- Add scoped shared auth presentation and behavior-oriented UI/source coverage; remove only superseded auth global CSS after all consumers move.

## Out of scope

- Auth.js configuration, credentials authorization, Google linking/profile trust, JWT/session lifetime or refresh, roles, route protection, database/schema, token generation/hash/expiry/storage, email delivery, rate-limit implementation, API validation/status/messages, password policy changes, account verification, MFA, CAPTCHA, OAuth provider availability, redirect policy, environment files, production checks, Navbar/Footer, settings/change-password, admin reset, deployment, or dependencies.

## Acceptance criteria

1. Login preserves both sign-in methods, generic credential failure, known query error mapping, loading lock, password visibility semantics, `/dashboard` redirect, recovery/register/privacy links, metadata, and non-indexing.
2. Register preserves every field/limit/autocomplete, password policy and strength/match feedback, `/api/auth/register` POST/JSON payload, anti-enumeration-compatible generic flow, auto-login/fallback redirects, Google flow, loading/error states, metadata, and non-indexing.
3. Forgot password preserves `/api/auth/reset-password` POST/JSON payload, native email validation, loading/error/generic-success states, retry reset, email echo, login recovery link, metadata, and non-indexing without introducing account enumeration.
4. Reset password preserves query token transport, `/api/auth/reset-password/confirm` POST/JSON payload, password/match validation, missing/invalid/expired/loading/error/success states, recovery targets, metadata, and non-indexing without exposing the token in copy, logs, or evidence.
5. All four routes use one responsive transactional paper/ink/cyan grammar with scoped ownership, readable Thai measure, square task controls, explicit state changes, visible focus, touch targets, reduced motion, forced-color resilience, and recomposition at narrow/tablet/wide widths.
6. Page shells remain Server Components; only forms/query-driven interaction are client islands with serializable props. Navbar/Footer, metadata, API handlers, Auth.js/session/provider code, proxy, schema, and environment remain unchanged.
7. Focused UI/source contracts and existing auth/proxy tests pass alongside affected lint, full Vitest, production build, UTF-8/selector scans, rendered 390/768/1280/1600 observations, keyboard/input/state exercises, diff integrity, memory validation, and worktree scope review.
8. Security reconciliation confirms no drift in anti-enumeration, token confidentiality, password handling, rate limits, role assignment, session/provider behavior, redirects, safe errors, or recovery behavior; any unexecuted provider/email/production check is reported as unverified rather than inferred.

## Alternatives and decision

- Recommended and selected: Treat all four routes as one account workflow, reuse the existing Login/Register thesis, extract client islands, and unify scoped presentation while freezing backend contracts. This resolves both visible inconsistency and route-wide client ownership without expanding identity behavior.
- Smallest credible option: Restyle only Forgot/Reset. Lower change volume, but leaves duplicated inline/global ownership and inconsistent component/state semantics across one security-sensitive journey.
- Do nothing: Avoid immediate change risk, but preserves the most visible remaining public inconsistency and makes future auth maintenance depend on two unrelated presentation systems.

## Attack-surface matrix

| Boundary | Risk | Control | Verification | Recovery |
| --- | --- | --- | --- | --- |
| Browser -> Auth.js credentials/Google | Request, error, or redirect drift could weaken recovery or expose identity detail | Preserve `signIn` provider/options, generic messages, callback target, query mapping, autocomplete, and loading locks exactly | Focused source/component tests; mocked browser credentials/Google invocation and error states; existing auth/proxy regression tests | Revert client islands and route shells; no Auth.js/provider edit |
| Browser -> register API | Payload/policy drift or duplicate-email handling could enable enumeration or unintended access | Preserve endpoint/method/header/body, client policy parity, generic 200 handling, auto-login and fallback redirects | Source contract tests; mocked success/error/browser validation; existing API anti-enumeration/rate-limit/role tests | Revert Register presentation/island; API remains unchanged |
| Browser -> reset request API | UI wording or branching could disclose whether an account exists; retries could change delivery behavior | Preserve generic success branch and endpoint/payload; do not branch on returned identity facts | Source/component tests; mocked existing-neutral success/error/retry; existing reset anti-enumeration and duplicate-token tests | Revert Forgot presentation/island; token/email code remains unchanged |
| Reset URL -> confirmation API | Token may leak or be altered; password validation or invalid/expired recovery may drift | Pass the opaque token only in the existing JSON body; never render/log it; preserve validation, errors, and recovery targets | Source contract and UI tests for missing/opaque token, mismatch, invalid/expired, success; existing hash/expiry/rate-limit tests | Revert Reset presentation/island; stored token/password data remains governed by unchanged API |
| Client/server component boundary | Moving pages may accidentally serialize secrets or browser-only behavior incorrectly | Read query values only inside Suspense-contained client islands and keep metadata/shell content server-owned; never pass or render reset tokens through the shared shell | Build/typecheck; source inspection for client directives and serializable props; rendered flow checks | Revert extraction to prior route-wide client pages |
| Repository/worktree | Dirty tooling/artifacts could enter a security-sensitive commit | Stage only enumerated AUTH-001 product, test, and memory files; do not read env files | `git diff --check`, staged name review, `git status --short`, secret-pattern review limited to changed diff | Unstage incorrect files before commit; preserve user changes |

## Planning questions resolved

- Visual thesis is brand-derived and stable; use the existing Login/Register account-gateway direction rather than offering a new competing thesis.
- Backend identity behavior is frozen. Any observed backend concern becomes a separate finding/work item and is not repaired under this presentation authorization.
- Provider and email delivery checks use mocks locally; real credentials and production delivery remain owner-controlled and out of scope.

## Implementation plan

1. Establish the shared account workflow shell and scoped CSS module under `src/components/auth/`, using the existing Login/Register anatomy and semantic global tokens. Add reusable password-visibility and provider mark primitives only where they reduce duplicated interactive semantics. Do not add dependencies or global tokens.
2. Convert `/login` to a Server Component shell and move URL error mapping, credential sign-in, Google sign-in, visibility, loading, error, and redirect behavior into a minimal `LoginForm` client island. Focused-check the rendered field/control contract and exact Auth.js options before continuing.
3. Convert `/register` to a Server Component shell and move validation, strength/match state, API call, auto-login, provider action, errors, and redirects into `RegisterForm`. Keep client validation byte-for-byte equivalent to API requirements and retain the optional special-character strength cue without making it mandatory.
4. Convert `/forgot-password` and `/reset-password` to Server Component shells with `ForgotPasswordForm` and a Suspense-contained `ResetPasswordForm` client island. Preserve static route behavior, opaque query-token handling, generic reset-request success, retry, missing-token, invalid/expired, loading, error, and success recovery states.
5. Add `tests/components/auth-pages.test.tsx` with behavior/source contracts for fields, names, limits, autocomplete, explicit buttons, accessible visibility controls, endpoints/methods/headers/payloads, generic wording, error mapping, redirects, opaque token handling, and server/client boundaries. Do not assert CSS, class names, component structure, decorative copy, or layout.
6. Remove only the superseded Login/Register global CSS block after every auth consumer uses scoped ownership. Scan for orphaned selectors, inline style props, token leakage, mojibake, and any changed auth/API/provider/proxy/schema/environment path.
7. Verify each slice with affected ESLint and focused tests. At checkpoint run existing auth/proxy regressions, full Vitest, full ESLint, production build, diff/secret/scope checks, and rendered keyboard/state/overflow observations at 390, 768, 1280, and 1600 CSS pixels. Mock Auth.js/API/email/provider effects; do not use real accounts, credentials, reset links, or production services.

## Acceptance-to-verification map

| Criteria | Planned evidence |
| --- | --- |
| 1. Login contracts | Static/component render assertions; source assertions for error mapping and exact credential/Google options; mocked browser invalid, query-error, loading, visibility, Google, and successful redirect flows |
| 2. Register contracts | Static/component field and policy assertions; source assertions for request/payload/sign-in/redirects; mocked browser mismatch, weak password, API error, generic success with auto-login success/failure, Google, and loading flows; existing API tests |
| 3. Forgot-password contracts | Static/component email semantics; source request/generic wording assertions; mocked browser native validation, loading, error, neutral success, retry, and login recovery; existing anti-enumeration/duplicate-token/rate-limit tests |
| 4. Reset-password contracts | Static/source assertions for opaque token and payload; mocked browser missing token, mismatch, invalid/expired, loading, error, success, and recovery targets; existing hash/expiry/rate-limit tests; changed-diff token exposure review |
| 5. Shared responsive system | Scoped CSS review plus rendered light/dark/forced-color/reduced-motion checks where supported; keyboard focus and overflow observations at 390/768/1280/1600 |
| 6. Server/client and frozen boundaries | Directive/import/source inspection; production route output; `git diff --name-only` allowlist; unchanged API/Auth.js/proxy/schema/environment paths |
| 7. Project gates | Focused ESLint/tests per slice; `npm.cmd run test -- --run tests/api/auth.test.ts tests/lib/auth-google.test.ts tests/proxy.test.ts tests/components/auth-pages.test.tsx`; full lint/tests/build; UTF-8/selectors; `git diff --check`; memory validation |
| 8. Security reconciliation | Update this attack-surface matrix and cumulative evidence with observed controls, unverified provider/email/production limits, recovery, and changed-diff review before `done` |

## Execution checkpoints

- Checkpoint A — shared shell plus Login: no API/Auth.js/provider edits; login focused contracts and lint pass.
- Checkpoint B — Register: request, policy, generic-response, auto-login, provider, and redirect contracts pass before recovery work.
- Checkpoint C — Forgot/Reset: neutral recovery wording, opaque token transport, missing/invalid/success recovery, and focused auth API regressions pass.
- Checkpoint D — scoped-style cleanup and broad verification: no global auth selectors or inline page styles remain; all acceptance and security evidence reconciles before completion.

## Dependencies, limits, and next executable action

- Uses installed Next.js 16.1.4, React 19.2.3, Auth.js beta 30, Vitest 2.1.8, and project Playwright 1.58.2; no dependency change is planned.
- Real Google login, SMTP delivery, production rate limiting, existing-account behavior, and real reset links require owner-controlled credentials/data and remain unverified in local execution.
- No migration, deployment, destructive action, or production mutation exists in this plan. Recovery remains a source revert of the isolated presentation/client-boundary change.
- Next action: implement Checkpoint A with one primary agent, then run its focused lint and auth UI contract tests.

## Completion

- Unified Login, Register, Forgot Password, and Reset Password under one scoped account workflow while preserving metadata, fields, Thai validation, provider options, redirects, neutral recovery wording, and API request contracts.
- Converted all four pages to Server Component shells and limited client code to four form/query islands; Login and Reset query hooks remain inside Suspense so all routes stay static.
- Preserved the frozen security boundary: no Auth.js, Google trust/linking, API, token, rate-limit, role, session, proxy, schema, environment, dependency, or production behavior changed.
- Added eight focused UI/source contract tests across three files. Final lint, 236-test suite, production build, UTF-8/selector/inline-style scans, frozen-path review, rendered state exercises, dark inspection, and 16 viewport overflow checks passed.
- Real Google sign-in, SMTP delivery, real reset links, persisted password mutation, production rate limiting, and production monitoring remain explicitly unverified owner-controlled checks.
