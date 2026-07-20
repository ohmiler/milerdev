---
solodeveling_schema: 1
---

# Evidence - BLOG-001

## Current acceptance matrix

| Criterion | Method | Result | Limitation |
| --- | --- | --- | --- |
| 1. Preserve Blog discovery and metadata behavior | Source/diff inspection; local browser search flow; production build | Passed. Published-only queries, featured eligibility, count, search/tag/page URLs, empty/pagination branches, article targets, canonical metadata, and faceted `noindex` remain server-owned. Search for `ยินดี` produced the encoded query URL, search-result metadata title, and matching article link. | Local seed data has one published article, so multi-page pagination and a populated tag result were inspected statically rather than exercised with production data. |
| 2. Preserve article data and reading utilities | Source/diff inspection; local article snapshot; Playwright CLI interaction | Passed. Metadata/JSON-LD, sanitizer, cached query, author/date/read-time/views, tags, related selection, share providers, back link, TOC/code-copy mounting, progress, and scroll recovery remain present. Copy feedback returned `คัดลอกแล้ว`; progress moved 0 to 100; scroll-to-top returned progress and scroll position to 0. | The only local article has no H2 or code block and no related match, so populated TOC, code-copy injection, and related-card rendering were not exercised against live content. |
| 3. One responsive editorial grammar | Rendered Playwright CLI review and scoped CSS inspection | Passed at 390x844, 768x1024, 1280x900, and 1600x1000. Index and article use the same paper/ink/cyan rules, square controls, reading measure, evidence rail, and responsive recomposition. | Rendered review is local design evidence, not user research or production performance evidence. |
| 4. Semantic and accessible controls | Accessibility snapshots; focused component test; source/CSS inspection | Passed. Search/topic/article/content landmarks are named, task buttons have explicit types, progress is a named bounded value, share states include text, active TOC uses `aria-current`, and reduced-motion/focus/touch rules are present. | Assistive-technology user testing was not performed; populated TOC focus behavior remains limited by seed content. |
| 5. Focused and broad gates | Commands and browser checks below | Passed. Focused test 2/2, focused and full ESLint, full Vitest 222/222, production build, UTF-8 scan, selector cleanup, overflow checks, and diff integrity passed. | Vitest retained existing non-failing warnings and expected negative-path logs. |
| 6. Scope integrity | `git diff --check`, `git status --short`, and targeted diff inspection | Passed for product source. No Blog API, database/schema, sanitizer, cache policy, auth, payment, admin, environment, or unrelated product module was edited. | Pre-existing dirty skill/plugin and untracked browser/output artifacts remain intentionally outside this change. Playwright CLI added untracked session evidence under the already-untracked `.playwright-cli/` directory. |

## Commands and observed results

- `npm.cmd run lint --` with the affected Blog routes and five client controls - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run test -- --run` - 15 files and 222 tests passed.
- `npm.cmd run test -- --run tests/components/blog-controls.test.tsx` - 1 file and 2 focused tests passed.
- `npm.cmd run lint -- tests/components/blog-controls.test.tsx` - passed.
- `npm.cmd run build` - compiled, type-checked, generated 90 routes, and retained dynamic `/blog` and `/blog/[slug]` routes.
- `rg` checks - no Blog mojibake markers or superseded `blog-index__`, `blog-toc-layout`, `blog-toc-sidebar`, or `code-copy-btn` selectors remain in app/tests/E2E sources.
- `git diff --check` - passed; line-ending warnings only.

## Rendered and interaction evidence

- Blog index accessibility snapshot exposed the main heading, ARTICLE INDEX, search landmark, named topic navigation, real article target, and footer navigation with zero console errors.
- Search submitted `ยินดี`, navigated to `/blog?search=...`, changed the page title to `ผลการค้นหา ยินดี | MilerDev`, and retained the matching article.
- Article accessibility snapshot exposed breadcrumb, article evidence, content region, share providers, copy action, back recovery, reading progress, and TOC complementary landmark.
- Copy-link feedback changed to `คัดลอกแล้ว` immediately after activation.
- Reading progress reported 0 at the top and 100 at the local article bottom; the scroll-to-top button appeared after 400 pixels and returned `scrollY` and progress to 0.
- Document `scrollWidth` equaled `clientWidth` on index and article at 390, 768, 1280, and 1600 CSS pixels.
- Mobile and desktop screenshots were inspected from temporary files outside the repository. Browser console had zero errors and one Next.js development stylesheet-preload warning.

## Recovery and remaining risk

- Recovery is presentation-only: revert the two Blog route modules and CSS modules, five Blog control modules/shared CSS, focused component test, and removed obsolete Blog globals. No data, API, cache, or migration rollback is required.
- Native article/post images remain intentional because stored hosts are not constrained to the current Next Image remote configuration.
- A future content-fixture pass should exercise a long article with at least two H2 headings, a code block, tags, imagery, and related articles; this is a bounded verification gap rather than a source/build blocker.
