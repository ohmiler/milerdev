# ADR 0003: Complete the non-admin visual system

- Status: Accepted (amended by ADR 0004)
- Date: 2026-08-19
- Decision owners: MilerDev product and engineering
- Scope: Every user-facing route outside `/admin`
- Supersedes: The learner/account deferral in ADR 0001; all commerce and authorization invariants remain unchanged

## Context

ADR 0001 intentionally limited the first redesign slice to public acquisition and conversion. Home is now complete, and course, bundle, authentication, checkout, and analytics work is already in progress. The remaining user journey crosses authenticated dashboard, account, certificate, payment-history, and learning-workspace surfaces. Leaving those surfaces on a separate visual language would make the product feel discontinuous immediately after purchase.

## Decision

MilerDev will complete one coherent non-admin visual system in reviewable slices:

1. Stabilize the in-progress course, bundle, authentication, checkout, and analytics work.
2. Finish the public conversion journey and trustworthy payment-success/recovery states.
3. Migrate dashboard, certificates, payments, profile, settings, notifications, and their loading/empty/error states.
4. Consolidate the learning workspace into an adaptive focus surface.
5. Finish supporting editorial, legal, certificate-verification, and application status pages.

Public, dashboard, and account surfaces are light-first. The learning workspace uses a light reading shell with dark video and lesson-navigation regions. It is a task-specific focus treatment, not a second product brand or a site-wide dark mode.

Thai is the primary task language. Short English eyebrows and established developer terms may remain when they add orientation or character, but actions, status, validation, recovery, and payment language must be immediately understandable in Thai.

Home information architecture and approved copy are frozen. Shared-token changes may fix regressions but must preserve the Home composition and spacing contract from ADR 0002.

## Implementation boundaries

- Semantic tokens and source-owned shadcn/ui primitives are the shared foundation. Route modules own page composition; global CSS owns tokens and genuinely shared shells only.
- New raw-color override blocks must not be appended to migrated routes when an existing semantic token fits.
- Server Components remain the default. Client Components are limited to browser interaction.
- No visual state, redirect parameter, uploaded slip preview, or client session check can grant enrollment or establish payment truth.
- Existing API response shapes, database schema, THB boundaries, provider idempotency, replay protection, rate limits, and authorization remain unchanged.
- Analytics remains collection-only and gated by `analytics_enabled`. Server events are emitted only after the relevant authoritative transition and once per successful request/fulfillment identity.
- Only verified reviews, real course data, and actual MilerDev teaching/showcase media may be presented as evidence.

## Migration and acceptance rule

A route is migrated only when its primary task and loading, empty, error, success, disabled, mobile, keyboard, focus, and reduced-motion states use the shared visual language without losing existing behavior. Representative layouts are checked at 390px, 768px, 1024px, and 1440px, with no horizontal page overflow.

Each slice must pass its affected tests before the next slice. Final handoff requires the full unit suite, lint, production build, representative Playwright journeys, `git diff --check`, and `git status --short` when practical.

## Consequences

- Users receive a continuous experience from discovery through purchase, learning, and account management.
- The learning workspace remains visually focused without imposing dark presentation on reading and account tasks.
- Legacy and new CSS may coexist during implementation, but each migrated boundary must remove redundant overrides and hidden legacy presentation.
- Changes to global tokens carry cross-surface regression risk, so Home, public navigation, learner, and admin smoke checks remain mandatory even though `/admin` is outside the redesign scope.
