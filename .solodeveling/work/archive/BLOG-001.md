---
solodeveling_schema: 1
---

# BLOG-001 - Editorial Blog journey

- Status: done
- Level: Standard
- Authority: User authorized continuing the public-journey redesign on 2026-07-21.
- Goal: Make the Blog index and article-reading journey feel like one MilerDev editorial system while preserving published content, discovery behavior, metadata, and reading utilities.
- Users: Thai-speaking developers browsing topics, searching the journal, and reading technical long-form content.
- Recovery: Revert the Blog route modules/components, Blog control styles, focused E2E coverage, and this work/evidence pair. No data, schema, API, cache, or content migration is required.

## Direction

MilerDev Blog is a Thai developer reading room organized by an editorial index and a long-form reading rail, expressed through paper/ink/cyan geometry with real article imagery, metadata, table of contents, and code examples carrying the visual evidence.

- Preserve: Thai editorial voice, current semantic palette, square geometry, visible rules, real post images, tags, dates, authors, reading time, views, search, filters, pagination, TOC, related posts, sharing, copy-code, and reading progress.
- Evolve: Index presentation into scoped styles and make article detail use the same hierarchy instead of gradients, blobs, pills, rounded cards, and scattered inline styles.
- Replace: Decorative gradient/blob chrome and isolated hardcoded widget palettes with semantic tokens and explicit task states.
- Grid: Quiet on reading content, visible where it explains catalog sequence, metadata, related items, and reading orientation.

## Scope

- `/blog`: preserve direct server queries, published-only filtering, search/tag/page parameters, featured-post rule, empty state, pagination links, metadata/robots behavior, and article targets while moving presentation to a route CSS module.
- `/blog/[slug]`: preserve cached queries, published-only lookup, related-post selection, reading-time derivation, sanitized HTML, metadata, JSON-LD, author/tags/views, share URL, and all client utilities while replacing inline presentation with a scoped article module.
- `TableOfContents`, `ShareButtons`, `ReadingProgress`, `ScrollToTop`, and `CodeCopyButton`: preserve public props and actions while using one shared control grammar, explicit button semantics, visible focus, reduced-motion behavior, and non-color copied/active cues.
- Add focused Blog journey coverage and remove only superseded Blog-specific global presentation after scoped ownership is proven.

## Out of scope

- Blog API, admin editor, database/schema, publishing workflow, view-count mutation, sanitizer behavior, cache policy, content rewriting, image-host configuration, authentication, payments, or deployment.
- Changing existing article claims, tags, authors, dates, URLs, related-post algorithm, pagination size, or external share providers.
- Redesigning unrelated rich-content consumers; global `.rich-content` typography/code rules remain shared.

## Acceptance criteria

1. `/blog` retains published data, featured-post eligibility, search, active tag, result count, empty state, pagination query preservation, article links, metadata canonical, and faceted `noindex` behavior.
2. `/blog/[slug]` retains metadata/JSON-LD, sanitized stored content, author/date/reading-time/view evidence, tag links, related articles, back link, TOC, share, copy-code, progress, and scroll-to-top behavior.
3. Index and article use one responsive paper/ink/cyan editorial grammar with readable long-form measure, meaningful image crops/fallbacks, stable hierarchy, and recomposition at narrow/tablet/wide widths.
4. Search, topics, pagination, article cards, TOC, share/copy controls, and scroll recovery expose semantic landmarks/names, explicit button types, visible focus, touch-size controls, reduced motion, and state cues not dependent on color alone.
5. Focused Blog journey checks, affected lint, full Vitest, production build, UTF-8 integrity, diff integrity, and worktree scope review pass; rendered observations are reported only for viewports actually exercised.
6. No API, database, schema, sanitizer, cache, auth, payment, admin, environment, unrelated global rule, tooling, or generated artifact is modified.

## Implementation plan

1. Refactor the Blog index markup into readable semantic sections and a scoped CSS module, preserving every data/query helper and URL contract.
2. Refactor the article page into header evidence, reading column/TOC rail, related reading, and share/back recovery using a scoped CSS module without changing server logic or sanitized HTML flow.
3. Move the five Blog client utilities onto a shared CSS module while preserving props/actions and adding explicit semantics/reduced-motion handling.
4. Remove only obsolete Blog index/TOC presentation from globals after all consumers move, leaving shared rich-content rules intact.
5. Add focused behavior-oriented E2E coverage for index discovery and article reading, then run affected lint/tests/build and reconcile evidence.

## Risks and controls

- Query or URL drift could break discovery: keep helper/data code unchanged and assert search/tag/page/article targets through behavior-oriented coverage.
- Rich HTML or code could overflow: retain the sanitizer and shared `.rich-content` contract, add scoped containment, and inspect representative widths.
- Client utilities could lose keyboard or copy behavior: preserve APIs/handlers, use explicit button semantics and focused controls, and exercise TOC/copy/share visibility where data permits.
- Remote media hosts vary: preserve native image URL behavior rather than narrowing the accepted host set during a presentation change.
- Dirty tooling/artifact files are unrelated: stage and edit only enumerated Blog, test, and Solodeveling files.

## Current limitation

The in-app browser backend was unavailable during the preceding checkpoint. Project Playwright may still provide local rendered evidence; if unavailable, viewport and real interaction claims will remain explicitly unverified rather than inferred from CSS.

## Completion

- Rebuilt the Blog index and article route as one scoped editorial reading system while preserving server queries, URL contracts, metadata, JSON-LD, sanitization, cache behavior, and reading utilities.
- Moved TOC, sharing, reading progress, code-copy, and scroll recovery to a shared semantic control grammar with explicit task controls, visible focus, reduced motion, and non-color state cues.
- Added focused control regression coverage and removed only superseded Blog-specific global presentation.
- Full lint, 222-test regression suite, focused 2-test control suite, production build, UTF-8/legacy-selector scans, diff integrity, local search/copy/progress/scroll interactions, and 390/768/1280/1600 overflow checks passed.
- The local seed article lacks headings, code, and related posts, so populated TOC/code-copy/related rendering remains a recorded verification gap.
