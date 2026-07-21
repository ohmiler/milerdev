---
solodeveling_schema: 1
---

# HOME-013: Learning-first homepage

- Status: done
- Level: Standard
- Direction: User-confirmed learning-first redesign.
- Goal: Make the public homepage lead first-time Thai visitors from understanding MilerDev to inspecting real course evidence and choosing a course, while keeping Studio work as supporting trust proof.
- Primary user: A visitor considering learning coding online who needs to understand fit, course facts, and the next action before registering or paying.

## Scope

- Rewrite the Home hero hierarchy and calls to action around course discovery.
- Place truthful course evidence and Featured Courses before the learning workspace.
- Derive any counts only from the already-loaded featured course data and label their scope clearly.
- Preserve the existing code editor, course data query, CourseCard behavior, learning workspace, teaching proof, client evidence, gallery interaction, empty state, Navbar, and Footer.
- Recompose the added evidence strip for mobile, tablet, and desktop.
- Update homepage E2E assertions for learning-first CTA and section order.

## Out of scope

- Course detail, catalog, enrollment, authentication, payment, database, or API behavior.
- New analytics claims, testimonials, learner counts, outcomes, dependencies, or assets.
- Site-wide token or component refactoring.
- Removing Studio evidence or changing gallery behavior.

## Decisions

- Governing thesis: A homepage for Thai coding learners that uses an editorial learning path, calm technical precision, and real course/workspace evidence to move visitors toward choosing a course.
- Primary CTA points to /courses. The secondary Hero action points to the featured course evidence on the same page.
- Existing HeroCodeEditor remains product evidence; it no longer carries the conversion story alone.
- Featured Courses precede the workspace. Workspace explains the post-choice experience; teaching and Studio proof follow as trust evidence.
- Exact course/lesson/preview counts are shown only for the featured set currently rendered and disappear into a truthful fallback when no courses exist.
- DESIGN.md and existing semantic tokens remain the system contract; this slice changes no durable system rule.

## Acceptance criteria

- AC1: The Hero clearly identifies online coding learning, presents course choice as the primary next step, and exposes a /courses primary CTA.
- AC2: A truthful course-evidence strip and Featured Courses appear before the learning workspace in document order.
- AC3: Dynamic course, lesson, and preview evidence is scoped to the featured set; the zero-course path contains no fabricated counts.
- AC4: Existing editor, workspace, course cards/empty state, teaching proof, client evidence, gallery, Navbar, and Footer behavior remain available.
- AC5: At 390, 768, and 1280px the Home hierarchy recomposes without horizontal overflow; course grids remain 1, 2, and 4 columns where data is present.
- AC6: Semantic headings, visible focus, minimum action targets, reduced motion, editor keyboard behavior, and gallery focus recovery remain protected.
- AC7: Focused homepage E2E, lint, build, diff integrity, and Thai copy integrity checks pass when environment capabilities allow.

## Risks

- Overloading the Hero with proof can weaken the primary action; keep one dominant CTA and a compact evidence strip below it.
- Counts from a four-course query can be mistaken for catalog totals; label them as the recommended set.
- Reordering sections can invalidate viewport and interaction tests; update only product-level E2E expectations.
- Thai content can be damaged by encoding; edit and inspect as UTF-8 and run the repository text check when applicable.
- Existing unrelated dirty files remain user-owned and outside this work.

## Alternatives considered

- Full visual replacement: rejected because the implemented system and editor/workspace evidence are already strong and the user selected the current brand thesis.
- Reorder only: credible but too weak to clarify the Hero and provide immediate decision evidence.
- Do nothing: rejected because the current Home shows the workspace before course choice, weakening the enrollment path.

## Plan

1. Update src/app/page.tsx: learning-first Hero copy/CTA, scoped evidence strip, Featured Courses before workspace, and sharper closing CTA while preserving data and behavior.
2. Update src/app/home.module.css: evidence-strip composition and responsive states using existing Home tokens, spacing, focus, and reduced-motion grammar.
3. Update e2e/homepage.spec.ts with product-level assertions for the primary CTA, truthful evidence, section order, responsive columns, editor behavior, and gallery recovery.
4. Run focused homepage E2E, then lint/build and repository integrity checks at the checkpoint.

## Verification mapping

| Criterion | Planned evidence |
|---|---|
| AC1–AC3 | Static JSX inspection plus homepage E2E assertions |
| AC4 | Existing editor/workspace/gallery E2E and source review |
| AC5 | Playwright observations at 390, 768, and 1280px |
| AC6 | Existing editor reduced-motion/keyboard and gallery focus-recovery E2E |
| AC7 | npm test:e2e scoped to homepage, npm run lint, npm run build, npm run check:admin-text when Thai check applies, git diff --check, git status --short |

## Rollback

Restore the prior page order, Home copy, Home CSS, and homepage E2E assertions. No data, schema, enrollment, payment, or external recovery is required.
