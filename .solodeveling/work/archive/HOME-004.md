---
solodeveling_schema: 1
---

# HOME-004 — Make the animated code editor the hero visual lead

## Goal

Keep the approved homepage message while replacing the hero's image-led right side with an animated, MilerDev-palette code editor that demonstrates learning by doing.

## Classification

- Level: Standard.
- Lifecycle: Done.
- Recovery: Revert only the scoped hero composition and `HeroCodeEditor` presentation edits; no data, route, auth, commerce, or schema rollback is required.

## Design thesis

For Thai learners starting to code, pair the clear learning promise on the left with a live workspace on the right, using calm typing and run-state feedback as the product-native motif and MilerDev blue as a functional guide rather than ambient decoration.

## Scope

- `src/app/page.tsx` hero composition only.
- `src/app/home.module.css` hero/editor placement and responsive recomposition.
- `src/components/home/HeroCodeEditor.tsx` editor palette, animation presentation, tabs, status, and reduced-motion behavior.
- Focused homepage render and interaction verification.

## Out of scope

- Hero copy, CTA destinations, course data, other homepage sections, navigation, auth, commerce, database behavior, or a site-wide editor abstraction.

## Acceptance

- Desktop hero presents the existing message as the dominant left track and the animated editor as the right visual lead; the former hero photo is removed from this section.
- Editor chrome and sample CSS use the documented MilerDev palette, with the dark focus-context tokens bounded inside the editor while the page remains light.
- Animation visibly types real sample HTML/CSS/JavaScript and rotates snippets without requiring interaction.
- Tabs remain operable by pointer and keyboard with selected and focus states; reduced-motion shows complete code without auto-typing or cursor animation.
- Tablet/mobile recomposes into a readable single-column order with no clipped controls or horizontal page overflow.
- Recent focused E2E, unit regression, lint, build, render inspection, `git diff --check`, and worktree review are recorded.

## Risks

- The editor can compete with the large Thai headline; constrain its chrome and use one accent rail to preserve hierarchy.
- Animated code can distract or create motion sensitivity; keep motion causal and honor `prefers-reduced-motion`.
- Long code lines require internal scrolling without causing page overflow.
- Preserve unrelated dirty-worktree changes.

## Plan

1. Recompose the hero into left copy, right editor, and a shared learning-rhythm row while preserving copy and links.
2. Map editor chrome, syntax roles, sample CSS, focus, current-line, cursor, status, and scrollbar colors to the documented palette.
3. Render desktop/tablet/mobile states and exercise automatic typing, tabs, keyboard navigation, and reduced motion.
4. Run focused E2E and engineering gates, then record evidence and archive the completed work item.

## Verification mapping

- Composition and palette: scoped diff plus browser computed styles and screenshots.
- Animation/reduced motion: timed browser observation under normal and reduced-motion preferences.
- Interaction: pointer/keyboard tab exercise and homepage Playwright flow.
- Engineering gates: unit tests, lint, build, `git diff --check`, and `git status --short`.

## Next executable action

Completed. Implementation, rendered interaction checks, and engineering gates are recorded in `evidence/HOME-004.md`.
