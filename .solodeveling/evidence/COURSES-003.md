---
solodeveling_schema: 1
---

# COURSES-003 evidence

- Verified: 2026-07-20
- Scope: Course-detail enrollment CTA, payment-method and PromptPay/slip dialogs, coupon/provider controls, course tags, responsive interaction, and payment-boundary regressions.

## Acceptance reconciliation

1. Editorial controls: Paid, free, checking, loading, enrolled, coupon, provider, upload, disabled, error, and action controls use one square-edged scoped system. Primary actions are solid accent, secondary actions are neutral, and no button uses a gradient or decorative shadow.
2. Tags: Course tags remain links to the same /courses?tag=... targets and now read as bordered index labels with hover and focus treatment.
3. Commerce preservation: Component logic, handlers, request URLs and methods, request bodies, effective-price calculation, redirects, upload accept list and 5 MB validation, session decisions, and provider choices were preserved. No server, schema, auth, payment, or fulfillment file changed.
4. Dialog behavior: Both payment dialogs expose named modal semantics and visible focus states. They render through a body portal so the mobile course overview cannot paint over them or intercept pointer events. Backdrop, Back, and Cancel recovery paths remain available; verifying continues to lock destructive navigation.
5. Responsive and risk evidence: The authenticated mobile flow opened payment choices, selected PromptPay, observed the disabled verify action without a slip, returned to provider choices, and canceled without contacting a provider. Paid/free rendering and four-width overflow coverage passed with the course/payment regressions.

## Commands and observed results

- Focused component ESLint: passed.
- Focused authenticated mobile payment dialog E2E: 1/1 passed after the portal correction.
- npm run test:e2e for payment, public-learning-journey, and course on Chromium: 38/38 passed.
- npm run test -- --run tests/api/payment.test.ts: 31/31 passed, including authentication, signature, idempotency, paid-state, and fulfillment-failure boundaries. Expected mocked error logs were observed in negative-path cases.
- npm run lint: passed.
- npm run build: passed with Next.js 16.1.4; compilation, TypeScript, page data, and all 90 route entries completed.
- Paid/free desktop and mobile renders plus desktop/mobile payment-dialog renders were inspected during implementation.
- git diff --check and final status review were run after evidence reconciliation.

## Changed boundaries

- src/components/course/EnrollButton.tsx: scoped classes, dialog semantics, real upload button, explicit button types, and body portals; commerce logic preserved.
- src/components/course/EnrollButton.module.css: editorial state system and responsive modal composition.
- src/app/courses/[slug]/course-detail.module.css: square tag geometry and removal of route-level clipping/CTA overrides.
- e2e/payment.spec.ts: authenticated paid-course dialog interaction with mocked session/enrollment state and no provider call.

## Security, recovery, and limitations

- No production credentials, payment, slip, provider, or production data were used.
- Stripe, SlipOK, fulfillment, authorization, validation, and idempotency implementations were not changed. The API regression suite supplies the recent boundary evidence.
- Recovery is a scoped presentation/test revert; no schema, data, migration, enrollment, or provider recovery is required.
- Real authenticated provider checkout and slip verification were intentionally not exercised. Generated screenshots and Playwright artifacts remain untracked and outside product commits.
