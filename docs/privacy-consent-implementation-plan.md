# แผน Privacy, Cookies และ Analytics สำหรับ MilerDev

วันที่: 13 กันยายน 2026

สถานะ: พัฒนาระบบ consent บน branch `feat/privacy-consent` แล้ว ดู [ผลส่งมอบและข้อจำกัด](privacy-consent-delivery.md) แผนด้านล่างเก็บที่มาของข้อเสนอไว้; รายละเอียด retention และผู้ให้บริการจริงยังต้องสรุปก่อนเปิดใช้งานจริง ไม่มี production inspection หรือ deployment

## เป้าหมายและขอบเขต

ผู้เยี่ยมชมรู้ว่าเว็บเก็บข้อมูลอะไร เลือกการเก็บสถิติส่วนเสริมได้ และกลับมาเปลี่ยนใจได้ การไม่ยินยอมต้องไม่ขัดขวางการสมัครสมาชิก ซื้อคอร์ส หรือเรียน

ชุดนี้ครอบคลุม data inventory, privacy/cookie notice, consent controls, analytics eligibility และแผน retention สำหรับข้อมูลที่เกี่ยวข้อง งานลบข้อมูลทั้งบัญชี refund policy, SEO, accessibility ทั้งเว็บ และ backup/restore แยกเป็นงานถัดไป แต่ UI ที่เพิ่มต้องใช้ keyboard และ screen reader ได้

