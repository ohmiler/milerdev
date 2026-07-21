---
solodeveling_schema: 1
---

# FORM-CONTROLS-001: Shared learner-facing form controls

- Status: done
- Level: Standard
- Direction: User-confirmed continuation of the learner-facing UI system.
- Goal: Give Contact, Auth, Profile, and Settings one accessible form-control foundation while preserving each surface's intended geometry and all existing behavior.

## Direction and contract

- Thesis: Thai-first transactional forms that keep labels, inputs, recovery, and actions in one stable sequence, expressed with MilerDev blue and one square control geometry across public and workspace surfaces.
- Preserve: request boundaries, validation, autocomplete, password visibility, loading/error/success behavior, server/client boundaries, Thai copy, and all authorization/security behavior.
- Evolve: duplicated input and action CSS into shared typed primitives with `public` and `workspace` density/background variants.
- Component grammar: visible label; 44px-or-larger control; explicit border, focus, disabled, invalid, and loading states; primary and secondary actions named by task.
- Responsive: full-width primary actions where the current mobile flow requires them; no horizontal overflow at 360px.

## Acceptance criteria

1. A shared UI primitive owns input, textarea, primary/secondary button anatomy and applicable focus, disabled, invalid, loading, and forced-color states.
2. Login, Register, Forgot Password, Reset Password, Contact, Profile, and Change Password adopt the shared primitive without changing requests, validation, copy, or navigation.
3. Contact, Auth, Profile, and Settings use one square form geometry while their surface variants retain task-appropriate density and background treatment.
4. Duplicate base control declarations are removed from the three local stylesheets; local styles retain only composition and specialized password-addon behavior.
5. Focused regressions, affected component tests, responsive browser checks at 360 and 1280 px, keyboard focus, lint, build, diff integrity, scope, and UTF-8 checks pass.

## Plan

1. Add typed form input, textarea, and button primitives with shared semantic state styles.
2. Migrate Auth and Contact while preserving their local form composition.
3. Migrate Profile and Change Password using the workspace variant.
4. Remove orphaned duplicated control CSS and update the implementation map in `DESIGN.md`.
5. Verify behavior contracts, responsive rendering, interaction states, project gates, and memory.

## Risks and recovery

- Native props or refs could be lost through wrappers; use typed native attributes and `forwardRef`.
- Password controls need local padding/positioning; preserve the existing specialized reveal buttons.
- CSS precedence could alter size or disabled/focus appearance; inspect computed styles on every surface variant.
- Recovery is a scoped revert of the primitive, seven form adoptions, three stylesheet cleanups, design-map update, tests, and memory. No API, auth, payment, data, schema, or dependency rollback is required.

## Outcome

- Added typed shared input, textarea, and button primitives with public and learner-workspace variants.
- Migrated Login, Register, Forgot Password, Reset Password, Contact, Profile, and Change Password without changing request, validation, navigation, or authorization behavior.
- Removed duplicated base control CSS from Auth, Contact, and Learner Account and documented the durable implementation map.
- Corrected form error states to use the canonical `--error` token and repaired focus/hover selector precedence found during rendered verification.
- Added semantic regressions for the shared primitives and Contact request/field contracts.
- Unified the final control geometry at 0px corner radius across public and workspace variants after rendered design review.
