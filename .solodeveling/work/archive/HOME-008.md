---
solodeveling_schema: 1
---

# HOME-008 - Remove unsupported house aesthetics from Home

## Goal

Use Gridgeist as the sole design authority to preserve MilerDev's product-native learning and coding evidence while removing frontend house aesthetics that weaken course discovery, brand truth, or content hierarchy.

## Classification

- Level: Standard.
- Lifecycle: Done.
- Recovery: Revert the scoped Home and showcase styling changes; course data, navigation, commerce behavior, and media assets remain unchanged.

## Design thesis

For Thai learners deciding where to begin and what they can build, structure Home as a calm learning sequence with a quiet grid, friendly technical precision, and real course, workspace, code, teaching, and community evidence carrying the hierarchy.

## Preserve

- Split hero with the real animated code editor and existing primary actions.
- Learning workspace preview and its dark focus context.
- Published course data, promotion semantics, price truth, and card navigation.
- Authentic teaching imagery, organization logos, gallery lightbox behavior, closing CTA, navbar, footer, Prompt typography, and the approved palette.

## Evolve or replace

- Reduce oversized repeated section headings and excessive vertical whitespace below the hero.
- Let one or two real courses use the available grid instead of reading as small cards in an empty field.
- Remove decorative mono typography, desaturation, grayscale, and cell borders from non-technical teaching and organization evidence.
- Replace decorative lift/shadow hover motion on course and gallery cards with quieter state feedback.
- Remove repeated accent bars where they decorate rather than explain structure.

## Acceptance

- The hero, code editor, workspace, course truth, authentic imagery, closing CTA, navbar, and footer remain recognizable and functional.
- Course discovery has stronger hierarchy and uses available space at representative desktop widths.
- Teaching and organization evidence retains natural color and no longer inherits technical metadata styling without a product reason.
- Section hierarchy and density remain readable at approximately 390, 768, 1280, and 1600 pixels without horizontal overflow.
- Hover, focus, editor tabs, gallery lightbox keyboard recovery, and reduced-motion behavior that apply are exercised with Playwright.
- Focused lint/build and diff checks are recorded.

## Plan

1. Refine shared Home hierarchy, density, course grid behavior, evidence styling, and non-causal hover motion.
2. Align the gallery header and card interaction with the same product-native system.
3. Run static checks, then inspect representative desktop/mobile renders and applicable interaction states with Playwright.

## Completion

- Scoped Gridgeist review and implementation completed on 2026-07-18.
- Acceptance evidence is recorded in `../evidence/HOME-008.md`.
- No product data, route behavior, commerce logic, or media assets changed.
