# MilerDev Redesign Roadmap

This file tracks redesign progress. It does not replace the product and visual contracts in `PRODUCT.md` and `DESIGN.md`.

## Sources of Truth

1. `PRODUCT.md`: product goals, users, surface modes, and content voice.
2. `DESIGN.md`: visual system, grid, typography, color, components, motion, and accessibility.
3. `docs/design/pages/*.md`: decisions and current work for a specific page.
4. This roadmap: sequence, status, and current focus.

## Working Rules

- Work on one page section or one shared component at a time.
- Preserve data, routes, auth, payments, enrollment, and other behavior unless the task explicitly changes them.
- Use the quick path for clear, scoped UI work.
- Do not add a UI library solely to create visual style.
- Prefer native CSS Grid, Subgrid, container queries, and existing semantic tokens.
- Add an interaction library only for a concrete accessibility or behavior requirement.
- Verify responsive behavior, then run the narrowest relevant checks.
- Update this roadmap only after the scoped change is verified.

## Current Focus

### Homepage Bundle section

Goal:

- Recompose the bundle section using the MilerDev Swiss Editorial grid.
- Make bundle contents, savings, price, and the primary action easier to scan.
- Reduce decorative card treatment while preserving the existing bundle data and links.

Constraints:

- Keep bundle queries, pricing calculations, links, and behavior unchanged.
- Reuse existing tokens and components where practical.
- Support desktop, tablet, and mobile layouts.
- Do not introduce a new UI or motion library for this section.

Verification:

- Responsive visual check when browser tooling is available.
- `npm run lint`
- `npm run build`

## Progress

### Foundation and shared shell

- [x] Product direction documented in `PRODUCT.md`.
- [x] Visual direction documented in `DESIGN.md`.
- [x] Adaptive public and learning navigation direction established.
- [x] Public navbar refined into a 12-column Swiss rail with compact authenticated controls.
- [ ] Extract stable layout primitives after two or more sections prove the same pattern.
- [ ] Finalize shared footer treatment.

### Homepage

- [x] Hero refined as a Swiss 12-column frame with a VS Code Dark+ editor.
- [x] Featured courses redesigned.
- [x] Remove obsolete beginner path, why-us, and audience-fit sections.
- [ ] Bundle section. Current focus.
- [ ] Client showcase.
- [ ] Showcase gallery.
- [ ] Affiliate banner placement and visual integration.
- [ ] Final CTA.
- [ ] Full-page responsive and accessibility pass.

### Public discovery

- [ ] Courses catalog.
- [ ] Course detail.
- [ ] Bundle detail.
- [ ] Blog index and article pages.
- [ ] About, contact, FAQ, and legal pages.

### Learner product

- [ ] Dashboard.
- [ ] Course learning shell and lesson rail.
- [ ] Certificates and payments.
- [ ] Profile and settings.

### Operations

- [ ] Admin shell and navigation.
- [ ] Tables, filters, forms, and status patterns.
- [ ] Course and lesson management.
- [ ] Payment, enrollment, certificate, and reconciliation workflows.

## Decision Log

- The homepage uses Light Editorial as defined in `PRODUCT.md` and `DESIGN.md`.
- The public navbar uses an institutional 12-column Swiss rail, text-first mobile navigation, and compact authenticated controls.
- Swiss design is implemented through grid, typography, alignment, whitespace, and rules, not a visual component library.
- Tailwind CSS may be used selectively, but the existing semantic tokens remain the visual source of truth.
- Radix Primitives or Motion may be introduced only when a specific interaction requires them.
- The homepage no longer includes the beginner learning path, why learn with us, or audience-fit sections.
