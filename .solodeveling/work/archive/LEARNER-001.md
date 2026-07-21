---
solodeveling_schema: 1
---

# LEARNER-001: Truthful return-to-learning continuation

- Status: done
- Level: Standard
- Direction: User-authorized continuation of the learner-facing journey before Admin work.
- Goal: Returning learners land on the lesson that truthfully represents where they should continue, rather than always being sent to the first lesson.
- Primary user: An authenticated enrolled learner returning through Dashboard or a generic course learning URL.

## Scope

- Derive a continuation lesson from existing ordered lessons and the authenticated learner's progress.
- Prefer an unfinished lesson with recent activity; otherwise choose the first unfinished lesson, then the first lesson for review after completion.
- Rank Dashboard courses by real latest learning activity, falling back to enrollment recency when no progress exists.
- Route Dashboard primary and secondary course actions directly to the selected lesson.
- Make `/courses/[slug]/learn` use the same selection rule after its existing enrollment check.
- Add focused pure-logic regressions and inspect the server authorization boundary.
- Preserve the current learner Dashboard presentation unless truthful routing requires copy adjustment.

## Out of scope

- Enrollment, role, session, payment, certificate, progress mutation, database schema, or migration changes.
- Writing progress, changing completion semantics, or granting lesson access.
- Redesigning certificates, payments, profile, settings, Admin, or the Learning Workspace.
- Real Bunny playback or provider delivery.

## Decisions

- Thesis: A returning-learning path for Thai coding learners organized around one truthful next action, restrained course evidence, and the existing MilerDev editorial learning grid.
- A partially watched unfinished lesson is resumed before a later untouched lesson.
- When the most recently watched lesson is complete, continue to the first unfinished lesson in course order.
- Fully completed courses open the first lesson for deliberate review.
- Selection stays a pure server-safe helper; authorization remains in the route and lesson page.

## Acceptance criteria

- AC1: With no progress, Dashboard and generic course entry select the first ordered lesson.
- AC2: With an unfinished watched lesson, they select the most recently watched unfinished lesson.
- AC3: When watched lessons are complete, they select the first incomplete lesson in order; when all lessons are complete, they select the first lesson for review.
- AC4: Dashboard ranks courses by latest learning activity and falls back to enrollment recency without fabricating activity.
- AC5: Dashboard links target the selected lesson directly and keep truthful review/continue wording.
- AC6: Existing authentication, enrollment checks, lesson authorization, progress writes, and routes remain enforced and unchanged in authority.
- AC7: Focused tests, relevant auth regressions, lint, build, diff integrity, and UTF-8 checks pass when capabilities allow.

## Risks

- A naive latest-progress rule can reopen a completed lesson instead of advancing; tests must distinguish recent completed and unfinished states.
- Dates from Drizzle may be nullable; comparison must be deterministic and avoid client serialization.
- Dashboard aggregation must avoid per-course query waterfalls.
- The local browser does not have an enrolled session, so rendered authenticated continuation remains a target-environment gap.

## Plan

1. Add a pure typed selector for lesson and course continuation with focused failing cases.
2. Replace Dashboard count-only aggregation with bounded parallel lesson/progress reads and derive progress, target lesson, and activity order without N+1 queries.
3. Reuse the selector in the enrolled `/courses/[slug]/learn` redirect after its existing access check.
4. Verify focused logic, relevant auth behavior, TypeScript/lint/build, scoped diff, and source-level authority preservation.

## Verification mapping

| Criterion | Planned evidence |
|---|---|
| AC1–AC4 | Pure helper unit tests covering no progress, unfinished activity, completed advance, all complete, and course ranking |
| AC5 | Dashboard markup/source assertion and TypeScript build |
| AC6 | Scoped route diff, existing auth tests, and server-only helper inspection |
| AC7 | Vitest focus plus relevant regressions, lint, build, diff check, status, and UTF-8 scan |

## Rollback

Restore Dashboard aggregation and links to their previous enrollment-order/`/learn` behavior, restore the generic first-lesson redirect, and remove the pure helper/tests. No data rollback is required.

## Outcome

- Returning learners now resume from real unfinished activity or the next incomplete lesson, while completed courses open from the first lesson for review.
- Dashboard course order reflects real learning activity with enrollment recency as a truthful fallback.
- Verification and enrolled-session limitations are recorded in `.solodeveling/evidence/LEARNER-001.md`.
