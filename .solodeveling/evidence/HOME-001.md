---
solodeveling_schema: 1
---

# HOME-001 Evidence

## Acceptance matrix

| Claim | Method | Result | Limitation |
| --- | --- | --- | --- |
| Public UI uses the approved light-default palette | `tests/home-light-palette.test.ts`; static token inspection | Passed | Does not measure visual contrast in a rendered browser. |
| Repository guidance requires Solodeveling and Gridgeist | `tests/home-light-palette.test.ts`; `AGENTS.md` inspection | Passed | Guidance effectiveness depends on future agents following repository instructions. |
| Homepage course claims match selection logic | `tests/home-featured-courses.test.ts` | Passed | Course descriptions remain admin-authored data. |
| Bundle is comparison-led and avoids false urgency/gradient action | `tests/home-light-palette.test.ts`; source inspection | Passed | No published bundle existed in local page data, so the rendered bundle state was not observed. |
| Affiliate content is disclosed and reduced-motion-aware | `tests/homepage-hardening.test.ts` | Passed | Live banner image crops and external destinations were not exercised. |
| Hero code tabs meet the touch-target baseline and support keyboard navigation | `tests/home-hero.test.ts`; TypeScript build | Passed | Browser keyboard and touch interaction were not manually exercised. |
| Proof gallery is reduced to selected evidence and retains lightbox semantics | `tests/home-showcase-gallery.test.ts` | Passed | Image crop quality was not visually observed. |

## Commands and observations

- Focused Vitest: `npm.cmd run test -- --run tests/home-light-palette.test.ts tests/home-featured-courses.test.ts tests/home-hero.test.ts tests/home-showcase-gallery.test.ts tests/homepage-hardening.test.ts` — 5 files, 13 tests passed.
- Lint: `npm.cmd run lint` — passed.
- Production build: `npm.cmd run build` — passed after running outside the network-restricted sandbox so `next/font` could fetch IBM Plex Sans Thai and Inter.
- HTTP smoke: `GET http://localhost:3000/` — 200; new latest-course and selected-proof content present; old popular-course label absent.
- Diff hygiene: `git diff --check` — passed; line-ending conversion warnings only.
- Scope inspection: implementation files are limited to root guidance, global tokens, homepage/home components, focused tests, and Solodeveling memory. No auth, payment, enrollment, API, schema, or migration files changed by this work.

## Accepted verification gap

The Browser runtime reported no available browser backend. Responsive viewports, visual hierarchy, focus rendering, actual image crops, and live bundle/banner states remain unverified. Completion is bounded to code, automated checks, build output, and HTTP smoke; no claim of visual perfection or accessibility compliance is made.
