# ADR 0002: Home information architecture and spacing rhythm

- Status: Accepted and implemented
- Date: 2026-08-19
- Decision owners: MilerDev product and engineering
- Scope: Public Home page only
- Visual reference: `docs/design/reference/learnova-visual-brand-direction.png`

## Context

The first redesigned Home composition had the intended MilerDev palette, typography, rounded surfaces, and learner imagery, but its vertical rhythm was visibly compressed.

Rendered inspection showed that the problem was structural:

- Tailwind classes such as `py-16`, `sm:py-24`, `mt-6`, and `mb-10` were present and compiled.
- The unlayered legacy reset `* { margin: 0; padding: 0; }` won over Tailwind's layered utilities.
- The shared `.container { padding: 0 1.5rem; }` shorthand also reset vertical padding when `py-*` was used on the same element.
- Several Home sections repeated broad marketing claims, while low or capped counts looked like social proof without helping a learner choose a course.

Adding larger utility values would not have fixed the cascade reliably. The spacing foundation and the page's decision journey both needed to be corrected.

## Decision

### Spacing foundation

1. Keep only `box-sizing: border-box` in the global universal rule. Tailwind Preflight owns margin and padding normalization.
2. Use `padding-inline` for the shared `.container` so the container controls horizontal gutters only.
3. Keep the content width near 1200px, with 16px mobile and 24px larger-screen gutters.
4. Use a consistent Home rhythm:
   - Compact confidence strip: 32–36px block spacing.
   - Standard content section: 64px mobile, 80px tablet, and 96px desktop.
   - Section header to primary content: 40–48px.
   - Card grid gap: 20–24px.
5. At 1440 × 900, show the complete Hero and only the leading edge of the confidence strip before scrolling.

### Implemented Home order

Each section answers one learner question:

1. **Hero — ที่นี่ช่วยฉันไปถึงไหน?**
   - Outcome-led Thai copy, primary course CTA, free-preview CTA, and one learner image.
2. **Confidence strip — ระบบนี้ให้อะไรจริง?**
   - Thai explanation, saved progress, lifetime review access, and certificate eligibility.
   - These are product capabilities, not fabricated social-proof numbers.
3. **Learning outcomes — ฉันจะพัฒนาอย่างไร?**
   - เข้าใจเหตุผล, สร้างด้วยตัวเอง, and ต่อยอดเป็นผลงาน.
   - This replaces illustrative learning paths that had no distinct product destinations.
4. **Latest courses — ตอนนี้ฉันเลือกอะไรได้?**
   - The four latest published courses from the authoritative course query.
   - Mobile uses horizontal scroll snap; tablet and desktop use a grid.
5. **MilerDev Studio proof — ใครอยู่เบื้องหลังเนื้อหา?**
   - Studio-level teaching narrative and a static collage of three real teaching images.
   - No lightbox or unsupported named-instructor claim is added.
6. **FAQ — อะไรยังทำให้ลังเล?**
   - Five canonical pre-purchase answers sourced from the shared FAQ data.
7. **Final CTA — ขั้นต่อไปคืออะไร?**
   - Browse courses is primary; free registration is secondary.

Verified learner testimonials or case studies are omitted until attributable assets exist. It is safer to leave the section out than to invent proof.

## Section admission rule

A section remains on Home only when it:

- answers a distinct purchase or trust question;
- is supported by real content or verified data;
- has one clear primary action;
- does not repeat the previous section's claim;
- still makes sense when there are few courses or no reviews.

## Visual-direction constraints

The Learnova image is a visual direction reference for lightness, spacing, rounded cards, blue-white contrast, friendly learning imagery, and component polish. MilerDev keeps its own logo, Thai copy, information architecture, product truth, and original compositions.

## Consequences

- Global spacing utilities work as authored again, so representative public, learner, and admin routes require regression checks.
- Home no longer depends on weak count-based proof or nonexistent path destinations.
- Course selection stays data-backed without adding schema or admin curation work.
- FAQ answers now have one canonical source shared by Home and the full FAQ page.
- Real reviews or learner projects can be admitted later when their provenance is available.

## Verification

- Inspect 390px, 768px, 1024px, and 1440px layouts.
- Measure computed section padding rather than checking class strings alone.
- Confirm no horizontal page overflow and no collapsed card gutters.
- Confirm mobile course cards scroll horizontally and become a grid from tablet widths.
- Run affected component tests, lint, build, and representative browser checks.
- Confirm Dashboard, learning workspace, and Admin do not regress from the global cascade change.
