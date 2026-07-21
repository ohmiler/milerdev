---
solodeveling_schema: 1
---

# Evidence: FORM-CONTROLS-001

- Status: complete
- Work: `.solodeveling/work/archive/FORM-CONTROLS-001.md`

## Current acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| AC1 | Pass | `FormInput`, `FormTextarea`, and `FormButton` own native props, refs, public/workspace variants, focus, invalid, disabled, pending, hover, and forced-color states. Three primitive semantic regressions passed. |
| AC2 | Pass | Source inspection and focused regressions show all seven forms use the primitive while preserving fetch/sign-in boundaries, validation, autocomplete, navigation, loading, and recovery behavior. |
| AC3 | Pass | Contact/Auth rendered at 1280 and 360 px with computed 0px input and button radii; Profile/Settings inherit the same square base geometry while retaining their 46px/44px workspace density. |
| AC4 | Pass | Orphan scan found no legacy Auth provider/primary control references, Account input references, duplicated base selectors, or `--danger` usage in the affected form styles. |
| AC5 | Pass | Focused 19/19 and post-cleanup 11/11, full 264/264, final ESLint, final production build, representative 360/1280 browser checks, state checks, diff integrity, scope, and UTF-8 scans passed. |

## Commands and observed results

- Focused form/Auth/Contact/Account regressions: 6 files and 19 tests passed; post-cleanup primitive/Register/Account regressions: 3 files and 11 tests passed.
- Pre-commit focused regression rerun after the square-geometry follow-up: 3 files and 9 tests passed.
- `npm test -- --run --maxWorkers=1 --minWorkers=1`: 27 files and 264 tests passed after replacing one attribute-order-dependent Contact assertion with a semantic submit-button match.
- `npm run lint`: passed after the final source cleanup.
- `npm run build`: Next.js 16.1.4 compiled, typechecked, generated 90 pages, and preserved Contact/Auth recovery routes as static plus Profile/Settings as dynamic authenticated routes. The first build invocation timed out without a compiler result; process/lock inspection found no stuck build or `.next` lock, and two subsequent direct builds passed, including the final post-cleanup build.
- `git diff --check`: passed for the scoped files.
- Scoped scans found no mojibake markers, no legacy duplicated form selectors, no invalid `--danger` references, and no changes under APIs, server libraries, dependencies, or lockfiles.

## Rendered evidence

- Contact, Login, and Register rendered at 1280 and 360 px with no horizontal overflow; desktop and mobile screenshots showed one form-control grammar and preserved page hierarchy.
- A final geometry follow-up rechecked Contact, Login, and Register at 1280 and 360 px: inputs and buttons computed to 0px corner radius on every route, with no horizontal overflow.
- Forgot Password rendered at 1280 and 360 px; Reset Password missing-token recovery rendered at 360 px; both had no horizontal overflow.
- Contact focus showed the accent border plus 3px focus ring after correcting hover/focus precedence.
- Register mismatch state exposed `aria-invalid="true"`, the canonical error border `#f43f5e`, visible mismatch copy, and the focus ring.
- Contact browser-only 500 and 200 response mocks preserved valid input on error and produced the expected alert and success confirmation without calling the real API. The 500 mock intentionally generated one failed-request console entry; a clean Reset route check ended with zero console errors.

## Limitations

- Profile and Settings require an authenticated local session; their form output was covered by component rendering, source inspection, focused regressions, lint, and production build rather than an authenticated browser screenshot.
- Rendered checks are local browser observations, not user research or an accessibility-compliance claim.
- `solodeveling-validate` was unavailable; memory structure was reviewed manually against the current schema and lifecycle contract.
