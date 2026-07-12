# Course Learn Page

## Status

Implemented and verified on 2026-07-12.

## Direction

The learning surface uses VS Code Dark+ as a focused workspace, not as decorative developer styling.

- Editor canvas: #1e1e1e
- Top rail: #181818
- Lesson explorer: #252526
- Hover: #2a2d2e
- Current lesson: #37373d with #007acc selection marker
- Primary foreground: #f0f0f0
- Body foreground: #cccccc
- Dividers: #3c3c3c
- Link and focus accent: #4fc1ff / #007acc

## Layout Decisions

- Keep video, lesson title, progress, and next action in the first hierarchy.
- Cap lesson reading content at 760px.
- Treat the desktop lesson rail like an editor explorer with dense, square lesson rows.
- Preserve sidebar collapse, mobile sheet, search, pagination, locked lessons, completion, auto-advance, and keyboard navigation.
- Lock the learning surface to Dark+ and hide the previous light-theme control.
- Avoid decorative shadows, gradients, glass effects, and oversized rounding.

## Verification

- Targeted ESLint for learning components.
- Production build.
- git diff check.
- Responsive behavior is covered structurally in CSS; authenticated visual browser QA remains useful when a test account is available.
