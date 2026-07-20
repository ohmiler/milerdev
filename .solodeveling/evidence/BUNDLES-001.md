---
solodeveling_schema: 1
---

# Evidence - BUNDLES-001

## Current acceptance matrix

| Criterion | Method | Result | Limitation |
| --- | --- | --- | --- |
| 1. Coherent responsive bundle facts and course sequence | Static inspection of the server component and scoped CSS; production build | Passed at source/build level. Title, description, course order, lessons, prices, savings, and existing benefits remain data-driven in the dossier and purchase rail. | Rendered 390/768/1280/1600 viewport observation is unverified because no browser backend is connected. |
| 2. Preserve free, paid, enrolled, auth, Stripe, PromptPay/slip, loading, success, and error boundaries | Focused component contract; `tests/api/payment.test.ts`; diff inspection | Passed. Endpoints, POST bodies, FormData names, callback URL, Stripe redirect, handlers, and server-owned commerce routes remain unchanged in behavior. Payment API suite passed 31/31. | Real provider checkout and production credentials are outside scope. |
| 3. Accessible and recoverable payment dialogs | DialogShell source inspection; shared feedback tests; focused Bundle tests; lint/build | Passed at component-contract/source level. Dialogs are named/described, buttons are explicit, focus is trapped/restored by the shared shell, Escape/backdrop closes only through guarded callbacks, and verifying disables dismissal/actions. | Real keyboard order, focus visibility, and assistive-technology observation are unverified without a browser backend. |
| 4. Preserve slip constraints and safe public bank data | Exported payment contract test; source/diff inspection; payment API regressions | Passed. JPEG/JPG/PNG/WEBP and 5 MB constraints, preview/remove/error states, existing `NEXT_PUBLIC_*` references, and server-side verification boundary are preserved. | SlipOK is mocked at code/test level; no production slip was uploaded. |
| 5. Focused and broad gates | Commands below | Passed: focused 8/8, payment 31/31, full Vitest 222/222, full ESLint, production build, and diff integrity. | Existing expected stderr from failure-path mocks and a pre-existing React warning remained non-failing. |
| 6. Scope integrity | `git diff --check`, `git status --short`, targeted diff/name inspection | Passed for BUNDLES-001. No API, schema, provider, env, global CSS, payment-success, or E2E file was modified by this item; unrelated dirty work remains preserved. | The overall worktree remains intentionally dirty from prior/user work. |

## Commands and observed results

- `npm.cmd test -- --run tests/components/bundle-enroll-button.test.tsx tests/components/feedback-primitives.test.tsx` — 2 files, 8 tests passed.
- `npm.cmd test -- --run tests/api/payment.test.ts` — 1 file, 31 tests passed, including bundle checkout/enrollment and webhook failure/idempotency boundaries.
- `npm.cmd run lint -- src/app/bundles/[slug]/page.tsx src/components/bundle/BundleEnrollButton.tsx src/components/ui/DialogShell.tsx tests/components/bundle-enroll-button.test.tsx tests/components/feedback-primitives.test.tsx` — passed after removing one unnecessary suppression.
- `npm.cmd run lint` — passed.
- `npm.cmd test -- --run` — 15 files, 222 tests passed.
- `npm.cmd run build` — passed TypeScript and generated 90 routes; `/bundles/[slug]` remains dynamic.
- `git diff --check` — passed; line-ending warnings only.
- UTF-8 inspection — bundle page, bundle component, and focused test contain Thai text with no replacement characters or mojibake markers.

## Security and recovery

- Server-side authorization, price lookup, payment verification, idempotency, entitlement creation, and provider integrations were not edited.
- The browser still sends the legacy `amount` FormData field for compatibility, while the untouched slip route derives the authoritative amount from the published bundle record.
- Dismissal is locked during slip verification; all other cancellation paths are reversible and clear the selected slip state where the prior flow did.
- Recovery is presentation-only: revert the two bundle modules/components, focused tests, and additive DialogShell content/size support. No data or migration rollback is required.

## Accepted environment gap

The code/build checkpoint is complete, but rendered viewport, theme, actual focus order, Escape/Tab behavior, and visual comparison remain unverified until an in-app browser backend is available. No visual or usability claim is made beyond static responsive rules and compiled output.
