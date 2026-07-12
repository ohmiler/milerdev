# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

MilerDev is a Thai-language online course platform built with Next.js App Router, React, Drizzle ORM, MySQL, NextAuth v5, Stripe, PromptPay/SlipOK, Bunny.net video, and email integrations.

Treat this as a production LMS/e-commerce app. Changes to auth, enrollment, payment, certificates, admin workflows, rate limiting, database schema, and security headers need extra care and focused tests.

## Repository Map

- `src/app`: Next.js App Router pages, layouts, loading/error states, and route handlers.
- `src/components`: Shared UI plus domain components for courses, admin, blog, certificates, notifications, layout, and video.
- `src/lib`: Server-side helpers for auth, database, validation, payments, email, rate limiting, sanitization, notifications, and API responses.
- `src/lib/db/schema.ts`: Drizzle schema source of truth.
- `drizzle`: Generated migrations and migration metadata.
- `tests`: Vitest unit/integration tests.
- `e2e`: Playwright tests.
- `scripts`: Operational scripts and one-off migration utilities. ESLint ignores this directory.
- `docs`: API and payment testing docs.
- `public`: Static assets, logos, OG image, client/showcase images.

## Commands

Use npm because this repo has `package-lock.json`.

- Install: `npm install`
- Dev server: `npm run dev`
- Dev with Infisical remote env: `npm run dev:remote`
- Build: `npm run build`
- Lint: `npm run lint`
- Unit tests: `npm run test`
- Coverage: `npm run test:coverage`
- E2E tests: `npm run test:e2e`
- Admin text encoding check: `npm run check:admin-text`
- Start local MySQL: `npm run docker:up`
- Stop local MySQL: `npm run docker:down`
- Push local schema: `npm run db:push:local`
- Generate Drizzle migrations: `npm run db:generate`
- Apply Drizzle migrations: `npm run db:migrate`
- Seed local DB: `npm run db:seed`

For narrow changes, run the most relevant subset first, then `npm run lint` and `npm run build` before handing off when practical. For UI or route-flow changes, run the affected Playwright spec or smoke test.

## Environment And Secrets

- Do not read, print, or summarize `.env`, `.env.local`, `.env.production`, or other secret-bearing files.
- Use `.env.example` and `README.md` for placeholder names only.
- Never hardcode secrets, tokens, API keys, webhook secrets, database URLs, credentials, or private URLs.
- Never expose secret environment variables to client components or browser code.
- Keep production/Railway credentials in the deployment platform, not in committed files.
- If a task needs real credentials or a production check, ask the user to run it or provide a safe redacted result.

## Coding Style

- TypeScript strict mode is enabled. Prefer typed data shapes and avoid `any`; when an adapter requires it, keep the escape hatch local and documented.
- Follow the style of the file being edited. Most app/lib files use 4-space indentation and single quotes, while some Next config/layout files use 2 spaces or double quotes.
- Use the `@/*` alias for imports from `src`.
- Keep changes scoped. Do not refactor unrelated modules while fixing a bug.
- Prefer existing local helpers and patterns over introducing new abstractions.
- Add comments only when they explain non-obvious security, payment, or concurrency decisions.
- Preserve Thai copy and Thai-friendly typography. Be careful with mojibake/encoding in existing Thai text.

## Next.js And React

- This is a Next.js 16 App Router project. Use server components by default and add `"use client"` only for components that need browser APIs, state, effects, event handlers, or client-only libraries.
- Route handlers live in `src/app/api/**/route.ts`.
- Use `auth()` from `@/lib/auth` for session checks in server code.
- Keep protected admin behavior server-enforced; client-side checks are only UX.
- Use `NextResponse` and the existing API response helpers where they fit the local route pattern.
- Avoid unnecessary `useMemo`/`useCallback`. Reach for them only when there is a measured or obvious referential stability need.
- Keep loading and error states close to the route segments they support.

