# Rollout measurement research for issue #24

Status: research note for owner review
Date: 2026-08-31
Scope: the smallest trustworthy measurement contract for conversion, learner continuity, and performance during the UI rollout. This note does not inspect runtime settings, `.env*`, or production data and does not select a new analytics vendor.

## Recommendation in one paragraph

Keep MilerDev's existing first-party `analytics_events` store. Make `analytics_enabled` an audited global kill switch, but do not confuse that switch with a user-consent or lawful-basis decision. Count a product view only once per short-lived page exposure ID, and count a purchase only from the first authoritative server transition of a local payment to `completed`, keyed uniquely by `paymentId`. Correlate a purchase only to a counted eligible exposure; otherwise label the ratio as an un-attributed traffic ratio rather than conversion. Record learner milestones from server-owned enrollment/progress transitions and keep high-volume watch telemetry out of the minimum scope. Establish a clean 14-day baseline only after instrumentation reconciliation passes; 100 views is a reporting floor, not evidence that a 10% relative lift is statistically resolved. Use field p75 LCP, INP, and CLS as performance guardrails, with lab checks before field data is available.

## What exists in the repository

| Area | Evidence | Consequence |
| --- | --- | --- |
| Event vocabulary | `analytics-contract.ts` (removed) allows client `course_viewed`, `bundle_viewed`, and `checkout_opened`; it declares server `payment_initiated`, `purchase_completed`, and `free_enrollment_completed`. | The vocabulary is partly implemented, not an operational funnel. |
| Server emission | `analytics.ts` (removed) exposes `recordServerAnalyticsEvent`, but repository search found no call site. | `purchase_completed` is currently not measurable from this table. |
| Global switch | `analytics.ts` (removed) reads `analytics_enabled`, caches it for 60 seconds, and skips inserts while false. The public endpoint also checks the switch before product lookup, authentication, or recording (`route` (removed)). | Disabled really means no analytics event work, but a setting change can take up to 60 seconds to become effective in each process. The admin PUT route does not currently call `resetAnalyticsSettingCache` ([settings route](../../src/app/api/admin/settings/route.ts#L77)). |
| Client view dedupe | `analytics-client.ts` (removed) uses `sessionStorage` for optional event/product/placement dedupe. `AnalyticsViewEvent` (removed) enables it for detail views. | It suppresses normal React remounts in one tab/session, but cannot make retries, multiple tabs, cleared storage, or later sessions idempotent at the server. |
| Database dedupe | [`schema.ts`](../../src/lib/db/schema.ts#L594) has a unique index on `(event_name, payment_id)`. | It is appropriate for a non-null purchase `paymentId`; it does not dedupe client events whose `paymentId` is null. |
| Purchase authority | Stripe fulfillment verifies provider state and local identity/amount/currency, then changes the payment and grants access together ([`payment-fulfillment.ts`](../../src/lib/commerce/payment-fulfillment.ts#L131)). PromptPay locks and changes `verifying` to `completed` together with enrollment writes ([`promptpay-fulfillment.ts`](../../src/lib/commerce/promptpay-fulfillment.ts#L82)). Audited manual fulfillment is the third explicit completion seam ([`payment-fulfillment.ts`](../../src/lib/commerce/payment-fulfillment.ts#L302)). | These three seams, not the browser success page, own the paid-purchase fact. |
| Learner authority | `/api/progress` owns lesson-progress writes and derives enrollment percentage and `completedAt` ([progress route](../../src/app/api/progress/route.ts#L55)). | Server transitions can produce trustworthy lesson/course milestones. UI clicks, player callbacks, and route views alone cannot. |
| Data shape and retention | Analytics rows may contain user, course, bundle, and payment identifiers plus free-form metadata ([schema](../../src/lib/db/schema.ts#L594)); inserts intentionally leave IP and user agent null (`analytics insert` (removed)). No analytics retention or cleanup path was found. | Current collection is already restrained, but purpose, metadata allow-list, retention, aggregation, and deletion still need an explicit contract. |
| Vendor inventory | Static search of `src`, tests, `package.json`, and lockfile found no GA4 tag, `gtag`, `GoogleAnalytics`, or GA analytics package. | GA4 is not installed. Google documentation below is event-design evidence only, not a recommendation to add a vendor dependency. |

## Canonical event authority

An analytics row is a projection of a domain fact. It must never become the fact that grants enrollment, declares payment success, completes a course, or issues a certificate.

| Canonical metric/event | Authority and emission point | Idempotency key | Minimum fields | Explicit exclusions |
| --- | --- | --- | --- | --- |
| `product_view` (derived from current `course_viewed` + `bundle_viewed`, or a future canonical name) | Client reports a successfully rendered published, purchasable product detail; server validates the product is still eligible. | `exposureId`, random per actual detail-page exposure and short-lived. Server unique on `(event_name, exposureId)`. | event, occurred-at, exposure ID, product type, product ID, placement, release/variant ID. | Prefetch, bot/health probe, unpublished/archived/not-yet-purchasable product, admin/fixture traffic, React rerender. |
| `checkout_opened` | User activation that successfully starts the checkout intent flow, not merely a button render. | Checkout/payment-attempt ID where available; otherwise one event per exposure and action attempt. | exposure ID, product identity, payment-attempt ID, release/variant ID. | Validation failure before intent creation; automatic navigation. |
| `payment_initiated` | Server creates the local payment attempt. | `paymentId`. | payment ID, product identity, attributed exposure ID, method, release/variant ID. | Free enrollment; a client-only click. |
| `purchase_completed` | First committed transition to local `payments.status = completed` inside `fulfillStripeCheckoutSession`, `fulfillPromptPayIntent`, or `fulfillManualPayment`. Emit transactionally (same transaction/outbox) or make a reconciliation job project missing events. | `paymentId`; database uniqueness must make all retries succeed without a second fact. | payment ID, product identity, attributed exposure ID when valid, method, completed-at, release/variant ID. Amount/currency only if a declared revenue metric needs them. | Payment-success page render, provider redirect, pending/verifying state, free/100%-coupon enrollment, replay/already-fulfilled path as a new event. |
| `free_enrollment_completed` | First committed creation of an enrollment through the free or 100%-coupon path. | `enrollmentId`. | enrollment ID, course ID, acquisition type, release/variant ID. | Paid fulfillment and repeated enrollment request. |
| `learning_workspace_viewed` | Client reports a successfully rendered authorized learning workspace, once per course exposure. | Short-lived workspace exposure ID. | exposure ID, enrollment ID, course ID, release/variant ID. | Login redirect, forbidden/locked response, prefetch. |
| `lesson_completed` | First server transition of lesson progress from not-completed to completed. | `(userId or enrollmentId, lessonId)`; preferably an enrollment-scoped derived event key. | enrollment ID, course ID, lesson ID, transition time, release/variant ID. | Repeated save, watch-time update, client checkbox click that failed to persist. |
| `course_completed` | First server transition of an enrollment from `completedAt = null` to a timestamp. | `enrollmentId`. | enrollment ID, course ID, transition time, release/variant ID. | Percentage display reaching 100 before commit; certificate issuance. |

Stripe says a succeeded PaymentIntent is the state at which fulfillment can proceed, and recommends server monitoring of payment webhooks ([PaymentIntent lifecycle](https://docs.stripe.com/payments/paymentintents/lifecycle), [Payment Intents guide](https://docs.stripe.com/payments/payment-intents)). Stripe also warns that webhook deliveries can be duplicated and are not guaranteed to arrive in order, recommending processed-event identity checks ([Stripe webhooks](https://docs.stripe.com/webhooks#handle-duplicate-events)). This supports MilerDev's local completed-payment transition as the cross-provider authority and `paymentId` as the analytics idempotency key.

Google Analytics is not present here, but its recommended ecommerce contract independently uses a unique `transaction_id` for `purchase`, and Google documents that repeated purchases with the same ID are ignored ([GA4 recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events), [ecommerce validation](https://developers.google.com/analytics/devguides/collection/ga4/validate-ecommerce)). If GA4 is ever added, map the already-governed first-party facts to `view_item` and `purchase`; do not make GA4 the authority or add a second independent emitter.

## Trustworthy conversion numerator and denominator

The owner criterion is a relative 10% improvement in:

`conversion = distinct attributed purchase paymentIds / distinct eligible product exposureIds`

Both sets must use the same measurement window, release/variant eligibility, product type, traffic exclusions, and analytics/consent eligibility.

### Denominator

Count one `exposureId` only when the course or bundle detail content has rendered and the product is published and purchasable at that time. The ID exists to dedupe delivery, not to recognize a person across visits. Give it a short TTL and do not derive it from email, user ID, IP address, fingerprint, or payment data. Current per-session `sessionStorage` suppression can remain a UI optimization, but server uniqueness on the exposure ID is the measurement guarantee.

If the product has multiple variants or staged releases, store the assigned `releaseId`/`variantId` at exposure time. Never infer a historical assignment from the current configuration.

### Numerator

Count one distinct paid `paymentId` only after the local authoritative transition to `completed`. Persist the originating `exposureId` or a similarly short-lived attribution token at payment initiation so the completion can be joined to an eligible denominator. Do not accept this identity from the completion client, and do not count un-attributed old payments in the conversion numerator.

Free enrollments, 100%-coupon enrollments, retries, refunds, and chargebacks are separate facts. A later refund should not erase history; report refund/chargeback rate as a guardrail and state whether the product KPI is gross completed purchases or net retained purchases.

### What can be reported before correlation exists

Until a durable exposure-to-payment link exists, MilerDev can report two operational counts—eligible product views and completed paid payments—but must label their ratio `unattributed purchases / views`. It is useful for instrumentation health and rough trend monitoring, not a causal or journey conversion claim.

## Learner journey contract

The smallest learner funnel that answers whether the workspace improves continuity is:

1. `eligible_enrollment`: enrollment exists and the course has at least one accessible lesson (domain query, not an analytics event).
2. `workspace_started`: first valid `learning_workspace_viewed` for that enrollment.
3. `first_lesson_completed`: first authoritative `lesson_completed` after start.
4. `course_completed`: first authoritative enrollment `completedAt` transition.

Report distinct enrollment cohorts, not raw event counts:

- start rate = enrollments with a workspace start / eligible enrollments;
- first-lesson completion rate = started enrollments with at least one completed lesson / started enrollments;
- course completion rate = completed enrollments / started enrollments;
- time to first lesson and time to course completion as cohort distributions, with an explicit observation horizon.

One-way completion semantics from issue #23 are a prerequisite. If a `completed: false` update can reverse a stored completion or clear `completedAt`, the analytics event and current domain state disagree. The minimal contract records only first positive transitions; it does not add raw player seek/play/pause streams or periodic watch-time events. Those are high-volume, less authoritative, and unnecessary for the stated rollout decision.

## `analytics_enabled`, consent, and minimization

Use two independent gates:

1. **Operational gate:** `analytics_enabled` is the admin-controlled, audited, fail-closed global kill switch. Every client endpoint, server projection, Web Vitals endpoint, backfill, and export checks its effective value. Reset or version the process cache on update, then perform a read-back/health check before declaring the measurement window open.
2. **Privacy gate:** product policy and legal review decide the lawful basis and whether a user-level consent signal is required for each event class. If consent is required, do not send or persist client analytics before it is granted, and stop future collection after withdrawal. The global switch is not proof of a person's consent. Necessary payment/enrollment records continue under their own product/legal purpose; the optional analytics projection remains separately gated.

Thailand's Personal Data Protection Act section 21 limits use to the notified collection purpose unless an allowed exception applies, section 22 limits collection to what is necessary for a lawful purpose, and section 23 requires collection-time notice including purpose and relevant handling details ([official government copy of the PDPA Act](https://www.dol.go.th/PDPA/Documents/PDPA/PDPA-Act2019.pdf)). This note is an engineering interpretation, not legal advice; the owner should approve the lawful-basis/consent policy before collection is enabled.

Apply these minimization rules regardless of the selected basis:

- strict event schemas; no caller-supplied arbitrary metadata;
- no email, name, IP address, user agent, URL query string, payment payload, slip content/reference, or video URL;
- use `enrollmentId`/`paymentId` only when a join is necessary; otherwise omit user identity;
- random short-lived exposure IDs, not cross-site or fingerprint identifiers;
- separate raw-event retention from aggregate retention; aggregate cohort counts, then delete or de-identify raw exposure/journey rows on a documented schedule;
- document owner, purpose, fields, retention, access, and deletion for every event version.

The existing choice to store `ipAddress` and `userAgent` as null should remain.

## Web Vitals contract

Next.js supports a small client component using `useReportWebVitals` and documents that each metric includes an `id` unique to the current page load ([Next.js analytics guide](https://nextjs.org/docs/app/guides/analytics)). Use that stable API rather than hand-implementing PerformanceObserver calculations.

For each sampled page load, accept only `LCP`, `INP`, and `CLS`; validate finite bounded values and a normalized route family, and dedupe on `(metric.id, metric.name)`. Web Vitals callbacks can update a metric as the page lifecycle advances, so upsert the latest value rather than summing callback rows. Store device class (`mobile`/`desktop` from a coarse viewport policy), route family, release/variant ID, and metric rating; do not store the full URL or user identity.

Chrome's current good thresholds are p75 LCP at or below 2.5 seconds, INP at or below 200 ms, and CLS at or below 0.1, evaluated separately for mobile and desktop ([Web Vitals](https://web.dev/articles/vitals), [threshold methodology](https://web.dev/articles/defining-core-web-vitals-thresholds)). Field data is the release gate once sufficient samples exist. Before that, use deterministic Lighthouse/Playwright-style lab checks only as no-regression evidence; Chrome explicitly says lab measurement is valuable before release but is not a substitute for field data ([Web Vitals field and lab guidance](https://web.dev/articles/vitals#lab_tools_to_measure_core_web_vitals)).

## Baseline and sample rules

1. Freeze event schema version, eligibility rules, exclusions, release assignment, consent behavior, timezone, and query before baseline begins.
2. Run an instrumentation qualification period first. Reconcile every completed paid payment to exactly one `purchase_completed` projection and verify zero duplicate idempotency keys, zero unknown products, and explainable client delivery loss. Baseline does not begin while these checks fail.
3. Start on the first complete Asia/Bangkok calendar day after qualification. Use 14 consecutive full days to cover two weekly cycles. Do not mix pre-enable events, partial first/last days, synthetic fixtures, staff QA, bots, or outage periods.
4. Require at least 100 eligible product views before publishing a directional rate. This is only the issue's reporting floor.
5. After the baseline rate `p0` is known, calculate the sample required to detect a relative 10% change (`p1 = 1.10 × p0`) using predeclared significance and power. NIST's official proportion guidance shows that required sample depends on `p0`, detectable absolute change, significance, and power—not a universal count ([NIST sample size for proportions](https://www.itl.nist.gov/div898/handbook/prc/section2/prc242.htm)).
6. Report numerator, denominator, rate, absolute and relative change, and a binomial confidence interval. For sparse successes or small samples, use an exact interval; NIST cautions that normal approximations may be inaccurate for small counts ([NIST exact binomial intervals](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm)).
7. If 14 days and 100 views are reached but the power/interval rule is not, report `inconclusive`; do not convert directionality into a success claim. Continue to the planned maximum duration or decide based on non-conversion acceptance criteria.
8. Prefer a concurrent holdback when traffic permits. If rollout must use before/after windows, keep acquisition campaigns, product eligibility, pricing, and device mix visible because temporal changes can confound the comparison; do not describe the result as causal.

## Rollout guardrails and stop conditions

### Before any measurement claim

- tests prove disabled mode performs no analytics identity/DB work;
- setting update invalidates or versions all effective caches and has an audited read-back;
- Stripe webhook replay, success-page fallback, PromptPay retry, and manual reconciliation each produce exactly one purchase event per payment;
- a reconciliation query can reconstruct the expected purchase set from authoritative completed payments;
- client retry/multi-render tests produce one row per exposure ID;
- schemas reject personal/arbitrary metadata;
- retention/deletion is implemented and testable;
- deterministic fixtures cover course, bundle, free, paid, pending, completed, failed, replay, refunded, anonymous, learner, and analytics-disabled cases.

### During staged rollout

Monitor by release/variant and product type:

- expected completed payments versus distinct `purchase_completed.paymentId`;
- duplicate-key, missing-attribution, unknown-product, invalid-event, and client delivery rates;
- payment failure, enrollment failure, fulfillment rejection/retry, and refund/chargeback rates;
- learner progress write failure and false→true completion transition counts;
- p75 LCP/INP/CLS by mobile and desktop, plus sample counts;
- application error rate and affected E2E journeys.

Pause rollout and mark the window invalid when the event contract or eligibility query changes mid-window, reconciliation cannot reach one analytic purchase per eligible completed payment, unknown/duplicate purchase keys appear, consent/kill-switch behavior is uncertain, a payment/enrollment correctness guardrail regresses, or Core Web Vitals exceed a predeclared no-regression budget or cross from good to not-good. Repair and begin a new clean window; do not splice incompatible periods.

## Minimal implementation order implied by the evidence

1. Make completion one-way where required and add transition-level tests.
2. Add a general event idempotency key or narrowly scoped unique keys for exposure, payment, enrollment, lesson, and course facts; review the migration before applying it.
3. Emit purchase/free-enrollment/learner facts from the authoritative transactions, preferably via a transactional outbox or a replay-safe projection plus reconciliation.
4. Add short-lived exposure attribution to the payment-attempt path and server-side product eligibility validation.
5. Separate the operational kill switch from the approved privacy gate, invalidate the setting cache on change, and implement retention.
6. Add Web Vitals sampling and upsert semantics.
7. Qualify and reconcile instrumentation; only then open the 14-day baseline and begin a rollout that cites measurement.

Adding GA4, session replay, raw player telemetry, cross-device identity, a warehouse, or a broad experimentation platform is outside the minimum trustworthy scope.
