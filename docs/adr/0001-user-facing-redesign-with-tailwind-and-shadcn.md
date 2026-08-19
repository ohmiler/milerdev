# ADR 0001: User-facing redesign with Tailwind CSS and shadcn/ui

- Status: Accepted and implemented for the first release slice
- Date: 2026-08-19
- Decision owners: MilerDev product and engineering
- Scope: Public acquisition and conversion surfaces; learner workspace and `/admin` are explicitly deferred

## Context

MilerDev already uses Next.js App Router, React, TypeScript, and Tailwind CSS v4. Tailwind is imported from `src/app/globals.css`, but the application has no shadcn `components.json` yet. User-facing presentation is currently split across a large global stylesheet, CSS Modules, inline styles, and some Tailwind utility classes.

The redesign crosses several distinct but connected journeys:

1. Discover: Home, course catalog, bundles, course detail, blog, and informational pages.
2. Convert: Register, sign in, apply a coupon, choose a payment method, pay, and receive access.
3. Learn: Learner dashboard, course workspace, lesson progress, certificates, and notifications.
4. Manage account: Profile, password/settings, and payment history.

Commerce, enrollment, authorization, and lesson access are high-risk boundaries. Existing UI may be replaced, but the server-authoritative behavior behind those boundaries must remain intact.

## Decision

The first release redesigns the public decision journey with Tailwind CSS v4 and source-owned shadcn/ui components:

1. Home and the shared public navbar/footer.
2. Course catalog, course detail, bundle discovery, and bundle detail.
3. Register/sign-in presentation and the anonymous return-to-product transition.
4. Course and bundle checkout dialogs, including a mobile bottom-sheet presentation.
5. Payment-success and enrollment feedback surfaces.

The authenticated dashboard, learning workspace, account management, and `/admin` retain their current information architecture and visual system. Supporting editorial and legal pages inherit the shared shell but are not otherwise treated as migrated in this release.

## Visual direction

- Product name: MilerDev.
- Audience: Thai beginners progressing toward real developer work.
- Brand character: academy-first, clear, friendly, credible, and practical.
- Palette: white and navy with the existing MilerDev blue `#00abff`.
- Surfaces: soft rounded cards, restrained shadows, generous whitespace, and light-first presentation.
- Imagery: an original, photorealistic Thai learner actively building a software project. Placeholder imagery must not ship.
- Hero eyebrow: “เริ่มต้นเส้นทาง Developer กับ MilerDev”.
- Hero heading: “เรียนให้เข้าใจ สร้างได้จริง เติบโตเป็น Developer”.
- Primary action: “ดูคอร์สทั้งหมด”.
- Secondary action: “ทดลองบทเรียนฟรี”.

## Measurement

The release adds collection-only, first-party events for product views, checkout openings, payment initiation, completed purchases, registration, and free enrollment. Event payloads are allow-listed and exclude IP addresses, user agents, emails, payment payloads, and other direct identifiers.

Collection is disabled unless the existing `analytics_enabled` application setting is explicitly true. The initial decision window is a 14-day baseline followed by the redesigned period. The success threshold is a 10% relative improvement in `purchase_completed / product_view` after at least 100 product views. Reporting UI is deferred with the admin redesign.

## Technical boundaries

- Server Components remain the default. Client Components are reserved for browser interaction.
- Server authorization continues to use `auth()` from `@/lib/auth`; client session state is presentation only.
- Redesign work must not change enrollment grants, payment truth, webhook handling, or database schema unless separately approved.
- Commerce remains in THB. Decimal database values remain strings at database boundaries.
- shadcn/ui is a component foundation, not the visual identity. Components will use MilerDev tokens, Thai typography, and product-specific interaction states.
- Semantic tokens should replace page-specific raw colors. Existing brand blue `#00abff` is a current tested contract unless product explicitly changes it.
- Every migrated flow includes loading, empty, error, success, disabled, focus, mobile, and reduced-motion states where applicable.
- Thai text must remain UTF-8 and must not introduce mojibake.

## Migration rule

A route is considered migrated only when its production behavior is preserved, its representative states are covered, and it no longer depends on unintended legacy styling. Temporary coexistence between legacy CSS and the new system is allowed behind clear route/component boundaries.

## Verification strategy

Use the narrowest relevant check during each slice, then run the broader gates before handoff:

- Component/unit tests for behavior and domain contracts.
- Existing Playwright coverage for Home, public learning journey, authentication, course browsing, payment, responsiveness, keyboard recovery, and protected routes.
- `npm run lint`.
- `npm run test -- --run`.
- `npm run build` when practical.
- `npm run check:admin-text` whenever Thai admin text is touched; admin text is not expected in this phase.
- `git diff --check` and `git status --short` before handoff.

## Consequences

### Benefits

- User value can ship in reviewable slices without waiting for the admin redesign.
- A semantic component layer reduces style drift and repeated interaction code.
- Existing high-risk business logic stays isolated from visual migration.
- The same foundation can later support the admin redesign without forcing identical information architecture.

### Costs and risks

- Legacy and new styles will coexist temporarily.
- Poor token boundaries could make shadcn components look generic or conflict with existing CSS.
- Visual changes can accidentally break behavior encoded in selectors or component structure; tests must assert behavior, not CSS class names.
- Authentication and payment dialogs carry substantially more regression risk than static pages.

## Resolved product decisions

1. The first release optimizes the public course/bundle purchase journey.
2. Thai beginners who want to become developers are the primary audience.
3. The supplied Learnova board is visual direction only; MilerDev identity, copy, content, and composition remain original.
4. Public acquisition and conversion ship before the authenticated learner workspace.
5. Public pages are light-first; dark-mode expansion is deferred.
6. Verified reviews and actual MilerDev teaching/showcase material are preferred over invented proof.
7. Payment and enrollment truth remain server-authoritative.

## Supersession rule

Any expansion into the learner workspace or admin redesign should be planned as a separate slice. Any change to payment authority, enrollment rules, roles, or persistence requires a separate ADR.
