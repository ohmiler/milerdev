---
solodeveling_schema: 1
---

# Evidence: CONTENT-001

- Status: complete
- Work: `.solodeveling/work/archive/CONTENT-001.md`

## Current acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| AC1 | Pass | Source and rendered inspection show all three routes using `PublicContentHeader` and the shared public-content module with the established paper/ink/accent tokens, rules, Navbar, and Footer. |
| AC2 | Pass | Focused contracts cover the unchanged endpoint, response-status check, array guard, loading, empty, and recoverable error presentation. Browser inspection observed the real empty state and a browser-only mocked 500 error with a named retry button. |
| AC3 | Pass | Static render and populated browser mock showed explicit INFO/NOTICE/UPDATE labels, structural numbered rails, real title/content, optional author, and Thai-localized time; color is supplementary. |
| AC4 | Pass | Focused preservation assertions and browser document snapshots confirm nine sections per policy, the 1 January 2568 label, card/payment, bcrypt, no-refund, certificate-scope, email, Facebook, and contact-link statements remain present. No legal review or policy change was performed. |
| AC5 | Pass | Privacy at 768 px and Terms at 360 px each rendered nine index links and nine semantic sections with `scrollWidth === innerWidth`; mobile changes the document to linear number-then-content order. |
| AC6 | Pass | Source inspection and production build confirm route pages are Server Components with metadata; only `AnnouncementFeed` carries `use client` and browser fetching/retry state. |
| AC7 | Pass with recorded limitations | Focused 4/4, full 257/257 after the immediate learner fallback/loading follow-up, full lint, production build, diff check, scope audit, UTF-8 scan, and rendered responsive/state checks passed. Populated and error announcements used explicitly sample browser-only route mocks. |

## Commands and observed results

- `npx vitest run tests/components/public-content.test.tsx`: 4 tests passed.
- `npm test -- --run --maxWorkers=1 --minWorkers=1`: 24 files and 257 tests passed after the immediate learner fallback/loading follow-up.
- `npm run lint`: passed with no reported errors or warnings.
- `npm run build`: Next.js 16.1.4 compiled, typechecked, and generated 90 static pages; announcements, privacy, and terms were emitted as static routes.
- `git diff --check`: passed after implementation.
- Scope audit returned no changes under `src/app/api`, `src/lib`, or `src/components/layout/AnnouncementBanner.tsx`.
- UTF-8/mojibake scan across changed source, test, work, state, and evidence files returned no matches.
- Inline-style scan returned no inline styles across the three routes and shared content components.

## Visual and interaction evidence

- 1280 × 900 announcements: one dominant heading, real local empty state, and browser-only populated warning/update notices were rendered without overflow; the populated screenshot showed the notice rail and metadata hierarchy.
- Browser-only API 500: explicit error text, `role=alert`, and the named `ลองอีกครั้ง` button rendered; console request errors were expected from the mocked 500 response.
- 768 × 1000 privacy: `scrollWidth=768`, nine index links, nine document sections, readable two-column index/document composition, and no console errors.
- 360 × 900 terms: `scrollWidth=360`, nine index links, nine document sections, linear mobile reading order, and no console errors.
- Temporary Playwright mock/audit scripts were deleted and the browser session was closed.

## Limitations and follow-up

- The local dataset contained no active announcement, so populated and error states were observed with labeled browser-only sample responses; no database or API data was changed.
- The retry control binding is supported by source inspection and focused presentation tests; a full network-recovery transition was not exercised against a real outage.
- No legal or privacy expert reviewed the existing policy wording; this work preserves presentation and content rather than asserting legal adequacy.
- Final public-route inventory found a legacy no-lessons fallback in `/courses/[slug]/learn`. An immediate Quick follow-up aligned it with the completed learning workspace while preserving auth, enrollment, continuation redirects, and payment fulfillment boundaries.

## Immediate learner fallback follow-up

- Focused continuation/source contract: 7 tests passed.
- Browser inspection at 1280 px and 360 px showed the dark learning workspace, truthful 00/00 state, full recovery links, and no console errors; at 360 px, `scrollWidth === innerWidth === 360`.
- The lesson loading state was inspected at 1280 px and 360 px: it matched the learning workspace, exposed busy/status text, showed no console errors, and had `scrollWidth === innerWidth === 360` on mobile.
- Full suite, lint, and production build passed after the follow-up; the build emitted 90 pages and contained no preview-only route.
