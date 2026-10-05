# ADR 0006: Academy-light learning workspace

- Status: Accepted, amended 2026-10-05 (see Amendment)
- Date: 2026-08-20

## Context

The lesson route mixed a dark application shell with the academy-light public experience. It also repeated progress and next-lesson controls, replaced the current player when a locked lesson was selected, navigated automatically after video completion, and allowed completion to be reversed from the client. On wide screens the content remained constrained while the right curriculum competed visually with the player.

The route must stay focused and easy to scan without changing authentication, enrollment access, progress persistence, video signing, lesson ordering, or certificate behavior.

## Decision

The Learning workspace uses the academy-light design system for the header, content canvas, status, curriculum navigation, and overlays. Dark styling is reserved for the video player.

- Desktop uses a full-width two-column workspace: a flexible lesson area and a collapsible 22.5rem curriculum rail.
- Smaller screens open the same curriculum component in a shadcn Sheet.
- The curriculum control occupies the leading edge of the workspace header, adjacent to the curriculum rail. The course exit occupies the trailing edge so the two actions are spatially distinct.
- The lesson canvas keeps its existing readable maximum width. On wide and ultra-wide screens it shifts progressively toward the curriculum rail while the rail is expanded; at ordinary widths, or whenever the rail is collapsed, it remains centered.
- The main lesson sequence is title, optional player, optional rich content, completion status, and one previous/next navigation row. (Amended 2026-10-05: completion status moved after the content.)
- Lessons without video omit the player. Lessons without video or rich content show an honest empty state.
- Locked lesson selection opens a shadcn AlertDialog and never replaces the current lesson player.
- Video completion records lesson completion but never starts timed navigation. The learner explicitly chooses the next lesson, either from the navigation row or with the completion action "เรียนจบ แล้วไปบทถัดไป", which moves on only after the completion is saved. (Amended 2026-10-05.)
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

The workspace now shares the visual language of the rest of MilerDev while preserving a focused media surface. Desktop learners can keep curriculum context visible, and mobile learners use an accessible modal navigation pattern. Pairing the curriculum control with its rail reduces pointer travel and makes the rail's ownership legible. Biasing the lesson canvas toward the rail only when surplus width exists reduces the visual gap without pinning content to the rail or enlarging the player; full centering resumes when the learner hides the rail. Removing duplicate actions and automatic navigation gives the learner a single predictable way to continue.

The curriculum is intentionally flat because the current domain has ordered lessons but no module or section model. Introducing grouped modules requires a separate domain and migration decision.

## Amendment (2026-10-05)

The UX audit of October 2026 found that the completion action sat between the player and the rich content, so a learner reading a long lesson had to scroll back up to finish it, and that finishing a lesson offered no way forward from where the learner was.

- Completion status and its action now follow the rich content, directly above the previous/next row.
- When a next lesson exists, the action is "เรียนจบ แล้วไปบทถัดไป". It saves the completion first and navigates only if the save succeeds; a failed save keeps the learner on the lesson with a retry. On the last lesson the action is "เรียนจบบทสุดท้าย" and stays on the page; a fully completed course offers a link to the learner's certificates.
- Unchanged: video completion never navigates, nothing navigates on a timer, completion stays one-way, and `/api/progress` keeps its contract.
- `tests/components/learning-workspace.test.tsx` pins these rules: the workspace navigates in exactly one place, behind a successful completion, and never from the video-ended handler.
