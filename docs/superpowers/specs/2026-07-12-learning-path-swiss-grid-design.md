# Learning Path Swiss Grid Design

## Context

The homepage learning path currently presents four beginner steps as equal cards in a horizontal track. The content and course-link behavior are useful, but the section can better express the project's Swiss editorial direction through stronger grid alignment, fewer decorative treatments, and clearer reading order.

## Decision

Use an editorial split grid:

- A 12-column section grid anchors the composition.
- The left four columns contain the section heading, supporting copy, and a structural rule.
- The right eight columns contain a 2x2 grid of the four learning steps.
- Each step remains a full clickable link with a restrained border, a large sequence number, stage label, course title, outcome, and CTA.
- The existing blue accent is reserved for sequence numbers, links, focus, and hover states. Remove gradient treatment and heavy decorative shadows from this section.

This preserves the existing light public surface while making hierarchy come from alignment, rules, typography, and whitespace.

## Component and data contract

- Keep `LEARNING_PATH_STEPS`, `buildLearningPath`, and the existing published-course lookup unchanged.
- Keep the `#learning-path` anchor and section accessibility label.
- Keep each `Link` target unchanged: the matched course slug when available, otherwise `/courses`.
- Keep the four-step order and existing Thai copy unless a layout constraint requires a minor line-length adjustment.
- Prefer the existing page markup and global homepage CSS rather than adding a new component or dependency.

## Responsive behavior

- Desktop: heading rail and 2x2 step grid share the same container edges and column rhythm.
- Tablet: reduce the split ratio while keeping the step grid readable; collapse to one column if the grid would force cramped Thai copy.
- Mobile: stack the heading above the steps. Steps become a single vertical sequence with a subtle vertical guide between numbered anchors. No horizontal overflow.
- Preserve touch targets, visible focus rings, balanced Thai line-height, and readable outcomes at every breakpoint.

## Interaction and accessibility

- The full step area remains the interactive target.
- Hover uses a short border/background transition and a small CTA-arrow translation only; do not animate layout dimensions.
- `:focus-visible` keeps the existing focus ring and clearly identifies the active step.
- Sequence numbers are supplementary visual anchors, not the only source of step meaning.
- Respect `prefers-reduced-motion: reduce` by disabling transitions and transforms.

## Verification

- Update or extend the focused homepage learning-path test to assert the split-grid structure and removal of gradient/shadow decoration.
- Run the focused homepage tests, lint, and build.
- Manually inspect desktop and mobile layouts, including heading wrapping, Thai outcome lengths, focus state, and horizontal overflow.

