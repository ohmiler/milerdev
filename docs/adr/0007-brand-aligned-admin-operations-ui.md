# ADR 0007: Brand-aligned admin operations UI

- Status: Accepted — implementation complete; signed-in browser QA pending
- Date: 2026-08-21
- Decision owners: MilerDev product and engineering
- Scope: Routes under `/admin` and admin-only components
- Related decisions: ADR 0001, ADR 0003, ADR 0004, and ADR 0006

## Context

The non-admin redesign now gives public, conversion, learner, account, and learning-workspace surfaces one MilerDev visual language. Those decisions explicitly deferred `/admin` so user value could ship without coupling public presentation to operational workflows.

The admin UI already uses a compatible white, navy, and MilerDev-blue palette, but its implementation is fragmented:

- there are 27 admin `page.tsx` routes;
- `src/app/admin/admin-theme.css` contains 433 lines;
- only 5 admin routes currently import `AdminPrimitives`;
- 31 files under the admin route/component boundary contain inline style objects;
- additional page and component styles are embedded through `style` or `style jsx` blocks;
- the global non-admin semantic tokens and source-owned shadcn primitives are not yet the default admin foundation.

Visual inconsistency is not the only concern. Some current admin affordances imply data or capability that is not authoritative: dashboard comparison percentages are hard-coded, the header notification count is fixed, and the header search field has no search behavior. A visual migration must not increase trust in simulated analytics or inactive controls.

Admin workflows also include high-risk transitions involving roles, user lifecycle, enrollment, payments, refunds, reconciliation, uploads, course publication, certificates, settings, and audit records. Their operational requirements differ from the generous decision-oriented composition used on public pages.

## Decision

Begin the admin redesign after the non-admin visual system is stable, but treat it as a separate, staged **brand-aligned operations UI** program rather than porting public page compositions into `/admin`.

The program shares the following foundation with the rest of MilerDev:

- semantic color and status tokens;
- Prompt/Inter typography and Thai-first task language;
- accessible source-owned shadcn primitives;
- focus, disabled, loading, empty, error, success, warning, and destructive states;
- MilerDev blue as the primary action accent;
- restrained light surfaces, navy text, and consistent radius/shadow rules.

The admin surface owns distinct operational variants for:

- denser tables, filters, toolbars, and forms;
- work queues and exception-first summaries;
- bulk selection and bulk-action review;
- authoritative status transitions and transition history;
- destructive-action confirmation and recovery;
- audit context, actor, time, and outcome;
- desktop-primary productivity with safe responsive access.

This proposal is visual- and interaction-foundation work. It does not authorize changes to roles, lifecycle rules, payment authority, enrollment grants, refund behavior, webhook handling, database schema, or external-provider contracts.

## Grilling findings

### Why now

- The non-admin foundation is mature enough to reuse instead of creating a third design system.
- Continued one-off admin work will expand current style fragmentation.
- Brand coherence matters, but consistent risk semantics and operator confidence are the higher-value outcomes.

### Why not a big-bang reskin

- The 27 routes do not have equal frequency or risk.
- Dense operational workflows should not inherit public-page whitespace and promotional hierarchy unchanged.
- Payment, reconciliation, enrollment, user lifecycle, and publishing controls need behavior regression coverage before visual replacement.
- Current inactive or simulated affordances must be resolved deliberately, not restyled as if authoritative.

### Resolved implementation decisions

1. The primary outcome is operational speed and error reduction, expressed through a quiet MilerDev brand treatment.
2. The accepted release is visual-foundation work. Business workflows and authoritative contracts do not change.
3. The shared shell applies to every admin route. Dashboard and Courses are the two migrated pilot content surfaces.
4. Admin is desktop-primary with safe responsive access. Courses use record cards on mobile.
5. Task, status, validation, recovery, and destructive language is Thai-first; established technical nouns remain when clearer.
6. Inactive global search, notification, shortcut, and simulated metric affordances are removed until an authoritative capability exists.
7. Dashboard may add read-only derived metrics over the existing schema, retains a 60-second cache, and communicates that freshness boundary.
8. Admin uses adaptive density: comfortable shells and forms with compact operational tables and toolbars.

## Rollout audit after the pilots

The shell, Dashboard, and Courses index pilots are complete. A route-level audit on 2026-08-21 found:

