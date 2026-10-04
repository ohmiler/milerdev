# ADR 0011: AI-era direction, audience, and consent-free measurement

- Status: Proposed (decision 5 accepted 2026-10-04; decisions marked "owner to confirm" are recommendations, not yet accepted)
- Date: 2026-10-01
- Decision owners: MilerDev product and engineering
- Scope: Product direction for the next 90 days, the audience statement in ADR 0001, and the measurement threshold in ADR 0001
- Amends: ADR 0001 (audience and measurement threshold) only where stated below. ADR 0002, 0003, 0005, and 0006 are unchanged.

## Context

The owner asked how to renew the whole site, including UI/UX, and how to make it fit the AI era beyond selling courses. A repository audit and an external research pass (2026-10-01) found:

- The non-admin UI migration is complete (ADR 0001 to 0006) and Home information architecture, copy, and spacing are frozen (ADR 0002, 0003). A design system v2 was rolled back on 2026-08-19. A further redesign would repeat finished work.
- The repository has no AI SDK, no practice loop (exercises, quizzes, notes, Q&A), no transcripts, and no AI processor named on the privacy page.
- Analytics collection is gated by visitor consent, the measurement baseline is not yet qualified (issue #85), and traffic may be too low to resolve a 10% relative change.
- Public evidence on AI tutors bolted onto learning products is weak, and no Thai paid-demand data for AI-era developer courses was found. Demand must be tested directly.
- The local branch `feat/privacy-consent` still holds unmerged commits, including `drizzle/0023_light_scarecrow.sql` (`ALTER TABLE enrollments ADD revoked_at`), with no open pull request, while `origin/master` ends at migration 0022. Any new migration generated now would also be numbered 0023 and collide.

## Decision

1. **No whole-site UI/UX redo and no learner-facing AI feature in the next 90 days.** Fix verified trust defects and legibility gaps instead. Home stays frozen; changes to it need a superseding ADR and rewritten design contract tests in the same pull request.
2. **"AI era" means an AI-era offer first.** Test Thai demand for one cohort or course teaching learners to direct, review, test, secure, and ship AI-assisted work, using consent-free signals (interviews, a waitlist, firm seat confirmations) with numeric pass and fail thresholds written down before the waitlist opens. Honor a failed gate; do not extend the window.
3. **Any AI provider integration is deferred** until a processor agreement with no-training and deletion terms, a privacy-page update naming the processor, a lawful-basis view from Thai counsel, a database-backed spend budget, a kill switch, and enforced admin MFA exist. The first pilot, if any, is admin-only and draft-only. AI stays away from payments, reconciliation, enrollment, roles, and certificates.
4. **Audience (owner to confirm).** Recommendation: keep ADR 0001's audience, Thai beginners progressing toward real developer work, and aim the first AI-era offer at fundamentals graduates and juniors. Selling to working developers requires amending ADR 0001 and is not assumed. Validate with interviews before recording either outcome as final.
5. **Measurement (accepted 2026-10-04).** The owner confirmed this and went further: the in-house measurement pipeline (analytics events, web vitals, the measurement outbox, product-exposure attribution, and then the analytics consent prompt) is removed, and Search Console plus the admin payment and enrollment pages are the reporting sources. Original recommendation: supersede ADR 0001's threshold of a 10% relative improvement in `purchase_completed / product_view` after at least 100 views. Until consented traffic can support it, report descriptively from consent-free sources: revenue, enrollments, completion, payment-method split from the admin reports, and Search Console. Any ratio must name its numerator and denominator (see CONTEXT.md, อัตราการซื้อสำเร็จ). Issue #85 is rescoped or closed explicitly, not ignored.
6. **Migration order.** Land the enrollment revocation work (migration 0023) as its own small enrollment pull request first, then generate any later schema change as 0024. Do not rebase or rewrite `feat/privacy-consent` without explicit authorization. No schema pull request is opened until this is settled.

## Consequences

- No AI feature will be visible to learners within 90 days. This is deliberate until demand and safeguards are evidenced.
- If the demand gate fails, effort falls back to course facts, journeys, and foundations work, which benefits every existing course.
- Success numbers in this period are counts and thresholds the owner fixes in advance; they are not conversion-uplift claims.
- Each pull request keeps to AGENTS.md: high-risk areas in small separate pull requests, providers mocked in tests, no CI job removed or skipped.

## Open questions for the owner

- Who is the first AI-era audience (decision 4)?
- What are the demand-gate numbers? Proposal, to be adjusted: 40 profile-matched sign-ups and 10 firm seat confirmations for 15 seats, judged at day 35.
- Which public instructor and author may be named and marked up?
- Cohort terms: lifetime access and no refund (`src/app/terms/page.tsx`) versus time-limited cohort terms, to be confirmed with Thai counsel.
- Stance for training-only AI crawlers in `src/app/robots.ts`.
