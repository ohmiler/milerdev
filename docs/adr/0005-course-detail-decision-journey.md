# ADR 0005: Reframe Course Detail as a decision journey

- Status: Accepted
- Date: 2026-08-20
- Decision owners: MilerDev product and engineering
- Scope: `/courses/[slug]` and its reusable acquisition patterns
- Related: ADR 0001, ADR 0003, ADR 0004

## Context

Course Detail is both a public learning-product page and the entry point to a high-risk conversion flow. It must help a visitor understand the course before asking for enrollment or payment, while giving an enrolled learner a direct route back to learning.

The current page contains most available evidence, but its hierarchy makes the decision harder than necessary:

- the hero contains breadcrumb, tags, title, excerpt, four fact cards, a curriculum prompt, section navigation, and a purchase card at the same time;
- curriculum appears before the full course explanation, so a visitor sees lesson titles before the course promise and fit are established;
- lesson count, preview count, duration, and instructor are repeated in a second sticky `Course map` rail;
- media and the preview action appear below price and purchase controls even though a preview is decision evidence;
- the purchase rail and the later `Course map` rail compete for attention;
- the same acquisition hierarchy is shown to an enrolled learner even though that learner's primary job is to continue learning;
- the course schema has no structured summary, learning outcomes, target audience, or prerequisites, so the UI cannot safely invent those claims.

## User questions the page must answer

In order, the acquisition experience should answer:

1. What is this course and what problem does it help me solve?
2. Is it likely to fit me, and what should I know before starting?
3. What exactly is included, how long is it, and can I sample it?
4. Who teaches it and what credible learner evidence exists?
5. What does it cost, what access is included, and what is the correct next action?

An enrolled learner has a different first question: where should I continue?

## Decision

Course Detail will use a single decision journey with state-aware actions. It will not be a curriculum-first page with two competing sticky rails.

### Recommended page composition

1. **Product summary hero**
   - Compact breadcrumb and tags.
   - Course title and one short, factual summary.
   - A single evidence row for lesson count, total known video duration, free-preview count, instructor, and review summary when available.
   - Do not render fact cards for absent values or call zero-duration content `0 minutes`.

2. **Media and action card**
   - Place the thumbnail or course preview first, followed by price, active-promotion truth, primary action, and short access/payment notes.
   - Desktop may keep this card sticky within the hero/content start. Mobile renders it in document flow; a later sticky mobile action is optional and must not obscure content.
   - If a course preview video or free-preview lesson exists, expose one secondary preview action near the primary action. Do not render an inert preview affordance when neither exists.

3. **Compact section navigation**
   - Use one anchor row after the hero for overview, curriculum, instructor, and reviews that actually exist.
   - Do not also render a separate `Course map` rail.

4. **Course value and fit**
   - Explain the course promise before showing the syllabus.
   - When structured authoring exists, present learning outcomes, target audience, and prerequisites as short scannable groups.
   - Until those fields exist, render the sanitized authored description as `รายละเอียดคอร์ส`; do not automatically infer claims from rich text.

5. **Curriculum**
   - Show lesson count, known total duration, and free-preview count once in the section header.
   - Keep lesson access state explicit: free preview, available to an enrolled learner, or locked.
   - Preserve the current progressive disclosure for long curricula.

6. **Instructor and learner evidence**
   - Show the instructor only when a real instructor is attached.
   - Show rating/review evidence only from current review data. Empty, loading, error, and resolved review states remain distinct.

7. **Final decision prompt**
   - Repeat one compact primary action after the last meaningful evidence section for visitors.
   - Do not repeat the full price card or all course facts.
   - Enrolled learners receive a continue-learning action instead of a purchase prompt.

### State-aware action contract

| State | Primary action | Supporting behavior |
| --- | --- | --- |
| Enrollment check unresolved | Disabled pending action | Compact spinner/label; not a page skeleton |
| Visitor or signed-in user, paid course | Buy/enroll at the server-quoted price | Authentication, coupon, Stripe, and PromptPay behavior remain unchanged |
| Visitor or signed-in user, free course | Enroll for free | Enrollment still requires the existing explicit server action |
| Enrolled learner | Continue learning | Price urgency and purchase repetition are removed |
| Free-preview lesson available | Open a real free-preview lesson | Non-preview access control remains authoritative |
| Course preview video available | Watch course preview | Presentation only; it grants no lesson access |
| Promotion active | Show effective and original price with real end date when present | No invented countdown or client-authoritative price |
| No lessons | Show a preparation/unavailable state | Enrollment and new checkout attempts are blocked until at least one lesson exists |

