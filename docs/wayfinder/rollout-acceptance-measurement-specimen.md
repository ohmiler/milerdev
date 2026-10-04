# Rollout, acceptance, and measurement specimen

สถานะ: รอความเห็นจาก owner

Ticket: [[UI Improvement] จัดลำดับ rollout, acceptance criteria และ measurement](https://github.com/ohmiler/milerdev/issues/24)

เอกสารนี้รวม decisions จาก issues #14–#23 เป็นแผนส่งต่อให้ทีม implementation โดยยังไม่แก้ source code, schema, CI, production setting หรือ production data เป้าหมายคือ rollout แบบ incremental ตาม shared seams และ authority จริง ไม่ใช่ทำ redesign program หรือแบ่งงานตามจำนวนหน้า

Research companion: [rollout-measurement-research.md](./rollout-measurement-research.md)

## Decision summary

1. **Wave 0 ต้องมาก่อนทุก UI rollout ที่อ้างผลเชิง measurement**: ทำ event authority, idempotency, attribution, privacy/retention decision, deterministic fixtures และ merge-blocking E2E ให้พร้อมก่อนเริ่ม baseline
2. **จัดงานตาม deep module และ shared seam ไม่ใช่ตาม route**: สร้าง Interface ขนาดเล็กสำหรับ pricing/readiness, payment presentation, auth return, account guard, learning projection, feedback และ analytics แล้ว migrate representative consumers ก่อนขยาย
3. **หนึ่ง implementation PR มี authority หลักเดียว**: ห้ามรวม payment fulfillment, auth policy, learning completion และ broad visual migration ใน PR เดียวกัน แม้อยู่ wave เดียวกัน
4. **วัด conversion จาก facts ที่ correlate กันได้เท่านั้น**: `product_view` เป็น metric ที่ derive จาก distinct eligible `course_viewed`/`bundle_viewed` exposure IDs; `purchase_completed` มาจาก first committed paid-payment transition และนับเฉพาะ payment ที่ผูก exposure ได้
5. **วัด learner continuity จาก server transitions**: workspace start เป็น qualified client exposure แต่ lesson/course completion มาจาก server-owned progress/enrollment transitions ไม่ใช้ click, player callback หรือ raw watch telemetry เป็น success fact
6. **14 วัน + 100 product views เป็น reporting floor**: หลังทราบ baseline ต้องคำนวณ sample size สำหรับ uplift สัมพัทธ์ 10%; ถ้าข้อมูลไม่พอให้รายงาน `inconclusive` ไม่ใช่ success/failure
7. **rollback presentation แยกจาก domain truth**: ปิด analytics ด้วย kill switch หรือ revert UI slice ได้ แต่ห้ามย้อน completed payment, enrollment, progress หรือ certificate เพื่อให้ตัวเลข/หน้าจอกลับเหมือนเดิม

## Current readiness evidence

| Area | Current evidence | Readiness consequence |
| --- | --- | --- |
| Client events | `course_viewed`, `bundle_viewed`, `checkout_opened` อยู่ใน strict Zod contract; detail views emit ผ่าน `AnalyticsViewEvent` | มี vocabulary และ target validation แต่ dedupe ใน `sessionStorage` เป็น best-effort เท่านั้น |
| Server events | contract มี `payment_initiated`, `purchase_completed`, `free_enrollment_completed` แต่ไม่พบ caller ของ `recordServerAnalyticsEvent` | ยังเริ่ม conversion baseline ไม่ได้ |
| Purchase idempotency | `analytics_events` มี unique `(event_name, payment_id)` | รองรับ purchase dedupe เมื่อส่ง `paymentId` ที่ non-null แต่ไม่ครอบคลุม client exposure |
| Purchase authority | Stripe, PromptPay และ audited manual fulfillment มีจุด transition/payment validation ของตน | ต้อง emit/projection จากสาม seams นี้ ไม่ใช่ payment-success page |
| Learner authority | `/api/progress` เขียน lesson progress และ derive enrollment progress/`completedAt` | ใช้ positive server transitions เป็น milestone; one-way completion เป็น prerequisite |
| Operational switch | `analytics_enabled` default `false`, cache 60 วินาที; admin analytics page redirect กลับ `/admin` | runtime/production ไม่ได้ตรวจ; ต้องมี cache invalidation/read-back และ reporting path ก่อนเปิด window |
| Privacy | insert ปัจจุบันตั้ง IP/user agent เป็น `null`, client schema ไม่รับ arbitrary metadata | รักษา minimization นี้ แต่ยังต้องกำหนด purpose, lawful basis/consent, retention, access และ deletion |
| CI | workflow รัน lint, typecheck, Vitest และ build แต่ไม่รัน Playwright | affected E2E ยังไม่ merge-blocking ตาม quality bar |
| E2E data | specs หลายจุด `test.skip` เมื่อไม่มี course/bundle/local data และมีอย่างน้อยหนึ่ง `test.fixme` | ต้องมี deterministic isolated fixture matrix; missing fixture ต้อง fail |
| Focused baseline | analytics contract/API และ PromptPay fulfillment tests ผ่าน 10/10 เมื่อ 2026-08-31 | behavior ที่มีอยู่ผ่าน แต่ยังไม่พิสูจน์ event production, correlation หรือ end-to-end rollout readiness |

ไม่ได้ตรวจ `.env*`, runtime setting, vendor dashboard, production traffic, production database หรือ production Core Web Vitals ดังนั้นห้ามตีความเอกสารนี้ว่า production analytics พร้อมแล้ว

## Deep modules and seams

ใช้คำว่า Module/Interface/Implementation ตาม codebase-design: Interface คือ test surface; Implementation และ vendor/detail อยู่หลัง seam; dependency ที่เปลี่ยนแทนได้ต้องถูกแทนที่ที่ boundary เดียว ไม่เพิ่ม mock หลายชั้นตาม route

| Module | Small Interface | Hidden Implementation / dependency class | Representative consumers |
| --- | --- | --- | --- |
| `MeasurementRecorder` | record eligible exposure; enqueue committed domain milestone; reconcile; query health | first-party DB + transactional outbox/replay-safe projection; in-process/owned remote behavior | course/bundle detail, payment attempts, three fulfillment seams, free enrollment, progress |
| `ProductDecisionFacts` | derive readiness, effective price, price vocabulary, action descriptor | course/bundle/promotion queries; in-process local DB | Home card, catalog, course detail, bundle detail, order review |
| `PaymentPresentation` | derive exact-attempt status, access state, recovery actions | payment/enrollment facts; Stripe/SlipOK remain true external adapters behind existing fulfillment seams | product action, method dialog, payment return, payment history |
| `SafeReturnIntent` + auth presentation | parse safe internal return; derive stable field/form result | auth/session/rate limit; in-process with Google as true external adapter | Login, Register, Forgot, Reset, protected-route redirect |
| `MemberAccess` + `LearningPresentation` | authorize private render; derive next action/progress/completion/certificate status | enrollment/progress/certificate queries; in-process local DB | Dashboard, certificates, profile/settings shell, learning entry |
| `LearningWorkspaceProjection` + player adapter | minimal authorized DTO; trusted provider event bridge; persist progress transition | local DB + Bunny Player.js as remote owned adapter; legacy providers explicitly limited | learning route, curriculum, previous/next, progress API |
| `NavigationModel` + feedback primitives | canonical links/active state/breadcrumb/status actions | React/shadcn in-process; no domain authority | public shell, account shell, collection/support/detail routes |
| `JourneyFixtures` | create deterministic named scenario; authenticate actor; reset isolated test state | local-substitutable MySQL and mocked Stripe/SlipOK/Bunny/Google/SMTP/Resend | Vitest integration and Playwright journeys |

Deepening rule: ถ้าต้องเพิ่ม special case ที่ route consumer เพื่อชดเชย seam ให้กลับไปเพิ่ม vocabulary/descriptor ที่ Module owner แทน ห้ามให้ route ตีความ raw payment/progress/certificate state ซ้ำเอง

## PR and migration policy

- หนึ่ง PR มีหนึ่ง primary seam และมี representative consumers เท่าที่พิสูจน์ Interface; ไม่ migrate ทุก route พร้อมกัน
- PR ที่แตะ shared seam ต้องมี contract tests ของ Module และ behavior tests ของอย่างน้อยหนึ่ง consumer ต่อ context ที่ต่างกัน เช่น public + account หรือ course + bundle
- external providers ถูก mock ที่ adapter boundary; ห้ามเรียก Stripe, SlipOK, Bunny, Google, SMTP หรือ Resend จริงใน CI
- schema change ต้อง additive และ backward-compatible: migration มาก่อน writer/read path, review migration ก่อน apply และ cleanup อยู่คนละ PR หลัง stabilization
- `master` เชื่อม Railway production: merge เฉพาะเมื่อทุก required check ผ่าน; production migration และ rollback note ต้องชัดเจนใน PR
- cosmetic micro-polish ที่ไม่เปลี่ยน task completion, accessibility, trust หรือ measurement ไม่บล็อก wave และไม่ขยาย PR
- ไม่มีการ commit, push, merge, deploy หรือ apply migration จาก planning effort นี้

## Wave 0 — Measurement and deterministic test platform

### Scope

1. เพิ่ม event version + general idempotency key หรือ unique keys ที่เจาะจงสำหรับ exposure/payment/enrollment/lesson/course โดยใช้ additive migration
2. ทำ `MeasurementRecorder` ให้ server event เกิดจาก first committed transition เท่านั้น:
   - Stripe `pending → completed`
   - PromptPay `verifying → completed`
   - audited manual payment `pending|verifying|failed → completed`
   - free/100%-coupon enrollment first creation
   - lesson first `false → true`
   - enrollment first `completedAt null → timestamp`
3. ใช้ transactional outbox หรือ replay-safe projection + reconciliation เพื่อให้ dispatcher failure ไม่ย้อน business truth หลัง commit และ retry ไม่สร้าง fact ซ้ำ
4. ให้ detail page สร้าง random short-lived `exposureId` เมื่อ published/purchasable content render จริง; server validate target และ dedupe ID; ไม่ derive ID จาก user/email/IP/fingerprint
5. พก attributed exposure จาก payment initiation ไป payment completion ฝั่ง server; completion client ห้ามเป็นผู้ยืนยัน attribution
6. ทำ `analytics_enabled` เป็น audited operational kill switch ครอบคลุม client/server/Web Vitals/export, invalidate/version cache เมื่อ update และมี read-back health check
7. owner ระบุ purpose, lawful basis/consent policy, notice, metadata allow-list, retention, access และ deletion ก่อน enable; คง IP/user agent เป็น `null`
8. เพิ่ม Web Vitals collection ผ่าน Next.js `useReportWebVitals`: รับเฉพาะ LCP/INP/CLS, upsert ด้วย `(page-load metric id, metric name)`, route family + coarse device + release; ไม่เก็บ full URL/user identity
9. สร้าง isolated deterministic `JourneyFixtures` ครบ member, learner, free/paid course, published bundle, pending/completed/failed/refunded payment, valid/revoked/missing certificate, empty data, long Thai และ analytics disabled
10. เพิ่ม Playwright job ใน CI; fixture absence/setup failure ต้อง fail ห้าม skip; provider calls ใช้ mocks/fakes เท่านั้น
11. ทำ controlled measurement report/query และ reconciliation output โดยไม่สร้าง admin redesign

### Exit gates

- replay/retry ของ exposure เดียวได้หนึ่ง row; unknown/unpublished target ถูก reject; disabled modeไม่ทำ identity/DB event work
- completed paid payment ที่ eligible ทุก record reconcile ได้หนึ่ง `purchase_completed(paymentId)`; duplicate/unknown purchase keys เป็นศูนย์
- replayed Stripe webhook, PromptPay retry และ already-fulfilled/manual retry ไม่สร้าง purchase fact ที่สอง
- analytics dispatcher outage หลัง domain commit ไม่เปลี่ยน payment/access response; backlog retry/reconcile ได้
- progress duplicate save/watch update ไม่สร้าง lesson completion ซ้ำ; negative/reversal path ไม่ถูกนับเป็น milestone ใหม่
- strict schemas reject email/name/IP/user-agent/query string/payment payload/slip content/video URL/arbitrary metadata
- retention/deletion และ kill-switch cache invalidation มี automated tests
- deterministic E2E setup ทำซ้ำได้ใน fresh CI; ไม่มี fixture-dependent skip/fixme ใน required journeys
- controlled report แสดง numerator, denominator, missing attribution, duplicates, exclusions, release และ sample counts ได้

### Measurement outcome

Wave นี้ยังไม่อ้าง conversion uplift เมื่อ exit gates ผ่านแล้วให้เปิด instrumentation qualification period; baseline เริ่มได้เฉพาะหลัง reconciliation ผ่านและ privacy gate ได้รับอนุมัติ

## Wave 1 — Authority and read-model seams

Wave นี้สร้าง Interface ที่ลึกก่อน broad visual migration แต่ละข้อเป็น PR แยกตาม authority

1. `SafeReturnIntent`: safe internal callback สำหรับ credentials/Google/cross-links และ protected-route round trip พร้อม malicious-input tests (#21)
2. `ProductDecisionFacts`: effective price/readiness/action truth สำหรับ Course/Bundle พร้อม promotion-boundary tests (#19)
3. `PaymentPresentation`: exact attempt, confirmed payment, access-ready และ recovery descriptors; ไม่แก้ provider/fulfillment policy (#20)
4. `MemberAccess`/`LearningPresentation`: server guard ก่อน private render, next action, progress/completion/certificate vocabulary (#22)
5. certificate owner projection + idempotent repair boundary โดยไม่คืน internal revocation note และไม่ reissue revoked credential (#22)
6. `LearningWorkspaceProjection`: minimal authorized DTO ที่ locked record ไม่มี content/video URL; trusted Bunny Player.js adapter; Zod/monotonic/replay-safe progress contract (#23)
7. shared navigation/feedback vocabulary ที่ต้องใช้ใน consumers ถัดไป แต่ยังไม่ migrate หน้าทั้งหมด (#16–#18)

### Exit gates

- Module tests ครอบคลุม state matrix และ unauthorized/owner mismatch/replay/error boundaries
- raw domain state ไม่ถูกตีความซ้ำใน representative route
- locked/private payload ไม่มี sensitive fields และไม่มี private-shell flash
- payment/access/certificate/progress authority และ existing idempotency ไม่ลดลง
- affected E2E ผ่านบน deterministic fixtures; ไม่มี broad layout change ปะปนใน authority PR

## Wave 2 — Shared shell and feedback contracts

### Scope

- migrate constrained `PublicPageHeader` ใน collection/support pages; คง Home และ detail identity ที่อนุมัติไว้
- canonical guest/loading/member navigation, exact/section active state, mobile auth/notification parity
- canonical member account shell + Dashboard current route โดยคง page content behavior เดิม
- shared Breadcrumb/JSON-LD data, global skip-link/main target, learning exit เดียว
- migrate duplicated empty/loading/error/recovery surfaces ไป `Empty`, `Alert`, `Skeleton`, `DialogShell` ตาม intent
- semantic-token/explicit-transition hygiene และ scoped dark media/player/certificate exceptions

### Exit gates and affected E2E

- guest → loading → member navigation; mobile menu focus return; exact/nested active state
- account shell authorization ก่อน render; Dashboard/Profile/Settings/Payments/Certificates links ไม่ล้น
- breadcrumb/detail semantics, skip-to-main, learning exit และ Footer/support cross-link
- keyboard-only, visible focus, Escape/return focus, reduced motion, touch target
- 320/390/768/1024/1440, long Thai, no horizontal overflow, no hydration/console error
- visual snapshot ใช้เฉพาะ stable regions/tokens; behavior assertions ไม่ผูก internal class names

## Wave 3 — Acquisition, content, discovery, and auth handoff

### Scope

- #18: แก้ content truth/UTF-8/legal updated label, About method + verified evidence, Blog empty/TOC/article bridge, FAQ → Contact support ladder, announcement role copy และ recovery surfaces
- #19: query normalization, effective-price filter/sort, active chips/pagination, Course/Bundle cards, Course Detail nav/reviews, Bundle decision facts/partial ownership
- #21: consume safe return ใน Login/Register/Google/Forgot/Reset; Thai inline validation, stable rate-limit feedback และ neutral anti-enumeration outcomes
- คง Home composition/copy ที่ freeze แล้ว; rerun Home contract เมื่อ CourseCard/shared public seam เปลี่ยน

### Exit gates and affected E2E

- visitor Home → catalog/filter/back-forward → course/bundle detail เห็น readiness/ราคา/CTA ที่ตรงปลายทาง
- guest เลือก product → auth → กลับ exact safe destination; malicious callback fallback อย่างปลอดภัย
- Blog filtered empty, article TOC/bridge, FAQ → Contact, announcement audience states, legal anchors, 404/error recovery
- active/expired/future promotion, promo-to-free, no-review/review/error, bundle saving/equal/more-expensive, partial ownership
- long/empty Thai, image intrinsic dimensions/`sizes`, no duplicate CTA/flicker/overflow
- `product_view`/workspace measurement contract ไม่เปลี่ยนระหว่าง baseline window; release marker ตรงกับ deployed slice

## Wave 4 — Purchase and access clarity

### Scope

- shared Course/Bundle order review + explicit method selection
- coupon breakdown, 100%-coupon enrollment path และ full-price partial-ownership disclosure
- PromptPay expiry/verifying/timeout/stable error/slip privacy states
- Stripe cancel feedback บน product action และ canonicalized return URL
- exact-attempt payment return: completed-ready, completed-access-pending, unconfirmed, failed, refunded แยกกัน
- payment history เป็น recovery home ด้วย server-derived actions; resume intent เฉพาะเมื่อ owner contract ครบ

### Exit gates and affected E2E

- guest return, coupon valid/expired/100%, Stripe cancel/reject/paid/replay, PromptPay valid/expired/rejected/timeout/replay
- pending/completed/failed/refunded, bundle partial ownership, completed-without-access และ recovery
- owner/target/amount/currency checks, webhook/slip replay protection, enrollment gating และ no duplicate payment prompt ผ่านทั้งหมด
- provider mocks ยืนยันว่า presentation ไม่ grant access และ success page ไม่สร้าง `purchase_completed`
- purchase reconciliation ยังเป็น 1:1; payment/enrollment failure/retry/refund guardrails ไม่แย่ลง
- Dialog keyboard/focus/Escape, async pending/retry, long Thai, 320/390/768/1440 และ reduced motion ผ่าน

## Wave 5 — Learner account, certificate, and learning continuity

### Scope

- Dashboard วาง next learning action ก่อน metrics และใช้ server-derived progress/completion/certificate states
- active/revoked/missing certificate collection, completed-without-certificate repair, public verification payload/noindex/recovery, share/download fallback
- Profile semantics/name snapshot และ Password fresh-login flow โดย reuse auth contracts
- learning entry/resume truth, current progress projection, trusted player retry/error, persistent completion pending/success/failure + retry
- curriculum search 20 รายการ/result count/Thai normalization, previous/next, mobile Sheet, skip link, overscroll/reduced motion
- localized learning errors และลด query waterfalls/RSC payload โดยไม่เปลี่ยน completion/access policy

### Exit gates and affected E2E

- member no enrollment; learner 0/partial/100%; dashboard next action → workspace → complete next lesson → next action update
- locked/free-preview/enrolled/review states; content-only/video-only/empty; 0/1/21/50+ lessons; player/progress/network failures
- duplicate player ended/save เป็น exactly-once positive transition; completion failure recover ได้และไม่ auto-next
- completed missing certificate, active/revoked credential, invalid code, issuance repair replay/failure, share/download fallback
- private 401 redirect, profile invalid/dirty/rate-limit, password session invalidation/fresh login
- learner event reconciliation, progress write failure และ certificate issuance failure guardrails ไม่แย่ลง
- keyboard/focus, mobile curriculum, previous/next touch target, reduced motion, long Thai และ no private payload leak ผ่าน

## Observation and consolidation — after each wave

ไม่ถือเป็น redesign wave ใหม่ แต่เป็น release discipline:

1. deploy หนึ่ง PR-sized slice พร้อม release marker และ rollback note
2. รัน smoke/affected journeys หลัง deploy โดยไม่ใช้ production mutation ที่ไม่ได้รับอนุญาต
3. ตรวจ application/domain guardrails ก่อน business KPI
4. ถ้า event contract, eligibility, privacy gate หรือ release assignment เปลี่ยนกลาง window ให้ invalidate window และเริ่มใหม่
5. ขยาย consumers เมื่อ representative slice ผ่านเท่านั้น
6. ลบ duplicate route logic หลัง consumers migrate และ stabilization แล้ว; cleanup อยู่คนละ PR
7. micro-polish ทำเฉพาะเมื่อ evidence ชี้ task/accessibility/performance impact หรือหลังทุก gate ผ่าน

ไม่มีข้อกำหนดให้สร้าง percentage-rollout platform ใหม่ หากไม่มี sticky server-evaluated flag ที่เชื่อถือได้ ให้ใช้ PR-sized deployment + fast code rollback แทน client-only role/percentage gating

## Universal acceptance contract

ทุก implementation PR ต้องผ่านรายการต่อไปนี้ตาม affected scope:

### Correctness and safety

- existing CI: ESLint, TypeScript strict check, Vitest, production build
- affected Module contract/unit tests + component/state/integration tests
- affected deterministic Playwright journeys เป็น required check
- server authorization ก่อน private read/render; client role check เป็น UX เท่านั้น
- Zod validation สำหรับ sensitive bodies; preserve rate limit, idempotency, replay protection และ safe logging
- verified payment/explicit admin intent เท่านั้นที่ grant access; analytics/presentation ไม่เป็น authority
- schema migration additive/reviewed; no destructive schema/data operation โดยไม่มี approval

### Interaction and accessibility

- WCAG 2.2 AA สำหรับส่วนที่กระทบ: semantics/name/role/state, contrast, error association, live feedback
- keyboard path, logical focus order, visible focus, Dialog/Sheet focus trap + return focus
- minimum usable touch target และไม่มี hover-only action
- loading, success, empty, error, pending, retry, offline/provider failure และ recovery action ที่ตรง state
- reduced motion และไม่มี focus/announcement ที่เกิดซ้ำจาก rerender

### Responsive, Thai, and visual regression

- 320/390/768/1440 เป็น required widths; 1024 เพิ่มสำหรับ layout ที่เปลี่ยน breakpoint/tablet
- no horizontal overflow; long Thai title/name/copy, long unbroken content และ empty data ไม่ทำ layout/action หาย
- Thai UTF-8 ไม่มี mojibake; ใช้ canonical domain vocabulary; รัน `check:admin-text` เมื่อ Thai admin text ถูกแตะ
- visual snapshots จำกัดที่ contract สำคัญ; cosmetic pixel drift ที่ไม่กระทบ task ไม่บล็อก

### Performance

- ก่อน field data: no-regression เทียบ representative lab run เดียวกัน, แก้ known CLS risks, จำกัด client JS/hydration และ query/RSC waterfall ที่เพิ่มจาก change
- เมื่อ field instrumentation qualified: p75 LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 แยก mobile/desktop พร้อม sample count
- ถ้า sample ไม่พอให้รายงาน insufficient ไม่ใช้ lab result แทน field claim

### Handoff evidence

- `git diff --check`, affected tests, lint และ build ตาม practicality
- ระบุ changed files, checks/evidence, fixture scenario, untested gaps, migration/rollback และ production risk
- ไม่มี hidden skip/fixme, real provider call, secret, production payload หรือ customer data ใน artifact/log

## Measurement contract

### Conversion KPI

Canonical formula:

`distinct attributed completed paid paymentIds / distinct eligible product exposureIds`

- `product_view` เป็น derived metric จาก current `course_viewed` + `bundle_viewed`; ไม่จำเป็นต้อง rename stored events ใน PR แรก
- denominator นับ detail content ที่ render จริงและ product published/purchasable; ไม่รวม prefetch, admin/fixture/staff QA, bot/health probe, invalid target หรือ React rerender
- `exposureId` มีไว้ dedupe delivery ไม่ใช่ recognize คนข้าม visit; TTL สั้นและไม่มี fingerprint
- numerator นับ first authoritative paid completion ต่อ `paymentId`; ไม่รวม free/100%-coupon, pending/verifying, replay, success-page render หรือ payment ที่ไม่มี eligible attribution
- refund/chargeback ไม่ลบ historical completion; รายงานเป็น guardrail แยก
- แยก course/bundle และ payment method diagnostics แม้ KPI หลักเป็น combined funnel
- ก่อน exposure-to-payment correlation พร้อม อนุญาตรายงานเพียง `unattributed purchases / views` เป็น operational trend ห้ามเรียก conversion

Success criterion ที่ยืนยันไว้:

`(post_rate - baseline_rate) / baseline_rate >= 10%`

ต้องรายงาน numerator, denominator, rate, absolute difference, relative difference, confidence interval, exclusions และ sample counts พร้อมกัน

### Learner continuity KPI

Recommended primary cohort metric:

`started enrollments that complete at least one next incomplete lesson within 7 days / distinct eligible enrollments with a qualified workspace start`

Supporting metrics:

- workspace start rate = started enrollments / eligible enrollments
- first-next-lesson completion rate และ time-to-completion distribution
- course completion rate = first `completedAt` transition / started enrollment cohort
- progress write failure/retry, duplicate transition, certificate issuance/repair failure เป็น guardrails

ใช้ enrollment-level cohort; ไม่เก็บ raw play/pause/seek หรือ periodic watch telemetry และไม่ตีความ route render/player callback เป็น completion

### Baseline and decision rules

1. freeze schema version, eligibility, exclusions, release assignment, privacy behavior, Asia/Bangkok timezone และ query ก่อน qualification
2. qualification ต้อง reconcile purchase 1:1, duplicate/unknown keys = 0, client delivery loss อธิบายได้, fixtures/kill switch/retention ผ่าน
3. baseline เริ่มวันเต็มถัดไปใน Asia/Bangkok และเก็บ 14 วันเต็ม; ไม่รวม partial day, pre-enable data, fixture/staff/bot/outage
4. ต้องมีอย่างน้อย 100 eligible product views ก่อนรายงาน directional rate
5. หลังทราบ baseline `p0` ให้คำนวณ sample สำหรับ `p1 = 1.10 × p0` ด้วย significance/power ที่อนุมัติล่วงหน้า; recommendation คือ two-sided 95% confidence และ 80% power
6. ถ้าครบ 14 วัน/100 views แต่ sample/interval ยังไม่ตัดสิน ให้ผลเป็น `inconclusive` และเดินต่อถึง maximum duration ที่ owner กำหนด
7. concurrent holdback ใช้เมื่อ traffic/flag infrastructure รองรับ; ถ้าใช้ before/after ต้องเปิดเผย campaign, pricing, eligibility, product/device mix ที่อาจ confound และห้ามอ้าง causal effect

### Privacy and data governance gate

- `analytics_enabled` เป็น audited global operational switch ไม่ใช่ user consent record
- owner/product/legal ต้องยืนยัน lawful basis/consent requirement, notice, retention, access และ deletion ต่อ event class ก่อน enable; เอกสารนี้ไม่ใช่คำแนะนำทางกฎหมาย
- strict allow-list เท่านั้น; ห้าม email/name/IP/user agent/full URL/query/payment payload/slip content/reference/video URL/free-form metadata
- raw exposure/journey retention แยกจาก aggregate retention; de-identify/delete ตาม schedule ที่ทดสอบได้
- kill switch ต้องหยุด future optional collection ทุก path ภายใน bounded cache/read-back contract โดยไม่ลบ business records ที่จำเป็น

## Stop and rollback rules

หยุด expansion และ invalidate measurement window เมื่อเกิดข้อใดข้อหนึ่ง:

- purchase reconciliation ไม่เป็น 1:1, มี duplicate/unknown purchase key หรือ attribution semantics ไม่ชัดเจน
- payment/enrollment/authorization/certificate/progress correctness guardrail แย่ลง
- kill switch/consent/retention behavior ไม่แน่นอนหรือ event contract เปลี่ยนกลาง window
- required deterministic E2E fail/flaky จาก product behavior หรือ fixture setup
- Core Web Vitals แย่กว่างบ no-regression ที่ประกาศไว้ หรือข้ามจาก good เป็น needs-improvement
- error rate/async recovery regression ทำให้ task หลักไปต่อไม่ได้

Rollback order:

1. ปิด affected UI exposure/route slice หรือ revert consumer PR
2. ปิด optional analytics ด้วย audited kill switch เมื่อ privacy/data integrity มีปัญหา
3. คง domain transition ที่ commit แล้ว; dispatcher/outbox retry/reconcile ภายหลัง
4. rollback code ต้อง compatible กับ additive migration; ไม่ drop column/table ใน incident response
5. แก้ instrumentation แล้วเริ่ม clean window ใหม่ ห้าม splice incompatible periods

## Explicit non-goals

- ไม่ redesign/rebrand, เปลี่ยน information architecture, font, primary palette, shadcn preset หรือสร้าง design system ใหม่
- ไม่เพิ่ม route, CMS relation, recommendation, compare, wishlist, magic link, MFA, payment provider, installment หรือ business policy ใหม่
- ไม่สร้าง GA4/vendor analytics, session replay, warehouse, experimentation platform, cross-device identity หรือ raw player telemetry
- ไม่ redesign admin analytics; controlled report/read model ที่จำเป็นต่อ decision เท่านั้น
- ไม่ใช้ measurement เป็นเหตุลด auth/payment/enrollment/certificate safeguards
- ไม่เปลี่ยน price, coupon eligibility, refund, enrollment, completion หรือ certificate policy เงียบ ๆ
- ไม่ deploy/apply migration/read production data ใน planning ticket นี้
- ไม่ให้ cosmetic micro-polish ขยาย scope หรือบล็อก task-complete rollout

## Owner decisions requested

โปรดยืนยันหรือแก้ 7 จุดนี้:

1. ยอมรับลำดับ Wave 0 → authority seams → shared shell → acquisition/discovery/auth → commerce → learner continuity หรือไม่
2. ยอมรับ `product_view` เป็น derived union ของ `course_viewed`/`bundle_viewed` และ KPI นับเฉพาะ attributed paid payment IDs หรือไม่
3. ยอมรับ learner primary metric เป็น next-incomplete-lesson completion ภายใน 7 วันต่อ distinct started enrollment หรืออยากใช้ observation horizon อื่น
4. ยอมรับ 14 วัน + 100 views เป็น reporting floor และใช้ 95% confidence/80% power เพื่อคำนวณ sample หลังทราบ baseline หรือไม่
5. KPI purchase ใช้ gross completed purchase และให้ refund/chargeback เป็น guardrail แยก หรือจะใช้ net retained purchase
6. ใครเป็น owner ของ lawful basis/consent, privacy notice, raw/aggregate retention, access และ deletion policy ก่อนเปิด analytics
7. ใช้ PR-sized deploy + fast rollback เป็น default หรือมี sticky server-side rollout/holdback mechanism ที่ทีมต้องการใช้

เมื่อ 7 จุดนี้ยืนยันแล้ว issue #24 ปิดได้ และ map #12 พร้อม handoff เป็น implementation backlog โดยแต่ละ wave แตกเป็น PR-sized tickets ตาม seams ข้างต้น
