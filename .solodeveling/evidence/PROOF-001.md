---
solodeveling_schema: 1
---

# Evidence: PROOF-001

- Status: complete
- Work: `.solodeveling/work/archive/PROOF-001.md`

## Current acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| AC1 | Pass | Static render tests exercise the shared `TransactionReceipt`; source inspection confirms both course and bundle routes provide product, amount, order, access, support, and actions. |
| AC2 | Pass | Focused render test confirms the learning link exists only for `accessReady`; pending renders a named refresh button and no `/learn` link. Mobile browser inspection confirmed the recovery panel precedes the long receipt. |
| AC3 | Pass | Source-invariant regression covers Stripe retrieval, paid status, metadata mismatch checks, pending-only payment update, and `safeInsertEnrollment`. Payment/auth regression passed 62 tests; full suite passed with one worker. No API/payment helper/schema files changed. |
| AC4 | Pass | Bundle render test confirms ordered real course links. Route source uses `payment?.amount ?? bundle.price`. |
| AC5 | Pass | Certificate render test and browser states confirm explicit valid/revoked wording, symbol, `data-certificate-status`, watermark, recipient, course, dates, issuer, and code. |
| AC6 | Pass | Source/render inspection confirms custom theme CSS variables, header image conversion, PNG action, clipboard action, course link, disabled/loading state, and inline success/error feedback. Clipboard success feedback was exercised locally. |
| AC7 | Pass | Production build compiled TypeScript and generated 90 static pages. Routes await params, export metadata, keep receipt server-compatible, and isolate refresh/download/share behavior in client components. |
| AC8 | Pass | Local Playwright inspection at 360, 768, and 1280 CSS px found no horizontal document overflow. Ready bundle, pending receipt, valid certificate, and revoked certificate states were rendered; the pending recovery order was corrected and rechecked at 360 px. |
| AC9 | Pass with recorded limitation | Focused/regression tests, 251-test full suite, lint, production build, `git diff --check`, scope audit, and mojibake scan passed. Visual checks used an explicitly sample local preview route that was removed afterward. |

## Commands and observed results

- `npx vitest run tests/components/transaction-proof.test.tsx tests/api/payment.test.ts tests/api/auth.test.ts`: 3 files, 66 tests passed.
- `npm test -- --run --maxWorkers=1 --minWorkers=1`: 23 files, 251 tests passed.
- The default parallel full-suite invocation timed out on the first expensive test in three API files; each passed in focused runs and the complete worker-limited rerun. This is recorded as runner resource contention, not a product assertion failure.
- `npm run lint`: passed with no reported errors or warnings.
- `npm run build`: passed; Next.js 16.1.4 compiled, typechecked, and generated 90 static pages.
- `git diff --check`: passed before memory closure.
- Scope audit: no changed file under `src/app/api`, `src/lib/db/schema.ts`, `src/lib/stripe.ts`, or `src/lib/db/safe-insert.ts`.
- UTF-8/mojibake scan across changed product and memory files returned no matches.
- The only remaining inline style in the redesigned proof surface sets certificate theme CSS custom properties dynamically; layout and state styling live in the shared CSS module.

## Visual and interaction evidence

- 1280 × 900: ready bundle receipt showed one dominant completion heading, transaction evidence, access-ready status, included course links, and next action without overflow.
- 360 × 900: pending receipt showed verification status and refresh/dashboard recovery before receipt detail, with no learning link and no overflow.
- 768 × 1000: valid certificate showed verification status and the full document without overflow.
- 360 × 900: revoked certificate showed a text-and-symbol revoked state, watermark, download/share/course actions, and no overflow.
- Clipboard action produced the inline message `คัดลอกลิงก์ตรวจสอบใบรับรองแล้ว`.

## Limitations and remaining release evidence

- No real authenticated paid learner, live Stripe return session, production payment, or known issued certificate was used.
- Visual checks used sample data through a temporary local-only route; that route was removed before closure.
- Provider-backed download behavior with every possible remote custom header image remains target-environment smoke evidence. Existing same-origin/proxy conversion and inline failure recovery were preserved.
- Automated and local visual evidence do not constitute a general accessibility or usability claim.
