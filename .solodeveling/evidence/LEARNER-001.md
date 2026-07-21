---
solodeveling_schema: 1
---

# LEARNER-001 Evidence

## Current acceptance matrix

| Criterion | Status | Evidence |
|---|---|---|
| AC1 | Pass | Focused helper test selects the first ordered lesson when progress is empty. |
| AC2 | Pass | Focused helper test resumes the most recently watched unfinished lesson. |
| AC3 | Pass | Focused tests advance after completed activity and return the first lesson when all lessons are complete. |
| AC4 | Pass | Focused course-order test prioritizes latest learning activity and falls back to enrollment recency. Dashboard uses two bounded parallel curriculum/progress reads and no per-course query loop. |
| AC5 | Pass | Dashboard primary and secondary links now include the selected lesson ID when available; existing continue/review wording remains tied to completion state. |
| AC6 | Pass with runtime limitation | Source diff confirms `auth()`, enrollment lookup, missing-access `notFound()`, and lesson-page authority remain in place. Browser observed unauthenticated Dashboard and course-learning redirects to login; no enrolled browser session was available. |
| AC7 | Pass | Focused continuation 5/5 and auth/progress 28/28 passed; full Vitest 21 files / 241 tests passed; full ESLint passed; production build passed; scoped `git diff --check` and UTF-8 scan passed. |

## Observation log

- 2026-07-21: User authorized continuing learner-facing work before Admin and accepted the recommended returning-learner journey as next.
- 2026-07-21: Inspection found Dashboard already presents a prominent learning-first continuation surface, but its links target `/courses/[slug]/learn`; that route always redirects enrolled learners to the first ordered lesson.
- 2026-07-21: Work classified Standard because it changes authenticated read aggregation and navigation targets while leaving access authority and all mutations unchanged.
- 2026-07-21: Added a server-safe pure continuation selector and regression-first coverage for empty, unfinished, completed, review, and course-activity ordering states.
- 2026-07-21: Dashboard now batches curriculum and authenticated progress reads, derives truthful progress and continuation destinations, and ranks active courses by real activity without N+1 queries.
- 2026-07-21: Generic enrolled course entry reuses the same selector only after the existing enrollment check.
- 2026-07-21: Local unauthenticated browser checks observed `/dashboard` redirect to `/login` and course learning entry preserve its callback URL. The login page emitted an existing AuthJS client session fetch error in the local dev environment, so console cleanliness is not claimed.

## Verification limitations

- No enrolled browser session was available to render a real learner's continuation link end to end; selection is covered by pure tests, server-source inspection, build, and unauthenticated boundary checks.
- Real Bunny playback and provider callbacks remain outside this read-only continuation change.
