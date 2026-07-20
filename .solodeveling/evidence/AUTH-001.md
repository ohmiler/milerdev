---
solodeveling_schema: 1
---

# Evidence - AUTH-001

## Current acceptance matrix

| Criterion | Method | Result | Limitation |
| --- | --- | --- | --- |
| 1. Login contracts | Source/contract tests; local query-error, visibility, native-validation, accessibility-snapshot, and build checks | Passed. Credentials and Google options, mapped/generic errors, pending lock, password visibility, dashboard redirect, recovery/register/privacy links, metadata, and non-indexing remain present. | Real or mocked credential success and Google navigation were not exercised in browser; provider/session code and existing regressions were unchanged. |
| 2. Register contracts | Source/contract tests; local strength/mismatch snapshot; existing register API regressions; build | Passed. Fields, limits, autocomplete, manual Thai password policy, strength/match states, POST/JSON payload, generic-response-compatible auto-login/fallback redirects, Google option, pending/error states, metadata, and non-indexing remain present. | Browser did not submit registration because that could create an account or call welcome email; request and redirects were checked statically and API behavior with mocks. |
| 3. Forgot-password contracts | Source/contract tests; mocked local success snapshot; existing reset-request API regressions | Passed. Email validation, POST/JSON payload, pending/error/generic-success, email echo, retry reset, login link, metadata, and neutral anti-enumeration wording remain present. | SMTP delivery and real rate-limit behavior were not called; the browser success response was session-local mocked JSON. |
| 4. Reset-password contracts | Source/contract tests; local missing-token and mocked opaque-token success flows; existing confirm API regressions | Passed. Query token transport, POST/JSON payload, password/match constraints, missing/invalid-expired/error/success recovery, metadata, and non-indexing remain present; the token is not rendered or logged by changed UI code. | The browser used opaque-test-token; real reset links and persisted password mutation were intentionally not exercised. Invalid/expired behavior is covered by API tests plus UI error branching rather than a real token. |
| 5. Shared responsive system | Scoped CSS review; screenshots; accessibility snapshots; 16 overflow observations; dark render | Passed. All four routes share the transactional paper/ink/cyan shell, square controls, explicit states, visible focus rules, touch sizing, reduced-motion and forced-color rules. No horizontal overflow occurred at 390, 768, 1280, or 1600 CSS pixels. | Forced-colors and reduced-motion were inspected in source, not with assistive-technology users. The existing global dark Navbar has low logo contrast and remains outside the authorized Navbar/Footer scope. |
| 6. Server/client and frozen boundaries | Directive/import inspection; focused tests; route build output; path allowlist | Passed. Four page shells are Server Components; only four forms are client islands, Login/Reset query hooks are Suspense-contained, and all four routes remain statically generated. API/Auth.js/provider/proxy/schema/layout/environment/dependency paths are unchanged. | None observed. |
| 7. Project gates | Commands and browser observations below | Passed. Focused auth/security 46/46, final full lint, final full Vitest 236/236, production build, UTF-8/selector/inline-style scans, diff integrity, and scope review passed. | solodeveling-validate is unavailable; memory structure was reviewed manually. Vitest retains known non-failing warnings and expected negative-path logs. |
| 8. Security and recovery reconciliation | Attack-surface review; unchanged-boundary diff; existing auth/Google/proxy tests; mocked browser recovery | Passed within AUTH-001 scope. Anti-enumeration, opaque hashed-token API behavior, password policy, rate limits, role assignment, Auth.js provider/session configuration, redirects, and safe errors did not change. Recovery is a presentation/client-island revert with no data rollback. | Real Google, SMTP, production rate limiting, existing-account registration, real reset token, session creation, and production monitoring remain unverified owner-controlled checks. This is not a categorical security claim. |

## Commands and observed results

- Focused Login lint and UI contracts - passed 2/2 before later loading-lock coverage.
- Focused Register lint and UI/API contracts - passed 33/33 after restoring the original manual-validation order.
- Focused recovery lint plus UI/auth/Google/proxy regressions - passed 46/46.
- npm.cmd run lint - final run passed.
- npm.cmd run test -- --run - final run passed 20 files and 236 tests.
- npm.cmd run build - final source build compiled, type-checked, generated 90 routes, and kept the four account routes static.
- Legacy-selector, inline-style, UTF-8, client-boundary, and frozen-path scans - passed for the affected scope.
- git diff --check - passed; line-ending warnings only.
- solodeveling-validate - unavailable; manual schema/status review used instead.

## Rendered and interaction evidence

- Login snapshots exposed the H1, labeled email/password fields, recovery link, password toggle, submit, Google action, registration link, privacy copy, and learning evidence. The unauthorized query produced the expected Thai alert.
- Login visibility changed its control from “แสดงรหัสผ่าน” to pressed “ซ่อนรหัสผ่าน”. Empty submit focused login-email; invalid IDs were login-email and login-password.
- Register rendered every field, independent visibility controls, strength checklist, provider action, and recovery link. Test1234! produced “แข็งแกร่งมาก”; a different confirmation became invalid and exposed “รหัสผ่านไม่ตรงกัน”.
- Forgot Password used a session-local mocked 200 response. The success region retained neutral “หากอีเมล … มีในระบบ” wording, email echo, retry button, and login recovery link. No email/provider call occurred.
- Reset without a query token exposed the invalid-link region and both recovery targets. With opaque-test-token, a session-local mocked confirm response transitioned matching example passwords to the success region; the network log showed only the mocked confirmation POST.
- Login/Register desktop and Forgot/Reset mobile screenshots were inspected. A 768px dark Login render was also inspected; the auth surface remained legible.
- All four routes had scrollWidth equal to clientWidth at 390x844, 768x1024, 1280x900, and 1600x1000.
- Browser console showed zero errors and only the recurring Next.js development warning. Both Playwright mocks were removed and the isolated browser session was closed.

## Security, privacy, recovery, and residual risk

- No secrets or environment files were read or changed. No real email, account, password, Google provider, reset token, session, role, database, or production service was used.
- The unchanged API suite continues to cover duplicate-email anti-enumeration, normalized email, student-only role assignment, rate limiting, reset-request anti-enumeration, token generation/hash/expiry, duplicate reset suppression, delivery failure cleanup, invalid token, password policy, and confirmation rate limiting.
- Auth.js, Google trust/linking, proxy guards, API handlers, schema, metadata layouts, and dependencies are outside the changed diff.
- Source recovery is bounded to the four page shells, shared auth components/styles, focused tests, globals cleanup, and this work/evidence pair. No database or external-effect rollback is required.
- Release-level Google sign-in, SMTP delivery, real reset link, production distributed rate limiting, and production logs remain owner-controlled and unverified.
