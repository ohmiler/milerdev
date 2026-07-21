# MilerDev design system

## Purpose and status

This is the portable contract for designing and reviewing MilerDev interfaces. It describes the system already expressed by the repository; it does not replace executable tokens, component behavior, authorization, commerce rules, or surface-local requirements.

Verification status as of 2026-07-21: this contract was reconciled by static source inspection. The local app answered on port 3000, but no controllable browser was available, so rendered hierarchy, responsive behavior, contrast, keyboard flows, and accessibility are not claimed as observed.

## Governing thesis

MilerDev is a Thai-first coding studio and learning platform that helps learners choose, trust, buy, and complete practical courses through editorial sequence, workbench-like comparison, calm technical precision, and authentic course, lesson, code, and project evidence anchored by MilerDev blue.

The structural influence is an editorial sequence with task-specific workbench grids. The expression is precise, direct, and encouraging rather than ornamental. The product-native motif is visible learning evidence: code, lesson progress, course facts, previews, project work, and clear transaction state.

## Source precedence

When sources disagree, use this order:

1. Product behavior, accessibility, data truth, authorization, and safety rules in AGENTS.md and the implementation.
2. Semantic color intent in milerdev-color-palette.md.
3. Executable foundation and semantic tokens in src/app/globals.css.
4. Shared component behavior and the nearest route/component stylesheet.
5. This document as rationale, naming, and cross-surface guidance.

Do not “fix” a difference merely because this document names a preferred pattern. First determine whether it is intentional adaptation, legacy drift, or a new requirement. Exact values belong in CSS; duplicate them here only when they define an interoperable contract.

## Brand signals

| Signal | Treatment | Contract |
|---|---|---|
| MilerDev blue #00ABFF | Preserve | Identity, primary action, progress, focus, links, and selected state; not decoration on every surface. |
| Thai-first voice and Prompt type | Preserve | Optimize line height, wrapping, and control space for Thai before compacting density. |
| Real course, lesson, code, preview, price, and project evidence | Preserve | Let authentic material carry hierarchy; do not substitute fake metrics or generic claims. |
| Editorial catalog grids and workbench filters | Preserve and extend | Use clear tracks, rules, metadata, and comparison rather than repeated floating cards. |
| Light public canvas | Preserve | Public routes are light-default. Dark is contextual, not the public brand default. |
| Dark code/video/learning surfaces | Preserve | Use where reduced distraction and technical focus serve the task. |
| Rounded, elevated generic cards | Contain | Valid for legacy/general primitives and admin utilities; not the default composition for editorial directories. |
| Decorative gradient/blob page header | Legacy drift | Do not use as the basis for new surfaces without an explicit direction decision. |

## Color and themes

### Semantic core

The canonical light roles are:

| Role | Token | Value |
|---|---|---:|
| Canvas | --color-background / --canvas | #F7F9FB |
| Surface | --color-surface / --surface | #FFFFFF |
| Surface hover | --color-surface-hover / --surface-subtle | #F0F5F8 |
| Border | --color-border / --line | #D8E1E8 |
| Primary text | --color-text-primary / --ink | #111820 |
| Secondary text | --color-text-secondary / --ink-soft | #52616D |
| Muted text | --color-text-muted / --ink-muted | #7A8995 |
| Accent | --color-accent / --accent | #00ABFF |
| Accent hover | --color-accent-hover | #008ED6 |
| Accent pressed | --color-accent-pressed / light --accent-strong | #0075B3 |
| Accent soft | --color-accent-soft / --accent-soft | #E0F5FF |
| Success | --color-success | #22C55E |
| Warning | --color-warning | #F59E0B |
| Error/destructive | --color-error | #F43F5E |
| Promotion | --color-promo | #C5163A |

Use semantic roles in components. Keep foreground/background pairs explicit, preserve non-color cues for status, and use promotion red only for real offers or active discounts.

The dark role set in src/app/globals.css uses #080B0F canvas, #10151C surface, #17202A hover/raised surface, #26313D border, #F5F8FA primary text, #9AA8B5 secondary text, and #657483 muted text. It is intended for learning, code, and media focus contexts. The root shell currently supplies a light public theme through src/app/layout.tsx.

Admin uses a deliberate --admin-* namespace in src/app/admin/admin-theme.css. Preserve that operational surface until separately authorized convergence proves shared tokens can replace it without reducing density or state clarity.

## Typography

Prompt is the display, body, and UI family, loaded for Thai and Latin in src/app/layout.tsx. Inter is the Latin fallback. Code and technical metadata use --font-code: Fira Code, JetBrains Mono, Cascadia Code, then monospace.

Use the implemented roles before adding a new size:

