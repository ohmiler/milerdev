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

Status: Swiss refinement implemented and verified.

#### Approved direction: Swiss Frame + VS Code Dark+

- Preserve the existing desktop composition: learner message on the left and an interactive code editor on the right.
- Use the 12-column homepage grid with a 5-column text region and a 7-column editor region.
- Make the grid visible through alignment, restrained 1px rules, and a clear division between text and editor rather than decorative cards.
- Keep the Thai headline and its concrete learning outcome. Replace the generic marketing kicker with concise studio metadata.
- Keep one visually dominant course action. Present the secondary course link as a quieter text action.
- Recompose `LEARN / BUILD / SHIP` as a grid-aligned process rail.
- Keep the code editor recognizably based on VS Code Dark+ (`#1e1e1e` canvas and Dark+ syntax colors).
- Replace macOS traffic-light decoration with useful file or runtime metadata.
- Use a thin frame, a maximum 8px radius, and no diffuse decorative shadow on the editor.
- Refine tabs, line numbers, active line, and status information with stronger alignment and ruled separation.
- On mobile, stack text before the editor and keep the composition left-aligned.
- Keep motion restrained and preserve `prefers-reduced-motion` behavior.

Success criteria:

- The section still reads immediately as a coding course hero and a working code editor.
- The composition feels connected to the Swiss public navbar through shared grid lines, rules, typography, and restrained radius.
- The editor retains the familiarity and contrast of VS Code Dark+ without looking like a generic operating-system window mockup.
- Thai copy, actions, tabs, keyboard focus, responsive behavior, and editor animation remain usable.

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
