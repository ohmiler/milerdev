---
solodeveling_schema: 1
---

# HOME-006 — Integrate course pricing into the card grid

## Goal

Replace the floating promotional-looking course price badge with a calm, precise price marker that belongs to the course-card structure across public course discovery surfaces.

## Classification

- Level: Standard.
- Lifecycle: Done.
- Recovery: Revert the scoped `CourseCard` markup and course-card price styles; pricing data and commerce behavior are unchanged.

## Design thesis

For Thai learners comparing a next course, present price as a labelled decision detail anchored to the card grid, using MilerDev's restrained technical precision rather than a floating promotional sticker.

## Scope

- Refine shared `CourseCard` price markup for paid, free, and active-promotion states.
- Integrate the marker with the thumbnail boundary on Home and the public course listing.
- Preserve real price, promotion, discount, navigation, and course-card behavior.
- Verify representative desktop/mobile layouts and applicable focus/hover states.

## Out of scope

- Course detail purchase panels, payment logic, stored prices, admin UI, bundles, database, schema, or migrations.

## Acceptance

- Paid and free courses show a clear `ราคา` label and value without a pill or detached sticker appearance.
- Promotion state preserves original price, current price, and discount information with readable hierarchy and non-color text cues.
- The marker remains legible over real thumbnails and fallback artwork at desktop and mobile widths.
- Home and `/courses` retain card navigation, focus visibility, responsive containment, and pricing truth.
- Focused lint, homepage E2E, rendered browser inspection, and diff checks are recorded.

## Plan

1. Add semantic label/value structure to the existing shared price marker without changing price calculations.
2. Replace floating badge styling with a grid-anchored marker and define paid, free, and promo treatments.
3. Render Home and `/courses` at desktop/mobile widths, exercise focus/hover where applicable, and run focused checks.

## Follow-up

The user supplied rendered evidence of an active 50% promotion. The warning tint was too weak and made the promotion read like disabled metadata. The follow-up now uses a dedicated, user-confirmed sale red with white text for both the discount flag and price marker.

## Completion

All acceptance criteria and the promo-color follow-up have current implementation, rendered desktop/mobile, and focused regression evidence in `evidence/HOME-006.md`.
