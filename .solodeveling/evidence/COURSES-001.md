---
solodeveling_schema: 1
---

# COURSES-001 Evidence

## Current acceptance matrix

| AC | Status | Recent evidence | Scope and limitation |
| --- | --- | --- | --- |
| 1. Catalog is primary; bundles remain discoverable as a secondary path. | Pass | Semantic snapshots and rendered 390/768/1280/1600 views show Course catalog as section 01 before Learning paths section 02. | Local guest-facing data; visual judgment is not user research. |
| 2. Search, price, tag, sort, reset, pagination, course links, and bundle links preserve behavior. | Pass | The no-result/reset E2E submits the native GET form, preserves the search query/value, and returns to /courses; 14-test affected suite passes. Source diff preserves control names/defaults, buildCoursesQuery, pagination calculation/links, and real course/bundle hrefs. | Local data has one result page, so pagination links were verified statically and by build rather than clicked in a multi-page render. |
| 3. Course evidence and free/paid/promotion states remain truthful. | Pass | CourseCard unit contract passes 3/3; public journey E2E finds lesson count, preview, instructor, and preview CTA semantically. Local renders observe one active-promotion course and one free course. | No claim is made for production catalog completeness. |
| 4. No-result state explains recovery; existing loading/error boundaries remain unchanged. | Pass | E2E observes the no-result heading and reset path. Source diff leaves data queries and inherited App Router error handling unchanged. | Provider/database failure and loading timing were not forced in the browser. |
| 5. Responsive layout has no unintended overflow at representative widths. | Pass | Public journey E2E measures equal document client/scroll widths at 390, 768, 1280, and 1600 CSS pixels. Full-page renders were inspected at all four widths with sparse two-course data. | Local lab observation, not field performance data. |
| 6. Semantics, keyboard focus, touch controls, and reduced motion remain usable. | Pass | Snapshots expose main navigation, one H1, labeled regions, complementary filter landmark, native labels/controls, course links, and bundle links. Eight Tab presses reached the catalog jump link in expected order with visible focus. Reduced-motion emulation returned true and computed course/bundle transition durations were both 0s. | No screen-reader or external accessibility audit was run. |
| 7. Presentation uses semantic tokens and page-scoped ownership. | Pass | /courses styles moved from globals.css into courses.module.css; scoped inspection found no --home-*, client, auth, or commerce boundary additions and no dependency changes. Shared CourseCard behavior remains unchanged. | Global shared CourseCard base styles remain the intentional source of truth. |
| 8. Required checkpoint gates and diff integrity pass. | Pass | Focused unit 3/3, affected E2E 14/14, full lint, Next.js production build, rendered checks, and git diff --check all pass after the latest relevant changes. | Git status still includes pre-existing user-owned workflow edits and generated/untracked artifacts that were not modified or staged by this work. |

## Commands and observed results

- npm run test -- --run tests/components/course-card.test.tsx — passed, 1 file and 3 tests.
- npm run test:e2e -- e2e/public-learning-journey.spec.ts e2e/course.spec.ts --project=chromium — passed, 14 tests.
- npm run lint — passed after the final test edits.
- npm run build — passed with Next.js 16.1.4; TypeScript, page-data collection, and 90 static/dynamic routes completed.
- git diff --check — passed; Git emitted only existing LF-to-CRLF working-copy warnings.
- Playwright CLI renders — observed at 390, 768, 1280, and 1600 CSS pixels with zero console errors. One development-only Footer CSS preload warning remained.
- Keyboard check — after navigation, eight Tab presses reached the visible เริ่มเลือกคอร์ส focus target.
- Reduced-motion check — media emulation matched and computed CourseCard/bundle transitions were 0s.

## Debugging observation

- The first affected E2E checkpoint produced 13/14 passing tests because e2e/course.spec.ts used generic nav and main locators on course detail.
- A single-test reproduction confirmed multiple intentional navigation landmarks. Concurrent dev hydration also made the redundant generic main locator transiently resolve twice while the failure snapshot settled to one normal main.
- The repair asserts the unique course-detail breadcrumb landmark and removes the redundant generic main assertion. The single regression then passed, followed by the full affected 14-test suite.

## Scope and recovery

- Product edits are limited to /courses composition, its new CSS module, removal of superseded global catalog rules, and behavior-focused E2E coverage.
- No query, schema, migration, stored data, API, auth, enrollment, payment, dependency, secret, or production action changed.
- Recovery remains a scoped revert of the COURSES-001 source, test, and memory files; no data or schema rollback is required.