- 27 admin `page.tsx` routes in total;
- 2 migrated content routes: `/admin` and `/admin/courses`;
- 1 exempt route: `/admin/analytics`, which intentionally redirects to `/admin` and has no surface to migrate;
- 24 routes with content still to migrate;
- approximately 13,712 lines across those remaining route files;
- 23 of the 24 remaining routes are client components;
- 72 direct `fetch()` call sites across the remaining routes;
- every remaining content route still contains page-local raw color values, and 5 also contain embedded style blocks.

The shared shell being visible on a route does not make that route migrated. Completion is measured at the content-surface and behavior-contract level.

### Grilling conclusions for full completion

1. Finishing by changing colors only is rejected. Large pages combine data access, mutation orchestration, dialogs, forms, and presentation; each route family must preserve its behavior contract while extracting reusable operational patterns.
2. A single 24-route patch is rejected. It would mix course publishing, access, commerce, uploads, and system operations into one regression surface.
3. The next slice must finish the Course vertical journey. The migrated Courses index currently leads into five legacy authoring and enrollment surfaces, so stopping at the index leaves the most visible workflow internally inconsistent.
4. Commerce and access routes follow immediately because visual ambiguity around payments, reconciliation, enrollments, roles, bundles, and coupons has the highest operational cost.
5. `/admin/analytics` remains a redirect. The migration does not authorize inventing a replacement analytics product.
6. Page decomposition is permitted and expected, but server authority, request payloads, state transitions, retries, validation, and audit behavior remain unchanged.

## Route-family plan used for the correction pass

### Wave A: complete the Course journey — 5 routes

- `/admin/courses/new`
- `/admin/courses/[id]/edit`
- `/admin/courses/[id]/lessons`
- `/admin/lessons/[lessonId]/edit`
- `/admin/courses/[id]/enrollments`

This wave stabilizes form sections, upload/media fields, lesson ordering, editor states, record detail, and course-scoped enrollment patterns.

### Wave B: access and commerce operations — 7 routes

- `/admin/users`
- `/admin/users/[id]`
- `/admin/enrollments`
- `/admin/payments`
- `/admin/reconciliation`
- `/admin/bundles`
- `/admin/coupons`

This wave requires focused regression coverage for role and user lifecycle actions, explicit enrollment intent, payment truth, refund/retry rules, bulk actions, bundle publication constraints, and coupon validation.

### Wave C: content and credential operations — 8 routes

- `/admin/blog`
- `/admin/blog/new`
- `/admin/blog/[id]/edit`
- `/admin/media`
- `/admin/tags`
- `/admin/announcements`
- `/admin/affiliate-banners`
- `/admin/certificates`

This wave reuses list, editor, upload, preview, publication, and empty/error patterns without weakening sanitization or file validation.

### Wave D: governance and system operations — 4 routes

- `/admin/reviews`
- `/admin/reports`
- `/admin/audit-logs`
- `/admin/settings`

This wave completes moderation, sourced reporting, evidence/provenance, settings scope, and recovery presentation.

After each wave, run affected behavior tests, the admin text scan, lint, production build when practical, and responsive browser QA before beginning the next wave.

## Correction audit and implementation state

An initial completion claim on 2026-08-21 was based too heavily on semantic-color convergence. A signed-in operator screenshot of /admin/users showed that the page still retained the legacy oversized hero and locally composed cards, filters, table, and dialogs. The route was therefore not structurally migrated under this ADR's acceptance rules. That claim was withdrawn and the complete route inventory was audited again.

The correction pass produced this implementation state:

- all 26 admin content routes render inside the versioned operations-v2 route surface owned by src/app/admin/layout.tsx;
- /admin/analytics remains the single exempt redirect, so the 27-route source ledger has no unhandled content route;
- the route surface now owns the quiet page-header hierarchy, content width and rhythm, card boundaries, native control and focus treatment, table density and row states, modal treatment, shadow restraint, and mobile stacking;
- AdminPageHero no longer renders a decorative gradient hero and now follows the same operational header hierarchy as the Dashboard and Courses pilots;
- the Users list and user detail use the shared metric-card composition, and the unreachable duplicate Users render branch was removed;
- admin page files contain no embedded style blocks, raw hex colors, rgba() presentation values, page-local gradients, named white presentation values, or page-local box shadows;
- Course and Lesson priority panels and content cards are normalized by the same operational surface while their publishing, ordering, upload, and enrollment behavior remains unchanged;
- navigation to internal user records now uses Next.js links instead of assigning window.location.href;
- behavior, request payloads, authorization, payment, enrollment, publication, upload, and settings contracts were not changed.

