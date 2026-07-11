# MilerDev Homepage Swiss Editorial Split Design

## Status

Approved direction: Editorial Split (A)

Scope: public homepage, shared public Navbar, and shared public Footer.

This specification defines the visual and interaction direction before implementation. It does not change database queries, authentication, enrollment, payment, or admin behavior.

## Product intent

Reposition the MilerDev homepage as a precise learning catalog for people who build software. The experience should feel editorial, technical, and calm: strong typography and a disciplined grid should carry the page instead of gradients, decorative effects, or rounded marketing cards.

Existing homepage data remains the source of truth. Featured courses, bundles, course lookup, authentication state, and existing links must continue to work.

## Visual system

### Color

- Canvas: white (`#ffffff`)
- Primary ink: near-black (`#111111`)
- Supporting text: neutral gray only
- Rules and grid lines: light neutral gray
- Accent: `#00abff` only
- No gradients, colored shadows, secondary brand colors, or red accents on the redesigned public homepage

The accent is reserved for primary calls to action, active navigation state, progress/availability indicators, selected items, and small directional markers. It should not become a large decorative background except for a deliberately bounded action cell in the hero.

### Typography

- Use IBM Plex Sans Thai as the primary family already available in the app.
- Use one typographic system across the page; avoid adding font families.
- Use oversized, tightly tracked display headings for hierarchy.
- Keep Thai body copy generous in line height, approximately `1.7`–`1.8`.
- Use uppercase, compact labels for metadata and navigation where appropriate.

### Geometry

- Use a 12-column desktop grid with explicit alignment and thin rules.
- Prefer square corners or very small radii; remove the existing soft-card language.
- Keep content within the existing responsive max-width conventions unless the grid needs a measured adjustment.
- Use whitespace as a structural element, not as empty decoration.
- Avoid drop shadows and prominent motion.

## Homepage composition

### 1. Navbar

- White background with a single bottom rule.
- Brand mark and primary navigation align to the same left grid edge as the hero.
- Navigation remains semantically and behaviorally equivalent to the current implementation, including auth-aware actions.
- Keep the action area compact; use `#00abff` only for the primary action or active state.
- Mobile navigation must remain accessible and preserve the existing menu behavior.

### 2. Hero: Editorial Split

Use an asymmetric 7/5 split on desktop.

Left column:

- Small editorial eyebrow/section label.
- Large Thai headline with clear line breaks and strong left alignment.
- Short value proposition focused on practical software-building skills.
- One primary CTA styled with the accent color and one quiet text link if needed.
- Small metadata row such as course count, learning format, or language.

Right column:

- A bounded black data/code panel that maintains MilerDev's coding identity.
- Use simple typographic data blocks, course index, or code-like content; no ornamental illustration or animated editor effect.
- Use the accent sparingly for syntax emphasis, index markers, or one directional cue.

The hero should read as a poster-like editorial spread while remaining a functional entry point into courses.

### 3. Featured courses

- Replace the dominant rounded card grid with an editorial course list or tightly controlled grid.
- Each item should use a number/index, title, short metadata, price/status, and a clear row-level link.
- Keep course thumbnails only where they add information; use restrained treatment and avoid decorative overlays.
- Preserve course status, pricing, promo pricing, instructor, and lesson-count information already returned by the page.

### 4. Bundles

- Present bundles as a separate editorial block with strong rule lines and an asymmetric composition.
- Make bundle value and included course count easy to scan.
- Use the accent for the primary bundle action only.

### 5. Supporting showcase content

- Retain useful showcase/gallery content if it supports credibility, but convert it to a simpler monochrome/grid treatment.
- Reduce or remove any animation that competes with typography.
- Keep motion limited to subtle state feedback and respect reduced-motion preferences.

### 6. Footer

- Use a compact black footer with white typography and neutral rules.
- Organize links into a clear grid with left alignment.
- Accent color is limited to hover/focus/active affordances.
- Preserve all existing destinations and legal/contact information.

## Responsive behavior

- Desktop: asymmetric 7/5 hero and full grid structure.
- Tablet: reduce column count while keeping visible rules and left alignment.
- Mobile: stack hero columns in a deliberate order: headline/CTA first, data panel second; do not simply center all content.
- Course and bundle rows may become single-column blocks, but keep index labels and rule hierarchy.
- Ensure buttons, nav controls, and links remain touch-friendly.

## Accessibility and interaction

- Preserve semantic headings and logical heading order.
- Maintain visible keyboard focus using the accent color with sufficient contrast.
- Do not rely on color alone for status or selection.
- Preserve accessible names for navigation, CTAs, course links, and mobile controls.
- Honor `prefers-reduced-motion`.

## Out of scope

- Admin/dashboard redesign.
- Database schema or query changes.
- Authentication, payments, enrollment, or checkout changes.
- New imagery generation or external asset dependencies.
- Redesign of every internal course/detail page unless required to prevent a shared Navbar/Footer regression.

## Acceptance criteria

1. Homepage, Navbar, and Footer visibly follow the Editorial Split Swiss direction.
2. The only saturated accent used by the redesigned public surface is exactly `#00abff`.
3. No new gradients, decorative shadows, excessive rounded cards, or prominent animations remain in the redesigned surface.
4. Homepage data and existing navigation/auth behavior remain functional.
5. Layout is verified at desktop, tablet, and mobile widths.
6. Keyboard focus, semantic structure, and reduced-motion behavior remain accessible.
7. Existing local MySQL/dev-server changes in the working tree are preserved.
