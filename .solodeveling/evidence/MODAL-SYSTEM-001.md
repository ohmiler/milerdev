---
solodeveling_schema: 1
---

# Evidence: MODAL-SYSTEM-001

- Status: complete
- Work: .solodeveling/work/MODAL-SYSTEM-001.md

## Current acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| AC1 | Pass | Shared informational, destructive, payment, and media variants render square public panels/actions; admin radius, color, and elevation remain sourced from existing --admin-* overrides. |
| AC2 | Pass | Course method/coupon and transfer/slip tasks now use two DialogShell instances; stable constants and focused tests preserve all four endpoints, three multipart field names, accepted image types, and the 5 MB limit. Legacy createPortal/overlay selectors are absent. |
| AC3 | Pass | Rendered checks exercised initial focus, Tab and Shift+Tab wrap, Escape, backdrop close, protected verifying state, body scroll lock, and focus return for course payment plus desktop/mobile logout confirmation. |
| AC4 | Pass | Course payment rendered at 360/768/1280 px, bundle payment at 360/1280 px, logout confirmation at 360/1280 px, and Course Preview at 360/1280 px without horizontal overflow; tall transfer tasks scroll inside the panel. |
| AC5 | Pass | Focused 11/11, full 267/267, final ESLint, final Next.js production build, diff integrity, legacy-selector scan, inventory review, and provider-mocked browser checks passed. |

## Commands and observed results

- Focused modal/payment regressions: 3 files and 11 tests passed.
- Full test suite: 28 files and 267 tests passed. Expected negative-path test logs remained present while the suite exited successfully.
- npm run lint: passed with no warnings after stabilizing the explicit focus-return target.
- npm run build: Next.js 16.1.4 compiled, typechecked, generated 90 pages, and completed successfully.
- git diff --check: passed; scoped scan found no legacy course createPortal/overlay selectors or invalid --danger token use.

## Rendered evidence

- Course method and transfer tasks used 0px panels and controls. Coupon input and upload action received initial focus; Shift+Tab/Tab wrapped within the transfer dialog; Escape and backdrop restored the purchase trigger and body scroll.
- A browser-only in-memory image plus mocked slip response kept the dialog open during verification, blocked Escape while pending, then exposed the expected recovery alert and re-enabled actions. No real payment or upload endpoint was called.
- Bundle method and transfer tasks restored their purchase trigger after Escape at 360 and 1280 px; the 360 px transfer panel became internally scrollable without page overflow.
- Logout confirmation focused Cancel and restored the desktop user-menu trigger or mobile main-menu trigger after Escape.
- Course Preview used the dark media variant with a square panel/player at 360 and 1280 px, focused Close first, locked body scroll, and restored the preview trigger after Escape. External video hosts were intercepted with a labeled local browser mock.
- Static inspection retained ShowcaseGallery as a separate lightbox: it already owns Escape and arrow navigation, focus wrapping/restoration, scroll lock, square controls, reduced motion, and narrow-screen composition.

## Limitations

- No production payment provider calls or real uploads were used during verification.
- Browser sessions used a labeled local learner session response and mocked enrollment/slip/video responses; these checks are interaction evidence, not production payment or accessibility-compliance claims.
- Admin custom form modals remain intentionally deferred to the separately planned admin-dashboard phase.
