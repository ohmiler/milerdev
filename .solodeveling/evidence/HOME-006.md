---
solodeveling_schema: 1
---

# HOME-006 — Evidence

## Scope and implementation

- Replaced the floating pill-style price badge with a labelled marker anchored to the thumbnail/content boundary.
- Added explicit `ราคา` plus value structure for paid and free courses, and `ราคาพิเศษ` plus original/current values for active promotions.
- Kept the existing display-price, original-price, discount-percentage, route, and card-link calculations unchanged.
- Used the approved light surface, accent-soft, warning tint, line, text, and monospace-label roles; no dependency, database, commerce, or production-data change was made.

## Observed browser evidence

- Home at 1440x1000: the paid and free markers align with the thumbnail lower-right edge, remain subordinate to the course title, and preserve the card's grid structure. The paid-card hover state kept the marker stable while the card border/title/arrow feedback remained visible.
- `/courses` at 1440x1000: both markers remained legible over the real fallback artwork and aligned consistently despite tags and instructor metadata in the shared cards.
- Home and `/courses` at 390x844: markers fit within the single-column cards without horizontal overflow, do not cover the centered play symbol, and retain clear `ราคา` plus value reading order.
- Semantic browser snapshots exposed the card names as `ราคา ฿1,990 ...` and `ราคา ฟรี ...`, providing a non-color cue for both states.
- Browser console inspection returned zero errors. Development rendering emitted the existing CSS preload warning.
- Accepted gap: the local published dataset has no active promotional course, so the promo marker was not claimed as observed render evidence. Static inspection confirms distinct `ราคาพิเศษ`, original struck-through price, current price, and discount text while the production build validates the branch.

## Automated and static evidence

- `npm.cmd run lint`: passed after the final implementation edit.
- `cmd.exe /c npx.cmd playwright test e2e/homepage.spec.ts`: passed 2/2 Chromium tests after installing the exact Playwright Chromium revision required by local `@playwright/test@1.58.2`.
- `cmd.exe /c npm.cmd run test -- --run`: passed 11 files and 210 tests outside the filesystem sandbox.
- `cmd.exe /c npm.cmd run build`: passed Next.js 16.1.4 production compilation, TypeScript checks, page-data collection, and generation of 90 static pages outside the network/filesystem sandbox.
- `git diff --check`: passed after the final edit.

## Diagnostic note

- The first E2E attempt failed before running because Chromium revision 1208 was absent; installing that exact revision resolved it without source changes.
- The first Vitest/build attempts were blocked by sandbox filesystem access and Google Fonts network access. Rerunning the same commands with the required execution permissions passed, ruling out a badge regression.

## Recovery

- Revert the scoped `CourseCard` price-marker markup and the associated shared/Home CSS. No stored price, payment, promotion, or enrollment behavior requires recovery.

## Promo-color follow-up

- User-provided rendered evidence exposed a real 50% promotion and showed that the 14–16% warning tint lacked sufficient visual hierarchy.
- Added the dedicated `promo` token `#C5163A` to `milerdev-color-palette.md` instead of reusing the `error` token, preserving distinct commerce and error meanings.
- Applied the promo token with white text to both the `ลด 50%` flag and the grid-anchored promotional price marker. The original price remains struck through and visually secondary, while the current price remains the strongest value.
- Home at 1440x1000: the red flag and marker visibly form one promotion system; the marker remains subordinate to the course title and distinct from the blue free-course marker.
- Home at 390x844: `ราคาพิเศษ`, the struck-through original price, and the current price remain on one line within the card without horizontal overflow.
- Browser console inspection at the mobile promo state returned zero errors.
- `npm.cmd run lint`: passed after the promo-color implementation.
- `cmd.exe /c npx.cmd playwright test e2e/homepage.spec.ts`: passed 2/2 Chromium tests after the promo-color implementation.
