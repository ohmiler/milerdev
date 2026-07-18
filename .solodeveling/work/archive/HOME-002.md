---
solodeveling_schema: 1
---

# HOME-002 — Unlock and redesign the homepage system

## Goal

Remove obsolete design locks and redesign the complete public homepage system as one coherent, human-led editorial learning journey.

## Classification

- Level: Standard.
- Lifecycle: Done.
- Recovery: Revert only the scoped guidance, palette, homepage presentation, and homepage test edits; no data, schema, auth, enrollment, or payment rollback is required.

## Users and outcome

- Primary users: Thai learners deciding where and how to begin learning code.
- Outcome: The homepage should feel recognizably MilerDev without inheriting the prior Swiss technical grammar, and should foreground real learning, teaching, course, and workshop evidence.

## Design thesis

An editorial learning trail for Thai beginners who do not yet know where to start, paced by confident, friendly guidance and anchored by real teaching, course, and workshop evidence rather than decorative cards.

## Preserve

- Existing data fetching, routes, course and bundle calculations, authentication, enrollment, and payment behavior.
- Thai content meaning, MilerDev logo, IBM Plex Sans Thai body typography, light-default public surfaces, `#00abff` brand recognition, keyboard support, touch targets, and reduced-motion behavior.
- User changes outside the scoped files.

## Replace or evolve

- Swiss 12-column indexes, ruled metadata rails, decorative monospace labels, VS Code styling used as a page-wide brand motif, repetitive hard-edged section grids, and exact visual source contracts in tests.
- Existing presentational components, class names, and homepage-specific CSS may be replaced when they encode the obsolete direction.
- The code editor may remain as authentic coding evidence, but it must not dictate the visual language of the entire page.

## Scope

- Root `AGENTS.md` workflow and safety guidance, with visual decisions delegated to Gridgeist rather than duplicated as repository policy.
- Remove `milerdev-color-palette.md` from the repository sources-of-truth gate; the file may remain contextual brand evidence.
- Public homepage composition, home-specific components, public navbar, and footer presentation.
- Tests that assert source strings, class names, CSS layout, colors, radius, component structure, or the Swiss/VS Code direction.
- Focused browser behavior and verification evidence without presentation or decorative-copy contracts.

## Out of scope

- Non-home public routes, dashboard, learning, admin, authentication, payment, enrollment, database schema, and API behavior.
- Restoring pre-existing deleted design documentation.
- Adding dependencies or fabricating learner, customer, course, or outcome claims.

## Acceptance

- `AGENTS.md` contains only a short Gridgeist routing rule for visual work and does not prescribe palette, typography, grid, layout, composition, or component presentation.
- `milerdev-color-palette.md` is no longer named as an authoritative repository source; Gridgeist may treat it as contextual brand evidence rather than a fixed specification.
- Homepage visual hierarchy is governed by the new thesis across hero, course discovery, bundle, real-world proof, affiliate content, closing action, navbar, and footer.
- Decorative Swiss/technical metadata and page-wide VS Code branding are removed; genuine code metadata remains only inside coding evidence.
- Old homepage selectors and inline styles superseded by the redesign are removed rather than hidden under additive overrides.
- Tests protect product behavior and risk boundaries without asserting class names, exact CSS, component structure, decorative copy, or visual tokens.
- Authentication, payment, course, and other business-flow browser tests remain intact.
- Relevant tests, lint, build, responsive/static inspection, `git diff --check`, and `git status --short` are recorded with limitations.

## Risks

- The worktree already contains overlapping user changes to homepage code and tests; preserve their behavior and factual corrections while replacing presentation.
- Removing brittle tests can reduce coverage if interaction assertions are not retained or replaced.
- Browser rendering is available through the installed Chrome channel; full-page capture requires deliberate scrolling or eager image loading before below-fold imagery can be judged.

## Alternatives considered

- Recommended: one homepage-system redesign plus test/policy cleanup, producing a coherent direction.
- Smaller option: change only `AGENTS.md`, palette guidance, and tests; rejected because the current implementation would remain the strongest brand signal.
- Do nothing: rejected because repeated refinements have already converged on the obsolete direction.

## Plan

1. Reduce `AGENTS.md` to essential workflow and safety rules, delegate visual decisions to Gridgeist, and remove the palette file from the sources-of-truth gate.
2. Rebuild the homepage JSX as one narrative sequence while preserving all current queries, calculations, routes, factual copy corrections, empty states, and affiliate disclosure behavior.
3. Introduce one scoped homepage style system with a quiet grid, warm editorial surfaces, image-led evidence, responsive recomposition, focus states, and reduced motion; remove superseded homepage selectors and embedded page styles instead of overriding them.
4. Redesign `PublicNavbar`, `Footer`, `ShowcaseGallery`, and `AffiliateBannerCarousel` presentation to follow the same thesis while preserving their interaction and session behavior. Keep `HeroCodeEditor` as bounded coding evidence rather than a page-wide motif.
5. Delete source-inspection visual tests and retain only focused browser checks for route behavior, responsive overflow, navigation, and keyboard interaction; preserve business-flow suites.
6. Run focused homepage tests after each slice, then lint, build, static responsive inspection, obsolete-pattern searches, `git diff --check`, `git status --short`, and memory reconciliation. Record the missing rendered-browser review if the backend remains unavailable.

## Verification mapping

- Policy acceptance: review the scoped `AGENTS.md` diff and search for removed visual prescriptions; do not create a test that freezes the policy wording.
- Coherent homepage system: static component/CSS inspection plus rendered desktop/mobile review when capability exists.
- Removed technical grammar and stale CSS: repository searches for obsolete labels/classes/selectors and review of the scoped diff.
- Preserved behavior: focused Vitest files for queries, empty states, gallery, affiliate controls, reduced motion, and navigation/footer semantics.
- Engineering gate: lint, build, `git diff --check`, and `git status --short`.

## Next executable action

Completed. The implementation, rendered review, interaction checks, and engineering gates are recorded in `evidence/HOME-002.md`.
