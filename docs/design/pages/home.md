# Homepage Design Notes

## Purpose

The homepage should help a new Thai learner understand what MilerDev teaches, see relevant courses, evaluate bundle value, and choose one clear next action without reading repetitive marketing sections.

## Sources of Truth

- `PRODUCT.md`
- `DESIGN.md`
- `docs/design/REDESIGN-ROADMAP.md`
- `src/app/page.tsx`

## Current Section Order

1. Hero
2. Featured courses
3. Bundle
4. Client showcase
5. Showcase gallery
6. Affiliate banner
7. Final CTA
8. Footer

Do not reintroduce these removed homepage sections unless the user explicitly requests them:

- Beginner learning path
- Why learn with us
- Audience fit

## Composition Rules

- Use a 12-column grid on desktop, a reduced structural grid on tablet, and a compact mobile composition.
- Align headings, body copy, media, prices, and actions to shared grid lines.
- Use asymmetry only when it strengthens reading order.
- Use whitespace and 1px rules before adding cards or section containers.
- Avoid repeating identical icon, heading, and body card grids.
- Keep one dominant action per section.
- Use `#02abff` for actions, focus, progress, and meaningful active states.
- Keep Thai body line-height around 1.7 to 1.8.
- Use monospace only for code or genuinely technical metadata.
- Preserve `prefers-reduced-motion` behavior.

## Library Policy

- Layout: native CSS Grid, Subgrid, Flexbox, and container queries.
- Styling: existing CSS custom properties and semantic tokens.
- Tailwind CSS: optional for utilities, not a second visual token system.
- Radix Primitives: only for complex accessible interactions such as dialogs, menus, popovers, tabs, or selects.
- Motion for React: only when CSS transitions are insufficient for a defined interaction.
- Icons: reuse `src/components/ui/Icons.tsx` before adding another icon package.

## Section Status

### Hero

Status: established.

Keep the coding-studio message, concrete learner outcome, primary course action, and code-oriented visual hierarchy.

### Featured courses

Status: redesigned.

Keep course title, outcome, lesson count, instructor, price, and action scannable without adding extra marketing decoration.

### Bundle

Status: current focus.

Goals:

- Explain what is included before emphasizing discount.
- Make original value, bundle price, savings, and action easy to compare.
- Use a Swiss editorial composition instead of a decorative card showcase.
- Preserve bundle query, calculations, links, and commerce behavior.

### Client showcase

Status: pending.

Use real client proof and readable context. Avoid a decorative logo wall without explanation.

### Showcase gallery

Status: pending.

Prioritize real work and legible captions. Let imagery carry the section rather than surrounding every item with a heavy card.

### Affiliate banner

Status: pending.

Integrate it into the page rhythm without competing with the primary course and bundle actions.

### Final CTA

Status: pending.

Keep it concise, specific, and non-repetitive. It should present one clear next action.

## Per-section Handoff Checklist

- Read this file and the current focus in the roadmap.
- Inspect the current component, data, and nearby styles.
- State the intended composition briefly.
- Change only the selected section and necessary shared primitives.
- Preserve behavior unless explicitly authorized otherwise.
- Check mobile and desktop structure.
- Run relevant verification.
- Update the roadmap and this page note after completion.
