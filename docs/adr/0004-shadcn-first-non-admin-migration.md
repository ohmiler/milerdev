# ADR 0004: Migrate non-admin UI to shadcn-first composition

- Status: Accepted
- Date: 2026-08-19
- Decision owners: MilerDev product and engineering
- Scope: Every user-facing route outside `/admin`
- Amends: ADR 0003's migration foundation and completion claim

## Context

The first non-admin redesign pass changed semantic tokens and added visual overrides, but it did not migrate every route to the intended component foundation. A route-level audit found 31 non-admin page routes and 24 non-admin CSS Modules containing 8,161 lines. The course catalog, blog index and article, About, Contact, course and bundle details, authentication, learner account, payment dialogs, status surfaces, Footer, and several loading states still depend on route- or component-specific legacy CSS.

Existing shadcn/ui adoption is narrow: Home uses Button, Badge, Card, and Accordion; the public navigation uses Button and Sheet. User forms still use `FormControls`, and enrollment or preview flows still use `DialogShell`, `Modal`, and `ConfirmDialog`. Several routes implement one-off skeleton classes instead of the repository's shadcn `Skeleton` primitive.

Therefore, token alignment or appended CSS overrides alone do not qualify a route as migrated.

## Decision

MilerDev will use source-owned shadcn/ui primitives plus Tailwind utility composition as the default implementation foundation for all non-admin UI.

1. New or migrated user-facing components use the primitives under `src/components/ui` rather than rebuilding Button, Input, Label, Select, Card, Dialog, AlertDialog, Sheet, Tabs, Separator, Badge, Alert, Skeleton, or toast behavior.
2. Route and pattern layout is composed with Tailwind utilities and `cn()`. Migrated user routes do not introduce new CSS Modules.
3. Legacy CSS Modules are removed from a migrated boundary after all of their consumers move. A shared legacy file is deleted only when it has no consumers; otherwise any remaining admin-only dependency is made explicit and isolated from user code.
4. Home information architecture remains frozen. Shared primitive or token changes must preserve its approved composition and spacing.
5. Server Components, authorization, payment truth, enrollment, analytics, database behavior, and external-provider boundaries remain unchanged.

## Page families in scope

### Discovery and editorial

- `/courses`, `/courses/[slug]`, `/bundles/[slug]`
- `/blog`, `/blog/[slug]`
- `/about`, `/contact`, `/faq`, `/announcements`
- `/privacy`, `/terms`
- shared Navbar, Footer, page header, catalog cards, filters, pagination, and rich-content controls

### Authentication and conversion

- `/login`, `/register`, `/forgot-password`, `/reset-password`
- course and bundle enrollment, payment-method selection, PromptPay/slip, Stripe handoff, confirmation, error, and recovery states
- course and bundle payment-success routes

### Learner and proof

- `/dashboard`, `/dashboard/payments`, `/dashboard/certificates`
- `/profile`, `/settings`
- course entry, lesson workspace, and empty-course workspace
- certificate verification and downloadable proof
- application error and not-found surfaces

## Skeleton and pending-state contract

A skeleton is a temporary, non-interactive shape that preserves the expected layout while initial data for that exact region is unresolved. It is not a generic loading indicator and must not conceal an error or an empty result.

- Data-bound route navigation uses route-level `loading.tsx` composed with the shadcn `Skeleton` primitive and the same structural grid as the resolved page.
- Client-side initial data fetches use a local skeleton only when the final layout is predictable. Otherwise they use a compact status message or progress indicator.
- Form submission, enrollment, payment creation, file processing, and downloads use a disabled pending Button with a spinner or pending label, not a page skeleton.
- Static About, Contact shell, FAQ shell, Privacy, and Terms pages do not need route skeletons merely for consistency.
- Skeletons must be hidden from the accessibility tree unless a nearby live status communicates the loading state.
- Error, empty, success, verifying, refunded, and disabled states remain distinct from loading.
- Reduced-motion preferences must remove nonessential skeleton animation.

## CSS that may remain

The migration does not mean a literal zero-CSS application. The proposed allowed CSS boundary is:

- semantic tokens, font declarations, resets, base typography, and shared Tailwind theme mapping in `globals.css`;
- sanitized rich article or lesson HTML whose internal nodes cannot be authored as React primitives;
- third-party player, code highlighting, print, image-export, and other media/document rules that cannot be expressed safely at the component call site;
- narrowly scoped keyframes required by an accessible shared primitive.

Page layout, cards, forms, filters, navigation, dialogs, status panels, skeleton geometry, and responsive composition are not exceptions.

## Migration order

1. Complete shared shadcn primitives and theme variants.
2. Migrate shared Navbar, Footer, page header, forms, feedback, dialogs, and status patterns.
3. Migrate discovery/editorial pages, including the four explicitly reported gaps: Courses, Blog, About, and Contact.
4. Migrate course, bundle, authentication, and payment conversion flows.
5. Migrate learner, proof, and learning workspace surfaces.
6. Add or replace meaningful loading states and delete superseded modules/components.
7. Audit every non-admin route at representative breakpoints and run behavior, accessibility, test, lint, and build checks.

## Acceptance rule

A route is migrated only when:

- it imports no legacy page CSS Module;
- its controls use shared shadcn primitives where an appropriate primitive exists;
- loading, empty, error, success, disabled, mobile, keyboard, focus, and reduced-motion states are verified as applicable;
- it preserves existing business behavior and server trust boundaries;
- no superseded selector, hidden duplicate shell, or dead component remains in its migrated boundary.

The program is complete only after a repository audit shows no unintended user-facing CSS Module imports and no user consumers of the replaced legacy primitives.

## Resolved decisions

1. `/admin` remains outside this redesign. Admin-only presentation may keep an explicit admin stylesheet, but shared user feedback controls were migrated to shadcn so their legacy shared stylesheet could be deleted.
2. Certificate print/image-export rules and the embedded video player are accepted narrowly scoped CSS Module exceptions. Sanitized article and lesson HTML remains a documented global-CSS exception.
3. The migration landed as one continuous working-tree slice because the shared primitive and stylesheet deletions crossed page-family boundaries. Future changes should return to reviewable page-family slices.

## Implementation outcome

- The audited 31 non-admin routes now use the shared semantic theme, shadcn primitives, and Tailwind composition for route layout and interactive controls.
- The reported gaps—Courses, Blog, About, and Contact—plus course and bundle detail, authentication, learner account, proof, payment status, support, legal, and learning surfaces were migrated.
- Legacy non-admin page and shared CSS Modules were removed. The repository now has three CSS Modules: one admin-only module, one certificate-artifact module, and one video-player module.
- Legacy course-card, filter, curriculum, reviews, learner-dashboard, and learning-workspace selectors were removed from `globals.css`. Only base/theme rules, the frozen Home boundary, shared rich-content rules, and other documented exceptions remain.
- Thirteen data-bound route loading boundaries use the shared shadcn `Skeleton`; static content and mutation-pending states intentionally do not use page skeletons.
- Browser checks covered public navigation and representative catalog, editorial, support, course, bundle, and authentication routes at mobile and desktop widths. The final 390 px catalog check had no horizontal overflow and no browser console errors or warnings.
- Verification passed with 72 test files and 481 tests, ESLint, a 92-route production build, and `git diff --check`.
