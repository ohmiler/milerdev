---
solodeveling_schema: 1
---

# CONTENT-001: Public announcements and policy reading system

- Status: done
- Level: Standard
- Direction: User-authorized continuation of the remaining learner-facing surfaces before Admin.
- Goal: Bring announcements, privacy, and terms into one clear public reading system without changing announcement targeting, API behavior, or the meaning of published policy text.
- Primary users: Learners checking current service notices and visitors reading MilerDev privacy or usage terms.

## Scope

- Redesign `/announcements`, `/privacy`, and `/terms` with a shared public-content visual and component grammar.
- Split announcements into a Server Component page shell with metadata and a narrow client feed.
- Preserve `/api/announcements`, role targeting, ordering, fields, and the current maximum result set.
- Add explicit announcement loading, empty, error, and retry states.
- Preserve all existing privacy and terms statements, update label, contact information, and navigation targets.
- Add responsive in-page orientation for long policy documents and focused product-level tests.

## Out of scope

- Legal review, changes to policy meaning, dates, promises, refund rules, provider claims, or compliance assertions.
- Announcement API/admin behavior, database queries/schema, role authorization, banner dismissal, notifications, or pagination.
- Admin redesign, deployment, provider checks, or unrelated public pages.

## Direction and system

- Thesis: A public reading desk for Thai learners, organized by editorial sequence and document orientation, expressed through MilerDev's paper/ink/accent palette and authentic notice/policy metadata.
- Direction is brand-derived from the completed Home, About, FAQ, Contact, Account, and Proof systems and the user-approved light learning-first direction.
- Preserve: Thai copy, global typography, paper canvas, ink hierarchy, cyan accent, square geometry, Navbar/Footer, real announcement data, and direct contact path.
- Evolve: legacy gradients, emoji-led headings, rounded card stacks, inline style objects, and whole-page client rendering into quiet rules, numbered sections, readable measure, and task-specific state surfaces.
- Grid: quiet on long-form documents; visible only for announcement sequence, document index, and metadata relationships.
- Shared grammar: page header with eyebrow/title/lede and evidence; announcement feed with typed non-color marker; legal document with sticky index on wide screens and linear reading order on narrow screens.
- Motion: none required beyond existing focus/hover transitions; reduced-motion remains governed by the global system.

## Acceptance criteria

- AC1: All three routes use one responsive public-content system with MilerDev tokens, readable Thai hierarchy, square/rule-based geometry, Navbar, and Footer.
- AC2: Announcements retains the existing endpoint and data contract, exposes metadata, and handles loading, populated, empty, error, and retry states without leaking raw errors.
- AC3: Announcement type is communicated with text and a structural marker rather than color or emoji alone; real title, content, author when present, and Thai date remain visible.
- AC4: Privacy and terms retain every existing section and statement, the 1 January 2568 update label, email/Facebook/contact facts, and the contact link.
- AC5: Long policy pages provide semantic headings, lists, a usable in-page section index, readable measure, and mobile order without horizontal overflow.
- AC6: Server/client boundaries remain narrow: route metadata stays server-side and only announcement fetching/retry is client-side.
- AC7: Focused tests, affected regressions, lint, build, responsive rendering, interaction states, diff integrity, scope audit, and UTF-8 checks pass when capabilities allow.

## Plan

1. Add focused contracts for preserved announcement fetch/state behavior and complete legal section/content inventory.
2. Build a shared public-content CSS module plus a reusable legal document renderer.
3. Convert announcements to a metadata-bearing server page and client feed with recovery states.
4. Recompose privacy and terms from preserved content data into the shared legal renderer.
5. Verify focused behavior, responsive states, semantics, lint, build, scope, UTF-8, memory, and worktree integrity.

## Risks and recovery

- Policy copy could be accidentally dropped or paraphrased; tests will assert section counts and high-risk statements before and after the refactor.
- A client-boundary change could alter role-targeted announcements; the existing API remains untouched and the feed keeps the same endpoint/fields.
- Date formatting may differ by runtime; keep the existing Thai locale options and exercise deterministic sample timestamps.
- Rollback is presentation-only: restore the three pages and remove the shared content components/module/tests. No data or provider rollback is required.

## Outcome

- Announcements now uses a metadata-bearing Server Component shell and a narrow client feed with loading, empty, error, retry, populated, typed, dated, and authored states.
- Privacy and terms now share a long-form legal document system with public metadata, a nine-item index, semantic numbered sections, readable measure, and responsive recomposition.
- All prior policy statements, update labels, contact facts, and contact targets remain present; no legal meaning was intentionally changed.
- The announcement API, targeting query, database, Admin, banner dismissal, and provider behavior were not changed.
- The final learner-facing inventory found one remaining presentation outlier in the reachable no-lessons fallback at `/courses/[slug]/learn`; an immediate Quick follow-up aligned it with the completed learning workspace before handoff.
