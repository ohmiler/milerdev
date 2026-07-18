---
solodeveling_schema: 1
---

# Project

- Name: MilerDev
- Purpose: Thai-language coding learning studio and production LMS/e-commerce application.
- Primary users: Thai learners, instructors, and administrators.
- Architecture: Next.js App Router application with server components and route handlers, Drizzle ORM over MySQL, and shared domain components under `src/components` and `src/lib`.
- Stack: Next.js 16, React 19, TypeScript, Drizzle ORM, MySQL, NextAuth v5, Stripe, PromptPay/SlipOK, Bunny.net Stream, Vitest, and Playwright.

## Durable constraints

- Preserve authentication, enrollment, payment, and production-data behavior unless a work item explicitly authorizes change.
- Never read or expose secret-bearing environment files.
- Public UI defaults to the light palette in `milerdev-color-palette.md`; dark surfaces are task-specific.
- Thai content must remain readable and correctly encoded.

## Authoritative sources

- `AGENTS.md`: repository workflow, safety, implementation, and verification rules.
- `milerdev-color-palette.md`: approved color palette and light-default direction.
- `README.md`: environment and local-development overview.
- `package.json`: executable scripts and dependency versions.
- `src/lib/db/schema.ts`: database schema source of truth.
