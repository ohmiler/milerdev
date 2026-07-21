---
solodeveling_schema: 1
---

# DESIGN-002: Portable design system contract

- Status: done
- Level: Standard
- Goal: Create a root `DESIGN.md` that records the design system already expressed by MilerDev's implementation so future UI work can preserve a coherent, production-native direction.
- Primary users: Contributors designing or reviewing public, learning, commerce, and admin surfaces.
- Desired outcome: A compact, source-mapped contract that distinguishes shared rules, surface adaptations, intentional exceptions, and unverified rendered behavior.

## Scope

- Derive one brand thesis from the current palette, global tokens, shared layout primitives, representative public catalog/content/commerce surfaces, learning surfaces, and the admin theme.
- Document color and theme roles, typography, layout and spacing, shape and surface grammar, shared component and state behavior, responsive rules, media, motion, and accessibility constraints.
- Map claims to authoritative implementation paths and label implementation drift or exceptions without silently redefining the product.
- Keep this slice documentation-only.

## Out of scope

- Refactoring components, CSS, tokens, routes, copy, behavior, authorization, commerce, or data.
- Declaring visual, interaction, or accessibility behavior verified when it was only inspected statically.
- Replacing `milerdev-color-palette.md`, `src/app/globals.css`, or surface-local implementation as an executable source of truth.

## Decisions

- Direction is brand-derived, not a replacement redesign: Thai-first coding education, editorial/workbench structure, authentic course/lesson/project evidence, and MilerDev blue as the identity and state anchor.
- Public UI remains light-default. Dark surfaces are contextual focus tools for code, video, and learning workspaces rather than automatic technical branding.
- `DESIGN.md` is an interoperability contract. Exact implemented values remain owned by CSS and component source; disagreements are documented as drift or intentional surface adaptations.
- Existing dirty files are user-owned and remain untouched.

## Acceptance criteria

- AC1: Root `DESIGN.md` states a governing brand thesis and source precedence grounded in current repository evidence.
- AC2: The contract covers color/themes, typography, layout/grid/spacing, shape/surface/depth, component/state grammar, responsive behavior, media, motion, and accessibility.
- AC3: The contract describes public, learning, commerce, content, and admin surface adaptations plus intentional exceptions and known drift.
- AC4: Exact tokens and important rules map to current authoritative paths, and static inspection is clearly separated from rendered verification.
- AC5: No application implementation or product behavior changes in this slice.
- AC6: Memory validates, documentation integrity checks pass, and final evidence records limitations.

## Risks

- A documentation contract can accidentally canonize one-off CSS; mitigate by marking repeated shared rules separately from local exceptions and drift.
- Browser observation is unavailable in the current session; do not claim rendered, responsive, interaction, or accessibility verification.
- Thai source output can display mojibake in the shell; do not edit Thai product copy in this slice.

## Plan

1. Reconcile the palette document, global tokens, root shell, shared layout primitives, and representative surface CSS/components.
2. Author `DESIGN.md` as a concise governing contract with source maps and explicit implementation status.
3. Check required sections and source references, inspect the scoped diff, run memory validation if available, then run `git diff --check` and `git status --short`.

## Verification mapping

| Criterion | Planned evidence |
|---|---|
| AC1 | Static review of thesis, precedence, and cited source paths |
| AC2 | Required-section/content check against the contract dimensions |
| AC3 | Static review of the surface matrix, exceptions, and drift notes |
| AC4 | Source-path existence check and explicit verification-status language |
| AC5 | Scoped Git diff showing only `DESIGN.md` and Solodeveling artifacts from this work |
| AC6 | Memory validation when a validator is available, `git diff --check`, and final Git status |

## Rollback

Remove `DESIGN.md` and the DESIGN-002 memory artifacts, then restore `state.md` to its prior no-active-work summary. No application rollback is required because this slice changes no runtime code.
