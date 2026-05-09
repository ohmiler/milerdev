---
name: milerdev-lms
description: Implement, fix, review, or extend features in the MilerDev LMS repository. Use when working on course, lesson, bundle, enrollment, payment, certificate, blog, notification, dashboard, admin, auth, API route, Drizzle/MySQL schema, or MilerDev-specific frontend design tasks in this Next.js app.
---

# MilerDev LMS

Use this skill to work safely inside the MilerDev course platform. It adds project-specific workflow around the repo's Next.js App Router, Drizzle/MySQL data model, Thai LMS UX, admin surfaces, auth, payments, and tests.

## First Moves

1. Read `AGENTS.md` first and follow it as the repo-wide contract.
2. Run `git status --short` and preserve user changes.
3. Inspect the nearest files before editing:
   - Page or layout: `src/app/**/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
   - API route: `src/app/api/**/route.ts`
   - Shared logic: `src/lib/**`
   - Data model: `src/lib/db/schema.ts`
   - UI component: `src/components/**`
   - Tests: `tests/**` or `e2e/**`
4. Do not read `.env*` files. Use placeholders and `.env.example` only.

## Workflow Decision Tree

- Feature touches database shape: follow **Database Changes** before implementation.
- Feature touches auth, roles, admin access, passwords, rate limits, headers, or user input: follow **Security Path**.
- Feature touches Stripe, PromptPay/SlipOK, bundles, payments, reconciliation, or enrollments: follow **Payment Path**.
- Feature changes public pages, dashboard, admin UI, course UI, learning UI, or Thai copy: follow **Frontend Path**.
- Feature only changes pure helper logic: update helper and nearby unit tests, then run targeted Vitest.

## Implementation Loop

1. Locate existing patterns with `rg` before creating new ones.
2. Reuse existing helpers for auth, validation, API responses, rate limits, sanitization, database access, and admin UI.
3. Make the smallest coherent change across route/component/lib/test files.
4. Add or update focused tests when behavior changes.
5. Run the narrowest useful verification first, then broaden based on risk:
   - Helper/API logic: `npm run test -- <matching test file>`
   - UI or route build safety: `npm run lint` and `npm run build`
   - Auth/course/payment flows: relevant `npm run test:e2e` spec
   - Thai admin text changes: `npm run check:admin-text`

## Database Changes

1. Treat `src/lib/db/schema.ts` as source of truth.
2. Check related tables, relations, indexes, and existing migrations in `drizzle/`.
3. For schema updates, edit `schema.ts`, run `npm run db:generate`, and inspect generated SQL.
4. Preserve production data by default. Ask before destructive migrations or data backfills.
5. Remember MySQL constraints:
   - Do not use PostgreSQL-only `.returning()`.
   - Decimal money fields often need string-safe handling.
   - Generate IDs explicitly with `createId()` where local patterns do.

## Security Path

1. Enforce authorization on the server. Client checks are only UX.
2. Use `auth()` from `@/lib/auth` for session checks in server code.
3. Validate body/query data with Zod or nearby validators before database writes.
4. Preserve anti-enumeration behavior in registration and password reset flows.
5. Keep passwords hashed with bcryptjs and never log credentials, tokens, env vars, or webhook secrets.
6. Use existing rate-limit helpers for auth, admin, upload, and payment-sensitive endpoints.
7. If editing CSP or proxy security headers, verify Stripe, Bunny, embedded video, fonts, and app assets still work.

## Payment Path

1. Read the complete current flow before editing: checkout route, webhook or slip verification, payment record, enrollment side effect, and admin reconciliation surface.
2. Preserve idempotency. Duplicate webhooks, duplicate slip submissions, and retry jobs must not create duplicate enrollments or inconsistent payments.
3. Do not grant enrollment unless payment or admin intent is verified.
4. Keep error messages safe and user-friendly. Do not expose provider internals or secrets.
5. Add tests for state transitions and duplicate handling when changing payment logic.
6. Prefer targeted checks from `tests/api/payment.test.ts` and `e2e/payment.spec.ts` when relevant.

## Frontend Path

1. Read `DESIGN.md` before visual changes unless the task is a tiny fix.
2. Use the existing MilerDev visual language:
   - Bright, readable LMS surface.
   - Primary accent `#02abff`.
   - Thai copy with generous line-height.
   - Product-like admin/dashboard UI that is dense, scannable, and calm.
3. Reuse components in `src/components` before creating new primitives.
4. For admin pages, prefer `src/app/admin/admin-theme.css` tokens/classes and `src/components/admin/ui/AdminPrimitives.tsx`.
5. Preserve mobile behavior. Check layout at mobile and desktop sizes for non-trivial UI changes.
6. Avoid generic landing-page clutter, unrelated decorative cards, and visual patterns that fight the existing design system.

## API Route Pattern

When editing `src/app/api/**/route.ts`:

1. Parse and bound query params.
2. Authenticate early when needed.
3. Authorize roles explicitly for admin/instructor flows.
4. Rate-limit public or sensitive routes.
5. Validate request bodies before mutation.
6. Use Drizzle schema exports and existing helpers.
7. Return the route's existing response shape unless intentionally standardizing it.
8. Log only safe context. Never log secrets or full provider payloads.

## Done Criteria

Before handing back:

1. Confirm files changed are scoped to the request.
2. Run relevant tests or explain exactly why they were not run.
3. Mention high-risk areas touched, especially auth, payment, database, or production data.
4. Include any manual verification needed for external services such as Stripe, SlipOK, Bunny, SMTP, or Resend.
