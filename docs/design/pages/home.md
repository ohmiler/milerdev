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
- Make the grid visible through alignment and whitespace, keeping the text and editor distinct without a divider or decorative cards.
- Keep the Thai headline and its concrete learning outcome. Replace the generic marketing kicker with concise studio metadata.
- Keep one visually dominant course action. Present the secondary course link as a quieter text action.
- Recompose `LEARN / BUILD / SHIP` as a grid-aligned process rail.
- Keep the code editor recognizably based on VS Code Dark+ (`#1e1e1e` canvas and Dark+ syntax colors).
- Replace macOS traffic-light decoration with useful file or runtime metadata.
- Use a thin frame, a maximum 8px radius, and no diffuse decorative shadow on the editor.
- Refine tabs, line numbers, active line, and status information with stronger alignment and ruled separation.
- On mobile, stack text before the editor and center the hero copy and actions.
- Keep the hero headline to two deliberate lines, “เรียนโค้ดให้เข้าใจ” and “สร้างโปรเจกต์ได้จริง”, without wrapping either phrase at supported viewport widths.
- Keep motion restrained and preserve `prefers-reduced-motion` behavior.

Success criteria:

- The section still reads immediately as a coding course hero and a working code editor.
- The composition feels connected to the Swiss public navbar through shared grid lines, rules, typography, and restrained radius.
- The editor retains the familiarity and contrast of VS Code Dark+ without looking like a generic operating-system window mockup.
- Thai copy, actions, tabs, keyboard focus, responsive behavior, and editor animation remain usable.

### Featured courses

Status: redesigned as a four-course Swiss grid.

Show four courses in one desktop row, two columns on tablet, and one column on mobile. Keep course title, outcome, lesson count, instructor, price, and action scannable without adding extra marketing decoration.

### Bundle

Status: current focus.

Goals:

- Explain what is included before emphasizing discount.
- Make original value, bundle price, savings, and action easy to compare.
- Use a Swiss editorial composition instead of a decorative card showcase.
- Preserve bundle query, calculations, links, and commerce behavior.

### Client showcase

Status: redesigned as a static Swiss proof index.

Use a full-width heading row above the eight real client logos. Keep the logos as a static 4 × 2 desktop index with visible organization names, a 2-column mobile layout, and no automatic marquee.

### Showcase gallery

Status: pending.

Show all 12 event photographs as a static 4-column desktop contact sheet, 2 columns on tablet, and 1 column on mobile. Use the VS Code Dark+ `#1e1e1e` canvas with `#252526` image cells, `#3c3c3c` rules, and brand-blue interaction details. Keep numbered captions and the accessible lightbox without autoplay or duplicated images.

### Affiliate banner

Status: pending.

Integrate it into the page rhythm without competing with the primary course and bundle actions.

### Final CTA

Status: pending.

Use a brand-blue 12-column field with the closing statement and supporting copy stacked in one full-width text row, followed by a paired action row. Keep “ดูคอร์สทั้งหมด” dominant with an ink-filled button and “สมัครสมาชิกฟรี” as a white outlined secondary action.

### Footer

Status: redesigned.

Use a responsive 12-column Swiss information rail on the VS Code Dark+ `#1e1e1e` canvas. Give the brand five columns and contact three columns on desktop, separate groups with 1px rules, and use brand blue only for links, focus, and interaction feedback.
## Per-section Handoff Checklist

- Read this file and the current focus in the roadmap.
- Inspect the current component, data, and nearby styles.
- State the intended composition briefly.
- Change only the selected section and necessary shared primitives.
- Preserve behavior unless explicitly authorized otherwise.
- Check mobile and desktop structure.
- Run relevant verification.
- Update the roadmap and this page note after completion.
