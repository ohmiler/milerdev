---
solodeveling_schema: 1
---

# HOME-009 - Surface real course decision evidence on Home

## Goal

Help Thai learners choose a first or next course from real MilerDev data by surfacing tags, total learning time, instructor identity, and free-preview availability on the Home course cards.

## Classification

- Level: Standard.
- Lifecycle: Done.
- Recovery: Revert the scoped Home query, optional CourseCard metadata, Home card styling, and focused checks. No schema or stored data changes are required.

## Direction

For Thai learners who are unsure where to begin, turn the Home course area into a calm decision surface using real curriculum metadata and a low-risk preview cue while preserving MilerDev's technical-friendly grid, pricing truth, and existing course navigation.

## Scope

- Extend the Home course query with existing instructor, tag, duration, and free-preview data.
- Pass only truthful, available metadata into the shared CourseCard.
- Add optional duration and preview presentation without changing other CourseCard consumers when those props are absent.
- Refine the Home course card hierarchy so decision evidence remains readable on desktop and mobile.
- Preserve course pricing, promotions, routes, enrollment behavior, hero, editor, workspace, proof, gallery, CTA, navbar, and footer.

## Out of scope

- Database schema or migration changes.
- Invented levels, prerequisites, outcomes, projects, learner results, paths, or metrics.
- Search, catalog facets, dashboard changes, course-detail redesign, authentication, enrollment, or payment behavior.

## Acceptance

- Home course cards show existing tags, total duration when greater than zero, instructor when available, and a free-preview cue when a preview lesson exists.
- Missing metadata degrades cleanly without empty labels or fabricated fallbacks.
- Price and promotion truth remains unchanged.
- The full course card remains a single valid link with no nested interactive control.
- Course cards remain readable without horizontal overflow at representative mobile and desktop widths.
- Focus, hover, preview CTA text, and reduced-motion behavior remain coherent.
- Focused tests, lint, build, Playwright interaction/render checks, and diff checks are recorded.

## Plan

1. Aggregate existing lesson statistics and join instructor/tags in the Home query.
2. Add optional duration and preview evidence to CourseCard and align Home styling.
3. Add the narrowest meaningful regression coverage and verify responsive renders and interaction states with Playwright.

## Completion

- Scoped implementation and verification completed on 2026-07-19.
- Acceptance evidence is recorded in `../evidence/HOME-009.md`.
- Existing HOME-007 and HOME-008 changes were preserved; no commit was created.
