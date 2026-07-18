---
solodeveling_schema: 1
---

# HOME-011 Evidence - Home hierarchy and interaction language

Date: 2026-07-19

## Baseline observations

- At 390 CSS pixels, the Home hero measured 1,402 pixels high, the workspace section measured 1,652 pixels, and featured courses began at 3,123 pixels.
- Missing local thumbnails rendered as two large identical blue media fields with generic play icons.
- The gallery contact sheet matched the Home system, while its lightbox used inline translucent circular controls, a rounded image frame, and generic zoom/fade styling.
- The proof section and gallery both led with teaching imagery and closely related credibility copy.
- The 390-pixel page had equal document client and scroll widths; the gallery opened by keyboard, closed with Escape, and restored focus.

## Verification

### Acceptance matrix

- Mobile hierarchy: Playwright at 390 x 844 measured the featured-course section at 2,527 pixels from the document top, within three viewports (2,532 pixels). Rendered inspection confirms code-to-result, current lesson, video lesson, and saved progress remain legible after the narrower recomposition.
- Missing course media: the CourseCard component test verifies the fallback uses the existing first tag and title, identifies itself as course material, and omits the former generic placeholder. Rendered 390- and 1280-pixel course cards show the fallback as a quiet paper/grid header rather than an implied photograph.
- Teaching proof: static and rendered inspection confirms the proof now describes the sequence from overview to reason to repeatable action, while the gallery remains a separate record of real classroom and event activity.
- Lightbox: affected E2E verifies keyboard opening, label and zero-padded position metadata, Escape close, and focus restoration. Manual 390- and 1280-pixel checks verified ArrowRight navigation and square token-based controls. CSS includes a reduced-motion override.
- Responsive integrity: document client and scroll widths matched at 390, 768, 1280, and 1600 CSS pixels. Representative screenshots are in output/playwright/home011-*.png.

### Automated checks

- npx vitest run: pass, 13 files and 214 tests.
- npx playwright test e2e/homepage.spec.ts e2e/public-learning-journey.spec.ts --workers=1 --reporter=line: pass, 5 tests.
- npm run lint: pass.
- npm run build: pass; Next.js compiled, type-checked, and generated 90 static pages.
- git diff --check: pass.

### Observations and limitations

- The first affected E2E run used five workers while full Vitest and lint were running concurrently; all five browser tests timed out during navigation. A local HTTP probe returned 200, and the same five tests passed with one worker in 25.2 seconds. This is recorded as local dev-server resource contention rather than a product assertion failure.
- Vitest emitted existing non-failing negative-path logs and a styled-jsx test-render warning; all 214 assertions passed.
- Visual checks used local course data, which has no real course thumbnails or aggregate duration. No media, outcomes, metrics, or testimonials were invented.
- The Solodeveling CLI is not installed in this environment, so memory consistency was reconciled manually against state, work, evidence, source, tests, and current status.
