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
- [x] Shared footer redesigned as a responsive Swiss grid on VS Code Dark+ `#1e1e1e`.

### Homepage

- [x] Hero refined as a Swiss 12-column frame with a VS Code Dark+ editor.
- [x] Featured courses refined to a responsive 4 / 2 / 1 Swiss grid.
- [x] Remove obsolete beginner path, why-us, and audience-fit sections.
- [ ] Bundle section. Current focus.
- [x] Client showcase redesigned as a static Swiss proof index.
- [x] Showcase gallery redesigned as a static Swiss contact sheet.
- [ ] Affiliate banner placement and visual integration.
- [x] Final CTA redesigned as a brand-blue Swiss field with paired actions.
- [ ] Full-page responsive and accessibility pass.

### Public discovery

- [x] Courses catalog. Redesigned as a Swiss editorial search surface with bundle comparison rail, labeled filter toolbar, responsive course grid, empty state, and pagination.
- [ ] Course detail.
- [ ] Bundle detail.
- [x] Blog index. Redesigned as a Swiss developer journal with a lead article, editorial rows, topic navigation, search, empty state, and pagination.
- [ ] Blog article detail.
- [x] About page. Redesigned as a Swiss studio profile with manifesto, learning method, principles, real event imagery, and focused CTA.
- [x] Contact page. Redesigned as a Swiss service desk with contact rail, accessible form, safe-data note, and complete submission states.
- [ ] FAQ and legal pages.

### Authentication

- [x] Login page. Redesigned as a Swiss return-to-learning surface with preserved credentials, Google sign-in, safe errors, password visibility, and recovery links.
- [x] Registration page. Redesigned as a Swiss start-learning surface with preserved validation, strength guidance, Google sign-up, auto-login, and anti-enumeration behavior.
- [ ] Forgot-password and reset-password pages.

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