## Database And Migrations

- `src/lib/db/schema.ts` is the source of truth for Drizzle tables and relations.
- Use Drizzle query builder and schema exports rather than raw SQL in app code unless the query needs SQL-specific behavior.
- For schema changes, update `schema.ts`, generate a migration with `npm run db:generate`, and review generated SQL before applying.
- MySQL does not support PostgreSQL-style `.returning()`; use explicit IDs such as `createId()` where needed.
- Be careful with decimal fields. Prices and amounts often move through Drizzle/MySQL as strings.
- For destructive schema/data changes, confirm intent and preserve user/payment/enrollment data.

## Auth, Roles, And Security

- NextAuth v5 is configured in `src/lib/auth.ts` with credentials, optional Google OAuth, JWT sessions, and Drizzle adapter tables.
- User roles are `student`, `instructor`, and `admin`. Never trust client-provided roles.
- Registration and password reset flows should avoid user enumeration.
- Passwords must be hashed with bcryptjs and never logged.
- Rate-limit public, auth, admin, upload, and payment-sensitive endpoints using `@/lib/rate-limit` or the existing proxy protections.
- Keep security headers in `src/proxy.ts` compatible with Stripe, Bunny, YouTube/Vimeo, Google fonts, and app assets.
- Sanitize rich text and user-generated HTML with existing sanitization helpers.

## Payments And Enrollment

- Treat Stripe, PromptPay/SlipOK, bundle checkout, payment reconciliation, and enrollment creation as high-risk code.
- Preserve idempotency for webhooks and payment verification. Check existing `stripeEvents`, payment status, retry, and reconciliation patterns before editing.
- Do not grant enrollment until payment or admin intent is clearly verified.
- Keep payment amounts in THB unless a nearby flow explicitly supports another currency.
- Do not log full webhook payloads, customer identifiers, slip contents, or payment secrets.
- Update or add tests for payment state transitions, duplicate submissions, webhook retries, and enrollment side effects.

## Frontend And Design

- Follow `DESIGN.md` and the existing visual language before inventing new UI.
- Brand direction: precise, calm, technical, friendly, product-like LMS.
- Primary brand color is `#02abff`; use it for primary actions, active states, progress, focus, and important links.
- Public pages are bright and readable; dashboard/admin pages should be dense, scannable, and operational.
- Thai body text needs generous line-height, usually around `1.7` to `1.8`.
- Prefer existing components in `src/components` and admin primitives in `src/components/admin/ui/AdminPrimitives.tsx`.
- For admin pages, reuse `src/app/admin/admin-theme.css` tokens/classes where practical.
- Do not add generic marketing-card clutter. Keep page sections purposeful and workflows efficient.
- Verify responsive behavior for mobile and desktop when changing UI.

## API Patterns

- Validate request bodies with Zod schemas, especially for admin, auth, payment, upload, and profile changes.
- Keep API responses consistent with the local route and docs. Existing helpers in `src/lib/api-response.ts` return `{ success, data }` or `{ success, error, code }`.
- Return appropriate HTTP statuses: `400` validation, `401` unauthenticated, `403` unauthorized role, `404` missing resource, `409` conflict, `429` rate limited.
- Avoid leaking implementation details in error messages.
- Keep pagination limits bounded and sanitize query params.

## Testing Guidance

- Unit/integration tests use Vitest with setup in `tests/setup.ts`.
- E2E tests use Playwright with base URL `http://localhost:3000` unless `E2E_BASE_URL` is set.
- Add or update tests near the affected behavior:
  - `tests/api` for route handlers and API behavior.
  - `tests/lib` for helpers, validations, rate limiting, coupons, safe inserts, and pub/sub.
  - `e2e` for auth, course, payment, concurrency, and smoke flows.
- Mock external services in unit tests. Do not call Stripe, SlipOK, Bunny, Google, SMTP, or Resend from tests.
- If a change affects Thai admin text, run `npm run check:admin-text`.