## Data boundary

The first layout slice should use existing authoritative fields and require no schema migration. The page can already render title, description, tags, lesson count, duration, free previews, instructor, reviews, thumbnail, preview video, price, and active promotion.

A later content-model slice may add optional structured fields for:

- a short course summary distinct from long rich description;
- learning outcomes;
- target audience;
- prerequisites.

Those fields require coordinated schema, migration, admin-authoring, validation, fallback, and public rendering work. They must not be simulated by parsing or generating claims from the current description.

## Visual and component direction

- Use shadcn primitives and Tailwind composition under ADR 0004.
- Remove the legacy styling in `CoursePreviewVideo.module.css`: its overlay trigger and close action belong to Button/Dialog composition. Keep narrowly scoped player CSS only if the embedded media implementation requires it.
- Use one dominant Card for media and conversion, lighter bordered groups for supporting facts, and a readable single-column content measure for long text.
- Keep academy-light tokens: white/soft neutral surfaces, navy text, MilerDev blue actions, rounded surfaces, restrained shadow, and clear focus states.
- Loading skeletons are appropriate only for unresolved review/data regions with predictable geometry. Enrollment/payment mutations use disabled pending buttons, not skeletons.

## Consequences

### Positive

- Visitors get the promise, evidence, sample, price, and next action in a coherent order.
- Repeated facts and competing sticky rails are removed.
- Enrolled learners no longer receive an acquisition-first experience.
- The layout can improve now without changing payment, enrollment, or database behavior.
- Structured content can be added later without coupling layout work to a migration.

### Trade-offs

- Existing descriptions may still vary in quality until structured authoring is added.
- State-aware purchase versus continue-learning presentation requires careful client/server loading behavior to avoid CTA flicker.
- A mobile sticky action adds conversion visibility but also accessibility and viewport risks; it should ship only with browser and keyboard verification.

## Resolved product decisions

1. A published course with zero lessons remains visible but cannot start free enrollment, coupon enrollment, Stripe checkout, or PromptPay intent creation.
2. A Bundle remains visible but cannot start enrollment or checkout while any included course has zero lessons.
3. A previously completed payment remains eligible for fulfillment even if course readiness changes after payment acceptance; customers who have paid are not stranded.
4. The first release keeps the action card in normal mobile document flow and does not add a sticky mobile CTA.
5. Structured outcomes, audience, prerequisites, their admin authoring, and any reviewed migration are deferred to a separate Phase 2.

## Implementation outcome

- Course Detail now presents summary evidence, media and action, overview, curriculum, instructor, reviews, and one final action in decision order.
- The duplicate exploration prompt and `Course map` rail were removed. Enrollment state now drives purchase versus continue-learning presentation across the action card, curriculum, reviews, and final action.
- The preview overlay and close action use shared shadcn/Tailwind composition. The superseded `CoursePreviewVideo.module.css` was deleted.
- Zero-lesson readiness is enforced in direct course and Bundle initiation boundaries with stable `COURSE_NOT_READY` and `BUNDLE_NOT_READY` responses, without weakening completed-payment fulfillment.
- The route skeleton now matches the resolved layout. Review loading remains local, and enrollment/payment mutations continue to use disabled pending actions rather than page skeletons.
- Verification passed with 74 Vitest files and 496 tests, ESLint, a 92-route production build, targeted Playwright Course Detail checks, and browser inspection at 390, 768, and 1440 px with no horizontal overflow or console errors. The preview-dialog E2E was skipped because local published fixtures had no preview video; its component remains covered by the existing accessible Dialog composition and browser test when such a fixture exists.

## Verification expectations

- Validate visitor, signed-in non-enrolled, free course, paid course, active promotion, enrolled learner, preview/no-preview, no-lessons, no-instructor, and reviews loading/empty/error/resolved states.
- Verify keyboard navigation, focus return from preview and payment dialogs, anchor offsets, reduced motion, and no mobile content obstruction.
- Preserve analytics event meaning: `course_viewed`, `checkout_opened`, and verified `purchase_completed` remain distinct.
- Run affected tests, ESLint, production build when practical, `git diff --check`, and representative desktop/mobile browser checks.