The Admin operations UI regression test inventories all 27 route files and now rejects both raw presentation literals and regressions in the shared structural surface. It also checks the analytics redirect, quiet header foundation, modal/table/responsive rules, the Users metric-card migration, and removal of inactive global affordances.

Signed-in browser comparison at representative desktop and mobile widths remains a release-verification item because the local browser automation environment was unavailable during this pass. This does not reopen a source-route migration, but it must be completed before describing the visual rollout as production-verified.

## Implementation sequence (historical)

### Slice 0: inventory and contracts

- Inventory every route by task, risk, frequency, mutation type, state model, and responsive requirement.
- Capture representative current behavior before structural changes.
- Define admin semantic tokens and density variants without changing global user-facing composition.
- Define status vocabulary from server/domain states rather than page-specific colors.

### Slice 1: shell and primitives

- Migrate sidebar, header, page container, page heading, breadcrumb/context, feedback, dialog, sheet, button, field, card, table, badge, skeleton, and toast foundations.
- Resolve inactive global search, notification, and shortcut affordances honestly.
- Keep authorization in `src/app/admin/layout.tsx` server-authoritative.

### Slice 2: low-risk representative surfaces

- Migrate the dashboard only after every displayed metric is sourced, derived, or explicitly omitted.
- Migrate a representative catalog/list workflow such as Courses to validate density, filters, tables, empty states, and responsive behavior.
- Use these routes to stabilize the foundation before multiplying it across the remaining pages.

### Slice 3: content operations

- Courses, lessons, media, blog, bundles, tags, announcements, affiliate banners, and reviews.
- Preserve publication state, ordering, upload validation, sanitization, and recovery behavior.

### Slice 4: people and learning operations

- Users, enrollments, certificates, and related detail/lifecycle controls.
- Preserve role, access, explicit-admin-intent, and audit boundaries.

### Slice 5: commerce and system operations

- Payments, reconciliation, coupons, reports, analytics, audit logs, and settings.
- Require focused behavior tests for every authoritative transition, confirmation, idempotency, error, and retry state.

## Acceptance rules

An admin route is migrated only when:

- it uses the accepted shared primitives or documented admin operational patterns;
- it does not introduce page-specific raw colors when a semantic token exists;
- every displayed metric and status is authoritative or clearly labelled as unavailable/sample data;
- inactive controls do not imply unavailable capability;
- loading, empty, error, success, disabled, permission-denied, mutation-pending, and destructive states are distinct where applicable;
- keyboard, focus, responsive overflow, and reduced-motion behavior are verified;
- existing authorization, validation, idempotency, logging, and recovery behavior is preserved;
- affected behavior tests, ESLint, `npm run check:admin-text`, production build when practical, `git diff --check`, and `git status --short` pass.

The program is complete only after an audit finds no unintended one-off admin primitives, raw status-color mappings, misleading metrics, or inactive global affordances.

## Alternatives considered

### Keep admin unchanged

This avoids immediate regression risk but preserves fragmentation and makes each future admin feature more expensive to align. It is acceptable only as a short deferral, not a design-system direction.

### Apply the public academy layout directly

This maximizes visual similarity but weakens information density and confuses marketing/learning hierarchy with operational hierarchy. It is rejected.

### Rewrite all admin routes in one release

This produces faster visual uniformity but creates an unnecessarily large regression surface across high-risk workflows. It is rejected.

## Consequences

### Benefits

- MilerDev feels coherent without making admin and learner workflows identical.
- Shared accessibility and semantic-state foundations reduce duplicated UI behavior.
- Staged migration contains risk and produces reusable operational patterns.
- Misleading or inactive admin affordances become explicit product decisions.

### Costs and risks

- Old and new admin presentation will coexist temporarily behind route boundaries.
- Shared-token changes can regress non-admin pages unless admin aliases and variants are scoped carefully.
- Visual migration may expose workflow and data-quality defects that require separate product decisions.
- Full completion requires route-family tests beyond simple screenshot or CSS assertions.

## Supersession rule

Accepting this ADR starts only the staged visual and interaction migration. Any change to persisted data, roles, payment or enrollment authority, lifecycle transitions, reconciliation policy, or provider behavior requires its own explicit decision.
