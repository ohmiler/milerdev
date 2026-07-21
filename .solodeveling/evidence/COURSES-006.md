---
solodeveling_schema: 1
---

# COURSES-006 Evidence

## Current acceptance matrix

| Criterion | Status | Evidence |
|---|---|---|
| AC1: Truthful Hero decision facts | Pass | Final accessibility snapshot and 390/768/1280 renders showed the title, source description, 6 lessons, 1 available preview, and the existing instructor record. Duration remains conditional because the local fixture has no recorded video duration. |
| AC2: Curriculum-first hierarchy | Pass | Focused E2E asserted “เส้นทางการเรียน” and document order. Browser measurements at all three widths placed curriculum before overview; the accessibility snapshot showed 01 Curriculum followed by 02 Overview. |
| AC3: Commerce state preserved | Pass | Static diff confirmed the existing CourseDetailClient remains mounted once with unchanged courseId, slug, and effective-price props. Focused E2E and browser measurements found exactly one enrollment button. Promo price, original price, benefits, and next-step payment copy rendered from existing state. |
| AC4: Responsive transaction order | Pass | The DOM and visual order is promo → price/action → benefits → media. Final 390×844 render exposed the price and CTA before media. Browser measurements returned viewport/scroll widths 390/390, 768/768, and 1280/1280 with one enrollment button at each width. |
| AC5: Truthful instructor proof | Pass | Static inspection binds the section only to the existing instructor name and optional normalized avatar. Local render exercised the no-avatar initial fallback with “Instructor Demo”; no biography or credential was invented. |
| AC6: Semantics and retained behavior | Pass | Final accessibility snapshot preserved breadcrumbs, main/aside/article landmarks, heading order, anchors, lesson list states, reviews empty state, Navbar, and Footer. CSS preserved focus ring and reduced-motion rules. Fresh browser session logged no console errors. |
| AC7: Project gates and integrity | Pass | Focused Chromium Course E2E: 11 passed. Full ESLint: pass. Next.js 16.1.4 production build and TypeScript: pass, 90 pages generated. git diff --check: pass. UTF-8 scan found no mojibake markers. |

## Observation log

- 2026-07-21: User authorized Course Detail redesign after completing the learning-first Home.
- 2026-07-21: Baseline render at 1280×720 showed a strong editorial shell but placed curriculum after a repeated overview. At 390×844 the enrollment CTA remained below the 16:9 media and outside the initial viewport.
- 2026-07-21: Accessibility snapshot confirmed one enrollment action, six lessons, one free preview, an instructor record, reviews empty state, and no console errors. Two development-only warnings were observed.
- 2026-07-21: Work classified Standard because scope is presentation and hierarchy only; commerce, authorization, database, and API behavior are explicitly preserved.
- 2026-07-21: Focused Course E2E passed 11/11, including the existing auth and enrollment API boundary checks.
- 2026-07-21: Final browser renders at 390×844, 768×900, and 1280×900 showed the curriculum-first hierarchy and price/action before media. Exact width measurements found no horizontal overflow at any viewport.
- 2026-07-21: Fresh browser session after the production build logged no console errors. Development sessions emitted CSS preload warnings during Fast Refresh only.
- 2026-07-21: Full lint and production build passed. Authenticated, already-enrolled, free-course, no-promotion, missing-instructor, and live payment-provider UI states were not rendered; their existing conditional code and commerce components were unchanged.
