---
solodeveling_schema: 1
---

# HOME-010 - Connect course evidence and hero outcomes

## Goal

Help Thai learners move from the Home promise to an informed course choice by keeping real decision evidence consistent in the catalog and showing a clear code-to-result relationship in the hero.

## Classification

- Level: Standard.
- Lifecycle: Done.
- Recovery: Revert the scoped catalog lesson-stat aggregation, hero editor/result presentation, interaction state, focused tests, and related Solodeveling memory. No schema, stored data, route, enrollment, authentication, or payment changes are required.

## Direction

For Thai learners choosing where to begin, use a calm technical-editorial grid to connect real curriculum evidence with a visible code-to-result motif, while preserving MilerDev's Thai voice, paper/ink/blue palette, square geometry, pricing truth, and existing navigation.

## Scope

- Extend the public course catalog query with existing lesson duration and free-preview statistics.
- Pass the same truthful course decision evidence used on Home into catalog CourseCards.
- Evolve the hero code editor into a code-and-result composition using an explicitly labeled illustrative result.
- Prevent automatic snippet changes from overriding pointer or keyboard interaction.
- Preserve responsive composition, keyboard tab behavior, reduced-motion behavior, pricing, promotions, routes, enrollment, authentication, payments, navbar, footer, workspace, proof, and gallery.

## Out of scope

- Database schema or migration changes.
- Invented course outcomes, learner results, levels, prerequisites, customers, or metrics.
- Course-detail, dashboard, admin, authentication, enrollment, or payment redesign.
- Gallery caption work, global CSS consolidation, or additional footer redesign.

## Acceptance

- Catalog CourseCards receive existing lesson count, positive total duration, instructor, tags, and free-preview availability with the same omission rules as Home.
- Missing catalog metadata produces no empty label or fabricated fallback, and price/promotion behavior remains unchanged.
- The hero visibly connects the active code example to an illustrative rendered result and labels the material as a demo.
- Automatic typing/snippet rotation pauses while the pointer or focus is inside the interactive editor and never overrides a tab selected by the user.
- Tabs remain operable by click, ArrowLeft/ArrowRight, Home, and End; reduced motion renders complete content without ambient rotation.
- Hero and catalog remain readable without horizontal overflow at representative mobile, tablet, desktop, and wide widths.
- Focused tests, affected e2e checks, lint, build, diff checks, and rendered observations are recorded.

## Plan completed

1. Aligned catalog lesson-stat aggregation and CourseCard props with Home and added regression coverage.
2. Recomposed HeroCodeEditor around code and illustrative output with interaction-aware pause behavior and keyboard/motion coverage.
3. Rendered representative viewports and states, ran affected and full regressions plus lint/build, and reconciled evidence and memory.

## Completion

All acceptance criteria were reconciled against recent automated and rendered evidence in `evidence/HOME-010.md`. The work item was archived on 2026-07-19. No schema, production data, authentication, enrollment, or payment behavior changed.