เกี่ยวข้องกับ [GitHub #85](https://github.com/ohmiler/milerdev/issues/85): งานนั้นยังรอ owner governance และการตรวจ production โดยเฉพาะ การทำ consent เสร็จไม่ได้ทำให้ #85 ผ่าน หรืออนุญาตให้เปิด analytics

## Inventory จากโค้ด

รายการนี้บอกความสามารถของ implementation ไม่ใช่รายการ network/cookies ที่ยืนยันบน production

| กลุ่ม | หลักฐาน | ข้อมูล/พฤติกรรม | ข้อเสนอ |
| --- | --- | --- | --- |
| Session / authentication | [auth](../src/lib/auth.ts) | JWT session maxAge 7 วัน; ไม่พบ custom cookie config ในจุดที่ตรวจ | จำเป็นต่อการเข้าสู่ระบบ; ยืนยันชื่อ cookie/attributes ของ auth library จาก browser fixture ก่อนเขียน cookie notice |
| จดจำการปิดประกาศ | [AnnouncementAlert](../src/components/layout/AnnouncementAlert.tsx) | sessionStorage ชื่อ dismissed_announcements | อธิบายการจดจำการกระทำผู้ใช้แยกจาก tracking; ไม่มีเหตุให้เรียก storage นี้ว่า cookie |
| Product/client events | [client sender](../src/components/analytics/analytics-client.ts), [API](../src/app/api/analytics/events/route.ts) | beacon/fetch ไป first-party API; บาง event เชื่อมสมาชิกฝั่ง server | เสนอ opt-in สำหรับสถิติส่วนเสริม ทั้งก่อนส่งและก่อนบันทึก |
| Performance | [Web Vitals](../src/components/analytics/web-vitals-client.ts), [recorder](../src/lib/web-vitals.ts) | page-load identity, route family, device, release, metric; root mount | เสนออยู่หมวดสถิติเดียวกันในรุ่นแรก; ไม่ replay ค่าที่วัดไว้ก่อนยินยอม |
| Server analytics | [analytics](../src/lib/analytics.ts), [learning](../src/lib/learning-measurement.ts) | lifecycle/learning/commerce events; บางรายการใช้ตัวตนสมาชิกหรือ domain identity | แยกการบันทึกเพื่อบริการออกจากสำเนาเพื่อวิเคราะห์; ใช้ eligibility ที่ตรวจสอบบน server |
| Delayed purchase/enrollment projection | [purchase projector](../src/lib/purchase-measurement-projector.ts), [enrollment projector](../src/lib/enrollment-measurement-projector.ts) | webhook/outbox/retry อาจทำงานเมื่อไม่มี browser request | ห้ามอนุมาน consent จาก cookie ที่ไม่มีใน webhook; ต้องมี durable eligibility และวิธีรับมือ withdrawal/retry |
| Video embed | [BunnyPlayer](../src/components/video/BunnyPlayer.tsx) | iframe ของผู้ให้บริการวิดีโอ รองรับ URL หลายประเภท | ตรวจบริการที่ใช้งานจริง คำขอ cookies และการติดตามของแต่ละ embed ก่อนจัดหมวด; ห้ามบล็อกบทเรียนทั้งหมดเพียงเพราะปฏิเสธ analytics |
| บริการภายนอกอื่น | [privacy ปัจจุบัน](../src/app/privacy/page.tsx), [dependencies](../package.json) | payment, slip verification, OAuth, email, password screening และ infrastructure | แจ้งผู้รับ/บทบาทตามจริง; dependency ที่มีไม่ได้ยืนยันว่าผู้ให้บริการนั้นเปิดใช้งาน production |
| Global governance | [analytics-control](../src/lib/analytics-control.ts) | operational switch + approved event classes; มี purpose/basis/notice/retention/access/deletion/withdrawal fields | คง gate เดิมและเพิ่ม visitor/member eligibility เป็นเงื่อนไขร่วม; ไม่ใช้ owner approval แทน consent ผู้เยี่ยมชม |
| Retention | [retention helper](../src/lib/analytics-retention.ts) | raw analytics/Web Vitals cutoff + batch deletion; ไม่พบ caller ของ runAnalyticsRawEventRetention ใน scripts/src ที่ค้น | ต้องมี scheduler/runbook และผลตรวจจาก isolated data; aggregateRetentionDays ที่เก็บใน policy ไม่ได้ยืนยันว่ามี enforcement |

## ข้อเสนอพฤติกรรมรุ่นแรก

- หมวดจำเป็นเปิดตามการให้บริการ หมวดสถิติเริ่มปิด ไม่มีหมวดโฆษณาที่ว่างเปล่าหากยังไม่มีเครื่องมือจริง
- แสดง “ยอมรับสถิติ”, “ใช้เฉพาะที่จำเป็น”, “ตั้งค่า” ให้เลือกได้ชัดเจน; การปิด UI/เลื่อนหน้าไม่ใช่ยินยอม
- กลับมาแก้ตัวเลือกได้จาก footer และ account settings; browser ใหม่/ข้อมูลเสีย/รุ่นไม่รองรับให้ถือว่ายังไม่ยินยอม
- ข้อเสนออายุการจดจำตัวเลือก: 180 วัน เป็น product proposal ไม่ใช่อายุที่กฎหมายกำหนด ต้องแยกจากระยะเก็บ analytics และหลักฐาน consent
- จดจำเฉพาะรุ่น เวลา และตัวเลือกที่จำเป็น หลีกเลี่ยง IP, user agent และการเพิ่ม visitor identifier โดยไม่มีเหตุผล
- ก่อนเลือกห้ามส่ง optional events; หลังเลือกเริ่มวัดจากเวลานั้น ไม่ระบายคิวเหตุการณ์เก่าหรือ backfill ประวัติ
- ถอนแล้วหยุดการส่งและ projection ในอนาคต ประสานหลายแท็บ การหมดอายุ และการ logout/login ตามสัญญาที่กำหนด
- เสนอ browser choice ใช้กับ anonymous collection; server-side member analytics ใช้ durable member preference และถือว่าไม่อนุญาตหากไม่มีหลักฐานที่ถูกต้อง ระบุวิธี reconcile browser/member choice ก่อนพัฒนา โดยให้การปฏิเสธปัจจุบันไม่ถูก override ด้วย opt-in เก่า
- คง auth, validation, payment verification, enrollment, learning progress และ idempotency ตามเดิม; failure ใน consent/analytics ต้องไม่ยกเลิกธุรกรรมหลัก

## ลำดับ implementation และเกณฑ์จบ

### A. ยืนยัน inventory และนโยบาย

1. ตรวจ browser แบบ isolated ด้วย provider mocks: public page, login, authenticated page, checkout, video; จดชื่อ storage/request, purpose, recipient, lifetime และเวลาที่เริ่มทำงาน
2. ระบุจุดที่ mock พิสูจน์ไม่ได้ เช่น third-party cookies และ provider configuration ให้เป็นช่องว่างแยกต่างหาก การยืนยันของจริงต้องอยู่ในขอบเขตที่เจ้าของอนุญาต
3. สรุป owner identity/contact, lawful basis ต่อกลุ่ม, retention, rights workflow และ vendor roles; ใช้ [แหล่งอ้างอิง](research/website-foundations-sources-2026-09-13.md) ประกอบ ไม่แต่งข้อเท็จจริงธุรกิจ

เกณฑ์จบ: มี inventory ที่แยก source evidence/browser evidence/provider unknown และตาราง policy ที่พร้อมให้ใช้เขียน notice

### B. Consent state และการบังคับใช้ครบเส้นทาง

1. ออกแบบ shared consent contract, version/expiry rules และ server preference endpoint ที่ validate ด้วย Zod; mutation ต้องตรวจ origin/CSRF ตามรูปแบบแอป
2. ออกแบบ durable preference/หลักฐานขั้นต่ำสำหรับสมาชิกและ eligibility ของ delayed projection ก่อน schema changes; อัปเดต schema และ generate/review additive migration หากจำเป็น ไม่ใช้ destructive migration
3. Gate client sender และ Web Vitals ก่อนส่ง พร้อม gate API ก่อนบันทึก; คง global governance/event-class controls เดิม
4. Gate server recorders/projectors รวม replay/retry/backfill; event ที่เกิดก่อนยินยอมต้องไม่กลายเป็น eligible เพราะยินยอมภายหลัง กรณีถอนระหว่าง queue รอต้องไม่ถูก project ต่อ
5. ตรวจ exposure attribution ขณะเริ่ม checkout และ delayed completion; ไม่แปลง opt-out เป็น attribution ที่เชื่อถือได้ และรายงาน denominator เฉพาะกลุ่มที่มีสิทธิ์วัด
6. หาก outbox ปัจจุบันถือข้อมูลส่วนเสริมก่อนยินยอม ต้องตัดสินว่าจะ skip/minimize enqueue ที่จุดใด โดยรักษาความเป็นอะตอมของ payment/enrollment และ deduplication ตาม ADR [0009](adr/0009-project-stripe-purchase-facts-through-a-transactional-outbox.md) และ [0010](adr/0010-key-authoritative-acquisition-facts-by-domain-identity.md)

เกณฑ์จบ: tests ครอบคลุมไม่เลือก/ปฏิเสธ/ยอมรับ/หมดอายุ/ถอน และ delayed events โดยไม่มีผลข้างเคียงต่อสิทธิ์เรียน ห้ามส่งมอบเพียง frontend banner แล้วเรียกว่า consent ครบ

### C. UI และ notice

1. เพิ่ม banner/preferences ด้วย shadcn patterns เดิม มี focus management, labels, live feedback และ mobile layout
2. เพิ่มทางกลับมาเปลี่ยนตัวเลือกจาก footer/settings และ cookie details ที่ตรง inventory
3. ปรับ Privacy ให้ตรง owner-approved facts รวม vendors, analytics, retention, rights, contact และวันที่เปลี่ยนจริง; เพิ่มลิงก์ notice ตรงจุดเก็บข้อมูลที่เกี่ยวข้อง

เกณฑ์จบ: ตรวจ keyboard/screen reader semantics, browser reload/multi-tab และ network/storage behavior ไม่ทดสอบเพียง CSS หรือการหายของ banner

### D. Retention และ release readiness

1. แยก retention ของ raw measurements, aggregates, consent evidence และ operational records; ระบุ deletion/withdrawal outcomes ตามแต่ละฐาน
2. ทดสอบ cutoff, bounded batches, retries และ scheduler/runbook ด้วย isolated data ไม่รันลบ production
3. รัน affected tests, lint, build และชุด shared/high-risk regression ที่เกี่ยวข้อง รวม required E2E เมื่อเชื่อม auth/payment paths; mocks Stripe/SlipOK/Bunny/Google/email
4. ตรวจ migration compatibility, git diff --check, status และเอกสารข้อจำกัดก่อน handoff; แยก deployment/analytics enablement และ production qualification #85 ออกจาก implementation

## Acceptance matrix ที่ต้องมี

| สถานการณ์ | สิ่งที่ต้องพิสูจน์ |
| --- | --- |
| ผู้เยี่ยมชมใหม่ยังไม่เลือก | ไม่มี optional request/storage; การใช้บริการหลักได้ตามสิทธิ์ |
| ปฏิเสธแล้ว reload/เปลี่ยนหน้า | ตัวเลือกคงอยู่ ไม่มี event หลุดก่อน hydration |
| ยอมรับเฉพาะสถิติ | บันทึกได้ต่อเมื่อ global governance เปิดและ event class อนุมัติ |
| ถอนในแท็บหนึ่ง | แท็บอื่นหยุด; server ปฏิเสธ stale optional writes ตาม consistency contract |
| Cookie/state เสีย หมดอายุ หรือ version เก่า | ปิด optional โดย default และให้เลือกใหม่อย่างเข้าใจได้ |
| Login/logout และสมาชิกหลายอุปกรณ์ | ไม่รับ opt-in ของคนก่อน/อุปกรณ์อื่นโดยเงียบ ๆ; ทดสอบ browser/member precedence |
| จ่ายสำเร็จโดยไม่ยินยอม | payment/enrollment สำเร็จ แต่ optional measurement ไม่เกิด |
| ถอนก่อน webhook/retry | ไม่สร้าง optional fact ใหม่ และไม่กระทบ verified fulfillment |
| ยินยอมหลังเหตุการณ์เก่า | ไม่ backfill สิ่งที่ไม่มี eligibility ตอนเกิดเหตุ |
| Global switch ปิด | ไม่มี persistence แม้ผู้เยี่ยมชมยินยอม |
| เรียน/เล่นวิดีโอหลังปฏิเสธ | เนื้อหาที่มีสิทธิ์ยังใช้งานได้; vendor tracking ต้องพิสูจน์แยกตาม inventory |
| Retention boundary | ลบเฉพาะข้อมูลหมดอายุที่อนุมัติ ไม่แตะ payment/enrollment |

## ข้อสรุปที่เจ้าของยืนยัน

ยืนยันในบทสนทนาวันที่ 13 กันยายน 2026:

1. ผู้ควบคุมข้อมูลเป็นบุคคล: **ปฏิภาณ เพ็งเภา** ผู้ดำเนินการเว็บไซต์ MilerDev
2. อีเมลสาธารณะสำหรับติดต่อเรื่องข้อมูลส่วนบุคคล: **milerdev.official@gmail.com**
3. ใช้ **การยินยอมก่อนเก็บสถิติส่วนเสริม (opt-in)**: เริ่มปิดจนมีการเลือกยินยอมอย่างชัดเจน ปฏิเสธแล้วยังสมัครสมาชิก ซื้อ และเรียนได้ตามปกติ

ผลต่อ implementation: ใช้ opt-in กับ optional measurement ทั้ง client และ server รวม Web Vitals และ delayed projections; คง global governance เป็นเงื่อนไขร่วม การเลือกนี้ไม่ใช่การอนุญาตเปิด analytics บน production ไม่เก็บเหตุการณ์ก่อนยินยอมไว้ส่งย้อนหลัง และต้องเปิดทางถอนความยินยอมภายหลัง

ข้อความร่างสำหรับส่วนติดต่อใน Privacy:

> ผู้ควบคุมข้อมูลส่วนบุคคล: ปฏิภาณ เพ็งเภา ผู้ดำเนินการเว็บไซต์ MilerDev หากต้องการสอบถามหรือใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคล ติดต่อ milerdev.official@gmail.com

## รายละเอียดนโยบายที่ยังต้องสรุปก่อนเปิดใช้งาน

ต้องสรุปก่อนเปิด collection/ประกาศ policy ฉบับใช้งานจริง: raw/aggregate/evidence retention, ผู้รับผิดชอบคำขอสิทธิและวิธีตอบกลับ, รายชื่อผู้ให้บริการที่เปิดใช้จริงและข้อมูลการโอน, นโยบายข้อมูลผู้เยาว์ และฐานของ server-side measurement แต่ละประเภท จะทำข้อเสนอจาก inventory ให้ review เป็นรายการเดียว ไม่ต้องส่ง credentials หรือข้อมูลลูกค้า

## ผลการตรวจรอบวางแผน

อ่าน GitHub #85 และ source paths ด้านบน พบว่ามี global governance/retention foundation แล้ว แต่ยังไม่มี visitor/member consent gate ที่ค้นพบ การมี helper ไม่ยืนยัน operational schedule และการอ่าน source ไม่ยืนยัน browser/provider behavior

เพิ่มเฉพาะเอกสารนี้ในรอบวางแผน ไม่รัน application suite/build เพราะไม่มี application changes ไม่เปลี่ยน branch เดิมหรือไฟล์ untracked ของผู้ใช้ ไม่เปิด analytics ไม่แก้ข้อมูล production และไม่โพสต์ข้อความใน GitHub
