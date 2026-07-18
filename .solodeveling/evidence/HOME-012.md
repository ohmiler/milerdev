---
solodeveling_schema: 1
---

# HOME-012 Evidence - Dominant Hero editor

Date: 2026-07-19

## Verification

### Acceptance matrix

- Equal desktop tracks: Home E2E at 1280 CSS pixels measured the Hero copy and editor tracks within 1 pixel of equal width. The editor surface matched the right track width and height within 1 pixel.
- Dominant editor surface: rendered 1280- and 1600-pixel screenshots show the editor occupying the full right half from window bar through status bar rather than appearing as a small card.
- Editor-only contract: focused static coverage confirms project orientation, EXPLORER, file structure, accessible file tabs, code panel, and status remain, while RESULT and all legacy preview markup are absent.
- Interaction preservation: affected E2E verifies pointer and focus pause, ArrowRight file selection, manual state, active explorer file, and reduced-motion state. Existing implementation retains ArrowLeft, Home, and End handling through the same tab activation path.
- Responsive composition: rendered 768 pixels shows a text-first then full workspace stack. At 390 pixels, activity rail and explorer are intentionally removed while window bar, tabs, breadcrumb, code, and status remain.
- Overflow: document client and scroll widths matched at 390, 768, 1280, and 1600 CSS pixels. The established mobile featured-course threshold also remained green in Home E2E.

### Automated checks

- npx vitest run: pass, 13 files and 214 tests.
- npx playwright test e2e/homepage.spec.ts e2e/public-learning-journey.spec.ts --workers=1 --reporter=line: pass, 5 tests.
- npm run lint: pass.
- npm run build: pass; Next.js compiled, type-checked, and generated 90 static pages.
- git diff --check: pass.

### Rendered observations and limits

- Playwright CLI rendered 390 x 844, 768 x 900, 1280 x 900, and 1600 x 1000. Screenshots are in output/playwright/home012-*-hero.png.
- The desktop editor keeps a deliberately quiet blank code-canvas area after the sample lines, matching a real editor workspace instead of filling the surface with invented product proof.
- Browser console inspection reported zero errors and local development stylesheet preload warnings only.
- Vitest emitted the known non-failing styled-jsx static-render warning and expected negative-path logs; all assertions passed.
- Rendered review is local design evidence, not user research or a production performance measurement.

## Follow-up verification

### Acceptance matrix

- Content-height alignment: Home E2E at 1280 CSS pixels measured the editor and left copy track heights within 1 pixel. The desktop Hero now derives row height from the left content instead of a viewport or editor minimum.
- Breathing room: rendered 1280- and 1600-pixel review shows clear paper space above and below both equal-height tracks.
- Tabs-only editor: focused static coverage confirms three accessible tabs and no explorer, activity rail, result preview, or related legacy styles.
- Visible typing: pointer entry no longer pauses playback; E2E confirms the editor remains in auto state with a visible typing cursor. Focus, manual tab selection, keyboard navigation, and reduced motion retain stable states.
- Decorative cleanup: static and rendered inspection confirms the Hero no longer has the top-right soft-blue rectangle, bottom blue strip, or soft-blue editor shadow. Other page sections and semantic focus states keep their established color tokens.
- Responsive integrity: rendered 390, 768, 1280, and 1600 CSS pixels show the intended stack or equal tracks with no horizontal overflow. Mobile course discovery remains within the existing E2E threshold.

### Recent checks after the follow-up

- npx vitest run: pass, 13 files and 214 tests.
- npx playwright test e2e/homepage.spec.ts e2e/public-learning-journey.spec.ts --workers=1 --reporter=line: pass, 5 tests.
- npm run lint: pass.
- npm run build: pass; Next.js compiled, type-checked, and generated 90 static pages.
- git diff --check: pass.
- Rendered screenshots: output/playwright/home012-followup-390-hero.png, home012-followup-768-hero.png, home012-followup-1280-hero.png, and home012-followup-1600-hero.png.

