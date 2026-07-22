---
solodeveling_schema: 1
id: BRAND-COLOR-001
status: done
level: Standard
---

# MilerDev blue path

## Intent

Make `#00ABFF` read as MilerDev's primary brand color across the public and learner journey instead of appearing only as a small accent, while preserving the established Thai-first editorial/workbench structure and product behavior.

## Direction

User-confirmed: preserve the quiet editorial/workbench grid, light public canvas, contextual dark learning surfaces, authentic course/lesson evidence, square controls, and restrained motion. Evolve MilerDev blue into the functional path that leads primary actions, progress, selected/current state, and recovery rather than using it as broad decoration.

## Scope

- Add an explicit semantic foreground token for content rendered on `#00ABFF` and document the accessible pair.
- Apply it to public/learner primary actions that currently use white on `#00ABFF`.
- Make the Home primary CTA use MilerDev blue instead of near-black while preserving its hierarchy and states.
- Strengthen meaningful blue anchors in course choice, course/bundle purchase, learning progress/current lesson, auth, and recovery surfaces.
- Replace directly competing legacy blue values only in affected public/learner presentation code.
- Add focused regression coverage and render-audit representative desktop/mobile surfaces.

## Out of scope

- Admin palette convergence or redesign.
- Authentication, authorization, enrollment, payment behavior, APIs, database/schema, migrations, providers, or production data.
- Recoloring semantic success, warning, error, destructive, or promotion states.
- Typography/layout rewrite, dependencies, or generated images.

## Acceptance criteria

1. The global contract exposes an on-accent foreground with at least 4.5:1 contrast on `#00ABFF` and scoped primary actions inherit it.
2. Home's primary CTA leads with MilerDev blue and retains distinct hover, active, focus-visible, and reduced-motion behavior.
3. Course selection, course/bundle enrollment, auth, recovery/status, and learning orientation use a coherent blue action/progress/current-state path without behavior changes.
4. No scoped primary action renders white normal-size text directly on `#00ABFF`; darker hover/pressed blue may use white where contrast is sufficient.
5. Semantic status roles remain distinct and Admin remains outside the changed scope.
6. Representative Home, Courses, course detail, Auth, Learning, and status surfaces remain responsive, overflow-free, keyboard-visible, and contextually themed.
7. Focused tests, affected regressions, lint, build, contrast checks, diff integrity, and scoped Git review provide recent evidence.

## Risks and recovery

- Limit large blue areas to functional actions, progress, selected/current state, and product wayfinding so hierarchy does not become promotional.
- Use the explicit dark on-accent foreground because white on `#00ABFF` is only about 2.54:1 contrast.
- Exclude semantic status colors and inspect every changed selector in context.
- Keep aliases backward-compatible and revert token/adoption slices independently if rendered regressions appear.
- Preserve existing dirty `.agents`, `.claude`, `.playwright-cli`, and `output` files.

## Alternatives

- Recommended: accessible on-accent contract plus one functional blue path across representative journey surfaces.
- Smallest credible: recolor Home's CTA only, leaving cross-route inconsistency and contrast defects.
- Do nothing: preserve the current neutral composition and weak brand hierarchy.

## Next action

Archived after all acceptance criteria and project gates were verified on 2026-07-22.

## Implementation plan

1. Add `--color-on-accent: #061923` and the compatibility alias `--accent-foreground` to the light and dark semantic foundations in `src/app/globals.css`. Update `milerdev-color-palette.md` and `DESIGN.md` so exact accent backgrounds pair with the new foreground, while sufficiently dark hover/pressed accent may pair with white.
2. Add `tests/design/brand-color-contract.test.ts` to verify the exact palette value, on-accent contrast threshold, aliases, Home primary-action ownership, and an allowlisted scan that prevents white normal text on exact-accent public/learner actions or fields.
3. Adopt `var(--accent-foreground)` in global/shared public and learner actions and identity fields, including legacy `.btn-primary`, dashboard empty recovery, FormControls, course/bundle enrollment, learner account, status recovery, proof, public content retry, FAQ/About CTA fields, Courses filters, Navbar, and affected Home components. Preserve darker hover/pressed states, disabled behavior, success/error/promo semantics, focus treatment, and 44px targets.
4. Make the Home hero primary action exact accent by default with dark on-accent text, darker accessible hover, and distinct active state. Reconcile the existing exact-accent closing field so its text and secondary action are accessible while its primary action remains a contrasting dark action inside the blue field.
5. Replace directly competing legacy public/learner blues in CourseFilters, CourseReviews, NotificationProvider, rich content, and LearnPageClient with semantic accent roles. Keep completion green, locked/muted states, errors, warnings, and promotion red unchanged. Strengthen only functional learning anchors by modestly increasing progress/current-lesson traces.
6. Add a purchase-path accent edge to the course enrollment rail without changing sticky behavior, content order, prices, request handlers, or payment/enrollment decisions.
7. Run the focused brand contract test after token and adoption slices, then affected component tests and `e2e/public-learning-journey.spec.ts`. At the checkpoint run `npm run lint`, `npm run build`, `git diff --check`, scoped legacy-blue/white-on-accent scans, and `git status --short`.
8. Render Home, Courses, course detail, Auth, Learning, and 404/error surfaces at 1440px and 390px. Inspect hierarchy, color pairing, focus-visible, hover/active where applicable, overflow, contextual light/dark themes, and reduced motion. Record observed evidence separately from static/automated checks.

## Verification mapping

- AC1 and AC4: contrast calculation plus the focused contract test and repository scans.
- AC2: focused contract test and Home desktop/mobile render with primary default, hover, active, and focus observation.
- AC3: source/diff inspection, affected component regressions, public learning E2E, and representative rendered journey audit.
- AC5: scoped path and semantic-color diff review confirming Admin and status roles remain unchanged.
- AC6: 1440px/390px browser audit across the named public/learner surfaces, including overflow, focus, dark/light context, and reduced motion.
- AC7: recent focused tests, affected regressions, lint, build, diff integrity, Git scope review, and structural Solodeveling validation.

## Recovery

All changes are presentation, documentation, tests, and memory only. Revert the shared token/adoption slice, Home brand-moment slice, legacy-blue cleanup slice, and course/learning anchor slice independently if a regression appears. No database, stored data, auth, enrollment, payment, provider, schema, or migration rollback is required.
