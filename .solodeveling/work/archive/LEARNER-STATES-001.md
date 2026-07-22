---
solodeveling_schema: 1
id: LEARNER-STATES-001
status: done
level: Standard
---

# Learner status surfaces

## Intent

Finish the learner-side visual cleanup by making exceptional and transitional routes feel like part of the current MilerDev learning product instead of isolated legacy pages.

Affected users are public visitors who reach a missing or failed route and signed-in learners waiting for the dashboard. The desired outcome is clear orientation, truthful recovery actions, and stable loading structure in the established Thai-first design language.

## Direction

Use a quiet editorial/workbench structure with precise MilerDev blue wayfinding and route, recovery, and learning-progress details as the product-native motif. Preserve the light public shell, Thai-first typography, semantic tokens, 44px interaction targets, keyboard focus, and existing application behavior.

## Scope

- Redesign `src/app/error.tsx` and `src/app/not-found.tsx` as coherent learner-facing status surfaces.
- Redesign `src/app/dashboard/loading.tsx` so its skeleton mirrors the current dashboard header, account navigation, four-stat summary, continuation feature, and course index.
- Add the smallest shared or route-local styling needed without introducing a new dependency or a competing design system.
- Confirm the legacy `PageHeader` component and `.page-header-*` global CSS have no consumers, then remove them.
- Render-audit the changed low-frequency states at representative desktop and mobile widths.

## Out of scope

- Dashboard data queries, authentication, authorization, enrollment, payment, or certificate behavior.
- Admin dashboard redesign.
- Global navigation or footer redesign.
- Copy or layout changes to unrelated loading, empty, or error states.

## Acceptance criteria

1. The 404 surface clearly identifies the missing-route state in Thai, keeps routes to Home and Courses, and renders inside the existing public Navbar/Footer shell.
2. The error surface clearly identifies a recoverable application failure, preserves `reset()` and a safe route Home, and does not display raw error details to the user.
3. Both status surfaces use the established semantic tokens and editorial MilerDev grammar, provide visible keyboard focus, and recompose cleanly at mobile and desktop widths without overflow.
4. Dashboard loading exposes an accessible busy state and structurally matches the current dashboard header, account navigation, four-stat summary, continuation feature, and course index closely enough to limit layout shift.
5. Loading motion respects `prefers-reduced-motion` and skeleton decoration is hidden from assistive technology.
6. `PageHeader.tsx` and the legacy `.page-header-*` CSS/keyframes are removed only after repository-wide search confirms there are no consumers; `PublicPageHeader` remains intact.
7. Focused tests protect recovery actions and loading/status semantics without asserting decorative CSS or component structure; affected lint/build and rendered desktop/mobile checks provide recent evidence.

## Risks and recovery

- A client error boundary may fail again if its replacement depends on fragile providers or data. Keep the surface local, dependency-light, and free of server reads.
- A loading skeleton that diverges from the dashboard can increase perceived layout shift. Match the current content order and responsive transformations.
- Broad CSS deletion could affect an unsearched consumer. Confirm exact class and component references before deletion and restore the scoped diff if a regression appears.

## Alternatives

- Recommended: one shared status-surface grammar plus a dashboard-specific skeleton. This gives coherent recovery states while preserving each route's real job.
- Smallest credible: only replace inline styles with local CSS. This reduces drift but leaves weak orientation and a mismatched dashboard skeleton.
- Do nothing: retains functioning routes but leaves the last learner-facing legacy presentation and avoidable loading shift.

## Next action

Begin the separately scoped admin dashboard redesign only after reviewing the clean learner-side checkpoint and current project risks.

## Implementation plan

1. Add focused server-renderable tests for the 404/status presentation and dashboard loading semantics. Keep the error boundary's client callback covered through a small presentational boundary where practical rather than coupling tests to decorative markup.
2. Create a shared status-surface component and CSS module that accepts state code, eyebrow, title, description, and actions while preserving route-owned Navbar/Footer and `reset()` behavior. Use semantic tokens, explicit focus-visible treatment, a quiet route trace, and responsive single-column recomposition.
3. Replace the inline 404 and error implementations with the shared grammar. Keep the error boundary dependency-light and never render the raw error or digest.
4. Replace dashboard loading inline styles with a route CSS module and semantic skeleton anatomy matching the current dashboard header/nav, four stats, continuation feature, and course rows. Mark the region busy, hide decoration, and disable shimmer under reduced motion.
5. Re-run the exact repository search for `PageHeader` and `.page-header-*`; delete `src/components/layout/PageHeader.tsx` and only the confirmed legacy global keyframes/rules while preserving `PublicPageHeader`.
6. Run focused Vitest files after each slice, then `npm run lint`, `npm run build`, `git diff --check`, and `git status --short` at the checkpoint.
7. Render the 404, forced error boundary, and dashboard loading state at 1440px and 390px widths; inspect overflow, hierarchy, shell continuity, focus/retry behavior, skeleton fidelity, and reduced-motion handling. Record any environment-limited state honestly.

## Verification mapping

- Criteria 1–2: focused semantic/component tests plus browser exercise of 404 links and forced error retry/home actions.
- Criterion 3: CSS/token static inspection and 1440px/390px rendered audit including keyboard focus and horizontal overflow.
- Criteria 4–5: focused loading markup test, source inspection against dashboard anatomy, rendered responsive loading audit, and reduced-motion emulation.
- Criterion 6: repository-wide `rg` before and after deletion plus lint/build regression gates.
- Criterion 7: recent command outputs and screenshots/observations recorded in the cumulative evidence file.

## Recovery

All product edits are local and reversible. If the shared status component causes an error-boundary regression, keep the CSS module but inline the dependency-light presentation back into `error.tsx`. If skeleton fidelity fails, revert only the loading slice. Restore PageHeader code only if a consumer or build failure disproves the search evidence.