### Limits

- Browser console inspection reported zero errors and development stylesheet preload warnings only.
- The styled-jsx static-render warning and expected negative-path test logs remain non-failing; all assertions passed.
- Rendered review is local design evidence, not production performance data or user research.

## Cursor-position follow-up

### Acceptance matrix

- Live cursor position: the left status group now renders `Ln number, Col number` from the active animated line and character index. Column counting includes the rendered two-space indentation.
- Stable states: initial server markup is `Ln 1, Col 1`; paused playback retains its latest position, while manual tabs and reduced motion resolve to the end of the complete active snippet.
- Exact format: focused static coverage rejects the old Auto typing label and parenthesized number forms. Home E2E matches `Ln \\d+, Col \\d+` and observes the value changing during automatic typing.

### Recent checks after the cursor-position follow-up

- `npm run test -- --run`: pass, 13 files and 214 tests.
- `npx playwright test e2e/homepage.spec.ts --workers=1 --reporter=line`: pass, 3 tests.
- `npx playwright test e2e/public-learning-journey.spec.ts --workers=1 --reporter=line`: pass, 2 tests.
- `npm run lint`: pass.
- `npm run build`: pass; Next.js compiled, type-checked, and generated 90 static pages.
- `git diff --check`: pass after final source, test, and Solodeveling reconciliation.

### Limits

- The first broad `npm run test` attempt timed out because the repository script starts Vitest in watch mode; the explicit `--run` invocation completed successfully.
- Vitest retained the known non-failing styled-jsx static-render warning and expected negative-path logs.

## Full-width blue status-bar follow-up

### Acceptance matrix

- Full-width treatment: the footer container itself now uses the established editor blue `#0089cc`, so the color continues behind both the live Ln/Col group and the language/UTF-8 group.
- Readability and semantics: both footer groups retain the light editor text, and the ready indicator remains the established semantic green against the blue surface.
- Browser evidence: Home E2E asserted the rendered status background as `rgb(0, 137, 204)` while the existing typing, tab, reduced-motion, layout, and gallery checks remained green.

### Recent checks

- `npx playwright test e2e/homepage.spec.ts --workers=1 --reporter=line`: pass, 3 tests.
- `npm run lint`: pass.
- `npm run build`: pass; Next.js compiled, type-checked, and generated 90 static pages.
- `git diff --check`: pass after final source, E2E, and Solodeveling reconciliation.

### Limits

- The browser assertion verifies the full footer container color and affected behavior; no new user research or production performance measurement was performed.

## Continuous typing-loop follow-up

### Acceptance matrix

- Continuous cycle: ambient playback retains the established HTML to CSS to JavaScript index cycle and returns to HTML indefinitely.
- Manual recovery: direct tab or keyboard selection remains a stable manual state while focus is inside the editor. When focus leaves, the permanent manual lock is cleared, typing restarts on the selected file, and the ambient cycle continues.
- Motion accessibility: reduced motion still renders complete stable code and does not restart character-by-character typing.
- Browser evidence: the affected Home E2E selected CSS manually, moved focus outside the editor, observed playback return to auto with a visible cursor, then observed the active file advance to `app.js` and wrap to `index.html`.

### Recent checks

- `npm run test -- --run`: pass, 13 files and 214 tests.
- `npx playwright test e2e/homepage.spec.ts --workers=1 --reporter=line`: pass, 3 tests including a complete CSS to JavaScript to HTML loop observation.
- `npm run lint`: pass.
- `npm run build`: pass; Next.js compiled, type-checked, and generated 90 static pages.
- `git diff --check`: pass after final source, E2E, and Solodeveling reconciliation.

### Limits

- The loop browser check intentionally allows up to 60 seconds because it observes the production animation cadence rather than accelerating timers.
- Vitest retained the known non-failing styled-jsx static-render warning and expected negative-path logs.
