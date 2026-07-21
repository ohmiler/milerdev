---
solodeveling_schema: 1
---

# PUBLIC-HEADER-001: Shared public page header

- Status: done
- Level: Standard
- Direction: User-confirmed continuation of the public UI system.
- Goal: Align About and Contact with the Courses/Blog public header anatomy while preserving the distinct story and task priorities of each page.

## Direction and contract

- Thesis: A learning-first public orientation rail that uses MilerDev's precise editorial grid to identify the page, state its promise, and hand visitors into the next task.
- Preserve: all Thai copy, metadata, Navbar/Footer, About content and imagery, Contact information/form behavior, paper/ink/accent tokens, square geometry, and Server Component boundaries.
- Evolve: the two legacy flat stacked heroes into one shared semantic component.
- Component grammar: eyebrow, dominant title, ruled supporting copy; story density for About and compact task density for Contact.
- Responsive: two tracks on wide screens; a deliberate single reading sequence below tablet width; no horizontal overflow.

## Acceptance criteria

1. About and Contact use one shared semantic header component whose anatomy matches Courses/Blog.
2. About uses a story variant and Contact a compact task variant without making the pages pixel-identical.
3. Existing page copy, contact facts, form behavior, metadata, body content, Navbar, and Footer remain unchanged.
4. The shared header remains a Server Component, uses existing semantic tokens, and introduces no dependency or global CSS.
5. Focused regression, responsive renders at 360/768/1280/1600, lint, build, diff integrity, scope, and UTF-8 checks pass.

## Plan

1. Add a focused semantic/component contract.
2. Build the shared header and task-based variants.
3. Adopt it in About and Contact and remove only orphaned legacy hero selectors.
4. Verify source, behavior, responsive composition, project gates, and memory.

## Risks and recovery

- Long Thai headings may wrap poorly at intermediate widths; verify actual headings across all target widths.
- Contact must not push the form too far below the fold; keep the task variant compact.
- Recovery is a scoped revert of the shared component, two page adoptions, local CSS cleanup, test, and memory. No API, form, data, auth, payment, or schema rollback is required.

## Outcome

- About and Contact now share one semantic public header anatomy derived from Courses/Blog.
- About keeps a spacious story variant; Contact uses a compact task variant that reaches its body sooner.
- Existing page copy, metadata, body content, imagery, contact facts, form implementation, Navbar, and Footer remain unchanged.
- No API, form behavior, auth, payment, data, schema, dependency, or global style changed.
