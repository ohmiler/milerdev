# Public Navigation Design Notes

## Purpose

The public navbar should identify MilerDev quickly, expose the primary discovery routes, and keep authentication actions available without competing with page content.

## Direction

A coding-studio index built on the shared 12-column editorial grid, quiet structural rules, technical numbering, and one controlled blue accent.

## Implemented composition

- Desktop keeps three aligned zones: brand, numbered route index, and account actions.
- Vertical rules separate zones only; individual links are not boxed.
- Route numbers use monospace as technical metadata while Thai labels remain primary.
- Active and hover states use accent text plus a 2px baseline rule.
- Mobile becomes a full-width editorial index with a compact metadata header, numbered links, and paired authentication actions.
- The existing 841px compact breakpoint, auth states, notification/user menus, Escape handling, outside-click handling, and route behavior remain unchanged.

## Verification

- Targeted Vitest navbar and design-foundation tests.
- Desktop visual inspection at 1280px.
- Mobile visual inspection at 390px with the menu open.
- Browser console inspection showed no navbar errors.

## Source files

- `src/components/layout/PublicNavbar.tsx`
- `src/components/layout/MobileNavPanel.tsx`
- `tests/navbar-polish.test.ts`
