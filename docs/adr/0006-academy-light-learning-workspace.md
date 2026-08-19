# ADR 0006: Academy-light learning workspace

- Status: Accepted
- Date: 2026-08-20

## Context

The lesson route mixed a dark application shell with the academy-light public experience. It also repeated progress and next-lesson controls, replaced the current player when a locked lesson was selected, navigated automatically after video completion, and allowed completion to be reversed from the client. On wide screens the content remained constrained while the right curriculum competed visually with the player.

The route must stay focused and easy to scan without changing authentication, enrollment access, progress persistence, video signing, lesson ordering, or certificate behavior.

## Decision

The Learning workspace uses the academy-light design system for the header, content canvas, status, curriculum navigation, and overlays. Dark styling is reserved for the video player.

- Desktop uses a full-width two-column workspace: a flexible lesson area and a collapsible 22.5rem curriculum rail.
- Smaller screens open the same curriculum component in a shadcn Sheet.
- The main lesson sequence is title, optional player, completion status, optional rich content, and one previous/next navigation row.
- Lessons without video omit the player. Lessons without video or rich content show an honest empty state.
- Locked lesson selection opens a shadcn AlertDialog and never replaces the current lesson player.
- Video completion records lesson completion but never starts timed navigation. The learner explicitly chooses the next lesson.
- Lesson completion is one-way in this UI. Completed lessons stay accessible for review, and a fully completed course enters review mode.
- Global ArrowLeft and ArrowRight navigation is removed because it can conflict with player, assistive-technology, and browser interactions.
- Progress appears once in the curriculum panel; the header carries only a compact summary.
- Initial loading uses the shared Skeleton primitive and mirrors the resolved layout.

## Domain and safety boundaries

- Server-side access checks remain authoritative for enrollment and free previews.
- `/api/progress` remains the persistence boundary. The UI sends `completed: true` only and does not change its public contract.
- Anonymous previews do not attempt authenticated watch-time writes.
- Signed Bunny video URLs and server-side rich-content sanitization remain unchanged.
- Course completion, certificate issuance, lesson order, search, and 20-item curriculum pagination keep their existing contracts.

## Consequences

The workspace now shares the visual language of the rest of MilerDev while preserving a focused media surface. Desktop learners can keep curriculum context visible, and mobile learners use an accessible modal navigation pattern. Removing duplicate actions and automatic navigation gives the learner a single predictable way to continue.

The curriculum is intentionally flat because the current domain has ordered lessons but no module or section model. Introducing grouped modules requires a separate domain and migration decision.