| Role | Token | Size | Line height |
|---|---|---:|---:|
| Caption | --text-caption | 0.75rem | Contextual |
| Small body/label | --text-body-sm | 0.875rem | Contextual |
| Body | --text-body | 1rem | --leading-body: 1.65 |
| Thai body | Body roles | Inherited | --leading-thai: 1.75 |
| Large body | --text-body-lg | 1.125rem | Contextual |
| H3 | --text-h3 | 1.375rem | --leading-heading: 1.32 |
| H2 | --text-h2 | 1.75rem | --leading-heading: 1.32 |
| H1 | --text-h1 | 2.25rem | --leading-tight: 1.25 |
| Display | --text-display-lg / --text-display-xl | 2.75rem / 3.5rem | Surface-specific |

Large editorial headings may use responsive clamp values and tighter tracking, as on Home, Courses, and Blog. Keep body measure near --measure-prose: 68ch; route-local lead text commonly narrows to 45–58ch. Use mono only for code, counts, indices, route-like labels, and technical metadata.

## Layout, grid, and spacing

The shared .container is 1200px maximum with 24px inline padding. It is the default alignment anchor. Home may expand to 1280px for sections and 1480px for its split hero; Footer uses a 1240px track. These are intentional composition ranges, not three interchangeable global containers.

The foundation spacing sequence is 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, and 80px. Prefer these values or a responsive clamp between them. Default sections use generous vertical rhythm; dense operational and learning surfaces may compress it when task continuity matters.

Grid visibility follows the task:

- Home: quiet/invisible alignment with one dominant statement and code/project evidence.
- Courses and Blog: visible or quiet editorial tracks, flat rules, numbered or mono metadata, and asymmetric content/evidence columns.
- Filters and admin: explicit workbench tracks with stable control placement.
- Learning: task-flow grid organized around lesson context, progress, video/code, and navigation.
- Mobile: replace wide tracks with priority order; never preserve empty columns merely to mimic desktop.

## Shape, surface, and depth

Foundation radii are 4, 6, 8, 12, and 16px. Foundation shadows are --shadow-sm and --shadow-md. Use them only to explain elevation, focus, or an operational layer.

Editorial catalog surfaces prefer square controls, flat cards, border adjacency, and restrained hover color. Generic .card remains rounded and lightly elevated, while admin cards use 8–16px radii and controlled shadows. A local stylesheet may deliberately override generic card grammar; do not remove that override in the name of consistency.

Borders explain containment, comparison, sequence, and sticky/adjacent regions. Avoid combining a strong border, large radius, heavy shadow, and gradient on one component without a product reason.

## Component and state grammar

### Actions

- Global actions have at least a 44px target; directory/filter actions commonly use 48px.
- Name variants by purpose: primary, secondary/quiet, and destructive. Promotion is content state, not a button style.
- Primary public actions may use accent blue or near-black when the composition needs a stronger editorial anchor.
- Hover movement is restrained to roughly 1–2px; active and selected states must remain visible without motion.
- Use the shared focus ring or the equivalent 3px accent outline with offset.

### Cards, rows, and evidence

- Use cards when an item is independently selectable; use bordered rows when comparison, sequence, or scan speed is primary.
- Course cards reserve 16:9 media, expose title and useful facts, support missing media, clamp long summaries, and keep the action relationship clear.
- Blog feature and article rows let imagery, date, topic, excerpt, and reading evidence establish hierarchy.
- Bundle and course commerce surfaces must keep price, discount, included content, enrollment state, and recovery behavior truthful. Visual treatment never changes payment or enrollment authority.

### Forms and feedback

- Labels stay visible. Inputs and selects use at least 44px targets, clear borders, and explicit focus.
- Learner-facing text inputs, textareas, and form actions inherit their base anatomy and states from `src/components/ui/FormControls.tsx`; use square geometry across Auth, Contact, Profile, and Settings, with surface variants changing density and background rather than corner radius.
- Preserve valid input across errors where the existing flow supports recovery.
- Loading, empty, error, success, disabled, selected, and destructive states are part of the component contract, not follow-up polish.
- Toasts, dialogs, and confirmation flows inherit semantics from src/components/ui; destructive actions require wording and confirmation proportional to risk.

### Navigation and orientation

- Public navigation, footer, breadcrumbs, progress, current page, and current lesson provide orientation.
- Responsive navigation must preserve keyboard and touch access, visible focus, accessible names, and the same underlying destinations.
- Sticky rails or headers must not obscure focused content.

## Surface matrix

| Surface | Lead material | Structural rule | Intentional adaptation |
|---|---|---|---|
| Home/marketing | Value proposition, code workspace, projects, course evidence | Expressive split hero and varied editorial pacing | Oversized display type and near-black primary CTA may lead over accent blue. |
| Courses/catalog | Search, filters, course facts, previews, bundles | Visible workbench grid with flat rows/cards and stable counts | Square controls and border adjacency override generic rounded cards. |
| Blog/content | Article image, title, excerpt, topic, date | Editorial feature plus scannable indexed rows | Reading order and measure take priority over card uniformity. |
| Course/bundle detail | Curriculum, proof, price, access state | Evidence column plus transaction rail where implemented | Commerce emphasis may use promo/status colors only for truthful state. |
| Learning workspace | Video/code, lesson list, progress, completion | Dense task-flow shell with persistent orientation | Contextual dark surfaces and mono metadata support focus. |
| Admin | Operational state, forms, tables, actions | Dense utility grid and explicit surface cards | Separate --admin-* tokens, smaller type, more contained elevation. |
| Auth/support/legal | Form or long-form content | Controlled measure and simple sequence | Favor clarity and recovery over marketing composition. |