## Git, Commits, And Pushes

- When asked to commit, use Conventional Commits.
- Format commit messages as `<type>(optional-scope): <summary>`, for example `feat(courses): add lesson progress filter` or `docs(agents): add MilerDev workflow skill`.
- Prefer these types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`, `build`, `ci`.
- Keep the summary imperative, lowercase after the type, and under 72 characters when practical.
- Before committing, review `git status --short` and stage only files that belong to the requested change.

## Design Work

Before non-trivial UI changes:

1. Read `PRODUCT.md` and `DESIGN.md`.
2. Check `docs/design/REDESIGN-ROADMAP.md` for the current focus.
3. Read the relevant page note in `docs/design/pages/` when present.
4. Work only on the current page section or shared component unless the user expands the scope.
5. Preserve behavior unless the request explicitly authorizes a behavior change.
6. After verification, update the roadmap and page note with the new status or decision.

Do not treat files under `docs/superpowers/` as the long-term design source of truth. They may contain temporary plans or workflow artifacts.
## Agent Workflow

Use the lightest workflow that fits the request. Do not stack planning, brainstorming, browser, review, and documentation workflows by default.

### Quick path (default)

Use this for copy changes, focused styling/layout work, small bug fixes, documentation edits, and read-only investigation.

1. Run `git status --short`, search with `rg`/`rg --files`, and inspect the nearest files.
2. Make the smallest coherent change in the requested scope.
3. Run the narrowest useful verification.
4. Report changed files, checks run, and any skipped checks.

Do not create a separate plan/spec, open a visual companion, start a browser session, or make a commit unless the task needs it or the user asks for it.

### Standard path

Use this for multi-file features, route changes, reusable components, or behavior changes that need focused tests.

1. Inspect existing patterns, related helpers, and nearby tests before editing.
2. Write a short implementation plan when the change has meaningful dependencies or more than one safe implementation path.
3. Implement in small, reviewable steps.
4. Run targeted tests first, then `npm run lint` and `npm run build` when practical.
5. Use browser or Playwright checks only when the route flow or responsive behavior cannot be verified adequately from code and automated tests.

### High-risk path

Use the extra review path for auth, roles, admin authorization, payments, enrollment, certificates, rate limits, security headers, uploads, database schema, migrations, and production data.

1. Read the complete current flow before editing.
2. Preserve idempotency, authorization, validation, safe logging, and recovery behavior.
3. Add or update focused tests for state transitions, duplicate requests, retries, and side effects.
4. Review the diff carefully and run the strongest relevant verification available.
5. Ask before destructive data or schema changes, production operations, or external coordination.

### Skill and workflow rules

- Follow an explicitly invoked skill and the platform's required skill triggers.
- Prefer one primary workflow skill that covers the task. Do not invoke overlapping optional skills without a concrete reason.
- For a clear, scoped UI request, keep the design checkpoint brief. Do not automatically offer a visual companion or require browser iteration.
- Use `impeccable` for frontend quality work when the user invokes it or the task clearly needs a design-system/UX pass.
- Use brainstorming or a written plan when requirements are ambiguous, the scope is substantial, or the user asks for design exploration. A small, unambiguous UI change should stay lightweight.
- Use verification before claiming that work is complete, fixed, or passing.
- Do not create commits, pull requests, design specs, or external messages unless the user asks for them.

### Editing and handoff

- Preserve unrelated user changes in a dirty worktree.
- Do not run destructive commands such as `git reset --hard`, recursive deletion, or checkout of user files unless explicitly requested.
- Use `apply_patch` for manual edits when available. If the editing helper fails, use the safest equivalent patch-based method and call out the limitation.
- Never read or print secret-bearing environment files.
- Before handoff, check `git diff --check` and `git status --short`.
- In the final response, summarize the result, changed files, verification performed, and any remaining risk or skipped check.
