---
solodeveling_schema: 1
---

# Evidence: ACCOUNT-001

- Status: complete
- Work: `.solodeveling/work/archive/ACCOUNT-001.md`

## Current acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| AC1 | Pass | `LearnerAccountShell` supplies one named five-link account index and exactly one current route; focused static-render regression passed. |
| AC2 | Pass | Payments client preserves `/api/payments`, handles non-OK recovery, empty and populated ledgers, summaries, and `completed`, `pending`, `verifying`, `failed`, and `refunded` states. |
| AC3 | Pass | Certificates client preserves `/api/certificates`, handles loading/error/empty/list branches, and awaits clipboard writes with inline success/failure feedback. |
| AC4 | Pass | Profile retains `auth()` plus user/enrollment reads and `PUT /api/profile`; immutable email, submit-disabled, success, and error semantics are covered by source/render checks and existing API auth regressions. |
| AC5 | Pass | Settings retains `auth()` plus password-presence read and `POST /api/auth/change-password`; collapsed, OAuth-only, strength, mismatch, reveal, disabled, success, and error branches remain present. |
| AC6 | Pass with bounded visual scope | Playwright rendered unauthenticated/error states at 360, 768, and 1280 CSS px. Document width equaled viewport at all three widths. Mobile Account index was corrected from horizontal clipping to a visible two-column index. Focus rules, 44px controls, reduced-motion loading, and responsive layouts were inspected in CSS. |
| AC7 | Pass | Build reports Payments/Certificates as static routes and Profile/Settings as dynamic routes; browser APIs exist only in focused client components and route metadata exists on both record pages. |
| AC8 | Pass | Focused regressions, relevant auth regressions, full Vitest, full ESLint, final production build, scoped diff check, API/auth/schema scope audit, and UTF-8/mojibake scan passed. |

## Commands and observed results

- `npx vitest run tests/components/learner-account.test.tsx tests/api/auth.test.ts tests/api/admin-auth.test.ts` — 3 files, 64 tests passed.
- `npm test -- --run` — 22 files, 246 tests passed.
- `npm run lint` — passed with exit code 0.
- Final `npx vitest run tests/components/learner-account.test.tsx` after loading-state alignment — 1 file, 6 tests passed.
- Final focused ESLint for the two loading routes and Account regression — passed with exit code 0.
- Final `npm run build` after all source changes — compiled, TypeScript checked, and 90 static pages generated successfully.
- Playwright local observations:
  - `/dashboard/payments` at 1280x900: shared Account layout rendered; document `scrollWidth` was 1280.
  - `/dashboard/certificates` at 360x900 and 768x900: shared Account layout and explicit 401 recovery state rendered; document `scrollWidth` matched 360 and 768.
  - `/profile` and `/settings` without a session both navigated to `/login`.
- `git diff --check` on Account source, tests, and memory — passed.
- Scoped `rg` scan for inline styles, replacement characters, and common mojibake markers — clean after loading-route alignment.
- `git diff --name-only -- src/app/api src/lib/auth.ts src/lib/db/schema.ts` — no Account changes to API, auth, or schema boundaries.

## Debugging note

- The first focused regression run had 4/5 passing because one test assumed `type` appeared before `class` in rendered button attributes. React rendered the correct submit button; changing the matcher to attribute-order-independent semantics produced 5/5, and the later loading-state extension produced 6/6.

## Limitations and remaining risk

- The local browser has no authenticated learner with populated payments, certificates, or profile data. Populated rows, profile form submission, password success, and clipboard success were verified through static rendering/source contracts, API regressions, lint, and build, but were not exercised end-to-end in a signed-in browser.
- The observed 401 console entry on Certificates is expected from the existing authenticated API when the local browser has no session; the redesigned page surfaces it as a recovery state.
- Existing unrelated worktree changes under `.agents`, `.claude`, `.playwright-cli`, `output`, and LEARNER-001 were preserved and not included in Account scope.
