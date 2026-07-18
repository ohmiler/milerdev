---
solodeveling_schema: 1
---

# HOME-003 — Apply the light-default MilerDev palette

## Goal

Apply `milerdev-color-palette.md` to the redesigned public homepage with the light theme as the default, without changing its editorial-trail composition or product behavior.

## Classification

- Level: Standard.
- Lifecycle: Done.
- Recovery: Revert only the scoped homepage and footer color-system edits; no data, route, auth, commerce, or schema rollback is required.

## Scope

- `src/app/home.module.css` homepage semantic colors.
- `ShowcaseGallery.tsx`, `AffiliateBannerCarousel.tsx`, and `Footer.module.css` public homepage-adjacent surfaces.
- Rendered desktop/mobile review and existing homepage behavior checks.

## Out of scope

- Layout, content order, data queries, routes, interactions, course/payment behavior, admin/dashboard/learning surfaces, and the dark code editor focus context.
- Making the palette a universal design-layout specification.

## Acceptance

- The homepage explicitly defaults to `color-scheme: light` and consumes the palette tokens for background, surface, hover surface, border, text, accent, and focus roles.
- Public marketing sections, gallery, affiliate fallback, closing area, and footer use light-theme surfaces; dark treatment remains only for authentic code and the modal image-viewing context.
- Decorative yellow, coral, mint, and unrelated near-black color fields are removed from the scoped public presentation.
- Existing editorial hierarchy, responsive composition, data, links, navigation, gallery, affiliate disclosure, and fallback behavior remain intact.
- Desktop and mobile renders show no unintended dark-mode inheritance or horizontal overflow.
- Focused E2E, unit regression, lint, build, `git diff --check`, and worktree review are recorded.

## Risks

- Removing high-contrast dark sections may flatten hierarchy; preserve section distinction through palette surfaces, borders, scale, and spacing.
- Dynamic affiliate images may remain unavailable in the verification environment; the fallback must still use light-theme tokens and remain legible.
- Preserve unrelated dirty-worktree changes.

## Plan

1. Replace homepage-local color literals with semantic aliases backed by the light palette and set the page color scheme explicitly.
2. Convert bundle, proof, gallery, affiliate fallback, closing, and footer surfaces to the light palette while preserving hierarchy and interaction states.
3. Search the scoped files for removed supporting colors and inspect any remaining dark literals to confirm they belong only to the lightbox or authentic code context.
4. Render desktop/mobile states, exercise the homepage flows, then run regression, lint, build, and repository integrity checks.

## Verification mapping

- Palette/default acceptance: scoped token and color-literal inspection plus computed browser styles.
- Visual hierarchy and responsiveness: rendered desktop/mobile observation with overflow measurements.
- Preserved behavior: existing homepage Playwright flows.
- Engineering gates: unit tests, lint, build, `git diff --check`, and `git status --short`.

## Next executable action

Completed. Palette mapping, rendered observation, interaction checks, and engineering gates are recorded in `evidence/HOME-003.md`.
