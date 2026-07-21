---
solodeveling_schema: 1
---

# HOME-013 Evidence

## Current acceptance matrix

| Criterion | Status | Evidence |
|---|---|---|
| AC1: Learning-first Hero and primary CTA | Pass | Playwright found the learning-first H1/copy and verified the first “ดูคอร์สทั้งหมด” link targets /courses. Rendered 390/768/1280 views showed one dominant course CTA with the editor as supporting evidence. |
| AC2: Course evidence precedes workspace | Pass | E2E compared document positions and confirmed Featured Courses precedes the learning workspace. The rendered accessibility snapshot showed Hero → course evidence → Featured Courses → workspace. |
| AC3: Truthful dynamic evidence and empty path | Pass | Local rendered evidence reported 2 featured courses, 10 lessons, and 2 courses with previews; E2E matched the displayed course count to the rendered data-count. Static inspection confirmed counts derive only from featuredCourses and a zero-course fallback contains no numeric claim. |
| AC4: Existing Home behaviors preserved | Pass | Focused E2E preserved Navbar/mobile menu, course cards, editor tabs/playback, workspace progress, gallery dialog/focus recovery, and absence of affiliate/bundle content. Rendered snapshots showed teaching/client proof and Footer remain. |
| AC5: Responsive composition | Pass | Focused E2E passed at 390, 768, and 1280px with no mobile horizontal overflow and 1/2/4 course columns. Playwright screenshots at all three widths showed the Hero, editor, evidence strip, and course-first hierarchy recomposing without visible clipping. |
| AC6: Accessibility and interaction states | Pass | E2E passed editor keyboard/manual/reduced-motion behavior, mobile navigation, semantic course evidence, workspace progressbar, and gallery Escape/focus recovery. Static CSS review confirmed 48px evidence action, focus-visible outline, and reduced-motion transition removal. |
| AC7: Project gates and integrity | Pass | Homepage Playwright: 3 passed. npm run lint: pass. npm run build: pass with TypeScript and 90 routes generated. git diff --check: pass. UTF-8 scan found no mojibake markers. |

## Observation log

- 2026-07-21: Direction confirmed by the user as learning-first because the Home page exists to drive course enrollment.
- 2026-07-21: Static inspection found the current Hero already contains a strong interactive editor and course CTAs, but the workspace precedes Featured Courses. The redesign will preserve evidence components while changing conversion hierarchy.
- 2026-07-21: The new regression failed before implementation because the course-evidence region did not exist; the two unaffected editor and gallery tests passed.
- 2026-07-21: After implementation and product-level assertion cleanup, focused Chromium E2E passed 3/3 in 30.1 seconds.
- 2026-07-21: Playwright CLI rendered 390×844, 768×900, and 1280×900. Observed hierarchy was learning-first with no console errors. Three repeated development-only CSS preload warnings remained; no production build warning or user-visible failure was observed.
- 2026-07-21: ESLint passed. Next.js 16.1.4 production build compiled, TypeScript completed, and 90 routes generated successfully.
- 2026-07-21: Full unit and full cross-route E2E suites were not run; focused Home E2E, lint, production build, static acceptance checks, and diff integrity were used for this Standard UI slice. Admin text check was not applicable because no admin Thai text changed.
