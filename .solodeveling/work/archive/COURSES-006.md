---
solodeveling_schema: 1
---

# COURSES-006: Course decision detail

- Status: done
- Level: Standard
- Direction: User-authorized Course Detail redesign following the learning-first Home journey.
- Goal: Help a prospective learner judge course fit, inspect the curriculum, try available previews, and understand the enrollment action before entering the existing commerce flow.
- Primary user: A Thai learner arriving from Home or the course catalog who needs enough truthful evidence to decide whether to enroll.

## Scope

- Recompose the published Course Detail hierarchy around curriculum evidence and the enrollment decision.
- Move curriculum before repeated long-form overview content.
- Surface price, one-time purchase context, enrollment CTA, preview availability, lesson count, duration, instructor, and access benefits from existing data.
- Add a compact instructor proof section only when an instructor exists.
- Improve mobile order so the price and enrollment action appear before the course media.
- Preserve metadata, structured data, sanitization, preview signing, lesson access, enrollment, coupon, checkout, PromptPay/SlipOK, reviews, Navbar, and Footer behavior.

## Out of scope

- Authentication, authorization, enrollment, payment, coupon, upload, API, database, schema, or migration changes.
- Invented outcomes, testimonials, learner counts, ratings, guarantees, or instructor credentials.
- Redesigning payment dialogs, lesson rows, reviews, global navigation, or the learning workspace.
- Site-wide design token changes.

## Decisions

- Governing thesis: Course Detail is a decision workspace, not a marketing brochure; curriculum, available previews, real course facts, and the transaction state lead.
- Curriculum becomes section 01 and overview becomes section 02 because the overview often repeats the Hero description while lesson titles provide stronger decision evidence.
- The existing enrollment component remains mounted once. Responsive CSS reorders its surrounding price content ahead of media on small screens without duplicating commerce state.
- Instructor proof uses only existing name/avatar data and makes no unsupported biography or expertise claim.
- The existing editorial grid, square surfaces, MilerDev blue, and light public theme are evolved rather than replaced.

## Acceptance criteria

- AC1: The Hero states the course title and description, and exposes truthful lesson, preview, duration when present, and instructor facts without fabricated claims.
- AC2: Curriculum appears before overview in document order and clearly identifies how many previews are available.
- AC3: The enrollment rail preserves the real effective price, promotion state, single existing enrollment action, access benefits, and all downstream commerce behavior.
- AC4: On small screens the price and enrollment action appear before course media; at 390, 768, and 1280px the page has no horizontal overflow or clipped primary content.
- AC5: An instructor section renders only from existing instructor data and remains resilient when the avatar is absent.
- AC6: Breadcrumbs, headings, anchors, focus visibility, minimum action targets, reduced motion, lesson access semantics, reviews, loading, media fallback, Navbar, and Footer remain usable.
- AC7: Focused Course E2E, lint, build, diff integrity, and UTF-8 copy checks pass when environment capabilities allow.

## Risks

- Responsive visual reordering could create a confusing keyboard sequence; keep DOM order coherent and reorder only adjacent presentation blocks inside the enrollment panel.
- Payment authority could be affected if the enrollment component is duplicated; retain exactly one CourseDetailClient button instance.
- Course records may omit duration, instructor, avatar, description, lessons, or previews; preserve conditional and empty states.
- Active promotions with a zero base price could make discount math unsafe; retain current promotion calculation in this presentation-only slice and flag separately if observed.
- Existing unrelated dirty files and generated browser artifacts remain user-owned and outside this work.

## Plan

1. Update the Course Detail server page hierarchy and truthful decision copy without changing data queries or commerce props.
2. Evolve the route stylesheet for the decision prompt, instructor proof, sticky desktop transaction rail, and mobile price-before-media order.
3. Extend focused Course E2E with product-level hierarchy and single-enrollment-action assertions.
4. Render 390, 768, and 1280px states, inspect interactions/console, then run focused E2E, lint, build, and repository integrity checks.

## Verification mapping

| Criterion | Planned evidence |
|---|---|
| AC1–AC3 | Static JSX review, focused Course E2E, and rendered accessibility snapshots |
| AC4 | Playwright observations at 390, 768, and 1280px plus overflow measurements |
| AC5 | Static conditional/fallback inspection and local rendered instructor state |
| AC6 | Playwright snapshot, keyboard focus checks, lesson preview interaction, and existing component behavior review |
| AC7 | Focused Playwright test, npm run lint, npm run build, git diff --check, git status --short, and mojibake scan |

## Rollback

Restore the prior page section order, Course Detail copy/markup, route CSS, and focused test assertions. No data, enrollment, payment, or external recovery is required.
