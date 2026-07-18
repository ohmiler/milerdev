---
solodeveling_schema: 1
---

# HOME-005 — Recompose the homepage as an Editorial Learning IDE

## Goal

Turn the current developer-led homepage into a concise, professional online-learning landing page that keeps MilerDev's code identity while making the real learning product, progression, and teaching evidence visible.

## Classification

- Level: Standard.
- Lifecycle: Done.
- Recovery: Revert only the scoped homepage composition, preview component, and gallery presentation edits. No data, route, auth, commerce, or schema rollback is required.

## Design thesis

For Thai learners who want to turn understanding into working projects, organize the homepage as an editorial learning path with calm technical precision, using the learning workspace and progress trace as the product-native motif.

## Scope

- Recompose `src/app/page.tsx` into a shorter learning-product narrative.
- Add a code-native, explicitly labelled learning-workspace preview based on existing video, curriculum, progress, and resume behavior.
- Preserve and finish the current uncommitted four-column/course-card redesign while making the grid adapt to the actual number of published courses.
- Consolidate teaching proof and reduce the gallery's default footprint while preserving its accessible lightbox.
- Remove bundle and affiliate promotion from the homepage composition without deleting their routes, components, or data.
- Responsive, focus, reduced-motion, empty-state, and representative rendered verification.

## Out of scope

- Editing production/course/bundle/affiliate records, deleting components or routes, authenticated dashboard redesign, learning-player behavior, auth, commerce, database, schema, or migrations.

## Acceptance

- The light-mode hero keeps its Thai promise and animated code editor as the coding motif, with course discovery remaining the primary action.
- A prominent, explicitly labelled learning-workspace preview shows the platform's real product concepts: lesson context, video focus area, curriculum, progress, and resume/next action without pretending to be a live authenticated session.
- Homepage order is concise: hero/method, workspace proof, courses, teaching proof/gallery, and closing action; bundle and affiliate sections are absent from the homepage only.
- Course presentation uses real published data, hides the homepage instructor placeholder by omitting instructor metadata there, and adapts cleanly for one through four available courses.
- Teaching evidence uses existing local images and client logos; the default gallery shows a compact editorial selection while all images remain available in the lightbox.
- Desktop, tablet, and mobile recompose without horizontal page overflow; applicable hover, focus, keyboard lightbox, empty, and reduced-motion states remain coherent.
- Recent focused E2E, lint, build, rendered browser inspection, `git diff --check`, and worktree review are recorded.

## Risks

- A product preview can become decorative fake UI; label it as a preview and use only capabilities already present in the repository.
- Removing commercial sections from Home must not delete their routes/data or change purchasing behavior.
- The existing course-card changes belong to the current user request chain and must be preserved.
- Large media and headings can keep mobile excessively long; reduce default gallery items and vary section density.

## Plan

1. Recompose the homepage data and section order, removing Home-only bundle/affiliate rendering and adding the learning-workspace preview.
2. Implement the preview and shared visual system with the approved palette, explicit progress logic, focus-safe links, and reduced motion.
3. Adapt the course grid by item count and tighten teaching proof/gallery into a shorter evidence sequence.
4. Render desktop/tablet/mobile, exercise primary links, editor tabs, gallery keyboard behavior, reduced motion, and empty/dynamic layouts.
5. Run focused regression, lint, build, diff checks, record evidence, reconcile state, and archive when every acceptance item is supported.

## Verification mapping

- Narrative/product evidence: scoped source review plus desktop/mobile screenshots.
- Course counts and responsive behavior: browser measurement with one-to-four grid classes inferred from real rendered count, plus homepage E2E.
- Interactions: pointer/keyboard checks for editor tabs, course/CTA focus, and gallery dialog recovery.
- Motion/accessibility constraints: reduced-motion browser emulation and semantic snapshot inspection.
- Engineering gates: focused E2E, lint, build, `git diff --check`, and `git status --short`.

## Completion

All acceptance criteria have current implementation, rendered-browser, interaction, responsive, and engineering-gate evidence in `evidence/HOME-005.md`.
