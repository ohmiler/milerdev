---
solodeveling_schema: 1
---

# HOME-001 — Light-default homepage redesign

## Goal

Apply the approved palette, establish durable agent workflow guidance, and refine the homepage into a calm, precise learner decision flow.

## Scope

- Semantic color tokens and public light-default behavior.
- Root `AGENTS.md` workflow rules for Gridgeist and Solodeveling.
- Homepage and its home-specific components/styles.
- Focused tests and verification evidence.

## Classification

- Level: Standard.
- Lifecycle: Done.
- Recovery: Revert only the scoped token, guidance, homepage, component, and test edits; no data or schema rollback is required.

## Out of scope

- Authentication, authorization, payment, enrollment, database schema, and API behavior.
- Redesigning non-home routes.
- Restoring or modifying pre-existing deleted design documentation.

## Acceptance

- Public UI uses the light palette from `milerdev-color-palette.md` by default.
- `AGENTS.md` requires Solodeveling for project work and Gridgeist for UI design/review while preserving safety rules.
- Homepage course claims match their actual selection logic and do not fabricate outcomes.
- Bundle presentation is editorial, comparison-led, and avoids false urgency.
- Affiliate content is secondary, disclosed, and motion-safe.
- Important mobile controls meet the project touch-target baseline.
- Relevant tests, lint, build, and diff checks are recorded with any limitations.

## Preserved behavior

- Existing routes, database queries, bundle calculations, links, authentication, enrollment, and payment flows.
- Existing user changes outside the scoped files.

## Plan

1. Bridge `milerdev-color-palette.md` into `src/app/globals.css`, keeping compatibility aliases while making `:root` the complete light default.
2. Rewrite `AGENTS.md` around Solodeveling delivery and Gridgeist UI decisions while retaining production, security, payment, database, secret, testing, and Git constraints.
3. Update `src/app/page.tsx` and `src/components/course/CourseCard.tsx` so homepage labels and outcomes match actual data rather than inferred popularity or title keywords.
4. Recompose the bundle section in `src/app/page.tsx` as an editorial value comparison without decorative pills, gradients, or false urgency.
5. Make `src/components/home/AffiliateBannerCarousel.tsx` a disclosed secondary resource surface with reduced-motion-aware autoplay and quiet alignment.
6. Improve `src/components/home/HeroCodeEditor.tsx` mobile touch targets and tab keyboard behavior.
7. Update focused homepage tests, run the affected Vitest files, then lint, build, available responsive rendering, `git diff --check`, and memory validation.
