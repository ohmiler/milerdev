---
solodeveling_schema: 1
---

# LEARN-001: Reference-aligned learning workspace

- Status: done
- Level: Standard
- Direction: User-confirmed dark learning workspace based on the supplied reference image.
- Goal: Turn the real lesson page into a focused workspace where learners can orient themselves, watch or read the current lesson, understand progress, and continue to the next available lesson without losing course context.
- Primary user: A Thai learner entering an enrolled lesson or a public free preview on desktop, tablet, or mobile.

## Scope

- Recompose the existing LearningNavbar, LearnPageClient, and LessonList into a dark task-flow workspace inspired by the supplied reference.
- Place the course index rail on the left at wide viewports and retain the existing mobile drawer behavior.
- Put current lesson context before the player, then expose progress, completion, and the next available action in the learning flow.
- Restyle real current, completed, locked, free-preview, no-video, no-content, search, pagination, auto-advance, celebration, and sidebar states.
- Add focused public free-preview E2E coverage for hierarchy, rail placement, drawer behavior, locked recovery, and viewport containment.
- Preserve existing course/lesson queries, authorization, enrollment checks, free-preview access, Bunny URL signing/player callbacks, content sanitization, progress requests, watch-time sync, auto-completion, auto-advance, keyboard navigation, and route destinations.

## Out of scope

- Authentication, authorization, enrollment, payment, certificate, progress API, database, schema, Bunny provider, or video-delivery changes.
- New lesson data, chapters, outcomes, learner metrics, credentials, or fabricated progress.
- Dashboard redesign, course editing, new dependencies, or global public-theme changes.
- Reproducing reference branding or fictional content literally.

## Decisions

- Thesis: A focused workspace for Thai coding learners, organized as a persistent lesson task-flow grid with restrained MilerDev dark surfaces, blue orientation cues, and real lesson/progress evidence.
- Preserve MilerDev Prompt typography and blue accent; evolve the existing VS Code-like theme toward the darker #080B0F learning palette documented in DESIGN.md.
- Desktop order is course rail left and learning stage right. At 1023px and below, the rail becomes the existing overlay drawer rather than compressing the player.
- The current lesson title, sequence, access state, and next action lead; long-form lesson content remains below the stage and retains sanitized rendering.
- Lesson rows become semantic links or buttons with explicit current/completed/free/locked wording. No state relies on color alone.
- Keep one LearnPageClient and one LessonList state owner; presentation changes do not create parallel progress or navigation logic.

## Acceptance criteria

- AC1: At wide viewports the rendered workspace follows the reference hierarchy: persistent course index on the left, current lesson/player stage on the right, and clear progress/next-action context.
- AC2: The course title, current lesson title, current index/total, free-preview or enrollment state, current/completed/locked lesson states, and next available action are truthful and derived only from existing props/state.
- AC3: Authorization, enrollment/free-preview access, Bunny signing/player callbacks, sanitized lesson content, progress mutation payloads, watch-time sync, completion, auto-advance, keyboard navigation, and route targets remain unchanged.
- AC4: At 390, 768, 1280, and 1600px the workspace has no horizontal overflow; the rail is a named, closable drawer below 1024px with visible focus and at least 44px primary controls.
- AC5: No-video, no-content, locked recovery, lesson search/no-results, pagination, disabled/loading completion, success/celebration, and reduced-motion states retain usable feedback.
- AC6: Server reads and access decisions remain in the server route, while interactive state remains in existing client components with serializable props.
- AC7: Focused learning E2E, relevant tests, lint, production build, diff integrity, and UTF-8 checks pass when environment capabilities allow.

## Risks

- Moving the rail can invert keyboard order if only visual CSS ordering changes; align DOM and visual order where practical and verify focus sequence.
- Inline legacy styles can override the new system; replace or bind the affected visual styles rather than accumulating fragile selectors.
- Free-preview users must not gain access to locked lessons or progress authority; preserve the existing access and API branches exactly.
- Mobile fixed drawer and sticky header can obscure focus or trap scrolling; verify open/close, outside click, Escape behavior where implemented, and viewport containment.
- The local public fixture has no video and is not enrolled, so enrolled completion, real Bunny playback, and provider delivery require static or existing-test evidence.
- Existing unrelated dirty tooling and generated artifacts remain outside this work.

## Alternatives considered

- CSS-only skin: smallest change, but rejected because the reference requires different semantic order and the current locked lesson rows are non-keyboard divs.
- Full component rewrite: visually flexible, but rejected because it would unnecessarily endanger mature progress, watch-time, and auto-advance behavior.
- Do nothing: rejected because the current right rail, oversized empty player, and weak mobile action hierarchy do not match the confirmed direction.

## Plan

1. Refine LearningNavbar into a workspace header with MilerDev learning identity, real course/lesson context, progress/index, and existing rail controls.
2. Recompose LearnPageClient markup around a stage header, player/no-video state, progress/next-action deck, long-form lesson content, and a left desktop rail/mobile drawer while preserving handlers and requests.
3. Refactor LessonList presentation into semantic indexed rows for current, completed, free, and locked states without changing filtering, pagination, or destinations.
4. Replace the affected learning-shell CSS with the reference-aligned local system and responsive/drawer/focus/reduced-motion states.
5. Add focused public free-preview E2E, render 390/768/1280/1600 states, exercise drawer/locked/search flows, then run lint/build and integrity gates.

## Verification mapping

| Criterion | Planned evidence |
|---|---|
| AC1–AC2 | Public free-preview E2E, accessibility snapshots, and rendered 1280/1600 observations |
| AC3 | Scoped handler/request diff, existing progress/auth tests where available, and production build |
| AC4 | Browser measurements/screenshots at 390/768/1280/1600 plus drawer keyboard/pointer checks |
| AC5 | Public no-video/locked/search observations, static enrolled-state review, and reduced-motion source check |
| AC6 | Server/client boundary inspection and TypeScript build |
| AC7 | Focused Playwright, relevant unit/API tests, lint, build, git diff --check, status, and mojibake scan |

## Rollback

Restore the prior LearningNavbar, LearnPageClient, LessonList, learning CSS, focused E2E assertions, and memory files. No data, progress, enrollment, provider, or schema rollback is required.

## Outcome

- Delivered the user-confirmed reference direction as a real responsive learning workspace without changing enrollment, progress, provider, or route contracts.
- Verification is recorded in `.solodeveling/evidence/LEARN-001.md`, including fixture and browser-runner limitations.