## Responsive behavior

Use the nearest surface breakpoint already implemented. Common transitions occur around 1024/960/900px, 768/767px, 640px, and occasionally 420px. Do not introduce a new global breakpoint merely to correct one component.

At narrower ranges:

- Reorder by task priority, then collapse columns.
- Turn side filters and rails into readable full-width sequences without losing labels or state.
- Preserve 44px minimum interactive targets and comfortable Thai wrapping.
- Let grids become one column when evidence would otherwise become unreadable; two columns are acceptable only when content remains useful.
- Reserve media aspect ratio and prevent horizontal overflow.
- Test long Thai labels, dynamic counts, empty results, missing imagery, zoom, keyboard focus, and touch operation.

## Media

Course and article media generally use reserved aspect ratios, commonly 16:9, with object-fit: cover. Logo artwork uses contain behavior. Every media component needs a meaningful fallback or reserved empty state so loading or missing assets do not collapse hierarchy.

Give real product work enough scale to act as evidence. Do not imply clients, outcomes, testimonials, learner counts, or project results that the product cannot substantiate. Decorative media must be ignored by assistive technology; informative media needs useful Thai alternative text.

## Motion

Motion explains feedback, causality, or spatial change. Existing interaction timing is generally 160–240ms with restrained translation or image scale. Longer ambient motion is exceptional.

Every new animation must have a prefers-reduced-motion treatment. Reduced motion must preserve state changes, progress, and completion feedback. Do not use entrance animation to hide essential content or delay the primary action.

## Accessibility and content resilience

- Preserve semantic landmarks, heading order, labels, lists, links, buttons, and table semantics.
- Keep focus visible and unobscured across public navigation, dialogs, sticky regions, learning rails, and admin tools.
- Never rely on color alone for selected, success, warning, error, locked, or destructive state.
- Use Thai-appropriate line height and allow translated labels, prices, dates, and dynamic data to wrap without clipping.
- Maintain text/background and state contrast across supported themes, forced colors, and disabled states.
- Treat automated checks as technical evidence, not proof of usability, accessibility compliance, or user understanding.

## Known drift and exceptions

- src/components/layout/PageHeader.tsx hardcodes blue/violet colors, rounded badge styling, blob gradients, and entrance/ambient animations instead of using the semantic system. Treat it as legacy drift unless a route explicitly retains that direction; new work should not copy it.
- Global .card and .btn primitives use rounded, lightly elevated treatment, while newer Courses/Blog/Bundle editorial surfaces use square, flat composition. Both exist; choose by task, not by whichever class is easiest.
- Container widths vary by surface. Preserve the stated composition ranges until a rendered audit supports consolidation.
- Admin duplicates some global color and shape values under --admin-*. This is an explicit operational boundary, not evidence that all new surfaces need their own palette.
- The root stylesheet defines both light and dark semantic roles, but public delivery is light-default. Do not infer a site-wide dark-mode requirement.

## Change protocol

Before changing the system:

1. Inspect this contract, the relevant source, and representative rendered desktop/mobile states.
2. Classify the direction as preserved, evolved, or replaced and obtain alignment for thesis-level change.
3. Update semantic tokens before adding component-local magic values.
4. Inventory default, hover, focus, active, selected, disabled, loading, empty, error, success, and destructive states that apply.
5. Verify responsive composition, Thai content stress, media loading/fallback, reduced motion, keyboard/touch behavior, and affected business rules.
6. Update this document only when a durable cross-surface rule or intentional exception changes.

## Implementation map

- Palette intent: milerdev-color-palette.md
- Foundation, themes, typography, spacing, shared primitives, learning shells: src/app/globals.css
- Font loading and public theme root: src/app/layout.tsx
- Home composition: src/app/home.module.css
- Courses editorial workbench: src/app/courses/courses.module.css
- Blog editorial index: src/app/blog/blog-index.module.css
- Course detail: src/app/courses/[slug]/course-detail.module.css
- Bundle commerce detail: src/app/bundles/[slug]/bundle-detail.module.css
- Admin system: src/app/admin/admin-theme.css
- Public navigation and footer: src/components/layout/PublicNavbar.tsx, src/components/layout/Footer.module.css
- Feedback and dialog primitives: src/components/ui/Feedback.module.css, src/components/ui/DialogShell.tsx, src/components/ui/ConfirmDialog.tsx
- Learner-facing form controls: src/components/ui/FormControls.tsx, src/components/ui/FormControls.module.css
