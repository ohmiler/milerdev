---
solodeveling_schema: 1
---

# HOME-011 - Unify Home hierarchy and interaction language

## Goal

Help Thai learners reach truthful course choices sooner by recomposing mobile product evidence, making missing course media informative but quiet, and aligning teaching proof and gallery interactions with one Gridgeist system.

## Classification

- Level: Standard.
- Lifecycle: Done. Captured, shaped, planned, activated, verified, and archived on 2026-07-19.
- Recovery: Revert the scoped Home composition, CourseCard fallback, gallery lightbox, narrative copy, tests, and this work/evidence pair. No schema, stored data, route, authentication, enrollment, or payment changes are required.

## Direction

For Thai learners choosing where to begin, use an editorial task sequence from promise to compact product proof to truthful courses to teaching evidence, expressed through MilerDev's paper/ink/blue palette, square geometry, and real code, progress, course, and classroom material.

## Scope

- Recompose the Home hero code-to-result demo and learning workspace at narrow widths so they preserve the essential story without carrying the full desktop density.
- Replace generic missing-thumbnail media with a course-native fallback derived only from existing course data and reduce its visual dominance.
- Distinguish the teaching-method proof from the real-event gallery through content and composition.
- Replace the gallery lightbox's generic rounded/inline styling with token-based square controls and structured image metadata.
- Preserve keyboard and pointer interaction, focus recovery, reduced motion, truthful pricing and course evidence, routes, navigation, footer, accessibility semantics, authentication, enrollment, and payment behavior.

## Out of scope

- New course thumbnails, invented outcomes, testimonials, metrics, or teaching claims.
- Database schema, migrations, course data, or admin changes.
- Course-detail, catalog, dashboard, authentication, enrollment, payment, navbar, or footer redesign.
- New dependencies or a broader global CSS cleanup.

## Acceptance

- At 390 CSS pixels, the hero and workspace are visibly recomposed and the featured-course section begins within approximately three 844-pixel viewports while code-to-result, active lesson, video, and progress evidence remain understandable.
- Missing course thumbnails use only existing title/tag data, are labeled as course material rather than real imagery, and no longer render as a generic play icon over a dominant blue field.
- Teaching proof explains how field experience becomes lesson structure; the gallery remains distinct evidence of real teaching activity.
- The gallery lightbox uses the shared square/token system, exposes the current image label and position, remains usable at representative mobile and desktop widths, closes with Escape, restores focus, and respects reduced motion.
- Home has no horizontal page overflow at 390, 768, 1280, and 1600 CSS pixels.
- Focused component tests, affected Home E2E, lint, build, diff checks, and rendered observations are recorded.

## Plan

1. Add focused regression expectations for the course fallback, mobile hierarchy, and structured lightbox metadata.
2. Recompose narrow HeroCodeEditor and LearningWorkspacePreview styles without changing their data or interaction behavior.
3. Implement the data-derived CourseCard fallback and Home-specific media hierarchy.
4. Sharpen teaching-method content and rebuild the lightbox surface with tokens and shared geometry while preserving its focus lifecycle.
5. Run focused tests after each slice, then affected/full regressions, lint, build, rendered viewport and interaction checks, and reconcile evidence/state.

## Risks and decisions

- Existing HOME-010 changes are uncommitted and overlap HeroCodeEditor, globals, tests, and state; preserve them and review scoped diffs instead of resetting.
- Responsive density is a hierarchy decision, not content deletion: desktop keeps full product evidence while mobile keeps the smallest complete story.
- Missing media must not imply a real thumbnail or fabricated outcome; only the existing course title and first tag may lead the fallback.
- Lightbox behavior is preserved while its visual implementation changes; focus and keyboard recovery are regression boundaries.
